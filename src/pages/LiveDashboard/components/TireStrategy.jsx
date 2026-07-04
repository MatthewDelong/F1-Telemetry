import React, { useMemo } from 'react';
import { getTeamColor, getTireInfo } from '../utils/f1Utils.js';

export default function TireStrategy({ drivers, stints, positions }) {
  const strategyData = useMemo(() => {
    if (!drivers || !stints || stints.length === 0) return [];

    // Get latest positions
    const latestPos = {};
    if (positions) {
      for (const p of positions) {
        const dn = p.driver_number;
        if (!latestPos[dn] || new Date(p.date) > new Date(latestPos[dn].date)) {
          latestPos[dn] = p;
        }
      }
    }

    // Group stints by driver
    const driverStints = {};
    for (const s of stints) {
      if (!driverStints[s.driver_number]) driverStints[s.driver_number] = [];
      driverStints[s.driver_number].push(s);
    }

    // Get unique drivers
    const seenNumbers = new Set();
    const uniqueDrivers = drivers.filter(d => {
      if (seenNumbers.has(d.driver_number)) return false;
      seenNumbers.add(d.driver_number);
      return true;
    });

    // Build strategy data
    return uniqueDrivers
      .map(d => ({
        driver: d,
        position: latestPos[d.driver_number]?.position ?? 99,
        stints: (driverStints[d.driver_number] || []).sort((a, b) => a.stint_number - b.stint_number),
      }))
      .sort((a, b) => a.position - b.position);
  }, [drivers, stints, positions]);

  if (strategyData.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🔄</div>
        <div className="empty-title">No Tire Strategy Data</div>
      </div>
    );
  }

  // Find max lap for scaling
  const maxLap = Math.max(
    ...strategyData.flatMap(d => d.stints.map(s => s.lap_end || s.lap_start || 0)),
    1
  );

  return (
    <div style={{ padding: '0.75rem 1rem' }}>
      {strategyData.slice(0, 20).map(({ driver, stints: driverStints }) => {
        const teamColor = getTeamColor(driver.team_name, driver.team_colour);
        const driverLabel = driver.name_acronym || driver.last_name?.substring(0, 3).toUpperCase() || `DR${driver.driver_number}`;

        return (
          <div key={driver.driver_number} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px', height: '22px' }}>
            <div style={{ minWidth: '40px', fontSize: '0.72rem', fontWeight: 700, textAlign: 'right', color: 'var(--text-primary)' }}>
              <span style={{ color: teamColor, marginRight: '0.25rem' }}>●</span>
              {driverLabel}
            </div>
            <div style={{ flex: 1, display: 'flex', height: '16px', gap: '1px', borderRadius: '2px', overflow: 'hidden' }}>
              {driverStints.map((stint, idx) => {
                const tireInfo = getTireInfo(stint.compound);
                const start = stint.lap_start || 0;
                const end = stint.lap_end || start + 1;
                const width = ((end - start) / maxLap) * 100;

                return (
                  <div
                    key={idx}
                    title={`${stint.compound || 'Unknown'} | Laps ${start}-${end}`}
                    style={{
                      width: `${Math.max(width, 1)}%`,
                      backgroundColor: tireInfo.color,
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.55rem',
                      fontWeight: 800,
                      color: stint.compound?.toUpperCase() === 'HARD' ? '#111' : '#fff',
                      minWidth: '12px',
                      transition: 'width 0.5s ease',
                    }}
                  >
                    {width > 4 ? tireInfo.label : ''}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', paddingLeft: '48px', flexWrap: 'wrap' }}>
        {['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'].map(compound => {
          const ti = getTireInfo(compound);
          return (
            <div key={compound} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: ti.color, border: '1px solid rgba(255,255,255,0.2)' }} />
              {compound.charAt(0) + compound.slice(1).toLowerCase()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
