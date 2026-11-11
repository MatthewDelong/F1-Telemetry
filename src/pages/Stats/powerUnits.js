// Power unit suppliers by season (2018–2026), keyed by the API's constructorId.
export const POWER_UNITS = {
  2018: {
    mercedes: 'Mercedes', ferrari: 'Ferrari', red_bull: 'Renault (TAG Heuer)', renault: 'Renault', mclaren: 'Renault',
    force_india: 'Mercedes', williams: 'Mercedes', haas: 'Ferrari', sauber: 'Ferrari', toro_rosso: 'Honda',
  },
  2019: {
    mercedes: 'Mercedes', ferrari: 'Ferrari', red_bull: 'Honda', renault: 'Renault', mclaren: 'Renault',
    racing_point: 'Mercedes', williams: 'Mercedes', haas: 'Ferrari', alfa: 'Ferrari', toro_rosso: 'Honda',
  },
  2020: {
    mercedes: 'Mercedes', ferrari: 'Ferrari', red_bull: 'Honda', renault: 'Renault', mclaren: 'Renault',
    racing_point: 'Mercedes', williams: 'Mercedes', haas: 'Ferrari', alfa: 'Ferrari', alphatauri: 'Honda',
  },
  2021: {
    mercedes: 'Mercedes', ferrari: 'Ferrari', red_bull: 'Honda', alpine: 'Renault', mclaren: 'Mercedes',
    aston_martin: 'Mercedes', williams: 'Mercedes', haas: 'Ferrari', alfa: 'Ferrari', alphatauri: 'Honda',
  },
  2022: {
    red_bull: 'Red Bull Powertrains (Honda)', mercedes: 'Mercedes', ferrari: 'Ferrari', mclaren: 'Mercedes', alpine: 'Renault',
    alphatauri: 'Red Bull Powertrains (Honda)', aston_martin: 'Mercedes', williams: 'Mercedes', alfa: 'Ferrari', haas: 'Ferrari',
  },
  2023: {
    red_bull: 'Honda RBPT', mercedes: 'Mercedes', ferrari: 'Ferrari', mclaren: 'Mercedes', aston_martin: 'Mercedes',
    alpine: 'Renault', haas: 'Ferrari', alfa: 'Ferrari', alphatauri: 'Honda RBPT', williams: 'Mercedes',
  },
  2024: {
    mercedes: 'Mercedes', mclaren: 'Mercedes', aston_martin: 'Mercedes', williams: 'Mercedes', red_bull: 'Honda RBPT',
    rb: 'Honda RBPT', ferrari: 'Ferrari', sauber: 'Ferrari', haas: 'Ferrari', alpine: 'Renault',
  },
  2025: {
    mercedes: 'Mercedes', mclaren: 'Mercedes', aston_martin: 'Mercedes', williams: 'Mercedes', red_bull: 'Honda RBPT',
    rb: 'Honda RBPT', ferrari: 'Ferrari', haas: 'Ferrari', sauber: 'Ferrari', alpine: 'Renault',
  },
  2026: {
    mclaren: 'Mercedes', mercedes: 'Mercedes', red_bull: 'Red Bull Ford', ferrari: 'Ferrari', williams: 'Mercedes',
    rb: 'Red Bull Ford', aston_martin: 'Honda', haas: 'Ferrari', audi: 'Audi', alpine: 'Mercedes', cadillac: 'Ferrari',
  },
};

// Teams that changed name/identity, so the history follows one entry on the grid.
const LINEAGES = [
  ['renault', 'alpine'],
  ['force_india', 'racing_point', 'aston_martin'],
  ['toro_rosso', 'alphatauri', 'rb'],
  ['sauber', 'alfa', 'audi'],
];
const lineageOf = (id) => LINEAGES.find((ids) => ids.includes(id)) ?? [id];

// Display names for earlier identities shown in the history.
export const FORMER_TEAM_NAMES = {
  renault: 'Renault', force_india: 'Force India', racing_point: 'Racing Point', toro_rosso: 'Toro Rosso',
  alphatauri: 'AlphaTauri', sauber: 'Sauber', alfa: 'Alfa Romeo', rb: 'RB', aston_martin: 'Aston Martin',
  alpine: 'Alpine', audi: 'Audi',
};

export const powerUnitFor = (season, id) => POWER_UNITS[season]?.[id] ?? null;

// Every season this team (or its earlier identities) appears in the list, oldest first.
export function powerUnitHistory(id) {
  const ids = lineageOf(id);
  return Object.keys(POWER_UNITS)
    .map(Number)
    .sort((a, b) => a - b)
    .map((season) => {
      const teamId = ids.find((x) => POWER_UNITS[season][x]);
      return teamId ? { season, teamId, supplier: POWER_UNITS[season][teamId] } : null;
    })
    .filter(Boolean);
}
