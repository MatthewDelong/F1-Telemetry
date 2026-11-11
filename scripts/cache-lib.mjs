// Pure helpers used by build-cache.mjs (kept separate so they can be tested without the network).
export const parseTime = (t) => {
  if (!t) return null;
  const p = String(t).split(':').map(Number);
  const v = p.length === 2 ? p[0] * 60 + p[1] : p[0];
  return Number.isFinite(v) ? v : null;
};

export const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// laps:  [{ driverId, lap, position, time }]   stops: [{ driverId, lap, duration }]
// Pace uses a driver's median lap, ignoring lap 1, pit in/out laps and anything over 7% slower than their median
// (safety cars, yellow flags). Winner = whoever was P1 on the last lap.
export function raceStats(laps, stops) {
  const by = {};
  for (const l of laps) (by[l.driverId] ??= { laps: [], stops: [] }).laps.push(l);
  for (const s of stops) (by[s.driverId] ??= { laps: [], stops: [] }).stops.push(s);
  const lastLap = laps.reduce((m, l) => Math.max(m, l.lap), 0);
  const drivers = {};
  for (const [id, d] of Object.entries(by)) {
    const pitLaps = new Set(d.stops.flatMap((s) => [s.lap, s.lap + 1]));
    const all = d.laps.map((l) => parseTime(l.time)).filter((x) => x != null);
    const racing = d.laps.filter((l) => l.lap > 1 && !pitLaps.has(l.lap)).map((l) => parseTime(l.time)).filter((x) => x != null);
    const first = median(racing);
    const clean = first == null ? [] : racing.filter((x) => x <= first * 1.07);
    const round3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000);
    drivers[id] = {
      laps: d.laps.length,
      lapsLed: d.laps.filter((l) => l.position === 1).length,
      bestLap: round3(all.length ? Math.min(...all) : null),
      medianLap: round3(median(clean)),
      stops: d.stops.map((s) => ({ lap: s.lap, seconds: parseTime(s.duration) })),
    };
  }
  const winner = laps.find((l) => l.lap === lastLap && l.position === 1)?.driverId ?? null;
  return { drivers, winner };
}

export function weatherSummary(rows) {
  if (!rows?.length) return null;
  const range = (k) => {
    const v = rows.map((r) => r[k]).filter(Number.isFinite);
    return v.length ? [Math.round(Math.min(...v)), Math.round(Math.max(...v))] : [null, null];
  };
  const [airMin, airMax] = range('air_temperature');
  const [trackMin, trackMax] = range('track_temperature');
  return { airMin, airMax, trackMin, trackMax, rain: rows.some((r) => r.rainfall > 0) };
}

// ---- Season data (standings plus every driver's results, qualifying and sprints) ----
// Jolpica splits long lists across pages, so one race can arrive in several pieces. Join them by round.
export function mergeRaces(races, key) {
  const by = new Map();
  for (const r of races) {
    const m = by.get(r.round) ?? { round: r.round, raceName: r.raceName, date: r.date, [key]: [] };
    m[key].push(...(r[key] ?? []));
    by.set(r.round, m);
  }
  return [...by.values()].sort((a, b) => a.round - b.round);
}

const team = (c, withName = true) => (withName ? { constructorId: c.constructorId, name: c.name } : { constructorId: c.constructorId });
const trimResult = (x) => ({ grid: x.grid, position: x.position, points: x.points, status: x.status,
  ...(x.FastestLap?.rank ? { FastestLap: { rank: x.FastestLap.rank } } : {}), Constructor: team(x.Constructor) });
const trimQuali = (x) => ({ position: x.position, Q3: x.Q3 ?? '', Constructor: team(x.Constructor, false) });
const trimSprint = (x) => ({ position: x.position, points: x.points });
const trimDriver = (d) => ({ driverId: d.driverId, code: d.code, permanentNumber: d.permanentNumber, givenName: d.givenName, familyName: d.familyName, nationality: d.nationality });

// Same shape as the live API (trimmed to the fields the site reads), so the site can use it unchanged.
export function buildSeasonData({ standings, resultRaces, qualiRaces, sprintRaces }) {
  const drivers = {};
  const add = (races, key, field, trim) => {
    for (const race of races) for (const x of race[key]) {
      const d = (drivers[x.Driver.driverId] ??= { results: [], quali: [], sprints: [] });
      d[field].push({ round: race.round, raceName: race.raceName, date: race.date, [key]: [trim(x)] });
    }
  };
  add(resultRaces, 'Results', 'results', trimResult);
  add(qualiRaces, 'QualifyingResults', 'quali', trimQuali);
  add(sprintRaces, 'SprintResults', 'sprints', trimSprint);
  return {
    lastRound: resultRaces.reduce((m, r) => Math.max(m, +r.round), 0),
    standings: standings.map((s) => ({ position: s.position, points: s.points, wins: s.wins, Driver: trimDriver(s.Driver), Constructors: s.Constructors.map((c) => team(c)) })),
    drivers,
  };
}
