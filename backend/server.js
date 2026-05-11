const express = require("express");
const cors = require("cors");
const { connectDB, Cache } = require("./database");
const cron = require("node-cron");
const axios = require("axios");

async function tryGitHubFallback(path, cacheKey) {
  const baseUrls = [
    "https://raw.githubusercontent.com/MatthewDelong/f1-telemetry-api/main/",
    "https://matthewdelong.github.io/f1-telemetry-api/",
  ];
  return await getCachedData(
    cacheKey,
    async () => {
      for (const baseUrl of baseUrls) {
        try {
          const response = await axios.get(`${baseUrl}${path}`);
          const resData = response.data;
          if (typeof resData === 'object' && !resData.lastUpdate) {
            resData.lastUpdate = new Date().toISOString();
          }
          return resData;
        } catch (e) {
          if (e.response?.status === 404) continue;
          throw e;
        }
      }
      throw new Error("Not found on GitHub");
    },
    1000 * 60 * 60 * 24 // Cache GitHub data for 24h
  );
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const fs = require("fs");
const pathMod = require("path");

// Utility to fetch or get cached data
const getCachedData = async (key, fetchCallback, ttlMs = 1000 * 60 * 30) => {
  try {
    const cached = await Cache.findOne({ where: { key } });
    const now = new Date();

    // If we have a cache and it's fresh enough (30 mins default)
    if (cached && now - cached.lastUpdated < ttlMs) {
      return JSON.parse(cached.value);
    }

    // Otherwise, fetch fresh data
    console.log(`[Cache Miss] Fetching fresh data for: ${key}`);
    const data = await fetchCallback();

    // Upsert to SQLite cache
    if (cached) {
      cached.value = JSON.stringify(data);
      cached.lastUpdated = now;
      await cached.save();
    } else {
      await Cache.create({
        key,
        value: JSON.stringify(data),
        lastUpdated: now,
      });
    }

    return data;
  } catch (error) {
    console.error(`Error in getCachedData for ${key}:`, error.message);
    // Return stale cache if fetch fails
    const staleCache = await Cache.findOne({ where: { key } });
    if (staleCache) {
      console.log(`[Fallback] Returning stale cache for ${key}`);
      return JSON.parse(staleCache.value);
    }
    throw error;
  }
};

const { buildDriverStats, getLocal2026Stats } = require("./driverStatsBuilder");

// ─── Admin: Rebuild all 2026 drivers ───
app.get('/api/admin/rebuild-2026', async (req, res) => {
  try {
    const resultsPath = pathMod.join(__dirname, '..', 'src', 'config', 'f1', 'results.json');
    if (!fs.existsSync(resultsPath)) {
      return res.status(404).json({ error: "2026 results.json not found" });
    }
    
    const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const driverIds = new Set();
    resultsData.forEach(race => {
      race.Results.forEach(r => {
        if (r.Driver.driverId) driverIds.add(r.Driver.driverId);
        else if (r.Driver.code) driverIds.add(r.Driver.code.toLowerCase());
      });
    });

    console.log(`[Admin] Starting batch rebuild for ${driverIds.size} drivers...`);
    const results = [];
    const teamDrivers = {}; // { constructorId: [DriverObjects] }

    for (const id of driverIds) {
      try {
        const stats = await buildDriverStats(id);
        if (stats) {
          const cacheKey = `f1:drivers/${id}.json`;
          const value = JSON.stringify(stats);
          const now = new Date();
          let cached = await Cache.findOne({ where: { key: cacheKey } });
          if (cached) {
            cached.value = value;
            cached.lastUpdated = now;
            await cached.save();
          } else {
            await Cache.create({ key: cacheKey, value, lastUpdated: now });
          }
          results.push({ id, status: 'success' });

          // Track driver for team roster
          const lastRace = resultsData[resultsData.length - 1];
          const driverResult = lastRace.Results.find(r => 
            (r.Driver.driverId && r.Driver.driverId.toLowerCase() === id) || 
            (r.Driver.code && r.Driver.code.toLowerCase() === id) ||
            (r.Driver.familyName && r.Driver.familyName.toLowerCase() === id)
          );
          
          if (driverResult && driverResult.Constructor) {
            const teamId = driverResult.Constructor.constructorId;
            if (!teamDrivers[teamId]) teamDrivers[teamId] = [];
            // Only add if not already in list
            if (!teamDrivers[teamId].some(d => d.driverId === id)) {
              teamDrivers[teamId].push({
                driverId: id,
                permanentNumber: driverResult.number,
                code: driverResult.Driver.code,
                givenName: driverResult.Driver.givenName,
                familyName: driverResult.Driver.familyName
              });
            }
          }
        }
      } catch (e) {
        results.push({ id, status: 'error', message: e.message });
      }
      await new Promise(r => setTimeout(r, 200));
    }

    // Save team rosters to cache
    for (const [teamId, drivers] of Object.entries(teamDrivers)) {
      const cacheKey = `f1:constructors/2026/${teamId}.json`;
      await Cache.upsert({ key: cacheKey, value: JSON.stringify(drivers), lastUpdated: new Date() });
      console.log(`[Admin] Updated 2026 roster for ${teamId}: ${drivers.map(d => d.driverId).join(', ')}`);
    }

    return res.json({ message: "Batch rebuild complete", results, rosters: Object.keys(teamDrivers) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Generic Proxy Route — cache-first for F1, passthrough for F1A/F2
app.use("/api/proxy/:source", async (req, res) => {
  const { source } = req.params;
  const path = req.path.replace(/^\//, ""); // get the rest of the path after /api/proxy/f1/

  if (!path) return res.status(400).json({ error: "Path required" });

  const cacheKey = `${source}:${path}`;

  // ─── For F1: check local cache first (populated by updater from Jolpica) ───
  if (source === "f1") {
    // Override: For F1 data, check local src/config/f1 files first to respect manual edits
    const fileName = pathMod.basename(path);
    // Priority: 1. src/config/f1/{file}, 2. src/config/{file}
    const yearMatch = path.match(/(\d{4})/);
    const year = yearMatch ? yearMatch[1] : null;

    let localConfigPath = null;
    if (year) {
      localConfigPath = pathMod.join(
        __dirname,
        "..",
        "src",
        "config",
        "f1",
        year,
        fileName,
      );
    }

    if (!localConfigPath || !fs.existsSync(localConfigPath)) {
      localConfigPath = pathMod.join(
        __dirname,
        "..",
        "src",
        "config",
        "f1",
        fileName,
      );
    }
    if (!fs.existsSync(localConfigPath)) {
      localConfigPath = pathMod.join(
        __dirname,
        "..",
        "src",
        "config",
        fileName,
      );
    }

    if (fs.existsSync(localConfigPath)) {
      const isGlobal =
        fileName === "races.json" || fileName === "raceDetails.json";
      const isYearSpecificMatch =
        year && localConfigPath.includes(pathMod.join(year, fileName));
      const isRootAnd2026 =
        (!year || year === "2026") &&
        localConfigPath.endsWith(pathMod.join("f1", fileName));

      if (
        isGlobal ||
        isYearSpecificMatch ||
        isRootAnd2026 ||
        path.includes("2026")
      ) {
        try {
          console.log(
            `[Local Override] Serving F1 data from: ${localConfigPath}`,
          );
          const localData = JSON.parse(
            fs.readFileSync(localConfigPath, "utf8"),
          );
          return res.json(localData);
        } catch (e) {
          console.error(
            `[Local Override] Error reading ${localConfigPath}:`,
            e.message,
          );
        }
      }
    }

    try {
      const forceRefresh = req.query.refresh === 'true';
      const driverMatch = path.match(/^drivers\/([^/]+)\.json$/);

      // Check if we already have this data cached
      const cached = await Cache.findOne({ where: { key: cacheKey } });

      if (cached && !forceRefresh) {
        // For driver stats, check if it's older than 24 hours
        if (driverMatch) {
          const now = new Date();
          const ageHours = (now - cached.lastUpdated) / (1000 * 60 * 60);
          if (ageHours < 24) {
            const data = JSON.parse(cached.value);
            data.lastUpdate = cached.lastUpdated; // Standardize field name
            return res.json(data);
          }
          console.log(
            `[Cache Stale] Rebuilding stats for ${driverMatch[1]} (Age: ${ageHours.toFixed(1)}h)`,
          );
        } else {
          const data = JSON.parse(cached.value);
          data.lastUpdate = cached.lastUpdated;
          return res.json(data);
        }
      }

      // ─── NEW: Try GitHub Fallback BEFORE building (to avoid Jolpica 429s) ───
      // If forceRefresh is NOT true, try to get from GitHub first
      if (driverMatch && !forceRefresh) {
        console.log(`[Proxy] Checking GitHub for pre-built stats: ${cacheKey}`);
        try {
          const data = await tryGitHubFallback(path, cacheKey);
          if (data) return res.json(data);
        } catch (e) {
          console.log(`[Proxy] Not found on GitHub, will attempt local build: ${e.message}`);
        }
      }

      // On-demand: driver stats (drivers/{driverId}.json)
      if (driverMatch) {
        const driverId = driverMatch[1];
        console.log(`[On-Demand] Building stats from Jolpica for: ${driverId}`);
        try {
          const stats = await buildDriverStats(driverId);
          if (stats) {
            if (cached) {
              cached.value = JSON.stringify(stats);
              cached.lastUpdated = new Date();
              await cached.save();
            } else {
              await Cache.create({
                key: cacheKey,
                value: JSON.stringify(stats),
                lastUpdated: new Date(),
              });
            }
            return res.json(stats);
          }
        } catch (buildErr) {
          console.warn(`[Builder Error] ${driverId} build failed: ${buildErr.message}. Falling back to GitHub.`);
          // If building fails (likely 429), try GitHub even if it's a refresh
          try {
            let githubData = await tryGitHubFallback(path, cacheKey);
            if (githubData) {
              // IMPORTANT: Merge local 2026 data into GitHub data if applicable
              if (driverId) {
                console.log(`[Proxy] Merging local 2026 data into GitHub data for ${driverId}`);
                const stats2026 = await getLocal2026Stats(driverId);
                if (stats2026) {
                  const y = "2026";
                  githubData.finalStandings[y] = stats2026.finalStanding;
                  githubData.seasonWins[y] = stats2026.seasonWins;
                  githubData.seasonPodiums[y] = stats2026.seasonPodiums;
                  githubData.seasonPoles[y] = stats2026.seasonPoles;
                  githubData.seasonDNFs[y] = stats2026.seasonDNFs;
                  githubData.poles[y] = stats2026.poles;
                  githubData.podiums[y] = stats2026.podiums;
                  githubData.DNFs[y] = stats2026.DNFs;
                  githubData.fastLaps[y] = stats2026.fastLaps;
                  githubData.racePosition[y] = stats2026.racePosition;
                  githubData.qualiPosition[y] = stats2026.qualiPosition;
                  githubData.positionsGainLost[y] = stats2026.positionsGainLost;
                  githubData.driverQualifyingTimes[y] = stats2026.driverQualifyingTimes;
                  githubData.avgRacePositions[y] = stats2026.avgRacePosition;
                  githubData.avgQualiPositions[y] = stats2026.avgQualiPosition;
                }
              }
              return res.json(githubData);
            }
          } catch (githubErr) {
            console.error(`[Proxy Error] Both builder and GitHub failed for ${driverId}`);
          }
          return res.status(503).json({ error: "Stats building failed due to rate limits. Please try again later." });
        }
      }
      // No data found anywhere
      console.log(`[Proxy] Data not found for: ${cacheKey}`);
      return res.status(404).json({ error: "Data not found" });
    } catch (err) {
      console.error(`[Proxy Error] Path: ${path}`, err);
      return res.status(500).json({ error: "Failed to fetch data", message: err.message });
    }

  }

  // ─── F1A / F2: passthrough to GitHub Pages ───
  // Check for local override in src/config (especially for 2026 data or global schedules)
  const fileName = pathMod.basename(path);
  // Priority: 1. src/config/{source}/{file}, 2. src/config/{file}
  const yearMatch = path.match(/(\d{4})/);
  const year = yearMatch ? yearMatch[1] : null;

  let localConfigPath = null;
  if (year) {
    localConfigPath = pathMod.join(
      __dirname,
      "..",
      "src",
      "config",
      source,
      year,
      fileName,
    );
  }

  if (!localConfigPath || !fs.existsSync(localConfigPath)) {
    localConfigPath = pathMod.join(
      __dirname,
      "..",
      "src",
      "config",
      source,
      fileName,
    );
  }
  if (!fs.existsSync(localConfigPath)) {
    localConfigPath = pathMod.join(__dirname, "..", "src", "config", fileName);
  }

  if (fs.existsSync(localConfigPath)) {
    const isGlobal =
      fileName === "racesbyMK.json" || fileName === "races.json";
    const isYearSpecificMatch =
      year && localConfigPath.includes(pathMod.join(year, fileName));
    const isRootAnd2026 =
      (!year || year === "2026") &&
      localConfigPath.endsWith(pathMod.join(source, fileName));

    if (
      isGlobal ||
      isYearSpecificMatch ||
      isRootAnd2026 ||
      path.includes("2026")
    ) {
      try {
        console.log(
          `[Local Override] Serving ${source} data from: ${localConfigPath}`,
        );
        const localData = JSON.parse(fs.readFileSync(localConfigPath, "utf8"));
        return res.json(localData);
      } catch (e) {
        console.error(
          `[Local Override] Error reading ${localConfigPath}:`,
          e.message,
        );
      }
    }
  }

  const baseUrls = [];
  if (source === "f1a") {
    baseUrls.push("https://raw.githubusercontent.com/MatthewDelong/f1aapi/main/");
  } else if (source === "f2") {
    baseUrls.push("https://raw.githubusercontent.com/MatthewDelong/f2api/main/");
  } else {
    return res.status(400).json({ error: "Invalid source" });
  }

  try {
    const data = await getCachedData(
      cacheKey,
      async () => {
        for (const baseUrl of baseUrls) {
          const tryPaths = [path];
          // Handle common typo 'resullts.json' in user's repositories
          if (path.endsWith("results.json")) {
            tryPaths.push(path.replace("results.json", "resullts.json"));
          }

          for (const tryPath of tryPaths) {
            try {
              const response = await axios.get(`${baseUrl}${tryPath}`);
              return response.data;
            } catch (e) {
              if (e.response?.status === 404) continue;
              throw e;
            }
          }
        }
        throw new Error("Data not found in any repository");
      },
      1000 * 60 * 30, // 30 mins TTL
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data", message: err.message });
  }
});

// ─── OpenF1 Proxy: passthrough to api.openf1.org ───
app.get("/openf1/*", async (req, res) => {
  try {
    const rawPath = req.originalUrl.replace(/^\/openf1/, "");
    const decodedPath = decodeURIComponent(rawPath);
    const targetUrl = `https://api.openf1.org${decodedPath}`;

    console.log(`[OpenF1 Proxy] Proxying: GET ${targetUrl}`);

    const response = await axios.get(targetUrl, {
      headers: { Accept: "application/json" },
      validateStatus: false,
      timeout: 10000,
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("[OpenF1 Proxy] Proxy Error:", error.message);
    if (error.response) {
      console.error(
        "[OpenF1 Proxy] API Response Error:",
        error.response.status,
        error.response.data,
      );
    }
    res
      .status(500)
      .json({ error: "Failed to fetch from OpenF1", message: error.message });
  }
});

const {
  startCronJobs,
  runCurrentSeasonUpdate,
  updateDriversList,
} = require("./updater");

app.listen(PORT, async () => {
  await connectDB();
  console.log(`F1-Telemetry Backend running on http://localhost:${PORT}`);

  // Start automated cron jobs
  startCronJobs();

  // First-run: populate all data for current season + all-time drivers list
  const currentYear = new Date().getFullYear();
  updateDriversList().catch((e) => console.error(e));
  runCurrentSeasonUpdate(currentYear).catch((e) => console.error(e));
});
