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
      {payload
        .sort((a, b) => (a.value || 99) - (b.value || 99))
        .map((entry, idx) => (
          <div className="value" key={idx} style={{ color: entry.color }}>
            P{entry.value} - {entry.name}
          </div>
        ))}
    </div>
  );
}

export default function PositionChart({ drivers, laps, positions }) {
  const chartData = useMemo(() => {
    if (!drivers || !positions || positions.length === 0) return { data: [], driverList: [] };

    const seenNumbers = new Set();
    const uniqueDrivers = drivers.filter(d => {
      if (seenNumbers.has(d.driver_number)) return false;
      seenNumbers.add(d.driver_number);
      return true;
    }).slice(0, 10); // Show top 10 for clarity

    // Build position by lap
    // We'll use laps data to map positions per lap
    const driverLapPositions = {};
    for (const d of uniqueDrivers) {
      driverLapPositions[d.driver_number] = {};
    }

    // Get laps per driver and try to extract position from i_segment or use running position
    const driverPosList = {};
    if (positions) {
      for (const p of positions) {
        if (!driverPosList[p.driver_number]) driverPosList[p.driver_number] = [];
        if (p.date) {
          driverPosList[p.driver_number].push({ date: new Date(p.date).getTime(), pos: p.position });
        }
      }
      for (const dn in driverPosList) {
        driverPosList[dn].sort((a, b) => a.date - b.date);
      }
    }

    if (laps) {
      for (const lap of laps) {
        const dn = lap.driver_number;
        if (driverLapPositions[dn] !== undefined) {
          let matchedPos = null;
          if (lap.date_start) {
            // Target the time around the end of the lap
            const lapTime = new Date(lap.date_start).getTime() + (lap.lap_duration ? lap.lap_duration * 1000 : 0);
            const posList = driverPosList[dn];
            if (posList && posList.length > 0) {
              matchedPos = posList[0].pos;
              for (const p of posList) {
                // Take positions up to a small buffer after the lap ends
                if (p.date > lapTime + 5000) break;
                matchedPos = p.pos;
              }
            }
          }
          if (matchedPos !== null) {
            driverLapPositions[dn][lap.lap_number] = matchedPos;
          }
        }
      }
    }

    // Determine max lap
    const maxLap = Math.max(
      ...Object.values(driverLapPositions).flatMap(d => Object.keys(d).map(Number)),
      1
    );

    // Build chart data
    const data = [];
    for (let lap = 1; lap <= maxLap; lap++) {
      const entry = { lap };
      for (const d of uniqueDrivers) {
        const label = d.name_acronym || `DR${d.driver_number}`;
        entry[label] = driverLapPositions[d.driver_number]?.[lap] ?? null;
      }
      data.push(entry);
    }

    return { data, driverList: uniqueDrivers };
  }, [drivers, laps, positions]);

  if (chartData.data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div className="empty-title">No Position Data</div>
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
            reversed
            stroke="var(--text-tertiary)"
            fontSize={10}
            domain={[1, 20]}
            ticks={[1, 5, 10, 15, 20]}
            label={{ value: 'Position', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-tertiary)', fontSize: 10 } }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }} />
          {chartData.driverList.map((d) => {
            const label = d.name_acronym || `DR${d.driver_number}`;
            const color = getTeamColor(d.team_name, d.team_colour);
            return (
              <Line
                key={d.driver_number}
                type="stepAfter"
                dataKey={label}
                stroke={color}
                strokeWidth={2}
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
