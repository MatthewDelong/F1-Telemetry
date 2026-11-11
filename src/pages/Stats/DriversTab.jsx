import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import { getStandings, getDrivers, getDriverSeason, getCareer, getTeamSeason, getRaceDetail, getStints } from './api';
import { HEADSHOT_OVERRIDES } from './headshotOverrides';
import { getRaceCache } from './cache';
import { buildRounds, totals, detail, cumulative, distribution, headToHead, lapsLed, stopTimes, median, teamColor, teamLogoBase, flagCode } from './stats';
import { darkenColor } from '../../utils/colorUtils';
import { ChampionBadge } from '../../components/ChampionBadge';

const THIS_YEAR = new Date().getFullYear();
const SEASONS = Array.from({ length: THIS_YEAR - 2017 }, (_, i) => THIS_YEAR - i);
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n)}`;
const f1 = (n, d = 1) => (n == null ? '–' : n.toFixed(d));
const sec = (n) => (n == null ? '–' : `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}s`);
const pct = (n) => `${Math.round(n * 100)}%`;
const sum = (a) => a.reduce((x, y) => x + y, 0);

// Chart tooltips: dark panel with light text, readable on both the light and dark themes.
const TIP = {
  contentStyle: { background: 'rgba(14,18,28,0.96)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.45)', padding: '10px 14px' },
  labelStyle: { color: '#ffffff', fontWeight: 600, marginBottom: 6 },
  itemStyle: { color: '#e8ecf4', padding: '1px 0' },
  cursor: { stroke: 'rgba(255,255,255,0.35)' },
};
const BAR_CURSOR = { fill: 'rgba(255,255,255,0.08)' };

const COMPOUND = { SOFT: '#e5383b', MEDIUM: '#f2c200', HARD: '#cfd4dc', INTERMEDIATE: '#2e9f5a', WET: '#2563eb' };

// New drivers can arrive from the API without a 3-letter code, so fall back to the first 3 letters of the surname (same rule as the download script).
const driverCode = (d) => (d.code || d.familyName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 3)).toUpperCase();

function Headshot({ season, driver }) {
  const base = `${import.meta.env.BASE_URL}images/`;
  const code = driverCode(driver);
  const sources = [
    ...(season >= 2023 ? ['png', 'webp'].map((e) => `${base}${season}/drivers/${code}.${e}`) : []),
    ...['png', 'webp', 'jpg', 'jpeg'].map((e) =>
      `${base}historical/drivers/${HEADSHOT_OVERRIDES[driver.driverId] ?? driver.driverId}.${e}`),
  ];
  const [i, setI] = useState(0);
  if (i >= sources.length) return null;
  return <img className="headshot" src={sources[i]} alt="" onError={() => setI(i + 1)} />;
}

const LOGO_EXTS = ['webp', 'png'];
function TeamLogo({ season, id }) {
  const [i, setI] = useState(0);
  if (i >= LOGO_EXTS.length) return null;
  return <img className="teamlogo" data-team={id} src={`${teamLogoBase(season, id)}.${LOGO_EXTS[i]}?v=2`} alt="" onError={() => setI(i + 1)} />;
}

function TeamCar({ season, id }) {
  const [unavailable, setUnavailable] = useState(false);
  if (!id || season < 2023 || season > 2026 || unavailable) return null;
  return <img className="teamcar" src={`${teamLogoBase(season, id)}-car.png`} alt="" onError={() => setUnavailable(true)} />;
}

const FLAG_EXTS = ['webp'];
// The API sometimes sends a new driver with no nationality. Key: "given family", lowercase, no accents.
const NATIONALITY_FALLBACK = { 'rafael camara': 'Brazilian' };
const nameKey = (d) => `${d.givenName} ${d.familyName}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Flag({ driver }) {
  const nationality = driver.nationality ?? NATIONALITY_FALLBACK[nameKey(driver)];
  const code = flagCode(nationality);
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [code]);
  if (!code || i >= FLAG_EXTS.length) return null;
  const src = `${import.meta.env.BASE_URL}images/flags/${code}.${FLAG_EXTS[i]}`;
  return <img className="flag" src={src} alt={nationality} onError={() => setI(i + 1)} />;
}

