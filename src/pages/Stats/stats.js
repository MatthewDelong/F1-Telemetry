const num = (v) => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; };
const isDnf = (s) => s && s !== 'Finished' && !/^\+\d+ Lap/.test(s);
const sum = (a) => a.reduce((x, y) => x + y, 0);

export function buildRounds({ results, quali, sprints }) {
  const rows = new Map();
  const row = (race) => {
    if (!rows.has(race.round)) rows.set(race.round, { round: +race.round, name: race.raceName, date: race.date, raced: false, grid: null, pos: null,
      points: 0, sprintPos: null, sprintPoints: 0, status: '', dnf: false, pole: false, qPos: null, q3: false, fastest: false });
    return rows.get(race.round);
  };
  results.forEach((race) => {
    const x = race.Results[0]; const o = row(race);
    Object.assign(o, { raced: true, grid: num(x.grid) || null, pos: num(x.position), points: +x.points, status: x.status, dnf: !!isDnf(x.status), fastest: x.FastestLap?.rank === '1' });
  });
  quali.forEach((race) => {
    const x = race.QualifyingResults[0]; const o = row(race);
    o.qPos = num(x.position); o.pole = o.qPos === 1; o.q3 = !!x.Q3;
  });
  sprints.forEach((race) => { const x = race.SprintResults[0]; const o = row(race); o.sprintPos = num(x.position); o.sprintPoints = +x.points; });
  return [...rows.values()].sort((a, b) => a.round - b.round);
}

export function totals(rounds) {
  const count = (fn) => rounds.filter(fn).length;
  const fin = rounds.filter((r) => r.pos != null).map((r) => r.pos);
  return {
    wins: count((r) => r.pos === 1), podiums: count((r) => r.pos != null && r.pos <= 3), poles: count((r) => r.pole),
    fastest: count((r) => r.fastest), dnfs: count((r) => r.dnf),
    sprintWins: count((r) => r.sprintPos === 1), sprintPodiums: count((r) => r.sprintPos != null && r.sprintPos <= 3),
    points: sum(rounds.map((r) => r.points + r.sprintPoints)), avgFinish: fin.length ? sum(fin) / fin.length : null,
  };
}

// Extra season stats, all from data already fetched.
export function detail(rounds) {
  const n = rounds.filter((r) => r.raced).length || 1;
  const classified = rounds.filter((r) => r.pos != null && !r.dnf);
  const avg = classified.length ? sum(classified.map((r) => r.pos)) / classified.length : null;
  const sd = avg == null ? null : Math.sqrt(sum(classified.map((r) => (r.pos - avg) ** 2)) / classified.length);
  const moved = rounds.filter((r) => r.grid && r.pos && !r.dnf);
  const gained = sum(moved.map((r) => r.grid - r.pos));
  const grids = rounds.filter((r) => r.grid).map((r) => r.grid);
  const poles = rounds.filter((r) => r.pole && r.raced);
  const byPts = rounds.filter((r) => r.raced).sort((a, b) => (b.points + b.sprintPoints) - (a.points + a.sprintPoints));
  const reasons = {};
  rounds.filter((r) => r.dnf).forEach((r) => { reasons[r.status] = (reasons[r.status] || 0) + 1; });
  return {
    best: classified.length ? Math.min(...classified.map((r) => r.pos)) : null,
    avgGrid: grids.length ? sum(grids) / grids.length : null, gained, avgGained: moved.length ? gained / moved.length : null,
    pointsRate: rounds.filter((r) => r.points > 0).length / n, podiumRate: rounds.filter((r) => r.pos != null && r.pos <= 3).length / n,
    poleToWin: poles.length ? poles.filter((r) => r.pos === 1).length : null, poleCount: poles.length,
    frontRows: rounds.filter((r) => r.grid && r.grid <= 2).length, q3: rounds.filter((r) => r.q3).length, qualified: rounds.filter((r) => r.qPos).length,
    consistency: sd, bestWeekend: byPts[0], worstWeekend: byPts[byPts.length - 1], reasons: Object.entries(reasons),
  };
}

export function cumulative(rounds) { let s = 0; return rounds.map((r) => (s += r.points + r.sprintPoints)); }
export function distribution(rounds) {
  const bins = Array.from({ length: 20 }, (_, i) => ({ label: `P${i + 1}`, count: 0 }));
  let dnf = 0;
  rounds.forEach((r) => { if (r.dnf) dnf++; else if (r.pos >= 1 && r.pos <= 20) bins[r.pos - 1].count++; });
  return [...bins, { label: 'DNF', count: dnf }];
}

// Who finished / qualified ahead of the teammate, round by round.
export function headToHead({ results, quali }, a, b) {
  const rows = (races, key) => races.map((r) => {
    const x = r[key]; const A = x.find((d) => d.Driver.driverId === a); const B = x.find((d) => d.Driver.driverId === b);
    return A && B ? { a: num(A.position), b: num(B.position) } : null;
  }).filter(Boolean);
  const tally = (rs) => ({ a: rs.filter((r) => r.a < r.b).length, b: rs.filter((r) => r.b < r.a).length });
  return { race: tally(rows(results, 'Results')), quali: tally(rows(quali, 'QualifyingResults')) };
}

// Pit stop and lap-by-lap helpers
const secs = (t) => { if (!t) return null; const p = t.split(':').map(Number); return p.length === 2 ? p[0] * 60 + p[1] : p[0]; };
export const lapsLed = (laps) => laps.filter((l) => l.Timings[0]?.position === '1').length;
export const stopTimes = (stops) => stops.map((s) => secs(s.duration)).filter((x) => x != null && x < 60);
export const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

