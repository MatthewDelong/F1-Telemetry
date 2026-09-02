import teamColors from "./teamColors.json";
import { buildOpenF1Url, OPENF1_API_BASE_URL } from "../config/openf1";
import { trackLengths } from "./trackLengths";
import { locationMaps } from "./locationMaps";

const CANCELLED_RACES_2026 = ["Saudi Arabian Grand Prix"];
const CANCELLED_MEETING_KEYS_2026 = [1282]; // Remove old Bahrain GP (Sakhir) since a new one was added

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
  return d.toISOString();
}

const CACHE_PREFIX = "f1_cache_v8_";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchOpenF1Data = async (url, retries = 7, backoff = 1500) => {
    try {
        // Use headers to bypass cache instead of query param which breaks OpenF1 filters
        const response = await fetch(url, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
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
            if (response.status === 401 || response.status === 403) {
                console.warn(`[API] Unauthorized or Forbidden (${response.status}) on ${url}. API is likely restricted due to a live session. Returning empty array.`);
                if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("openf1-restricted"));
                }
                return [];
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        // Only retry network errors or errors thrown above (excluding 401/403 which return [])
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
    const cacheKey = `${CACHE_PREFIX}full_${endpoint}_${sessionKey}_${extraParams}`;
    
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL && data && data.length > 0) {
                console.log(`[API] Loaded full session data from cache for ${endpoint}`);
                return data;
            }
        }
    } catch (e) {
      console.warn("[Cache] Failed to read localStorage cache for full session data:", e);
    }

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
                const incrementedDate = d.toISOString();
                
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
                await new Promise(r => setTimeout(r, 400));
            }
        }
        
        if (allData.length > 0) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    timestamp: Date.now(),
                    data: allData
                }));
            } catch (e) {
                console.warn("[API] Failed to cache full session data (might be too large)");
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
            const isInvalidArray = Array.isArray(data) && data.length <= 1;
            
            if (!isExpired && !isInvalidArray) {
                return data;
            }
            // Keep for fallback if network fails, but only if it's not an empty or 1-item array
            if (!isInvalidArray && Array.isArray(data)) {
                cachedData = data; 
            }
        }
    } catch (e) {
        console.warn("[Cache] Error reading from localStorage", e);
    }

    // 2. Fetch from network
    try {
        const data = await fetchOpenF1Data(url);
        
        // 3. Save to localStorage if successful AND valid data
        if (data && !data.error && !(Array.isArray(data) && data.length <= 1)) {
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
        // 4. GitHub Fallback for F1 API endpoints
        if (url.includes('source=f1') || url.includes('/proxy/f1/')) {
            try {
                let cleanPath = url.includes('path=') 
                    ? url.split('path=')[1] 
                    : (url.includes('/proxy/f1/') ? url.split('/proxy/f1/')[1] : '');
                cleanPath = cleanPath.split('?')[0].split('&')[0];
                if (cleanPath) {
                    const ghUrls = [
                        `https://raw.githubusercontent.com/MatthewDelong/f1-telemetry-api/main/${cleanPath}`,
                        `https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/f1/${cleanPath}`
                    ];
                    for (const ghUrl of ghUrls) {
                        try {
                            const ghResp = await fetch(ghUrl);
                            if (ghResp.ok) {
                                const ghData = await ghResp.json();
                                if (ghData && !ghData.error && !(Array.isArray(ghData) && ghData.length <= 1)) {
                                    console.log(`[Cache Fallback] Loaded ${cleanPath} from raw GitHub`);
                                    return ghData;
                                }
                            }
                        } catch (e) {}
                    }
                }
            } catch (e) {}
        }

        // 5. FALLBACK: If network and GitHub fail but we had expired data, return it
        if (cachedData) {
            console.warn(`[Cache] Network failed for ${url}, returning stale data.`, error);
            return cachedData;
        }
        throw error;
    }
};

