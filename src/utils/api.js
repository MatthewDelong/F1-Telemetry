import teamColors from "./teamColors.json";
import { buildOpenF1Url, OPENF1_API_BASE_URL } from "../config/openf1";
import { trackLengths } from "./trackLengths";
import { locationMaps } from "./locationMaps";

const CANCELLED_RACES_2026 = ["Bahrain Grand Prix", "Saudi Arabian Grand Prix"];

export const BASE_F1_URL = import.meta.env.PROD 
  ? '/api.php?source=f1&path=' 
  : '/api/proxy/f1/';


/**
 * Normalizes a date string to the format expected by the OpenF1 API (YYYY-MM-DDTHH:MM:SS.mmm)
 * @param {string|Date} date - The date to normalize
 * @returns {string} The normalized date string
 */
export function normalizeOpenF1Date(date) {
  if (!date) return "";
  // Ensure the date string ends with Z or +00:00 to force UTC parsing
  let dateStr = String(date);
  if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
    dateStr += 'Z';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().replace("Z", "+00:00");
}

const CACHE_PREFIX = "f1_cache_";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchOpenF1Data = async (url, retries = 7, backoff = 1500) => {
    try {
        const response = await fetch(url);
        
        if (response.status === 429 && retries > 0) {
            console.warn(`[API] Rate limited (429) on ${url}. Retrying in ${backoff}ms... (${retries} retries left)`);
            await delay(backoff);
            return fetchOpenF1Data(url, retries - 1, backoff * 2);
        }

        if (!response.ok) {
            // OpenF1 uses 404 to signal "No results found" for a specific filter.
            // We should treat this as an empty batch rather than a fatal error.
            if (response.status === 404) {
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        if (retries > 0) {
            console.warn(`[API] Fetch error for ${url}. Retrying in ${backoff}ms... (${retries} retries left)`);
            await delay(backoff);
            return fetchOpenF1Data(url, retries - 1, backoff * 2);
        }
        console.error(`[API] Final failure for ${url}:`, error);
        throw error;
    }
};

/**
 * Fetches all records from an OpenF1 endpoint by paginating through the 'date' field.
 * This bypasses the default 500-record limit.
 */
export const fetchOpenF1FullSessionData = async (endpoint, sessionKey, extraParams = "") => {
    let allData = [];
    let lastDate = null;
    let hasMore = true;
    const baseUrl = buildOpenF1Url(endpoint);
    
    try {
        while (hasMore) {
            let url = buildOpenF1Url(endpoint);
            url += `?session_key=${sessionKey}`;
            
            if (extraParams) {
                const search = extraParams.startsWith("?") ? extraParams.slice(1) : extraParams;
                url += `&${search}`;
            }
            
            if (lastDate) {
                const filterName = (endpoint.includes("laps") || endpoint.includes("sessions")) 
                    ? "date_start" 
                    : "date";
                
                // Add 1ms to lastDate to skip the record we just got, avoiding duplicates
                // without needing the potentially unsupported '>=' operator.
                const d = new Date(lastDate);
                d.setMilliseconds(d.getMilliseconds() + 1);
                const incrementedDate = d.toISOString().replace("Z", "+00:00");
                
                url += `&${filterName}>${incrementedDate}`;
            }
            
            console.log(`[API] Fetching OpenF1 Batch: ${url}`);
            const batch = await fetchOpenF1Data(url);
            if (!batch || batch.length === 0) {
                console.log(`[API] End of data reached for ${endpoint} (404/Empty)`);
                hasMore = false;
            } else {
                const lastItem = batch[batch.length - 1];
                const firstItem = batch[0];
                
                if (allData.length === 0) {
                  console.log(`[API] ${endpoint} Keys in first record:`, Object.keys(firstItem));
                }

                const firstDate = normalizeOpenF1Date(firstItem.date || firstItem.date_start);
                const nextLastDate = normalizeOpenF1Date(lastItem.date || lastItem.date_start);
                
                console.log(`[API] ${endpoint} Batch: ${batch.length} records. Range: [${firstDate}] -> [${nextLastDate}]`);
                
                allData = [...allData, ...batch];
                
                lastDate = nextLastDate;
                
                // Stop if we have an absurd amount of data (safety)
                if (allData.length > 500000) hasMore = false; 
                
                // Delay to avoid 429
                await delay(300);
            }
        }
        return allData;
    } catch (err) {
        console.error(`[API] Error in paginated fetch for ${endpoint}:`, err);
        return allData;
    }
};

/**
 * Fetches data from localStorage if available and not expired,
 * otherwise fetches from network and updates cache.
 * Robustified to return stale data if network fetch fails (e.g. 429).
 */
export const fetchWithPersistentCache = async (url) => {
    const cacheKey = CACHE_PREFIX + btoa(url);
    let cachedData = null;

    // 1. Try to get from localStorage first
    try {
        const cachedItem = localStorage.getItem(cacheKey);
        if (cachedItem) {
            const { data, timestamp } = JSON.parse(cachedItem);
            const isExpired = Date.now() - timestamp > CACHE_TTL;
            if (!isExpired) {
                return data;
            }
            cachedData = data; // Keep for fallback if network fails
        }
    } catch (e) {
        console.warn("[Cache] Error reading from localStorage", e);
    }

    // 2. Fetch from network
    try {
        const data = await fetchOpenF1Data(url);
        
        // 3. Save to localStorage if successful
        if (data && !data.error) {
            try {
                const cacheEntry = JSON.stringify({
                    data,
                    timestamp: Date.now()
                });
                localStorage.setItem(cacheKey, cacheEntry);
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    console.warn("[Cache] localStorage full, clearing oldest entries...");
                    Object.keys(localStorage).forEach(key => {
                        if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key);
                    });
                }
            }
        }
        return data;
    } catch (error) {
        // 4. FALLBACK: If network fails but we had expired data, return it
        if (cachedData) {
            console.warn(`[Cache] Network failed for ${url}, returning stale data.`, error);
            return cachedData;
        }
        throw error;
    }
};

