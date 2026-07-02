import classNames from "classnames";
import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLocation, useParams } from "react-router-dom";

import {
  fetchOpenF1Data,
  fetchOpenF1FullSessionData,
  fetchWithPersistentCache,
  fetchDriversAndTires,
  fetchRaceResultsByCircuit,
  fetchQualifyingResultsByCircuit,
  fetchSprintResultsByCircuit,
  fetchLocationData,
  fetchTrackReferenceData,
  fetchRaceDetails,
  fetchRaceMeetingKeys,
  fetchRaceControl,
  BASE_F1_URL,
} from "../utils/api.js";
import { buildOpenF1Url } from "../config/openf1";

import {
  DriverCard,
  Loading,
  ThreeCanvas,
  LapChart,
  TireStrategy,
  StartingGrid,
  SelectedDriverStats,
  FastestLaps,
  PositionCharts,
  Tabs,
  ConstructorCar,
  RangeSelector,
  RaceControl,
  PitStopTimes,
  WeatherDetails,
} from "../components";
import Drawer from "../components/Drawer";
import Accordion from "../components/Accordion";
import { locationMaps } from "../utils/locationMaps";
import { organizeQualifyingResults } from "../utils/organizeQualifyingResults";

export function RacePage() {
  const { state } = useLocation();
  const { raceId } = useParams();
  const [raceName, setRaceName] = useState(state ? state.raceName : null);
  const [meetingKey, setMeetingKey] = useState(
    state ? state.meetingKey : raceId,
  );
  const [year, setYear] = useState(state ? state.year : null);
  const [location, setLocation] = useState(state ? state.location : null);
  const [drivers, setDrivers] = useState([]);
  const [laps, setLaps] = useState([]);
  const [pos, setPos] = useState([]);
  const [driversDetails, setDriversDetails] = useState({});
  const [driverSelected, setDriverSelected] = useState(false);
  const [driverCode, setDriverCode] = useState("");
  const [driverNumber, setDriverNumber] = useState("");
  const [driversColor, setDriversColor] = useState({});
  const [driverTeamMap, setDriverTeamMap] = useState({});
  const [startingGrid, setStartingGrid] = useState([]);
  const [MapPath, setMapPath] = useState(null);
  const [trackReferenceData, setTrackReferenceData] = useState(null);
  const [trackLoadError, setTrackLoadError] = useState(false);
  const [raceResults, setRaceResults] = useState([]);
  const [locData, setLocData] = useState([]);
  const [activeButtonIndex, setActiveButtonIndex] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [speedFactor, setSpeedFactor] = useState(0.2);
  const [isPaused, setIsPaused] = useState(false);
  const [haloView, setHaloView] = useState(false);
  const [topFollowView, setTopFollowView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState("Race");
  const [selectedSessionKey, setSelectedSessionKey] = useState("");
  const [hasRaceSession, sethasRaceSession] = useState(false);
  const [hasQualifyingSession, sethasQualifyingSession] = useState(false);
  const [hasSprintSession, sethasSprintSession] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [driverDrawerOpen, setDriverDrawerOpen] = useState(false);
  const [showStartingGrid, setShowStartingGrid] = useState(false);
  const [showCarDetails, setShowCarDetails] = useState(true);
  const [showCameraControls, setShowCameraControls] = useState(false);
  const [raceControlMessages, setRaceControlMessages] = useState([]);
  const [isSessionLive, setIsSessionLive] = useState(false);
  const [speedUnit, setSpeedUnit] = useState("kph");
  const [apiRestricted, setApiRestricted] = useState(false);

  useEffect(() => {
    const handleRestricted = () => setApiRestricted(true);
    window.addEventListener("openf1-restricted", handleRestricted);
    return () => window.removeEventListener("openf1-restricted", handleRestricted);
  }, []);

  useEffect(() => {
    const setBaseData = async () => {
      setRaceName(state.raceName);
      setYear(state.year);
      setLocation(state.location ? state.location.toLowerCase() : null);
      setMeetingKey(state.meetingKey);
    };
    if (state) setBaseData();
  }, [state]);

  useEffect(() => {
    const fetchByMeetingKey = async () => {
      try {
        setIsLoading(true);
        const response = await fetchWithPersistentCache(
          `${BASE_F1_URL}races/racesbyMK.json`,
        );
        if (response && response[raceId]) {
          setYear(response[raceId]["year"]);
          setLocation(
            response[raceId]["location"]
              ? response[raceId]["location"].toLowerCase()
              : null,
          );
          setRaceName(response[raceId]["raceName"]);
        }
      } catch (err) {
        console.error("Error fetching by meeting key:", err);
      }
    };

    if (!raceName && raceId) {
      fetchByMeetingKey();
    }

    const handleResize = () => {
      setShowStartingGrid(window.innerWidth > 640 && true);
    };
    window.addEventListener("resize", handleResize);
    // Cleanup event listener on unmount
    return () => window.removeEventListener("resize", handleResize);
  }, [raceId, raceName]);

  useEffect(() => {
    if (raceName && meetingKey) {
      fetchData();
    }
  }, [raceName, meetingKey, selectedSession]);

  const animatedLocations = [
    "albert_park",
    "americas",
    "bahrain",
    "baku",
    "catalunya",
    "hungaroring",
    "imola",
    "interlagos",
    "jeddah",
    "losail",
    "marina_bay",
    "miami",
    "monaco",
    "monza",
    "red_bull_ring",
    "rodriguez",
    "shanghai",
    "silverstone",
    "spa",
    "suzuka",
    "vegas",
    "villeneuve",
    "yas_marina",
    "zandvoort",
  ];

  const supportedAnimatedMaps = [
    "albert_park",
    "americas",
    "bahrain",
    "baku",
    "hungaroring",
    "interlagos",
    "jeddah",
    "losail",
    "marina_bay",
    "miami",
    "monaco",
    "monza",
    "rodriguez",
    "shanghai",
    "silverstone",
    "spa",
    "suzuka",
    "vegas",
    "yas_marina",
    "zandvoort",
  ];

  const selectedDriverData = drivers.find(
    (obj) => obj["acronym"] === driverCode,
  );

  const fullRaceResults = React.useMemo(() => {
    if (
      !raceResults ||
      raceResults.length === 0 ||
      !laps ||
      laps.length === 0
    ) {
      return raceResults;
    }

    // 1. Find the best lap for each driver from 'laps'
    const bestLapsByDriver = {};
    laps.forEach((lap) => {
      const num = lap.driver_number;
      const duration = parseFloat(lap.lap_duration);
      if (!isNaN(duration) && duration > 0) {
        if (
          !bestLapsByDriver[num] ||
          duration < bestLapsByDriver[num].duration
        ) {
          bestLapsByDriver[num] = {
            duration,
            lap_number: lap.lap_number,
          };
        }
      }
    });

    // 2. Rank the best laps
    const sortedBestLaps = Object.entries(bestLapsByDriver).sort(
      (a, b) => a[1].duration - b[1].duration,
    );

    sortedBestLaps.forEach(([num, data], index) => {
      bestLapsByDriver[num].rank = index + 1;
    });

    // 3. Augment raceResults
    return raceResults.map((result) => {
      const num = parseInt(result.number || result.Driver?.number, 10);
      const bestLap = bestLapsByDriver[num];

      if (bestLap && (!result.FastestLap || !result.FastestLap.Time)) {
        const mins = Math.floor(bestLap.duration / 60);
        const secs = (bestLap.duration % 60).toFixed(3);
        const timeStr = mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : secs;

        return {
          ...result,
          FastestLap: {
            ...result.FastestLap,
            rank: String(bestLap.rank),
            lap: String(bestLap.lap_number),
            Time: { time: timeStr },
          },
        };
      }
      return result;
    });
  }, [raceResults, laps]);

  const selectedDriverRaceData = fullRaceResults.find(
    (obj) =>
      String(obj["number"] || obj["Driver"]?.number) === String(driverNumber),
  );

  const getPositionTimeBounds = (positionData, sessionData) => {
    if (!positionData.length) {
      return {
        startTime: sessionData?.date_start || "",
        endTime: sessionData?.date_end || "",
      };
    }

    const snapshotDate = positionData[0]?.date;
    const firstDifferentDate = positionData.find(
      (item) => item.date !== snapshotDate,
    )?.date;

    if (firstDifferentDate) {
      const date = new Date(firstDifferentDate);

      if (!Number.isNaN(date.getTime())) {
        date.setMinutes(date.getMinutes() - 1);
        return {
          startTime: date.toISOString(),
          endTime:
            positionData[positionData.length - 1]?.date ||
            sessionData?.date_end ||
            snapshotDate ||
            "",
        };
      }
    }

    return {
      startTime: sessionData?.date_start || snapshotDate || "",
      endTime:
        sessionData?.date_end ||
        positionData[positionData.length - 1]?.date ||
        snapshotDate ||
        "",
    };
  };

  const fetchData = async () => {
    if (!raceName) return;

    try {
      setDriverSelected(false);
      setActiveButtonIndex(null);
      setIsLoading(true);
      setTrackReferenceData([]); // CLEAR OLD TRACK
      setTrackLoadError(false);

      const sessionsData = await fetchWithPersistentCache(
        `${buildOpenF1Url("/sessions")}?meeting_key=${meetingKey}`,
      );

      // Safety check: sessionsData might be an error object if rate limited (429)
      if (!Array.isArray(sessionsData)) {
        console.error(
          "Failed to fetch sessions data (not an array):",
          sessionsData,
        );
        setIsLoading(false);
        return;
      }

      const circuitId = location && locationMaps[location.toLowerCase()];
      const hasRaceSession = sessionsData.some(
        (session) => session.session_name === "Race",
      );
      sethasRaceSession(hasRaceSession);
      const hasQualifyingSession = sessionsData.some(
        (session) => session.session_name === "Qualifying",
      );
      sethasQualifyingSession(hasQualifyingSession);
      const hasSprintSession = sessionsData.some((session) =>
        ["Sprint", "Sprint Qualifying", "Sprint Shootout"].includes(
          session.session_name,
        ),
      );
      sethasSprintSession(hasSprintSession);

      if (selectedSession === "Race") {
        setIsLoading(true);

        if (circuitId) {
          const mapUrl = `/map/${circuitId}.gltf`;
          setMapPath(mapUrl);
        }

        let sessionResults = [];
        if (circuitId) {
          sessionResults = await fetchRaceResultsByCircuit(
            year,
            circuitId,
            raceName,
          );
          setRaceResults(sessionResults);
          if (sessionResults && sessionResults.length > 0) {
            console.log(
              `[RacePage] Results for ${sessionResults[0]?.raceName || raceName} Round ${sessionResults[0]?.round || "?"}`,
            );
          }
        }

        const raceSession = [...sessionsData]
          .reverse()
          .find((session) => session.session_name === "Race");
        if (!raceSession) throw new Error("Race session not found");
        const sessionKey = raceSession.session_key;
        setSelectedSessionKey(sessionKey);


        // Fetch data sequentially with small stagger to avoid 429 rate limiting
        const driverDetailsData = await fetchWithPersistentCache(
          `${buildOpenF1Url("/drivers")}?session_key=${sessionKey}`,
        ).catch(() => []);

        await new Promise((r) => setTimeout(r, 250));
        const raceControlData = await fetchRaceControl(sessionKey).catch(
          () => [],
        );
        setRaceControlMessages(raceControlData);

        await new Promise((r) => setTimeout(r, 250));
        const startingGridData = await fetchWithPersistentCache(
          `${buildOpenF1Url("/position")}?session_key=${sessionKey}`,
        ).catch(() => []);
        setPos(startingGridData);

        await new Promise((r) => setTimeout(r, 250));
        const driversData = await fetchDriversAndTires(sessionKey).catch(
          () => [],
        );

        await new Promise((r) => setTimeout(r, 250));
        const lapsData = await fetchOpenF1FullSessionData("/laps", sessionKey);

        console.log(`[RacePage] Session Key: ${sessionKey}`);
        console.log(
          `[RacePage] Drivers fetched: ${driverDetailsData?.length || 0}`,
        );
        console.log(`[RacePage] Laps fetched: ${lapsData?.length || 0}`);
        console.log(
          `[RacePage] Pos data fetched: ${startingGridData?.length || 0}`,
        );

        if (startingGridData && startingGridData.length > 0) {
          const uniqueDriversInPos = [
            ...new Set(startingGridData.map((p) => p.driver_number)),
          ];
          console.log(
            `[RacePage] Unique Drivers in Pos data:`,
            uniqueDriversInPos,
          );
        }

        const driverDetailsMap = (driverDetailsData || []).reduce(
          (acc, driver) => ({
            ...acc,
            [driver.driver_number]: driver.name_acronym,
          }),
          {},
        );

        setDriversDetails(driverDetailsMap);

        const driverColorMap = (driverDetailsData || []).reduce(
          (acc, driver) => ({
            ...acc,
            [driver.name_acronym]: driver.team_colour,
          }),
          {},
        );

        setDriversColor(driverColorMap);

        // Always use session start time if available to ensure we cover the whole race
        const startTimeValue =
          raceSession?.date_start || startingGridData[0]?.date || "";
        const endTimeValue =
          raceSession?.date_end ||
          startingGridData[startingGridData.length - 1]?.date ||
          "";

        setStartTime(startTimeValue);
        setEndTime(endTimeValue);

        // ALWAYS use official race results for the starting grid if available
        let filteredStartingGrid = [];
        if (
          (year === "2026" || year === 2026) &&
          sessionResults &&
          sessionResults.length > 0
        ) {
          filteredStartingGrid = sessionResults
            .map((r) => ({
              driver_number: parseInt(r.number || r.Driver?.number, 10),
              driver_acronym: r.Driver?.code || r.Driver?.driverId,
              position:
                r.grid === "PL" ? "PL" : parseInt(r.grid || r.position, 10),
              date: startTimeValue,
            }))
            .filter((r) => r.position === "PL" || r.position > 0);
        } else if (raceResults && raceResults.length > 0) {
          filteredStartingGrid = raceResults
            .map((r) => ({
              driver_number: parseInt(r.number || r.Driver?.number, 10),
              driver_acronym: r.Driver?.code || r.Driver?.driverId,
              position: r.grid === "PL" ? "PL" : parseInt(r.grid, 10),
              date: startTimeValue,
            }))
            .filter((r) => r.position === "PL" || r.position > 0);
        } else {
          const uniqueDrivers = new Map();
          const sortedPosData = [...startingGridData].sort(
            (a, b) => new Date(a.date) - new Date(b.date),
          );
          sortedPosData.forEach((item) => {
            if (!uniqueDrivers.has(item.driver_number)) {
              uniqueDrivers.set(item.driver_number, {
                ...item,
                driver_acronym: driverDetailsMap[item.driver_number],
              });
            }
          });
          filteredStartingGrid = Array.from(uniqueDrivers.values());
        }

        setStartingGrid(filteredStartingGrid);
        setDrivers(driversData);
        setLaps(
          lapsData.map((lap) => ({
            ...lap,
            driver_acronym: driverDetailsMap[lap.driver_number],
          })),
        );

        setIsSessionLive(
          !raceSession.date_end || new Date() < new Date(raceSession.date_end),
        );
        
        // Fetch track reference GPS data non-blockingly at the end
        fetchTrackReferenceData(sessionKey, circuitId).then(refData => {
          if (refData && refData.length > 0) {
            setTrackReferenceData(refData);
            setTrackLoadError(false);
          } else {
            setTrackLoadError(true);
          }
        }).catch(() => {
          setTrackLoadError(true);
        });
      } else if (selectedSession === "Qualifying") {
        setIsLoading(true);
        if (circuitId) {
          const mapUrl = `/map/${circuitId}.gltf`;
          setMapPath(mapUrl);

          if (supportedAnimatedMaps.includes(circuitId)) {
            const animatedMapUrl = `/mapsAnimated/${circuitId}Animated.mp4`;
            setAnimatedMap(animatedMapUrl);
          } else {
            setAnimatedMap(null);
          }
        }

        let sessionResults = [];
        if (circuitId) {
          sessionResults = await fetchQualifyingResultsByCircuit(
            year,
            circuitId,
            raceName,
          );
          setRaceResults(sessionResults);
        }

        const raceSession = sessionsData.find(
          (session) => session.session_name === "Qualifying",
        );
        if (!raceSession) throw new Error("Qualifying session not found");
        const sessionKey = raceSession.session_key;
        setSelectedSessionKey(sessionKey);


        const driverDetailsData = await fetchWithPersistentCache(
          `${buildOpenF1Url("/drivers")}?session_key=${sessionKey}`,
        ).catch(() => []);
        await new Promise((r) => setTimeout(r, 250));
        const startingGridData = await fetchWithPersistentCache(
          `${buildOpenF1Url("/position")}?session_key=${sessionKey}`,
        ).catch(() => []);
        await new Promise((r) => setTimeout(r, 250));
        const driversData = await fetchDriversAndTires(sessionKey).catch(
          () => [],
        );
        await new Promise((r) => setTimeout(r, 250));
        const lapsData = await fetchOpenF1FullSessionData("/laps", sessionKey);

        const driverDetailsMap = driverDetailsData.reduce(
          (acc, driver) => ({
            ...acc,
            [driver.driver_number]: driver.name_acronym,
          }),
          {},
        );
        setDriversDetails(driverDetailsMap);
        const driverColorMap = driverDetailsData.reduce(
          (acc, driver) => ({
            ...acc,
            [driver.name_acronym]: driver.team_colour,
          }),
          {},
        );
        setDriversColor(driverColorMap);

        const { startTime, endTime } = getPositionTimeBounds(
          startingGridData,
          raceSession,
        );
        setStartTime(startTime);
        setEndTime(endTime);

        let filteredStartingGrid = [];
        if (
          (year === "2026" || year === 2026) &&
          sessionResults &&
          sessionResults.length > 0
        ) {
          filteredStartingGrid = sessionResults
            .map((r) => ({
              driver_number: parseInt(r.number || r.Driver?.number, 10),
              driver_acronym: r.Driver?.code || r.Driver?.driverId,
              position: parseInt(r.position, 10),
              date: startTime,
            }))
            .filter((r) => r.position > 0);
        } else {
          const earliestDateTime = startingGridData[0]?.date;
          filteredStartingGrid = startingGridData.filter(
            (item) => item.date === earliestDateTime,
          );
        }

        setStartingGrid(filteredStartingGrid);
        setPos(startingGridData);
        setDrivers(driversData);
        setLaps(
          lapsData.map((lap) => ({
            ...lap,
            driver_acronym: driverDetailsMap[lap.driver_number],
          })),
        );
        
        // Fetch track reference GPS data non-blockingly at the end
        fetchTrackReferenceData(sessionKey, circuitId).then(refData => {
          if (refData && refData.length > 0) setTrackReferenceData(refData);
        }).catch((err) => {
          console.warn("[RacePage] Failed to fetch track reference data:", err);
        });
      } else if (selectedSession === "Sprint") {
        setIsLoading(true);
        if (circuitId) {
          const mapUrl = `/map/${circuitId}.gltf`;
          setMapPath(mapUrl);

          if (supportedAnimatedMaps.includes(circuitId)) {
            const animatedMapUrl = `/mapsAnimated/${circuitId}Animated.mp4`;
            setAnimatedMap(animatedMapUrl);
          } else {
            setAnimatedMap(null);
          }
        }

        const sprintSession = sessionsData.find((session) =>
          ["Sprint", "Sprint Qualifying", "Sprint Shootout"].includes(
            session.session_name,
          ),
        );
        if (!sprintSession) {
          setIsLoading(false);
          return;
        }

        let sessionResults = [];
        if (circuitId) {
          sessionResults = await fetchSprintResultsByCircuit(
            year,
            circuitId,
            raceName,
          );
          setRaceResults(sessionResults);
        }

        const sessionKey = sprintSession.session_key;
        setSelectedSessionKey(sessionKey);


        const driverDetailsData = await fetchWithPersistentCache(
          `${buildOpenF1Url("/drivers")}?session_key=${sessionKey}`,
        ).catch(() => []);
        await new Promise((r) => setTimeout(r, 250));
        const driversData = await fetchDriversAndTires(sessionKey).catch(
          () => [],
        );
        await new Promise((r) => setTimeout(r, 250));
        const lapsData = await fetchOpenF1FullSessionData("/laps", sessionKey);
        await new Promise((r) => setTimeout(r, 250));
        const positionData = await fetchWithPersistentCache(
          `${buildOpenF1Url("/position")}?session_key=${sessionKey}`,
        ).catch(() => []);

        const raceControlData = await fetchRaceControl(sessionKey).catch(
          () => [],
        );
        setRaceControlMessages(raceControlData);

        const driverDetailsMap = (driverDetailsData || []).reduce(
          (acc, driver) => ({
            ...acc,
            [driver.driver_number]: driver.name_acronym,
          }),
          {},
        );
        setDriversDetails(driverDetailsMap);
        const driverColorMap = (driverDetailsData || []).reduce(
          (acc, driver) => ({
            ...acc,
            [driver.name_acronym]: driver.team_colour,
          }),
          {},
        );
        setDriversColor(driverColorMap);

        const { startTime: sStartTime, endTime: sEndTime } =
          getPositionTimeBounds(positionData, sprintSession);
        setStartTime(sStartTime);
        setEndTime(sEndTime);

        let filteredStartingGrid = [];
        if (
          (year === "2026" || year === 2026) &&
          sessionResults &&
          sessionResults.length > 0
        ) {
          filteredStartingGrid = sessionResults
            .map((r) => ({
              driver_number: parseInt(r.number || r.Driver?.number, 10),
              driver_acronym: r.Driver?.code || r.Driver?.driverId,
              position:
                r.grid && String(r.grid).includes("PL")
                  ? "PL"
                  : parseInt(r.grid || r.position || 0, 10),
              date: sStartTime,
            }))
            .filter((r) => r.position === "PL" || r.position > 0);
        } else {
          const earliestDateTime = positionData[0]?.date;
          filteredStartingGrid = positionData.filter(
            (item) => item.date === earliestDateTime,
          );
        }

        setStartingGrid(filteredStartingGrid);
        setPos(positionData);
        setDrivers(driversData);
        setLaps(
          lapsData.map((lap) => ({
            ...lap,
            driver_acronym: driverDetailsMap[lap.driver_number],
          })),
        );
        setIsSessionLive(
          !sprintSession.date_end ||
            new Date() < new Date(sprintSession.date_end),
        );
        
        // Fetch track reference GPS data non-blockingly at the end
        fetchTrackReferenceData(sessionKey, circuitId).then(refData => {
          if (refData && refData.length > 0) setTrackReferenceData(refData);
        }).catch((err) => {
          console.warn("[RacePage] Failed to fetch track reference data:", err);
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, location, selectedSession, raceName]);

  // Live Polling for Race Control
  useEffect(() => {
    let intervalId;
    if (isSessionLive && selectedSessionKey) {
      intervalId = setInterval(async () => {
        try {
          const data = await fetchRaceControl(selectedSessionKey);
          if (data && data.length > 0) setRaceControlMessages(data);
        } catch (error) {
          console.error("Error polling race control:", error);
        }
      }, 60000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSessionLive, selectedSessionKey]);

  const handleDriverSelectionClick = (index) => {
    if (!raceResults || !raceResults[index]) return;

    if (activeButtonIndex === index) {
      setLocData([]);
      setDriverSelected(false);
      setActiveButtonIndex(null);
      setDriverCode("");
    } else {
      setLocData([]);
      setDriverSelected(true);
      setDriverCode(raceResults[index].Driver.code);
      setDriverNumber(raceResults[index].number);
      setActiveButtonIndex(index);

      (async () => {
        try {
          const currentCircuitId =
            location && locationMaps[location.toLowerCase()];
          if (currentCircuitId && !MapPath) {
            const mapUrl = `/map/${currentCircuitId}.gltf`;
            setMapPath(mapUrl);

            if (supportedAnimatedMaps.includes(currentCircuitId)) {
              const animatedMapUrl = `/mapsAnimated/${currentCircuitId}Animated.mp4`;
              setAnimatedMap(animatedMapUrl);
            } else {
              setAnimatedMap(null);
            }
          }

          const sessionsData = await fetchWithPersistentCache(
            `${buildOpenF1Url("/sessions")}?meeting_key=${meetingKey}`,
          );
          if (!Array.isArray(sessionsData))
            throw new Error("Sessions data is not an array");
          const raceSession = sessionsData.find(
            (session) => session.session_name === "Race",
          );
          if (!raceSession) throw new Error("Race session not found");
          const sessionKey = raceSession.session_key;

          const positionData = await fetchWithPersistentCache(
            `${buildOpenF1Url("/position")}?session_key=${sessionKey}`,
          ).catch(() => []);
          const locationData = await fetchLocationData(
            sessionKey,
            raceResults[index].number,
            startTime,
            endTime,
            1500,
          );
          setLocData(locationData);
        } catch (error) {
          console.error("Error fetching location data:", error);
        }
      })();
    }
  };

  const handleUnitToggle = () => {
    setSpeedUnit((prev) => (prev === "kph" ? "mph" : "kph"));
  };

  const { q1Results, q2Results, q3Results } = React.useMemo(
    () => organizeQualifyingResults(raceResults),
    [raceResults],
  );

  const circuitIdCanonical = location && locationMaps[location.toLowerCase()];
  const hasMap = !!circuitIdCanonical;
  const hasTrackData = trackReferenceData && trackReferenceData.length > 10;
  const driverSelectedShowTrack =
    driverSelected && (hasTrackData || hasMap);

  const driverButtons = (layoutSmall) => (
    <ul className="flex flex-col max-sm:p-8 sm:p-16">
      {fullRaceResults.map((result, index) => (
        <button
          key={index}
          className="block w-full mb-2 sm:mb-2 max-sm:mb-8 relative transition-all"
          onClick={() => {
            handleDriverSelectionClick(index);
            setIsDrawerOpen(false);
          }}
        >
          <DriverCard
            hasHover
            isActive={activeButtonIndex === index}
            index={index}
            driver={result.Driver}
            stint={drivers}
            driverColor={driversColor[driverCode]}
            startPosition={parseInt(result.grid, 10) || 0}
            endPosition={parseInt(result.position, 10) || 0}
            year={parseInt(year)}
            time={result.Time?.time || result.status}
            fastestLap={result.FastestLap}
            layoutSmall={layoutSmall}
            isRace={true}
            speedUnit={speedUnit}
          />
        </button>
      ))}
    </ul>
  );

  const selectedDriverAcronym = driverSelected
    ? driversDetails[driverNumber]
    : null;

  const statsTabs = React.useMemo(
    () =>
      [
        selectedSession === "Race" && {
          id: "position",
          label: "Position",
          content: (
            <PositionCharts
              laps={laps}
              pos={pos}
              startGrid={startingGrid}
              driversDetails={driversDetails}
              driversColor={driversColor}
              raceResults={fullRaceResults}
              driverCode={selectedDriverAcronym}
            />
          ),
        },
        {
          id: "laps",
          label: "Lap Chart",
          content: (
            <LapChart
              laps={laps}
              setLaps={() => setLaps}
              startGrid={startingGrid}
              driversDetails={driversDetails}
              driversColor={driversColor}
              raceResults={fullRaceResults}
              className="lap-chart"
              driverCode={selectedDriverAcronym}
            />
          ),
        },
        {
          id: "tires",
          label: "Tire Strategy",
          content: (
            <TireStrategy
              drivers={drivers}
              raceResults={fullRaceResults}
              startGrid={startingGrid}
              driverCode={selectedDriverAcronym}
              driverColor={driversColor[driverCode]}
            />
          ),
        },
        !driverSelected &&
          (selectedSession === "Race" || selectedSession === "Sprint") && {
            id: "fastest",
            label: "Fastest Laps",
            content: (
              <FastestLaps raceResults={fullRaceResults} drivers={drivers} />
            ),
          },
        (selectedSession === "Race" || selectedSession === "Sprint") && {
          id: "pitstops",
          label: "Pit Stops",
          content: (
            <PitStopTimes
              sessionKey={selectedSessionKey}
              raceResults={fullRaceResults}
              startGrid={startingGrid}
              driversDetails={driversDetails}
              driversColor={driversColor}
              driverCode={selectedDriverAcronym}
              showTitle={false}
            />
          ),
        },
        {
          id: "weather",
          label: "Weather",
          content: (
            <WeatherDetails
              sessionKey={selectedSessionKey}
              speedUnit={speedUnit}
            />
          ),
        },
      ].filter(Boolean),
    [
      selectedSession,
      laps,
      pos,
      startingGrid,
      driversDetails,
      driversColor,
      fullRaceResults,
      selectedDriverAcronym,
      driverSelected,
      driverCode,
      selectedSessionKey,
    ],
  );

  return isLoading ? (
    <Loading message={`Loading ${raceName} ${year} ${selectedSession}`} />
  ) : (
    <div className="race-page">
      <div className="race-page__track-view relative">
        <div className="absolute bottom-8 w-full flex justify-between sm:justify-end items-center z-10 gap-8 px-8">
          {driverSelected && (
            <div className="flex items-center gap-8">
              <button
                className={classNames(
                  "race-controls__play bg-glow w-32 h-32 rounded-sm",
                  { "bg-brand-blue-500": !isPaused },
                )}
                onClick={() => setIsPaused(false)}
              >
                <FontAwesomeIcon icon="play" />
              </button>
              <button
                className={classNames(
                  "race-controls__pause bg-glow w-32 h-32 rounded-sm",
                  { "bg-brand-blue-500": isPaused },
                )}
                onClick={() => setIsPaused(true)}
              >
                <FontAwesomeIcon icon="pause" />
              </button>
              <button
                className={classNames("bg-glow w-32 h-32 rounded-sm", {
                  "bg-brand-blue-500": showCameraControls,
                })}
                onClick={() => setShowCameraControls(!showCameraControls)}
              >
                <FontAwesomeIcon icon="camera-rotate" />
              </button>
              <button
                className={classNames("bg-glow w-32 h-32 rounded-sm", {
                  "bg-brand-blue-500": showCarDetails,
                })}
                onClick={() => setShowCarDetails(!showCarDetails)}
              >
                <FontAwesomeIcon icon="gauge" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-8">
            <button
              className="bg-glow w-32 h-32 rounded-sm sm:hidden"
              onClick={() => setDriverDrawerOpen(true)}
            >
              <FontAwesomeIcon icon="user" />
            </button>
            <button
              className="bg-glow w-32 h-32 rounded-sm"
              onClick={() => setIsDrawerOpen(true)}
            >
              <FontAwesomeIcon icon="gear" />
            </button>
          </div>
        </div>

        <Drawer
          isOpen={driverDrawerOpen}
          onClose={() => setDriverDrawerOpen(false)}
        >
          <div className="w-full tracking-xs text-center text-neutral-300 py-24 leading-none">
            Select driver from the leaderboard to activate race mode
          </div>
          {driverButtons(true)}
        </Drawer>
        <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
          {driverSelected && (
            <>
              <Accordion
                title="Playback Speed"
                contentClasses="flex flex-col gap-8 items-start"
              >
                <button
                  className={classNames("tracking-sm uppercase block", {
                    "text-brand-blue-300": speedFactor !== 4,
                  })}
                  onClick={() => {
                    setSpeedFactor(4);
                    setIsDrawerOpen(false);
                  }}
                >
                  Normal
                </button>
                <button
                  className={classNames("tracking-sm uppercase block", {
                    "text-brand-blue-300": speedFactor !== 1.5,
                  })}
                  onClick={() => {
                    setSpeedFactor(1.5);
                    setIsDrawerOpen(false);
                  }}
                >
                  Push Push
                </button>
                <button
                  className={classNames("tracking-sm uppercase block", {
                    "text-brand-blue-300": speedFactor !== 0.2,
                  })}
                  onClick={() => {
                    setSpeedFactor(0.2);
                    setIsDrawerOpen(false);
                  }}
                >
                  {parseInt(year) >= 2026 ? "ERS Boost" : "DRS"}
                </button>
              </Accordion>
              <Accordion
                title="Camera Angle"
                contentClasses="flex flex-col gap-8 items-start"
              >
                <button
                  className={classNames("tracking-sm uppercase block", {
                    "text-brand-blue-300": !haloView && !topFollowView,
                  })}
                  onClick={() => {
                    setHaloView(false);
                    setTopFollowView(false);
                    setIsDrawerOpen(false);
                  }}
                >
                  Sky View
                </button>
                <button
                  className={classNames("tracking-sm uppercase block", {
                    "text-brand-blue-300": haloView,
                  })}
                  onClick={() => {
                    setHaloView(true);
                    setTopFollowView(false);
                    setIsDrawerOpen(false);
                  }}
                >
                  Halo View
                </button>
                <button
                  className={classNames("tracking-sm uppercase block", {
                    "text-brand-blue-300": topFollowView,
                  })}
                  onClick={() => {
                    setTopFollowView(true);
                    setHaloView(false);
                    setIsDrawerOpen(false);
                  }}
                >
                  Top Follow View
                </button>
              </Accordion>
            </>
          )}
          <Accordion
            title="Race Selection"
            contentClasses="flex flex-col gap-8 items-start"
          >
            {hasRaceSession && (
              <button
                className={classNames("tracking-sm uppercase block", {
                  "text-brand-blue-300": selectedSession === "Race",
                })}
                onClick={() => {
                  setSelectedSession("Race");
                  setIsDrawerOpen(false);
                }}
              >
                Race
              </button>
            )}
            {hasQualifyingSession && (
              <button
                className={classNames("tracking-sm uppercase block", {
                  "text-brand-blue-300": selectedSession === "Qualifying",
                })}
                onClick={() => {
                  setSelectedSession("Qualifying");
                  setIsDrawerOpen(false);
                }}
              >
                Qualifying
              </button>
            )}
            {hasSprintSession && (
              <button
                className={classNames("tracking-sm uppercase block", {
                  "text-brand-blue-300": selectedSession === "Sprint",
                })}
                onClick={() => {
                  setSelectedSession("Sprint");
                  setIsDrawerOpen(false);
                }}
              >
                Sprint
              </button>
            )}
          </Accordion>
          <Accordion
            title="Units"
            contentClasses="flex flex-col gap-8 items-start"
          >
            <button
              className={classNames("tracking-sm uppercase block", {
                "text-brand-blue-300": speedUnit === "kph",
              })}
              onClick={() => {
                setSpeedUnit("kph");
                setIsDrawerOpen(false);
              }}
            >
              KPH
            </button>
            <button
              className={classNames("tracking-sm uppercase block", {
                "text-brand-blue-300": speedUnit === "mph",
              })}
              onClick={() => {
                setSpeedUnit("mph");
                setIsDrawerOpen(false);
              }}
            >
              MPH
            </button>
          </Accordion>
        </Drawer>

        {(selectedSession === "Race" || selectedSession === "Sprint") && (
          <>
            {apiRestricted ? (
              <div className="bg-red-900/80 border border-red-500/50 text-white text-center py-12 px-16 mb-16 rounded-md">
                Live F1 session in progress. Telemetry data is restricted globally by OpenF1 until the session ends.
              </div>
            ) : !driverSelected ? (
              <div className="bg-glow-dark text-center py-8 max-sm:hidden">
                Select a driver from the leaderboard to activate telemetry
                viewer
              </div>
            ) : null}
            <div className="race-page__track-view__display relative">
              {hasTrackData ? (
                <ThreeCanvas
                  className="race-page__track-view__display__canvas"
                  trackReferenceData={trackReferenceData}
                  circuitId={circuitIdCanonical}
                  locData={locData}
                  driverSelected={driverSelected}
                  constructorId={
                    selectedDriverRaceData?.Constructor?.constructorId || ""
                  }
                  driverCode={driverCode}
                  driverColor={driversColor[driverCode]}
                  isPaused={isPaused}
                  haloView={haloView}
                  topFollowView={topFollowView}
                  speedFactor={speedFactor}
                  year={year}
                  showCarDetails={showCarDetails}
                  showCameraControls={showCameraControls}
                  speedUnit={speedUnit}
                  selectedDriverData={selectedDriverData}
                  onToggleUnit={handleUnitToggle}
                />
              ) : (
                <div className="race-page__track-view__display__preview flex flex-col gap-4 items-center justify-center bg-[#0a0a0a]">
                  {trackLoadError ? (
                    <>
                      <div className="text-red-500 font-display font-bold">TRACK UNAVAILABLE</div>
                      <div className="text-white/50 font-display text-sm">OpenF1 API Rate Limited (429)</div>
                    </>
                  ) : (
                    <div className="text-white/50 font-display">Loading track data...</div>
                  )}
                </div>
              )}
              <div className="race-page__leaderboard-desktop-wrapper max-sm:hidden absolute top-[0] left-[0]">
                {driverButtons(true)}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="race-page__scroll-container">
        {selectedSession === "Qualifying" && (
          <button
            className="text-xs tracking-xs uppercase mb-16 bg-glow rounded-sm p-4 ml-8"
            onClick={() => setSelectedSession("Race")}
          >
            <FontAwesomeIcon icon="chevron-left" className="mr-16" />
            race
          </button>
        )}
        <div className="mb-40 flex flex-col gap-4 items-center uppercase">
          <p className="text-sm tracking-sm">{year}</p>
          <h1 className="heading-3">{raceName}</h1>
          {(selectedSession === "Qualifying" ||
            selectedSession === "Sprint") && (
            <p className="text-sm tracking-sm">{selectedSession}</p>
          )}
          <div className="divider-glow-dark mt-32" />
        </div>

        {selectedSession === "Qualifying" && (
          <div className="flex items-start justify-center gap-8 sm:gap-32 mx-8 mb-32">
            {[q1Results, q2Results, q3Results].map((res, i) => (
              <div
                key={i}
                className="p-16 bg-glow-dark rounded-md sm:rounded-xlarge max-md:w-full"
              >
                <h3 className="heading-3 mb-32 gradient-text-light">
                  Q{i + 1}
                </h3>
                <ul className="w-fit mx-auto">
                  {res.map((r, idx) => (
                    <DriverCard
                      key={idx}
                      hasHover={false}
                      isActive={activeButtonIndex === idx}
                      index={idx}
                      driver={r.Driver}
                      stint={drivers}
                      driverColor={driversColor[r.Driver.code]}
                      startPosition={parseInt(r.grid, 10)}
                      endPosition={parseInt(r.position, 10)}
                      year={parseInt(year)}
                      time={r[`Q${i + 1}`]}
                      fastestLap={r.FastestLap}
                      layoutSmall={idx > 2}
                      mobileSmall
                      isRace={true}
                      speedUnit={speedUnit}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        <div className="page-container-centered flex flex-col justify-center sm:flex-row gap-16 mt-32">
          {(selectedSession === "Race" || selectedSession === "Sprint") && (
            <div className="sm:w-[26rem]">
              {driverSelected && (
                <SelectedDriverStats
                  selectedDriverData={selectedDriverData}
                  selectedDriverRaceData={selectedDriverRaceData}
                  year={year}
                  circuitId={circuitIdCanonical}
                  speedUnit={speedUnit}
                  onToggleUnit={handleUnitToggle}
                />
              )}
              <div className="flex flex-row gap-4 sm:hidden max-sm:mb-16">
                <button
                  className={classNames(
                    "flex-1 text-center py-[10px] transition-all rounded-sm font-display text-[13px] uppercase tracking-wider leading-none",
                    showStartingGrid ? "bg-white text-black" : "bg-glow text-neutral-400"
                  )}
                  onClick={() => setShowStartingGrid(true)}
                >
                  Starting Grid
                </button>
                <button
                  className={classNames(
                    "flex-1 text-center py-[10px] transition-all rounded-sm font-display text-[13px] uppercase tracking-wider leading-none",
                    !showStartingGrid ? "bg-white text-black" : "bg-glow text-neutral-400"
                  )}
                  onClick={() => setShowStartingGrid(false)}
                >
                  Race Results
                </button>
              </div>
              <div className="max-sm:hidden flex justify-center">
                <button className="text-neutral-400 font-display sm:text-xl sm:mb-16 leading-none">
                  Starting Grid
                </button>
              </div>
              <div className="flex flex-col sm:hidden mb-24 w-full">
                {showStartingGrid ? (
                  <StartingGrid
                    className="w-full transition-all"
                    raceResults={fullRaceResults}
                    startingGrid={startingGrid}
                    year={year}
                    driverCode={driverCode}
                    driverNumber={driverNumber}
                    driversDetails={driversDetails}
                    driversColor={driversColor}
                    driverTeamMap={driverTeamMap}
                  />
                ) : (
                  <div className="w-full bg-glow-large h-fit rounded-md transition-all overflow-hidden">
                    {driverButtons(false)}
                  </div>
                )}
              </div>
              <StartingGrid
                className="max-sm:hidden w-[26rem]"
                raceResults={fullRaceResults}
                startingGrid={startingGrid}
                year={year}
                driverCode={driverCode}
                driverNumber={driverNumber}
                driversDetails={driversDetails}
                driversColor={driversColor}
                driverTeamMap={driverTeamMap}
              />
            </div>
          )}
          <div className="sm:grow">
            <Tabs tabs={statsTabs} />
            {(selectedSession === "Race" || selectedSession === "Sprint") && (
              <RaceControl
                messages={raceControlMessages}
                isLive={isSessionLive}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