export const fetchDriversList = async () => {
    const formatDriverName = (driver) => {
        if (driver.driverId === 'antonelli') {
            return 'Kimi Antonelli';
        }
        return `${driver.givenName} ${driver.familyName}`;
    };

    try {
        const response = await fetchWithPersistentCache(`${BASE_F1_URL}driversList.json?v=2026_v2`);
        if (Array.isArray(response) && response.length > 50 && response[0]?.driverId) {
            return response.map(driver => ({
                id: driver.driverId,
                name: formatDriverName(driver)
            }));
        }
        console.warn("[API] fetchDriversList response was not a valid driver array. Triggering static/GitHub fallback...");
    } catch (e) {
        console.warn("[API] fetchDriversList failed via primary endpoint:", e);
    }

    // 1. Direct static build asset fallback (/driversList.json in public/build)
    try {
        const staticResp = await fetch('/driversList.json');
        if (staticResp.ok) {
            const data = await staticResp.json();
            if (Array.isArray(data) && data.length > 50) {
                return data.map(driver => ({
                    id: driver.driverId,
                    name: formatDriverName(driver)
                }));
            }
        }
    } catch (e) {}

    // 2. Direct GitHub raw fallback from main F1-Telemetry repository
    try {
        const ghUrls = [
            'https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/f1/driversList.json',
            'https://raw.githubusercontent.com/MatthewDelong/f1-telemetry-api/main/driversList.json'
        ];
        for (const ghUrl of ghUrls) {
            try {
                const ghResp = await fetch(ghUrl);
                if (ghResp.ok) {
                    const data = await ghResp.json();
                    if (Array.isArray(data) && data.length > 50) {
                        return data.map(driver => ({
                            id: driver.driverId,
                            name: formatDriverName(driver)
                        }));
                    }
                }
            } catch (err) {}
        }
    } catch (e) {
        console.error("[API] GitHub fallbacks for driversList failed:", e);
    }
    return [];
};

export const fetchDriverStats = async (driverId1, driverId2, refresh = false) => {
  const fetchDriverData = async (driverId) => {
    const rawGithubUrl = `https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/f1/drivers/${driverId}.json`;

    try {
      let url = `${BASE_F1_URL}drivers/${driverId}.json`;
      if (refresh) {
        url += (url.includes('?') ? '&' : '?') + 'refresh=true';
        url += `&t=${Date.now()}`; // Add timestamp to bust browser cache too
      }
      const dataResponse1 = await fetch(url);
      if (dataResponse1.ok) {
        const data1 = await dataResponse1.json();
        if (data1 && !data1.error) return data1;
      }
      console.warn(`[API] Primary fetch failed for driver ${driverId} (HTTP ${dataResponse1?.status}). Trying raw GitHub fallback...`);
    } catch (error) {
      console.warn(`[API] Error fetching driver data for ${driverId} via primary endpoint. Trying raw GitHub fallback...`, error);
    }

    // Fallback directly to GitHub raw content if primary API / proxy fails
    try {
      const ghResponse = await fetch(rawGithubUrl);
      if (ghResponse.ok) {
        const ghData = await ghResponse.json();
        return ghData;
      }
      console.error(`[API] Raw GitHub fallback failed for driver ${driverId}: HTTP ${ghResponse.status}`);
    } catch (ghErr) {
      console.error(`[API] Error fetching raw GitHub fallback for driver ${driverId}:`, ghErr);
    }

    return null;
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
  } catch (e) {
    console.warn("[Cache] Failed to read meeting keys from localStorage:", e);
  }

  try {
    const raceResponse = await fetch(`${BASE_F1_URL}races/races.json?t=${Date.now()}`);
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
    } catch (e) {
      console.warn("[Cache] Failed to write meeting keys to localStorage:", e);
    }

    return result;
  } catch(error) {
    console.error('Error fetching data:', error);
    return undefined;
  }
};

