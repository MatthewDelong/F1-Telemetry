import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

export const PositionsComparisonChart = ({ headToHeadData, teamColor, isQualifying }) => {
  const chartData = useMemo(() => {
    if (!headToHeadData) return [];

    const driver1PosList = isQualifying ? headToHeadData.driver1QualifyingPosList : headToHeadData.driver1RacePosList;
    const driver2PosList = isQualifying ? headToHeadData.driver2QualifyingPosList : headToHeadData.driver2RacePosList;

    const allRaces = [...new Set([...Object.keys(driver1PosList || {}), ...Object.keys(driver2PosList || {})])];
    return allRaces.map((raceName, index) => {
      const driver1Pos = driver1PosList[raceName];
      const driver2Pos = driver2PosList[raceName];
  
      const round = headToHeadData.raceRounds?.[raceName] ?? index + 1;
      return {
        round,
        gp: `GP ${round}`,
        race: raceName,
        [headToHeadData.driver1Code]: driver1Pos ? parseInt(driver1Pos) : null,
        [headToHeadData.driver2Code]: driver2Pos ? parseInt(driver2Pos) : null,
      };
    }).sort((a, b) => a.round - b.round);
  }, [headToHeadData, isQualifying]);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 20, right: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444444" />
        <XAxis dataKey="gp" tick={<CustomizedXAxisTick />} />
        <YAxis reversed={true} domain={[1, 22]} />
        <Tooltip 
          labelFormatter={(label, payload) => {
            const data = payload?.[0]?.payload;
            if (data && typeof data.race === 'object') return label;
            return data?.race ? `${label} – ${data.race}` : label;
          }}
          formatter={(value) => typeof value === 'object' ? '—' : `P${value}`}
        />
        <Legend verticalAlign="top" height={32} />
        <Line type="monotone" dataKey={headToHeadData.driver1Code} stroke={teamColor.startsWith('#') ? teamColor : `#${teamColor}`} connectNulls={true}/>
        <Line type="monotone" dataKey={headToHeadData.driver2Code} stroke={lightenColor(teamColor, 40)} connectNulls={true}/>
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PositionsComparisonChart;
