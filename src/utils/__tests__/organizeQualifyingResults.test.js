import { describe, it, expect } from "vitest";
import { organizeQualifyingResults } from "../organizeQualifyingResults.js";

describe("organizeQualifyingResults", () => {
  const makeDriver = (pos, q1, q2, q3) => {
    const d = { position: String(pos) };
    if (q1 !== undefined) d.Q1 = q1;
    if (q2 !== undefined) d.Q2 = q2;
    if (q3 !== undefined) d.Q3 = q3;
    return d;
  };

  it("returns empty arrays when given an empty input", () => {
    const { q1Results, q2Results, q3Results } = organizeQualifyingResults([]);
    expect(q1Results).toEqual([]);
    expect(q2Results).toEqual([]);
    expect(q3Results).toEqual([]);
  });

  it("places drivers with only Q1 into q1Results only", () => {
    const drivers = [makeDriver(16, "1:32.000")];
    const { q1Results, q2Results, q3Results } = organizeQualifyingResults(drivers);
    expect(q1Results).toHaveLength(1);
    expect(q2Results).toHaveLength(0);
    expect(q3Results).toHaveLength(0);
  });

  it("places drivers with Q1 and Q2 into both q1 and q2 results", () => {
    const drivers = [makeDriver(11, "1:32.000", "1:31.500")];
    const { q1Results, q2Results, q3Results } = organizeQualifyingResults(drivers);
    expect(q1Results).toHaveLength(1);
    expect(q2Results).toHaveLength(1);
    expect(q3Results).toHaveLength(0);
  });

  it("places drivers with Q1, Q2, and Q3 into all three groups", () => {
    const drivers = [makeDriver(1, "1:32.000", "1:31.000", "1:30.000")];
    const { q1Results, q2Results, q3Results } = organizeQualifyingResults(drivers);
    expect(q1Results).toHaveLength(1);
    expect(q2Results).toHaveLength(1);
    expect(q3Results).toHaveLength(1);
  });

  it("sorts results by position in ascending order", () => {
    const drivers = [
      makeDriver(3, "1:33.000", "1:32.500", "1:32.000"),
      makeDriver(1, "1:31.000", "1:30.500", "1:30.000"),
      makeDriver(2, "1:32.000", "1:31.500", "1:31.000"),
    ];
    const { q3Results } = organizeQualifyingResults(drivers);
    expect(q3Results.map(d => d.position)).toEqual(["1", "2", "3"]);
  });

  it("handles mixed qualifying stages correctly", () => {
    const drivers = [
      makeDriver(1, "1:30.000", "1:29.500", "1:29.000"),
      makeDriver(11, "1:31.000", "1:30.500"),
      makeDriver(16, "1:32.000"),
    ];
    const { q1Results, q2Results, q3Results } = organizeQualifyingResults(drivers);
    expect(q1Results).toHaveLength(3);
    expect(q2Results).toHaveLength(2);
    expect(q3Results).toHaveLength(1);
  });

  it("excludes Q3 drivers who lack Q2 participation", () => {
    const drivers = [makeDriver(1, "1:30.000", undefined, "1:29.000")];
    const { q3Results } = organizeQualifyingResults(drivers);
    expect(q3Results).toHaveLength(0);
  });

  it("assigns position 999 for invalid position strings during sort", () => {
    const drivers = [
      makeDriver("", "1:32.000"),
      makeDriver(1, "1:30.000"),
    ];
    const { q1Results } = organizeQualifyingResults(drivers);
    expect(q1Results[0].position).toBe("1");
  });
});