// Header
export const fetchRacesAndSessions = async (selectedYear) => {
  try {
      // Fetch races
      const racesData = await fetchWithPersistentCache(`${buildOpenF1Url("/meetings")}?year=${selectedYear}`);

      // Filter out cancelled races for 2026
      let filteredRacesData = Array.isArray(racesData) ? racesData : [];
      
      // Fallback if OpenF1 API is restricted (returns object) or empty
      if (filteredRacesData.length === 0) {
        console.warn("[API] OpenF1 /meetings returned empty or restricted data. Falling back to fetchRaceMeetingKeys.");
        const meetingKeysObj = await fetchRaceMeetingKeys(selectedYear);
        if (meetingKeysObj) {
            filteredRacesData = Object.entries(meetingKeysObj).map(([name, data]) => ({
                meeting_name: name,
                meeting_key: data.meeting_key,
                location: data.location
            }));
        }
      }

      if (Number(selectedYear) === 2026) {
        filteredRacesData = filteredRacesData.filter(race => 
          !CANCELLED_RACES_2026.includes(race.meeting_name) &&
          !CANCELLED_MEETING_KEYS_2026.includes(race.meeting_key)
        );
      }

      // Fetch sessions (using cached sessionsData if possible, but specifically for 'Race' filter)
      const f1apiMeetingSessionsList = await fetchWithPersistentCache(`${buildOpenF1Url("/sessions")}?year=${selectedYear}&session_name=Race`);

      // Filter races based on meeting_key presence in sessions, ONLY if sessions fetched successfully
      let filteredRaces = filteredRacesData;
      if (Array.isArray(f1apiMeetingSessionsList) && f1apiMeetingSessionsList.length > 0) {
          filteredRaces = filteredRacesData.filter(race => 
              f1apiMeetingSessionsList.some(session => session.meeting_key === race.meeting_key)
          );
      } else {
          console.warn("[API] OpenF1 /sessions returned empty or restricted data. Skipping session filter.");
      }
      
      return filteredRaces;
  } catch (error) {
      console.error('Error fetching data:', error);
      return [];
  }
};
  
// race results page
export const fetchRaceDetails = async (selectedYear) => {
const url = `${BASE_F1_URL}races/${selectedYear}/raceDetails.json?t=${Date.now()}`;
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

      const results = [];
      for (let i = 0; i < races.length; i++) {
        const race = races[i];
        if (new Date(race.date) < new Date()) {
          const raceResults = await fetchRaceResults(selectedYear, race.round, race.raceName, race.Circuit?.circuitId, race.date);
          results.push({ ...race, results: raceResults });
          // Add a small delay between requests to avoid rate limiting
          if (i < races.length - 1) await new Promise(r => setTimeout(r, 100));
        } else {
          results.push({
            raceName: race.raceName,
            date: race.date,
            season: race.season,
            round: race.round,
            time: race.time,
            Circuit: race.Circuit,
            circuitId: race.circuitId || race.Circuit?.circuitId,
          });
        }
      }

      return results;
    } else {
      console.error('Failed to fetch data');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
  return [];
};
  
