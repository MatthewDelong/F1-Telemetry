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

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const THROTTLE_MS = 250;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Discover which seasons a driver participated in
 */
async function getDriverSeasons(driverId) {
  try {
    const res = await axios.get(`${JOLPICA_BASE}/drivers/${driverId}/seasons.json?limit=100`);
    const seasons = res.data.MRData.SeasonTable.Seasons;
    return seasons ? seasons.map(s => s.season) : [];
  } catch (err) {
    console.warn(`[DriverStats] Failed to get seasons for ${driverId}:`, err.message);
    return [];
  }
}

/**
 * Fetch all race results for a driver in a given season
 */
async function fetchDriverResults(driverId, year) {
  try {
    const res = await axios.get(
      `${JOLPICA_BASE}/${year}/drivers/${driverId}/results.json?limit=100`
    );
    const races = res.data.MRData.RaceTable.Races;
    return races || [];
  } catch (err) {
    console.warn(`[DriverStats] Failed to fetch ${year} results for ${driverId}:`, err.message);
    return [];
  }
}

/**
 * Fetch all qualifying results for a driver in a given season
 */
async function fetchDriverQualifying(driverId, year) {
  try {
    const res = await axios.get(
      `${JOLPICA_BASE}/${year}/drivers/${driverId}/qualifying.json?limit=100`
    );
    const races = res.data.MRData.RaceTable.Races;
    return races || [];
  } catch (err) {
    console.warn(`[DriverStats] Failed to fetch ${year} qualifying for ${driverId}:`, err.message);
    return [];
  }
}

/**
 * Fetch end-of-season standing for a driver
 */
async function fetchDriverStanding(driverId, year) {
  try {
    const res = await axios.get(
      `${JOLPICA_BASE}/${year}/drivers/${driverId}/driverStandings.json`
    );
    const lists = res.data.MRData.StandingsTable.StandingsLists;
    if (lists && lists.length > 0 && lists[0].DriverStandings.length > 0) {
      const standing = lists[0].DriverStandings[0];
      return { year, position: standing.position, points: standing.points };
    }
    return null;
  } catch (err) {
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
      // Driver may not have participated in this round — skip
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
  };
}

module.exports = { buildDriverStats };
