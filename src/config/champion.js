/**
 * F1 World Champions & Reigning Champion Configuration
 * ---------------------------------------------------------------
 * Update these entries as seasons progress.
 *
 *   code:  3-letter driver code (must match the image filename, e.g. NOR.png)
 *   name:  Display name shown in the tooltip
 *   year:  Season the title was won
 *   theme: optional badge colour. Leave out for gold, or use "ice"
 *          (add more themes in ChampionBadge.css)
 */
export const CHAMPIONS = [
  { code: "ANT", name: "Kimi Antonelli", year: 2026 }, // no theme = gold
  { code: "NOR", name: "Lando Norris", year: 2025 },
  { code: "VER", name: "Max Verstappen", year: 2024 },
  { code: "VER", name: "Max Verstappen", year: 2023 },
];

/**
 * Reigning F1 World Champion.
 * ---------------------------------------------------------------
 * Set the previous season's winner here so they carry the "Reigning Champion"
 * badge during the following season (`reigningSeason` defaults to `year + 1`).
 * - When viewing `year` (e.g. 2025), it shows "{year} Champion".
 * - When viewing `reigningSeason` (e.g. 2026), it shows "Reigning Champion"
 *   (unless this same driver already won that season's title in CHAMPIONS).
 * Set to `null` if you don't want a reigning badge.
 */
export const REIGNING_CHAMPION = {
  code: "NOR",
  name: "Lando Norris",
  year: 2025, // Season the title was won
  reigningSeason: 2026, // Season they carry the Reigning Champion badge
  theme: "ice",
};

const normalise = (code) => (code ? code.trim().toUpperCase() : "");
const normaliseTeam = (id) => (id ? id.trim().toLowerCase() : "");

/**
 * Returns the matching champion object for a driver and viewed season, or undefined.
 * Includes `isReigning: true` when matched via REIGNING_CHAMPION on `reigningSeason`.
 */
export const getChampion = (code, season) => {
  const normCode = normalise(code);
  if (!normCode) return undefined;

  if (season === undefined) {
    return CHAMPIONS.find((c) => c.code.toUpperCase() === normCode);
  }

  const seasonNum = Number(season);

  // 1. Check if the driver won the title in this exact season
  const exactMatch = CHAMPIONS.find(
    (c) => c.code.toUpperCase() === normCode && Number(c.year) === seasonNum,
  );
  if (exactMatch) {
    return { ...exactMatch, isReigning: false };
  }

  // 2. Check if this driver is the Reigning Champion for this season
  if (
    REIGNING_CHAMPION &&
    REIGNING_CHAMPION.code.toUpperCase() === normCode &&
    Number(REIGNING_CHAMPION.reigningSeason ?? REIGNING_CHAMPION.year + 1) ===
      seasonNum
  ) {
    return { ...REIGNING_CHAMPION, isReigning: true };
  }

  return undefined;
};

// true/false
export const isChampion = (code, season) => !!getChampion(code, season);

/**
 * F1 Constructors' Champions & Reigning Constructors' Champion.
 * Shown on the Team Principal (TP) card in Team Garages and Constructor Standings.
 *
 *   teamId: constructor id (e.g. "mclaren", "red_bull", "ferrari", "mercedes")
 *   name:   Display name shown in the tooltip
 *   year:   Season the title was won
 *   theme:  optional badge colour (omit for gold)
 */
export const CONSTRUCTOR_CHAMPIONS = [
  { teamId: "mercedes", name: "Mercedes", year: 2026 },
  { teamId: "mclaren", name: "McLaren", year: 2025 },
  { teamId: "mclaren", name: "McLaren", year: 2024 },
  { teamId: "red_bull", name: "Red Bull", year: 2023 },
];
export const REIGNING_CONSTRUCTOR_CHAMPION = {
  teamId: "mclaren",
  name: "McLaren",
  year: 2025, // Season the title was won
  reigningSeason: 2026, // Season they carry the Reigning Constructors' Champion badge
  theme: "ice",
};

// Backwards-compatible alias
export const CURRENT_CONSTRUCTOR_CHAMPION = REIGNING_CONSTRUCTOR_CHAMPION;

export const getConstructorChampion = (teamId, season) => {
  const normTeam = normaliseTeam(teamId);
  if (!normTeam) return undefined;

  if (season === undefined) {
    return CONSTRUCTOR_CHAMPIONS.find(
      (c) => normaliseTeam(c.teamId) === normTeam,
    );
  }

  const seasonNum = Number(season);

  // 1. Exact season constructors' champion
  const exactMatch = CONSTRUCTOR_CHAMPIONS.find(
    (c) => normaliseTeam(c.teamId) === normTeam && Number(c.year) === seasonNum,
  );
  if (exactMatch) {
    return { ...exactMatch, isReigning: false };
  }

  // 2. Reigning constructors' champion for the following season
  if (
    REIGNING_CONSTRUCTOR_CHAMPION &&
    normaliseTeam(REIGNING_CONSTRUCTOR_CHAMPION.teamId) === normTeam &&
    Number(
      REIGNING_CONSTRUCTOR_CHAMPION.reigningSeason ??
        REIGNING_CONSTRUCTOR_CHAMPION.year + 1,
    ) === seasonNum
  ) {
    return { ...REIGNING_CONSTRUCTOR_CHAMPION, isReigning: true };
  }

  return undefined;
};

export const isConstructorChampion = (teamId, season) =>
  !!getConstructorChampion(teamId, season);
