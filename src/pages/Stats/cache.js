// Reads the pre-built race files from public/stats_cache/<season>/<round>.json (made by scripts/build-cache.mjs).
// Returns null when a race hasn't been built yet. Nothing here calls the live APIs.
const memo = new Map();

export function getRaceCache(season, round) {
  const key = `${season}/${round}`;
  if (!memo.has(key)) {
    memo.set(key, fetch(`${import.meta.env.BASE_URL}stats_cache/${key}.json`)
      .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
      .catch(() => null));
  }
  return memo.get(key);
}

