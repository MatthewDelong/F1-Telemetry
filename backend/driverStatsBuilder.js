/**
 * driverStatsBuilder.js
 * 
 * Computes comprehensive driver career statistics from Jolpica/Ergast API raw data.
 * Produces output matching the shape of Praneeth's drivers/{id}.json files.
 * 
 * Shape:
 * {
 *   driverId, driverCode, driverNumber, lastUpdate,
 *   totalWins, totalPodiums, totalPoles, totalDNFs,
 *   seasonWins, seasonPodiums, seasonPoles, seasonDNFs,
 *   poles, podiums, DNFs, fastLaps,
 *   finalStandings, posAfterRace,
 *   racePosition, qualiPosition,
 *   positionsGainLost,
 *   driverQualifyingTimes,
 *   avgRacePositions, avgQualiPositions,
 *   rates: { wins, podiums, poles }
 * }
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Cache } = require('./database');

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const THROTTLE_MS = 500;
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

/**
 * Helper to match a driver from local JSON results/qualifying
 */
const matchesDriver = (driver, id) => {
  if (!driver) return false;
  const lowerId = id.toLowerCase();
  const givenName = (driver.givenName || '').toLowerCase();
  const familyName = (driver.familyName || '').toLowerCase();
  
  return (
    (driver.driverId && driver.driverId.toLowerCase() === lowerId) ||
    (driver.code && driver.code.toLowerCase() === lowerId) ||
    (familyName === lowerId) ||
    (`${givenName}_${familyName}` === lowerId) ||
    (lowerId.includes(familyName) && familyName.length > 2)
  );
};

/**
 * Discover which seasons a driver participated in
 */
async function getDriverSeasons(driverId) {
  let seasons = [];
  const cacheKey = `jolpica:seasons:${driverId}`;
  
  try {
    let data;
    const cached = await Cache.findOne({ where: { key: cacheKey } });
    if (cached) {
      data = JSON.parse(cached.value);
    } else {
      const res = await axios.get(`${JOLPICA_BASE}/drivers/${driverId}/seasons.json?limit=100`);
      data = res.data;
      await upsertCache(cacheKey, data);
    }
    const ergastSeasons = data.MRData.SeasonTable.Seasons;
    seasons = ergastSeasons ? ergastSeasons.map(s => s.season) : [];
  } catch (err) {
    if (err.response?.status === 429) throw new Error("Rate limit hit");
    console.warn(`[DriverStats] Failed to get seasons for ${driverId}:`, err.message);
  }

  // Check local 2026
  try {
    const resultsPath = path.join(__dirname, '..', 'src', 'config', 'f1', 'results.json');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const has2026 = results.some(race =>
        race.Results.some(r => matchesDriver(r.Driver, driverId))
      );
      if (has2026) {
        if (!seasons.includes("2026")) {
          seasons.push("2026");
          console.log(`[DriverStats] Added 2026 to seasons for ${driverId} (found in local results)`);
        }
      }
    }
  } catch (e) {
    console.error("[DriverStats] Error checking local 2026 seasons:", e.message);
  }

  return seasons;
}

/**
 * Fetch all race results for a driver in a given season
 */
async function fetchDriverResults(driverId, year) {
  if (year === "2026") {
    try {
      const resultsPath = path.join(__dirname, '..', 'src', 'config', 'f1', 'results.json');
      if (fs.existsSync(resultsPath)) {
        const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        const filtered = results.filter(race =>
          race.Results.some(r => matchesDriver(r.Driver, driverId))
        ).map(race => ({
          ...race,
          Results: race.Results.filter(r => matchesDriver(r.Driver, driverId)).map(r => ({
            ...r,
            status: r.status || (r.Time?.time === "DNF" ? "DNF" : (r.Time?.time === "DNS" ? "DNS" : "Finished"))
          }))
        }));
        console.log(`[DriverStats] Loaded ${filtered.length} local 2026 races for ${driverId}`);
        return filtered;
      }
    } catch (e) {
      console.error("[DriverStats] Error loading local 2026 results:", e.message);
    }
  }
  try {
    let data;
    const cacheKey = `jolpica:results:${year}:${driverId}`;
    const cached = await Cache.findOne({ where: { key: cacheKey } });
    if (cached) {
      data = JSON.parse(cached.value);
    } else {
      const res = await axios.get(
        `${JOLPICA_BASE}/${year}/drivers/${driverId}/results.json?limit=100`
      );
      data = res.data;
      await upsertCache(cacheKey, data);
    }
    const races = data.MRData.RaceTable.Races;
    return races || [];
  } catch (err) {
    if (err.response?.status === 429) throw new Error(`Rate limit hit for ${year} results`);
    console.warn(`[DriverStats] Failed to fetch ${year} results for ${driverId}:`, err.message);
    return [];
  }
}

