import React, { useState, useEffect } from "react";
import {
  fetchRaceResultsByCircuit,
  fetchCircuitData,
} from "../../utils/apiF1a";
import { fetchRaceDetails } from "../../utils/api";
import teamColors from "../../utils/teamColors.json";

import { RaceResultItem, Loading, Button } from "../../components";
import { NavLink } from "react-router-dom";
import classNames from "classnames";
import { formatDate } from "../../utils/formatDate";

const Top3Drivers = ({ year, circuitId, meetingKey, championshipLevel, circuitRaceName, f1Date, f1Time }) => {
  const [raceName, setRaceName] = useState("");
  const [top3RaceResults, setTop3RaceResults] = useState([]);
  const [top3RaceResults2, setTop3RaceResults2] = useState([]);
  const [top3RaceResults3, setTop3RaceResults3] = useState([]);
  // console.log(year, circuitId);

  useEffect(() => {
    const fetchData = async () => {
      const results = await fetchRaceResultsByCircuit(
        year,
        circuitId,
        true,
        championshipLevel,
      );
      // console.log('results', results);
      setRaceName(results.raceName || circuitRaceName || "");
      setTop3RaceResults(results.race1);
      results.race2 && setTop3RaceResults2(results.race2);
      results.race3 && setTop3RaceResults3(results.race3);
    };

    fetchData();
  }, [year, circuitId, championshipLevel, circuitRaceName]);

  const hasResults = top3RaceResults && top3RaceResults.length > 0;

  return (
    <div className="relative group w-fit m-auto">
      <NavLink
        to={`/race-f1a/${meetingKey}`}
        className={classNames(
          "bg-glow-dark rounded-[2.4rem] p-32 block mt-32 w-fit m-auto",
          "bg-gradient-to-br from-neutral-950/50 via-neutral-800/50 to-neutral-900/50",
          "clickable-hover",
        )}
      >
        <div className="text-center mb-32">
          <h3 className="font-display tracking-xs leading-none font-bold mb-4">
            {raceName}
          </h3>
          <div className="text-xs text-neutral-400 tracking-sm leading-none">
            {formatDate(f1Date)}
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center md:justify-center gap-16">
          <div>
            <p className="uppercase text-sm text-center text-neutral-400 tracking-sm leading-none mb-24">
              {hasResults && top3RaceResults3.length > 0 ? "Opening Race" : "Reverse Grid Race"}
            </p>
            {hasResults ? (
              <ul className="bg-glow-dark rounded-[2.4rem] race-results__list">
                {top3RaceResults.map((result, index) => (
                  <RaceResultItem
                    className={`race-results__list__item-${index + 1}`}
                    carNumber={result.number}
                    driver={result.Driver}
                    driverColor={result.Constructor ? teamColors[year]?.[result.Constructor.constructorId] : undefined}
                    fastestLap={result.FastestLap || result.fastestLap}
                    startPosition={parseInt(result.grid, 10)}
                    key={index}
                    index={index}
                    endPosition={parseInt(result.position, 10)}
                    status={result.status}
                    time={result.Time?.time || result.status}
                    year={year}
                    wireframe={result.length === 0}
                    championshipLevel={championshipLevel}
                    // hasHover={false}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex justify-center">
                <img alt="" src={`${"/images/f1a-podium.png"}`} width={324} />
              </div>
            )}
          </div>
          {hasResults && top3RaceResults2.length > 1 && (
            <div>
              <p className="uppercase text-sm text-center text-neutral-400 tracking-sm leading-none mb-24">
                {hasResults && top3RaceResults3.length > 0 ? "Reverse Grid Race" : "Feature Race"}
              </p>
              <ul className="bg-glow-dark rounded-[2.4rem] race-results__list">
                {top3RaceResults2.map((result, index) => (
                  <RaceResultItem
                    className={`race-results__list__item-${index + 1}`}
                    carNumber={result.number}
                    driver={result.Driver}
                    driverColor={result.Constructor ? teamColors[year]?.[result.Constructor.constructorId] : undefined}
                    fastestLap={result.FastestLap || result.fastestLap}
                    startPosition={parseInt(result.grid, 10)}
                    key={index}
                    index={index}
                    endPosition={parseInt(result.position, 10)}
                    status={result.status}
                    time={result.Time?.time || result.status}
                    year={year}
                    wireframe={result.length === 0}
                    championshipLevel={championshipLevel}
                  />
                ))}
              </ul>
            </div>
          )}
          {hasResults && top3RaceResults3.length > 0 && (
            <div>
              <p className="uppercase text-sm text-center text-neutral-400 tracking-sm leading-none mb-24">
                Feature Race
              </p>
              <ul className="bg-glow-dark rounded-[2.4rem] race-results__list">
                {top3RaceResults3.map((result, index) => (
                  <RaceResultItem
                    className={`race-results__list__item-${index + 1}`}
                    carNumber={result.number}
                    driver={result.Driver}
                    driverColor={result.Constructor ? teamColors[year]?.[result.Constructor.constructorId] : undefined}
                    fastestLap={result.FastestLap || result.fastestLap}
                    startPosition={parseInt(result.grid, 10)}
                    key={index}
                    index={index}
                    endPosition={parseInt(result.position, 10)}
                    status={result.status}
                    time={result.Time?.time || result.status}
                    year={year}
                    wireframe={result.length === 0}
                    championshipLevel={championshipLevel}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
        <Button
          buttonStyle="hollow"
          size="sm"
          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute bottom-[-1.2rem] left-1/2 -translate-x-1/2 pointer-events-none rounded-full px-16 py-8 tracking-widest uppercase !bg-black/60 !backdrop-blur-md !border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 font-display"
        >
          View Race Details
        </Button>
      </NavLink>
    </div>
  );
};

export function RaceResultsPageF1a({ selectedYear, championshipLevel }) {
  const [filteredCircuits, setFilteredCircuits] = useState([]);
  const [f1Races, setF1Races] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [data, f1Details] = await Promise.all([
        fetchCircuitData(championshipLevel),
        fetchRaceDetails(selectedYear)
      ]);
      setF1Races(f1Details);
      setFilteredCircuits(
        Object.entries(data)
          .filter(([key, circuit]) => circuit.year === selectedYear.toString())
          .map(([key, circuit]) => ({ ...circuit, meetingKey: key })),
      );
      setIsLoading(false);
    };

    fetchData();
  }, [selectedYear]);

  // console.log('filteredCircuits', filteredCircuits);

  return (
    <div className="standard-scroll-container">
      <div className="race-results max-w-[120rem] m-auto mt-32 mb-64 px-4 sm:px-8">
        {selectedYear.toString() === "2026" && (
          <div className="relative w-full max-w-[600px] mx-auto mb-32 drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500 cursor-pointer">
            <div className="rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(192,38,211,0.15)] bg-black/20 backdrop-blur-sm">
              <img src="/images/2026/F1A-Dates.png" alt="F1 Academy Dates" className="w-full h-auto object-cover" />
            </div>
          </div>
        )}
        {isLoading ? (
          <Loading
            className="mt-[20rem] mb-[20rem]"
            message={`Loading ${selectedYear} Race Results`}
          />
        ) : (
          filteredCircuits.map((circuit, index) => {
            const normalize = (name) => name ? name.toLowerCase().replace(/ \([^)]+\)/g, '').trim() : '';
            const f1Race = f1Races.find(r => 
              r.Circuit?.circuitId === circuit.circuitId || 
              r.circuitId === circuit.circuitId ||
              normalize(r.raceName) === normalize(circuit.raceName)
            );
            return (
              <Top3Drivers
                key={circuit.circuitId}
                year={selectedYear}
                meetingKey={circuit.meetingKey}
                circuitId={circuit.circuitId}
                circuitRaceName={circuit.raceName}
                championshipLevel={championshipLevel}
                f1Date={f1Race?.date}
                f1Time={f1Race?.time}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
