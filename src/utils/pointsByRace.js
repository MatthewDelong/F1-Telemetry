// Build per-competitor race-by-race points for F1A/F2 series data
// allRaceResults follows the shape returned by fetchAllRaceResults
// race keys commonly used: race0 (rescheduled/extra), race1 (Sprint), race2 (Feature), race3 (legacy)

const RACE_KEYS = ["race0", "race1", "race2", "race3"];

// Position-based scoring tables for when result.points is missing (e.g. F2 data)
const SPRINT_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
const FEATURE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const getPointsFromPosition = (position, raceKey) => {
  const pos = parseInt(position, 10);
  if (!Number.isFinite(pos) || pos < 1) return 0;
  const table = raceKey === "race1" ? SPRINT_POINTS : FEATURE_POINTS;
  return table[pos - 1] || 0;
};

const buildBlankRow = (raceName) => ({
  raceName,
  pointsByKey: {},
  total: 0,
});

export const buildRacePointsMaps = (allRaceResults = []) => {
  const racesMeta = allRaceResults.map((race, idx) => ({
    raceName: race.raceName || race.Circuit?.circuitId || `Race ${idx + 1}`,
  }));

  const ensureRow = (map, id) => {
    if (!map.has(id)) {
      map.set(
        id,
        racesMeta.map((race) => buildBlankRow(race.raceName))
      );
    }
    return map.get(id);
  };

  const driverPointsByRace = new Map();
  const constructorPointsByRace = new Map();

  allRaceResults.forEach((race, raceIndex) => {
    RACE_KEYS.forEach((raceKey) => {
      const results = race[raceKey];
      if (!Array.isArray(results)) return;

      results.forEach((result) => {
        // Use result.points if available, otherwise calculate from position
        const rawPoints = result.points !== undefined
          ? Number(result.points)
          : getPointsFromPosition(result.position, raceKey);
        const points = rawPoints || 0;

        const driverId = result.Driver?.driverId;
        if (driverId) {
          const rows = ensureRow(driverPointsByRace, driverId);
          rows[raceIndex].pointsByKey[raceKey] =
            (rows[raceIndex].pointsByKey[raceKey] || 0) + points;
          rows[raceIndex].total += points;
        }

        const constructorId = result.Constructor?.constructorId;
        if (constructorId) {
          const rows = ensureRow(constructorPointsByRace, constructorId);
          rows[raceIndex].pointsByKey[raceKey] =
            (rows[raceIndex].pointsByKey[raceKey] || 0) + points;
          rows[raceIndex].total += points;
        }
      });
    });
  });

  return { racesMeta, driverPointsByRace, constructorPointsByRace };
};

export const DEFAULT_RACE_KEY_LABELS = {
  race1: "Sprint", // Sprint Race
  race2: "Feature", // Feature Race
  race0: "FR*", // Rescheduled Feature (when present)
  race3: "R3", // Legacy/extra slot
};

