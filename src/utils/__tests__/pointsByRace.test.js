import { describe, it, expect } from "vitest";
import { buildRacePointsMaps, DEFAULT_RACE_KEY_LABELS } from "../pointsByRace.js";

describe("buildRacePointsMaps", () => {
  it("returns empty maps for no input", () => {
    const { racesMeta, driverPointsByRace, constructorPointsByRace } = buildRacePointsMaps();
    expect(racesMeta).toEqual([]);
    expect(driverPointsByRace.size).toBe(0);
    expect(constructorPointsByRace.size).toBe(0);
  });

  it("returns empty maps for an empty array", () => {
    const { racesMeta, driverPointsByRace, constructorPointsByRace } = buildRacePointsMaps([]);
    expect(racesMeta).toEqual([]);
    expect(driverPointsByRace.size).toBe(0);
    expect(constructorPointsByRace.size).toBe(0);
  });

  it("uses raceName for race metadata", () => {
    const data = [{ raceName: "Australian Grand Prix" }];
    const { racesMeta } = buildRacePointsMaps(data);
    expect(racesMeta).toEqual([{ raceName: "Australian Grand Prix" }]);
  });

  it("falls back to Circuit.circuitId when raceName is missing", () => {
    const data = [{ Circuit: { circuitId: "albert_park" } }];
    const { racesMeta } = buildRacePointsMaps(data);
    expect(racesMeta[0].raceName).toBe("albert_park");
  });

  it("accumulates driver points from result.points", () => {
    const data = [
      {
        raceName: "Race 1",
        race1: [
          {
            position: "1",
            points: 25,
            Driver: { driverId: "hamilton" },
            Constructor: { constructorId: "mercedes" },
          },
        ],
      },
    ];
    const { driverPointsByRace } = buildRacePointsMaps(data);
    const rows = driverPointsByRace.get("hamilton");
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(25);
    expect(rows[0].pointsByKey.race1).toBe(25);
  });

  it("calculates points from position when result.points is missing (sprint)", () => {
    const data = [
      {
        raceName: "Race 1",
        race1: [
          {
            position: "1",
            Driver: { driverId: "verstappen" },
            Constructor: { constructorId: "redbull" },
          },
        ],
      },
    ];
    const { driverPointsByRace } = buildRacePointsMaps(data);
    const rows = driverPointsByRace.get("verstappen");
    expect(rows[0].pointsByKey.race1).toBe(10);
  });

  it("calculates points from position when result.points is missing (feature)", () => {
    const data = [
      {
        raceName: "Race 1",
        race2: [
          {
            position: "1",
            Driver: { driverId: "leclerc" },
            Constructor: { constructorId: "ferrari" },
          },
        ],
      },
    ];
    const { driverPointsByRace } = buildRacePointsMaps(data);
    const rows = driverPointsByRace.get("leclerc");
    expect(rows[0].pointsByKey.race2).toBe(25);
  });

  it("gives zero points for positions beyond the scoring range", () => {
    const data = [
      {
        raceName: "Race 1",
        race1: [
          {
            position: "20",
            Driver: { driverId: "driver_20" },
            Constructor: { constructorId: "team_a" },
          },
        ],
      },
    ];
    const { driverPointsByRace } = buildRacePointsMaps(data);
    const rows = driverPointsByRace.get("driver_20");
    expect(rows[0].total).toBe(0);
  });

  it("accumulates constructor points across multiple drivers", () => {
    const data = [
      {
        raceName: "Race 1",
        race2: [
          {
            position: "1",
            points: 25,
            Driver: { driverId: "d1" },
            Constructor: { constructorId: "team_x" },
          },
          {
            position: "2",
            points: 18,
            Driver: { driverId: "d2" },
            Constructor: { constructorId: "team_x" },
          },
        ],
      },
    ];
    const { constructorPointsByRace } = buildRacePointsMaps(data);
    const rows = constructorPointsByRace.get("team_x");
    expect(rows[0].total).toBe(43);
  });

  it("handles multiple races correctly", () => {
    const data = [
      {
        raceName: "Race 1",
        race1: [
          { position: "1", points: 10, Driver: { driverId: "d1" }, Constructor: { constructorId: "t1" } },
        ],
      },
      {
        raceName: "Race 2",
        race1: [
          { position: "2", points: 8, Driver: { driverId: "d1" }, Constructor: { constructorId: "t1" } },
        ],
      },
    ];
    const { driverPointsByRace } = buildRacePointsMaps(data);
    const rows = driverPointsByRace.get("d1");
    expect(rows).toHaveLength(2);
    expect(rows[0].total).toBe(10);
    expect(rows[1].total).toBe(8);
  });

  it("skips non-array race key values", () => {
    const data = [{ raceName: "Race 1", race1: "invalid" }];
    const { driverPointsByRace } = buildRacePointsMaps(data);
    expect(driverPointsByRace.size).toBe(0);
  });
});

describe("DEFAULT_RACE_KEY_LABELS", () => {
  it("has labels for all race keys", () => {
    expect(DEFAULT_RACE_KEY_LABELS.race1).toBe("Sprint");
    expect(DEFAULT_RACE_KEY_LABELS.race2).toBe("Feature");
    expect(DEFAULT_RACE_KEY_LABELS.race0).toBe("FR*");
    expect(DEFAULT_RACE_KEY_LABELS.race3).toBe("R3");
  });
});
