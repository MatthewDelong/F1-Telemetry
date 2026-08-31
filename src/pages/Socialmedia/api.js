import { buildOpenF1Url } from "../../config/openf1";
import { getCurrentYear } from "../../utils/currentYear";
import qualifyingData from "../../config/f1/2026/qualifying.json";
import resultsData from "../../config/f1/2026/results.json";
import teamColors from "../../utils/teamColors.json";

const OPENF1_DIRECT_API_BASE_URL = "https://api.openf1.org/v1";
const OPENF1_MIN_REQUEST_GAP_MS = 450;
const OPENF1_MAX_RETRIES = 2;
const OPENF1_RETRY_BASE_DELAY_MS = 900;
let lastOpenF1RequestAt = 0;

// Utility function to map team names to constructor IDs
export const mapTeamNameToConstructorId = (teamName) => {
    const teamMapping = {
        'Alpine F1 Team': 'alpine',
        'Aston Martin Aramco F1 Team': 'aston_martin',
        'Ferrari': 'ferrari',
        'Haas F1 Team': 'haas',
        'McLaren': 'mclaren',
        'Mercedes': 'mercedes',
        'RB': 'rb',
        'Red Bull Racing': 'red_bull',
        'Stake F1 Team Kick Sauber': 'sauber',
        'Williams': 'williams',
        // Add more mappings as needed
    };
    return teamMapping[teamName] || teamName?.toLowerCase().replace(/\s+/g, '_');
};

const buildDirectOpenF1Url = (path = "") => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${OPENF1_DIRECT_API_BASE_URL}${normalizedPath}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const throttleOpenF1Requests = async () => {
    const now = Date.now();
    const elapsed = now - lastOpenF1RequestAt;
    const waitMs = Math.max(0, OPENF1_MIN_REQUEST_GAP_MS - elapsed);
    if (waitMs > 0) {
        await sleep(waitMs);
    }
    lastOpenF1RequestAt = Date.now();
};

const fetchOpenF1JsonWithFallback = async (
    path,
    queryParams = {},
    options = {}
) => {
    const { allow404 = false } = options;
    const searchParams = new URLSearchParams(queryParams);
    const queryString = searchParams.toString();
    const proxyUrl = `${buildOpenF1Url(path)}${queryString ? `?${queryString}` : ""}`;
    const directUrl = `${buildDirectOpenF1Url(path)}${queryString ? `?${queryString}` : ""}`;

    let retryAttempt = 0;
    while (retryAttempt <= OPENF1_MAX_RETRIES) {
        await throttleOpenF1Requests();

        try {
            // Prefer the proxy because it attaches the sponsor authentication token!
            const proxyResponse = await fetch(proxyUrl);
            if (proxyResponse.ok) {
                return await proxyResponse.json();
            }

            if (allow404 && proxyResponse.status === 404) {
                return [];
            }

            if (proxyResponse.status === 429 && retryAttempt < OPENF1_MAX_RETRIES) {
                await sleep(
                    OPENF1_RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt)
                );
                retryAttempt += 1;
                continue;
            }

            // Fallback to direct URL if the proxy is completely down
            if (proxyResponse.status !== 429) {
                const directResponse = await fetch(directUrl);
                if (directResponse.ok) {
                    return await directResponse.json();
                }
                if (allow404 && directResponse.status === 404) {
                    return [];
                }
                throw new Error(`OpenF1 direct request failed: ${directResponse.status}`);
            }

            throw new Error(`OpenF1 proxy request failed: ${proxyResponse.status}`);
        } catch (directError) {
            // Retry network failures as well.
            if (retryAttempt < OPENF1_MAX_RETRIES) {
                await sleep(
                    OPENF1_RETRY_BASE_DELAY_MS * Math.pow(2, retryAttempt)
                );
                retryAttempt += 1;
                continue;
            }
            throw directError;
        }
    }

    return [];
};