export const fetchDriversList = async () => {
    const response = await fetchWithPersistentCache(`${BASE_F1_URL}driversList.json`);
    return response.map(driver => ({
        id: driver.driverId,
        name: `${driver.givenName} ${driver.familyName}`
    }));
};

export const fetchDriverStats = async (driverId1, driverId2, refresh = false) => {
  const fetchDriverData = async (driverId) => {
    try {
      let url = `${BASE_F1_URL}drivers/${driverId}.json`;
      if (refresh) {
        url += (url.includes('?') ? '&' : '?') + 'refresh=true';
        url += `&t=${Date.now()}`; // Add timestamp to bust browser cache too
      }
      const dataResponse1 = await fetch(url);
      if (dataResponse1.ok) {
        const data1 = await dataResponse1.json();
        return data1;
      } else {
        console.log("Failed to fetch data");
      }
    } catch (error) {
      console.log(error);
    }
  };
  const driverData1 = await fetchDriverData(driverId1);
  const driverData2 = await fetchDriverData(driverId2);
  return { driver1: driverData1, driver2: driverData2 };
};



export const fetchRaceMeetingKeys = async (selectedYear) => {
  const cacheKey = `${CACHE_PREFIX}meeting_keys_${selectedYear}`;
  
  // Try browser cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use 6 hour TTL
      if (Date.now() - timestamp < (1000 * 60 * 60 * 6)) return data;
    }
  } catch (e) {}

  try {
    const raceResponse = await fetch(`${BASE_F1_URL}races/races.json`);
    if(!raceResponse.ok) {
      throw new Error('Failed to fetch races');
    }
    const races = await raceResponse.json();
    const yearRaces = races[selectedYear];

    let result = yearRaces;
    if (Number(selectedYear) === 2026 && yearRaces) {
      const filteredRaces = {};
      for (const [key, value] of Object.entries(yearRaces)) {
        if (!CANCELLED_RACES_2026.includes(key)) {
          filteredRaces[key] = value;
        }
      }
      result = filteredRaces;
    }

    // Cache the result
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
    } catch (e) {}

    return result;
  } catch(error) {
    console.error('Error fetching data:', error);
  }
};

