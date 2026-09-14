import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { lightenColor } from '../../utils/colorUtils';

export const PositionCharts = ({ laps, pos, startGrid, driversDetails, driversColor, raceResults, driverCode }) => {
  const [chartData, setChartData] = useState([]);
  const [newDriversColor, setnewDriversColor] = useState({});
  const [driverVisibility, setDriverVisibility] = useState({});

  const sortedDriverAcronyms = React.useMemo(() => {
    if (raceResults && raceResults.length > 0) {
      return raceResults
        .sort((a, b) => parseInt(a.position, 10) - parseInt(b.position, 10))
        .map(result => result.Driver.code);
    }
    // Fallback to startGrid if raceResults is empty
    return startGrid
      .sort((a, b) => a.position - b.position)
      .map(entry => entry.driver_acronym);
  }, [raceResults, startGrid]);

  useEffect(() => {
    const initialVisibility = {};
    sortedDriverAcronyms.forEach((acronym, index) => {
        initialVisibility[acronym] = driverCode ? (acronym === driverCode) : (index < 3);
    });
    setDriverVisibility(initialVisibility);

    const positionData = {};
    const newDriversColor = {};
    const colorCount = {};

    Object.entries(driversColor).forEach(([id, color]) => {
        const cleanColor = color && color !== 'undefined' && color !== 'null' ? color : 'FFFFFF';
        if (!colorCount[cleanColor]) {
            colorCount[cleanColor] = { count: 1, indexModified: false };
            newDriversColor[id] = `#${cleanColor}`;
        } else {
            colorCount[cleanColor].count++;
            if (!colorCount[cleanColor].indexModified) {
                newDriversColor[id] = lightenColor(cleanColor, 30);
                colorCount[cleanColor].indexModified = true;
            } else {
                newDriversColor[id] = `#${cleanColor}`;
            }
        }
    });

    console.log(`[PositionCharts] Driver Colors:`, newDriversColor);
    setnewDriversColor(newDriversColor);

    if (!laps || laps.length < 2) {
      setChartData([]);
      return;
    }

    // Initialize positions with starting grid for lap 0 (Start)
    startGrid.forEach(entry => {
      const acronym = entry.driver_acronym || driversDetails[entry.driver_number];
      if (acronym) {
        positionData[acronym] = [{ lap: 0, position: entry.position }];
      }
    });

    // Process position changes
    pos.forEach(posChange => {
      if (posChange.date && posChange.driver_number) {
        const changeTime = new Date(posChange.date);
        const acronym = driversDetails[posChange.driver_number];
        if (!acronym) return;

        const driverLapTimes = laps.filter(lap => lap.driver_number === posChange.driver_number && lap.date_start);
        let lapNumber = 2; // Start lap number from 2
        
        for (let i = 0; i < driverLapTimes.length; i++) {
          const lapStartTime = new Date(driverLapTimes[i].date_start);
          if (changeTime < lapStartTime) {
            break;
          }
          lapNumber = driverLapTimes[i].lap_number;
        }

        if (!positionData[acronym]) {
          positionData[acronym] = [];
        }

        positionData[acronym].push({
          lap: lapNumber,
          position: posChange.position
        });
      }
    });

    // Create final data structure
    const newChartData = [];
    const lapNumbers = laps.map(lap => lap.lap_number).filter(n => !isNaN(n));
    if (lapNumbers.length === 0) {
      setChartData([]);
      return;
    }
    const totalLaps = Math.max(...lapNumbers);

    for (let lap = 0; lap <= totalLaps; lap++) {
      const lapData = { lap };
      Object.keys(positionData).forEach(acronym => {
        const lastPosition = positionData[acronym]
          .filter(p => p.lap <= lap && p.position > 0)
          .slice(-1)[0];
        if (lastPosition) {
          lapData[acronym] = parseInt(lastPosition.position, 10);
        }
      });
      newChartData.push(lapData);
    }

    console.log(`[PositionCharts] Processed ${Object.keys(positionData).length} drivers into chart data.`);
    console.log(`[PositionCharts] Final Chart Data Sample:`, newChartData.slice(0, 5));
    setChartData(newChartData);
  }, [laps, pos, startGrid, driversColor, raceResults, driverCode]);

  const renderLines = () => {
    if (!driversDetails || Object.keys(driversDetails).length === 0) return null;

    // Use acronyms from driversColor to ensure we have colors for all lines
    const acronymsToRender = Object.keys(driversColor);
    if (acronymsToRender.length === 0) return null;

    return acronymsToRender.map(acronym => {
      const isVisible = driverCode ? (acronym === driverCode) : (driverVisibility[acronym] ?? false);

      if (!isVisible) return null;

      return (
        <Line
          key={acronym}
          type="linear"
          dataKey={acronym}
          stroke={`${newDriversColor[acronym] || '#FFFFFF'}`}
          dot={false}
          connectNulls={true}
          strokeWidth={2}
        />
      );
    });
  };

  const getYAxisLabels = () => {
    const labels = {};
    startGrid.forEach(entry => {
      labels[entry.position] = entry.driver_acronym || driversDetails[entry.driver_number];
    });
    return labels;
  };

  const yAxisLabels = getYAxisLabels();

  const handleDriverVisibilityChange = (acronym) => {
    setDriverVisibility(prevState => ({
        ...prevState,
        [acronym]: !prevState[acronym]
    }));
  };

  const lapTickFormatter = (tick) => tick === 0 ? 'Grid' : `Lap ${tick}`;

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] bg-glow-large text-neutral-500 rounded-xlarge">
        No telemetry data available for this session.
      </div>
    );
  }

  return (
    <>
      <div className="mb-16 bg-glow-large max-sm:py-[3.2rem] sm:p-32 rounded-md sm:rounded-xlarge min-h-[500px]">
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey="lap" 
              tickFormatter={lapTickFormatter} 
              stroke="#cccccc"
              fontSize={12}
              dy={10}
            />
            <YAxis
              reversed
              type="number"
              interval={0}
              domain={[1, 22]}
              ticks={Array.from({ length: 22 }, (_, i) => i + 1)}
              tickFormatter={tick => `P${tick}`}
              stroke="#cccccc"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #444' }}
              itemStyle={{ fontSize: '12px' }}
              formatter={(value, name) => [`P${value}`, driversDetails[name] || name]}
              labelFormatter={(label) => label === 0 ? 'Grid' : `Lap ${label}`}
            />
            {renderLines()}
          </LineChart>
        </ResponsiveContainer>
        {!driverCode && (
          <div className="flex flex-wrap justify-center gap-4 mt-4 sm:max-w-[80%] sm:mx-auto">
            {sortedDriverAcronyms.map((acronym, index) => (
              <button
                key={index}
                className={`py-1 px-4 text-white font-semibold rounded font-display`}
                onClick={() => handleDriverVisibilityChange(acronym)}
                style={{backgroundColor: driverVisibility[acronym] ? `${newDriversColor[acronym]}` : '#333333'}}
              >
                {acronym}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

PositionCharts.propTypes = {
  laps: PropTypes.array.isRequired,
  pos: PropTypes.array.isRequired,
  startGrid: PropTypes.array.isRequired,
  driversDetails: PropTypes.object.isRequired,
  driversColor: PropTypes.object.isRequired,
  raceResults: PropTypes.array.isRequired,
  driverCode: PropTypes.string,
};

export default PositionCharts;
