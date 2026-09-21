import { useState, useEffect, useCallback, useRef } from "react";
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
} from "../services/api.js";

const REFRESH_INTERVAL = 10000; // 10 seconds

export function useLiveTelemetry(selectedYear) {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [refreshInterval, setRefreshInterval] = useState(REFRESH_INTERVAL);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Data State
  const [drivers, setDrivers] = useState([]);
  const [laps, setLaps] = useState([]);
  const [stints, setStints] = useState([]);
  const [positions, setPositions] = useState([]);
  const [intervals, setIntervals] = useState([]);
  const [weather, setWeather] = useState(null);
  const [raceControl, setRaceControl] = useState([]);
  const [pitStops, setPitStops] = useState([]);
  const [teamRadio, setTeamRadio] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(refreshInterval / 1000);

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const sessionKeyRef = useRef(null);

  // Load Sessions
  useEffect(() => {
    let cancelled = false;
    async function loadSessions() {
      setLoadingSessions(true);
      try {
        const data = await getSessions({ year: selectedYear });
        if (!cancelled && data) {
          const chronological = data.sort(
            (a, b) => new Date(a.date_start) - new Date(b.date_start)
          );
          const descending = [...chronological].reverse();
          setSessions(descending);

          if (chronological.length > 0 && !selectedSessionKey) {
            const now = new Date();
            let bestSession = null;

            const liveSession = chronological.find((s) => {
              const start = new Date(s.date_start);
              const end = new Date(s.date_end);
              return now >= start && now <= end;
            });

            if (liveSession) {
              bestSession = liveSession;
              setIsLive(true);
            } else {
              const pastSessions = chronological.filter((s) => now > new Date(s.date_start));
              const lastStarted = pastSessions.length > 0 ? pastSessions[pastSessions.length - 1] : null;
              
              if (lastStarted) {
                bestSession = lastStarted;
              } else {
                bestSession = chronological[0]; // fallback to first session if none started
              }
              setIsLive(false);
            }

            if (bestSession) {
              setSelectedSessionKey(bestSession.session_key);
              setSelectedSession(bestSession);
            } else if (descending.length > 0) {
              setSelectedSessionKey(descending[0].session_key);
              setSelectedSession(descending[0]);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    }
    
    // Reset selections on year change
    setSelectedSessionKey(null);
    setSelectedSession(null);
    setDrivers([]);
    setLaps([]);
    setStints([]);
    setPositions([]);
    setIntervals([]);
    setWeather(null);
    setRaceControl([]);
    setPitStops([]);
    
    loadSessions();
    return () => {
      cancelled = true;
    };
  }, [selectedYear]);

  // Load Session Data
  const loadData = useCallback(async () => {
    if (!selectedSessionKey) return;

    try {
      setDataError(null);
      const [
        driversData,
        lapsData,
        stintsData,
        positionsData,
        intervalsData,
        weatherData,
        rcData,
        pitData,
        radioData,
      ] = await Promise.all([
        getDrivers(selectedSessionKey).catch(() => []),
        getLaps(selectedSessionKey).catch(() => []),
        getStints(selectedSessionKey).catch(() => []),
        getPositions(selectedSessionKey).catch(() => []),
        getIntervals(selectedSessionKey).catch(() => []),
        getWeather(selectedSessionKey).catch(() => []),
        getRaceControl(selectedSessionKey).catch(() => []),
        getPitStops(selectedSessionKey).catch(() => []),
        getTeamRadio(selectedSessionKey).catch(() => []),
      ]);

      setDrivers(driversData || []);
      setLaps(lapsData || []);
      setStints(stintsData || []);
      setPositions(positionsData || []);
      setIntervals(intervalsData || []);
      setWeather(weatherData && weatherData.length > 0 ? weatherData[weatherData.length - 1] : null);
      setRaceControl(rcData || []);
      setPitStops(pitData || []);
      setTeamRadio(radioData || []);
      setLastUpdated(new Date());
      setCountdown(refreshInterval / 1000);
      setConnectionStatus("connected");
    } catch (err) {
      setDataError(err.message);
      setConnectionStatus("disconnected");
    } finally {
      setDataLoading(false);
    }
  }, [selectedSessionKey, refreshInterval]);

  // Initial load
  useEffect(() => {
    if (selectedSessionKey) {
      sessionKeyRef.current = selectedSessionKey;
      setDataLoading(true);
      loadData();
    }
  }, [selectedSessionKey, loadData]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (autoRefresh && selectedSessionKey && isLive) {
      intervalRef.current = setInterval(() => {
        if (sessionKeyRef.current === selectedSessionKey) {
          loadData();
        }
      }, refreshInterval);

      countdownRef.current = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, selectedSessionKey, refreshInterval, loadData, isLive]);

  const handleSessionChange = (key) => {
    setSelectedSessionKey(key);
    const session = sessions.find((s) => s.session_key === key);
    setSelectedSession(session);
    if (session) {
      const now = new Date();
      const start = new Date(session.date_start);
      const end = new Date(session.date_end);
      setIsLive(now >= start && now <= end);
    }
  };

  return {
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
  };
}