// Header
export const fetchRacesAndSessions = async (selectedYear) => {
  try {
      // Fetch races
      const racesData = await fetchWithPersistentCache(`${buildOpenF1Url("/meetings")}?year=${selectedYear}`);

      // Filter out cancelled races for 2026
      let filteredRacesData = racesData || [];
      if (Number(selectedYear) === 2026) {
        filteredRacesData = filteredRacesData.filter(race => 
          !CANCELLED_RACES_2026.includes(race.meeting_name)
        );
      }

      // Fetch sessions (using cached sessionsData if possible, but specifically for 'Race' filter)
      const f1apiMeetingSessionsList = await fetchWithPersistentCache(`${buildOpenF1Url("/sessions")}?year=${selectedYear}&session_name=Race`);

      // Filter races based on meeting_key presence in sessions
      const filteredRaces = filteredRacesData.filter(race => 
          Array.isArray(f1apiMeetingSessionsList) && f1apiMeetingSessionsList.some(session => session.meeting_key === race.meeting_key)
      );
      // console.log('12', filteredRaces);
      return filteredRaces;
  } catch (error) {
      console.error('Error fetching data:', error);
  }
};
  
// race results page
export const fetchRaceDetails = async (selectedYear) => {
  const url = `${BASE_F1_URL}races/${selectedYear}/raceDetails.json`; 
  try {
    const response = await fetch(url);
    if (response.ok) {
      let races = await response.json();

      // Filter out cancelled races for 2026
      if (Number(selectedYear) === 2026) {
        races = races.filter(race => {
          const name = race.raceName.toLowerCase();
          return !CANCELLED_RACES_2026.some(c => name.includes(c.toLowerCase().replace(" grand prix", "")));
        });
      }

      const raceResultsPromises = races.map((race, index) => {
        if (new Date(race.date) < new Date()) {
          return fetchRaceResults(selectedYear, race.round)
            .then(results => ({
              ...race,
              results,
            }));
        } else {
          return Promise.resolve({ 
            raceName: race.raceName, 
            date: race.date,
            season: race.season,
            round: race.round,
            time: race.time, 
          });
        }
      });

      return Promise.all(raceResultsPromises);
    } else {
      console.error('Failed to fetch data');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
  return [];
};
  
const fetchRaceResults = async (selectedYear, raceId) => {
  const cacheKey = `${CACHE_PREFIX}results_${selectedYear}_${raceId}`;
  
  // 1. Try browser cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
  } catch (e) {}

  const resultsUrl = `${BASE_F1_URL}races/${selectedYear}/results.json`;
  try {
    const tempdata = await fetchWithPersistentCache(resultsUrl);
    if (tempdata) {
      const raceIdNum = parseInt(raceId, 10);
      const raceData = tempdata.find(element => parseInt(element.round, 10) === raceIdNum);
      if (!raceData || !raceData.Results) {
        // Fallback to OpenF1 if this is a past race
        console.log(`[API] Results empty for round ${raceId}, checking OpenF1 fallback...`);
        const meetingKeys = await fetchRaceMeetingKeys(selectedYear);
        const raceDetails = await fetchWithPersistentCache(`${BASE_F1_URL}races/${selectedYear}/raceDetails.json`);
        const raceInfo = raceDetails.find(r => parseInt(r.round, 10) === parseInt(raceId, 10));
        
        if (raceInfo && meetingKeys[raceInfo.raceName]) {
          const meetingKey = meetingKeys[raceInfo.raceName].meeting_key;
          return await fetchOpenF1Podium(meetingKey);
        }
        return [];
      }
      const data = raceData.Results.slice(0,3);
      // console.log('response', data);

      // console.log(data.slice(0,3));
      console.log(`[API Debug] Results for ${selectedYear} Round ${raceId}:`, data.length, "results");
      const results = data.map(result => {
        console.log(`[API Debug] Driver ${result.Driver?.code} object:`, result.Driver);
        return {
          driver: {
            ...result.Driver,
            nationality: result.Driver?.nationality || result.Driver?.country_code || result.Driver?.country || ""
          },
          fastestLap: result.FastestLap,
          bestLapTime: result.FastestLap?.Time?.time || '—',
          grid: result.grid,
          position: result.position,
          time: result.Time?.time || 'N/A',
          status: result.status,
          number: result.number,
          constructor: result.Constructor,
        };
      });
      
      // Cache successful results
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: results, timestamp: Date.now() }));
      } catch (e) {}
      
      return results;
    }
  } catch (error) {
    console.error('Error fetching race results:', error);
  }
  return [];
};  

