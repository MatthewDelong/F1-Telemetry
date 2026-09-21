import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useLiveTelemetry } from "./hooks/useLiveTelemetry.js";
import { usePreferences } from "../../contexts/PreferencesContext.jsx";
import { Button } from "../../components/Button.jsx";
import {
  getSessions,
  getDrivers,
  getLaps,
  getStints,
  getPositions,
  getIntervals,
  getWeather,
  getRaceControl,
  getPitStops,
  getTeamRadio,
} from "./services/api.js";
import {
  getAvailableYears,
  getSessionTypeName,
  formatDate,
  formatTime,
  getOverallBestSectors,
  formatLapTime,
} from "./utils/f1Utils.js";

import TimingTable from "./components/TimingTable.jsx";
import WeatherWidget from "./components/WeatherWidget.jsx";
import GapVisualization from "./components/GapVisualization.jsx";
import RaceControlFeed from "./components/RaceControlFeed.jsx";
import TireStrategy from "./components/TireStrategy.jsx";
import LapTimeChart from "./components/LapTimeChart.jsx";
import Standings from "./components/Standings.jsx";
import TeamRadio from "./components/TeamRadio.jsx";
import TelemetryDashboard from "./components/TelemetryDashboard.jsx";
import TrackMap from "./components/TrackMap.jsx";
import SpeedComparison from "./components/SpeedComparison.jsx";
import PositionChart from "./components/PositionChart.jsx";
import PitStopTable from "./components/PitStopTable.jsx";
import MiniSectorMap from "./components/MiniSectorMap.jsx";
import ReloadPrompt from "./components/ReloadPrompt.jsx";
import PlaybackScrubber from "./components/PlaybackScrubber.jsx";
const REFRESH_INTERVAL = 10000; // 10 seconds
const years = getAvailableYears();

import "./LiveDashboard.css";