export async function getDriverStandings(year = getCurrentYear()) {
    try {
        const url = `https://api.jolpi.ca/ergast/f1/${year}/driverstandings/`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch driver standings');
        }
        const data = await response.json();
        
        const driverStandings = data.MRData.StandingsTable.StandingsLists[0].DriverStandings;
        
        // Sort by position (already sorted by API, but ensuring order)
        const sortedStandings = driverStandings.sort((a, b) => 
            parseInt(a.position) - parseInt(b.position)
        );
        
        return sortedStandings.map(standing => ({
            position: standing.position,
            positionText: standing.positionText,
            points: standing.points,
            wins: standing.wins,
            driver: {
                driverId: standing.Driver.driverId,
                permanentNumber: standing.Driver.permanentNumber,
                code: standing.Driver.code,
                givenName: standing.Driver.givenName,
                familyName: standing.Driver.familyName,
                dateOfBirth: standing.Driver.dateOfBirth,
                nationality: standing.Driver.nationality
            },
            constructor: {
                constructorId: standing.Constructors[0].constructorId,
                name: standing.Constructors[0].name,
                nationality: standing.Constructors[0].nationality
            }
        }));
    } catch (error) {
        console.error('Error fetching driver standings:', error);
        return [];
    }
}

export async function getConstructorStandings(year = getCurrentYear()) {
    try {
        const url = `https://api.jolpi.ca/ergast/f1/${year}/constructorstandings/`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch constructor standings');
        }
        const data = await response.json();

        console.log('data', data);
        
        const constructorStandings = data.MRData.StandingsTable.StandingsLists[0].ConstructorStandings;
        
        // Sort by position (already sorted by API, but ensuring order)
        const sortedStandings = constructorStandings.sort((a, b) => 
            parseInt(a.position) - parseInt(b.position)
        );
        
        return sortedStandings.map(standing => ({
            position: standing.position,
            positionText: standing.positionText,
            points: standing.points,
            wins: standing.wins,
            constructor: {
                constructorId: standing.Constructor.constructorId,
                name: standing.Constructor.name.replace(/\s*F1 Team$/, ""),
                nationality: standing.Constructor.nationality
            }
        }));
    } catch (error) {
        console.error('Error fetching constructor standings:', error);
        return [];
    }
}