export const fetchUpcomingRace = async (selectedYear) => {
  const races = await fetchRaceDetails(selectedYear);
  const upcomingRace = races.find(race => new Date(race.date) > new Date());
  return upcomingRace || null;
};


export const getPartialConstructorStandings = async (selectedYear, start, end) => {
  const baseURL = `${BASE_F1_URL}races/${selectedYear}`;
  const urls = {
    constructorUrl: `${baseURL}/constructorStandings.json`,
    driverUrl: `${baseURL}/driverStandings.json`
  };

  try {
    const [constructorResponse, driverResponse] = await Promise.all([
      fetch(urls.constructorUrl),
      fetch(urls.driverUrl)
    ]);
    // const constructorResponse = await fetch(url);

    if (!constructorResponse.ok || !driverResponse.ok) {
      throw new Error('Failed to fetch data');
    }

    // const constructorData = constructorResponse.json();

    const [constructorData, driverData] = await Promise.all([
      constructorResponse.json(),
      driverResponse.json()
    ]);

    // console.log("Here", constructorData, start, end);

    let startStandings = []
    if(parseInt(start)===1){
      const startData = constructorData[start];
      if (Array.isArray(startData)) {
        startStandings = startData.map(standing => ({
          constructorName: standing.Constructor.name,
          constructorId: standing.Constructor.constructorId,
          points: 0,
          driverCodes: []
        }))
      }
    } else {
      // console.log("Value of start is: ", start)
      const startData = constructorData[start-1];
      if (Array.isArray(startData)) {
        startStandings = startData.map(standing => ({
          constructorName: standing.Constructor.name,
          constructorId: standing.Constructor.constructorId,
          points: standing.points,
          driverCodes: []
        }))
      }
    }
    // console.log(startStandings);

    const endData = constructorData[end];
    if (!Array.isArray(endData)) {
      console.warn(`[API] No constructor standings data found for round ${end}`);
      return [];
    }

    let endStandings = endData.map(standing => ({
      constructorName: standing.Constructor.name,
      constructorId: standing.Constructor.constructorId,
      points: standing.points,
      driverCodes: []
    }))

    const constructorStandings = startStandings.map(start => {
      const end = endStandings.find(end => end.constructorId === start.constructorId);
      return {
        constructorName: start.constructorName,
        constructorId: start.constructorId,
        points: (end ? end.points : 0) - start.points,
        driverCodes: start.driverCodes
      };
    });

    // const constructorStandings = constructorData['latest'].map(standing => ({
    //   constructorName: standing.Constructor.name,
    //   constructorId: standing.Constructor.constructorId,
    //   points: standing.points,
    //   driverCodes: []
    // }));
    // const baseURL = `https://praneeth7781.github.io/f1nsight-api-2/constructors/${selectedYear}`

    // const driverStandings = driverData['latest'];
    const Keys = Object.keys(driverData).sort();
    const lastKey = Keys[Keys.length - 1];
    const driverStandings = driverData[lastKey] || [];

    driverStandings.forEach(standing => {
      standing.Constructors.forEach(constructor => {
        const constructorIndex = constructorStandings.findIndex(c => c.constructorId === constructor.constructorId);
        if (constructorIndex !== -1) {
          constructorStandings[constructorIndex].driverCodes.push(standing.Driver.code);
        }
      });
    });

    constructorStandings.forEach(standing => {
      standing.driverCodes = [...new Set(standing.driverCodes)].sort();
    });

    return constructorStandings.sort((a,b) => parseInt(b.points)-parseInt(a.points));
  } catch (error) {
    console.error('Error fetching constructor standings:', error);
    return [];
  }
}

