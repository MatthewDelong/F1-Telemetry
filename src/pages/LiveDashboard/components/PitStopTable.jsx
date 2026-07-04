import React, { useMemo } from 'react';
import { getTeamColor, formatDuration, formatTime } from '../utils/f1Utils.js';

export default function PitStopTable({ drivers, pitStops }) {
  const data = useMemo(() => {
    if (!pitStops || pitStops.length === 0) return [];

    // Build driver map
    const driverMap = {};
    if (drivers) {
      for (const d of drivers) {
        driverMap[d.driver_number] = d;
      }
    }

    return pitStops
      .map(p => ({
        ...p,
        driver: driverMap[p.driver_number],
      }))
      .sort((a, b) => {
        // Sort by lap number, then by pit duration
        if (a.lap_number !== b.lap_number) return a.lap_number - b.lap_number;
        return (a.pit_duration || 999) - (b.pit_duration || 999);
      });
  }, [drivers, pitStops]);

  if (data.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔧</div>
        <div className="empty-title">No Pit Stop Data</div>
        <div className="empty-desc">Pit stop data will appear during the race.</div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="pit-table">
        <thead>
          <tr>
            <th>LAP</th>
            <th>DRIVER</th>
            <th>PIT TIME</th>
            <th>TIME OF DAY</th>
          </tr>
        </thead>
        <tbody>
          {data.map((pit, idx) => {
            const teamColor = pit.driver ? getTeamColor(pit.driver.team_name, pit.driver.team_colour) : '#666';
            const driverLabel = pit.driver?.name_acronym || `DR${pit.driver_number}`;

            return (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{pit.lap_number || '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: teamColor }} />
                    <span style={{ fontWeight: 600, fontFamily: 'var(--font-sans)' }}>{driverLabel}</span>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: pit.pit_duration < 25 ? 'var(--green-sector)' : 'var(--text-primary)' }}>
                  {pit.pit_duration ? `${pit.pit_duration.toFixed(3)}s` : '—'}
                </td>
                <td style={{ color: 'var(--text-tertiary)' }}>{formatTime(pit.date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
