import React, { useEffect, useState } from 'react';
import { fetchRaceDetails, getDriverStandings, getPartialDriverStandings } from '../utils/api';

import { ConstructorDriver, Loading, RangeSelector, TeamLegendFilter } from '../components';

export function DriverStandings({ selectedYear }) {
  const [standings, setStandings] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [start, setStart] = useState(-1);
  const [end, setEnd] = useState(-1);
  const [raceDetails, setRaceDetails] = useState(null);
  const [reset, setReset] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  useEffect(() => {
    setSelectedTeam(null);
    setIsLoading(true);
  }, [selectedYear]);

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getDriverStandings(selectedYear);
        const data2 = await fetchRaceDetails(selectedYear);
        if (!isCancelled) {
          setRaceDetails(data2?.filter(race => (race.url)) || []);
          setStandings(data || []);
        }
      } catch (err) {
        console.error("Error fetching driver standings:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [selectedYear, reset]);

  useEffect(() => {
    if (start === -1 || end === -1 || parseInt(start) >= parseInt(end)) {
      setRangeOpen(false);
      return;
    }

    setRangeOpen(true);
    let isCancelled = false;
    const alterStandings = async () => {
      setIsLoading(true);
      try {
        const data = await getPartialDriverStandings(selectedYear, start, end);
        if (!isCancelled) {
          setStandings(data || []);
        }
      } catch (err) {
        console.error("Error fetching partial standings:", err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    alterStandings();

    return () => {
      isCancelled = true;
    };
  }, [start, end, selectedYear]);

  // console.log({start}, {end});
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
      <div className="max-w-[45rem] m-auto  pb-64">
      {isLoading ? (
        <Loading message={`Loading ${selectedYear} Driver Standings`} />
      ) : (
        <>
          <RangeSelector 
            start={start}
            end={end}
            reset={reset}
            setEnd={setEnd}
            setStart={setStart}
            setReset={setReset}
            raceDetails={raceDetails}
            className="pt-12 relative z-[90]"
            rangeOpen={rangeOpen}
          />
          <TeamLegendFilter
            standings={standingsWithPosition}
            selectedTeam={selectedTeam}
            onSelectTeam={setSelectedTeam}
            year={selectedYear}
            className="mt-16"
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
                <li key={`${standing.driverCode || standing.lastName}-${standing.position || index}`} className='w-full relative'>
                  <ConstructorDriver 
                    image={standing.driverCode} 
                    car={standing.constructorId}
                    color={standing.constructorColor}
                    points={standing.points}
                    firstName={standing.firstName}
                    lastName={standing.lastName}
                    year={selectedYear} 
                    nationality={standing.nationality}
                    showDivider
                    index={index}
                    position={standing.position}
                    showStanding
                  />
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

