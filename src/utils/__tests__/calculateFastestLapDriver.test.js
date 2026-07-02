import { describe, it, expect } from "vitest";
import { calculateFastestLapDriver } from "../calculateFastestLapDriver.js";

describe("calculateFastestLapDriver", () => {
  it("returns null for undefined input", () => {
    expect(calculateFastestLapDriver(undefined, 10)).toBeNull();
  });

  it("returns null for non-array input", () => {
    expect(calculateFastestLapDriver("not-array", 10)).toBeNull();
  });

  it("returns null for an empty results array", () => {
    expect(calculateFastestLapDriver([], 10)).toBeNull();
  });

  it("returns the driver number with the fastest lap among eligible positions", () => {
    const results = [
      { position: "1", number: "44", FastestLap: { Time: { time: "1:32.500" } } },
      { position: "2", number: "33", FastestLap: { Time: { time: "1:31.800" } } },
      { position: "3", number: "77", FastestLap: { Time: { time: "1:33.100" } } },
    ];
    expect(calculateFastestLapDriver(results, 10)).toBe("33");
  });

  it("excludes drivers outside the eligible position limit", () => {
    const results = [
      { position: "1", number: "44", FastestLap: { Time: { time: "1:35.000" } } },
      { position: "11", number: "33", FastestLap: { Time: { time: "1:30.000" } } },
    ];
    expect(calculateFastestLapDriver(results, 10)).toBe("44");
  });

  it("ignores results without a fastest lap time", () => {
    const results = [
      { position: "1", number: "44" },
      { position: "2", number: "33", FastestLap: { Time: { time: "1:31.800" } } },
    ];
    expect(calculateFastestLapDriver(results, 10)).toBe("33");
  });

  it("ignores results with invalid position", () => {
    const results = [
      { position: "DNF", number: "44", FastestLap: { Time: { time: "1:30.000" } } },
      { position: "2", number: "33", FastestLap: { Time: { time: "1:31.800" } } },
    ];
    expect(calculateFastestLapDriver(results, 10)).toBe("33");
  });

  it("handles a single eligible driver", () => {
    const results = [
      { position: "1", number: "7", FastestLap: { Time: { time: "1:28.123" } } },
    ];
    expect(calculateFastestLapDriver(results, 1)).toBe("7");
  });

  it("returns null when no driver has a valid fastest lap", () => {
    const results = [
      { position: "1", number: "44" },
      { position: "2", number: "33", FastestLap: {} },
    ];
    expect(calculateFastestLapDriver(results, 10)).toBeNull();
  });

  it("correctly parses lap times with minutes, seconds, and milliseconds", () => {
    const results = [
      { position: "1", number: "1", FastestLap: { Time: { time: "1:30.500" } } },
      { position: "2", number: "2", FastestLap: { Time: { time: "1:30.499" } } },
    ];
    expect(calculateFastestLapDriver(results, 10)).toBe("2");
  });

  it("respects a tight eligible limit of 1", () => {
    const results = [
      { position: "1", number: "44", FastestLap: { Time: { time: "1:35.000" } } },
      { position: "2", number: "33", FastestLap: { Time: { time: "1:30.000" } } },
    ];
    expect(calculateFastestLapDriver(results, 1)).toBe("44");
  });
});
