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

export const PositionsGainedLostChart = ({ headToHeadData, teamColor }) => {
  const chartData = useMemo(() => {
    if (!headToHeadData) return [];
    
    const allRaces = [...new Set([
      ...Object.keys(headToHeadData.driver1PositionsGainLost || {}),
      ...Object.keys(headToHeadData.driver2PositionsGainLost || {}),
    ])];
    return allRaces.map((race, index) => {
      const driver1Data = headToHeadData.driver1PositionsGainLost?.[race];
      const driver2Data = headToHeadData.driver2PositionsGainLost?.[race];
      const toNum = (v) => (v === undefined || v === null ? null : parseInt(v) || 0);

      const round = headToHeadData.raceRounds?.[race] ?? index + 1;
      return {
        race,
        round,
        gp: `GP ${round}`,
        [headToHeadData.driver1Code]: toNum(driver1Data),
        [headToHeadData.driver2Code]: toNum(driver2Data),
      };
    }).sort((a, b) => a.round - b.round);
  }, [headToHeadData]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart width={730} height={250} data={chartData} margin={{ top: 20, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
        <XAxis dataKey="gp" interval={0} tick={<CustomizedXAxisTick />} />
        <YAxis tick={{ fontSize: 12, fill: '#f1f1f1' }} />
        <Tooltip
          labelFormatter={(label, payload) => {
            const data = payload?.[0]?.payload;
            if (data && typeof data.race === 'object') return label;
            return data?.race ? `${label} – ${data.race}` : label;
          }}
          formatter={(value) => (value === null || typeof value === 'object') ? '—' : value}
        />
        <Legend verticalAlign="top" height={36} />
        <Bar dataKey={headToHeadData.driver1Code} fillOpacity={1} fill={teamColor.startsWith('#') ? teamColor : `#${teamColor}`} />
        <Bar dataKey={headToHeadData.driver2Code} fillOpacity={1} fill={lightenColor(teamColor, 40)} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PositionsGainedLostChart;
