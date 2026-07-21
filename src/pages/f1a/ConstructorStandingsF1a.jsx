import React, { useEffect, useState } from "react";

import { fetchAllRaceResults } from "../../utils/apiF1a";
import { ConstructorCarF1a, Loading } from "../../components";
import { wildCardDrivers } from "../../utils/wildCards";
import { calculateSeriesPoints2025 } from "../../utils/calculateSeriesPoints2025";
import { PointsByRaceDropdown } from "../../components/PointsByRaceDropdown";
import { buildRacePointsMaps } from "../../utils/pointsByRace";

export function ConstructorStandingsF1a({ selectedYear, championshipLevel }) {
  const [standings, setStandings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [constructorRacePoints, setConstructorRacePoints] = useState(new Map());
  const [racesMeta, setRacesMeta] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const allRaceResults = await fetchAllRaceResults(
        selectedYear,
        championshipLevel,
      );
      const { racesMeta, constructorPointsByRace } =
        buildRacePointsMaps(allRaceResults);
      setConstructorRacePoints(constructorPointsByRace);
      setRacesMeta(racesMeta);

      let constructorStandings = [];

      if (Number(selectedYear) >= 2025) {
        const { formattedConstructors } = calculateSeriesPoints2025(
          allRaceResults,
          championshipLevel,
        );
        constructorStandings = formattedConstructors;
      } else {
        const constructorPoints = {};
        // Aggregate points for each constructor and store driver codes
        allRaceResults.forEach((race) => {
          ["race1", "race2", "race3"].forEach((raceKey) => {
            if (!race[raceKey]) return;
            race[raceKey].forEach((result) => {
              const constructorId = result.Constructor.constructorId;
              const points = parseInt(result.points, 10);
              const driverCode = result.Driver.code;

              if (!constructorPoints[constructorId]) {
                constructorPoints[constructorId] = {
                  ...result.Constructor,
                  points: 0,
                  driverCodes: new Set(), // Use a Set to avoid duplicate codes
                };
              }
              constructorPoints[constructorId].points += points;
              constructorPoints[constructorId].driverCodes.add(driverCode);
            });
          });
        });
        // Convert driver codes from Set to array
        Object.keys(constructorPoints).forEach((constructorId) => {
          constructorPoints[constructorId].driverCodes = Array.from(
            constructorPoints[constructorId].driverCodes,
          );
        });
        // Convert to array and sort by points in descending order
        constructorStandings = Object.values(constructorPoints).sort(
          (a, b) => b.points - a.points,
        );
      }

      try {
        const offRes = await fetch(`/api/proxy/${championshipLevel.toLowerCase()}/official_team_standings.json`);
        if (offRes.ok) {
          const officialStandings = await offRes.json();
          if (officialStandings && officialStandings.length > 0) {
            constructorStandings = constructorStandings.map(c => {
              const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
              const cn = norm(c.name || c.constructorId);
              const match = officialStandings.find(x => norm(x.name).includes(cn) || cn.includes(norm(x.name).substring(0, 5)));
              if (match) {
                return { ...c, points: match.points };
              }
              return c;
            });
            constructorStandings.sort((a, b) => b.points - a.points);
          }
        }
      } catch (e) {
        console.warn("Could not load official team standings", e);
      }

      setStandings(constructorStandings);
      setIsLoading(false);
    };

    fetchData();
  }, [selectedYear, championshipLevel]);

  return (
    <div className="standard-scroll-container">
      <div className="max-w-[45rem] m-auto mt-32  pb-64">
        {isLoading ? (
          <Loading
            className="mt-[20rem] mb-[20rem]"
            message={`Loading ${selectedYear} Constructor Standings`}
          />
        ) : (
          <ul>
            {standings.map((standing, index) => (
              <li key={index} className="-mb-32">
                <ConstructorCarF1a
                  image={standing.constructorId}
                  points={standing.points}
                  name={standing.name}
                  year={selectedYear}
                  drivers={standing.driverCodes}
                  index={index}
                  f1a
                />
                <PointsByRaceDropdown
                  title="Points by race"
                  racesMeta={racesMeta}
                  pointsByRace={
                    constructorRacePoints.get(standing.constructorId) || []
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
