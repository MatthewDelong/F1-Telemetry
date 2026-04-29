const cron = require('node-cron');
const axios = require('axios');
const { Cache } = require('./database');

async function updateF1Data(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} F1 driver standings from Jolpica...`);
    
    // First, fetch the latest standings to discover how many rounds exist
    const latestRes = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}/driverStandings.json`);
    const latestLists = latestRes.data.MRData.StandingsTable.StandingsLists;
    if (!latestLists || latestLists.length === 0) {
      console.warn(`[Updater] No driver standings data available for ${year}`);
      return;
    }
    
    const latestRound = parseInt(latestLists[0].round, 10);
    console.log(`[Updater] Latest round for ${year}: ${latestRound}. Fetching all rounds...`);
    
    // Build structured standings with data for every round (matching old f1nsight-api-2 format)
    const structuredStandings = {};
    
    for (let round = 1; round <= latestRound; round++) {
      try {
        const roundRes = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}/${round}/driverStandings.json`);
        const roundLists = roundRes.data.MRData.StandingsTable.StandingsLists;
        if (roundLists && roundLists.length > 0) {
          structuredStandings[round] = roundLists[0].DriverStandings;
        }
        // Small delay to avoid rate limiting
        if (round < latestRound) {
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (roundErr) {
        console.warn(`[Updater] Failed to fetch round ${round} driver standings:`, roundErr.message);
      }
    }
    
    // Also set 'latest' key for backwards compatibility
    structuredStandings['latest'] = latestLists[0].DriverStandings;

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

    console.log(`[Updater] F1 Driver Standings successfully synced (${Object.keys(structuredStandings).length - 1} rounds) to local DB from Jolpica/Ergast API.`);
  } catch (error) {
    console.error('[Updater] F1 Data Error:', error.message);
  }
}

async function updateF1ConstructorStandings(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} F1 constructor standings from Jolpica...`);
    
    // First, fetch the latest standings to discover how many rounds exist
    const latestRes = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}/constructorStandings.json`);
    const latestLists = latestRes.data.MRData.StandingsTable.StandingsLists;
    if (!latestLists || latestLists.length === 0) {
      console.warn(`[Updater] No constructor standings data available for ${year}`);
      return;
    }

    const latestRound = parseInt(latestLists[0].round, 10);
    console.log(`[Updater] Latest round for ${year}: ${latestRound}. Fetching all constructor rounds...`);

    const structuredStandings = {};

    for (let round = 1; round <= latestRound; round++) {
      try {
        const roundRes = await axios.get(`https://api.jolpi.ca/ergast/f1/${year}/${round}/constructorStandings.json`);
        const roundLists = roundRes.data.MRData.StandingsTable.StandingsLists;
        if (roundLists && roundLists.length > 0) {
          structuredStandings[round] = roundLists[0].ConstructorStandings;
        }
        // Small delay to avoid rate limiting
        if (round < latestRound) {
          await new Promise(r => setTimeout(r, 200));
        }
      } catch (roundErr) {
        console.warn(`[Updater] Failed to fetch round ${round} constructor standings:`, roundErr.message);
      }
    }

    // Also set 'latest' key for backwards compatibility
    structuredStandings['latest'] = latestLists[0].ConstructorStandings;

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

    console.log(`[Updater] F1 Constructor Standings successfully synced (${Object.keys(structuredStandings).length - 1} rounds) to local DB.`);
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
