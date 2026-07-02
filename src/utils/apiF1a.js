import { sortByPosition } from './raceUtils';

export const BASE_F1A_URL = import.meta.env.PROD ? '/api.php?source=f1a&path=' : '/api/proxy/f1a/';
export const BASE_F2_URL = import.meta.env.PROD ? '/api.php?source=f2&path=' : '/api/proxy/f2/';

export const getSeriesBaseUrl = (championshipLevel) =>
  championshipLevel === 'F1A' ? BASE_F1A_URL : BASE_F2_URL;

export const fetchRaceMeetingKeysF1a = async (selectedYear, championshipLevel) => {
  try {
    const raceResponse = await fetch(`${getSeriesBaseUrl(championshipLevel)}races/races.json`);
    if(!raceResponse.ok) {
      throw new Error('Failed to fetch races');
    }
    const races = await raceResponse.json();
    return races[selectedYear]
  } catch(error) {
    console.error('Error fetching data:', error);
  }
};

export const fetchCircuitData = async (championshipLevel) => {
    try {
        const url = `${getSeriesBaseUrl(championshipLevel)}races/racesbyMK.json`;
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error fetching circuit data:", error);
        return {};
    }
};

export const fetchDriverInfo = async (year, championshipLevel) => {
  try {
    const base = getSeriesBaseUrl(championshipLevel);
    const url = championshipLevel === 'F1A'
      ? `${base}constructors/${year}/drivers.json`
      : `${base}drivers/${year}/drivers.json`;
    const response = await fetch(url);
    const data = await response.json();
    // console.log('fetchDriverInfo', {data});
    return data;
  } catch (error) {
    console.error("Error fetching driver information:", error);
    return {};
  }
};

const enrichDriverData = (raceData, driverInfo) => {
  // console.log('enrichDriverData', raceData, driverInfo);
  return raceData.map(driver => {
    const driverDetails = driverInfo[driver.number];
    if (!driverDetails || !driverDetails.Driver || !driverDetails.Constructor) {
      console.error("enrichDriverData missing driver details", {
        driverNumber: driver.number,
        driverDetails,
        availableDrivers: Object.keys(driverInfo || {}),
      });
      return driver;
    }
    return {
      ...driver,
      Driver: {
        ...driverDetails.Driver
      },
      Constructor: {
        ...driverDetails.Constructor
      }
    };
  });
};

const filterTop3 = (raceData) => {
  return raceData.sort(sortByPosition).slice(0, 3);
};

export const fetchRaceResultsByCircuit = async (year, circuitId, top3 = false, championshipLevel) => {
  try {
    const url = `${getSeriesBaseUrl(championshipLevel)}races/${year}/results.json`;
    const response = await fetch(url);
    const data = await response.json();

    const results = data.find(race => race.Circuit.circuitId === circuitId);

    if (!results) {
      console.error(`No race found for circuitId: ${circuitId}`);
      return { raceName: '', race0: [], race1: [], race2: [], race3: [] };
    }
  
    const driverInfo = await fetchDriverInfo(year, championshipLevel);

    let race0Results = results.Results.race0 ? enrichDriverData(results.Results.race0, driverInfo) : []; // season >= 2025 rescheduled race
    let race1Results = results.Results.race1 ? enrichDriverData(results.Results.race1, driverInfo) : [];
    let race2Results = results.Results.race2 ? enrichDriverData(results.Results.race2, driverInfo) : [];
    let race3Results = results.Results.race3 ? enrichDriverData(results.Results.race3, driverInfo) : []; // season < 2025

    if (top3) {
      race0Results = race0Results ? filterTop3(race0Results) : [];
      race1Results = race1Results ? filterTop3(race1Results) : [];
      race2Results = race2Results ? filterTop3(race2Results) : [];
      race3Results = race3Results ? filterTop3(race3Results) : [];
    }

    return { raceName: results.raceName, race0: race0Results, race1: race1Results, race2: race2Results, race3: race3Results };

  } catch (error) {
    console.error("Error fetching race results:", error);
    return { raceName: '', race0: [], race1: [], race2: [], race3: [] };
  }
};

export const fetchAllRaceResults = async (year, championshipLevel) => {
  try {
    const url = `${getSeriesBaseUrl(championshipLevel)}races/${year}/results.json`;
    const response = await fetch(url);
    const data = await response.json();

    // Fetch driver information for enrichment
    const driverInfo = await fetchDriverInfo(year, championshipLevel);

    // Map over each race to enrich and structure the results
    const races = data.map(race => {
      let race0Results = race.Results.race0 ? enrichDriverData(race.Results.race0, driverInfo) : [];
      let race1Results = race.Results.race1 ? enrichDriverData(race.Results.race1, driverInfo) : [];
      let race2Results = race.Results.race2 ? enrichDriverData(race.Results.race2, driverInfo) : [];
      let race3Results = race.Results.race3 ? enrichDriverData(race.Results.race3, driverInfo) : [];

      return {
        raceName: race.raceName,
        circuitId: race.Circuit.circuitId,
        race0: race0Results,
        race1: race1Results,
        race2: race2Results,
        race3: race3Results,
      };
    });

    // console.log('races', races)

    return races;
  } catch (error) {
    console.error("Error fetching all race results:", error);
    return [];
  }
};

export const fetchMostRecentRaceWeekend = async (selectedYear, championshipLevel) => {
  try {
    const raceUrl = `${getSeriesBaseUrl(championshipLevel)}races/${selectedYear}/results.json`;
    const response = await fetch(raceUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch race details');
    }

    const races = await response.json();
    
    // Step 2: Sort races based on the `round` to get the most recent one
    const sortedRaces = races.sort((a, b) => parseInt(b.round) - parseInt(a.round)); // Sort in descending order by `round`
    // console.log('fetchMostRecentRaceWeekend sortedRaces', championshipLevel, {sortedRaces})
    
    const driverInfo = await fetchDriverInfo(selectedYear, championshipLevel);
    // console.log('fetchMostRecentRaceWeekend driverInfo', championshipLevel, {driverInfo})
    
    // Step 3: Extract top 3 results for each race (race1, race2, race3, etc.)
    const mostRecentRace = sortedRaces[0]; // Take the first race as the most recent
    // console.log('fetchMostRecentRaceWeekend mostRecentRace', championshipLevel, {mostRecentRace})
    const race0Top3 = filterTop3(mostRecentRace.Results.race0 ? enrichDriverData(mostRecentRace.Results.race0, driverInfo) : []);
    const race1Top3 = filterTop3(mostRecentRace.Results.race1 ? enrichDriverData(mostRecentRace.Results.race1, driverInfo) : []);
    const race2Top3 = filterTop3(mostRecentRace.Results.race2 ? enrichDriverData(mostRecentRace.Results.race2, driverInfo) : []);
    const race3Top3 = filterTop3(mostRecentRace.Results.race3 ? enrichDriverData(mostRecentRace.Results.race3, driverInfo) : []);

    // Step 4: Combine the results into one object with all the top 3 results
    return {
      raceName: mostRecentRace.raceName,
      round: mostRecentRace.round,
      season: mostRecentRace.season,
      race0: race0Top3,
      race1: race1Top3,
      race2: race2Top3,
      race3: race3Top3,
    };

  } catch (error) {
    console.error("Error fetching most recent race weekend data:", error);
    return {
      raceName: '',
      race0: [],
      race1: [],
      race2: [],
      race3: [],
    };
  }
};

