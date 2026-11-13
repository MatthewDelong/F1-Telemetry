import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from "recharts";
import {
  getConstructorSeason,
  getConstructorStandings,
  getCrashDamage,
} from "./api";
import { teamColor, teamLogoBase } from "./stats";
import { getTeamChampionships } from "./teamChampionships";
import {
  powerUnitFor,
  powerUnitHistory,
  FORMER_TEAM_NAMES,
} from "./powerUnits";
import { teamPrincipalFor, teamPrincipalHistory } from "./teamPrincipals";
import { darkenColor } from "../../utils/colorUtils";
import { ChampionBadge } from "../../components/ChampionBadge";

const THIS_YEAR = new Date().getFullYear();
const SEASONS = Array.from(
  { length: THIS_YEAR - 2017 },
  (_, index) => THIS_YEAR - index,
);
const LOGO_EXTS = ["webp", "png"];
const TIP = {
  contentStyle: {
    background: "rgba(14,18,28,0.96)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: "10px 14px",
  },
  labelStyle: { color: "#ffffff", fontWeight: 600, marginBottom: 6 },
  itemStyle: { color: "#e8ecf4", padding: "1px 0" },
  cursor: { stroke: "rgba(255,255,255,0.35)" },
};
const BAR_CURSOR = { fill: "rgba(255,255,255,0.08)" };
const sum = (values) => values.reduce((total, value) => total + value, 0);
const position = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};
const isClassified = (status) =>
  status === "Finished" || /^\+\d+ Lap/.test(status ?? "");

function ConstructorLogo({ season, constructor }) {
  const [extensionIndex, setExtensionIndex] = useState(0);
  useEffect(() => setExtensionIndex(0), [season, constructor.constructorId]);
  if (extensionIndex >= LOGO_EXTS.length) return null;

  return (
    <img
      className="constructor-logo"
      src={`${teamLogoBase(season, constructor.constructorId)}.${LOGO_EXTS[extensionIndex]}`}
      alt=""
      onError={() => setExtensionIndex((index) => index + 1)}
    />
  );
}

function ConstructorCar({ season, id }) {
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => setUnavailable(false), [season, id]);
  if (!id || season < 2023 || season > 2026 || unavailable) return null;
  return (
    <img
      className="teamcar"
      src={`${teamLogoBase(season, id)}-car.png`}
      alt=""
      onError={() => setUnavailable(true)}
    />
  );
}