const fetchRaceResults = async (selectedYear, raceId, fallbackRaceName = "", fallbackCircuitId = "", fallbackDate = "") => {
  const cacheKey = `${CACHE_PREFIX}results_${selectedYear}_${raceId}`;
  
  // 1. Try browser cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    }
  } catch (e) {
    console.warn("[Cache] Failed to read race results from localStorage:", e);
  }

  const isCurrentYear = String(selectedYear) === "2026";
  const resultsUrl = `${BASE_F1_URL}${isCurrentYear ? '2026/' : ''}results.json`;
  try {
    const rawData = await fetchWithPersistentCache(resultsUrl);
    if (rawData && Array.isArray(rawData)) {
      const tempdata = rawData.filter(el => el.season === String(selectedYear));
      const raceIdNum = parseInt(raceId, 10);
      
      // 1. Primary search: by round
      let raceData = tempdata.find(element => parseInt(element.round, 10) === raceIdNum);
      
      // 2. Fallback: search by Circuit ID (Most reliable for historical mismatches)
      if (!raceData && fallbackCircuitId) {
        raceData = tempdata.find(element => 
          (element.Circuit?.circuitId === fallbackCircuitId) || 
          (element.circuitId === fallbackCircuitId)
        );
      }

      // 3. Fallback: search by Date
      if (!raceData && fallbackDate) {
        const targetDate = fallbackDate.split('T')[0];
        raceData = tempdata.find(element => element.date === targetDate);
      }

      // 4. Fallback: search by Name (Flexible property check)
      if (!raceData && fallbackRaceName) {
        const searchName = fallbackRaceName.toLowerCase().replace(" grand prix", "");
        raceData = tempdata.find(element => {
          const name = (element.raceName || element.RaceName || "").toLowerCase();
          return name.includes(searchName);
        });
      }

      if (!raceData || !raceData.Results) {
        // Fallback to OpenF1 if this is a past race
        console.log(`[API] Results empty for round ${raceId}, checking OpenF1 fallback...`);
        const meetingKeys = await fetchRaceMeetingKeys(selectedYear);
        
        // Try to find meeting key by fallback name
        if (fallbackRaceName && meetingKeys[fallbackRaceName]) {
          const meetingKey = meetingKeys[fallbackRaceName].meeting_key;
          return await fetchOpenF1Podium(meetingKey);
        }
        return [];
      }
      const data = raceData.Results;
      // console.log('response', data);

      // console.log(data.slice(0,3));
      console.log(`[API Debug] Results for ${selectedYear} Round ${raceId}:`, data.length, "results");
      const results = data.map(result => {
        const drv = result.Driver || (result.driver && typeof result.driver !== 'function' ? result.driver : undefined) || {};
        const con = result.Constructor || (result.constructor && typeof result.constructor !== 'function' ? result.constructor : undefined) || {};
        return {
          driver: {
            ...drv,
            nationality: drv?.nationality || drv?.country_code || drv?.country || ""
          },
          fastestLap: result.FastestLap || result.fastestLap,
          bestLapTime: (result.FastestLap || result.fastestLap)?.Time?.time || result.bestLapTime || '—',
          grid: result.grid,
          position: result.position,
          time: (result.Time || result.time)?.time || result.time || 'N/A',
          status: result.status,
          number: result.number,
          constructor: con,
        };
      });
      
      // Cache successful results
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ data: results, timestamp: Date.now() }));
      } catch (e) {
        console.warn("[Cache] Failed to write race results to localStorage:", e);
      }
      
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
    // const baseURL = `https://matthewdelong.github.io/f1-telemetry-api/constructors/${selectedYear}`

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
        lastName: standing.Driver.familyName || standing.Driver.lastName,
        constructorName: standing.Constructors[0].name,
        constructorId: standing.Constructors[0].constructorId,
        constructorColor: teamColors[selectedYear]?.[standing.Constructors[0].constructorId] 
          ? `#${teamColors[selectedYear][standing.Constructors[0].constructorId]}` 
          : "#ffffff",
        points: standing.points,
        nationality: standing.Driver.nationality || ""
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
          lastName : end.Driver.familyName || end.Driver.lastName,
          constructorName : end.Constructors[0].name,
          constructorId : end.Constructors[0].constructorId,
          constructorColor: teamColors[selectedYear]?.[end.Constructors[0].constructorId] 
            ? `#${teamColors[selectedYear][end.Constructors[0].constructorId]}` 
            : "#ffffff",
          points : end.points - (start ? start.points : 0),
          nationality: end.Driver.nationality || ""
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
    let driversData = await fetchWithPersistentCache(urls.driversUrl);
    // If cached driversData is empty, try fetching fresh data to avoid 6-hour empty cache
    if (!driversData || driversData.length === 0) {
      driversData = await fetchOpenF1Data(urls.driversUrl);
    }
    
    await delay(150);
    
    let stintsData = await fetchWithPersistentCache(urls.stintsUrl);
    // Force fresh fetch if cache returned empty to avoid missing tyre info
    if (!stintsData || stintsData.length === 0) {
      stintsData = await fetchOpenF1Data(urls.stintsUrl);
    }

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

export const fetchRaceResultsByCircuit = async (year, circuitId, raceName = "") => {
  try {
    const isCurrentYear = String(year) === "2026";
    const url = `${BASE_F1_URL}${isCurrentYear ? '2026/' : ''}results.json`;
    const data = await fetchWithPersistentCache(url);
    if (!data || !Array.isArray(data)) return [];
    
    // Robust finding: try circuitId, then raceName, then locality
    const raceData = data.find(element => {
      const matchYear = element.season === String(year);
      if (!matchYear) return false;

      const matchId = element.Circuit && element.Circuit.circuitId === circuitId;
      const matchName = raceName && element.raceName && 
                        element.raceName.toLowerCase().includes(raceName.toLowerCase());
      const matchLocality = circuitId && element.Circuit?.Location?.locality && 
                            element.Circuit.Location.locality.toLowerCase() === circuitId.toLowerCase();
      
      return matchId || matchName || matchLocality;
    });

    return raceData?.Results || [];
  } catch (error) {
    console.error("Error fetching race results:", error);
    return []
  }
};

