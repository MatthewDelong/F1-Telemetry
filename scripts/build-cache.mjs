// Builds public/stats_cache/<season>/<round>.json for every finished race, so the live site reads static files
// instead of calling the APIs. Run it after each race, then rebuild and upload the site.   (Node 18+)
//   node scripts/build-cache.mjs            current season
//   node scripts/build-cache.mjs 2025       another season
//   --force        rebuild races that already have a file
//   --no-openf1    skip tyres and weather (Jolpica data only)
//   --no-career    skip career totals
// Also writes <season>/season.json (standings and every driver's results, qualifying and sprints) and
// career.json (career totals), so the site needs almost no live API calls.
// It can be stopped and run again: finished races are kept, and it skips them next time.
// Paid OpenF1 account (optional): set OPENF1_USERNAME and OPENF1_PASSWORD in your terminal before running, never in a file.
// The script then signs in and runs faster. Without them it uses the free rate (one OpenF1 request every ~2 seconds).
// OPENF1_GAP_MS overrides the delay between OpenF1 requests.
import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import { raceStats, weatherSummary, mergeRaces, buildSeasonData } from './cache-lib.mjs';

const JOLPICA = 'https://api.jolpi.ca/ergast/f1';
const OPENF1 = 'https://api.openf1.org';
const GAP = { [JOLPICA]: 300, [OPENF1]: Number(process.env.OPENF1_GAP_MS) || 2200 };

const args = process.argv.slice(2);
const season = Number(args.find((a) => /^\d{4}$/.test(a))) || new Date().getFullYear();
const force = args.includes('--force');
const useOpenF1 = !args.includes('--no-openf1');
const useCareer = !args.includes('--no-career');
const dir = `public/stats_cache/${season}`;

class Throttled extends Error {}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);
const lastCall = {};
let token = null;

async function login() {
  const { OPENF1_USERNAME: username, OPENF1_PASSWORD: password } = process.env;
  if (!username || !password) return;
  token = null;
  try {
    const res = await fetch(`${OPENF1}/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ username, password }) });
    if (res.ok) token = (await res.json()).access_token ?? null;
  } catch { /* fall back to the free rate */ }
  console.log(token ? 'OpenF1: signed in, using the faster paid rate.\n' : 'OpenF1: sign-in failed, using the free rate.\n');
  if (token && !process.env.OPENF1_GAP_MS) GAP[OPENF1] = 400;
}

async function get(base, path) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = Math.max(0, (lastCall[base] ?? 0) + GAP[base] - Date.now());
    lastCall[base] = Date.now() + wait;
    await sleep(wait);
    const headers = { 'User-Agent': 'f1-driver-stats-cache', ...(base === OPENF1 && token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(base + path, { headers }).catch(() => null);
    if (res?.ok) return res.json();
    if (res?.status === 401 && base === OPENF1 && attempt === 0) { await login(); continue; } // token expired
    if (res && res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${base}${path}`);
    await sleep(5000 * (attempt + 1));
  }
  throw new Throttled(path);
}

const letters = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

async function getLaps(round) {
  const laps = [];
  for (let offset = 0; ; offset += 100) {
    const m = (await get(JOLPICA, `/${season}/${round}/laps.json?limit=100&offset=${offset}`)).MRData;
    for (const l of m.RaceTable.Races[0]?.Laps ?? [])
      for (const t of l.Timings) laps.push({ driverId: t.driverId, lap: +l.number, position: +t.position, time: t.time });
    if (offset + 100 >= +m.total) break;
  }
  return laps;
}

async function getStops(round) {
  const m = (await get(JOLPICA, `/${season}/${round}/pitstops.json?limit=100`)).MRData;
  return (m.RaceTable.Races[0]?.PitStops ?? []).map((s) => ({ driverId: s.driverId, lap: +s.lap, duration: s.duration }));
}

async function getAll(path) {
  const races = [];
  for (let offset = 0; ; offset += 100) {
    const m = (await get(JOLPICA, `${path}?limit=100&offset=${offset}`)).MRData;
    races.push(...m.RaceTable.Races);
    if (offset + 100 >= +m.total) break;
  }
  return races;
}

const readJson = async (file) => (await exists(file) ? JSON.parse(await readFile(file, 'utf8')) : null);

// Standings and every driver's results for the season, about a dozen requests. Past seasons are built once;
// the current season is rebuilt every run and only written when something changed.
async function buildSeasonFile() {
  const file = `${dir}/season.json`;
  const current = season >= new Date().getFullYear();
  if (!force && !current && (await exists(file))) { console.log('have   season data'); return false; }
  const standings = (await get(JOLPICA, `/${season}/driverstandings.json?limit=100`)).MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  if (!standings.length) { console.log('wait   season data (no standings yet)'); return false; }
  const data = buildSeasonData({
    standings,
    resultRaces: mergeRaces(await getAll(`/${season}/results.json`), 'Results'),
    qualiRaces: mergeRaces(await getAll(`/${season}/qualifying.json`), 'QualifyingResults'),
    sprintRaces: mergeRaces(await getAll(`/${season}/sprint.json`), 'SprintResults'),
  });
  const old = await readJson(file);
  if (old && JSON.stringify({ ...old, built: 0 }) === JSON.stringify({ season, built: 0, ...data })) { console.log('same   season data'); return false; }
  await writeFile(file, JSON.stringify({ season, built: new Date().toISOString(), ...data }));
  console.log(`built  season data (through round ${data.lastRound})`);
  return true;
}

