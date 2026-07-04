import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook for fetching data with automatic refresh
 * @param {Function} fetchFn - async function that returns data
 * @param {number} interval - refresh interval in ms (0 = no auto-refresh)
 * @param {Array} deps - dependency array for re-fetching
 */
export function useAutoRefresh(fetchFn, interval = 5000, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(interval / 1000);
  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
        setCountdown(interval / 1000);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn, interval]);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    fetchData();

    if (interval > 0) {
      intervalRef.current = setInterval(fetchData, interval);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
    }

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [...deps, interval]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  return { data, loading, error, lastUpdated, countdown, refresh };
}

/**
 * Hook that manages the session selection state
 */
export function useSessionState() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isLive, setIsLive] = useState(false);

  return {
    selectedYear,
    setSelectedYear,
    sessions,
    setSessions,
    selectedSession,
    setSelectedSession,
    selectedMeeting,
    setSelectedMeeting,
    loadingSessions,
    setLoadingSessions,
    isLive,
    setIsLive,
  };
}