export const fetchQualifyingResultsByCircuit = async(year, circuitId, raceName = "") => {
  try {
    const isCurrentYear = String(year) === "2026";
    const url = `${BASE_F1_URL}${isCurrentYear ? '2026/' : ''}qualifying.json`;
    const data = await fetchWithPersistentCache(url);
    if (!data || !Array.isArray(data)) return [];

    const raceData = data.find(element => {
      const matchYear = element.season === String(year);
      if (!matchYear) return false;

      const matchId = element.Circuit && element.Circuit.circuitId === circuitId;
      const matchName = raceName && element.raceName && 
                        element.raceName.toLowerCase().includes(raceName.toLowerCase());
      const matchLocality = circuitId && element.Circuit?.Location?.locality && 
                            element.Circuit.Location.locality.toLowerCase() === circuitId.toLowerCase();
      
      return matchId || matchName || matchLocality;
    });

    return raceData?.QualifyingResults || [];
  } catch(error){
    console.error("Error fetching qualifying results:", error);
    return [];
  }
};

export const fetchSprintResultsByCircuit = async(year, circuitId, raceName = "") => {
  try {
    const isCurrentYear = String(year) === "2026";
    const url = `${BASE_F1_URL}${isCurrentYear ? '2026/' : ''}sprint.json`;
    const data = await fetchWithPersistentCache(url);
    if (!data || !Array.isArray(data)) return [];

    const raceData = data.find(element => {
      const matchYear = element.season === String(year);
      if (!matchYear) return false;

      const matchId = element.Circuit && element.Circuit.circuitId === circuitId;
      const matchName = raceName && element.raceName && 
                        element.raceName.toLowerCase().includes(raceName.toLowerCase());
      const matchLocality = circuitId && element.Circuit?.Location?.locality && 
                            element.Circuit.Location.locality.toLowerCase() === circuitId.toLowerCase();
      
      return matchId || matchName || matchLocality;
    });

    return raceData?.SprintResults || raceData?.Results || [];
  } catch(error){
    console.error("Error fetching sprint results:", error);
    return [];
  }
};

/**
 * Fetch raw GPS reference data for procedural track generation.
 * Gets location data for the first available driver to extract the track shape.
 * Returns raw {x, y} points (NOT scaled) suitable for TrackBuilder.
 */