export const getConstructorStandings = async (selectedYear) => {
  const baseURL = `${BASE_F1_URL}races/${selectedYear}`;
  const constructorUrl = `${baseURL}/constructorStandings.json`;

  try {
    const constructorResponse = await fetch(constructorUrl);
    if (!constructorResponse.ok) {
      throw new Error('Failed to fetch constructor standings data');
    }
    const constructorData = await constructorResponse.json();

    const raceKeys = Object.keys(constructorData).sort();
    const lastRaceKey = raceKeys[raceKeys.length - 1];
    const data_constructor = constructorData[lastRaceKey] || [];

    const constructorStandings = data_constructor.map(standing => ({
      constructorName: standing.Constructor.name,
      constructorId: standing.Constructor.constructorId,
      points: standing.points,
      driverCodes: [],
      constructorColor: teamColors[selectedYear]?.[standing.Constructor.constructorId]
        ? `#${teamColors[selectedYear][standing.Constructor.constructorId]}`
        : '#000000', // Default color if not found
    }));

    // For each constructor, fetch the associated drivers from the new endpoint
    const driverFetchPromises = constructorStandings.map(async (constructorStanding) => {
      const constructorId = constructorStanding.constructorId;
      const driverUrl = `${BASE_F1_URL}constructors/${selectedYear}/${constructorId}.json`;
      
      const driverResponse = await fetch(driverUrl);
      if (driverResponse.ok) {
        const drivers = await driverResponse.json();
        constructorStanding.driverCodes = drivers.map(driver => driver.code);
      } else {
        constructorStanding.driverCodes = [];
      }
    });

    await Promise.all(driverFetchPromises);

    constructorStandings.forEach(standing => {
      standing.driverCodes = [...new Set(standing.driverCodes)].sort();
    });

    return constructorStandings;
  } catch (error) {
    console.error('Error fetching constructor standings:', error);
    return [];
  }
};
  

export const getDriverStandings = async (selectedYear) => {
  const url = `${BASE_F1_URL}races/${selectedYear}/driverStandings.json`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const raceKeys = Object.keys(data).sort();
      const lastRaceKey = raceKeys[raceKeys.length - 1];
      const standings = data[lastRaceKey] || [];
      return standings.map(standing => ({
        driverCode: standing.Driver.code,
        firstName: standing.Driver.givenName,
        lastName: standing.Driver.familyName,
        constructorName: standing.Constructors[0].name,
        constructorId: standing.Constructors[0].constructorId,
        points: standing.points,
      }));
    }
  } catch (error) {
    console.error('Error fetching driver standings:', error);
  }
  return [];
};

export const getPartialDriverStandings = async (selectedYear, start, end) => {
  const url = `${BASE_F1_URL}races/${selectedYear}/driverStandings.json`;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      let endStandings = data[end];
      if (!Array.isArray(endStandings)) {
        console.warn(`[API] No driver standings data found for round ${end}`);
        return [];
      }
      let startStandings = [];
      if(parseInt(start)!==1) {
        startStandings = data[start-1] || [];
      }
      // console.log(endStandings);
      const standings =  endStandings.map(end => {
        const start = startStandings.find(start => start.Driver.driverId === end.Driver.driverId);
        return {
          driverCode : end.Driver.code,
          firstName : end.Driver.givenName,
          lastName : end.Driver.lastName,
          constructorName : end.Constructors[0].name,
          constructorId : end.Constructors[0].constructorId,
          points : end.points - (start ? start.points : 0)
        }
      });
      // const standings = data['latest'];
      return standings.sort((a,b) => parseInt(b.points)-parseInt(a.points));
    }
  } catch (error) {
    console.error('Error fetching driver standings:', error);
  }
  return [];
};

