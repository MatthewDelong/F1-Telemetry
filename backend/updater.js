const cron = require('node-cron');
const axios = require('axios');
const { Cache } = require('./database');

async function updateF1Data(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} F1 driver standings from Jolpica...`);
    const ergastRes = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`);
    const lists = ergastRes.data.MRData.StandingsTable.StandingsLists;

    // The F1nsight-api-2 structured it as a dictionary with round numbers as keys, e.g. "1": [...], "2": [...]
    // Or sometimes just an array if it's the latest.
    const structuredStandings = {};
    for (const list of lists) {
      structuredStandings[list.round] = list.DriverStandings;
      structuredStandings['latest'] = list.DriverStandings;
    }

    // Save into SQLite exactly matching the expected key from the old API
    const cacheKey = `f1:races/${year}/driverStandings.json`;
    let cached = await Cache.findOne({ where: { key: cacheKey } });

    if (cached) {
      cached.value = JSON.stringify(structuredStandings);
      cached.lastUpdated = new Date();
      await cached.save();
    } else {
      await Cache.create({
        key: cacheKey,
        value: JSON.stringify(structuredStandings),
        lastUpdated: new Date()
      });
    }

    console.log('[Updater] F1 Driver Standings successfully synced to local DB from Jolpica/Ergast API.');
  } catch (error) {
    console.error('[Updater] F1 Data Error:', error.message);
  }
}

async function updateF1ConstructorStandings(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} F1 constructor standings from Jolpica...`);
    const ergastRes = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`);
    const lists = ergastRes.data.MRData.StandingsTable.StandingsLists;

    const structuredStandings = {};
    for (const list of lists) {
      structuredStandings[list.round] = list.ConstructorStandings;
      structuredStandings['latest'] = list.ConstructorStandings;
    }

    const cacheKey = `f1:races/${year}/constructorStandings.json`;
    let cached = await Cache.findOne({ where: { key: cacheKey } });

    if (cached) {
      cached.value = JSON.stringify(structuredStandings);
      cached.lastUpdated = new Date();
      await cached.save();
    } else {
      await Cache.create({
        key: cacheKey,
        value: JSON.stringify(structuredStandings),
        lastUpdated: new Date()
      });
    }

    console.log('[Updater] F1 Constructor Standings successfully synced to local DB.');
  } catch (error) {
    console.error('[Updater] F1 Constructor Data Error:', error.message);
  }
}

// Scheduled to run every 6 hours during a race weekend
function startCronJobs() {
  console.log('[Cron] Starting data updaters...');
  
  // Every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    const year = new Date().getFullYear();
    await updateF1Data(year);
    await updateF1ConstructorStandings(year);
    // Note: Pending F2 and F1 Academy scrapers can be plugged in here
  });
}

module.exports = { startCronJobs, updateF1Data, updateF1ConstructorStandings };
