export const lapTimeToMs = (lapTime) => {
  if (!lapTime || typeof lapTime !== "string") return Number.POSITIVE_INFINITY;
  const [minutesPart, secondsPart] = lapTime.split(":");
  const minutes = Number(minutesPart);
  const seconds = Number(secondsPart);
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return Number.POSITIVE_INFINITY;
  }
  return minutes * 60000 + seconds * 1000;
};

export const getFastestDriverCode = (results) => {
  if (!Array.isArray(results) || results.length === 0) return null;

  return results.reduce(
    (fastestCode, result) => {
      const lapTime = result?.FastestLap?.Time?.time;
      const ms = lapTimeToMs(lapTime);
      if (ms < fastestCode.ms) {
        return { code: result?.Driver?.code || null, ms };
      }
      return fastestCode;
    },
    { code: null, ms: Number.POSITIVE_INFINITY },
  ).code;
};

export const sortByPosition = (a, b) =>
  parseInt(a.position, 10) - parseInt(b.position, 10);
