const express = require("express");
const cors = require("cors");
const { connectDB, Cache } = require("./database");
const cron = require("node-cron");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
      const baseUrl = "https://praneeth7781.github.io/f1nsight-api-2/";
      const data = await getCachedData(
        cacheKey,
        async () => {
          const response = await axios.get(`${baseUrl}${path}`);
          return response.data;
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
  let baseUrl = "";
  if (source === "f1a") {
    baseUrl = "https://ant-dot-comm.github.io/f1aapi/";
  } else if (source === "f2") {
    baseUrl = "https://ant-dot-comm.github.io/f2api/";
  } else {
    return res.status(400).json({ error: "Invalid source" });
  }

  const targetUrl = `${baseUrl}${path}`;

  try {
    const data = await getCachedData(
      cacheKey,
      async () => {
        const response = await axios.get(targetUrl);
        return response.data;
      },
      1000 * 60 * 30, // 30 mins TTL
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch data" });
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