/**
 * Fetch all qualifying results for a driver in a given season
 */
async function fetchDriverQualifying(driverId, year) {
  if (year === "2026") {
    try {
      const qualiPath = path.join(__dirname, '..', 'src', 'config', 'f1', 'qualifying.json');
      if (fs.existsSync(qualiPath)) {
        const quali = JSON.parse(fs.readFileSync(qualiPath, 'utf8'));
        return quali.filter(race =>
          race.QualifyingResults.some(r => matchesDriver(r.Driver, driverId))
        ).map(race => ({
          ...race,
          QualifyingResults: race.QualifyingResults.filter(r => matchesDriver(r.Driver, driverId))
        }));
      }
    } catch (e) {
      console.error("[DriverStats] Error loading local 2026 qualifying:", e.message);
    }
  }
  try {
    let data;
    const cacheKey = `jolpica:qualifying:${year}:${driverId}`;
    const cached = await Cache.findOne({ where: { key: cacheKey } });
    if (cached) {
      data = JSON.parse(cached.value);
    } else {
      const res = await axios.get(
        `${JOLPICA_BASE}/${year}/drivers/${driverId}/qualifying.json?limit=100`
      );
      data = res.data;
      await upsertCache(cacheKey, data);
    }
    const races = data.MRData.RaceTable.Races;
    return races || [];
  } catch (err) {
    if (err.response?.status === 429) throw new Error(`Rate limit hit for ${year} qualifying`);
    console.warn(`[DriverStats] Failed to fetch ${year} qualifying for ${driverId}:`, err.message);
    return [];
  }
}

/**
 * Fetch end-of-season standing for a driver
 */
async function fetchDriverStanding(driverId, year) {
  if (year === "2026") {
    try {
      const resultsPath = path.join(__dirname, '..', 'src', 'config', 'f1', 'results.json');
      console.log(`[DriverStats] Checking for 2026 results at: ${resultsPath}`);
      if (fs.existsSync(resultsPath)) {
        console.log(`[DriverStats] Found 2026 results file.`);
        const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
        let points = 0;
        resultsData.forEach(race => {
          const result = race.Results.find(r => matchesDriver(r.Driver, driverId));
          if (result) points += parseInt(result.points || '0', 10);
        });
        console.log(`[DriverStats] Calculated 2026 points for ${driverId}: ${points}`);
        return { year, position: '0', points: String(points) };
      } else {
        console.warn(`[DriverStats] 2026 results file NOT found at: ${resultsPath}`);
      }
    } catch (e) {
      console.error("[DriverStats] Error calculating 2026 standing:", e.message);
    }
  }
  try {
    let data;
    const cacheKey = `jolpica:standings:${year}:${driverId}`;
    const cached = await Cache.findOne({ where: { key: cacheKey } });
    if (cached) {
      data = JSON.parse(cached.value);
    } else {
      const res = await axios.get(`${JOLPICA_BASE}/${year}/drivers/${driverId}/driverStandings.json`);
      data = res.data;
      await upsertCache(cacheKey, data);
    }
    const standingsList = data.MRData.StandingsTable.StandingsLists[0];
    if (!standingsList) return null;
    const standings = standingsList.DriverStandings[0];
    return standings ? {
      year,
      position: standings.position,
      points: standings.points
    } : null;
  } catch (err) {
    if (err.response?.status === 429) throw new Error(`Rate limit hit for ${year} standings`);
    console.warn(`[DriverStats] Failed to fetch ${year} standing for ${driverId}:`, err.message);
    return null;
  }
}

