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
  { code: "NOR", name: "Lando Norris", year: 2025 }, // no theme = gold
  /* { code: "ANT", name: "Kimi Antonelli", year: 2026, theme: "ice" }, */ // replace once confirmed
];

const normalise = (code) => (code ? code.trim().toUpperCase() : "");

// Returns the matching champion object, or undefined
export const getChampion = (code) =>
  CHAMPIONS.find((c) => c.code.toUpperCase() === normalise(code));

// true/false
export const isChampion = (code) => !!getChampion(code);

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

export const isConstructorChampion = (teamId) =>
  !!teamId &&
  teamId.trim().toLowerCase() ===
    CURRENT_CONSTRUCTOR_CHAMPION.teamId.toLowerCase();
