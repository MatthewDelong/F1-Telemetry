const express = require('express');
const cors = require('cors');
const { connectDB, Cache } = require('./database');
const cron = require('node-cron');
const axios = require('axios');

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
    if (cached && (now - cached.lastUpdated) < ttlMs) {
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
        lastUpdated: now
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

// Generic Proxy Route to mirror external GitHub pages structured data until we implement native scrappers
// This ensures we have 100% API compatibility on day 1 while we write the local scrappers.
app.use('/api/proxy/:source', async (req, res) => {
  const { source } = req.params;
  const path = req.path.replace(/^\//, ''); // get the rest of the path after /api/proxy/f1/
  
  if (!path) return res.status(400).json({ error: 'Path required' });
  let baseUrl = '';
  if (source === 'f1') {
    baseUrl = 'https://praneeth7781.github.io/f1nsight-api-2/';
  } else if (source === 'f1a') {
    baseUrl = 'https://ant-dot-comm.github.io/f1aapi/';
  } else if (source === 'f2') {
    baseUrl = 'https://ant-dot-comm.github.io/f2api/';
  } else {
    return res.status(400).json({ error: 'Invalid source' });
  }

  const cacheKey = `${source}:${path}`;
  const targetUrl = `${baseUrl}${path}`;

  try {
    const data = await getCachedData(
      cacheKey,
      async () => {
        const response = await axios.get(targetUrl);
        return response.data;
      },
      1000 * 60 * 30 // 30 mins TTL
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

const { startCronJobs, updateF1Data, updateF1ConstructorStandings } = require('./updater');

app.listen(PORT, async () => {
  await connectDB();
  console.log(`F1nsight Backend running on http://localhost:${PORT}`);
  
  // Start automated cron jobs
  startCronJobs();
  
  // Optionally do a first-run fetch asynchronously
  const currentYear = new Date().getFullYear();
  updateF1Data(currentYear).catch(e => console.error(e));
  updateF1ConstructorStandings(currentYear).catch(e => console.error(e));
});
