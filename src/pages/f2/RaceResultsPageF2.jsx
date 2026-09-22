import React, { useState, useEffect, useRef } from "react";
import {
  fetchCircuitData,
  fetchAllRaceResults
} from "../../utils/apiF1a";
import { fetchRaceDetails } from "../../utils/api";
import { getFastestDriverCode } from "../../utils/raceUtils";
import teamColors from "../../utils/teamColors.json";

import { RaceResultItem, Loading, Button } from "../../components";
import { NavLink } from "react-router-dom";
import classNames from "classnames";
import { formatDate } from "../../utils/formatDate";

const Top3Drivers = React.forwardRef(({ year, circuitId, meetingKey, championshipLevel, circuitRaceName, f1Date, f1Time, raceData }, ref) => {
  const [raceName, setRaceName] = useState("");
  const [top3RaceResults, setTop3RaceResults] = useState([]);
  const [top3RaceResults2, setTop3RaceResults2] = useState([]);
  const [top3RaceResults3, setTop3RaceResults3] = useState([]);

  useEffect(() => {
    if (raceData) {
      setRaceName(raceData.raceName || circuitRaceName || "");
      
      const filterTop3 = (results) => results ? [...results].sort((a,b) => parseInt(a.position,10) - parseInt(b.position,10)).slice(0,3) : [];
      
      setTop3RaceResults(filterTop3(raceData.race1));
      if (raceData.race2) setTop3RaceResults2(filterTop3(raceData.race2));
      if (raceData.race3) setTop3RaceResults3(filterTop3(raceData.race3));
    } else {
      setRaceName(circuitRaceName || "");
    }
  }, [raceData, circuitRaceName]);

  const hasResults = top3RaceResults && top3RaceResults.length > 0;

  return (
    <div className="relative group w-fit m-auto" ref={ref}>
      <NavLink
        to={`/race-${championshipLevel === "F1A" ? "f1a" : "f2"}/${meetingKey}`}
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
          {hasResults ? (
            <>
              <div>
                <p className="uppercase text-sm text-center text-neutral-400 tracking-sm leading-none mb-24">
                  {championshipLevel === "F2" ? "Sprint Race" : "Race 1"} Results
                </p>
                <ul className="bg-glow-dark rounded-[2.4rem] race-results__list">
                  {top3RaceResults.map((result, index) => (
                    <RaceResultItem
                      championshipLevel={championshipLevel}
                      className={`race-results__list__item-${index + 1}`}
                      carNumber={result.number}
                      driver={result.Driver}
                      driverColor={result.Constructor ? teamColors[year]?.[result.Constructor.constructorId] : undefined}
                      fastestLap={{
                        ...result.FastestLap,
                        rank:
                          result.FastestLap?.rank ||
                          (result.Driver?.code === getFastestDriverCode(raceData?.race1)
                            ? "1"
                            : undefined),
                      }}
                      startPosition={parseInt(result.grid, 10)}
                      key={index}
                      index={index}
                      endPosition={parseInt(result.position, 10)}
                      status={result.status}
                      time={result.Time?.time || result.status}
                      year={year}
                      wireframe={result.length === 0}
                    />
                  ))}
                </ul>
              </div>
              {top3RaceResults2.length > 1 && (
                <div>
                  <p className="uppercase text-sm text-center text-neutral-400 tracking-sm leading-none mb-24">
                    {championshipLevel === "F2" ? "Race" : "Race 2"} Results
                  </p>
                  <ul className="bg-glow-dark rounded-[2.4rem] race-results__list">
                    {top3RaceResults2.map((result, index) => (
                      <RaceResultItem
                        championshipLevel={championshipLevel}
                        className={`race-results__list__item-${index + 1}`}
                        carNumber={result.number}
                        driver={result.Driver}
                        driverColor={result.Constructor ? teamColors[year]?.[result.Constructor.constructorId] : undefined}
                        fastestLap={{
                          ...result.FastestLap,
                          rank:
                            result.FastestLap?.rank ||
                            (result.Driver?.code === getFastestDriverCode(raceData?.race2)
                              ? "1"
                              : undefined),
                        }}
                        startPosition={parseInt(result.grid, 10)}
                        key={index}
                        index={index}
                        endPosition={parseInt(result.position, 10)}
                        status={result.status}
                        time={result.Time?.time || result.status}
                        year={year}
                        wireframe={result.length === 0}
                      />
                    ))}
                  </ul>
                </div>
              )}
              {hasResults && top3RaceResults3.length > 0 && (
                <div>
                  <p className="uppercase text-sm text-center text-neutral-400 tracking-sm leading-none mb-24">
                    Race 3 Results
                  </p>
                  <ul className="bg-glow-dark rounded-[2.4rem] race-results__list">
                    {top3RaceResults3.map((result, index) => (
                      <RaceResultItem
                        championshipLevel={championshipLevel}
                        className={`race-results__list__item-${index + 1}`}
                        carNumber={result.number}
                        driver={result.Driver}
                        driverColor={result.Constructor ? teamColors[year]?.[result.Constructor.constructorId] : undefined}
                        fastestLap={{
                          ...result.FastestLap,
                          rank:
                            result.FastestLap?.rank ||
                            (result.Driver?.code === getFastestDriverCode(raceData?.race3)
                              ? "1"
                              : undefined),
                        }}
                        startPosition={parseInt(result.grid, 10)}
                        key={index}
                        index={index}
                        endPosition={parseInt(result.position, 10)}
                        status={result.status}
                        time={result.Time?.time || result.status}
                        year={year}
                        wireframe={result.length === 0}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center my-12 w-full min-h-[16rem] relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-30 rounded-[2rem] pointer-events-none"></div>
              <div className="flex flex-col items-center justify-center p-32 backdrop-blur-sm bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_20px_rgba(255,255,255,0.03)] w-[90%] max-w-[30rem] z-10 transition-transform duration-300 group-hover:scale-[1.02]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-[4.2rem] w-[4.2rem] text-brand-blue-400 mb-6 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="uppercase text-neutral-300 tracking-[0.3em] font-display text-xl mb-4 text-center gradient-text-light">Upcoming Race</span>
                <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent my-2 w-[80%]" />
                <span className="text-[1.3rem] text-neutral-400 text-center font-medium px-4 mt-2">Data will be available after the race completes.</span>
              </div>
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
});

export function RaceResultsPageF2({ selectedYear, championshipLevel }) {
  const [f1Races, setF1Races] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [filteredCircuits, setFilteredCircuits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const circuitRefs = useRef([]);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      hasScrolled.current = false;
      const [data, f1Details, allRaceRes] = await Promise.all([
        fetchCircuitData(championshipLevel),
        fetchRaceDetails(selectedYear),
        fetchAllRaceResults(selectedYear, championshipLevel)
      ]);
      setF1Races(f1Details);
      setAllResults(allRaceRes || []);
      setFilteredCircuits(
        Object.entries(data)
          .filter(([key, circuit]) => circuit.year === selectedYear.toString())
          .map(([key, circuit]) => ({ ...circuit, meetingKey: key }))
      );
      setIsLoading(false);
    };

    fetchData();
  }, [selectedYear]);

  // Auto-scroll to the current race after data loads
  useEffect(() => {
    if (isLoading || filteredCircuits.length === 0 || allResults.length === 0 || hasScrolled.current) return;

    // Find the last circuit that has race results
    let currentIndex = -1;
    const lastWithResults = filteredCircuits.reduce((lastIdx, circuit, idx) => {
      const rData = allResults.find(r => r.circuitId === circuit.circuitId);
      return (rData && (rData.race1?.length > 0 || rData.race2?.length > 0)) ? idx : lastIdx;
    }, -1);

    if (lastWithResults >= 0) {
      // Scroll to the next upcoming race, or the last completed if it's the final one
      currentIndex = lastWithResults < filteredCircuits.length - 1 ? lastWithResults + 1 : lastWithResults;
    } else {
      currentIndex = 0;
    }

    if (currentIndex >= 0 && circuitRefs.current[currentIndex]) {
      hasScrolled.current = true;
      setTimeout(() => {
        circuitRefs.current[currentIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [isLoading, filteredCircuits, allResults]);

  // console.log('filteredCircuits', filteredCircuits);

  return (
    <div className="standard-scroll-container">
      <div className="race-results max-w-[120rem] m-auto mt-32 mb-64 px-4 sm:px-8">
        {selectedYear.toString() === "2026" && (
          <div className="relative w-full max-w-[600px] mx-auto mb-32 drop-shadow-2xl hover:scale-[1.02] transition-transform duration-500 cursor-pointer">
            <div className="rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(29,78,216,0.15)] bg-black/20 backdrop-blur-sm">
              <img src="/images/2026/F2-Dates.png" alt="Formula 2 Dates" className="w-full h-auto object-cover" />
            </div>
          </div>
        )}
        {isLoading ? (
          <Loading
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
            const rData = allResults.find(r => r.circuitId === circuit.circuitId);
            return (
              <Top3Drivers
                ref={el => circuitRefs.current[index] = el}
                key={circuit.circuitId}
                year={selectedYear}
                meetingKey={circuit.meetingKey}
                circuitId={circuit.circuitId}
                circuitRaceName={circuit.raceName}
                championshipLevel={championshipLevel}
                f1Date={f1Race?.date}
                f1Time={f1Race?.time}
                raceData={rData}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