export async function fetchTrackReferenceData(sessionKey, circuitId = null) {
  if (!sessionKey) return [];

  // 0. Check for local static track shape to bypass OpenF1 completely
  if (circuitId) {
    try {
      const localUrl = `/trackdata/${circuitId.toLowerCase()}.json`;
      const res = await fetch(localUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          console.log(`[API] Track reference loaded from local static file for ${circuitId}`);
          return data;
        }
      }
    } catch (e) {
      console.warn("[API] Failed to load local static track file:", e);
    }
  }

  const cacheKey = `${CACHE_PREFIX}trackref_${sessionKey}`;

  // 1. Check localStorage cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL && data && data.length > 0) {
        console.log(`[API] Track reference loaded from cache (${data.length} points)`);
        return data;
      }
    }
  } catch (e) {
    console.warn("[Cache] Failed to read track reference from localStorage:", e);
  }

  try {
    // 2. Get laps to find a perfect single lap
    const lapsUrl = `${buildOpenF1Url("/laps")}?session_key=${sessionKey}`;
    let lapsData = await fetchWithPersistentCache(lapsUrl).catch(() => []);
    
    // FALLBACK: If there's no lap data (upcoming race), fetch track shape from 2024
    if (!lapsData || lapsData.length === 0) {
      console.log(`[API] No laps for session ${sessionKey}. Attempting 2024 fallback...`);
      try {
        const sessionInfo = await fetchWithPersistentCache(`${buildOpenF1Url("/sessions")}?session_key=${sessionKey}`);
        if (sessionInfo && sessionInfo.length > 0) {
          const circuitKey = sessionInfo[0].circuit_key;
          const pastSessions = await fetchWithPersistentCache(`${buildOpenF1Url("/sessions")}?circuit_key=${circuitKey}&year=2024`);
          const pastRace = pastSessions.find(s => s.session_name === 'Race');
          if (pastRace && pastRace.session_key !== sessionKey) {
            console.log(`[API] Found 2024 fallback session ${pastRace.session_key} for circuit ${circuitKey}`);
            return await fetchTrackReferenceData(pastRace.session_key);
          }
        }
      } catch (e) {
        console.warn("[API] Fallback failed:", e);
      }
      return [];
    }

    // Filter out pit laps and find a fast clean lap
    const validLaps = lapsData.filter(l => 
        l.lap_duration > 50 && 
        l.is_pit_out_lap === false && 
        l.duration_sector_1 && l.duration_sector_2 && l.duration_sector_3
    );
    
    const bestLap = validLaps.length > 0 
      ? validLaps.sort((a, b) => a.lap_duration - b.lap_duration)[0] 
      : lapsData[0]; // fallback to any lap

    const { driver_number, date_start } = bestLap;
    
    // Ensure date_end exists by calculating it from date_start + lap_duration if missing
    let date_end = bestLap.date_end;
    if (!date_end && date_start && bestLap.lap_duration) {
      const startMs = new Date(date_start).getTime();
      date_end = new Date(startMs + bestLap.lap_duration * 1000).toISOString();
    }

    // 3. Fetch location data EXACTLY for this single lap
    // We paginate manually to ensure we get the full lap (since 1 page = ~100 points, 1 lap = ~300 points)
    // We avoid passing 3 date parameters to prevent OpenF1 API 500 errors.
    console.log(`[API] Fetching 1 precise lap for track ref: Driver ${driver_number} from ${date_start} to ${date_end}`);
    const endMs = new Date(date_end).getTime();
    
    let rawLocationData = [];
    let currentDate = date_start;
    let hasMore = true;
    let safetyCounter = 0;

    while (hasMore && safetyCounter < 10) {
      safetyCounter++;
      // Format: date>=[current] AND date<=[end] (Exactly 2 bounds, which OpenF1 handles perfectly)
      const locationUrl = `${buildOpenF1Url("/location")}?session_key=${sessionKey}&driver_number=${driver_number}&date>=${currentDate}&date<=${date_end}`;
      const batch = await fetchOpenF1Data(locationUrl);
      
      if (!batch || batch.length === 0) {
        break;
      }
      
      // Deduplicate the overlap (the first item might match the last item of previous batch due to >=)
      const newItems = rawLocationData.length > 0 && batch[0].date === rawLocationData[rawLocationData.length - 1].date 
        ? batch.slice(1) 
        : batch;
        
      rawLocationData = [...rawLocationData, ...newItems];

      const lastItemDate = batch[batch.length - 1].date;
      if (!lastItemDate || new Date(lastItemDate).getTime() >= endMs) {
        break; // Reached or passed the end of the lap
      }
      
      // To avoid infinite loops, if the API didn't advance time, we break
      if (currentDate === normalizeOpenF1Date(lastItemDate)) {
        break;
      }
      
      // Next batch should start slightly after this batch's last point
      // We add 1 millisecond so we don't fetch the exact same record again, 
      // but if we use date> instead of date>=, we might lose the 2nd bound if OpenF1 parses it wrong. 
      // So we stick to date>= and add 1ms.
      const nextDateMs = new Date(lastItemDate).getTime() + 1;
      currentDate = new Date(nextDateMs).toISOString();
      
      await new Promise(r => setTimeout(r, 200)); // Rate limit pause
    }

    if (!rawLocationData || rawLocationData.length === 0) return [];

    // Filter locally just in case to ensure we stop exactly at date_end
    const locationData = rawLocationData.filter(p => new Date(p.date).getTime() <= endMs);

    // Ensure strict chronological order so the track spline doesn't criss-cross
    locationData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Extract raw x,y points
    const trackPoints = locationData
      .filter(p => p.x != null && p.y != null && p.x !== 0 && p.y !== 0)
      .map(p => ({ x: p.x, y: p.y }));

    console.log(`[API] Track reference: ${trackPoints.length} points for exact lap`);

    // 5. Cache it
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: trackPoints,
        timestamp: Date.now(),
      }));
    } catch (e) {
      console.warn("[Cache] Failed to write track reference to localStorage:", e);
    }

    return trackPoints;
  } catch (error) {
    console.error("[API] Error fetching track reference data:", error);
    return [];
  }
}

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
  } catch (e) {
    console.warn("[Cache] Failed to read podium data from localStorage:", e);
  }

  try {
    const sessionUrl = `${buildOpenF1Url("/sessions")}?meeting_key=${meetingKey}&session_name=Race`;
    const sessionData = await fetchOpenF1Data(sessionUrl);
    
    if (!sessionData || !Array.isArray(sessionData) || sessionData.length === 0) {
        console.warn(`[OpenF1 Fallback] No session found for meeting ${meetingKey}`);
        return [];
    }
    
    const sk = sessionData[0].session_key;
    
    const posData = await fetchOpenF1FullSessionData("/position", sk);
    await delay(150);
    let driversData = await fetchWithPersistentCache(`${buildOpenF1Url("/drivers")}?session_key=${sk}`);
    // If cached driversData is empty, try fetching fresh data to avoid 6-hour empty cache
    if (!driversData || driversData.length === 0) {
      driversData = await fetchOpenF1Data(`${buildOpenF1Url("/drivers")}?session_key=${sk}`);
    }
    await delay(150);
    const intData = await fetchOpenF1Data(`${buildOpenF1Url("/intervals")}?session_key=${sk}`);
    await delay(150);
    const lapsData = await fetchOpenF1FullSessionData("/laps", sk);
    
    if (!posData || posData.length === 0) return [];

    const driverPositions = {};
    posData.sort((a, b) => new Date(a.date) - new Date(b.date));
    posData.forEach((p) => (driverPositions[p.driver_number] = parseInt(p.position, 10)));

    const driverLaps = {};
    lapsData.forEach(l => {
      if (!driverLaps[l.driver_number] || l.lap_number > driverLaps[l.driver_number]) {
        driverLaps[l.driver_number] = l.lap_number;
      }
    });

    const allDriversRanked = Object.entries(driverPositions)
      .map(([num, pos]) => {
        const driver_number = parseInt(num, 10);
        const laps = driverLaps[driver_number] || 0;
        return { driver_number, pos, laps };
      })
      .sort((a, b) => {
        if (b.laps !== a.laps) {
          return b.laps - a.laps; // Most laps first
        }
        return a.pos - b.pos; // Lowest position number first among same lap
      });

    const top3Drivers = allDriversRanked.slice(0, 3).map((d, index) => ({
      ...d,
      pos: index + 1
    }));

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

    const results = top3Drivers.map(td => {
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
        Driver: {
          code: drv.name_acronym || drv.last_name?.substring(0, 3).toUpperCase() || `NO${td.driver_number}`,
          familyName: drv.last_name,
          nationality: drv.country_code
        },
        Constructor: {
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
      if (results && results.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({ data: results, timestamp: Date.now() }));
      }
    } catch (e) {
      console.warn("[Cache] Failed to write podium data to localStorage:", e);
    }

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
  } catch (e) {
    console.warn("[Cache] Failed to read most recent race from localStorage:", e);
  }

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
    let raceResults = await fetchRaceResults(selectedYear, mostRecentRace.round, mostRecentRace.raceName);

    // OpenF1 Fallback for Podium (if Jolpica/GitHub is missing data)
    if ((!raceResults || raceResults.length === 0) && meetingKey !== 'unknown') {
      console.log(`[API] Results empty for ${mostRecentRace.raceName}, falling back to OpenF1...`);
      raceResults = await fetchOpenF1Podium(meetingKey);
    } else if (raceResults && raceResults.length > 0 && meetingKey !== 'unknown') {
      const hasFastestLap = raceResults.some(r => r.fastestLap?.rank === "1" || r.FastestLap?.rank === "1");
      if (!hasFastestLap) {
        try {
          console.log(`[API] FastestLap missing for ${mostRecentRace.raceName}, augmenting from OpenF1...`);
          const oF1Results = await fetchOpenF1Podium(meetingKey);
          if (oF1Results && oF1Results.length > 0) {
            raceResults = raceResults.map(r => {
              const of1Driver = oF1Results.find(o => parseInt(o.position, 10) === parseInt(r.position, 10));
              if (of1Driver && of1Driver.fastestLap) {
                return { ...r, fastestLap: of1Driver.fastestLap };
              }
              return r;
            });
          }
        } catch (e) {
          console.error("Error augmenting fastest lap:", e);
        }
      }
    }

    const raceWithDetails = {
      ...mostRecentRace,
      meetingKey,
      raceResults,
    };

    // 2. Cache successful results only if we actually got a podium (prevents caching empty results for 6 hours right after a race)
    try {
      if (raceResults && raceResults.length > 0) {
        localStorage.setItem(cacheKey, JSON.stringify({ data: raceWithDetails, timestamp: Date.now() }));
      }
    } catch (e) {
      console.warn("[Cache] Failed to write most recent race to localStorage:", e);
    }

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
