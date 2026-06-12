const express = require("express");
const cors = require("cors");
const { connectDB, Cache } = require("./database");
const cron = require("node-cron");
const axios = require("axios");
const { exec } = require("child_process");

async function tryGitHubFallback(path, cacheKey) {
  const baseUrls = [
    "https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/f1/",
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
        else {
          let code = r.Driver.code || "";
          if (code === "VER") driverIds.add("max_verstappen");
          else if (code === "LIN") driverIds.add("arvid_lindblad");
          else if (code === "BEA") driverIds.add("bearman");
          else if (code === "ANT") driverIds.add("antonelli");
          else if (code === "BOR") driverIds.add("bortoleto");
          else if (code === "HAD") driverIds.add("hadjar");
          else if (code === "COL") driverIds.add("colapinto");
          else if (code === "LAW") driverIds.add("lawson");
          else if (code === "PER") driverIds.add("perez");
          else if (code === "HUL") driverIds.add("hulkenberg");
          else if (r.Driver.familyName) driverIds.add(r.Driver.familyName.toLowerCase().replace(' ', '_'));
          else if (code) driverIds.add(code.toLowerCase());
        }
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
  const path = req.path.replace(/^\//, "");
  if (!path) return res.status(400).json({ error: "Path required" });

  const cacheKey = `${source}:${path}`;
  const forceRefresh = req.query.refresh === 'true';

  if (source === "f1") {
    const fileName = pathMod.basename(path);
    const yearMatch = path.match(/races\/(\d{4})\//);
    const year = yearMatch ? yearMatch[1] : null;

    // 1. Try local file first
    let localConfigPath = null;
    if (year) {
      localConfigPath = pathMod.join(__dirname, "..", "src", "config", "f1", year, fileName);
    }
    if (!localConfigPath || !fs.existsSync(localConfigPath)) {
      // Use 'path' instead of 'fileName' so we preserve subdirectories like 'drivers/'
      localConfigPath = pathMod.join(__dirname, "..", "src", "config", "f1", path);
    }
    
    // Fallback for files that the API requests from 'races/2026/' but are actually in the root 'f1/'
    if (!fs.existsSync(localConfigPath) && ["results.json", "qualifying.json", "sprint.json"].includes(fileName)) {
      localConfigPath = pathMod.join(__dirname, "..", "src", "config", "f1", fileName);
    }

    if (fs.existsSync(localConfigPath)) {
      const isGlobal = ["races.json", "raceDetails.json", "results.json", "qualifying.json", "sprint.json"].includes(fileName);
      const isYearSpecificMatch = year && localConfigPath.includes(pathMod.join(year, fileName));
      const isRootAnd2026 = (!year || year === "2026") && localConfigPath.endsWith(pathMod.join("f1", path));

      if (isGlobal || isYearSpecificMatch || isRootAnd2026 || path.includes("2026") || path.startsWith("drivers/")) {
        console.log(`[Proxy] Serving local file: ${localConfigPath}`);
        try {
          const content = fs.readFileSync(localConfigPath, 'utf8');
          return res.json(JSON.parse(content));
        } catch (e) {
          console.error(`[Proxy] Error reading local file: ${e.message}`);
        }
      }
    }

    // 2. Specialized Handler: Driver Stats Building (on-demand)
    const driverMatch = path.match(/^drivers\/([^/]+)\.json$/);
    if (driverMatch) {
        const driverId = driverMatch[1];
        try {
            // Check cache first
            const cached = await Cache.findOne({ where: { key: cacheKey } });
            if (cached && !forceRefresh) {
                const now = new Date();
                const diff = now - cached.lastUpdated;
                const ageHours = diff / (1000 * 60 * 60);
                console.log(`[Debug Cache] driver=${driverId}, lastUpdated=${cached.lastUpdated}, typeof=${typeof cached.lastUpdated}, now=${now}, diff=${diff}, ageHours=${ageHours}`);
                if (ageHours < 24) return res.json(JSON.parse(cached.value));
            }

            // Try GitHub first to avoid Jolpica 429s
            if (!forceRefresh) {
                try {
                    const githubData = await tryGitHubFallback(path, cacheKey);
                    if (githubData) return res.json(githubData);
                } catch (e) {}
            }

            // Build fresh from Jolpica
            console.log(`[Proxy] Building stats from Jolpica for: ${driverId}`);
            const stats = await buildDriverStats(driverId);
            if (stats) {
                await Cache.upsert({ key: cacheKey, value: JSON.stringify(stats), lastUpdated: new Date() });
                return res.json(stats);
            }
        } catch (err) {
            console.error(`[Proxy] Builder failed for ${driverId}: ${err.message}`);
            // Last fallback to whatever we have in cache
            const cached = await Cache.findOne({ where: { key: cacheKey } });
            if (cached) return res.json(JSON.parse(cached.value));
        }
    }

    // 3. GitHub fallback for general F1 data
    const baseUrls = [
      "https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/f1/",
      "https://raw.githubusercontent.com/MatthewDelong/f1-telemetry-api/main/",
    ];

    const pathVariations = [path];
    if (year) pathVariations.push(`${year}/${fileName}`);
    if (path === "races/races.json") pathVariations.push("races.json");

    for (const baseUrl of baseUrls) {
      for (const fetchPath of pathVariations) {
        try {
          const url = baseUrl + fetchPath;
          const response = await axios.get(url, { timeout: 10000 });
          if (response.data) {
            console.log(`[Proxy] Found on GitHub: ${url}`);
            await Cache.upsert({ key: cacheKey, value: JSON.stringify(response.data), lastUpdated: new Date() });
            return res.json(response.data);
          }
        } catch (e) {}
      }
    }

    // 4. Last resort: database cache
    const finalCached = await Cache.findOne({ where: { key: cacheKey } });
    if (finalCached) return res.json(JSON.parse(finalCached.value));

    return res.status(404).json({ error: "Data not found" });
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

    // Intercept 404s from OpenF1 to prevent browser console spam.
    // OpenF1 uses 404 to indicate empty search results instead of an empty array.
    if (response.status === 404) {
      return res.status(200).json([]);
    }

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

// ─── Admin API Update Endpoints ───
app.get('/api/admin/update/status', (req, res) => {
  const statuses = {};
  const rootDir = pathMod.join(__dirname, '..');
  
  const checkFile = (key, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        statuses[key] = { lastUpdated: stats.mtime };
      } else {
        statuses[key] = { lastUpdated: null };
      }
    } catch (e) {
      statuses[key] = { lastUpdated: null };
    }
  };

  checkFile('f1', pathMod.join(rootDir, 'src', 'config', 'f1', 'results.json'));
  checkFile('f2', pathMod.join(rootDir, 'src', 'config', 'f2', 'results.json'));
  checkFile('f1a', pathMod.join(rootDir, 'src', 'config', 'f1a', 'results.json'));
  
  res.json(statuses);
});

app.post('/api/admin/update/f1', (req, res) => {
  const scriptPath = pathMod.join(__dirname, '..', 'src', 'config', 'f1');
  exec(`py api_update.py`, { cwd: scriptPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Admin Update F1] Error: ${error.message}`);
      return res.status(500).json({ error: error.message, stderr });
    }
    res.json({ message: 'F1 Data updated successfully', output: stdout });
  });
});

app.post('/api/admin/update/f2', (req, res) => {
  const url = req.body.url || '';
  const scriptPath = pathMod.join(__dirname, '..', 'src', 'config', 'f2'); 
  const cmd = url ? `py api_update.py "${url}" && py format.py` : `py api_update.py && py format.py`;
  
  exec(cmd, { cwd: scriptPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Admin Update F2] Error: ${error.message}`);
      return res.status(500).json({ error: error.message, stderr });
    }
    res.json({ message: 'F2 Data updated successfully', output: stdout });
  });
});

app.post('/api/admin/update/f1a', (req, res) => {
  const url = req.body.url || '';
  const scriptPath = pathMod.join(__dirname, '..', 'src', 'config', 'f1a');
  const cmd = url ? `py api_update.py "${url}" && py format.py` : `py api_update.py && py format.py`;
  
  exec(cmd, { cwd: scriptPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Admin Update F1A] Error: ${error.message}`);
      return res.status(500).json({ error: error.message, stderr });
    }
    res.json({ message: 'F1A Data updated successfully', output: stdout });
  });
});

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
