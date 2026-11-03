/**
 * Reigning F1 World Champions.
 * ---------------------------------------------------------------
 * Update this when a new champion is crowned. The crown badge
 * will automatically show for every driver listed here.
 *
 *   code:  3-letter driver code (must match the image filename, e.g. NOR.png)
 *   name:  Display name shown in the tooltip
 *   year:  Season the title was won
 *   theme: optional badge colour. Leave out for gold, or use "ice"
 *          (add more themes in ChampionBadge.css)
 */
export const CHAMPIONS = [
  { code: "ANT", name: "Kimi Antonelli", year: 2026 }, // no theme = gold
  { code: "NOR", name: "Lando Norris", year: 2025, theme: "ice" }, // theme = ice
];

const normalise = (code) => (code ? code.trim().toUpperCase() : "");

// Returns the matching champion object, or undefined.
// If a season is given, only the champion of THAT season matches,
// so a 2026 champion never shows on 2025 (or older) pages.
export const getChampion = (code, season) =>
  CHAMPIONS.find(
    (c) =>
      c.code.toUpperCase() === normalise(code) &&
      (season === undefined || Number(c.year) === Number(season)),
  );

// true/false
export const isChampion = (code, season) => !!getChampion(code, season);

/**
 * Reigning F1 Constructors' Champion.
 * Shown on the Team Principal (TP) card in Team Garages.
 *
 *   teamId: constructor id (e.g. "mclaren", "red_bull", "ferrari", "mercedes")
 *   name:   Display name shown in the tooltip
 *   year:   Season the title was won
 *   theme:  optional badge colour (omit for gold)
 */
export const CURRENT_CONSTRUCTOR_CHAMPION = {
  teamId: "mclaren",
  name: "McLaren",
  year: 2025,
};

export const isConstructorChampion = (teamId, season) =>
  !!teamId &&
  teamId.trim().toLowerCase() ===
    CURRENT_CONSTRUCTOR_CHAMPION.teamId.toLowerCase() &&
  (season === undefined ||
    Number(CURRENT_CONSTRUCTOR_CHAMPION.year) === Number(season));
