import React from 'react';
import { getTeamColor, getTireInfo, formatLapTime, formatGap, formatInterval,
  getSectorColorClass, getPersonalBestSectors } from '../utils/f1Utils.js';

export default function TimingTable({ drivers, laps, stints, positions, intervals, overallBestSectors }) {
  if (!drivers || drivers.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏁</div>
        <div className="empty-title">No Timing Data</div>
        <div className="empty-desc">Timing data will appear here when a session is active.</div>
      </div>
    );
  }

  // Process latest data per driver
  const latestPos = {};
  if (positions) {
    for (const p of positions) {
      const dn = p.driver_number;
      if (!latestPos[dn] || new Date(p.date) > new Date(latestPos[dn].date)) {
        latestPos[dn] = p;
      }
    }
  }

  const latestLap = {};
  const bestLap = {};
  const personalBests = {};
  if (laps) {
    for (const lap of laps) {
      const dn = lap.driver_number;
      if (!latestLap[dn] || lap.lap_number > latestLap[dn].lap_number) {
        latestLap[dn] = lap;
      }
      if (lap.lap_duration && (!bestLap[dn] || lap.lap_duration < bestLap[dn].lap_duration)) {
        bestLap[dn] = lap;
      }
    }
    // Calculate personal best sectors
    for (const drv of drivers) {
      personalBests[drv.driver_number] = getPersonalBestSectors(laps, drv.driver_number);
    }
  }

  const latestStint = {};
  if (stints) {
    for (const s of stints) {
      const dn = s.driver_number;
      if (!latestStint[dn] || s.stint_number > latestStint[dn].stint_number) {
        latestStint[dn] = s;
      }
    }
  }

  const latestInterval = {};
  if (intervals) {
    for (const iv of intervals) {
      const dn = iv.driver_number;
      if (!latestInterval[dn] || new Date(iv.date) > new Date(latestInterval[dn].date)) {
        latestInterval[dn] = iv;
      }
    }
  }

  // Find overall best lap time
  let overallBestTime = Infinity;
  for (const dn of Object.keys(bestLap)) {
    if (bestLap[dn].lap_duration < overallBestTime) {
      overallBestTime = bestLap[dn].lap_duration;
    }
  }

  // Sort drivers by position
  const sortedDrivers = [...drivers].sort((a, b) => {
    const posA = latestPos[a.driver_number]?.position ?? 99;
    const posB = latestPos[b.driver_number]?.position ?? 99;
    return posA - posB;
  });

  // Remove duplicates
  const seenNumbers = new Set();
  const uniqueDrivers = sortedDrivers.filter(d => {
    if (seenNumbers.has(d.driver_number)) return false;
    seenNumbers.add(d.driver_number);
    return true;
  });

  function getSectorClass(value, driverNumber, sectorKey) {
    if (!value) return '';
    const pb = personalBests[driverNumber];
    const ob = overallBestSectors;
    const pbVal = pb ? pb[sectorKey] : null;
    const obVal = ob ? ob[sectorKey] : null;

    if (obVal && Math.abs(value - obVal) < 0.001) return 'time-purple';
    if (pbVal && Math.abs(value - pbVal) < 0.001) return 'time-green';
    return 'time-yellow';
  }

  function getLapTimeClass(driverNumber) {
    const bl = bestLap[driverNumber];
    if (!bl || !bl.lap_duration) return '';
    if (Math.abs(bl.lap_duration - overallBestTime) < 0.001) return 'time-purple';
    return 'time-green';
  }

  return (
    <div className="timing-table-wrapper">
      <table className="timing-table">
        <thead>
          <tr>
            <th>POS</th>
            <th>DRIVER</th>
            <th>TIRE</th>
            <th>LAP</th>
            <th>GAP</th>
            <th>INT</th>
            <th>LAST LAP</th>
            <th>BEST LAP</th>
            <th>S1</th>
            <th>S2</th>
            <th>S3</th>
          </tr>
        </thead>
        <tbody>
          {uniqueDrivers.map((driver, idx) => {
            const dn = driver.driver_number;
            const pos = latestPos[dn]?.position ?? idx + 1;
            const lap = latestLap[dn];
            const best = bestLap[dn];
            const stint = latestStint[dn];
            const iv = latestInterval[dn];
            const tireInfo = getTireInfo(stint?.compound);
            const teamColor = getTeamColor(driver.team_name, driver.team_colour);

            const posClass = pos === 1 ? 'pos-1' : pos === 2 ? 'pos-2' : pos === 3 ? 'pos-3' : '';

            return (
              <tr key={dn}>
                <td className={`pos-cell ${posClass}`}>{pos}</td>
                <td>
                  <div className="driver-cell">
                    <div className="team-color-bar" style={{ backgroundColor: teamColor }} />
                    <span className="driver-number">{dn}</span>
                    <span className="driver-name-short">
                      {driver.name_acronym || driver.last_name?.substring(0, 3).toUpperCase() || `DR${dn}`}
                    </span>
                  </div>
                </td>
                <td>
                  {stint?.compound ? (
                    <span className="tire-cell-group" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span className={`tire-badge ${tireInfo.className}`}>{tireInfo.label}</span>
                      <span className="stint-laps">
                        {stint.tyre_age_at_pit != null ? stint.tyre_age_at_pit : (stint.lap_end && stint.lap_start ? stint.lap_end - stint.lap_start + 1 : '')}
                      </span>
                    </span>
                  ) : '—'}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                  {lap?.lap_number ?? '—'}
                </td>
                <td className="gap-cell">
                  {iv?.gap_to_leader != null ? formatGap(iv.gap_to_leader) : (pos === 1 ? 'LEADER' : '—')}
                </td>
                <td className="gap-cell">
                  {iv?.interval != null ? formatInterval(iv.interval) : '—'}
                </td>
                <td className={`time-cell ${lap?.lap_duration ? (lap.is_pit_out_lap ? 'time-red' : 'time-white') : ''}`}>
                  {formatLapTime(lap?.lap_duration)}
                </td>
                <td className={`time-cell ${getLapTimeClass(dn)}`}>
                  {formatLapTime(best?.lap_duration)}
                </td>
                <td className={`time-cell ${getSectorClass(lap?.duration_sector_1, dn, 's1')}`}>
                  {lap?.duration_sector_1 ? lap.duration_sector_1.toFixed(3) : '—'}
                </td>
                <td className={`time-cell ${getSectorClass(lap?.duration_sector_2, dn, 's2')}`}>
                  {lap?.duration_sector_2 ? lap.duration_sector_2.toFixed(3) : '—'}
                </td>
                <td className={`time-cell ${getSectorClass(lap?.duration_sector_3, dn, 's3')}`}>
                  {lap?.duration_sector_3 ? lap.duration_sector_3.toFixed(3) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
