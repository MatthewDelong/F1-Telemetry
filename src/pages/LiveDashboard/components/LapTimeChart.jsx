import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getTeamColor, getDriverLaps } from '../utils/f1Utils.js';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">Lap {label}</div>
      {payload.map((entry, idx) => (
        <div className="value" key={idx} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(3) : entry.value}s
        </div>
      ))}
    </div>
  );
}

export default function LapTimeChart({ drivers, laps, selectedDrivers }) {
  const chartData = useMemo(() => {
    if (!drivers || !laps || laps.length === 0) return { data: [], driverList: [] };

    // If no selectedDrivers, pick top 5 by appearance
    const seenNumbers = new Set();
    const uniqueDrivers = drivers.filter(d => {
      if (seenNumbers.has(d.driver_number)) return false;
      seenNumbers.add(d.driver_number);
      return true;
    });

    const driverList = selectedDrivers && selectedDrivers.length > 0
      ? uniqueDrivers.filter(d => selectedDrivers.includes(d.driver_number))
      : uniqueDrivers.slice(0, 6);

    // Get all laps by lap number
    const lapMap = {};
    for (const d of driverList) {
      const driverLaps = getDriverLaps(laps, d.driver_number);
      for (const lap of driverLaps) {
        if (!lap.lap_duration || lap.lap_duration > 200) continue; // Filter outliers (pit laps)
        if (!lapMap[lap.lap_number]) lapMap[lap.lap_number] = { lap: lap.lap_number };
        const label = d.name_acronym || `DR${d.driver_number}`;
        lapMap[lap.lap_number][label] = lap.lap_duration;
      }
    }

    const data = Object.values(lapMap).sort((a, b) => a.lap - b.lap);
    return { data, driverList };
  }, [drivers, laps, selectedDrivers]);

  if (chartData.data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📈</div>
        <div className="empty-title">No Lap Time Data</div>
      </div>
    );
  }

  return (
    <div className="chart-container chart-container-lg">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData.data} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="lap" stroke="var(--text-tertiary)" fontSize={10} />
          <YAxis
            stroke="var(--text-tertiary)"
            fontSize={10}
            domain={['auto', 'auto']}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}
          />
          {chartData.driverList.map((d) => {
            const label = d.name_acronym || `DR${d.driver_number}`;
            const color = getTeamColor(d.team_name, d.team_colour);
            return (
              <Line
                key={d.driver_number}
                type="monotone"
                dataKey={label}
                stroke={color}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: color }}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
