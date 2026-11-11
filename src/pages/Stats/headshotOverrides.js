// For historical photos whose file name differs from the API's driver id.
// Format:  <api driver id>: '<file name without .png>'
// Run `node scripts/check-historical-headshots.mjs` to find these.
export const HEADSHOT_OVERRIDES = {
  phil_hill: 'phill_hill',
};

