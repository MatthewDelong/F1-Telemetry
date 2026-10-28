import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { darkenColor, lightenColor } from '../../utils/colorUtils';

const CustomizedXAxisTick = ({ x, y, payload }) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#f1f1f1"
        transform="rotate(-15) translate(8,0)"
        fontSize={12}
      >
        {payload.value}
      </text>
    </g>
  );
};

const CustomizedYAxisTick = ({ x, y, payload }) => {
  const minutes = Math.floor(payload.value / 60);
  const seconds = Math.floor(payload.value % 60);
  const milliseconds = Math.round((payload.value - Math.floor(payload.value)) * 1000);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#f1f1f1"
        transform="rotate(-15) translate(-8,-12)"
        fontSize={10}
      >
        {`${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`}
      </text>
    </g>
  );
};

export const QualifyingLapTimesChart = ({ headToHeadData, teamColor }) => {
  const chartData = useMemo(() => {
    if (!headToHeadData) return [];
    const getTime = (times) => {
      if (!times) return null;
      const validTimes = times.filter(t => t && t !== 'N/A');
      return validTimes.length ? validTimes[validTimes.length - 1] : null;
    };

    const convertToSeconds = (time) => {
      if (!time) return null;
      if (!time.includes(':')) {
        const [secs, millis] = time.split('.');
        return parseInt(secs) + parseInt(millis || 0) / 1000;
      }
      const [minutes, seconds] = time.split(':');
      const [secs, millis] = seconds.split('.');
      return parseInt(minutes) * 60 + parseInt(secs) + parseInt(millis || 0) / 1000;
    };

    const d1 = headToHeadData.driver1QualifyingTimes || [];
    const d2 = headToHeadData.driver2QualifyingTimes || [];
    const allRaces = [...new Set([...d1.map(r => r.race), ...d2.map(r => r.race)])];

    return allRaces.map((race, index) => {
      const bestTime1 = getTime(d1.find(r => r.race === race)?.QualiTimes);
      const bestTime2 = getTime(d2.find(r => r.race === race)?.QualiTimes);
      const round = headToHeadData.raceRounds?.[race] ?? index + 1;
      return {
        round,
        gp: `GP ${round}`,
        race,
        [headToHeadData.driver1Code]: convertToSeconds(bestTime1),
        [headToHeadData.driver2Code]: convertToSeconds(bestTime2),
      };
    }).sort((a, b) => a.round - b.round);
  }, [headToHeadData]);

  const yAxisLimits = useMemo(() => {
    if (!chartData.length) return [0, 10]; // default values if no data
    let allValues = chartData.flatMap(data => Object.values(data).filter(val => typeof val === 'number'));
    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);
    let padding = (maxVal - minVal) * 0.1; // 10% padding
    return [minVal - padding, maxVal + padding];
  }, [chartData]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart width={730} height={250} data={chartData} margin={{ top: 20, right: 30 }}>
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={darkenColor(teamColor)} stopOpacity={1}/>
            <stop offset="95%" stopColor={darkenColor(teamColor)} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lightenColor(teamColor)} stopOpacity={1}/>
            <stop offset="95%" stopColor={lightenColor(teamColor)} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
        <XAxis dataKey="gp" interval={0} tick={<CustomizedXAxisTick />} />
        <YAxis
          domain={yAxisLimits}
          tick={<CustomizedYAxisTick />}
        />
        <Tooltip
          labelFormatter={(label, payload) => {
            const data = payload?.[0]?.payload;
            if (data && typeof data.race === 'object') return label;
            return data?.race ? `${label} – ${data.race}` : label;
          }}
          formatter={(value) => {
            if (typeof value === 'object') return '—';
            const minutes = Math.floor(value / 60);
            const totalSeconds = (value % 60);
            const seconds = Math.floor(totalSeconds);
            const milliseconds = Math.round((totalSeconds - seconds) * 1000);
            return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
          }}
        />
        <Legend verticalAlign="top" height={32} />
        <Bar dataKey={headToHeadData.driver1Code} fillOpacity={1} fill={teamColor.startsWith('#') ? teamColor : `#${teamColor}`} connectNulls={true} />
        <Bar dataKey={headToHeadData.driver2Code} fillOpacity={1} fill={lightenColor(teamColor, 40)} connectNulls={true} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default QualifyingLapTimesChart;
