import React, { useState, useEffect } from 'react';

export default function PlaybackScrubber({ sessionStart, sessionEnd, playbackTime, setPlaybackTime, isLive }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(100);

  const totalDuration = sessionEnd - sessionStart;

  // Initialize playbackTime to end of session
  useEffect(() => {
    if (playbackTime === null && sessionEnd) {
      setPlaybackTime(sessionEnd);
      setSliderValue(100);
    }
  }, [sessionEnd, playbackTime, setPlaybackTime]);


  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setSliderValue(prev => {
          const next = prev + (100 / (totalDuration / 1000)); // advance by 1 simulated second every 100ms
          // Wait, if totalDuration is 2 hours (7200s). 
          // 100% / 7200 = 0.0138% per second.
          // To playback faster (e.g. 10x speed), we advance by 10 simulated seconds every 100ms
          const speedMultiplier = 30; // 30x realtime
          const newPerc = prev + ((100 * (100 * speedMultiplier)) / totalDuration);
          
          if (newPerc >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return newPerc;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Sync slider to playback time
  useEffect(() => {
    const newTime = sessionStart + (totalDuration * (sliderValue / 100));
    setPlaybackTime(newTime);
  }, [sliderValue, sessionStart, totalDuration, setPlaybackTime]);

  if (isLive || !sessionStart || !sessionEnd) return null;

  return (
    <div className="bg-neutral-900 border-y border-white/10 px-16 py-8 flex items-center gap-12 font-display">
      <div className="text-f1-red font-bold uppercase tracking-widest text-sm flex items-center gap-4">
        <span>⏱️ Time Machine</span>
      </div>
      
      <button 
        className="bg-white/10 hover:bg-white/20 text-white px-12 py-4 rounded text-xs tracking-widest uppercase transition-colors"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? 'PAUSE' : 'PLAY'}
      </button>

      <span className="text-neutral-400 text-xs w-24 text-right">
        {new Date(sessionStart).toLocaleTimeString()}
      </span>

      <input
        type="range"
        min="0"
        max="100"
        step="0.01"
        value={sliderValue}
        onChange={(e) => {
          setIsPlaying(false);
          setSliderValue(parseFloat(e.target.value));
        }}
        className="flex-1 accent-f1-red"
      />

      <span className="text-white text-xs w-24">
        {new Date(playbackTime || sessionEnd).toLocaleTimeString()}
      </span>
      <span className="text-neutral-400 text-xs w-24">
        {new Date(sessionEnd).toLocaleTimeString()}
      </span>
    </div>
  );
}