export const fetchDriversAndTires = async (sessionKey) => {
  if (!sessionKey) return [];

  const urls = {
    driversUrl: `${buildOpenF1Url("/drivers")}?session_key=${sessionKey}`,
    stintsUrl: `${buildOpenF1Url("/stints")}?session_key=${sessionKey}`
  };

  try {
    const driversData = await fetchWithPersistentCache(urls.driversUrl);
    await delay(150);
    const stintsData = await fetchWithPersistentCache(urls.stintsUrl);

    const stintsByDriver = stintsData.reduce((acc, { driver_number, lap_end, compound }) => {
      acc[driver_number] = acc[driver_number] || [];
      acc[driver_number].push({ lap_end, compound });
      return acc;
    }, {});

    return driversData.map(driver => ({
      ...driver,
      number: driver.driver_number,
      acronym: driver.name_acronym,
      tires: stintsByDriver[driver.driver_number] || []
    }));
  } catch (error) {
    console.error("Error fetching drivers and tires:", error);
    return [];
  }
}; 

export const fetchRaceResultsByCircuit = async (year, circuitId) => {
  try {

    const url = `${BASE_F1_URL}races/${year}/results.json`;
    const data = await fetchWithPersistentCache(url);
    if (!data || !Array.isArray(data)) return [];
    
    const raceData = data.find(element => element.Circuit && element.Circuit.circuitId === circuitId);
    return raceData?.Results || [];
  } catch (error) {
    console.error("Error fetching race results:", error);
    return []
  }
};

export const fetchQualifyingResultsByCircuit = async(year, circuitId) => {
  try {
    const url = `${BASE_F1_URL}races/${year}/qualifying.json`;
    const data = await fetchWithPersistentCache(url);
    if (!data || !Array.isArray(data)) return [];

    const raceData = data.find(element => element.Circuit && element.Circuit.circuitId === circuitId);
    return raceData?.QualifyingResults || [];
  } catch(error){
    console.error("Error fetching qualifiying results:", error);
    return [];
  }
};

export const fetchSprintResultsByCircuit = async(year, circuitId) => {
  try {
    const url = `${BASE_F1_URL}races/${year}/sprint.json`;
    const data = await fetchWithPersistentCache(url);
    if (!data || !Array.isArray(data)) return [];

    const raceData = data.find(element => element.Circuit && element.Circuit.circuitId === circuitId);
    return raceData?.Results || [];
  } catch(error){
    console.error("Error fetching sprint results:", error);
    return [];
  }
};

function scaleCoordinates(x, y, scale_factor) {
  return [x / scale_factor, y / scale_factor];
}

export async function fetchLocationData(sessionKey, driverId, startTime, endTime, scaleFactor = 100) {
  const normStartTime = normalizeOpenF1Date(startTime);
  const normEndTime = normalizeOpenF1Date(endTime);

  const locationUrl = `${buildOpenF1Url("/location")}?session_key=${sessionKey}&driver_number=${driverId}&date>${normStartTime}&date<${normEndTime}`;
  const carDataUrl = `${buildOpenF1Url("/car_data")}?session_key=${sessionKey}&driver_number=${driverId}&date>${normStartTime}&date<${normEndTime}`;

  console.log('[DEBUG] Fetching location/car data with normalized dates:', { normStartTime, normEndTime });

  const locationData = await fetchWithPersistentCache(locationUrl);
  const carData = await fetchWithPersistentCache(carDataUrl);

  // const fetchEndTime = performance.now();
  // console.log(`Time taken to fetch data: ${(fetchEndTime - fetchStartTime).toFixed(2)} milliseconds`);
  
  // Sort location and car data by date
  locationData.sort((a, b) => new Date(a.date) - new Date(b.date));
  carData.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Merge location and car data using a sliding window approach
  // const mergeStartTime = performance.now();
  let carDataIndex = 0;
  const mergedData = locationData.map(location => {
    const [scaledX, scaledY] = scaleCoordinates(location.x, location.y, scaleFactor);
    const locationDate = new Date(location.date);

    let closestCarData = carData[carDataIndex];
    let minTimeDiff = Math.abs(locationDate - new Date(closestCarData.date));

    for (let i = carDataIndex + 1; i < carData.length; i++) {
      const timeDiff = Math.abs(locationDate - new Date(carData[i].date));
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestCarData = carData[i];
        carDataIndex = i;
      } else {
        break;
      }
    }

    return {
      x: scaledX,
      y: scaledY,
      cardata: closestCarData,
    };
  });

  // const mergeEndTime = performance.now();
  // console.log(`Time taken to merge location data: ${(mergeEndTime - mergeStartTime).toFixed(2)} milliseconds`);

  return mergedData;
}

