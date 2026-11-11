// Jolpica-F1 (Ergast successor) for results; OpenF1 for tyres.
const BASE = 'https://api.jolpi.ca/ergast/f1';
export const OPENF1 = import.meta.env.VITE_OPENF1_BASE || 'https://openf1-proxy.matthew-delong73.workers.dev';

// Small queue: 3 requests at a time, retry on 429, cache everything.
const cache = new Map(); const waiting = []; let active = 0;
const slot = () => new Promise((res) => { const go = () => { active++; res(); }; active < 3 ? go() : waiting.push(go); });
const free = () => { active--; waiting.shift()?.(); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastStart = 0;

// Retries on network failures too: when the API sends an error without CORS headers the browser
// hides the status and just throws, so a 429 can look like a CORS failure.
async function fetchJson(url, tries = 3) {
  await slot();
  let res = null;
  try {
    const startAt = Math.max(Date.now(), lastStart + 250); // stay under the API's burst limit
    lastStart = startAt;
    await sleep(startAt - Date.now());
    res = await fetch(url);
  } catch { res = null; } finally { free(); }
  if ((!res || res.status === 429 || res.status >= 500) && tries > 0) {
    await sleep(1500 * (4 - tries));
    return fetchJson(url, tries - 1);
  }
  if (!res) throw new Error("Couldn't reach the F1 data service. It may be busy or limiting requests. Try again in a minute.");
  if (!res.ok) throw new Error(`The data service returned ${res.status}. Try again in a moment.`);
  return res.json();
}
// Past seasons never change, so they stay cached. Anything else expires after 15 minutes.
const MAX_AGE = 15 * 60 * 1000;
const isPastSeason = (url) => {
  const y = url.match(/\/f1\/(\d{4})\//)?.[1];
  return y && +y < new Date().getFullYear();
};
async function cached(url, pick) {
  const hit = cache.get(url);
  if (hit && (isPastSeason(url) || Date.now() - hit.at < MAX_AGE)) return hit.value;
  const value = fetchJson(url).then(pick).catch((e) => { cache.delete(url); throw e; });
  cache.set(url, { at: Date.now(), value });
  return value;
}
const jget = (path) => cached(BASE + path, (j) => j.MRData);

// Pre-built files (made by scripts/build-cache.mjs) come first, so most page loads make no API calls.
// A missing file falls back to the live API. "no-cache" makes the browser check for a newer copy each visit.
const files = new Map();
function staticJson(path) {
  if (!files.has(path)) {
    files.set(path, fetch(`${import.meta.env.BASE_URL}stats_cache/${path}`, { cache: 'no-cache' })
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
      .catch(() => null));
  }
  return files.get(path);
}
const loadSeason = (season) => staticJson(`${season}/season.json`);
const of1 = (path) => cached(OPENF1 + path, (j) => j);

export async function getStandings(season) {
  const c = await loadSeason(season);
  if (c?.standings?.length) return c.standings;
  const d = await jget(`/${season}/driverstandings.json?limit=100`);
  return d.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
}
export async function getConstructorStandings(season) {
  const cachedSeason = await loadSeason(season);
  if (cachedSeason?.drivers) {
    const constructors = new Map();
    const getConstructor = constructor => {
      if (!constructors.has(constructor.constructorId)) {
        constructors.set(constructor.constructorId, {
          Constructor: constructor, points: 0, wins: 0,
        });
      }
      return constructors.get(constructor.constructorId);
    };
    const sprintTeams = new Map();
    for (const [driverId, data] of Object.entries(cachedSeason.drivers)) {
      for (const race of data.results) {
        const result = race.Results[0];
        const entry = getConstructor(result.Constructor);
        entry.points += Number(result.points) || 0;
        if (String(result.position) === '1') entry.wins++;
        sprintTeams.set(`${race.round}:${driverId}`, result.Constructor);
      }
    }
    for (const [driverId, data] of Object.entries(cachedSeason.drivers)) {
      for (const race of data.sprints) {
        const constructor = sprintTeams.get(`${race.round}:${driverId}`);
        if (constructor) getConstructor(constructor).points += Number(race.SprintResults[0].points) || 0;
      }
    }
    if (constructors.size) {
      return [...constructors.values()]
        .sort((a, b) => b.points - a.points || b.wins - a.wins)
        .map((entry, index) => ({
          ...entry,
          position: String(index + 1),
          positionText: String(index + 1),
          points: String(entry.points),
          wins: String(entry.wins),
        }));
    }
  }
  const d = await jget(`/${season}/constructorstandings.json?limit=100`);
  return d.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
}
export async function getConstructorSeason(season, constructorId) {
  const cachedSeason = await loadSeason(season);
  if (cachedSeason?.drivers) {
    const drivers = new Map((cachedSeason.standings ?? []).map(({ Driver }) => [Driver.driverId, Driver]));
    const rounds = new Map();
    const add = (race, key, item) => {
      const round = rounds.get(race.round) ?? {
        round: race.round, raceName: race.raceName, date: race.date,
        Results: [], QualifyingResults: [], SprintResults: [],
      };
      round[key].push(item);
      rounds.set(race.round, round);
    };
    const selectedEntries = new Set();
    for (const [driverId, data] of Object.entries(cachedSeason.drivers)) {
      const Driver = drivers.get(driverId) ?? { driverId };
      for (const race of data.results) {
        const result = race.Results[0];
        if (result.Constructor.constructorId !== constructorId) continue;
        selectedEntries.add(`${race.round}:${driverId}`);
        add(race, 'Results', { ...result, Driver });
      }
      for (const race of data.quali) {
        const qualifying = race.QualifyingResults[0];
        if (qualifying.Constructor.constructorId === constructorId) {
          add(race, 'QualifyingResults', { ...qualifying, Driver });
        }
      }
      for (const race of data.sprints) {
        if (selectedEntries.has(`${race.round}:${driverId}`)) {
          add(race, 'SprintResults', { ...race.SprintResults[0], Driver });
        }
      }
    }
    const races = [...rounds.values()].sort((a, b) => Number(a.round) - Number(b.round));
    return {
      results: races.filter(race => race.Results.length).map(({ round, raceName, date, Results }) => ({ round, raceName, date, Results })),
      quali: races.filter(race => race.QualifyingResults.length).map(({ round, raceName, date, QualifyingResults }) => ({ round, raceName, date, QualifyingResults })),
      sprints: races.filter(race => race.SprintResults.length).map(({ round, raceName, date, SprintResults }) => ({ round, raceName, date, SprintResults })),
    };
  }

  const b = `/${season}/constructors/${constructorId}`;
  const [results, quali, sprints] = await Promise.all([
    jget(`${b}/results.json?limit=100`),
    jget(`${b}/qualifying.json?limit=100`),
    jget(`${b}/sprint.json?limit=100`),
  ]);
  return {
    results: results.RaceTable.Races,
    quali: quali.RaceTable.Races,
    sprints: sprints.RaceTable.Races,
  };
}
export async function getDrivers(season) {
  const d = await jget(`/${season}/drivers.json?limit=100`);
  return d.DriverTable.Drivers.map((Driver) => ({ Driver, Constructors: [], points: '0', position: '-' }));
}
export async function getDriverSeason(season, id) {
  const c = await loadSeason(season);
  if (c?.drivers) return c.drivers[id] ?? { results: [], quali: [], sprints: [] };
  const b = `/${season}/drivers/${id}`;
  const [r, q, s] = await Promise.all([jget(`${b}/results.json?limit=100`), jget(`${b}/qualifying.json?limit=100`), jget(`${b}/sprint.json?limit=100`)]);
  return { results: r.RaceTable.Races, quali: q.RaceTable.Races, sprints: s.RaceTable.Races };
}

// Career totals use the API's "total" count, so no race data is downloaded.
export async function getCareer(id) {
  const c = await staticJson('career.json');
  if (c?.drivers?.[id]) return c.drivers[id];
  const n = async (p) => +(await jget(`${p}?limit=1`)).total;
  const [starts, w, p2, p3, poles] = await Promise.all([
    n(`/drivers/${id}/results.json`), n(`/drivers/${id}/results/1.json`), n(`/drivers/${id}/results/2.json`),
    n(`/drivers/${id}/results/3.json`), n(`/drivers/${id}/qualifying/1.json`),
  ]);
  return { starts, wins: w, podiums: w + p2 + p3, poles };
}

export async function getTeamSeason(season, constructorId) {
  const c = await loadSeason(season);
  if (c?.drivers) {
    // Rebuild the team's results from each driver's own results.
    const results = new Map(); const quali = new Map();
    const push = (map, race, key, item) => {
      const m = map.get(race.round) ?? { round: race.round, [key]: [] };
      m[key].push(item); map.set(race.round, m);
    };
    for (const [driverId, d] of Object.entries(c.drivers)) {
      for (const race of d.results) { const x = race.Results[0]; if (x.Constructor.constructorId === constructorId) push(results, race, 'Results', { Driver: { driverId }, position: x.position }); }
      for (const race of d.quali) { const x = race.QualifyingResults[0]; if (x.Constructor?.constructorId === constructorId) push(quali, race, 'QualifyingResults', { Driver: { driverId }, position: x.position }); }
    }
    return { results: [...results.values()], quali: [...quali.values()] };
  }
  const b = `/${season}/constructors/${constructorId}`;
  const [r, q] = await Promise.all([jget(`${b}/results.json?limit=100`), jget(`${b}/qualifying.json?limit=100`)]);
  return { results: r.RaceTable.Races, quali: q.RaceTable.Races };
}

// One race, one driver: lap-by-lap positions and pit stops. Two requests per race.
export async function getRaceDetail(season, round, id) {
  const b = `/${season}/${round}/drivers/${id}`;
  const [l, p] = await Promise.all([jget(`${b}/laps.json?limit=100`), jget(`${b}/pitstops.json?limit=100`)]);
  return { laps: l.RaceTable.Races[0]?.Laps ?? [], stops: p.RaceTable.Races[0]?.PitStops ?? [] };
}

// Tyre stints from OpenF1, matched to Jolpica rounds by race date.
export async function getStints(season, rounds, driver) {
  const sessions = await of1(`/v1/sessions?year=${season}&session_name=Race`);
  if (!Array.isArray(sessions) || !sessions.length) throw new Error('No OpenF1 sessions');
  const drivers = await of1(`/v1/drivers?session_key=${sessions[0].session_key}`);
  const number = drivers.find((d) => d.name_acronym === driver.code)?.driver_number ?? driver.permanentNumber;
  const out = {};
  await Promise.all(rounds.map(async (r) => {
    const t = new Date(r.date).getTime();
    const s = sessions.find((x) => Math.abs(new Date(x.date_start) - t) < 2 * 864e5);
    if (!s) return;
    const st = await of1(`/v1/stints?session_key=${s.session_key}&driver_number=${number}`).catch(() => []);
    out[r.round] = [...st].sort((a, b) => a.stint_number - b.stint_number);
  }));
  return out;
}
