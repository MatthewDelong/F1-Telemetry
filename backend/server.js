const express = require("express");
const cors = require("cors");
const { connectDB, Cache } = require("./database");
const cron = require("node-cron");
const axios = require("axios");

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

// Generic Proxy Route — cache-first for F1, passthrough for F1A/F2
const { buildDriverStats } = require("./driverStatsBuilder");

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
      // Check if we already have this data cached from the updater
      const cached = await Cache.findOne({ where: { key: cacheKey } });
      if (cached) {
        return res.json(JSON.parse(cached.value));
      }

      // On-demand: driver stats (drivers/{driverId}.json)
      const driverMatch = path.match(/^drivers\/([^/]+)\.json$/);
      if (driverMatch) {
        const driverId = driverMatch[1];
        console.log(`[On-Demand] Building stats for driver: ${driverId}`);
        const stats = await buildDriverStats(driverId);
        if (stats) {
          // Cache permanently (historical driver data doesn't change)
          await Cache.create({
            key: cacheKey,
            value: JSON.stringify(stats),
            lastUpdated: new Date(),
          });
          return res.json(stats);
        }
      }

      // Fallback: proxy from Praneeth (temporary, until all endpoints migrated)
      console.log(
        `[Proxy Fallback] ${cacheKey} not cached, proxying from Praneeth...`,
      );
      const baseUrls = [
        "https://raw.githubusercontent.com/MatthewDelong/f1nsight-api-2/master/",
        "https://matthewdelong.github.io/f1nsight-api-2/",
      ];
      const data = await getCachedData(
        cacheKey,
        async () => {
          for (const baseUrl of baseUrls) {
            try {
              const response = await axios.get(`${baseUrl}${path}`);
              return response.data;
            } catch (e) {
              if (e.response?.status === 404) continue;
              throw e;
            }
          }
          throw new Error("Data not found in any repository");
        },
        1000 * 60 * 30,
      );
      return res.json(data);
    } catch (err) {
      console.error(`[Proxy] Error for ${cacheKey}:`, err.message);
      return res.status(500).json({ error: "Failed to fetch data" });
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
