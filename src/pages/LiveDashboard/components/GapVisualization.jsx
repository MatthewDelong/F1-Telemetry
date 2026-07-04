import React from 'react';
import { getTeamColor } from '../utils/f1Utils.js';

export default function GapVisualization({ drivers, positions, intervals, laps }) {
  if (!drivers || drivers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div className="empty-title">No Gap Data</div>
      </div>
    );
  }

  // Get latest position per driver
  const latestPos = {};
  if (positions) {
    for (const p of positions) {
      const dn = p.driver_number;
      if (!latestPos[dn] || new Date(p.date) > new Date(latestPos[dn].date)) {
        latestPos[dn] = p;
      }
    }
  }

  // Get latest interval per driver
  const latestInterval = {};
  if (intervals) {
    for (const iv of intervals) {
      const dn = iv.driver_number;
      if (!latestInterval[dn] || new Date(iv.date) > new Date(latestInterval[dn].date)) {
        latestInterval[dn] = iv;
      }
    }
  }

  // Build sorted driver list with gaps
  const seenNumbers = new Set();
  const uniqueDrivers = drivers.filter(d => {
    if (seenNumbers.has(d.driver_number)) return false;
    seenNumbers.add(d.driver_number);
    return true;
  });

  const driverGaps = uniqueDrivers.map(d => ({
    driver: d,
    position: latestPos[d.driver_number]?.position ?? 99,
    gap: latestInterval[d.driver_number]?.gap_to_leader ?? null,
  }))
    .sort((a, b) => a.position - b.position)
    .slice(0, 20);

  // Find max gap for scaling
  const maxGap = Math.max(...driverGaps.map(d => (typeof d.gap === 'number' ? d.gap : 0)), 1);

  return (
    <div className="gap-bars">
      {driverGaps.map(({ driver, position, gap }) => {
        const teamColor = getTeamColor(driver.team_name, driver.team_colour);
        const barWidth = typeof gap === 'number' && gap > 0
          ? Math.max((gap / maxGap) * 100, 2)
          : (position === 1 ? 100 : 0);
        const gapDisplay = position === 1 ? 'LEADER' : (typeof gap === 'number' ? `+${gap.toFixed(3)}s` : (typeof gap === 'string' ? gap : '—'));

        return (
          <div className="gap-bar-row" key={driver.driver_number}>
            <div className="gap-bar-driver">
              <span style={{ color: teamColor, marginRight: '0.3rem', fontSize: '0.65rem' }}>●</span>
              {driver.name_acronym || driver.last_name?.substring(0, 3).toUpperCase() || `DR${driver.driver_number}`}
            </div>
            <div className="gap-bar-track">
              <div
                className="gap-bar-fill"
                style={{
                  width: `${barWidth}%`,
                  background: `linear-gradient(90deg, ${teamColor}, ${teamColor}88)`,
                }}
              />
            </div>
            <div className="gap-bar-value">{gapDisplay}</div>
          </div>
        );
      })}
    </div>
  );
}
