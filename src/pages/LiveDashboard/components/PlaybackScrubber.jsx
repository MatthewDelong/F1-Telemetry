import React, { useState, useEffect } from "react";

export default function PlaybackScrubber({
  sessionStart,
  sessionEnd,
  playbackTime,
  setPlaybackTime,
  isLive,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sliderValue, setSliderValue] = useState(100);

  const totalDuration = Math.max(0, (sessionEnd || 0) - (sessionStart || 0));

  // Reset scrubber to 100% (end of session / full data) when switching sessions
  useEffect(() => {
    setIsPlaying(false);
    setSliderValue(100);
    setPlaybackTime(null);
  }, [sessionStart, setPlaybackTime]);

  useEffect(() => {
    let interval;
    if (isPlaying && totalDuration > 0) {
      interval = setInterval(() => {
        setSliderValue((prev) => {
          const speedMultiplier = 30; // 30x realtime
          const newPerc =
            prev + (100 * (100 * speedMultiplier)) / totalDuration;

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

  // Sync slider to playback time (null when at 100% so full session data is shown without truncation)
  useEffect(() => {
    if (!sessionStart || !sessionEnd) return;
    if (sliderValue >= 100) {
      setPlaybackTime(null);
    } else {
      const newTime = sessionStart + totalDuration * (sliderValue / 100);
      setPlaybackTime(newTime);
    }
  }, [sliderValue, sessionStart, sessionEnd, totalDuration, setPlaybackTime]);

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
        {isPlaying ? "PAUSE" : "PLAY"}
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
