import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { getTeamColor, formatLapTime } from '../utils/f1Utils.js';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="custom-tooltip">
      <div className="label">{data.name}</div>
      <div className="value">{formatLapTime(data.bestLap)}</div>
    </div>
  );
}

export default function SpeedComparison({ drivers, laps, positions }) {
  const chartData = useMemo(() => {
    if (!drivers || !laps || laps.length === 0) return [];

    // Get latest position
    const latestPos = {};
    if (positions) {
      for (const p of positions) {
        const dn = p.driver_number;
        if (!latestPos[dn] || new Date(p.date) > new Date(latestPos[dn].date)) {
          latestPos[dn] = p;
        }
      }
    }

    // Get best lap per driver
    const bestLap = {};
    for (const lap of laps) {
      const dn = lap.driver_number;
      if (lap.lap_duration && (!bestLap[dn] || lap.lap_duration < bestLap[dn])) {
        bestLap[dn] = lap.lap_duration;
      }
    }

    // Remove duplicates
    const seenNumbers = new Set();
    const uniqueDrivers = drivers.filter(d => {
      if (seenNumbers.has(d.driver_number)) return false;
      seenNumbers.add(d.driver_number);
      return true;
    });

    // Find fastest time
    const fastest = Math.min(...Object.values(bestLap).filter(v => v > 0));

    return uniqueDrivers
      .filter(d => bestLap[d.driver_number])
      .map(d => ({
        name: d.name_acronym || d.last_name?.substring(0, 3).toUpperCase() || `DR${d.driver_number}`,
        driverNumber: d.driver_number,
        bestLap: bestLap[d.driver_number],
        gap: bestLap[d.driver_number] - fastest,
        teamColor: getTeamColor(d.team_name, d.team_colour),
        position: latestPos[d.driver_number]?.position ?? 99,
      }))
      .sort((a, b) => a.bestLap - b.bestLap)
      .slice(0, 20);
  }, [drivers, laps, positions]);

  if (chartData.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏎️</div>
        <div className="empty-title">No Speed Data</div>
      </div>
    );
  }

  return (
    <div className="chart-container chart-container-lg">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 50, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis
            type="number"
            stroke="var(--text-tertiary)"
            fontSize={10}
            tickFormatter={(v) => `+${v.toFixed(1)}s`}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="var(--text-tertiary)"
            fontSize={10}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="gap" radius={[0, 3, 3, 0]} barSize={16}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.teamColor} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
