import React, { useState, useEffect } from 'react';
import { getTeamColor } from '../utils/f1Utils';

export default function Standings({ year }) {
  const [driverStandings, setDriverStandings] = useState([]);
  const [constructorStandings, setConstructorStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchStandings = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryYear = year || 'current';
        
        const [driversRes, constructorsRes] = await Promise.all([
          fetch(`https://api.jolpi.ca/ergast/f1/${queryYear}/driverStandings.json`),
          fetch(`https://api.jolpi.ca/ergast/f1/${queryYear}/constructorStandings.json`)
        ]);

        if (!driversRes.ok || !constructorsRes.ok) {
          throw new Error('Failed to fetch standings');
        }

        const driversData = await driversRes.json();
        const constructorsData = await constructorsRes.json();

        if (!cancelled) {
          setDriverStandings(driversData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings || []);
          setConstructorStandings(constructorsData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Standings fetch error:", err);
          setError("Failed to load championship standings from Jolpi API.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStandings();
    
    return () => {
      cancelled = true;
    };
  }, [year]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        Loading standings...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--status-red)' }}>
        {error}
      </div>
    );
  }

  return (
    <div className="dashboard-grid fade-in">
      
      {/* DRIVERS STANDINGS */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">🏎️ Drivers Championship</div>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {driverStandings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No driver standings available.</div>
          ) : (
            <table className="timing-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>POS</th>
                  <th>DRIVER</th>
                  <th style={{ textAlign: 'right' }}>PTS</th>
                  <th style={{ textAlign: 'center' }}>WINS</th>
                </tr>
              </thead>
              <tbody>
                {driverStandings.map((ds, idx) => {
                  const driverName = `${ds.Driver.givenName} ${ds.Driver.familyName}`;
                  const teamId = ds.Constructors && ds.Constructors.length > 0 ? ds.Constructors[0].constructorId : '';
                  const teamName = ds.Constructors && ds.Constructors.length > 0 ? ds.Constructors[0].name : '';
                  // Fallback for team colors from Jolpi's constructorId
                  const color = getTeamColor(teamId || teamName, null);

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{ds.position}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '4px', height: '16px', backgroundColor: color, borderRadius: '2px' }}></div>
                          <span style={{ fontWeight: 600 }}>{driverName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{teamName}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--text-primary)' }}>{ds.points}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{ds.wins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CONSTRUCTORS STANDINGS */}
      <div className="panel">
        <div className="panel-header">
          <div className="panel-title">🏭 Constructors Championship</div>
        </div>
        <div className="panel-body" style={{ padding: 0 }}>
          {constructorStandings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No constructor standings available.</div>
          ) : (
            <table className="timing-table">
              <thead>
                <tr>
                  <th style={{ width: '40px', textAlign: 'center' }}>POS</th>
                  <th>TEAM</th>
                  <th style={{ textAlign: 'right' }}>PTS</th>
                  <th style={{ textAlign: 'center' }}>WINS</th>
                </tr>
              </thead>
              <tbody>
                {constructorStandings.map((cs, idx) => {
                  const teamId = cs.Constructor.constructorId;
                  const teamName = cs.Constructor.name;
                  const color = getTeamColor(teamId || teamName, null);

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-secondary)' }}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{cs.position}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '4px', height: '16px', backgroundColor: color, borderRadius: '2px' }}></div>
                          <span style={{ fontWeight: 600, fontSize: '1rem' }}>{teamName}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '1rem' }}>{cs.points}</td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{cs.wins}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