// Career totals use the API's "total" count, so each driver costs five small requests. Drivers already in the file
// are only refreshed when the current season changed; retired drivers never need it.
async function buildCareerFile(ids, refresh) {
  const file = 'public/stats_cache/career.json';
  const old = (await readJson(file)) ?? { drivers: {} };
  const drivers = { ...old.drivers };
  const todo = ids.filter((id) => refresh || !drivers[id]);
  console.log(`career ${ids.length} drivers in ${season}, ${todo.length} not in career.json yet`);
  if (!todo.length) return;
  const count = async (p) => +(await get(JOLPICA, `${p}?limit=1`)).MRData.total;
  const countPoles = async (id) => {
    const races = (await get(JOLPICA, `/drivers/${id}/qualifying/1.json?limit=200`)).MRData.RaceTable.Races;
    return races.filter((r) => r.QualifyingResults?.[0]?.position === '1').length;
  };
  const countSprints = async (id) => {
    const races = (await get(JOLPICA, `/drivers/${id}/sprint.json?limit=100`)).MRData.RaceTable.Races;
    const sprints = races.map((r) => r.SprintResults?.[0]).filter(Boolean);
    return {
      sprintStarts: sprints.length,
      sprintWins: sprints.filter((s) => s.position === '1').length,
      sprintPodiums: sprints.filter((s) => ['1', '2', '3'].includes(s.position)).length,
      sprintPoles: sprints.filter((s) => s.grid === '1').length,
    };
  };
  try {
    for (const id of todo) {
      const [starts, w, p2, p3, poles, sprintStats] = [
        await count(`/drivers/${id}/results.json`), await count(`/drivers/${id}/results/1.json`), await count(`/drivers/${id}/results/2.json`),
        await count(`/drivers/${id}/results/3.json`), await countPoles(id), await countSprints(id)];
      drivers[id] = { starts, wins: w, podiums: w + p2 + p3, poles, ...sprintStats };
      console.log(`career ${id}`);
    }
  } finally {
    const sorted = Object.fromEntries(Object.entries(drivers).sort(([a], [b]) => a.localeCompare(b)));
    if (JSON.stringify(sorted) !== JSON.stringify(old.drivers)) await writeFile(file, JSON.stringify({ updated: new Date().toISOString(), drivers: sorted }));
  }
}

async function addOpenF1(out, sessions, byCode, race) {
  const start = new Date(`${race.date}T${race.time ?? '12:00:00Z'}`).getTime();
  const s = sessions.find((x) => Math.abs(new Date(x.date_start) - start) < 2 * 864e5);
  if (!s) { console.log('        no OpenF1 session found'); return; }
  const key = s.session_key;
  const people = await get(OPENF1, `/v1/drivers?session_key=${key}`);
  const idByNumber = Object.fromEntries(people.map((p) => [p.driver_number, byCode[p.name_acronym]]));
  const stints = await get(OPENF1, `/v1/stints?session_key=${key}`);
  for (const st of stints) {
    const d = out.drivers[idByNumber[st.driver_number]];
    if (d) (d.stints ??= []).push({ stint_number: st.stint_number, lap_start: st.lap_start, lap_end: st.lap_end, compound: st.compound });
  }
  for (const d of Object.values(out.drivers)) d.stints?.sort((a, b) => a.stint_number - b.stint_number);
  out.weather = weatherSummary(await get(OPENF1, `/v1/weather?session_key=${key}`));
}

try {
  await mkdir(dir, { recursive: true });
  const races = (await get(JOLPICA, `/${season}.json?limit=100`)).MRData.RaceTable.Races;
  const finished = races.filter((r) => new Date(`${r.date}T${r.time ?? '23:00:00Z'}`).getTime() < Date.now() - 4 * 3600e3);
  const people = (await get(JOLPICA, `/${season}/drivers.json?limit=100`)).MRData.DriverTable.Drivers;
  const byCode = Object.fromEntries(people.map((d) => [(d.code || letters(d.familyName).slice(0, 3)).toUpperCase(), d.driverId]));

  let sessions = [];
  if (useOpenF1) {
    await login();
    try { sessions = await get(OPENF1, `/v1/sessions?year=${season}&session_name=Race`); }
    catch (e) { if (e instanceof Throttled) throw e; console.log('OpenF1 unavailable, continuing without tyres and weather.'); }
  }

  console.log(`${season}: ${finished.length} finished races of ${races.length}\n`);
  const seasonChanged = await buildSeasonFile();
  let built = 0;
  for (const race of finished) {
    const file = `${dir}/${race.round}.json`;
    if (!force && (await exists(file))) { console.log(`have   ${race.round} ${race.raceName}`); continue; }
    const laps = await getLaps(race.round);
    if (!laps.length) { console.log(`wait   ${race.round} ${race.raceName} (no lap data published yet)`); continue; }
    const out = { season, round: +race.round, name: race.raceName, date: race.date, built: new Date().toISOString(),
      ...raceStats(laps, await getStops(race.round)) };
    if (sessions.length) await addOpenF1(out, sessions, byCode, race).catch((e) => { if (e instanceof Throttled) throw e; console.log(`        OpenF1 failed: ${e.message}`); });
    await writeFile(file, JSON.stringify(out));
    built++;
    console.log(`built  ${race.round} ${race.raceName}`);
  }
  if (useCareer) {
    const season_ = await readJson(`${dir}/season.json`);
    if (season_) await buildCareerFile(season_.standings.map((s) => s.Driver.driverId), seasonChanged && season >= new Date().getFullYear());
  }
  console.log(`\nBuilt ${built} races.${built || seasonChanged ? ' Now run: npm run build, and upload the new dist folder.' : ''}`);
} catch (e) {
  if (!(e instanceof Throttled)) throw e;
  console.log('\nThe API is limiting requests. Finished races are saved. Run the script again in a little while.');
}