const TEAM_COLORS_BY_YEAR = {
  2017: { ferrari: '#C30000', force_india: '#FF80C7', haas: '#6C0000', mclaren: '#FF7B08', mercedes: '#00CFBA', red_bull: '#00007D', renault: '#FFD800', sauber: '#006EFF', toro_rosso: '#0000FF', williams: '#FFFFFF' },
  2018: { ferrari: '#DC0000', force_india: '#F596C8', haas: '#5A5A5A', mclaren: '#FF8700', mercedes: '#00D2BE', red_bull: '#00327D', renault: '#FFF500', sauber: '#9B0000', toro_rosso: '#0032FF', williams: '#FFFFFF' },
  2019: { alfa: '#9B0000', ferrari: '#DC0000', haas: '#F0D787', mclaren: '#FF8700', mercedes: '#00D2BE', racing_point: '#F596C8', red_bull: '#1E41FF', renault: '#FFF500', toro_rosso: '#469BFF', williams: '#FFFFFF' },
  2020: { alfa: '#960000', alphatauri: '#C8C8C8', ferrari: '#C00000', haas: '#787878', renault: '#FFF500', mclaren: '#FF8700', mercedes: '#00D2BE', racing_point: '#F596C8', red_bull: '#0600EF', williams: '#0082FA' },
  2021: { alfa: '#900000', alphatauri: '#2B4562', alpine: '#0090FF', aston_martin: '#006F62', ferrari: '#DC0000', haas: '#FFFFFF', mclaren: '#FF8700', mercedes: '#00D2BE', red_bull: '#0600EF', williams: '#005AFF' },
  2022: { alfa: '#B12039', alphatauri: '#4E7C9B', alpine: '#2293D1', aston_martin: '#2D826D', ferrari: '#ED1C24', haas: '#B6BABD', mclaren: '#F58020', mercedes: '#6CD3BF', red_bull: '#1E5BC6', williams: '#37BEDD' },
  2023: { red_bull: '#3671C6', williams: '#37BEDD', mclaren: '#F58020', alpine: '#2293D1', aston_martin: '#358C75', ferrari: '#F91536', haas: '#B6BABD', alphatauri: '#5E8FAA', alfa: '#C92D4B', mercedes: '#6CD3BF' },
  2024: { red_bull: '#3671C6', williams: '#64C4FF', rb: '#6692FF', mclaren: '#FF8000', alpine: '#0093cc', aston_martin: '#229971', ferrari: '#E80020', haas: '#B6BABD', sauber: '#52E252', mercedes: '#27F4D2' },
  2025: { red_bull: '#3671C6', williams: '#64C4FF', rb: '#6692FF', mclaren: '#FF8000', alpine: '#0093cc', aston_martin: '#229971', ferrari: '#E80020', haas: '#B6BABD', sauber: '#52E252', mercedes: '#27F4D2' },
  2026: { red_bull: '#3671C6', williams: '#1868DB', rb: '#6692FF', mclaren: '#FF8000', alpine: '#00A1E8', aston_martin: '#229971', ferrari: '#E8002D', haas: '#DEE1E2', audi: '#FF2D00', mercedes: '#27F4D2', cadillac: '#AAAAAD' },
};
const TEAM_COLORS = { mercedes: '#27F4D2', ferrari: '#E8002D', red_bull: '#3671C6', mclaren: '#FF8000', aston_martin: '#229971', alpine: '#00A1E8',
  williams: '#64C4FF', rb: '#6692FF', haas: '#B6BABD', sauber: '#52E252', audi: '#FF2D00', cadillac: '#AAAAAD', alfa: '#C92D4B', alphatauri: '#5E8FAA',
  racing_point: '#F596C8', force_india: '#F596C8', renault: '#FFF500', toro_rosso: '#469BFF' };
export const teamColor = (id, season) => (season && TEAM_COLORS_BY_YEAR[season]?.[id]) ?? TEAM_COLORS[id] ?? '#3b82f6';

// Team logos: public/images/teams/<year>/<constructorId>.webp (or .png). Run scripts/download-team-logos.mjs.
export const teamLogoBase = (season, id) => `${import.meta.env.BASE_URL}images/teams/${season}/${id}`;

// Flags: public/images/flags/<code>.<ext> (the app tries png, svg, webp and jpg).
const NATIONALITY_CODES = {
  British: 'gb', Dutch: 'nl', Monegasque: 'mc', Spanish: 'es', Australian: 'au', Thai: 'th', Canadian: 'ca', Mexican: 'mx',
  German: 'de', French: 'fr', Japanese: 'jp', Finnish: 'fi', Chinese: 'cn', Danish: 'dk', Italian: 'it', Brazilian: 'br',
  Argentine: 'ar', Argentinian: 'ar', 'New Zealander': 'nz', American: 'us', Swiss: 'ch', Austrian: 'at', Belgian: 'be',
  Polish: 'pl', Russian: 'ru', Venezuelan: 've', Colombian: 'co', Indonesian: 'id', Hungarian: 'hu', Swedish: 'se',
  Portuguese: 'pt', Irish: 'ie', 'South African': 'za', Indian: 'in', Malaysian: 'my', Czech: 'cz', Liechtensteiner: 'li',
  Uruguayan: 'uy', Chilean: 'cl',
};
export const flagCode = (nationality) => NATIONALITY_CODES[nationality];
