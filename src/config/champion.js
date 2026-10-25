/**
 * Reigning F1 World Champion.
 * ---------------------------------------------------------------
 * Update this when a new champion is crowned – the crown badge
 * will automatically move to the new driver everywhere on the site.
 *
 *   code: 3-letter driver code (must match the image filename, e.g. NOR.png)
 *   name: Display name shown in the tooltip
 *   year: Season the title was won
 */
export const CURRENT_CHAMPION = {
  code: "NOR",
  name: "Lando Norris",
  year: 2025,
};

export const isChampion = (code) =>
  !!code && code.trim().toUpperCase() === CURRENT_CHAMPION.code.toUpperCase();