export default function LiveDashboard() {
  // ===== State =====
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState("timing");

  const { useCelsius, useKmh, toggleCelsius, toggleKmh } = usePreferences();

  // Time Machine State
  const [playbackTime, setPlaybackTime] = useState(null);

  const telemetry = useLiveTelemetry(selectedYear);
  const {
    sessions,
    selectedSessionKey,
    selectedSession,
    loadingSessions,
    isLive,
    connectionStatus,
    refreshInterval,
    autoRefresh,
    setAutoRefresh,
    drivers,
    laps,
    stints,
    positions,
    intervals,
    weather,
    raceControl,
    pitStops,
    teamRadio,
    dataLoading,
    dataError,
    lastUpdated,
    countdown,
    loadData,
    handleSessionChange
  } = telemetry;

  const handleYearChange = (e) => {
    const yr = parseInt(e.target.value, 10);
    setSelectedYear(yr);
  };

  // Get overall best sectors for highlights
  const overallBestSectors = useMemo(() => {
    return getOverallBestSectors(laps);
  }, [laps]);

  const fastestLap = useMemo(() => {
    if (!laps || laps.length === 0) return null;
    const validLaps = laps.filter((l) => l.lap_duration != null);
    if (validLaps.length === 0) return null;
    return validLaps.reduce((min, lap) => lap.lap_duration < min.lap_duration ? lap : min, validLaps[0]);
  }, [laps]);

  const fastestPitStop = useMemo(() => {
    if (!pitStops || pitStops.length === 0) return null;
    const validPits = pitStops.filter((p) => p.pit_duration != null);
    if (validPits.length === 0) return null;
    return validPits.reduce((min, pit) => pit.pit_duration < min.pit_duration ? pit : min, validPits[0]);
  }, [pitStops]);

  // Group sessions by meeting
  const groupedSessions = useMemo(() => {
    const groups = {};
    for (const s of sessions) {
      const meetingKey = s.meeting_key || s.location || "Unknown";
      if (!groups[meetingKey]) {
        groups[meetingKey] = {
          meetingName: s.circuit_short_name || s.location || "Unknown",
          country: s.country_name || "",
          sessions: [],
        };
      }
      groups[meetingKey].sessions.push(s);
    }
    return groups;
  }, [sessions]);

  // Time Machine Data Filtering
  const sessionStart = selectedSession?.date_start ? new Date(selectedSession.date_start).getTime() : null;
  const sessionEnd = selectedSession?.date_end ? new Date(selectedSession.date_end).getTime() : null;

  const currentPlaybackTime = (!isLive && playbackTime !== null) ? playbackTime : new Date().getTime();

  // Helper to safely parse dates for filtering
  const filterByTime = (arr, dateField = "date") => {
    if (isLive) return arr; // Don't filter if it's live
    return arr.filter(item => {
      if (!item[dateField]) return true; // keep if no date
      return new Date(item[dateField]).getTime() <= currentPlaybackTime;
    });
  };

  const filteredLaps = filterByTime(laps, "date_start");
  const filteredPitStops = filterByTime(pitStops, "date");
  const filteredPositions = filterByTime(positions, "date");
  const filteredIntervals = filterByTime(intervals, "date");
  const filteredRaceControl = filterByTime(raceControl, "date");
  const filteredTeamRadio = filterByTime(teamRadio, "date");
  // Weather usually has 'date' too
  const currentFilteredWeather = !isLive && weather ? filterByTime([weather], "date")[0] : weather;

  const currentFlag = useMemo(() => {
    // If a CHEQUERED flag was ever shown, it supersedes subsequent CLEAR messages
    const hasChequered = filteredRaceControl.some(m => m.flag === "CHEQUERED");
    if (hasChequered) return { flag: "CHEQUERED" };

    const msgs = filteredRaceControl.filter(
      (m) => m.flag === "CLEAR" || m.flag === "GREEN" || m.flag === "YELLOW" || m.flag === "RED" || m.flag === "DOUBLE YELLOW" || m.category === "Flag" || m.flag
    );
    return msgs.length > 0 ? msgs[msgs.length - 1] : null;
  }, [filteredRaceControl]);

  const flagClass = useMemo(() => {
    if (!currentFlag) return "flag-green";
    const f = currentFlag.flag || "";
    if (f === "RED") return "flag-red";
    if (f === "YELLOW" || f === "DOUBLE YELLOW") return "flag-yellow";
    if (f === "CHEQUERED") return "flag-chequered";
    if (f.includes("SAFETY")) return "flag-sc";
    return "flag-green";
  }, [currentFlag]);

  // ===== Render =====
  return (
    <div className="live-dashboard-container" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-f1">F1</span>
            <span className="logo-text">LIVE TIMINGS</span>
          </div>
          {isLive && (
            <div className="live-badge">
              <span className="live-dot" />
              LIVE
            </div>
          )}
        </div>

        <div className="header-center">
          <div className="session-selector">
            <select
              className="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              id="year-selector"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              className="session-select"
              value={selectedSessionKey || ""}
              onChange={(e) => handleSessionChange(parseInt(e.target.value, 10))}
              disabled={loadingSessions}
              id="session-selector"
            >
              {loadingSessions ? (
                <option>Loading sessions...</option>
              ) : sessions.length === 0 ? (
                <option>No sessions found</option>
              ) : (
                Object.entries(groupedSessions).map(([meetKey, group]) => (
                  <optgroup
                    key={meetKey}
                    label={`🏁 ${group.meetingName} — ${group.country}`}
                  >
                    {group.sessions.map((s) => (
                      <option key={s.session_key} value={s.session_key}>
                        {getSessionTypeName(s.session_name)} —{" "}
                        {formatDate(s.date_start)}
                      </option>
                    ))}
                  </optgroup>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="header-right">
          <div className="refresh-info">
            <span>⏱️</span>
            <span>Next update:</span>
            <span className="refresh-countdown">{countdown}s</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              className="btn btn-sm"
              onClick={toggleCelsius}
              title="Toggle Temperature Unit"
            >
              🌡️ {useCelsius ? "°C" : "°F"}
            </button>
            <button
              className="btn btn-sm"
              onClick={toggleKmh}
              title="Toggle Speed Unit"
            >
              💨 {useKmh ? "km/h" : "mph"}
            </button>
          </div>
          <button
            className="btn btn-sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? "Pause auto-refresh" : "Resume auto-refresh"}
          >
            {autoRefresh ? "⏸" : "▶️"} {autoRefresh ? "Auto" : "Paused"}
          </button>
          <Button
            size="sm"
            onClick={loadData}
            title="Refresh now"
            className="tracking-widest uppercase !px-16"
          >
            🔄 Refresh
          </Button>
          <div className="connection-status">
            <span className={`connection-dot ${connectionStatus}`} />
            <span style={{ color: "var(--text-tertiary)" }}>
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "connecting"
                  ? "Connecting..."
                  : "Disconnected"}
            </span>
          </div>
        </div>
      </header>
      
      {/* Playback Scrubber for Archive Mode */}
      <PlaybackScrubber 
        sessionStart={sessionStart}
        sessionEnd={sessionEnd}
        playbackTime={playbackTime}
        setPlaybackTime={setPlaybackTime}
        isLive={isLive}
      />

      {/* Auto-update progress bar */}
      {autoRefresh && (
        <div className="auto-update-bar">
          <div
            className="auto-update-progress"
            style={{
              width: `${((refreshInterval / 1000 - countdown) / (refreshInterval / 1000)) * 100}%`,
            }}
          />
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <span className="status-label">Session</span>
          <span className="status-value">
            {selectedSession
              ? getSessionTypeName(selectedSession.session_name)
              : "—"}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Circuit</span>
          <span className="status-value">
            {selectedSession?.circuit_short_name ||
              selectedSession?.location ||
              "—"}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Country</span>
          <span className="status-value">
            {selectedSession?.country_name || "—"}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Date</span>
          <span className="status-value">
            {formatDate(selectedSession?.date_start)}
          </span>
        </div>
        {currentFilteredWeather && (
          <>
            <div className="status-item">
              <span className="status-icon">🌡️</span>
              <span className="status-value">
                {useCelsius ? currentFilteredWeather.air_temperature : Math.round(currentFilteredWeather.air_temperature * 9/5 + 32)}°{useCelsius ? 'C' : 'F'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-icon">🛤️</span>
              <span className="status-value">
                {useCelsius ? currentFilteredWeather.track_temperature : Math.round(currentFilteredWeather.track_temperature * 9/5 + 32)}°{useCelsius ? 'C' : 'F'}
              </span>
            </div>
          </>
        )}
        {currentFlag && (
          <div className="status-item">
            <span className={`flag-indicator ${flagClass}`}>
              🏴 {currentFlag.flag || "GREEN"}
            </span>
          </div>
        )}
        {lastUpdated && (
          <div className="status-item" style={{ marginLeft: "auto" }}>
            <span className="status-label">Last Update</span>
            <span className="status-value">
              {formatTime(lastUpdated.toISOString())}
            </span>
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="main-layout">
        <div className="content-area">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === "timing" ? "active" : ""}`}
              onClick={() => setActiveTab("timing")}
            >
              ⏱️ Live Timing
            </button>
            <button
              className={`tab ${activeTab === "gaps" ? "active" : ""}`}
              onClick={() => setActiveTab("gaps")}
            >
              📊 Gaps &amp; Intervals
            </button>
            <button
              className={`tab ${activeTab === "charts" ? "active" : ""}`}
              onClick={() => setActiveTab("charts")}
            >
              📈 Charts
            </button>
            <button
              className={`tab ${activeTab === "strategy" ? "active" : ""}`}
              onClick={() => setActiveTab("strategy")}
            >
              🔄 Strategy
            </button>
            <button
              className={`tab ${activeTab === "racecontrol" ? "active" : ""}`}
              onClick={() => setActiveTab("racecontrol")}
            >
              📡 Race Control
            </button>
            <button
              className={`tab ${activeTab === "standings" ? "active" : ""}`}
              onClick={() => setActiveTab("standings")}
            >
              🏆 Standings
            </button>
            <button
              className={`tab ${activeTab === "teamradio" ? "active" : ""}`}
              onClick={() => setActiveTab("teamradio")}
            >
              📻 Team Radio
            </button>
            <button
              className={`tab ${activeTab === "telemetry" ? "active" : ""}`}
              onClick={() => setActiveTab("telemetry")}
            >
              🏎️ Telemetry
            </button>
            <button
              className={`tab ${activeTab === "trackmap" ? "active" : ""}`}
              onClick={() => setActiveTab("trackmap")}
            >
              🗺️ Track Map
            </button>
          </div>

          {/* Loading State */}
          {dataLoading && (
            <div className="loading-container fade-in">
              <div className="loading-spinner" />
              <div className="loading-text">Loading session data...</div>
            </div>
          )}

          {/* Error State */}
          {dataError && !dataLoading && (
            <div className="panel fade-in">
              <div
                className="panel-body-padded"
                style={{
                  color: "var(--status-red)",
                  textAlign: "center",
                  padding: "2rem",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  ⚠️
                </div>
                <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>
                  Error Loading Data
                </div>
                <div
                  style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}
                >
                  {dataError}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={loadData}
                  style={{ marginTop: "1rem" }}
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* ===== TIMING TAB ===== */}
          {activeTab === "timing" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              {/* Timing Table */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">
                    ⏱️ Live Timing
                    <span
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-tertiary)",
                        fontWeight: 400,
                      }}
                    >
                      (
                      {drivers.length > 0
                        ? new Set(drivers.map((d) => d.driver_number)).size
                        : 0}{" "}
                      drivers)
                    </span>
                  </div>
                </div>
                <div className="panel-body">
                  <TimingTable
                    drivers={drivers}
                    laps={filteredLaps}
                    stints={stints}
                    positions={filteredPositions}
                    intervals={filteredIntervals}
                    overallBestSectors={overallBestSectors}
                  />
                </div>
              </div>

              {/* Session Highlights, Weather and race control */}
              <div className="dashboard-grid-3col">
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">🏆 Highlights</div>
                  </div>
                  <div className="panel-body-padded">
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "4px" }}>Fastest Lap</div>
                      {fastestLap ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--purple-sector)" }}>
                            {formatLapTime(fastestLap.lap_duration)}
                          </span>
                          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                            {drivers.find(d => d.driver_number === fastestLap.driver_number)?.name_acronym || fastestLap.driver_number}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                            (Lap {fastestLap.lap_number})
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>—</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", textTransform: "uppercase", marginBottom: "4px" }}>Fastest Pit Stop</div>
                      {fastestPitStop ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--status-green)" }}>
                            {fastestPitStop.pit_duration.toFixed(2)}s
                          </span>
                          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                            {drivers.find(d => d.driver_number === fastestPitStop.driver_number)?.name_acronym || fastestPitStop.driver_number}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                            (Lap {fastestPitStop.lap_number})
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>—</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">🌤️ Weather Conditions</div>
                  </div>
                  <div className="panel-body">
                    <WeatherWidget weather={currentFilteredWeather} useCelsius={useCelsius} useKmh={useKmh} />
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">📡 Race Control</div>
                  </div>
                  <div className="panel-body">
                    <RaceControlFeed messages={filteredRaceControl} drivers={drivers} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== GAPS TAB ===== */}
          {activeTab === "gaps" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">📊 Gap to Leader</div>
                </div>
                <div className="panel-body">
                  <GapVisualization
                    drivers={drivers}
                    positions={filteredPositions}
                    intervals={filteredIntervals}
                    laps={filteredLaps}
                  />
                </div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">🏎️ Best Lap Comparison</div>
                </div>
                <div className="panel-body">
                  <SpeedComparison
                    drivers={drivers}
                    laps={filteredLaps}
                    positions={filteredPositions}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== CHARTS TAB ===== */}
          {activeTab === "charts" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">📈 Lap Time Progression</div>
                </div>
                <div className="panel-body">
                  <LapTimeChart drivers={drivers} laps={filteredLaps} />
                </div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">📊 Position Changes</div>
                </div>
                <div className="panel-body">
                  <PositionChart
                    drivers={drivers}
                    laps={filteredLaps}
                    positions={filteredPositions}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== STRATEGY TAB ===== */}
          {activeTab === "strategy" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">🔄 Tire Strategy Overview</div>
                </div>
                <div className="panel-body">
                  <TireStrategy
                    drivers={drivers}
                    stints={stints}
                    positions={filteredPositions}
                  />
                </div>
              </div>
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">🔧 Pit Stop History</div>
                </div>
                <div className="panel-body">
                  <PitStopTable drivers={drivers} pitStops={filteredPitStops} />
                </div>
              </div>
            </div>
          )}

          {/* ===== RACE CONTROL TAB ===== */}
          {activeTab === "racecontrol" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">📡 Race Control Feed</div>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {filteredRaceControl.length} messages
                  </span>
                </div>
                <div className="panel-body">
                  <RaceControlFeed messages={filteredRaceControl} drivers={drivers} />
                </div>
              </div>
            </div>
          )}

          {/* ===== STANDINGS TAB ===== */}
          {activeTab === "standings" && (
            <Standings year={selectedYear} />
          )}

          {/* ===== TEAM RADIO TAB ===== */}
          {activeTab === "teamradio" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              <TeamRadio radios={filteredTeamRadio} drivers={drivers} />
            </div>
          )}

          {/* ===== TELEMETRY TAB ===== */}
          {activeTab === "telemetry" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              <TelemetryDashboard sessionKey={selectedSessionKey} drivers={drivers} year={selectedYear} isLive={isLive} playbackTime={currentPlaybackTime} />
              <MiniSectorMap sessionKey={selectedSessionKey} drivers={drivers} laps={filteredLaps} />
            </div>
          )}

          {/* ===== TRACK MAP TAB ===== */}
          {activeTab === "trackmap" && !dataLoading && (
            <div className="dashboard-grid fade-in">
              <TrackMap sessionKey={selectedSessionKey} drivers={drivers} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          padding: "0.75rem 1.25rem",
          borderTop: "1px solid var(--border-primary)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.7rem",
          color: "var(--text-tertiary)",
          background: "var(--bg-secondary)",
        }}
      >
        <span>
          Powered by OpenF1 API • Data refreshes every {refreshInterval / 1000}s
        </span>
        <span>F1 Live Timings Dashboard © {new Date().getFullYear()}</span>
      </footer>
      <ReloadPrompt />
    </div>
  );
}
