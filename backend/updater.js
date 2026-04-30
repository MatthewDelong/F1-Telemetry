const cron = require('node-cron');
const axios = require('axios');
const { Cache } = require('./database');
const teamColors = require('./teamColors.json');

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const THROTTLE_MS = 250; // Delay between API calls to avoid rate limiting

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Helper: upsert into SQLite cache ───
async function upsertCache(key, data) {
  const value = JSON.stringify(data);
  const now = new Date();
  let cached = await Cache.findOne({ where: { key } });
  if (cached) {
    cached.value = value;
    cached.lastUpdated = now;
    await cached.save();
  } else {
    await Cache.create({ key, value, lastUpdated: now });
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 1 — STATIC DATA (already working: driverStandings, constructorStandings)
// ═══════════════════════════════════════════════════════════════════

// ─── 1a. Driver Standings (per round) — EXISTING ───
async function updateF1Data(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} F1 driver standings from Jolpica...`);
    const latestRes = await axios.get(`${JOLPICA_BASE}/${year}/driverStandings.json`);
    const latestLists = latestRes.data.MRData.StandingsTable.StandingsLists;
    if (!latestLists || latestLists.length === 0) {
      console.warn(`[Updater] No driver standings data available for ${year}`);
      return;
    }
    const latestRound = parseInt(latestLists[0].round, 10);
    console.log(`[Updater] Latest round for ${year}: ${latestRound}. Fetching all rounds...`);

    const structuredStandings = {};
    for (let round = 1; round <= latestRound; round++) {
      try {
        const roundRes = await axios.get(`${JOLPICA_BASE}/${year}/${round}/driverStandings.json`);
        const roundLists = roundRes.data.MRData.StandingsTable.StandingsLists;
        if (roundLists && roundLists.length > 0) {
          structuredStandings[round] = roundLists[0].DriverStandings;
        }
        if (round < latestRound) await sleep(THROTTLE_MS);
      } catch (roundErr) {
        console.warn(`[Updater] Failed to fetch round ${round} driver standings:`, roundErr.message);
      }
    }
    structuredStandings['latest'] = latestLists[0].DriverStandings;
    await upsertCache(`f1:races/${year}/driverStandings.json`, structuredStandings);
    console.log(`[Updater] ✓ Driver Standings synced (${Object.keys(structuredStandings).length - 1} rounds)`);
  } catch (error) {
    console.error('[Updater] F1 Driver Standings Error:', error.message);
  }
}

// ─── 1b. Constructor Standings (per round) — EXISTING ───
async function updateF1ConstructorStandings(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} F1 constructor standings from Jolpica...`);
    const latestRes = await axios.get(`${JOLPICA_BASE}/${year}/constructorStandings.json`);
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
        const roundRes = await axios.get(`${JOLPICA_BASE}/${year}/${round}/constructorStandings.json`);
        const roundLists = roundRes.data.MRData.StandingsTable.StandingsLists;
        if (roundLists && roundLists.length > 0) {
          structuredStandings[round] = roundLists[0].ConstructorStandings;
        }
        if (round < latestRound) await sleep(THROTTLE_MS);
      } catch (roundErr) {
        console.warn(`[Updater] Failed to fetch round ${round} constructor standings:`, roundErr.message);
      }
    }
    structuredStandings['latest'] = latestLists[0].ConstructorStandings;
    await upsertCache(`f1:races/${year}/constructorStandings.json`, structuredStandings);
    console.log(`[Updater] ✓ Constructor Standings synced (${Object.keys(structuredStandings).length - 1} rounds)`);
  } catch (error) {
    console.error('[Updater] F1 Constructor Standings Error:', error.message);
  }
}

// ─── 1c. Race Details (schedule + practice/qualifying/sprint sessions) ───
async function updateRaceDetails(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} race schedule from Jolpica...`);
    const res = await axios.get(`${JOLPICA_BASE}/${year}.json`);
    const races = res.data.MRData.RaceTable.Races;
    if (!races || races.length === 0) {
      console.warn(`[Updater] No race schedule for ${year}`);
      return;
    }
    // Jolpica already returns the exact shape Praneeth served — pass through directly
    await upsertCache(`f1:races/${year}/raceDetails.json`, races);
    console.log(`[Updater] ✓ Race Details synced (${races.length} races for ${year})`);
  } catch (error) {
    console.error('[Updater] Race Details Error:', error.message);
  }
}

// ─── 1d. Race Results (all rounds combined) ───
async function updateRaceResults(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} race results from Jolpica...`);
    // First discover how many rounds have results
    const schedRes = await axios.get(`${JOLPICA_BASE}/${year}.json`);
    const allRaces = schedRes.data.MRData.RaceTable.Races;
    const now = new Date();
    // Only fetch past races
    const pastRaces = allRaces.filter(r => new Date(r.date) < now);

    const combinedResults = [];
    for (const race of pastRaces) {
      try {
        await sleep(THROTTLE_MS);
        const roundRes = await axios.get(`${JOLPICA_BASE}/${year}/${race.round}/results.json`);
        const raceData = roundRes.data.MRData.RaceTable.Races;
        if (raceData && raceData.length > 0) {
          combinedResults.push(raceData[0]);
        }
      } catch (roundErr) {
        console.warn(`[Updater] Failed to fetch round ${race.round} results:`, roundErr.message);
      }
    }

    await upsertCache(`f1:races/${year}/results.json`, combinedResults);
    console.log(`[Updater] ✓ Race Results synced (${combinedResults.length} rounds for ${year})`);
  } catch (error) {
    console.error('[Updater] Race Results Error:', error.message);
  }
}