const Kv = ({ k, v, sub }) => <div className="kv"><dt>{k}</dt><dd>{v}</dd>{sub && <small>{sub}</small>}</div>;

function StatCard({ title, value, note, tiles }) {
  return (
    <section className="panel stat">
      <h3>{title}</h3><p className="big">{value}</p><p className="note">{note}</p>
      <div className="tiles">{tiles.map((t) => <span key={t.key} className={`tile ${t.state}`} title={t.label} />)}</div>
    </section>
  );
}
const ChartPanel = ({ title, children, className = '' }) => (
  <section className={`panel chart ${className}`}><h3>{title}</h3><div className="chartbox"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></section>
);
function Split({ label, a, b, nameA, nameB }) {
  const t = a + b || 1;
  return (
    <div className="split">
      <p><b>{nameA} {a}</b><span>{label}</span><b>{b} {nameB}</b></p>
      <div className="bar"><i style={{ width: `${(a / t) * 100}%` }} /></div>
    </div>
  );
}

export default function DriversTab({ season, setSeason, tabSwitcher }) {
  const [standings, setStandings] = useState([]);
  const [driverId, setDriverId] = useState('');
  const [rounds, setRounds] = useState([]);
  const [latestTeam, setLatestTeam] = useState(null); // the team from the driver's most recent race
  const [career, setCareer] = useState(null);
  const [prev, setPrev] = useState([]);
  const [h2h, setH2h] = useState(null);
  const [lap, setLap] = useState({ status: 'idle' });
  const [cache, setCache] = useState({}); // pre-built race files, by round
  const [strategyTip, setStrategyTip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let live = true; setLoading(true); setError('');
    getStandings(season).then((s) => (s.length ? s : getDrivers(season))).then((list) => {
      if (!live) return;
      setStandings(list);
      setDriverId((cur) => (list.some((s) => s.Driver.driverId === cur) ? cur : list[0]?.Driver.driverId ?? ''));
      if (!list.length) setLoading(false);
    }).catch((e) => live && (setError(e.message), setLoading(false)));
    return () => { live = false; };
  }, [season, tick]);

  const entry = standings.find((s) => s.Driver.driverId === driverId);
  // The standings list a driver's teams in no reliable order, so prefer the team from their latest race.
  const team = latestTeam ?? entry?.Constructors.at(-1);
  const mate = team && standings.find((s) => s.Driver.driverId !== driverId && s.Constructors.some((c) => c.constructorId === team.constructorId));
  const teamId = team?.constructorId; const mateId = mate?.Driver.driverId;

  useEffect(() => {
    if (!driverId) return;
    let live = true; setLoading(true); setError(''); setLap({ status: 'idle' }); setLatestTeam(null);
    getDriverSeason(season, driverId).then((d) => {
      if (!live) return;
      setRounds(buildRounds(d));
      const c = d.results.at(-1)?.Results[0]?.Constructor;
      setLatestTeam(c ? { constructorId: c.constructorId, name: c.name } : null);
    }).catch((e) => live && setError(e.message)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [season, driverId, tick]);

  // Secondary data: failures here just hide that panel.
  useEffect(() => {
    if (!driverId) return;
    let live = true; setCareer(null); setPrev([]);
    getCareer(driverId).then((c) => live && setCareer(c)).catch(() => {});
    getDriverSeason(season - 1, driverId).then((d) => live && setPrev(cumulative(buildRounds(d)))).catch(() => {});
    return () => { live = false; };
  }, [season, driverId, tick]);

  useEffect(() => {
    setH2h(null);
    if (!teamId || !mateId) return;
    let live = true;
    getTeamSeason(season, teamId).then((t) => live && setH2h(headToHead(t, driverId, mateId))).catch(() => {});
    return () => { live = false; };
  }, [season, driverId, teamId, mateId, tick]);

  // Coming back to a tab left open for 30+ minutes reloads the data (no background polling).
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > 30 * 60 * 1000) setTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Pre-built per-race data (public/stats_cache), so most of the lap-by-lap section needs no API calls.
  useEffect(() => {
    let live = true;
    const list = rounds.filter((r) => r.raced);
    Promise.all(list.map((r) => getRaceCache(season, r.round))).then((all) => {
      if (live) setCache(Object.fromEntries(list.map((r, k) => [r.round, all[k]])));
    });
    return () => { live = false; };
  }, [season, rounds]);

  const color = teamColor(teamId, season);
  const t = totals(rounds); const x = detail(rounds);
  const raced = rounds.filter((r) => r.raced);
  const pts = entry ? +entry.points : t.points;
  const teamPts = team ? standings.filter((s) => s.Constructors.some((c) => c.constructorId === teamId)).reduce((a, s) => a + +s.points, 0) : 0;
  const isLeader = entry?.position === '1';
  const gap = isLeader ? pts - +(standings[1]?.points ?? 0) : pts - +(standings[0]?.points ?? 0);
  const tiles = (hit) => rounds.map((r) => ({ key: r.round, label: r.name, state: hit(r) ? 'hit' : !r.raced ? 'soon' : r.dnf ? 'dnf' : 'miss' }));
  const cum = cumulative(raced);
  const line = Array.from({ length: Math.max(cum.length, prev.length) }, (_, i) => ({ round: i + 1, points: cum[i], last: prev[i] }));
  const roundName = (r) => rounds.find((q) => q.round === r)?.name;
  const cachedRows = raced.map((r) => {
    const c = cache[r.round]; const d = c?.drivers?.[driverId];
    return d && { round: r.round, name: r.name, led: d.lapsLed, stops: d.stops.map((x) => x.seconds).filter((x) => x != null && x < 60), count: d.stops.length, stints: d.stints ?? [], weather: c.weather ?? null };
  }).filter(Boolean);
  const rows = [...cachedRows, ...(lap.rows ?? [])].sort((a, b) => a.round - b.round);
  const haveRounds = new Set(rows.map((r) => r.round));
  const missing = raced.filter((r) => !haveRounds.has(r.round));
  const hasTyres = rows.some((r) => r.stints.length);
  const allStops = rows.flatMap((r) => r.stops);
  const pace = raced.map((r) => {
    const c = cache[r.round]; const d = c?.drivers?.[driverId]; const m = c?.drivers?.[mateId]; const w = c?.drivers?.[c?.winner];
    return d?.medianLap && { round: r.round, name: r.name,
      vsMate: m?.medianLap ? +(d.medianLap - m.medianLap).toFixed(3) : null,
      vsWinner: w?.medianLap && c.winner !== driverId ? +(d.medianLap - w.medianLap).toFixed(3) : null };
  }).filter(Boolean);
  const paceAvg = (k) => { const v = pace.map((p) => p[k]).filter((x) => x != null); return v.length ? sum(v) / v.length : null; };
  const mateRaces = pace.filter((p) => p.vsMate != null);

  // Live fallback, only for races that aren't in the pre-built data.
  async function loadLaps() {
    let done = 0; const total = missing.length;
    setLap({ status: 'loading', done, total });
    const stints = await getStints(season, missing, entry.Driver).catch(() => null);
    const live = await Promise.all(missing.map(async (r) => {
      const d = await getRaceDetail(season, r.round, driverId).catch(() => ({ laps: [], stops: [] }));
      setLap((s) => ({ ...s, done: ++done }));
      return { round: r.round, name: r.name, led: lapsLed(d.laps), stops: stopTimes(d.stops), count: d.stops.length, stints: stints?.[r.round] ?? [], weather: null };
    }));
    setLap({ status: 'done', rows: live, tyres: !!stints });
  }

  return (
    <div className="app" style={{ '--accent': color }}>
      <header className="top">
        {tabSwitcher}
        <h1>F1 Driver Stats</h1>
        <div className="controls">
          <label className="select-pill">
            <span className="select-tag">Season</span>
            <select aria-label="Season" value={season} onChange={(e) => setSeason(+e.target.value)}>
              {SEASONS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
          <label className="select-pill driver-select">
            <span className="select-tag">Driver</span>
            <select aria-label="Driver" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              {standings.map((s) => <option key={s.Driver.driverId} value={s.Driver.driverId}>{s.Driver.givenName} {s.Driver.familyName}</option>)}
            </select>
          </label>
        </div>
      </header>

      {error && <p className="msg">{error}</p>}
      {!error && !loading && !standings.length && <p className="msg">No data for {season} yet. Pick an earlier season.</p>}

      {entry && !error && (
        <main className={loading ? 'busy' : ''}>
          <section
            className="hero garage-hero-card"
            style={{
              '--team': color,
              '--team-dark': darkenColor(color, 45),
            }}
            onPointerMove={(event) => {
              if (event.pointerType === 'touch') return;
              const card = event.currentTarget;
              const rect = card.getBoundingClientRect();
              const px = (event.clientX - rect.left) / rect.width;
              const py = (event.clientY - rect.top) / rect.height;
              card.style.setProperty('--ry', `${(px - 0.5) * 6}deg`);
              card.style.setProperty('--rx', `${(0.5 - py) * 6}deg`);
              card.style.setProperty('--mx', `${px * 100}%`);
              card.style.setProperty('--my', `${py * 100}%`);
            }}
            onPointerLeave={(event) => {
              const card = event.currentTarget;
              card.style.setProperty('--ry', '0deg');
              card.style.setProperty('--rx', '0deg');
            }}
          >
            <div className="garage-hero-card__livery" aria-hidden="true" />
            <div className="garage-hero-card__grid" aria-hidden="true" />
            {entry.Driver.permanentNumber && (
              <span className="garage-hero-card__number garage-hero-card__number--mobile" aria-hidden="true">
                {entry.Driver.permanentNumber}
              </span>
            )}
            <div className="who">
              <div className="headshot-wrap">
                <Headshot key={`${season}-${entry.Driver.driverId}`} season={season} driver={entry.Driver} />
              </div>
              <div>
                <div className="garage-hero-card__badges">
                  {entry.Driver.permanentNumber && (
                    <span className="garage-hero-card__car-number">#{entry.Driver.permanentNumber}</span>
                  )}
                  <span className="garage-hero-card__code">{driverCode(entry.Driver)}</span>
                  <ChampionBadge
                    code={driverCode(entry.Driver)}
                    year={season}
                    size="sm"
                    showLabel
                    style={{ position: 'static' }}
                  />
                </div>
                <p className="given">{entry.Driver.givenName}</p>
                <h2 style={{ '--chars': entry.Driver.familyName.length }}>
                  <span className="family-name">{entry.Driver.familyName}</span>
                  <Flag driver={entry.Driver} />
                </h2>
                <div className="team-line">
                  <div className="team-row">
                    <p className="team">
                      {teamId && <TeamLogo key={`${season}-${teamId}`} season={season} id={teamId} />}
                      {team?.name ?? 'No team listed'}
                    </p>
                    {entry.Driver.permanentNumber && (
                      <span className="garage-hero-card__number garage-hero-card__number--desktop" aria-hidden="true">
                        {entry.Driver.permanentNumber}
                      </span>
                    )}
                  </div>
                  {teamId && <TeamCar key={`${season}-${teamId}`} season={season} id={teamId} />}
                </div>
              </div>
            </div>
            <dl className="facts">
              <Kv k="Championship" v={`${entry.position === '-' ? '–' : `P${entry.position}`}, ${pts} pts`} />
              <Kv k={isLeader ? 'Lead over P2' : 'Gap to leader'} v={`${signed(gap)} pts`} />
              {mate && <Kv k={`Vs ${mate.Driver.familyName}`} v={`${signed(pts - +mate.points)} pts`} />}
              {teamPts > 0 && <Kv k="Team share" v={`${((pts / teamPts) * 100).toFixed(1)}%`} />}
            </dl>
            <div className="garage-hero-card__sheen" aria-hidden="true" />
          </section>

          {career && (
            <dl className="panel career">
              <Kv k="Career starts" v={career.starts} sub={`+${career.sprintStarts ?? 0} ${career.sprintStarts === 1 ? 'sprint' : 'sprints'}`} />
              <Kv k="Career wins" v={career.wins} sub={`+${career.sprintWins ?? 0} sprint ${career.sprintWins === 1 ? 'win' : 'wins'}`} />
              <Kv k="Career podiums" v={career.podiums} sub={`+${career.sprintPodiums ?? 0} sprint ${career.sprintPodiums === 1 ? 'podium' : 'podiums'}`} />
              <Kv k="Career poles" v={career.poles} sub={`+${career.sprintPoles ?? 0} sprint ${career.sprintPoles === 1 ? 'pole' : 'poles'}`} />
            </dl>
          )}

          <div className="legend"><span className="tile hit" /> Counted <span className="tile dnf" /> Did not finish <span className="tile miss" /> Other <span className="tile soon" /> Upcoming. Each square is one race.</div>
          <div className="cards">
            <StatCard title="Grand Prix wins" value={t.wins} note={`${t.sprintWins} sprint ${t.sprintWins === 1 ? 'win' : 'wins'}`} tiles={tiles((r) => r.pos === 1)} />
            <StatCard title="Grand Prix podiums" value={t.podiums} note={`${t.sprintPodiums} sprint ${t.sprintPodiums === 1 ? 'podium' : 'podiums'}`} tiles={tiles((r) => r.pos != null && r.pos <= 3)} />
            <StatCard title="Season points" value={t.points} note={raced.length ? `Average ${(t.points / raced.length).toFixed(1)} per round, sprints included` : ''} tiles={tiles((r) => r.points > 0)} />
            <StatCard title="Poles" value={t.poles} note={`${t.fastest} fastest ${t.fastest === 1 ? 'lap' : 'laps'}`} tiles={tiles((r) => r.pole)} />
          </div>

          <section className="panel">
            <h3>Season in detail</h3>
            <dl className="grid">
              <Kv k="Average finish" v={`P${f1(t.avgFinish)}`} sub={`Best P${x.best ?? '–'}`} />
              <Kv k="Average grid" v={`P${f1(x.avgGrid)}`} sub={`Front row ${x.frontRows} times`} />
              <Kv k="Places gained" v={signed(x.gained)} sub={`${f1(x.avgGained)} per finish`} />
              <Kv k="Points finishes" v={pct(x.pointsRate)} sub={`Podiums ${pct(x.podiumRate)}`} />
              <Kv k="Poles converted" v={x.poleCount ? `${x.poleToWin} of ${x.poleCount}` : '–'} sub="Pole to win" />
              <Kv k="Reached Q3" v={`${x.q3} of ${x.qualified}`} />
              <Kv k="Consistency" v={x.consistency == null ? '–' : `±${f1(x.consistency)}`} sub="Spread in finishing place, lower is steadier" />
              <Kv k="Best weekend" v={x.bestWeekend?.name ?? '–'} sub={x.bestWeekend && `${x.bestWeekend.points + x.bestWeekend.sprintPoints} pts`} />
              <Kv k="Worst weekend" v={x.worstWeekend?.name ?? '–'} sub={x.worstWeekend && `${x.worstWeekend.points + x.worstWeekend.sprintPoints} pts`} />
              <Kv k="Did not finish" v={t.dnfs} sub={x.reasons.map(([r, n]) => `${r}${n > 1 ? ` ×${n}` : ''}`).join(', ') || 'None'} />
            </dl>
          </section>

          {h2h && mate && (
            <section className="panel">
              <h3>Against teammate {mate.Driver.familyName}</h3>
              <Split label="Finished ahead" a={h2h.race.a} b={h2h.race.b} nameA={driverCode(entry.Driver)} nameB={driverCode(mate.Driver)} />
              <Split label="Qualified ahead" a={h2h.quali.a} b={h2h.quali.b} nameA={driverCode(entry.Driver)} nameB={driverCode(mate.Driver)} />
            </section>
          )}

          <div className="charts">
            <ChartPanel title={`Points through the season${prev.length ? `, against ${season - 1}` : ''}`}>
              <LineChart data={line}>
                <CartesianGrid stroke="#d3d9e2" vertical={false} /><XAxis dataKey="round" tickLine={false} /><YAxis width={36} tickLine={false} axisLine={false} />
                <Tooltip {...TIP} labelFormatter={roundName} />
                {prev.length > 0 && <Line dataKey="last" name={`${season - 1}`} stroke="#8b95a7" strokeWidth={2} strokeDasharray="4 4" dot={false} />}
                <Line dataKey="points" name={`${season}`} stroke={color} strokeWidth={3} dot={false} />
              </LineChart>
            </ChartPanel>
            <ChartPanel title="Starting grid and race finish">
              <LineChart data={raced}>
                <CartesianGrid stroke="#d3d9e2" vertical={false} /><XAxis dataKey="round" tickLine={false} /><YAxis width={32} reversed domain={[1, 20]} tickLine={false} axisLine={false} />
                <Tooltip {...TIP} labelFormatter={roundName} />
                <Line dataKey="grid" name="Grid" stroke="#8b95a7" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                <Line dataKey="pos" name="Finish" stroke={color} strokeWidth={3} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ChartPanel>
            <ChartPanel title="Finishing positions" className="finish-chart">
              <BarChart data={distribution(rounds)}>
                <CartesianGrid stroke="#d3d9e2" vertical={false} /><XAxis dataKey="label" tickLine={false} interval={0} fontSize={11} /><YAxis width={32} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip {...TIP} cursor={BAR_CURSOR} /><Bar dataKey="count" name="Races" fill={color} />
              </BarChart>
            </ChartPanel>
          </div>

          <section className="panel">
            <h3>Lap-by-lap: laps led, pit stops and tyres</h3>
            {lap.status === 'loading' && <p className="note">Loading race {lap.done} of {lap.total} live</p>}
            {rows.length === 0 && lap.status !== 'loading' && (<>
              <p className="note">These races aren’t in the pre-built data yet. Loading them live needs two requests per race, so it only runs when you ask.</p>
              <button onClick={loadLaps} disabled={!missing.length}>Load lap-by-lap stats</button>
            </>)}
            {rows.length > 0 && (<>
              <dl className="grid">
                <Kv k="Laps led" v={sum(rows.map((r) => r.led))} sub={`${f1(sum(rows.map((r) => r.led)) / (rows.length || 1))} per race`} />
                <Kv k="Pit stops" v={sum(rows.map((r) => r.count))} sub={`${f1(sum(rows.map((r) => r.count)) / (rows.length || 1))} per race`} />
                <Kv k="Median stop" v={allStops.length ? `${f1(median(allStops), 2)}s` : '–'} sub={allStops.length ? `Fastest ${f1(Math.min(...allStops), 2)}s` : ''} />
              </dl>
              <div className="chartbox short"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows}><CartesianGrid stroke="#d3d9e2" vertical={false} /><XAxis dataKey="round" tickLine={false} /><YAxis width={32} allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip {...TIP} cursor={BAR_CURSOR} labelFormatter={roundName} /><Bar dataKey="led" name="Laps led" fill={color} /></BarChart>
              </ResponsiveContainer></div>
              {hasTyres ? (<>
                <h3 className="sub">Tyre strategy</h3>
                <div className="legend">{Object.entries(COMPOUND).map(([c, col]) => <span key={c}><i className="sw" style={{ background: col }} /> {c[0] + c.slice(1).toLowerCase()}</span>)}</div>
                {rows.filter((r) => r.stints.length).map((r) => {
                  const total = Math.max(...r.stints.map((s) => s.lap_end ?? 0)) || 1;
                  const w = r.weather;
                  const weather = w && `Track ${w.trackMin}–${w.trackMax}°C, air ${w.airMin}–${w.airMax}°C${w.rain ? ', rain' : ''}`;
                  const tipOpen = strategyTip?.round === r.round;
                  const selectedStint = tipOpen && r.stints.find((s) => s.stint_number === strategyTip.stint);
                  const tip = (stint) => setStrategyTip((current) =>
                    current?.round === r.round && current.stint === stint ? null : { round: r.round, stint });
                  return (
                    <div className="strategy-item" key={r.round}>
                      <div className="strategy">
                        <button className="strategy-race" title={`${r.name}${weather ? `, ${weather}` : ''}`} aria-expanded={tipOpen && strategyTip.stint === null} aria-controls={`strategy-tip-${r.round}`}
                          onClick={() => tip(null)}>{r.name.replace(' Grand Prix', '')}{w?.rain ? ' (wet)' : ''}</button>
                        <div className="strategy-bar">{r.stints.map((s) => (
                          <button key={s.stint_number} aria-label={`${s.compound}, laps ${s.lap_start}–${s.lap_end}${weather ? `; ${weather}` : ''}`}
                            title={`${s.compound}, laps ${s.lap_start}–${s.lap_end}${weather ? `; ${weather}` : ''}`}
                            aria-pressed={tipOpen && strategyTip.stint === s.stint_number} onClick={() => tip(s.stint_number)}
                            style={{ width: `${(((s.lap_end ?? s.lap_start) - s.lap_start + 1) / total) * 100}%`, background: COMPOUND[s.compound] ?? '#8b95a7' }} />
                        ))}</div>
                      </div>
                      {tipOpen && <div className="strategy-tip" id={`strategy-tip-${r.round}`} role="status">
                        <span>{selectedStint ? `${selectedStint.compound}, laps ${selectedStint.lap_start}–${selectedStint.lap_end}` : r.name}{weather && ` · ${weather}`}</span>
                        <button className="strategy-tip-close" aria-label="Close strategy details" onClick={() => setStrategyTip(null)}>×</button>
                      </div>}
                    </div>
                  );
                })}
              </>) : <p className="note">Tyre data isn’t available for these races.</p>}
              {missing.length > 0 && lap.status !== 'loading' && (
                <p className="note">{missing.length} {missing.length === 1 ? 'race isn’t' : 'races aren’t'} in the pre-built data yet. <button onClick={loadLaps}>Load {missing.length} live</button></p>
              )}
            </>)}
          </section>

          {mateRaces.length + pace.filter((p) => p.vsWinner != null).length > 0 && (
            <section className="panel">
              <h3>Race pace</h3>
              <p className="note">Median lap time in seconds per lap against the teammate and the race winner. Below zero is quicker. The first lap, pit laps and slow safety car laps are left out.</p>
              <dl className="grid">
                <Kv k="Vs teammate" v={sec(paceAvg('vsMate'))} sub={mateRaces.length ? `Quicker in ${mateRaces.filter((p) => p.vsMate < 0).length} of ${mateRaces.length} races` : ''} />
                <Kv k="Vs race winner" v={sec(paceAvg('vsWinner'))} sub="Average over races someone else won" />
              </dl>
              <div className="chartbox short"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={pace}><CartesianGrid stroke="#d3d9e2" vertical={false} /><XAxis dataKey="round" tickLine={false} /><YAxis width={40} tickLine={false} axisLine={false} />
                  <Tooltip {...TIP} cursor={BAR_CURSOR} labelFormatter={roundName} formatter={(v) => sec(v)} />
                  <Bar dataKey="vsMate" name="Vs teammate" fill={color} /><Bar dataKey="vsWinner" name="Vs winner" fill="#8b95a7" /></BarChart>
              </ResponsiveContainer></div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}

