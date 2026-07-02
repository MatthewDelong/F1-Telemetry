import { describe, it, expect } from "vitest";
import { calculateSeriesPoints2025 } from "../calculateSeriesPoints2025.js";

const makeResult = (pos, driverId, code, constructorId, opts = {}) => ({
  position: String(pos),
  number: opts.number || driverId,
  grid: opts.grid || String(pos),
  Driver: { driverId, code, givenName: code, familyName: driverId },
  Constructor: { constructorId, name: constructorId },
  FastestLap: opts.fastestLap ? { Time: { time: opts.fastestLap } } : undefined,
});

describe("calculateSeriesPoints2025 – F2", () => {
  it("returns empty standings for no races", () => {
    const { formattedDrivers, formattedConstructors } = calculateSeriesPoints2025([], "F2");
    expect(formattedDrivers).toEqual([]);
    expect(formattedConstructors).toEqual([]);
  });

  it("awards feature race points correctly (25-18-15-12-10-8-6-4-2-1)", () => {
    const race = {
      season: 2025,
      race1: [makeResult(1, "d1", "D1", "t1")],
      race2: [makeResult(1, "d2", "D2", "t2")],
    };
    const { formattedDrivers } = calculateSeriesPoints2025([race], "F2");
    const d1 = formattedDrivers.find(d => d.driverId === "d1");
    const d2 = formattedDrivers.find(d => d.driverId === "d2");
    expect(d1.points).toBe(10); // sprint P1
    expect(d2.points).toBe(25 + 2); // feature P1 + pole bonus
  });

  it("awards sprint race points correctly (10-8-6-5-4-3-2-1)", () => {
    const race = {
      season: 2025,
      race1: [
        makeResult(1, "d1", "D1", "t1"),
        makeResult(2, "d2", "D2", "t2"),
        makeResult(3, "d3", "D3", "t3"),
      ],
      race2: [],
    };
    const { formattedDrivers } = calculateSeriesPoints2025([race], "F2");
    // With only race1 and no race2, it's a single-race event -> feature points
    const d1 = formattedDrivers.find(d => d.driverId === "d1");
    const d2 = formattedDrivers.find(d => d.driverId === "d2");
    const d3 = formattedDrivers.find(d => d.driverId === "d3");
    expect(d1.points).toBe(25 + 2); // feature P1 + pole bonus (single race event)
    expect(d2.points).toBe(18);
    expect(d3.points).toBe(15);
  });

  it("awards fastest lap point to the eligible driver", () => {
    const race = {
      season: 2025,
      race1: [
        makeResult(1, "d1", "D1", "t1", { fastestLap: "1:30.000", number: "1" }),
        makeResult(2, "d2", "D2", "t2", { fastestLap: "1:29.500", number: "2" }),
      ],
      race2: [
        makeResult(1, "d1", "D1", "t1", { fastestLap: "1:31.000", number: "1" }),
        makeResult(2, "d2", "D2", "t2", { fastestLap: "1:30.000", number: "2" }),
      ],
    };
    const { formattedDrivers } = calculateSeriesPoints2025([race], "F2");
    const d2 = formattedDrivers.find(d => d.driverId === "d2");
    // Sprint: d2 has fastest lap (1:29.500) and is P2 (within limit 10) -> +1
    // Feature: d2 has fastest lap (1:30.000) and is P2 (within limit 10) -> +1
    // Sprint P2: 8, Feature P2: 18, 2 fastest lap points = 28
    expect(d2.points).toBe(28);
  });

  it("awards pole bonus (2 points) to the P1 grid driver in the feature race", () => {
    const race = {
      season: 2025,
      race1: [makeResult(2, "d1", "D1", "t1")],
      race2: [
        makeResult(1, "d1", "D1", "t1", { grid: "1" }),
        makeResult(2, "d2", "D2", "t2", { grid: "2" }),
      ],
    };
    const { formattedDrivers } = calculateSeriesPoints2025([race], "F2");
    const d1 = formattedDrivers.find(d => d.driverId === "d1");
    // Sprint P2: 8, Feature P1: 25, Pole bonus: 2 = 35
    expect(d1.points).toBe(35);
  });

  it("accumulates constructor points from multiple drivers", () => {
    const race = {
      season: 2025,
      race1: [
        makeResult(1, "d1", "D1", "team_a"),
        makeResult(2, "d2", "D2", "team_a"),
      ],
      race2: [
        makeResult(1, "d1", "D1", "team_a", { grid: "1" }),
        makeResult(2, "d2", "D2", "team_a"),
      ],
    };
    const { formattedConstructors } = calculateSeriesPoints2025([race], "F2");
    const teamA = formattedConstructors.find(c => c.constructorId === "team_a");
    // Sprint: 10 + 8 = 18, Feature: 25 + 18 = 43, Pole: 2 = 63
    expect(teamA.points).toBe(63);
  });

  it("sorts drivers by points descending", () => {
    const race = {
      season: 2025,
      race1: [],
      race2: [
        makeResult(1, "winner", "WIN", "t1", { grid: "1" }),
        makeResult(10, "loser", "LOS", "t2", { grid: "10" }),
      ],
    };
    const { formattedDrivers } = calculateSeriesPoints2025([race], "F2");
    expect(formattedDrivers[0].driverId).toBe("winner");
    expect(formattedDrivers[0].points).toBeGreaterThan(formattedDrivers[1].points);
  });
});

describe("calculateSeriesPoints2025 – F1A", () => {
  it("excludes wildcard drivers from constructor points", () => {
    const race = {
      season: 2025,
      race1: [],
      race2: [
        makeResult(1, "regular", "REG", "team_a", { grid: "1" }),
        makeResult(2, "wildcard", "SHI", "team_a", { grid: "2" }),
      ],
    };
    const { formattedConstructors, formattedDrivers } = calculateSeriesPoints2025([race], "F1A");
    const teamA = formattedConstructors.find(c => c.constructorId === "team_a");
    // Only regular driver's 25 points + 2 pole bonus should count for the constructor
    expect(teamA.points).toBe(27);
    // But both drivers get individual points
    const wildcard = formattedDrivers.find(d => d.driverId === "wildcard");
    expect(wildcard.points).toBe(18);
  });

  it("handles single-race event (race1 only, no race2) for F1A", () => {
    const race = {
      season: 2025,
      race1: [
        makeResult(1, "d1", "D1", "t1"),
        makeResult(2, "d2", "D2", "t2"),
      ],
    };
    const { formattedDrivers } = calculateSeriesPoints2025([race], "F1A");
    const d1 = formattedDrivers.find(d => d.driverId === "d1");
    // Single race event uses feature points: P1 = 25 + 2 pole bonus = 27
    expect(d1.points).toBe(27);
  });
});