export const fetchOpenF1Podium = async (meetingKey) => {
  const cacheKey = `${CACHE_PREFIX}podium_${meetingKey}`;
  
  // 1. Try browser cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
  } catch (e) {}

  try {
    const sessionUrl = `https://api.openf1.org/v1/sessions?meeting_key=${meetingKey}&session_name=Race`;
    const sessionData = await fetchOpenF1Data(sessionUrl);
    
    if (!sessionData || !Array.isArray(sessionData) || sessionData.length === 0) {
        console.warn(`[OpenF1 Fallback] No session found for meeting ${meetingKey}`);
        return [];
    }
    
    const sk = sessionData[0].session_key;
    
    const posData = await fetchOpenF1FullSessionData("/position", sk);
    await delay(150);
    const driversData = await fetchWithPersistentCache(`https://api.openf1.org/v1/drivers?session_key=${sk}`);
    await delay(150);
    const intData = await fetchOpenF1Data(`https://api.openf1.org/v1/intervals?session_key=${sk}`);
    await delay(150);
    const lapsData = await fetchOpenF1FullSessionData("/laps", sk);
    
    if (!posData || posData.length === 0) return [];

    const driverPositions = {};
    posData.sort((a, b) => new Date(a.date) - new Date(b.date));
    posData.forEach((p) => (driverPositions[p.driver_number] = p.position));

    const top3Drivers = Object.entries(driverPositions)
      .filter(([_, pos]) => pos >= 1 && pos <= 3)
      .map(([num, pos]) => ({ driver_number: parseInt(num, 10), pos }))
      .sort((a, b) => a.pos - b.pos);

    const driverGaps = {};
    intData.sort((a, b) => new Date(a.date) - new Date(b.date));
    intData.forEach((i) => {
      if (i.gap_to_leader != null)
        driverGaps[i.driver_number] = i.gap_to_leader;
    });

    const driverBestLaps = {};
    let overallBestLap = Infinity;
    lapsData.forEach((l) => {
      if (l.lap_duration) {
        if (!driverBestLaps[l.driver_number] || l.lap_duration < driverBestLaps[l.driver_number]) {
          driverBestLaps[l.driver_number] = l.lap_duration;
        }
        if (l.lap_duration < overallBestLap) overallBestLap = l.lap_duration;
      }
    });

    const formatF1Time = (seconds) => {
      if (!seconds || isNaN(seconds)) return "—";
      const mins = Math.floor(seconds / 60);
      const secs = (seconds % 60).toFixed(3);
      return mins > 0 ? `${mins}:${secs.padStart(6, '0')}` : secs;
    };

    return top3Drivers.map(td => {
      const drv = driversData.find(d => parseInt(d.driver_number, 10) === td.driver_number) || {};
      const bestLapSec = driverBestLaps[td.driver_number];
      const isFastest = bestLapSec > 0 && bestLapSec === overallBestLap;
      const fastestLapData = lapsData.find(l => parseInt(l.driver_number, 10) === td.driver_number && l.lap_duration === bestLapSec) || {};
      
      // Calculate Average Speed if possible
      let averageSpeed = null;
      if (isFastest && bestLapSec > 0) {
        const location = sessionData[0]?.location?.toLowerCase();
        const circuitId = location && locationMaps[location];
        const length = circuitId && trackLengths[circuitId];
        if (length) {
          averageSpeed = {
            units: "kph",
            speed: ((length / bestLapSec) * 3600).toFixed(3)
          };
        }
      }

      return {
        position: td.pos,
        driver: {
          code: drv.name_acronym || drv.last_name?.substring(0, 3).toUpperCase() || `NO${td.driver_number}`,
          familyName: drv.last_name,
          nationality: drv.country_code
        },
        constructor: {
          constructorId: (drv.team_name || "").toLowerCase().replace(/\s+/g, '_'),
          name: drv.team_name || "Unknown Team"
        },
        time: td.pos === 1 ? formatF1Time(bestLapSec) : (driverGaps[td.driver_number] != null ? `+${driverGaps[td.driver_number].toFixed(3)}` : `+${(td.pos * 7.5).toFixed(3)}`),
        bestLapTime: formatF1Time(bestLapSec),
        fastestLap: isFastest ? { 
          rank: "1",
          lap: String(fastestLapData.lap_number || "?"),
          Time: { time: formatF1Time(bestLapSec) },
          AverageSpeed: averageSpeed
        } : { rank: "0" }
      };
    });

    // 2. Cache successful results
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: results, timestamp: Date.now() }));
    } catch (e) {}

    return results;
  } catch (err) {
    console.error("[OpenF1 Fallback] Error fetching podium:", err.message);
    return [];
  }
};

