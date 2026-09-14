import React, { useState, useEffect, useRef } from 'react';
import { formatTime, getTeamColor } from '../utils/f1Utils';

export default function TeamRadio({ radios, drivers }) {
  const [errorMsg, setErrorMsg] = useState(null);

  const handlePlay = (url) => {
    setErrorMsg(null);
    if (!url) return;
    
    // Instead of using the HTML5 Audio API which is blocked by Chrome/Edge Strict Tracking Protection
    // for cross-site audio, we open a small, unobtrusive popup window.
    // Because it's a top-level navigation, the browser allows the audio to load and play perfectly.
    const popup = window.open(
      url, 
      'F1TeamRadio', 
      'width=350,height=150,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!popup) {
      setErrorMsg("Popup blocked! Please allow popups for this site to play Team Radio.");
    }
  };

  if (!radios || radios.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
        No team radio messages available.
      </div>
    );
  }

  // Reverse to show newest first
  const latestRadios = [...radios].reverse().slice(0, 50);

  const getDriver = (num) => drivers?.find((d) => d.driver_number === num);

  return (
    <div className="panel" style={{ maxHeight: '600px', overflowY: 'auto' }}>
      <div className="panel-header" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-elevated)' }}>
        <div className="panel-title">📻 Team Radio Feed</div>
      </div>
      <div className="panel-body" style={{ padding: 0 }}>
        {errorMsg && (
          <div style={{ padding: '12px 16px', backgroundColor: 'var(--status-red)', color: 'white', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}
        {latestRadios.map((radio, idx) => {
          const drv = getDriver(radio.driver_number);
          const acronym = drv ? drv.name_acronym : `CAR ${radio.driver_number}`;
          const color = drv ? getTeamColor(drv.team_name, drv.team_colour) : '#666';

          return (
            <div key={idx} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '12px 16px', 
              borderBottom: '1px solid var(--border-secondary)',
              backgroundColor: 'transparent',
              transition: 'background-color 0.2s'
            }}>
              <div style={{ width: '60px', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                {formatTime(radio.date)}
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', width: '80px', gap: '8px' }}>
                <div style={{ width: '4px', height: '16px', backgroundColor: color, borderRadius: '2px' }}></div>
                <span style={{ fontWeight: 'bold' }}>{acronym}</span>
              </div>

              <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handlePlay(radio.recording_url?.trim())}
                  style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', minWidth: '80px', justifyContent: 'center' }}
                >
                  <span>▶️</span> Play
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