/**
 * Fetch standings after each round for cumulative points tracking
 */
async function fetchStandingsPerRound(driverId, year, totalRounds) {
  const perRound = {};
  for (let round = 1; round <= totalRounds; round++) {
    try {
      const res = await axios.get(
        `${JOLPICA_BASE}/${year}/${round}/drivers/${driverId}/driverStandings.json`
      );
      const lists = res.data.MRData.StandingsTable.StandingsLists;
      if (lists && lists.length > 0 && lists[0].DriverStandings.length > 0) {
        perRound[round] = parseInt(lists[0].DriverStandings[0].points, 10);
      }
      await sleep(THROTTLE_MS);
    } catch (err) {
      if (err.response?.status === 429) {
        console.warn(`[DriverStats] Rate limited fetching round ${round} standings for ${driverId}`);
      }
    }
  }
  return perRound;
}

// ─── Status helpers ───
const FINISHED_STATUSES = ['Finished', '+1 Lap', '+2 Laps', '+3 Laps', '+4 Laps', '+5 Laps',
  '+6 Laps', '+7 Laps', '+8 Laps', '+9 Laps', '+10 Laps', '+11 Laps', '+12 Laps'];

function isFinished(status) {
  return FINISHED_STATUSES.includes(status);
}

function isDNF(status) {
  if (!status) return false;
  return !isFinished(status) && status !== 'Disqualified' && status !== 'Not classified';
}

/**
 * Main: Build complete driver stats from Jolpica data
 */