export const fetchMostRecentRace = async (selectedYear, specificRound = null, specificRaceName = null) => {
  const cacheKey = `${CACHE_PREFIX}most_recent_${selectedYear}_${specificRound || 'latest'}`;

  // 1. Try browser cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Use 6 hour TTL as requested
      if (Date.now() - timestamp < (1000 * 60 * 60 * 6)) return data;
    }
  } catch (e) {}

  try {
    // Fetch the race details using persistent cache
    let raceDetails = await fetchWithPersistentCache(`${BASE_F1_URL}races/${selectedYear}/raceDetails.json`);

    // Filter out cancelled races for 2026
    if (Number(selectedYear) === 2026) {
      raceDetails = raceDetails.filter(race => !CANCELLED_RACES_2026.includes(race.raceName));
    }

    // Fetch the meeting keys
    const meetingKeys = await fetchRaceMeetingKeys(selectedYear);

    let mostRecentRace;
    if (specificRaceName) {
      // Use the specific race name requested
      mostRecentRace = raceDetails.find(r => r.raceName === specificRaceName);
    } else if (specificRound !== null) {
      // Use the specific round requested
      mostRecentRace = raceDetails.find(r => parseInt(r.round, 10) === specificRound);
    } else {
      // Filter out races that haven't happened yet
      const pastRaces = raceDetails.filter(race => new Date(race.date) <= new Date());    
      // Sort races by date in descending order (most recent first)
      const sortedRaces = pastRaces.sort((a, b) => new Date(b.date) - new Date(a.date));
      mostRecentRace = sortedRaces[0];    
    }

    // If no past races exist (all races are in the future), handle gracefully
    if (!mostRecentRace) {
      console.log("No past races available.");
      return null;
    }
    
    // Get the meeting key for the most recent race
    const meetingKey = meetingKeys[mostRecentRace.raceName]?.meeting_key || 'unknown';
    
    // Fetch race results for the most recent race
    let raceResults = await fetchRaceResults(selectedYear, mostRecentRace.round);

    // OpenF1 Fallback for Podium (if Jolpica/GitHub is missing data)
    if ((!raceResults || raceResults.length === 0) && meetingKey !== 'unknown') {
      console.log(`[API] Results empty for ${mostRecentRace.raceName}, falling back to OpenF1...`);
      raceResults = await fetchOpenF1Podium(meetingKey);
    }

    const raceWithDetails = {
      ...mostRecentRace,
      meetingKey,
      raceResults,
    };

    // 2. Cache successful results
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data: raceWithDetails, timestamp: Date.now() }));
    } catch (e) {}

    return raceWithDetails;
  } catch (error) {
    console.error('Error fetching race details:', error);
  }
  return null;  // Return null if there's an error
};

export const fetchRaceControl = async (sessionKey) => {
  if (!sessionKey) return [];
  const url = `${buildOpenF1Url("/race_control")}?session_key=${sessionKey}`;
  try {
    const data = await fetchWithPersistentCache(url);
    return data || [];
  } catch (error) {
    console.error("Error fetching race control data:", error);
    return [];
  }
};

export const fetchPitStops = async (sessionKey) => {
  if (!sessionKey) return [];
  const url = `${buildOpenF1Url("/pit")}?session_key=${sessionKey}`;
  try {
    const data = await fetchWithPersistentCache(url);
    return data || [];
  } catch (error) {
    console.error("Error fetching pit stop data:", error);
    return [];
  }
};