function Metric({ label, value, note, years }) {
  return (
    <section
      className={`panel stat constructor-metric${years ? " constructor-title-metric" : ""}`}
    >
      <h3>{label}</h3>
      <p className="big">{value}</p>
      {note && <p className="note">{note}</p>}
      {years?.length > 0 && (
        <ul
          className="constructor-title-years"
          aria-label={`${label} winning years`}
        >
          {years.map((year) => (
            <li key={year}>{year}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
function TeamPrincipalCard({ season, constructorId }) {
  const current = teamPrincipalFor(season, constructorId);
  const history = teamPrincipalHistory(constructorId);
  if (!current && !history.length) return null;
  return (
    <section className="panel stat constructor-metric constructor-pu-metric constructor-tp-metric">
      <h3>Team Principal / CEO</h3>
      <p className="big">{current?.name ?? "–"}</p>
      <p className="note">
        {current
          ? `${current.role} (${season})`
          : `No team principal data for ${season}`}
      </p>
      {history.length > 0 && (
        <ol
          className="constructor-pu-history constructor-tp-history"
          aria-label="Team principals and CEOs by season"
        >
          {history.map(({ season: year, name, role, formerName }) => (
            <li
              key={year}
              className={year === season ? "active" : undefined}
              title={formerName ? `As ${formerName} · ${role}` : role}
            >
              <span className="constructor-pu-year">{year}</span>
              <span className="constructor-pu-supplier">{name}</span>
              <span className="constructor-pu-team">
                {formerName ? `${role} · ${formerName}` : role}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function PowerUnitCard({ season, constructorId }) {
  const current = powerUnitFor(season, constructorId);
  const history = powerUnitHistory(constructorId);
  if (!current && !history.length) return null;
  return (
    <section className="panel stat constructor-metric constructor-pu-metric">
      <h3>Power unit</h3>
      <p className="big">{current ?? "–"}</p>
      <p className="note">
        {current
          ? `Engine supplier for ${season}`
          : `No power unit data for ${season}`}
      </p>
      {history.length > 0 && (
        <ol
          className="constructor-pu-history"
          aria-label="Power unit suppliers by season"
        >
          {history.map(({ season: year, teamId, supplier }) => (
            <li
              key={year}
              className={year === season ? "active" : undefined}
              title={
                teamId !== constructorId
                  ? `As ${FORMER_TEAM_NAMES[teamId] ?? teamId}`
                  : undefined
              }
            >
              <span className="constructor-pu-year">{year}</span>
              <span className="constructor-pu-supplier">{supplier}</span>
              {teamId !== constructorId && (
                <span className="constructor-pu-team">
                  {FORMER_TEAM_NAMES[teamId] ?? teamId}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatUsdCompact(amount) {
  if (amount == null) return "–";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toLocaleString()}`;
}

function CrashDamageCard({ season, constructorId, crashDamage }) {
  const seasonData = crashDamage?.seasons?.[String(season)];
  const entry = seasonData?.[constructorId];
  if (!entry) return null;
  return (
    <section className="panel stat constructor-metric constructor-pu-metric">
      <h3>Crash damage</h3>
      <p className="big">{formatUsdCompact(entry.total)}</p>
      <p className="note">Est. {season} repair bill</p>
      {entry.drivers?.length > 0 && (
        <ol
          className="constructor-pu-history"
          aria-label="Crash damage breakdown by driver"
        >
          {entry.drivers.map((d) => (
            <li key={d.name}>
              <span className="constructor-pu-year">{d.name}</span>
              <span className="constructor-pu-supplier">
                ${d.cost.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ChartPanel({ title, children, className = "" }) {
  return (
    <section className={`panel chart ${className}`.trim()}>
      <h3>{title}</h3>
      <div className="chartbox">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function combineRaces({ results, quali, sprints }) {
  const rounds = new Map();
  const getRound = (race) => {
    const round = Number(race.round);
    if (!rounds.has(round)) {
      rounds.set(round, {
        round,
        name: race.raceName,
        date: race.date,
        results: [],
        quali: [],
        sprints: [],
      });
    }
    return rounds.get(round);
  };

  results.forEach((race) =>
    getRound(race).results.push(...(race.Results ?? [])),
  );
  quali.forEach((race) =>
    getRound(race).quali.push(...(race.QualifyingResults ?? [])),
  );
  sprints.forEach((race) =>
    getRound(race).sprints.push(...(race.SprintResults ?? [])),
  );
  return [...rounds.values()].sort((a, b) => a.round - b.round);
}

function resultDistribution(rounds) {
  const bins = Array.from({ length: 20 }, (_, index) => ({
    label: `P${index + 1}`,
    count: 0,
  }));
  let dnf = 0;
  for (const race of rounds) {
    for (const result of race.results) {
      const finish = position(result.position);
      if (!isClassified(result.status)) dnf++;
      else if (finish && finish <= bins.length) bins[finish - 1].count++;
    }
  }
  return [...bins, { label: "DNF", count: dnf }];
}

function DriverPoints({ drivers, totalPoints }) {
  return (
    <section className="panel constructor-driver-points">
      <h3>Driver points</h3>
      {drivers.length ? (
        <ol className="constructor-driver-points-list">
          {drivers.map((driver) => (
            <li key={driver.id} className="constructor-driver-points-row">
              <div className="constructor-driver-points-labels">
                <strong>{driver.label}</strong>
                <span>{driver.points} pts</span>
              </div>
              <div
                className="constructor-driver-points-track"
                role="progressbar"
                aria-label={`${driver.label} points contribution`}
                aria-valuemin={0}
                aria-valuemax={totalPoints}
                aria-valuenow={driver.points}
                title={`${driver.racePoints} race points, ${driver.sprintPoints} sprint points`}
              >
                <span
                  style={{
                    width: `${totalPoints ? (driver.points / totalPoints) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="constructor-driver-points-note">
                {driver.racePoints} race · {driver.sprintPoints} sprint
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="note">No driver points data available for this season.</p>
      )}
    </section>
  );
}

export default function ConstructorsTab({ season, setSeason, tabSwitcher }) {
  const [standings, setStandings] = useState([]);
  const [constructorId, setConstructorId] = useState("");
  const [crashDamage, setCrashDamage] = useState(null);

  useEffect(() => {
    getCrashDamage().then(setCrashDamage);
  }, []);
  const [seasonData, setSeasonData] = useState(null);
  const [loadingStandings, setLoadingStandings] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingStandings(true);
    setError("");
    setStandings([]);
    setSeasonData(null);
    setConstructorId("");
    setLoadingDetails(false);
    getConstructorStandings(season)
      .then((rows) => {
        if (!active) return;
        setStandings(rows);
        setConstructorId((current) =>
          rows.some((row) => row.Constructor.constructorId === current)
            ? current
            : (rows[0]?.Constructor.constructorId ?? ""),
        );
      })
      .catch((exception) => {
        if (active) setError(exception.message);
      })
      .finally(() => {
        if (active) setLoadingStandings(false);
      });
    return () => {
      active = false;
    };
  }, [season]);

  useEffect(() => {
    if (!constructorId) {
      setSeasonData(null);
      return undefined;
    }

    let active = true;
    setLoadingDetails(true);
    setError("");
    setSeasonData(null);
    getConstructorSeason(season, constructorId)
      .then((data) => {
        if (active) setSeasonData(data);
      })
      .catch((exception) => {
        if (active) setError(exception.message);
      })
      .finally(() => {
        if (active) setLoadingDetails(false);
      });
    return () => {
      active = false;
    };
  }, [season, constructorId]);

  const selectedStanding = standings.find(
    (row) => row.Constructor.constructorId === constructorId,
  );
  const championships = getTeamChampionships(constructorId);
  const rounds = useMemo(
    () => (seasonData ? combineRaces(seasonData) : []),
    [seasonData],
  );
  const driverNames = useMemo(() => {
    const names = new Map();
    for (const race of rounds) {
      for (const result of [...race.results, ...race.quali, ...race.sprints]) {
        if (result.Driver)
          names.set(
            result.Driver.driverId,
            result.Driver.code || result.Driver.familyName,
          );
      }
    }
    return names;
  }, [rounds]);
  const driverPoints = useMemo(() => {
    const drivers = new Map();
    const getDriver = (driver) => {
      const id = driver?.driverId;
      if (!id) return null;
      if (!drivers.has(id)) {
        drivers.set(id, {
          id,
          label:
            driver.code ||
            driver.familyName ||
            id.replaceAll("_", " ").toUpperCase(),
          racePoints: 0,
          sprintPoints: 0,
        });
      }
      return drivers.get(id);
    };

    for (const race of rounds) {
      for (const result of race.results) {
        const driver = getDriver(result.Driver);
        if (driver) driver.racePoints += Number(result.points) || 0;
      }
      for (const result of race.sprints) {
        const driver = getDriver(result.Driver);
        if (driver) driver.sprintPoints += Number(result.points) || 0;
      }
    }

    return [...drivers.values()]
      .map((driver) => ({
        ...driver,
        points: driver.racePoints + driver.sprintPoints,
      }))
      .sort((a, b) => b.points - a.points || a.label.localeCompare(b.label));
  }, [rounds]);
  const totalDriverPoints = driverPoints.reduce(
    (total, driver) => total + driver.points,
    0,
  );
  const metrics = useMemo(() => {
    const results = rounds.flatMap((race) => race.results);
    const quali = rounds.flatMap((race) => race.quali);
    const finishes = results
      .filter((result) => isClassified(result.status))
      .map((result) => position(result.position))
      .filter(Boolean);
    const wins = rounds.filter((race) =>
      race.results.some((result) => position(result.position) === 1),
    ).length;
    const podiums = results.filter((result) => {
      const finish = position(result.position);
      return isClassified(result.status) && finish != null && finish <= 3;
    }).length;
    const poles = rounds.filter((race) =>
      race.quali.some((result) => position(result.position) === 1),
    ).length;
    const fastest = results.filter(
      (result) => result.FastestLap?.rank === "1",
    ).length;
    const dnfs = results.filter(
      (result) => !isClassified(result.status),
    ).length;
    const sprintWins = rounds.filter((race) =>
      race.sprints.some((result) => position(result.position) === 1),
    ).length;

    return {
      wins,
      podiums,
      poles,
      fastest,
      dnfs,
      sprintWins,
      averageFinish: finishes.length ? sum(finishes) / finishes.length : null,
      pointsPerRace: rounds.some((race) => race.results.length)
        ? Number(selectedStanding?.points ?? 0) /
          rounds.filter((race) => race.results.length).length
        : 0,
    };
  }, [rounds, selectedStanding]);
  const chartRounds = useMemo(() => {
    let points = 0;
    return rounds.map((race) => {
      const racePoints =
        sum(race.results.map((result) => Number(result.points) || 0)) +
        sum(race.sprints.map((result) => Number(result.points) || 0));
      points += racePoints;
      const classified = race.results.filter((result) =>
        isClassified(result.status),
      );
      const average = (values) => {
        const finishes = values
          .map((result) => position(result.position))
          .filter((value) => value != null);
        return finishes.length
          ? Number((sum(finishes) / finishes.length).toFixed(2))
          : null;
      };
      return {
        ...race,
        points: racePoints,
        cumulative: points,
        averageGrid: average(
          race.results.filter((result) => position(result.grid) > 0),
        ),
        averageFinish: average(classified),
      };
    });
  }, [rounds]);
  const roundName = (round) =>
    rounds.find((race) => race.round === Number(round))?.name ??
    `Round ${round}`;
  const color = teamColor(constructorId, season);
  const noData =
    !loadingStandings && !loadingDetails && !error && !standings.length;

  return (
    <main className="app constructors-page" style={{ "--accent": color }}>
      <header className="top">
        {tabSwitcher}
        <h1>F1 Constructor Stats</h1>
        <div className="controls">
          <label className="select-pill">
            <span className="select-tag">Season</span>
            <select
              aria-label="Season"
              value={season}
              onChange={(event) => setSeason(Number(event.target.value))}
            >
              {SEASONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label className="select-pill constructor-select">
            <span className="select-tag">Constructor</span>
            <select
              aria-label="Constructor"
              value={constructorId}
              disabled={!standings.length}
              onChange={(event) => setConstructorId(event.target.value)}
            >
              {standings.map((row) => (
                <option
                  key={row.Constructor.constructorId}
                  value={row.Constructor.constructorId}
                >
                  {row.Constructor.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && <p className="msg">{error}</p>}
      {(loadingStandings || loadingDetails) && (
        <p className="note">
          Loading{" "}
          {loadingStandings ? "constructor standings" : "constructor data"}…
        </p>
      )}
      {noData && (
        <p className="msg">No constructor standings available for {season}.</p>
      )}

      {selectedStanding && !error && !loadingDetails && seasonData && (
        <>
          <section
            className="hero constructor-hero garage-hero-card"
            style={{
              "--team": color,
              "--team-dark": darkenColor(color, 45),
            }}
            onPointerMove={(event) => {
              if (event.pointerType === "touch") return;
              const card = event.currentTarget;
              const rect = card.getBoundingClientRect();
              const px = (event.clientX - rect.left) / rect.width;
              const py = (event.clientY - rect.top) / rect.height;
              card.style.setProperty("--ry", `${(px - 0.5) * 6}deg`);
              card.style.setProperty("--rx", `${(0.5 - py) * 6}deg`);
              card.style.setProperty("--mx", `${px * 100}%`);
              card.style.setProperty("--my", `${py * 100}%`);
            }}
            onPointerLeave={(event) => {
              const card = event.currentTarget;
              card.style.setProperty("--ry", "0deg");
              card.style.setProperty("--rx", "0deg");
            }}
          >
            <div className="garage-hero-card__livery" aria-hidden="true" />
            <div className="garage-hero-card__grid" aria-hidden="true" />
            {selectedStanding.position && (
              <span
                className="garage-hero-card__number garage-hero-card__number--driver garage-hero-card__number--mobile"
                aria-hidden="true"
              >
                <span className="garage-hero-card__number-label">Pos.</span>
                {selectedStanding.position}
              </span>
            )}
            <div className="constructor-identity">
              <ConstructorLogo
                key={`${season}-${constructorId}`}
                season={season}
                constructor={selectedStanding.Constructor}
              />
              <div>
                <div className="garage-hero-card__badges">
                  <span className="garage-hero-card__code">
                    {season} SEASON
                  </span>
                  <ChampionBadge
                    teamId={constructorId}
                    year={season}
                    size="sm"
                    variant="compact"
                    showLabel
                    style={{ position: "static" }}
                  />
                </div>
                <h2>
                  <span className="family-name">
                    {selectedStanding.Constructor.name}
                  </span>
                </h2>
                <div className="team-line">
                  <div className="team-row">
                    <p className="team">
                      {selectedStanding.position === "1"
                        ? "Championship leader"
                        : `P${selectedStanding.position} in constructors’ championship`}
                    </p>
                    {selectedStanding.position && (
                      <span
                        className="garage-hero-card__number garage-hero-card__number--driver garage-hero-card__number--desktop"
                        aria-hidden="true"
                      >
                        <span className="garage-hero-card__number-label">Pos.</span>
                        {selectedStanding.position}
                      </span>
                    )}
                  </div>
                  <ConstructorCar
                    key={`${season}-${constructorId}`}
                    season={season}
                    id={constructorId}
                  />
                </div>
              </div>
            </div>
            <dl className="facts">
              <div className="kv">
                <dt>Championship</dt>
                <dd>
                  {selectedStanding.position === "1"
                    ? "P1"
                    : `P${selectedStanding.position}`}
                  , {selectedStanding.points} pts
                </dd>
              </div>
              <div className="kv">
                <dt>Race wins</dt>
                <dd>{metrics.wins}</dd>
              </div>
              <div className="kv">
                <dt>Podiums</dt>
                <dd>{metrics.podiums}</dd>
              </div>
              <div className="kv">
                <dt>Pole positions</dt>
                <dd>{metrics.poles}</dd>
              </div>
            </dl>
            <div className="garage-hero-card__sheen" aria-hidden="true" />
          </section>

          <div className="cards constructor-cards">
            <Metric
              label="Race wins"
              value={metrics.wins}
              note={`${metrics.sprintWins} sprint ${metrics.sprintWins === 1 ? "win" : "wins"}`}
            />
            <Metric
              label="Podium finishes"
              value={metrics.podiums}
              note="Driver finishes in the top three"
            />
            <Metric label="Pole positions" value={metrics.poles} />
            <Metric
              label="Fastest laps"
              value={metrics.fastest}
              note={`${metrics.dnfs} driver retirements`}
            />
            <Metric
              label="Constructor championships"
              value={championships.constructorTitles.length}
              years={championships.constructorTitles}
            />
            <Metric
              label="Drivers’ championships"
              value={championships.driversChampionships.length}
              years={championships.driversChampionships}
            />
            <TeamPrincipalCard season={season} constructorId={constructorId} />
            <PowerUnitCard season={season} constructorId={constructorId} />
            <CrashDamageCard
              season={season}
              constructorId={constructorId}
              crashDamage={crashDamage}
            />
          </div>

          <section className="panel constructor-details">
            <h3>Season in detail</h3>
            <dl className="grid">
              <div className="kv">
                <dt>Championship points</dt>
                <dd>{selectedStanding.points}</dd>
              </div>
              <div className="kv">
                <dt>Points per round</dt>
                <dd>{metrics.pointsPerRace.toFixed(1)}</dd>
              </div>
              <div className="kv">
                <dt>Average finish</dt>
                <dd>
                  {metrics.averageFinish == null
                    ? "–"
                    : `P${metrics.averageFinish.toFixed(1)}`}
                </dd>
              </div>
              <div className="kv">
                <dt>Driver entries</dt>
                <dd>
                  {rounds.reduce(
                    (total, race) => total + race.results.length,
                    0,
                  )}
                </dd>
              </div>
              <div className="kv">
                <dt>Rounds with data</dt>
                <dd>{rounds.length}</dd>
              </div>
              <div className="kv">
                <dt>Drivers used</dt>
                <dd>{driverNames.size}</dd>
              </div>
            </dl>
          </section>

          <DriverPoints
            drivers={driverPoints}
            totalPoints={totalDriverPoints}
          />

          {chartRounds.length > 0 && (
            <div className="charts constructor-charts">
              <ChartPanel title="Cumulative championship points">
                <LineChart data={chartRounds}>
                  <CartesianGrid stroke="#d3d9e2" vertical={false} />
                  <XAxis dataKey="round" tickLine={false} />
                  <YAxis width={36} tickLine={false} axisLine={false} />
                  <Tooltip {...TIP} labelFormatter={roundName} />
                  <Line
                    dataKey="cumulative"
                    name="Points"
                    stroke={color}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ChartPanel>
              <ChartPanel title="Average grid and race finish">
                <LineChart data={chartRounds}>
                  <CartesianGrid stroke="#d3d9e2" vertical={false} />
                  <XAxis dataKey="round" tickLine={false} />
                  <YAxis
                    width={32}
                    reversed
                    domain={[1, "dataMax"]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip {...TIP} labelFormatter={roundName} />
                  <Line
                    dataKey="averageGrid"
                    name="Average grid"
                    stroke="#8b95a7"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    dataKey="averageFinish"
                    name="Average finish"
                    stroke={color}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    connectNulls
                  />
                </LineChart>
              </ChartPanel>
              <ChartPanel
                title="Finishing positions"
                className="constructor-finishing-chart"
              >
                <BarChart data={resultDistribution(rounds)}>
                  <CartesianGrid stroke="#d3d9e2" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    interval={0}
                    fontSize={11}
                  />
                  <YAxis
                    width={32}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip {...TIP} cursor={BAR_CURSOR} />
                  <Bar dataKey="count" name="Finishes" fill={color} />
                </BarChart>
              </ChartPanel>
            </div>
          )}
        </>
      )}
    </main>
  );
}
