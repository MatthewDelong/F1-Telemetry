import React from 'react';
import { formatTime, getTeamColor } from '../utils/f1Utils.js';

export default function RaceControlFeed({ messages, drivers }) {
  if (!messages || messages.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📡</div>
        <div className="empty-title">No Race Control Messages</div>
        <div className="empty-desc">Race control messages will appear here during the session.</div>
      </div>
    );
  }

  const trackLimitsCounts = {};
  const activePenalties = [];
  const feedMessages = [];

  // OpenF1 returns messages oldest-first chronologically. We process them in this order so "served" cancels earlier penalties.
  const chronological = messages || [];

  chronological.forEach(msg => {
    const text = (msg.message || '').toUpperCase();
    
    // Extract driver: CAR 14 (ALO) or just CAR 14
    let acr = '';
    let num = '';
    
    const acrMatch = text.match(/CAR \d+\s*\(([A-Z]{3})\)/);
    if (acrMatch) acr = acrMatch[1];
    
    const numMatch = text.match(/CAR (\d+)/);
    if (numMatch) num = numMatch[1];

    const key = `${acr}_${num}`;
    const hasDriver = acr || num;

    let isPenaltyOrLimit = false;

    if (text.includes('TRACK LIMIT')) {
      if (hasDriver) {
        trackLimitsCounts[key] = (trackLimitsCounts[key] || 0) + 1;
      }
      isPenaltyOrLimit = true;
    } else if (text.includes('PENALTY') || text.includes('DRIVE THROUGH') || text.includes('STOP AND GO')) {
      if (text.includes('SERVED')) {
        // Mark as served instead of removing
        if (hasDriver) {
          // find last penalty for this driver and mark it
          for (let i = activePenalties.length - 1; i >= 0; i--) {
            if ((acr && activePenalties[i].acr === acr) || (num && activePenalties[i].num === num)) {
              if (!activePenalties[i].served) {
                activePenalties[i].served = true;
                break;
              }
            }
          }
        }
      } else {
        // Add penalty
        activePenalties.push({
          acr,
          num,
          message: msg.message,
          time: msg.date,
          served: false
        });
      }
      isPenaltyOrLimit = true;
    }

    if (!isPenaltyOrLimit) {
      feedMessages.push(msg);
    }
  });

  const getDriverByAcronymOrNum = (acr, num) => {
    if (!drivers) return null;
    let drv = null;
    if (acr) drv = drivers.find(d => d.name_acronym === acr);
    if (!drv && num) drv = drivers.find(d => parseInt(d.driver_number, 10) === parseInt(num, 10));
    return drv;
  };

  // Convert track limits to array and sort by count descending
  const trackLimitsArray = Object.entries(trackLimitsCounts)
    .map(([key, count]) => {
      const [acr, numStr] = key.split('_');
      const drv = getDriverByAcronymOrNum(acr, numStr);
      const acronym = drv ? drv.name_acronym : (acr || `C${numStr}`);
      return {
        acronym,
        count,
        color: drv ? getTeamColor(drv.team_name, drv.team_colour) : '#666'
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto' }}>
      
      {/* PENALTIES PANEL */}
      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
        <div style={{ backgroundColor: '#cc0000', color: 'white', textAlign: 'center', padding: '8px', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.9rem' }}>
          PENALTIES
        </div>
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {activePenalties.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', fontSize: '0.85rem' }}>No penalties recorded</div>
          ) : activePenalties.reverse().map((pen, idx) => {
            const drv = getDriverByAcronymOrNum(pen.acr, pen.num);
            const color = drv ? getTeamColor(drv.team_name, drv.team_colour) : '#666';
            const displayAcr = drv ? drv.name_acronym : (pen.acr || pen.num);
            
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: pen.served ? 0.6 : 1 }}>
                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                {displayAcr && (
                  <div style={{ backgroundColor: color, color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem', minWidth: '40px', textAlign: 'center' }}>
                    {displayAcr}
                  </div>
                )}
                <div style={{ color: pen.served ? '#aaa' : '#ff6666', fontSize: '0.85rem', lineHeight: '1.3', textDecoration: pen.served ? 'line-through' : 'none' }}>
                  {pen.message} <span style={{ color: '#888', textDecoration: 'none', display: 'inline-block' }}>({formatTime(pen.time)})</span>
                  {pen.served && <span style={{ marginLeft: '8px', color: '#22c55e', fontWeight: 'bold', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-block' }}>SERVED</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TRACK LIMITS PANEL */}
      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
        <div style={{ backgroundColor: '#e65c00', color: 'white', textAlign: 'center', padding: '8px', fontWeight: 'bold', letterSpacing: '2px', fontSize: '0.9rem' }}>
          TRACK LIMITS
        </div>
        <div style={{ backgroundColor: '#1a1a1a', padding: '12px' }}>
          {trackLimitsArray.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', fontSize: '0.85rem' }}>No track limits recorded</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
              {trackLimitsArray.map(tl => (
                <div key={tl.acronym} style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', height: '28px', backgroundColor: tl.color }}>
                  <div style={{ flex: 1, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {tl.acronym}
                  </div>
                  <div style={{ padding: '0 10px', backgroundColor: 'rgba(0,0,0,0.25)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {tl.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* OTHER MESSAGES */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid #333' }}>
          Other Messages
        </div>
        <div className="race-control-feed" style={{ maxHeight: '200px' }}>
          {feedMessages.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>No recent messages.</div>
          ) : [...feedMessages].reverse().slice(0, 30).map((msg, idx) => {
            const flag = msg.flag || '';
            const cat = msg.category || '';
            let flagClass = '';
            if (flag === 'GREEN' || (cat === 'Flag' && msg.message?.includes('GREEN'))) flagClass = 'rc-flag-green';
            else if (flag === 'YELLOW' || flag === 'DOUBLE YELLOW' || cat === 'SafetyCar' || msg.message?.includes('SAFETY CAR')) flagClass = 'rc-flag-yellow';
            else if (flag === 'CHEQUERED' || msg.message?.includes('CHEQUERED')) flagClass = 'rc-flag-chequered';
            else if (flag === 'RED' || msg.message?.includes('RED FLAG')) flagClass = 'rc-flag-red';
            else if (flag === 'BLACK AND WHITE' || msg.message?.includes('BLACK AND WHITE')) flagClass = 'rc-flag-black-white';
            
            return (
              <div className="race-control-msg fade-in" key={idx}>
                <span className="rc-time">{formatTime(msg.date)}</span>
                {flagClass && <div className={`rc-flag ${flagClass}`} />}
                <span className="rc-message">
                  {msg.message || `${msg.category}: ${msg.flag || ''}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
