import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

const useIsMobile = (breakpoint = 640) => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
};
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { fetchPitStops } from '../utils/api';
import { Loading } from './Loading';

const STOP_COLORS = {
  1: '#3B82F6', // Blue
  2: '#EF4444', // Red
  3: '#10B981', // Green
  4: '#F59E0B', // Orange
  5: '#EC4899', // Pink
  6: '#6B7280', // Grey
};

const FASTEST_COLOR = '#A855F7'; // Purple

export const PitStopTimes = ({
  sessionKey,
  raceResults,
  driversDetails,
  driversColor,
  driverCode,
  startGrid,
  showTitle = true,
}) => {
  const [pitData, setPitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getPitData = async () => {
      if (!sessionKey) return;
      setIsLoading(true);
      try {
        const data = await fetchPitStops(sessionKey);
        setPitData(data);
      } catch (error) {
        console.error('Error fetching pit data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    getPitData();
  }, [sessionKey]);

  const sortedDriverAcronyms = useMemo(() => {
    if (raceResults && raceResults.length > 0) {
      return raceResults
        .sort((a, b) => parseInt(a.position, 10) - parseInt(b.position, 10))
        .map((result) => result.Driver.code);
    }
    // Fallback to startGrid if raceResults is empty
    return (startGrid || [])
      .sort((a, b) => a.position - b.position)
      .map(entry => entry.driver_acronym);
  }, [raceResults, startGrid]);

  const chartData = useMemo(() => {
    if (!pitData.length || !driversDetails) return [];

    const sortedPits = [...pitData].sort((a, b) => new Date(a.date) - new Date(b.date));
    const seen = new Set();
    const uniquePits = sortedPits.filter(pit => {
      const acronym = driversDetails[pit.driver_number];
      if (!acronym || !sortedDriverAcronyms.includes(acronym)) return false;
      const key = `${pit.driver_number}-${pit.lap_number}`;
      if (seen.has(key) || pit.pit_duration < 15) return false;
      seen.add(key);
      return true;
    });

    const stopsByDriver = {};
    const formattedData = uniquePits.map((pit) => {
      const acronym = driversDetails[pit.driver_number];
      if (!stopsByDriver[acronym]) stopsByDriver[acronym] = 0;
      stopsByDriver[acronym]++;
      const yIndex = sortedDriverAcronyms.indexOf(acronym);

      return {
        acronym,
        duration: pit.pit_duration,
        stopNumber: stopsByDriver[acronym],
        lap: pit.lap_number,
        y: yIndex,
      };
    }).filter((item) => item !== null && item.y !== -1);

    // Identify fastest pit stop
    const minDur = Math.min(...formattedData.map(d => d.duration));
    const finalData = formattedData.map(d => ({
      ...d,
      isFastest: d.duration === minDur
    }));

    if (driverCode) {
      return finalData.filter((item) => item.acronym === driverCode);
    }
    return finalData;
  }, [pitData, driversDetails, driverCode, sortedDriverAcronyms]);

  // Determine X-axis domain to handle extreme outliers (like 1000s+)
  const xDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 40];
    const durations = chartData.map(d => d.duration);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    
    // If we have extreme outliers, cap the default view at 60s or 1.5x the median to keep normal stops visible
    if (max > 120) {
      return [Math.max(0, min - 5), 60]; 
    }
    return ['auto', 'auto'];
  }, [chartData]);

  const displayAcronyms = driverCode
    ? sortedDriverAcronyms.filter((a) => a === driverCode)
    : sortedDriverAcronyms;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip bg-slate-900 border border-slate-700 p-16 rounded shadow-lg z-50">
          <p className="font-display text-white text-md mb-4">{`${data.acronym}: ${data.duration.toFixed(3)}s`}</p>
          <p className="text-xs text-slate-400 font-display uppercase">{`Stop ${data.stopNumber} - Lap ${data.lap}`}</p>
          {data.isFastest && <p className="text-[10px] text-purple-400 font-display uppercase mt-4">Fastest Pit Stop</p>}
        </div>
      );
    }
    return null;
  };

  const isMobile = useIsMobile();

  const renderCustomShape = useCallback((props) => {
    const { cx, cy, fill, payload } = props;
    const r = isMobile ? 5 : 6;
    const iconSize = isMobile ? 16 : 20;
    const offset = iconSize / 2;
    if (payload.isFastest) {
      return (
        <g transform={`translate(${cx - offset}, ${cy - offset})`}>
          <path
            d="M13.2,2H5.1L3,13.2h4.5l-2.4,8.8l10.1-11.2h-4.5L13.2,2z"
            fill="#FDE047"
            filter="drop-shadow(0 0 3px rgba(253, 224, 71, 0.8))"
            transform={isMobile ? `scale(${iconSize / 20})` : undefined}
          />
        </g>
      );
    }
    return <circle cx={cx} cy={cy} r={r} fill={fill} />;
  }, [isMobile]);

  const Legend = () => (
    <div className={classNames(
      "shrink-0",
      isMobile
        ? "flex flex-row flex-wrap items-center gap-x-12 gap-y-6 border-b border-slate-800 pb-12 mb-12"
        : "flex flex-col gap-12 w-[130px] border-l border-slate-800 pl-24 ml-24"
    )}>
      <h3 className={classNames(
        "text-xs font-display uppercase text-white tracking-widest",
        isMobile ? "w-full mb-2" : "mb-4"
      )}>Pit Stop Legend</h3>
      {Object.entries(STOP_COLORS).map(([num, color]) => (
        <div key={num} className="flex items-center gap-6">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] text-neutral-400 font-display uppercase whitespace-nowrap">{`Stop ${num}`}</span>
        </div>
      ))}
      <div className={classNames(
        "flex items-center gap-6",
        !isMobile && "mt-8 pt-8 border-t border-slate-800"
      )}>
        <svg width="12" height="12" viewBox="0 0 20 20" className="shrink-0">
          <path
            d="M13.2,2H5.1L3,13.2h4.5l-2.4,8.8l10.1-11.2h-4.5L13.2,2z"
            fill="#FDE047"
          />
        </svg>
        <span className="text-[10px] text-yellow-300 font-display uppercase leading-tight whitespace-nowrap">Fastest Pit Stop</span>
      </div>
    </div>
  );

  const yTicks = useMemo(() => {
    return displayAcronyms.map(acronym => sortedDriverAcronyms.indexOf(acronym));
  }, [displayAcronyms, sortedDriverAcronyms]);

  if (isLoading && pitData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-glow-dark rounded-xlarge">
        <Loading message="Fetching pit stop data..." />
      </div>
    );
  }

  if (!isLoading && chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-glow-dark text-neutral-500 rounded-xlarge">
        No pit stop data available for this session.
      </div>
    );
  }

  return (
    <div className={classNames("bg-glow-dark p-16 sm:p-32 rounded-md sm:rounded-xlarge relative overflow-hidden", { "mb-32": showTitle })}>
      {showTitle && (
        <div className="flex flex-col gap-4 mb-24 relative z-10">
          <h2 className="heading-3 gradient-text-light uppercase tracking-sm">Pit Stop Times</h2>
          <div className="w-full h-2 bg-red-600 rounded-full" />
        </div>
      )}

      <div className={classNames(
        isMobile ? "flex flex-col" : "flex flex-row items-stretch"
      )}>
        {isMobile && <Legend />}
        <div className="grow min-w-0" style={{ height: Math.max(displayAcronyms.length * (isMobile ? 34 : 40) + (isMobile ? 70 : 100), isMobile ? 350 : 400) }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={isMobile
                ? { top: 10, right: 8, bottom: 30, left: 0 }
                : { top: 20, right: 10, bottom: 40, left: 20 }
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" vertical={true} horizontal={true} />
              <XAxis
                type="number"
                dataKey="duration"
                name="Time"
                unit="s"
                stroke="#A0AEC0"
                axisLine={false}
                tickLine={false}
                domain={xDomain}
                allowDataOverflow={true}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                label={{ value: 'Time (s)', position: 'bottom', fill: '#A0AEC0', offset: isMobile ? 10 : 20, fontSize: isMobile ? 10 : 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Driver"
                stroke="#A0AEC0"
                axisLine={false}
                tickLine={false}
                ticks={yTicks}
                domain={[Math.min(...yTicks), Math.max(...yTicks)]}
                reversed={true}
                interval={0}
                width={isMobile ? 36 : 50}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                tickFormatter={(index) => sortedDriverAcronyms[index]}
                label={isMobile ? undefined : { value: 'Drivers', angle: -90, position: 'insideLeft', fill: '#A0AEC0', offset: -10 }}
              />
              <ZAxis type="number" range={isMobile ? [80, 80] : [140, 140]} />
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                name="Pit Stops" 
                data={chartData}
                shape={renderCustomShape}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STOP_COLORS[entry.stopNumber] || STOP_COLORS[6]}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        {!isMobile && <Legend />}
      </div>
    </div>
  );
};

PitStopTimes.propTypes = {
  sessionKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  raceResults: PropTypes.array,
  driversDetails: PropTypes.object,
  driversColor: PropTypes.object,
  driverCode: PropTypes.string,
  showTitle: PropTypes.bool,
};

export default PitStopTimes;