async function buildDriverStats(driverId) {
  console.log(`[DriverStats] Building stats for ${driverId}...`);
  const startTime = Date.now();

  // Get all seasons
  const seasons = await getDriverSeasons(driverId);
  if (seasons.length === 0) {
    console.warn(`[DriverStats] No seasons found for ${driverId}`);
    return null;
  }

  // Initialize accumulators
  let driverCode = '';
  let driverNumber = '';
  let totalWins = 0, totalPodiums = 0, totalPoles = 0, totalDNFs = 0, totalRaces = 0;

  const seasonWins = {};
  const seasonPodiums = {};
  const seasonPoles = {};
  const seasonDNFs = {};
  const poles = {};
  const podiums = {};
  const DNFs = {};
  const fastLaps = {};
  const finalStandings = {};
  const posAfterRace = {};
  const racePosition = {};
  const qualiPosition = {};
  const positionsGainLost = {};
  const driverQualifyingTimes = {};
  const avgRacePositions = {};
  const avgQualiPositions = {};
  const rates = { wins: {}, podiums: {}, poles: {} };

  // Process each season
  for (const year of seasons) {
    await sleep(THROTTLE_MS);

    // Fetch results + qualifying in parallel
    const [results, qualifying] = await Promise.all([
      fetchDriverResults(driverId, year),
      fetchDriverQualifying(driverId, year),
    ]);

    await sleep(THROTTLE_MS);

    // Extract driver code/number from first result
    if (!driverCode && results.length > 0 && results[0].Results.length > 0) {
      const dr = results[0].Results[0].Driver;
      driverCode = dr.code || '';
      driverNumber = dr.permanentNumber || '';
    }

    // ─── Process Race Results ───
    let yearWins = 0, yearPodiums = 0, yearDNFs = 0, yearRaces = 0;
    const yearPodiumsMap = {};
    const yearDNFsMap = {};
    const yearFastLaps = {};
    const yearRacePos = { positions: {} };
    const yearPosGainLost = { positions: {} };

    for (const race of results) {
      const result = race.Results[0]; // Driver's result (filtered by driver in API)
      if (!result) continue;
      yearRaces++;
      totalRaces++;

      const pos = parseInt(result.position, 10);
      const raceName = race.raceName;

      // Wins
      if (pos === 1) { yearWins++; totalWins++; }
      // Podiums
      if (pos <= 3) {
        yearPodiums++; totalPodiums++;
        yearPodiumsMap[raceName] = String(pos);
      }
      // DNFs
      if (isDNF(result.status)) {
        yearDNFs++; totalDNFs++;
        yearDNFsMap[raceName] = result.status;
      }
      // Fastest lap
      if (result.FastestLap && result.FastestLap.Time) {
        yearFastLaps[raceName] = result.FastestLap.Time.time;
      } else {
        yearFastLaps[raceName] = -1;
      }
      // Race position
      yearRacePos.positions[raceName] = String(pos);
      // Positions gained/lost
      const grid = parseInt(result.grid, 10);
      if (!isNaN(grid) && grid > 0) {
        yearPosGainLost.positions[raceName] = String(grid - pos);
      }
    }

    seasonWins[year] = yearWins;
    seasonPodiums[year] = yearPodiums;
    seasonDNFs[year] = yearDNFs;
    podiums[year] = yearPodiumsMap;
    DNFs[year] = yearDNFsMap;
    fastLaps[year] = yearFastLaps;
    racePosition[year] = yearRacePos;
    positionsGainLost[year] = yearPosGainLost;

    // Average race position
    const racePositions = Object.values(yearRacePos.positions).map(Number).filter(n => !isNaN(n));
    avgRacePositions[year] = racePositions.length > 0
      ? (racePositions.reduce((a, b) => a + b, 0) / racePositions.length).toFixed(2)
      : '0.00';

    // Rates
    rates.wins[year] = yearRaces > 0 ? (yearWins / yearRaces).toFixed(4) : '0';
    rates.podiums[year] = yearRaces > 0 ? (yearPodiums / yearRaces).toFixed(4) : '0';

    // ─── Process Qualifying ───
    let yearPoles = 0;
    const yearPolesArr = [];
    const yearQualiPos = { positions: {} };
    const yearQualiTimes = { QualiTimes: {} };

    for (const race of qualifying) {
      const qResult = race.QualifyingResults[0]; // Driver's qualifying
      if (!qResult) continue;

      const qPos = parseInt(qResult.position, 10);
      const raceName = race.raceName;

      // Poles
      if (qPos === 1) {
        yearPoles++; totalPoles++;
        yearPolesArr.push(raceName);
      }
      // Qualifying position
      yearQualiPos.positions[raceName] = String(qPos);
      // Qualifying times
      yearQualiTimes.QualiTimes[raceName] = [
        qResult.Q1 || 'N/A',
        qResult.Q2 || 'N/A',
        qResult.Q3 || 'N/A',
      ];
    }

    seasonPoles[year] = yearPoles;
    poles[year] = yearPolesArr;
    qualiPosition[year] = yearQualiPos;
    driverQualifyingTimes[year] = yearQualiTimes;
    rates.poles[year] = yearRaces > 0 ? (yearPoles / yearRaces).toFixed(4) : '0';

    // Average qualifying position
    const qualiPositions = Object.values(yearQualiPos.positions).map(Number).filter(n => !isNaN(n));
    avgQualiPositions[year] = qualiPositions.length > 0
      ? (qualiPositions.reduce((a, b) => a + b, 0) / qualiPositions.length).toFixed(2)
      : '0.00';

    // ─── Final Standings ───
    const standing = await fetchDriverStanding(driverId, year);
    if (standing) {
      finalStandings[year] = standing;
    }

    // ─── Position After Each Race (cumulative points) ───
    // Build from results directly - accumulate points
    let cumulativePoints = 0;
    const yearPosAfterRace = { year, pos: {} };
    for (const race of results) {
      const result = race.Results[0];
      if (!result) continue;
      cumulativePoints += parseInt(result.points || '0', 10);
      yearPosAfterRace.pos[race.raceName] = { points: cumulativePoints };
    }
    posAfterRace[year] = yearPosAfterRace;

    await sleep(THROTTLE_MS);
  }

  // Career rates
  const winRate = totalRaces > 0 ? totalWins / totalRaces : 0;
  const podiumRate = totalRaces > 0 ? totalPodiums / totalRaces : 0;
  const poleRate = totalRaces > 0 ? totalPoles / totalRaces : 0;
  const dnfRate = totalRaces > 0 ? totalDNFs / totalRaces : 0;

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[DriverStats] ✓ ${driverId} complete in ${elapsed}s (${seasons.length} seasons, ${totalRaces} races)`);

  return {
    driverId,
    driverCode,
    driverNumber,
    lastUpdate: new Date().toISOString(),
    totalWins,
    totalPodiums,
    totalPoles,
    totalDNFs,
    totalRaces,
    winRate,
    podiumRate,
    poleRate,
    dnfRate,
    seasonWins,
    seasonPodiums,
    seasonPoles,
    seasonDNFs,
    poles,
    podiums,
    DNFs,
    fastLaps,
    finalStandings,
    posAfterRace,
    racePosition,
    qualiPosition,
    positionsGainLost,
    driverQualifyingTimes,
    avgRacePositions,
    avgQualiPositions,
    rates,
    lastUpdate: new Date().toISOString(),
  };
}

async function getLocal2026Stats(driverId) {
  const year = "2026";
  try {
    const results = await fetchDriverResults(driverId, year);
    if (results.length === 0) return null;

    const qualifying = await fetchDriverQualifying(driverId, year);
    const finalStanding = await fetchDriverStanding(driverId, year);

    let yearWins = 0, yearPodiums = 0, yearDNFs = 0;
    const yearPodiumsMap = {};
    const yearDNFsMap = {};
    const yearFastLaps = {};
    const yearRacePos = { positions: {} };
    const yearQualiPos = { positions: {} };
    const yearQualiTimes = { QualiTimes: {} };
    const yearPosGainLost = { positions: {} };
    const yearPolesArr = [];
    let yearPoles = 0;

    for (const race of results) {
      const result = race.Results[0];
      if (!result) continue;
      const pos = parseInt(result.position, 10);
      const raceName = race.raceName;
      if (pos === 1) yearWins++;
      if (pos <= 3) {
        yearPodiums++;
        yearPodiumsMap[raceName] = String(pos);
      }
      if (isDNF(result.status)) {
        yearDNFs++;
        yearDNFsMap[raceName] = result.status;
      }
      if (result.FastestLap && result.FastestLap.Time) {
        yearFastLaps[raceName] = result.FastestLap.Time.time;
      }
      yearRacePos.positions[raceName] = String(pos);

      // Calculate positions gained/lost
      const grid = parseInt(result.grid, 10);
      if (!isNaN(grid) && grid > 0) {
        yearPosGainLost.positions[raceName] = String(grid - pos);
      }
    }

    for (const race of qualifying) {
      const qResult = race.QualifyingResults[0];
      if (!qResult) continue;
      const qPos = parseInt(qResult.position, 10);
      const raceName = race.raceName;
      if (qPos === 1) {
        yearPoles++;
        yearPolesArr.push(raceName);
      }
      yearQualiPos.positions[raceName] = String(qPos);
      yearQualiTimes.QualiTimes[raceName] = [
        qResult.Q1 || 'N/A',
        qResult.Q2 || 'N/A',
        qResult.Q3 || 'N/A',
      ];
    }

    const racePositions = Object.values(yearRacePos.positions).map(Number).filter(n => !isNaN(n));
    const avgRacePosition = racePositions.length > 0 ? (racePositions.reduce((a, b) => a + b, 0) / racePositions.length).toFixed(2) : '0.00';

    const qualiPositions = Object.values(yearQualiPos.positions).map(Number).filter(n => !isNaN(n));
    const avgQualiPosition = qualiPositions.length > 0 ? (qualiPositions.reduce((a, b) => a + b, 0) / qualiPositions.length).toFixed(2) : '0.00';

    return {
      finalStanding,
      seasonWins: yearWins,
      seasonPodiums: yearPodiums,
      seasonPoles: yearPoles,
      seasonDNFs: yearDNFs,
      poles: yearPolesArr,
      podiums: yearPodiumsMap,
      DNFs: yearDNFsMap,
      fastLaps: yearFastLaps,
      racePosition: yearRacePos,
      qualiPosition: yearQualiPos,
      positionsGainLost: yearPosGainLost,
      driverQualifyingTimes: yearQualiTimes,
      avgRacePosition,
      avgQualiPosition
    };
  } catch (e) {
    console.error(`[DriverStats] Error in getLocal2026Stats for ${driverId}:`, e.message);
    return null;
  }
}

module.exports = { buildDriverStats, getLocal2026Stats };