export async function getRaceWeekendResults(meeting_key, raceNameFallback = null) {
    console.log('meeting_key', meeting_key);
    const data = await fetchOpenF1JsonWithFallback("/sessions", { meeting_key });
    // Include both Sprint and Race sessions when available.
    const raceSessions = data
        .filter((session) => session.session_type === "Race")
        .sort(
            (a, b) =>
                new Date(a.date_start || 0).getTime() -
                new Date(b.date_start || 0).getTime()
        );
    const qualifyingSessions = data.filter((session) => {
        const sessionName = session.session_name || "";
        return (
            sessionName === "Qualifying" ||
            sessionName === "Sprint Qualifying" ||
            sessionName === "Sprint Shootout"
        );
    });

    const getGridFallbackSessionKey = (raceSession) => {
        const raceStart = new Date(raceSession?.date_start || 0).getTime();
        const sortedCandidates = [...qualifyingSessions].sort((a, b) => {
            const aStart = new Date(a?.date_start || 0).getTime();
            const bStart = new Date(b?.date_start || 0).getTime();
            return bStart - aStart;
        });

        const beforeRace = sortedCandidates.find((candidate) => {
            const candidateStart = new Date(candidate?.date_start || 0).getTime();
            return Number.isFinite(raceStart) && candidateStart <= raceStart;
        });

        return beforeRace?.session_key || sortedCandidates[0]?.session_key || null;
    };
    // console.log('raceSessions', raceSessions);
    // For each session, fetch the starting grid and enrich with driver/team data
    const grids = [];
    for (const session of raceSessions) {
            let grid = await fetchOpenF1JsonWithFallback("/starting_grid", {
                session_key: session.session_key,
            }, { allow404: true });
            const fallbackGridSessionKey = getGridFallbackSessionKey(session);
            if (
                (!Array.isArray(grid) || grid.length === 0) &&
                fallbackGridSessionKey &&
                fallbackGridSessionKey !== session.session_key
            ) {
                grid = await fetchOpenF1JsonWithFallback("/starting_grid", {
                    session_key: fallbackGridSessionKey,
                }, { allow404: true });
            }

            const result = await fetchOpenF1JsonWithFallback("/session_result", {
                session_key: session.session_key,
            }, { allow404: true });
            const drivers = await fetchOpenF1JsonWithFallback("/drivers", {
                session_key: session.session_key,
            }, { allow404: true });
            const safeGrid = Array.isArray(grid) ? grid : [];
            const safeResult = Array.isArray(result) ? result : [];
            const safeDrivers = Array.isArray(drivers) ? drivers : [];
            
            // Attempt to find local override data for 2026 season
            const yearNum = session.year || getCurrentYear();
            const yearStr = String(yearNum);
            let localQualifying = null;
            let localResult = null;

            if (yearNum === 2026 || yearStr === "2026") {
                // Try to match by race name
                const searchName = raceNameFallback || session.meeting_name || "";
                console.log(`[SocialMedia API] Searching local data for: "${searchName}" (Session: ${session.session_name})`);
                
                localQualifying = qualifyingData.find(q => 
                    q.season === "2026" && 
                    (q.raceName === searchName || searchName.includes(q.raceName) || q.raceName.includes(searchName))
                );
                
                localResult = resultsData.find(r => 
                    r.season === "2026" && 
                    (r.raceName === searchName || searchName.includes(r.raceName) || r.raceName.includes(searchName))
                );

                if (localQualifying) console.log(`[SocialMedia API] Found local qualifying for ${localQualifying.raceName}`);
                if (localResult) console.log(`[SocialMedia API] Found local results for ${localResult.raceName}`);
            }

            const colorsForYear = teamColors[yearStr];

            // Enrich grid data with driver information
            let enrichedGrid = safeGrid.map(gridEntry => {
                const driver = safeDrivers.find(d => d.driver_number === gridEntry.driver_number);
                const constructorId = driver ? mapTeamNameToConstructorId(driver.team_name) : null;
                const teamColour = driver?.team_colour || (colorsForYear && constructorId ? colorsForYear[constructorId] : "FFFFFF");

                return {
                    ...gridEntry,
                    driver: driver ? {
                        ...driver,
                        team_colour: teamColour,
                        constructorId
                    } : null
                };
            });
            
            // Determine session types for overrides
            const isQualifyingType = session.session_type === "Qualifying" || session.session_name?.toLowerCase().includes("qualifying");
            const isRaceType = session.session_type === "Race";

            // Apply local qualifying override for grid if available and appropriate
            if (localQualifying && localQualifying.QualifyingResults && isQualifyingType) {
                console.log(`[SocialMedia API] Applying local qualifying override for grid`);
                enrichedGrid = localQualifying.QualifyingResults.map(lq => {
                    const constructorId = lq.Constructor.constructorId;
                    const teamColour = (colorsForYear && colorsForYear[constructorId]) || "FFFFFF";
                    
                    return {
                        driver_number: parseInt(lq.number, 10),
                        position: parseInt(lq.position, 10),
                        driver: {
                            driver_number: parseInt(lq.number, 10),
                            name_acronym: lq.Driver.code,
                            first_name: lq.Driver.givenName,
                            last_name: lq.Driver.familyName,
                            team_name: lq.Constructor.name,
                            team_colour: teamColour,
                            constructorId: constructorId
                        }
                    };
                });
            } else if (isRaceType) {
                 // For Race sessions, we want the STARTING GRID. 
                 // Prefer the 'grid' field from results.json if it exists, otherwise fallback to qualifying.json results.
                 if (localResult && localResult.Results && localResult.Results.some(r => r.grid && parseInt(r.grid, 10) > 0)) {
                    console.log(`[SocialMedia API] Applying local grid override from results.json`);
                    enrichedGrid = localResult.Results.map(lr => {
                        const constructorId = lr.Constructor.constructorId;
                        const teamColour = (colorsForYear && colorsForYear[constructorId]) || "FFFFFF";
                        
                        return {
                            driver_number: parseInt(lr.number, 10),
                            position: parseInt(lr.grid, 10),
                            driver: {
                                driver_number: parseInt(lr.number, 10),
                                name_acronym: lr.Driver.code,
                                first_name: lr.Driver.givenName,
                                last_name: lr.Driver.familyName,
                                team_name: lr.Constructor.name,
                                team_colour: teamColour,
                                constructorId: constructorId
                            }
                        };
                    }).filter(g => g.position > 0);
                 } else if (localQualifying && localQualifying.QualifyingResults) {
                    console.log(`[SocialMedia API] Applying local grid fallback from qualifying.json`);
                    enrichedGrid = localQualifying.QualifyingResults.map(lq => {
                        const constructorId = lq.Constructor.constructorId;
                        const teamColour = (colorsForYear && colorsForYear[constructorId]) || "FFFFFF";
                        
                        return {
                            driver_number: parseInt(lq.number, 10),
                            position: parseInt(lq.position, 10),
                            driver: {
                                driver_number: parseInt(lq.number, 10),
                                name_acronym: lq.Driver.code,
                                first_name: lq.Driver.givenName,
                                last_name: lq.Driver.familyName,
                                team_name: lq.Constructor.name,
                                team_colour: teamColour,
                                constructorId: constructorId
                            }
                        };
                    });
                 }
            }
            
            // Enrich result data with driver information
            let enrichedResult = safeResult.map(resultEntry => {
                const driver = safeDrivers.find(d => d.driver_number === resultEntry.driver_number);
                const constructorId = driver ? mapTeamNameToConstructorId(driver.team_name) : null;
                const teamColour = driver?.team_colour || (colorsForYear && constructorId ? colorsForYear[constructorId] : "FFFFFF");

                return {
                    ...resultEntry,
                    driver: driver ? {
                        ...driver,
                        team_colour: teamColour,
                        constructorId
                    } : null
                };
            });

            // Apply local results override if available
            if (localResult && localResult.Results && isRaceType) {
                console.log(`[SocialMedia API] Applying local results override`);
                enrichedResult = localResult.Results.map(lr => {
                    const constructorId = lr.Constructor.constructorId;
                    const teamColour = (colorsForYear && colorsForYear[constructorId]) || "FFFFFF";
                    
                    return {
                        driver_number: parseInt(lr.number, 10),
                        position: parseInt(lr.position, 10),
                        points: parseFloat(lr.points),
                        time: lr.Time?.time || "",
                        status: lr.status || "",
                        driver: {
                            driver_number: parseInt(lr.number, 10),
                            name_acronym: lr.Driver.code,
                            first_name: lr.Driver.givenName,
                            last_name: lr.Driver.familyName,
                            team_name: lr.Constructor.name,
                            team_colour: teamColour,
                            constructorId: constructorId
                        }
                    };
                });
            }
            
            // Sort grid by position (ascending)
            enrichedGrid.sort((a, b) => Number(a.position) - Number(b.position));
            
            // Sort result by position (ascending), handling null positions (DNF) at the end
            enrichedResult.sort((a, b) => {
                const posA = a.position ? Number(a.position) : 999;
                const posB = b.position ? Number(b.position) : 999;
                return posA - posB;
            });
            
            grids.push({
                session_key: session.session_key,
                session_name: session.session_name,
                grid: enrichedGrid,
                result: enrichedResult,
                isLocalOverride: !!(localQualifying || localResult),
                matchInfo: {
                    raceName: localQualifying?.raceName || localResult?.raceName,
                    round: localQualifying?.round || localResult?.round
                }
            });
    }
    return grids;
}

