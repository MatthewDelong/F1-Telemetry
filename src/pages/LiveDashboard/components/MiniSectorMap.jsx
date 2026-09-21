import React, { useState, useEffect, useMemo } from 'react';
import { getTeamColor } from '../utils/f1Utils';
import { getLocation } from '../services/api';

const NUM_SECTORS = 30;

function computeSectors(locationData) {
  if (!locationData || locationData.length < 2) return null;

  // Sort by time
  const sorted = [...locationData].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Compute cumulative distance
  let totalDist = 0;
  const processed = sorted.map((pt, i) => {
    const t = new Date(pt.date).getTime();
    if (i === 0) {
      return { ...pt, t, dist: 0 };
    }
    const prev = sorted[i - 1];
    const dx = pt.x - prev.x;
    const dy = pt.y - prev.y;
    const d = Math.hypot(dx, dy);
    totalDist += d;
    return { ...pt, t, dist: totalDist };
  });

  const sectorSize = totalDist / NUM_SECTORS;
  const sectors = [];

  for (let i = 0; i < NUM_SECTORS; i++) {
    const startDist = i * sectorSize;
    const endDist = (i + 1) * sectorSize;

    // Find points in this bucket
    const bucket = processed.filter(p => p.dist >= startDist && p.dist < endDist);
    if (bucket.length > 0) {
      const timeTaken = bucket[bucket.length - 1].t - bucket[0].t;
      sectors.push({
        index: i,
        timeTaken,
        points: bucket
      });
    } else {
      sectors.push({ index: i, timeTaken: Infinity, points: [] });
    }
  }

  return { sectors, totalDist, processed };
}

export default function MiniSectorMap({ sessionKey, drivers, laps }) {
  const [driver1, setDriver1] = useState('');
  const [driver2, setDriver2] = useState('');
  
  const [d1Data, setD1Data] = useState(null);
  const [d2Data, setD2Data] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize selected drivers
  useEffect(() => {
    if (drivers && drivers.length >= 2 && !driver1 && !driver2) {
      setDriver1(drivers[0].driver_number);
      setDriver2(drivers[1].driver_number);
    }
  }, [drivers, driver1, driver2]);

  // Fetch best laps location data
  useEffect(() => {
    if (!sessionKey || !driver1 || !driver2 || !laps || laps.length === 0) return;

    let cancelled = false;

    const fetchDominance = async () => {
      setLoading(true);

      try {
        const getBestLapLoc = async (dNum) => {
          const dLaps = laps.filter(l => parseInt(l.driver_number) === parseInt(dNum) && l.lap_duration);
          if (dLaps.length === 0) return null;
          const best = dLaps.reduce((min, cur) => cur.lap_duration < min.lap_duration ? cur : min, dLaps[0]);

          const startTime = new Date(best.date_start);
          const endTime = new Date(startTime.getTime() + best.lap_duration * 1000);

          // Add 1s padding
          const startStr = new Date(startTime.getTime() - 1000).toISOString();
          const endStr = new Date(endTime.getTime() + 1000).toISOString();

          return await getLocation({
            session_key: sessionKey,
            driver_number: dNum,
            'date>=': startStr,
            'date<=': endStr
          });
        };

        const [loc1, loc2] = await Promise.all([
          getBestLapLoc(driver1),
          getBestLapLoc(driver2)
        ]);

        if (cancelled) return;

        if (loc1) setD1Data(computeSectors(loc1));
        else setD1Data(null);
        
        if (loc2) setD2Data(computeSectors(loc2));
        else setD2Data(null);

      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDominance();

    return () => { cancelled = true; };
  }, [sessionKey, driver1, driver2, laps]);

  // Compute map rendering
  const mapData = useMemo(() => {
    if (!d1Data || !d2Data) return null;

    const segments = [];
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    // Use driver 1's path for geometry
    d1Data.processed.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (-p.y < minY) minY = -p.y;
      if (-p.y > maxY) maxY = -p.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const paddingX = width * 0.1;
    const paddingY = height * 0.1;
    const viewBox = `${minX - paddingX} ${minY - paddingY} ${width + paddingX * 2} ${height + paddingY * 2}`;
    const strokeW = Math.max(50, width / 60);

    const drv1Info = drivers.find(d => parseInt(d.driver_number) === parseInt(driver1));
    const drv2Info = drivers.find(d => parseInt(d.driver_number) === parseInt(driver2));

    const color1 = drv1Info ? getTeamColor(drv1Info.team_name, drv1Info.team_colour) : '#fff';
    const color2 = drv2Info ? getTeamColor(drv2Info.team_name, drv2Info.team_colour) : '#fff';

    let d1Count = 0;
    let d2Count = 0;

    for (let i = 0; i < NUM_SECTORS; i++) {
      const s1 = d1Data.sectors[i];
      const s2 = d2Data.sectors[i];

      if (!s1 || !s2 || s1.points.length === 0 || s2.points.length === 0) continue;

      let dominantColor = '#555';
      if (s1.timeTaken < s2.timeTaken) {
        dominantColor = color1;
        d1Count++;
      } else {
        dominantColor = color2;
        d2Count++;
      }

      segments.push({
        points: s1.points,
        color: dominantColor
      });
    }

    return {
      viewBox,
      strokeW,
      segments,
      stats: { d1Count, d2Count, color1, color2, drv1Info, drv2Info }
    };
  }, [d1Data, d2Data, driver1, driver2, drivers]);

  return (
    <div className="panel mini-sector-panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="panel-title">🏁 Mini-Sector Dominance Map</div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <select 
            className="telemetry-select"
            value={driver1}
            onChange={(e) => setDriver1(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'white', border: '1px solid var(--border-secondary)' }}
          >
            {drivers?.map(d => (
              <option key={d.driver_number} value={d.driver_number}>{d.name_acronym || d.driver_number}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-tertiary)' }}>vs</span>
          <select 
            className="telemetry-select"
            value={driver2}
            onChange={(e) => setDriver2(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'white', border: '1px solid var(--border-secondary)' }}
          >
            {drivers?.map(d => (
              <option key={d.driver_number} value={d.driver_number}>{d.name_acronym || d.driver_number}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="panel-body" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#111' }}>
        {loading ? (
          <div style={{ padding: '3rem', color: 'var(--text-tertiary)' }}>Fetching high-res telemetry data...</div>
        ) : !mapData ? (
          <div style={{ padding: '3rem', color: 'var(--text-tertiary)' }}>Not enough lap data for comparison.</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2rem', marginBottom: '1rem' }}>
              <div style={{ color: mapData.stats.color1, fontWeight: 'bold' }}>
                {mapData.stats.drv1Info?.last_name}: {mapData.stats.d1Count} sectors
              </div>
              <div style={{ color: mapData.stats.color2, fontWeight: 'bold' }}>
                {mapData.stats.drv2Info?.last_name}: {mapData.stats.d2Count} sectors
              </div>
            </div>
            
            <svg 
              viewBox={mapData.viewBox} 
              style={{ width: '100%', maxHeight: '500px', display: 'block' }}
            >
              {mapData.segments.map((seg, i) => (
                <polyline
                  key={i}
                  points={seg.points.map(p => `${p.x},${-p.y}`).join(' ')}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={mapData.strokeW}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </svg>
          </>
        )}
      </div>
    </div>
  );
}
