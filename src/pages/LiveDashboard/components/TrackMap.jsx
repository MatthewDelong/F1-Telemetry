import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTeamColor } from '../utils/f1Utils';

export default function TrackMap({ sessionKey, drivers }) {
  const [trackPoints, setTrackPoints] = useState([]);
  const [carPositions, setCarPositions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reference timestamp to fetch only new data
  const lastUpdateRef = useRef(null);

  // 1. Fetch Track Outline (using one driver's full session location)
  useEffect(() => {
    if (!sessionKey || !drivers || drivers.length === 0) return;

    let cancelled = false;

    const fetchTrackOutline = async () => {
      setLoading(true);
      try {
        let validData = null;
        
        // Try up to 5 drivers to find one with a full location trace
        for (let i = 0; i < Math.min(drivers.length, 5); i++) {
          const driverForOutline = drivers[i].driver_number;
          const res = await fetch(`https://api.openf1.org/v1/location?session_key=${sessionKey}&driver_number=${driverForOutline}`);
          if (!res.ok) continue;
          
          const data = await res.json();
          if (data && data.length > 500) {
            validData = data;
            break;
          }
        }
        
        if (cancelled) return;

        if (validData) {
          // Save the final timestamp of the session so we can fetch historical cars
          const finalDate = validData[validData.length - 1].date;
          
          // To draw the track outline correctly, we need the full boundary of the car's movement
          // We downsample by 10 to keep the SVG light, but we MUST use the whole session so the viewBox
          // scales correctly to the full track size.
          const downsampled = validData.filter((_, idx) => idx % 10 === 0);
          
          setTrackPoints(downsampled);
          
          // Initialize lastUpdateRef for the polling interval
          // If the race was >1 day ago, set the ref to 10 seconds before the end of the session
          const sessionEnd = new Date(finalDate);
          if (Date.now() - sessionEnd.getTime() > 24 * 60 * 60 * 1000) {
             lastUpdateRef.current = new Date(sessionEnd.getTime() - 10000).toISOString();
          }

        } else {
          setError("No location data available to draw track map.");
        }
      } catch (err) {
        if (!cancelled) setError("Error loading track map.");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrackOutline();

    return () => {
      cancelled = true;
    };
  }, [sessionKey, drivers]);

  // 2. Poll for Live Car Positions
  useEffect(() => {
    if (!sessionKey || !drivers || drivers.length === 0 || trackPoints.length === 0) return;

    let cancelled = false;
    let intervalId;

    const fetchLivePositions = async () => {
      try {
        let url = `https://api.openf1.org/v1/location?session_key=${sessionKey}`;
        if (lastUpdateRef.current) {
          url += `&date>=${lastUpdateRef.current}`;
        } else {
          // If first fetch and no fallback, fetch last 15 seconds
          const tenSecAgo = new Date(Date.now() - 15000).toISOString();
          url += `&date>=${tenSecAgo}`;
        }

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        
        if (cancelled || data.length === 0) return;

        // Update lastUpdateRef to the latest date found (only if it's a live race)
        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const latestDateStr = sortedData[sortedData.length - 1].date;
        const latestTime = new Date(latestDateStr).getTime();
        
        // If the data is from right now (live race), advance the pointer so we only get new data next tick
        if (Date.now() - latestTime < 24 * 60 * 60 * 1000) {
            lastUpdateRef.current = latestDateStr;
        }

        // Group by driver and take the latest position for each
        const latestPositions = {};
        for (const pt of sortedData) {
          latestPositions[pt.driver_number] = pt;
        }

        setCarPositions(prev => ({
          ...prev,
          ...latestPositions
        }));

      } catch (err) {
        console.error("Error fetching live locations:", err);
      }
    };

    fetchLivePositions();
    intervalId = setInterval(fetchLivePositions, 2000); // 2 second refresh for smooth map

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionKey, drivers, trackPoints]);

  // Calculate SVG ViewBox based on the track points
  const viewBox = useMemo(() => {
    if (trackPoints.length === 0) return "0 0 1000 1000";

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    trackPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      // Note: we negate Y because SVG Y goes down, but map Y goes up
      if (-p.y < minY) minY = -p.y;
      if (-p.y > maxY) maxY = -p.y;
    });

    // Add 10% padding
    const width = maxX - minX;
    const height = maxY - minY;
    const paddingX = width * 0.1;
    const paddingY = height * 0.1;

    return `${minX - paddingX} ${minY - paddingY} ${width + paddingX * 2} ${height + paddingY * 2}`;
  }, [trackPoints]);

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">🗺️ Live Track Radar</div>
        </div>
        <div className="panel-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Generating track outline...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">🗺️ Live Track Radar</div>
        </div>
        <div className="panel-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--status-red)' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="panel-title">🗺️ Live Track Radar</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          Cars update every 2 seconds
        </div>
      </div>
      <div className="panel-body" style={{ padding: '0', display: 'flex', justifyContent: 'center', backgroundColor: '#111' }}>
        <svg 
          viewBox={viewBox} 
          style={{ 
            width: '100%', 
            maxHeight: '600px', 
            display: 'block' 
          }}
        >
          {/* Draw Track Outline */}
          <polyline
            points={trackPoints.map(p => `${p.x},${-p.y}`).join(' ')}
            fill="none"
            stroke="var(--border-secondary)"
            strokeWidth={Math.max(100, (viewBox.split(' ')[2] / 150))} // Dynamic stroke width based on map scale
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <polyline
            points={trackPoints.map(p => `${p.x},${-p.y}`).join(' ')}
            fill="none"
            stroke="var(--bg-primary)"
            strokeWidth={Math.max(50, (viewBox.split(' ')[2] / 300))} // Inner track
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Draw Cars */}
          {Object.entries(carPositions).map(([driverNumber, pos]) => {
            const drv = drivers.find(d => parseInt(d.driver_number) === parseInt(driverNumber));
            if (!drv) return null;
            
            const color = getTeamColor(drv.team_name, drv.team_colour);
            const dotSize = Math.max(150, (viewBox.split(' ')[2] / 60)); // Scale dot to map size
            
            return (
              <g key={driverNumber} transform={`translate(${pos.x}, ${-pos.y})`}>
                <circle
                  r={dotSize}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={dotSize * 0.15}
                />
                <text
                  y={dotSize * 0.35}
                  fontSize={dotSize * 1.1}
                  fontWeight="bold"
                  fill="#fff"
                  textAnchor="middle"
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {drv.name_acronym || driverNumber}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
