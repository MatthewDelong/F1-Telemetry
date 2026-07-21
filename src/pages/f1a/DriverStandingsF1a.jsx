import React, { useEffect, useState } from "react";
import { fetchAllRaceResults } from "../../utils/apiF1a";
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

      if (Number(selectedYear) >= 2025) {
        const { formattedDrivers } = calculateSeriesPoints2025(
          allRaceResults,
          championshipLevel,
        );
        driverStandings = formattedDrivers;
      } else {
        const driverPoints = {};
        allRaceResults.forEach((race) => {
          ["race1", "race2", "race3"].forEach((raceKey) => {
            if (!race[raceKey]) return;
            race[raceKey].forEach((result) => {
              const driverId = result.Driver.driverId;
              const points = parseInt(result.points, 10);
              if (!driverPoints[driverId]) {
                driverPoints[driverId] = {
                  ...result.Driver,
                  points: 0,
                };
              }
              driverPoints[driverId].points += points;
            });
          });
        });
        driverStandings = Object.values(driverPoints).sort(
          (a, b) => b.points - a.points,
        );
      }

      try {
        const offRes = await fetch(`/api/proxy/${championshipLevel.toLowerCase()}/official_driver_standings.json`);
        if (offRes.ok) {
          const officialStandings = await offRes.json();
          if (officialStandings && officialStandings.length > 0) {
            driverStandings = driverStandings.map(d => {
              const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(' jr.', '').replace('ue', 'u');
              const ln = norm(d.familyName || d.driverId);
              const match = officialStandings.find(x => norm(x.name).includes(ln));
              if (match) {
                return { ...d, points: match.points };
              }
              return d;
            });
            driverStandings.sort((a, b) => b.points - a.points);
          }
        }
      } catch (e) {
        console.warn("Could not load official driver standings", e);
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