// ─── 1e. Qualifying Results (all rounds combined) ───
async function updateQualifyingResults(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} qualifying results from Jolpica...`);
    const schedRes = await axios.get(`${JOLPICA_BASE}/${year}.json`);
    const allRaces = schedRes.data.MRData.RaceTable.Races;
    const now = new Date();
    const pastRaces = allRaces.filter(r => new Date(r.date) < now);

    const combinedQualifying = [];
    for (const race of pastRaces) {
      try {
        await sleep(THROTTLE_MS);
        const roundRes = await axios.get(`${JOLPICA_BASE}/${year}/${race.round}/qualifying.json`);
        const raceData = roundRes.data.MRData.RaceTable.Races;
        if (raceData && raceData.length > 0) {
          combinedQualifying.push(raceData[0]);
        }
      } catch (roundErr) {
        console.warn(`[Updater] Failed to fetch round ${race.round} qualifying:`, roundErr.message);
      }
    }

    await upsertCache(`f1:races/${year}/qualifying.json`, combinedQualifying);
    console.log(`[Updater] ✓ Qualifying Results synced (${combinedQualifying.length} rounds for ${year})`);
  } catch (error) {
    console.error('[Updater] Qualifying Results Error:', error.message);
  }
}

// ─── 1f. Constructors List (for a year) ───
async function updateConstructorsList(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} constructors list from Jolpica...`);
    const res = await axios.get(`${JOLPICA_BASE}/${year}/constructors.json`);
    const constructors = res.data.MRData.ConstructorTable.Constructors;
    if (!constructors) {
      console.warn(`[Updater] No constructors for ${year}`);
      return;
    }
    await upsertCache(`f1:constructors/${year}.json`, constructors);
    console.log(`[Updater] ✓ Constructors list synced (${constructors.length} teams for ${year})`);
  } catch (error) {
    console.error('[Updater] Constructors List Error:', error.message);
  }
}

// ─── 1g. Constructor Drivers (per constructor for a year) ───
async function updateConstructorDrivers(year = new Date().getFullYear()) {
  try {
    console.log(`[Updater] Fetching ${year} constructor drivers from Jolpica...`);
    // First get the list of constructors
    const listRes = await axios.get(`${JOLPICA_BASE}/${year}/constructors.json`);
    const constructors = listRes.data.MRData.ConstructorTable.Constructors;
    if (!constructors) return;

    for (const constructor of constructors) {
      try {
        await sleep(THROTTLE_MS);
        const driversRes = await axios.get(
          `${JOLPICA_BASE}/${year}/constructors/${constructor.constructorId}/drivers.json`
        );
        const drivers = driversRes.data.MRData.DriverTable.Drivers;
        if (drivers) {
          await upsertCache(`f1:constructors/${year}/${constructor.constructorId}.json`, drivers);
        }
      } catch (err) {
        console.warn(`[Updater] Failed to fetch drivers for ${constructor.constructorId}:`, err.message);
      }
    }
    console.log(`[Updater] ✓ Constructor drivers synced (${constructors.length} teams for ${year})`);
  } catch (error) {
    console.error('[Updater] Constructor Drivers Error:', error.message);
  }
}

// ─── 1h. Drivers List (all-time, paginated) ───
async function updateDriversList() {
  try {
    console.log('[Updater] Fetching all-time drivers list from Jolpica...');
    let allDrivers = [];
    let offset = 0;
    const limit = 100;
    let total = Infinity;

    while (offset < total) {
      const res = await axios.get(`${JOLPICA_BASE}/drivers.json?limit=${limit}&offset=${offset}`);
      const data = res.data.MRData;
      total = parseInt(data.total, 10);
      const drivers = data.DriverTable.Drivers;
      if (!drivers || drivers.length === 0) break;
      allDrivers = allDrivers.concat(drivers);
      offset += limit;
      if (offset < total) await sleep(THROTTLE_MS);
    }

    await upsertCache('f1:driversList.json', allDrivers);
    console.log(`[Updater] ✓ Drivers list synced (${allDrivers.length} drivers)`);
  } catch (error) {
    console.error('[Updater] Drivers List Error:', error.message);
  }
}

