import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getTeamColor } from '../utils/f1Utils';

export default function TrackMap({ sessionKey, drivers, isLive = true, playbackTime }) {
  const [trackPoints, setTrackPoints] = useState([]);
  const [carPositions, setCarPositions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const lastUpdateRef = useRef(null);

  // 1. Fetch Track Outline
  useEffect(() => {
    if (!sessionKey || !drivers || drivers.length === 0) return;

    let cancelled = false;

    const fetchTrackOutline = async () => {
      setLoading(true);
      try {
        let validData = null;
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
          const downsampled = validData.filter((_, idx) => idx % 10 === 0);
          setTrackPoints(downsampled);
          
          if (isLive) {
            const finalDate = validData[validData.length - 1].date;
            const sessionEnd = new Date(finalDate);
            if (Date.now() - sessionEnd.getTime() > 24 * 60 * 60 * 1000) {
               lastUpdateRef.current = new Date(sessionEnd.getTime() - 10000).toISOString();
            }
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
    return () => { cancelled = true; };
  }, [sessionKey, drivers]);

  const playbackTimeRef = useRef(playbackTime);
  
  useEffect(() => {
    playbackTimeRef.current = playbackTime;
  }, [playbackTime]);

  // 2. Poll / Fetch Car Positions
  useEffect(() => {
    if (!sessionKey || !drivers || drivers.length === 0 || trackPoints.length === 0) return;

    let cancelled = false;
    let intervalId;

    const fetchPositions = async () => {
      try {
        let url = `https://api.openf1.org/v1/location?session_key=${sessionKey}`;
        
        if (isLive) {
          if (lastUpdateRef.current) {
            url += `&date>=${lastUpdateRef.current}`;
          } else {
            const tenSecAgo = new Date(Date.now() - 15000).toISOString();
            url += `&date>=${tenSecAgo}`;
          }
        } else {
          const pTime = playbackTimeRef.current;
          if (!pTime) return;
          const targetDate = new Date(pTime).toISOString();
          const tenSecBefore = new Date(pTime - 10000).toISOString();
          url += `&date<=${targetDate}&date>=${tenSecBefore}`;
        }

        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        
        if (cancelled || data.length === 0) {
           return;
        }

        const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (isLive) {
          const latestDateStr = sortedData[sortedData.length - 1].date;
          const latestTime = new Date(latestDateStr).getTime();
          if (Date.now() - latestTime < 24 * 60 * 60 * 1000) {
              lastUpdateRef.current = latestDateStr;
          }
        }

        const latestPositions = {};
        for (const pt of sortedData) {
          latestPositions[pt.driver_number] = pt;
        }

        if (isLive) {
            setCarPositions(prev => ({ ...prev, ...latestPositions }));
        } else {
            setCarPositions(latestPositions);
        }

      } catch (err) {
        console.error("Error fetching locations:", err);
      }
    };

    fetchPositions();
    // Poll continuously (2s for live, 1s for archive playback)
    intervalId = setInterval(fetchPositions, isLive ? 2000 : 1000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [sessionKey, drivers, trackPoints, isLive]);

  const viewBox = useMemo(() => {
    if (trackPoints.length === 0) return "0 0 1000 1000";

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    trackPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (-p.y < minY) minY = -p.y;
      if (-p.y > maxY) maxY = -p.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const paddingX = width * 0.15;
    const paddingY = height * 0.15;

    return `${minX - paddingX} ${minY - paddingY} ${width + paddingX * 2} ${height + paddingY * 2}`;
  }, [trackPoints]);

  if (loading) {
    return (
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">🗺️ Live Track Radar</div>
        </div>
        <div className="panel-body" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
          Generating high-res track outline...
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

  const mapScale = parseFloat(viewBox.split(' ')[2]);
  const strokeOuter = Math.max(120, mapScale / 120);
  const strokeInner = Math.max(60, mapScale / 240);
  const strokeCenter = Math.max(10, mapScale / 1000);
  const dotSize = Math.max(150, mapScale / 50);

  return (
    <div className="panel" style={{ overflow: 'hidden' }}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', zIndex: 10 }}>
        <div className="panel-title">🗺️ Track Radar {isLive ? '(Live)' : '(Archive)'}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
          {isLive ? 'Live tracking (2s update)' : 'Time Machine Active'}
        </div>
      </div>
      
      <div className="panel-body" style={{ 
        padding: '0', 
        display: 'flex', 
        justifyContent: 'center', 
        backgroundColor: '#0a0a0c',
        backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a24 0%, #0a0a0c 100%)',
        position: 'relative'
      }}>
        
        {/* Subtle grid background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
          pointerEvents: 'none'
        }} />

        <svg 
          viewBox={viewBox} 
          style={{ 
            width: '100%', 
            height: '100%',
            minHeight: '600px',
            maxHeight: '800px',
            display: 'block',
            filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))'
          }}
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="15" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            <filter id="car-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Track Outer Border (Glow + Width) */}
          <polyline
            points={trackPoints.map(p => `${p.x},${-p.y}`).join(' ')}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeOuter}
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#glow)"
          />

          {/* Track Asphalt Main */}
          <polyline
            points={trackPoints.map(p => `${p.x},${-p.y}`).join(' ')}
            fill="none"
            stroke="#16161d"
            strokeWidth={strokeInner}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Track Center Line (Racing Line Hint) */}
          <polyline
            points={trackPoints.map(p => `${p.x},${-p.y}`).join(' ')}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth={strokeCenter}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={`${strokeCenter * 4} ${strokeCenter * 6}`}
          />

          {/* Draw Cars */}
          {Object.entries(carPositions).map(([driverNumber, pos]) => {
            const drv = drivers.find(d => parseInt(d.driver_number) === parseInt(driverNumber));
            if (!drv) return null;
            
            const color = getTeamColor(drv.team_name, drv.team_colour);
            
            return (
              <g key={driverNumber} transform={`translate(${pos.x}, ${-pos.y})`} style={{ transition: 'transform 0.5s ease-out' }}>
                {/* Outer Glow */}
                <circle
                  r={dotSize * 1.3}
                  fill={color}
                  opacity="0.3"
                  filter="url(#car-glow)"
                />
                {/* Main dot */}
                <circle
                  r={dotSize}
                  fill="#111"
                  stroke={color}
                  strokeWidth={dotSize * 0.25}
                />
                {/* Inner highlight */}
                <circle
                  r={dotSize * 0.75}
                  fill={color}
                  opacity="0.8"
                />
                <text
                  y={dotSize * 0.35}
                  fontSize={dotSize * 1.1}
                  fontWeight="800"
                  fontFamily="var(--font-display, sans-serif)"
                  fill="#fff"
                  textAnchor="middle"
                  style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
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
