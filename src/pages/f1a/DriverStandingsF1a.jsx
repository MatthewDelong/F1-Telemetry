import React, { useEffect, useState } from "react";
import { fetchAllRaceResults, getSeriesBaseUrl, fetchDriverInfo } from "../../utils/apiF1a";
import { calculateSeriesPoints2025 } from "../../utils/calculateSeriesPoints2025";
import { ConstructorDriver, Loading, TeamLegendFilter } from "../../components";
import { PointsByRaceDropdown } from "../../components/PointsByRaceDropdown";
import { buildRacePointsMaps } from "../../utils/pointsByRace";
import teamColors from "../../utils/teamColors.json";

export function DriverStandingsF1a({ selectedYear, championshipLevel }) {
  const [standings, setStandings] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [driverRacePoints, setDriverRacePoints] = useState(new Map());
  const [racesMeta, setRacesMeta] = useState([]);

  useEffect(() => {
    setSelectedTeam(null);
    setIsLoading(true);
  }, [selectedYear]);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      const allRaceResults = await fetchAllRaceResults(
        selectedYear.toString(),
        championshipLevel,
      );
      const driverInfoMap = await fetchDriverInfo(selectedYear, championshipLevel);
      const { racesMeta, driverPointsByRace } =
        buildRacePointsMaps(allRaceResults, championshipLevel, selectedYear);

      // Convert driverInfo to map by driverId, code, or familyName
      const driverIdToConstructor = {};
      if (driverInfoMap) {
        Object.values(driverInfoMap).forEach((entry) => {
          const constructorId = entry.Constructor?.constructorId;
          if (constructorId) {
            ["Driver", "Driver2"].forEach((dKey) => {
              const d = entry[dKey];
              if (d) {
                if (d.driverId) driverIdToConstructor[d.driverId.toLowerCase()] = constructorId;
                if (d.code) driverIdToConstructor[d.code.toUpperCase()] = constructorId;
                if (d.familyName) driverIdToConstructor[d.familyName.toLowerCase()] = constructorId;
              }
            });
          }
        });
      }

      const getConstructorForDriver = (driver) => {
        if (!driver) return null;
        const did = driver.driverId?.toLowerCase();
        const code = driver.code?.toUpperCase();
        const ln = (driver.familyName || driver.lastName)?.toLowerCase();
        return (
          driver.constructorId ||
          (did && driverIdToConstructor[did]) ||
          (code && driverIdToConstructor[code]) ||
          (ln && driverIdToConstructor[ln]) ||
          null
        );
      };

      const getTeamColor = (constructorId, year) => {
        if (!constructorId) return undefined;
        const cid = constructorId.toLowerCase();
        const yStr = String(year);
        const hex =
          teamColors[yStr]?.[cid] ||
          (cid === "var" ? teamColors[yStr]?.["van_amersfoort"] : undefined) ||
          (cid === "van_amersfoort" ? teamColors[yStr]?.["var"] : undefined) ||
          teamColors["2025"]?.[cid] ||
          teamColors["2026"]?.[cid] ||
          teamColors["2024"]?.[cid];
        return hex ? (hex.startsWith("#") ? hex : `#${hex}`) : undefined;
      };

      let driverStandings = [];

      const { formattedDrivers } = calculateSeriesPoints2025(
        allRaceResults,
        championshipLevel,
      );
      driverStandings = formattedDrivers.map((driver) => {
        const constructorId = getConstructorForDriver(driver);
        return {
          ...driver,
          constructorId,
          constructorColor: getTeamColor(constructorId, selectedYear),
        };
      });

      if (["2024", "2025", "2026"].includes(selectedYear.toString())) {
        try {
          const suffix = selectedYear.toString() === "2026" ? "" : `_${selectedYear}`;
          let offRes = await fetch(`${getSeriesBaseUrl(championshipLevel)}official_driver_standings${suffix}.json`);
          if (!offRes.ok) {
            offRes = await fetch(`https://raw.githubusercontent.com/MatthewDelong/F1-Telemetry/main/src/config/${championshipLevel.toLowerCase()}/official_driver_standings${suffix}.json`);
          }
          if (offRes.ok) {
            const officialStandings = await offRes.json();
            if (officialStandings && officialStandings.length > 0) {
              const officialDrivers = [];
              const norm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(" jr.", "").replace("ue", "u");
              
              officialStandings.forEach(match => {
                const lnMatch = norm(match.name).split(". ").pop();
                
                let existing = driverStandings.find(d => {
                  const ln = norm(d.familyName || d.driverId);
                  const fiMatch = norm(match.name).charAt(0);
                  const dFi = norm(d.givenName || d.driverId).charAt(0);
                  return (norm(match.name).includes(ln) || ln.includes(lnMatch)) && (!dFi || fiMatch === dFi);
                });
                
                if (existing) {
                  const racePoints = driverPointsByRace.get(existing.driverId);
                  if (racePoints) {
                    const currentSum = racePoints.reduce((acc, curr) => acc + curr.total, 0);
                    if (currentSum !== match.points) {
                      racePoints.push({
                        raceName: "Points Adjustment",
                        pointsByKey: { adjustment: match.points - currentSum },
                        total: match.points - currentSum
                      });
                    }
                  }
                  const constructorId = existing.constructorId || getConstructorForDriver(existing);
                  officialDrivers.push({
                    ...existing,
                    constructorId,
                    constructorColor: getTeamColor(constructorId, selectedYear),
                    points: match.points
                  });
                } else {
                  const driverEntry = Object.values(driverInfoMap).find(entry => {
                    const d1 = entry.Driver;
                    const d2 = entry.Driver2;
                    return [d1, d2].some(d => {
                      if (!d) return false;
                      const ln = norm(d.familyName || d.driverId || "");
                      const fiMatch = norm(match.name).charAt(0);
                      const dFi = norm(d.givenName || d.driverId || "").charAt(0);
                      return (norm(match.name).includes(ln) || ln.includes(lnMatch)) && (!dFi || fiMatch === dFi);
                    });
                  });
                  if (driverEntry) {
                    const matchedDriver = [driverEntry.Driver, driverEntry.Driver2].find(d => {
                      if (!d) return false;
                      const ln = norm(d.familyName || d.driverId || "");
                      return norm(match.name).includes(ln) || ln.includes(lnMatch);
                    }) || driverEntry.Driver;
                    const constructorId = driverEntry.Constructor?.constructorId;
                    officialDrivers.push({
                      ...matchedDriver,
                      constructorId,
                      constructorColor: getTeamColor(constructorId, selectedYear),
                      points: match.points
                    });
                  } else {
                    officialDrivers.push({
                      driverId: match.name,
                      familyName: match.name,
                      code: "UNK",
                      points: match.points
                    });
                  }
                }
              });
              
              officialDrivers.sort((a, b) => b.points - a.points);
              driverStandings = officialDrivers;
            }
          }
        } catch (e) {
          console.warn("Could not load official driver standings", e);
        }
      }

      setStandings(driverStandings);
      if (!isCancelled) {
        setDriverRacePoints(new Map(driverPointsByRace));
        setRacesMeta(racesMeta);
        setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [selectedYear, championshipLevel]);

  // console.log('DriverStandingsF1a', standings);

  const standingsWithPosition = standings.map((item, idx) => ({
    ...item,
    position: idx + 1,
  }));

  const filteredStandings = selectedTeam
    ? standingsWithPosition.filter(
        (s) => s.constructorId?.toLowerCase() === selectedTeam.toLowerCase(),
      )
    : standingsWithPosition;

  return (
    <div className="standard-scroll-container">
      <div className="max-w-[45rem] m-auto mt-32  pb-64">
        {isLoading ? (
          <Loading
            className="mt-[20rem] mb-[20rem]"
            message={`Loading ${selectedYear} Driver Standings`}
          />
        ) : (
          <>
            <TeamLegendFilter
              standings={standingsWithPosition}
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              year={selectedYear}
            />
            {selectedTeam && filteredStandings.length === 0 ? (
              <div className="text-center py-32 text-neutral-400">
                No drivers found for this team.
              </div>
            ) : standings.length === 0 ? (
              <div className="text-center py-32 text-neutral-400">
                No standings available for {selectedYear}.
              </div>
            ) : (
              <ul>
                {filteredStandings.map((standing, index) => (
                  <li key={`${standing.code || standing.driverId}-${standing.position || index}`} className="w-full">
                    <ConstructorDriver
                      className="mt-32"
                      image={standing.code}
                      car={standing.constructorId}
                      color={standing.constructorColor}
                      points={standing.points}
                      firstName={standing.givenName}
                      lastName={standing.familyName}
                      year={selectedYear}
                      nationality={standing.nationality}
                      showDivider
                      index={index}
                      position={standing.position}
                      showStanding
                      championshipLevel={championshipLevel}
                    />
                    {/* <PointsByRaceDropdown ... /> */}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
