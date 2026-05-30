import { calculateFastestLapDriver } from "./calculateFastestLapDriver.js";
import { wildCardDrivers } from "./wildCards.js";

const scoringConfigs = {
  F1A: {
    rescheduledFeatureKey: 'race0', // rescheduled race
    sprintKey: 'race1',
    featureKey: 'race2',
    sprintPoints: [10, 8, 6, 5, 4, 3, 2, 1],
    featurePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    fastestLapEligibility: { race1: 8, race2: 10 },
    poleBonusRace: 'race2',
  },
  F2: {
    rescheduledFeatureKey: 'race0', // rescheduled race
    sprintKey: 'race1',
    featureKey: 'race2',
    sprintPoints: [10, 8, 6, 5, 4, 3, 2, 1],
    featurePoints: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
    fastestLapEligibility: { race1: 10, race2: 10 },
    poleBonusRace: 'race2',
  },
};

export const calculateSeriesPoints2025 = (allRaceResults, championshipLevel) => {
  const config = scoringConfigs[championshipLevel];
  const driverPoints = {};
  const constructorPoints = {};

  const isEligibleForFastestLapPoint = (result, fastestLapLimit) => {
    const finishPosition = parseInt(result?.position, 10);
    return (
      Number.isFinite(finishPosition) &&
      finishPosition >= 1 &&
      finishPosition <= fastestLapLimit
    );
  };

  allRaceResults.forEach(race => {
    const raceSeason = Number(race?.season);
    const wildcardCodesForSeason = wildCardDrivers[raceSeason] || [];

    // If a round only has race1 results, treat it as a feature race
    const hasRace1 = Array.isArray(race[config.sprintKey]) && race[config.sprintKey].length > 0;
    const hasRace2 = Array.isArray(race[config.featureKey]) && race[config.featureKey].length > 0;
    const hasRace3 = Array.isArray(race.race3) && race.race3.length > 0;
    const isSingleRaceEvent = hasRace1 && !hasRace2;

    let raceMap = {};
    if (hasRace3) {
      raceMap['race1'] = {
        points: config.featurePoints,
        fastestLapLimit: config.fastestLapEligibility[config.featureKey]
      };
      raceMap['race2'] = {
        points: config.sprintPoints,
        fastestLapLimit: config.fastestLapEligibility[config.sprintKey]
      };
      raceMap['race3'] = {
        points: config.featurePoints,
        fastestLapLimit: config.fastestLapEligibility[config.featureKey]
      };
    } else {
      raceMap = {
        [config.sprintKey]: {
          points: isSingleRaceEvent ? config.featurePoints : config.sprintPoints,
          fastestLapLimit: isSingleRaceEvent ? config.fastestLapEligibility[config.featureKey] : config.fastestLapEligibility[config.sprintKey]
        },
        [config.featureKey]: {
          points: config.featurePoints,
          fastestLapLimit: config.fastestLapEligibility[config.featureKey]
        },
        [config.rescheduledFeatureKey]: {
          points: config.featurePoints,
          fastestLapLimit: config.fastestLapEligibility[config.featureKey]
        }
      };
    }

    Object.entries(raceMap).forEach(([raceKey, { points, fastestLapLimit }]) => {
      const results = race[raceKey];
      if (!Array.isArray(results)) return;

      const fastestLapDriverNumber = String(calculateFastestLapDriver(results, fastestLapLimit));
      let fastestLapPointAwarded = false;

      // Temporary map to track constructor points in THIS SPECIFIC RACE
      const raceConstructorPoints = {};

      results.forEach((result) => {
        const resolvedDriver = result?.Driver;
        const resolvedConstructor = result?.Constructor;
        if (!resolvedDriver?.driverId || !resolvedConstructor?.constructorId) {
          return;
        }

        const driverId = resolvedDriver.driverId;
        const constructorId = resolvedConstructor.constructorId;
        const code = resolvedDriver.code;

        const finishPosition = parseInt(result.position, 10);
        const positionIndex = Number.isFinite(finishPosition) ? finishPosition - 1 : -1;
        const pointsFromFinish = points[positionIndex] || 0;
        let fastestLapPoint = 0;

        const isFastestLap = String(result.number) === fastestLapDriverNumber;
        const eligibleForFastestLap = isEligibleForFastestLapPoint(result, fastestLapLimit);

        if (isFastestLap && eligibleForFastestLap && !fastestLapPointAwarded) {
          fastestLapPoint = 1;
          fastestLapPointAwarded = true;
        }

        const totalDriverPoints = pointsFromFinish + fastestLapPoint;

        // Add to driver standings
        if (!driverPoints[driverId]) {
          driverPoints[driverId] = { ...resolvedDriver, points: 0 };
        }
        driverPoints[driverId].points += totalDriverPoints;

        // Collect points for constructor aggregation (top 2 rule)
        if (championshipLevel === "F1A" && wildcardCodesForSeason.includes(code)) {
          return;
        }

        if (!raceConstructorPoints[constructorId]) {
          raceConstructorPoints[constructorId] = {
            constructor: resolvedConstructor,
            scores: []
          };
        }
        raceConstructorPoints[constructorId].scores.push({ code, points: totalDriverPoints });
      });

      // After the race results are processed, add all eligible scores for F1A
      Object.keys(raceConstructorPoints).forEach(constructorId => {
        const teamData = raceConstructorPoints[constructorId];
        
        if (!constructorPoints[constructorId]) {
          constructorPoints[constructorId] = {
            ...teamData.constructor,
            points: 0,
            driverCodes: new Set()
          };
        }

        // Sort scores descending by points and sum all non-wildcard drivers for constructors
        teamData.scores.sort((a, b) => b.points - a.points);
        const eligibleScores = teamData.scores;

        eligibleScores.forEach(score => {
          constructorPoints[constructorId].points += score.points;
          constructorPoints[constructorId].driverCodes.add(score.code);
        });
      });
    });

    // Pole bonus for Feature Race
    const poleBonusRaces = hasRace3 ? [race.race3] : [isSingleRaceEvent ? race[config.sprintKey] : race[config.featureKey]];
    
    poleBonusRaces.forEach(poleBonusResults => {
      if (Array.isArray(poleBonusResults)) {
        const poleDriver = poleBonusResults.find(d => parseInt(d.grid, 10) === 1);
        if (poleDriver) {
          const resolvedPoleDriver = poleDriver?.Driver;
          const resolvedPoleConstructor = poleDriver?.Constructor;
          const driverId = resolvedPoleDriver?.driverId;
          const constructorId = resolvedPoleConstructor?.constructorId;
          const code = resolvedPoleDriver?.code;
          
          if (driverId) {
            if (!driverPoints[driverId]) {
              driverPoints[driverId] = { ...resolvedPoleDriver, points: 0 };
            }
            driverPoints[driverId].points += 2;

            // Pole points for constructors
            if (championshipLevel === "F1A" && wildcardCodesForSeason.includes(code)) {
               // Wildcards don't score pole points for team
            } else if (constructorId) {
              if (!constructorPoints[constructorId]) {
                constructorPoints[constructorId] = {
                  ...resolvedPoleConstructor,
                  points: 0,
                  driverCodes: new Set()
                };
              }
              constructorPoints[constructorId].points += 2;
              if (code) constructorPoints[constructorId].driverCodes.add(code);
            }
          }
        }
      }
    });
  });

  const formattedDrivers = Object.values(driverPoints).sort((a, b) => b.points - a.points);
  const formattedConstructors = Object.values(constructorPoints).map(constructor => ({
    ...constructor,
    driverCodes: Array.from(constructor.driverCodes)
  })).sort((a, b) => b.points - a.points);

  return { formattedDrivers, formattedConstructors };
};
