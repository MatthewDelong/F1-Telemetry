import { calculateFastestLapDriver } from "./calculateFastestLapDriver.js";
import { scoringConfigs } from "./calculateSeriesPoints2025.js";
import { wildCardDrivers } from "./wildCards.js";

const RACE_KEYS = ["race0", "race1", "race2", "race3"];

const getPointsFromPosition = (position, pointsArray) => {
  const pos = parseInt(position, 10);
  if (!Number.isFinite(pos) || pos < 1) return 0;
  return pointsArray[pos - 1] || 0;
};

const buildBlankRow = (raceName) => ({
  raceName,
  pointsByKey: {},
  total: 0,
});

export const buildRacePointsMaps = (allRaceResults = [], championshipLevel, selectedYear) => {
  const config = scoringConfigs[championshipLevel];
  if (!config) return { racesMeta: [], driverPointsByRace: new Map(), constructorPointsByRace: new Map() };

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
    const raceSeason = Number(race?.season || selectedYear);
    const wildcardCodesForSeason = wildCardDrivers[raceSeason] || [];

    const hasRace3 = Array.isArray(race.race3) && race.race3.length > 0;

    let raceMap = {};
    if (hasRace3) {
      raceMap['race1'] = { points: config.featurePoints, fastestLapLimit: config.fastestLapEligibility[config.featureKey] };
      raceMap['race2'] = { points: config.sprintPoints, fastestLapLimit: config.fastestLapEligibility[config.sprintKey] };
      raceMap['race3'] = { points: config.featurePoints, fastestLapLimit: config.fastestLapEligibility[config.featureKey] };
    } else {
      let f1aRace1Points = config.sprintPoints;
      if (championshipLevel === "F1A" && (!selectedYear || selectedYear.toString() === "2024" || selectedYear.toString() === "2025")) {
        f1aRace1Points = config.featurePoints;
      }
      raceMap = {
        [config.sprintKey]: { points: championshipLevel === "F1A" ? f1aRace1Points : config.sprintPoints, fastestLapLimit: config.fastestLapEligibility[config.sprintKey] },
        [config.featureKey]: { points: config.featurePoints, fastestLapLimit: config.fastestLapEligibility[config.featureKey] },
        [config.rescheduledFeatureKey]: { points: config.featurePoints, fastestLapLimit: config.fastestLapEligibility[config.featureKey] }
      };
    }

    Object.entries(raceMap).forEach(([raceKey, { points, fastestLapLimit }]) => {
      const results = race[raceKey];
      if (!Array.isArray(results)) return;

      const fastestLapDriverNumber = String(calculateFastestLapDriver(results, fastestLapLimit));
      let fastestLapPointAwarded = false;

      results.forEach((result) => {
        const rawPoints = result.points !== undefined
          ? Number(result.points)
          : getPointsFromPosition(result.position, points);
        
        let calculatedPoints = rawPoints || 0;
        const code = result.Driver?.code;

        if (result.points === undefined) {
          const isFastestLap = String(result.number) === fastestLapDriverNumber;
          const finishPosition = parseInt(result.position, 10);
          const eligibleForFastestLap = Number.isFinite(finishPosition) && finishPosition >= 1 && finishPosition <= fastestLapLimit;

          if (isFastestLap && eligibleForFastestLap && !fastestLapPointAwarded) {
             if (championshipLevel !== "F1A" || !wildcardCodesForSeason.includes(code)) {
                calculatedPoints += 1;
                fastestLapPointAwarded = true;
             }
          }
        }

        const driverId = result.Driver?.driverId;
        if (driverId) {
          const rows = ensureRow(driverPointsByRace, driverId);
          rows[raceIndex].pointsByKey[raceKey] =
            (rows[raceIndex].pointsByKey[raceKey] || 0) + calculatedPoints;
          rows[raceIndex].total += calculatedPoints;
        }

        const constructorId = result.Constructor?.constructorId;
        if (constructorId) {
          if (championshipLevel !== "F1A" || !wildcardCodesForSeason.includes(code)) {
            const rows = ensureRow(constructorPointsByRace, constructorId);
            rows[raceIndex].pointsByKey[raceKey] =
              (rows[raceIndex].pointsByKey[raceKey] || 0) + calculatedPoints;
            rows[raceIndex].total += calculatedPoints;
          }
        }
      });
    });

    let poleBonusRaces = [];
    if (hasRace3) {
      poleBonusRaces = [race.race1, race.race3];
    } else {
      poleBonusRaces = config.poleBonusRace === 'both' 
        ? [race[config.sprintKey], race[config.featureKey]] 
        : [race[config.featureKey]];
    }

    poleBonusRaces.forEach((poleBonusResults, idx) => {
      if (Array.isArray(poleBonusResults)) {
        const poleDriver = poleBonusResults.find(d => parseInt(d.grid, 10) === 1);
        if (poleDriver) {
          const code = poleDriver.Driver?.code;
          const driverId = poleDriver.Driver?.driverId;
          const constructorId = poleDriver.Constructor?.constructorId;
          const hasPrecalculatedPoints = poleBonusResults.some(r => r?.points !== undefined);
          
          if (driverId && !hasPrecalculatedPoints) {
            if (championshipLevel !== "F1A" || !wildcardCodesForSeason.includes(code)) {
              const rows = ensureRow(driverPointsByRace, driverId);
              // Find the raceKey that matches this poleBonusResults
              let raceKeyForPole = 'race2'; // fallback
              if (hasRace3) {
                raceKeyForPole = idx === 0 ? 'race1' : 'race3';
              } else {
                raceKeyForPole = config.poleBonusRace === 'both' ? (idx === 0 ? config.sprintKey : config.featureKey) : config.featureKey;
              }
              rows[raceIndex].pointsByKey[raceKeyForPole] =
                (rows[raceIndex].pointsByKey[raceKeyForPole] || 0) + 2;
              rows[raceIndex].total += 2;

              if (constructorId) {
                const cRows = ensureRow(constructorPointsByRace, constructorId);
                cRows[raceIndex].pointsByKey[raceKeyForPole] =
                  (cRows[raceIndex].pointsByKey[raceKeyForPole] || 0) + 2;
                cRows[raceIndex].total += 2;
              }
            }
          }
        }
      }
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
