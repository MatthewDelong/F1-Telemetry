import React, { useEffect, useRef, useState } from 'react';
import { AiOutlineFullscreen, AiOutlineFullscreenExit } from 'react-icons/ai';
import { mountF1Globe } from './F1Globe/main.js';
import './F1Globe/style.css';

const F1GlobeWidget = ({ races, year = 2026 }) => {
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const cleanup = mountF1Globe(containerRef.current, races);
    
    // Add a small delay for initial resize to ensure container is fully laid out
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('f1-globe-fullscreen');
    } else {
      document.body.classList.remove('f1-globe-fullscreen');
    }

    // Dispatch resize event when toggling fullscreen so ThreeJS updates canvas size
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const containerStyle = isFullscreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9999,
    margin: 0,
    padding: 0
  } : {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '12px',
    border: '2px solid #e10600',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    marginTop: '8px',
    marginBottom: '8px'
  };

  return (
    <div style={containerStyle} className="f1-globe-wrapper">
      <button 
        onClick={toggleFullscreen}
        style={{
          position: 'absolute', top: '15px', right: '15px', zIndex: 100,
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'white', padding: '8px', borderRadius: '6px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <AiOutlineFullscreenExit size={24} /> : <AiOutlineFullscreen size={24} />}
      </button>

      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        <canvas id="globe-canvas" style={{ display: 'block', width: '100%', height: '100%', outline: 'none', pointerEvents: isFullscreen ? 'auto' : 'none' }}></canvas>

        {/* Tooltip SVG Pointer */}
        <svg id="tooltip-svg" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 90}}>
          <line id="tooltip-line" x1="0" y1="0" x2="0" y2="0" stroke="var(--red, #e10600)" strokeWidth="1.5" strokeOpacity="0.8" className="hidden" />
          <circle id="tooltip-dot" cx="0" cy="0" r="4" fill="var(--red, #e10600)" className="hidden" />
        </svg>

        {/* Tooltip */}
        <div id="tooltip" className="tooltip hidden">
          <div className="tooltip-round-row">
            <img className="tooltip-flag" alt="" />
            <div className="tooltip-round"></div>
          </div>
          <div className="tooltip-name"></div>
          <div className="tooltip-circuit"></div>
          <div className="tooltip-date"></div>
        </div>

        {/* Sidebar toggle (mobile) */}
        <button id="sidebar-toggle" className="sidebar-toggle">
          <span>&#9776;</span> Calendar
        </button>

        {/* Sidebar */}
        <aside id="sidebar" className="sidebar">
          <div className="sidebar-header">
            <h1 style={{margin:0, padding:0}}>F1 <span className="accent">{year}</span></h1>
            <p className="sidebar-subtitle">Race Calendar</p>
          </div>
          <ul id="race-list" className="race-list"></ul>
        </aside>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 70,
          background: 'rgba(8, 8, 16, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'none',
          color: '#e0e0e8',
          fontSize: '11px',
          fontFamily: '"Inter", sans-serif',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#0088ff', boxShadow: '0 0 10px #0088ff', border: '1px solid #33aaff' }}></div>
            Past Races
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#e10600', boxShadow: '0 0 10px #e10600', border: '1px solid #ff3030' }}></div>
            Upcoming Races
          </div>
        </div>

      </div>
    </div>
  );
};

export default F1GlobeWidget;
