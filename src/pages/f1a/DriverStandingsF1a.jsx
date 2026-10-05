import React, { useEffect, useState } from "react";
import { fetchAllRaceResults, getSeriesBaseUrl, fetchDriverInfo } from "../../utils/apiF1a";
import { calculateSeriesPoints2025 } from "../../utils/calculateSeriesPoints2025";
import { ConstructorDriver, Loading } from "../../components";
import { PointsByRaceDropdown } from "../../components/PointsByRaceDropdown";
import { buildRacePointsMaps } from "../../utils/pointsByRace";

export function DriverStandingsF1a({ selectedYear, championshipLevel }) {
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [driverRacePoints, setDriverRacePoints] = useState(new Map());
  const [racesMeta, setRacesMeta] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const allRaceResults = await fetchAllRaceResults(
        selectedYear.toString(),
        championshipLevel,
      );
      const { racesMeta, driverPointsByRace } =
        buildRacePointsMaps(allRaceResults);
      setDriverRacePoints(driverPointsByRace);
      setRacesMeta(racesMeta);

      let driverStandings = [];

      const { formattedDrivers } = calculateSeriesPoints2025(
        allRaceResults,
        championshipLevel,
      );
      driverStandings = formattedDrivers;

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
              const driverInfoMap = await fetchDriverInfo(selectedYear, championshipLevel);
              const officialDrivers = [];
              const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(' jr.', '').replace('ue', 'u');
              
              officialStandings.forEach(match => {
                const lnMatch = norm(match.name).split('. ').pop();
                
                let existing = driverStandings.find(d => {
                  const ln = norm(d.familyName || d.driverId);
                  const fiMatch = norm(match.name).charAt(0);
                  const dFi = norm(d.givenName || d.driverId).charAt(0);
                  return (norm(match.name).includes(ln) || ln.includes(lnMatch)) && fiMatch === dFi;
                });
                
                if (existing) {
                  officialDrivers.push({ ...existing, points: match.points });
                } else {
                  const driverEntry = Object.values(driverInfoMap).find(entry => {
                    const ln = norm(entry.Driver?.familyName || entry.Driver?.driverId || "");
                    const fiMatch = norm(match.name).charAt(0);
                    const dFi = norm(entry.Driver?.givenName || entry.Driver?.driverId || "").charAt(0);
                    return (norm(match.name).includes(ln) || ln.includes(lnMatch)) && fiMatch === dFi;
                  });
                  if (driverEntry) {
                    officialDrivers.push({
                      ...driverEntry.Driver,
                      constructorId: driverEntry.Constructor?.constructorId,
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
      setIsLoading(false);
    };

    fetchData();
  }, [selectedYear, championshipLevel]);

  // console.log('DriverStandingsF1a', standings);

  return (
    <div className="standard-scroll-container">
      <div className="max-w-[45rem] m-auto mt-32  pb-64">
        {isLoading ? (
          <Loading
            className="mt-[20rem] mb-[20rem]"
            message={`Loading ${selectedYear} Driver Standings`}
          />
        ) : (
          <ul>
            {standings.map((standing, index) => (
              <li key={index} className="w-full">
                <ConstructorDriver
                  className="mt-32"
                  image={standing.code}
                  car={standing.constructorId}
                  points={standing.points}
                  firstName={standing.givenName}
                  lastName={standing.familyName}
                  year={selectedYear}
                  nationality={standing.nationality}
                  showDivider
                  index={index}
                  showStanding
                  championshipLevel={championshipLevel}
                />
                <PointsByRaceDropdown
                  title="Points by race"
                  racesMeta={racesMeta}
                  pointsByRace={driverRacePoints.get(standing.driverId) || []}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
