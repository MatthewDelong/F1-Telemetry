import React, { useState, useEffect } from 'react';
import { getTeamColor } from '../utils/f1Utils';

export default function TelemetryDashboard({ sessionKey, drivers, year = 2026 }) {
  const [selectedDriver, setSelectedDriver] = useState('');
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize with first driver if none selected
  useEffect(() => {
    if (drivers && drivers.length > 0 && !selectedDriver) {
      setSelectedDriver(drivers[0].driver_number);
    }
  }, [drivers, selectedDriver]);

  // Fetch telemetry on interval
  useEffect(() => {
    if (!sessionKey || !selectedDriver) return;
    
    let cancelled = false;
    let intervalId;

    const fetchTelemetry = async () => {
      setLoading(true);
      try {
        // Fetch only the latest car data (ideally we'd filter by time, but for now fetch and take last)
        // To be safe on bandwidth, we'll just do it every 10 seconds
        const res = await fetch(`https://api.openf1.org/v1/car_data?session_key=${sessionKey}&driver_number=${selectedDriver}`);
        if (!res.ok) throw new Error('Network error');
        const data = await res.json();
        
        if (!cancelled && data && data.length > 0) {
          setTelemetry(data[data.length - 1]);
        }
      } catch (err) {
        console.error("Telemetry fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTelemetry();
    intervalId = setInterval(fetchTelemetry, 10000); // 10s refresh

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionKey, selectedDriver]);

  const drv = drivers?.find(d => parseInt(d.driver_number) === parseInt(selectedDriver));
  const color = drv ? getTeamColor(drv.team_name, drv.team_colour) : '#666';
  
  // 2026 active aero changes: DRS is replaced by Manual Override / ERS
  const drsLabel = parseInt(year) >= 2026 ? "ERS" : "DRS";

  return (
    <div className="panel">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="panel-title">🏎️ Live Telemetry Dashboard</div>
        <select 
          className="telemetry-select"
          value={selectedDriver} 
          onChange={(e) => setSelectedDriver(e.target.value)}
          style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'white', border: '1px solid var(--border-secondary)' }}
        >
          <option value="">Select Driver...</option>
          {drivers?.map(d => (
            <option key={d.driver_number} value={d.driver_number}>
              {d.driver_number} - {d.full_name}
            </option>
          ))}
        </select>
      </div>
      <div className="panel-body">
        {loading && !telemetry ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>Connecting to car telemetry...</div>
        ) : !telemetry ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>No telemetry available.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            
            {/* Speed & Gear */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', textAlign: 'center', borderTop: `4px solid ${color}` }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Speed</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{telemetry.speed} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>km/h</span></div>
            </div>

            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', textAlign: 'center', borderTop: `4px solid ${color}` }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Gear</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{telemetry.n_gear === 0 ? 'N' : telemetry.n_gear}</div>
            </div>

            {/* Throttle */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Throttle</span>
                <span style={{ fontWeight: 'bold' }}>{telemetry.throttle}%</span>
              </div>
              <div style={{ height: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#00D2BE', width: `${telemetry.throttle}%`, transition: 'width 0.3s' }}></div>
              </div>
            </div>

            {/* Brake */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Brake</span>
                <span style={{ fontWeight: 'bold' }}>{telemetry.brake}%</span>
              </div>
              <div style={{ height: '12px', background: 'var(--bg-elevated)', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#FF2800', width: `${telemetry.brake}%`, transition: 'width 0.3s' }}></div>
              </div>
            </div>

            {/* RPM */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>RPM</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{telemetry.rpm}</div>
            </div>

            {/* DRS/ERS */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>{drsLabel}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: telemetry.drs === 8 || telemetry.drs === 12 ? '#00D2BE' : 'var(--text-tertiary)' }}>
                {telemetry.drs === 8 || telemetry.drs === 12 ? (drsLabel === 'ERS' ? 'DEPLOYING' : 'OPEN') : (drsLabel === 'ERS' ? 'CHARGING' : 'CLOSED')}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