// ─── 1i. Team Colors (static file, just cache it) ───
async function updateTeamColors() {
  try {
    await upsertCache('f1:colors/teams.json', teamColors);
    console.log('[Updater] ✓ Team colors cached from static file');
  } catch (error) {
    console.error('[Updater] Team Colors Error:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 3 — MEETING KEY MAPPING (cross-reference Jolpica + OpenF1)
// ═══════════════════════════════════════════════════════════════════

const OPENF1_BASE = 'https://api.openf1.org/v1';

// ─── 3a. Races Lookup (races.json): { year: { raceName: { meeting_key, location } } } ───
async function updateRacesLookup(years) {
  try {
    console.log(`[Updater] Building races lookup for years: ${years.join(', ')}...`);
    
    // Try to load existing data first
    const cached = await Cache.findOne({ where: { key: 'f1:races/races.json' } });
    const racesLookup = cached ? JSON.parse(cached.value) : {};

    for (const year of years) {
      try {
        await sleep(THROTTLE_MS);
        const meetingsRes = await axios.get(`${OPENF1_BASE}/meetings?year=${year}`);
        const meetings = meetingsRes.data;
        if (!Array.isArray(meetings) || meetings.length === 0) continue;

        const yearLookup = {};
        for (const meeting of meetings) {
          yearLookup[meeting.meeting_name] = {
            meeting_key: meeting.meeting_key,
            location: meeting.location,
          };
        }
        racesLookup[String(year)] = yearLookup;
      } catch (err) {
        console.warn(`[Updater] Failed to fetch meetings for ${year}:`, err.message);
      }
    }

    await upsertCache('f1:races/races.json', racesLookup);
    console.log(`[Updater] ✓ Races lookup synced (${Object.keys(racesLookup).length} years)`);
  } catch (error) {
    console.error('[Updater] Races Lookup Error:', error.message);
  }
}

// ─── 3b. Races by Meeting Key (racesbyMK.json): { meetingKey: { raceName, location, year } } ───
async function updateRacesByMeetingKey(years) {
  try {
    console.log(`[Updater] Building racesbyMK for years: ${years.join(', ')}...`);

    // Try to load existing data first
    const cached = await Cache.findOne({ where: { key: 'f1:races/racesbyMK.json' } });
    const racesByMK = cached ? JSON.parse(cached.value) : {};

    for (const year of years) {
      try {
        await sleep(THROTTLE_MS);
        const meetingsRes = await axios.get(`${OPENF1_BASE}/meetings?year=${year}`);
        const meetings = meetingsRes.data;
        if (!Array.isArray(meetings) || meetings.length === 0) continue;

        for (const meeting of meetings) {
          racesByMK[String(meeting.meeting_key)] = {
            raceName: meeting.meeting_name,
            location: meeting.location,
            year: String(year),
          };
        }
      } catch (err) {
        console.warn(`[Updater] Failed to fetch meetings for ${year}:`, err.message);
      }
    }

    await upsertCache('f1:races/racesbyMK.json', racesByMK);
    console.log(`[Updater] ✓ RacesByMK synced (${Object.keys(racesByMK).length} entries)`);
  } catch (error) {
    console.error('[Updater] RacesByMK Error:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════
// CRON SCHEDULER
// ═══════════════════════════════════════════════════════════════════

function startCronJobs() {
  console.log('[Cron] Starting data updaters...');

  // Every 2 hours — refresh current season data
  cron.schedule('0 */2 * * *', async () => {
    const year = new Date().getFullYear();
    console.log(`[Cron] Running scheduled update for ${year}...`);
    await runCurrentSeasonUpdate(year);
  });
}

// Full update for the current season
async function runCurrentSeasonUpdate(year) {
  await updateF1Data(year);
  await updateF1ConstructorStandings(year);
  await updateRaceDetails(year);
  await updateRaceResults(year);
  await updateQualifyingResults(year);
  await updateConstructorsList(year);
  await updateConstructorDrivers(year);
  await updateTeamColors();
  // Meeting key mappings — include recent years for OpenF1 coverage (2023+)
  const meetingYears = [2023, 2024, 2025, year].filter((v, i, a) => a.indexOf(v) === i);
  await updateRacesLookup(meetingYears);
  await updateRacesByMeetingKey(meetingYears);
}

module.exports = {
  startCronJobs,
  updateF1Data,
  updateF1ConstructorStandings,
  updateRaceDetails,
  updateRaceResults,
  updateQualifyingResults,
  updateConstructorsList,
  updateConstructorDrivers,
  updateDriversList,
  updateTeamColors,
  updateRacesLookup,
  updateRacesByMeetingKey,
  runCurrentSeasonUpdate,
};

