import React, { useState, useEffect, useMemo } from "react";
import { fetchRaceDetails, fetchRaceMeetingKeys, fetchOpenF1Podium, BASE_F1_URL } from "../utils/api";
import teamColors from "../utils/teamColors.json";
import classNames from "classnames";

import { RaceResultItem, Loading, Button } from "../components";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "../utils/formatDate";

export function RaceResultsPage({ selectedYear }) {
  const [raceDetails, setRaceDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [races, setRaces] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const details = await fetchRaceDetails(selectedYear);
      const racesMK = await fetchRaceMeetingKeys(selectedYear);
      // The details array from fetchRaceDetails already contains .results for past races
      const enrichedDetails = await Promise.all(details.map(async race => {
        let resultsForRace = [];

        if (race.results && race.results.length > 0) {
          resultsForRace = race.results.slice(0, 3).map(res => {
            const con = res.Constructor || (typeof res.constructor !== 'function' ? res.constructor : undefined);
            let conId = con ? (con.constructorId || con.name || "").toLowerCase().replace(/\s+/g, "_") : "";
            if (conId === "red_bull_racing") conId = "red_bull";
            
            return {
              number: res.number,
              driver: res.driver || res.Driver,
              driverColor: conId ? (teamColors[String(selectedYear)]?.[conId] || teamColors["2025"]?.[conId]) : undefined,
            fastestLap: res.fastestLap || res.FastestLap,
            grid: res.grid,
            position: res.position,
            status: res.status,
            time: res.time || (res.Time && res.Time.time)
            };
          });

          // Augment fastest lap if missing
          const hasFastestLap = resultsForRace.some(r => r.fastestLap?.rank === "1" || r.fastestLap?.rank === 1);
          const meetingKey = racesMK[race.raceName]?.["meeting_key"];
          
          if (!hasFastestLap && meetingKey) {
            try {
              console.log(`[RaceResultsPage] FastestLap missing for ${race.raceName}, augmenting from OpenF1...`);
              const oF1Results = await fetchOpenF1Podium(meetingKey);
              if (oF1Results && oF1Results.length > 0) {
                resultsForRace = resultsForRace.map(r => {
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

        return {
          ...race,
          results: resultsForRace
        };
      }));

      console.log(`[RaceResultsPage] Enriched Details for ${selectedYear}:`, enrichedDetails);
      setRaceDetails(enrichedDetails);
      setRaces(racesMK);
      setIsLoading(false);
    };

    fetchData();
  }, [selectedYear]);

  let navigate = useNavigate();
  const navigateToRaceResult = (race) => {
    // console.log(race);
    navigate(`/race/${races[race.raceName]?.["meeting_key"]}`);
  };

  const processedRaces = useMemo(() => {
    let effectiveRound = 1;
    return raceDetails.map((race) => {
      return {
        ...race,
        displayRound: effectiveRound++,
      };
    });
  }, [raceDetails]);

  return (
    <div className="standard-scroll-container">
      <div className="race-results max-w-[120rem] m-auto mt-32  pb-64">
        {isLoading ? (
          <Loading
            message={`Loading ${selectedYear} Race Results`}
          />
        ) : (
          <ul className="race-result">
            {processedRaces.map((race, index) => (
              <li
                key={index}
                className={classNames(
                  "bg-glow-dark border border-white/5 shadow-xl hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] rounded-[2.4rem] mt-56 px-32 group duration-300 transition-all ease-in-out relative",
                  {
                    "hover:scale-[.98] hover:cursor-pointer": true,
                  },
                  `${race.raceName}`,
                )}
                onClick={() => {
                  if (races[race.raceName]?.["meeting_key"]) {
                    navigateToRaceResult(race);
                  }
                }}
              >
                {race.results && race.results.length > 0 ? (
                  <ul className="race-results__list -mt-48 group-hover:scale-[1.10] duration-150 transition-transform ease-in-out">
                    {race.results.map((result, resultIndex) => (
                      <RaceResultItem
                        className={`race-results__list__item-${resultIndex + 1}`}
                        carNumber={result.number}
                        driver={result.driver}
                        driverColor={result.driverColor}
                        fastestLap={result.fastestLap}
                        startPosition={parseInt(result.grid, 10)}
                        key={resultIndex}
                        index={resultIndex}
                        endPosition={parseInt(result.position, 10)}
                        status={result.status}
                        time={result.time}
                        year={selectedYear}
                        wireframe={race.results.length === 0}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center -mt-[5.5rem] mb-[2.5rem] w-full min-h-[16rem] relative">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-30 rounded-[2rem] pointer-events-none"></div>
                    <div className="flex flex-col items-center justify-center p-12 backdrop-blur-sm bg-white/5 border border-white/10 rounded-3xl shadow-[0_0_20px_rgba(255,255,255,0.03)] w-[90%] max-w-[30rem] z-10 transition-transform duration-300 group-hover:scale-[1.02]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-[4.2rem] w-[4.2rem] text-brand-blue-400 mb-6 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="uppercase text-neutral-300 tracking-[0.3em] font-display text-xl mb-4 text-center gradient-text-light">Upcoming Race</span>
                      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent my-2 w-[80%]" />
                      <span className="text-[1.3rem] text-neutral-400 text-center font-medium px-4 mt-2">Data will be available after the race completes.</span>
                    </div>
                  </div>
                )}
                <div className="text-center mb-8 mt-12">
                  <div className="uppercase text-xs text-brand-blue-400 font-bold tracking-widest leading-none mb-4 mt-24">
                    {`Round ${race.displayRound}`}
                  </div>
                  <p className="font-display tracking-xs leading-none mb-4 font-bold gradient-text-light text-2xl">
                    {race.raceName}
                  </p>
                  <div className="text-sm text-neutral-400 tracking-sm leading-none font-medium">
                    {formatDateTime(race.date, race.time)}
                  </div>
                </div>
                <Button
                  buttonStyle="hollow"
                  size="sm"
                  disabled={!races[race.raceName]?.["meeting_key"]}
                  className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute bottom-[-1.2rem] left-1/2 -translate-x-1/2 rounded-full px-16 py-8 tracking-widest uppercase !bg-black/60 !backdrop-blur-md !border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300 hover:!bg-black/80 hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] font-display"
                >
                  View Race Data
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
