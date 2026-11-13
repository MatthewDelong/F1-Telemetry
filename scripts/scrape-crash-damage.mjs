// Scrapes F1 team & driver crash damage estimates (Destructors' Championship)
// from https://app.formula1dashboard.com/destructors-championship/{year}/
// and writes public/stats_cache/crash-damage.json.
// Usage:
//   node scripts/scrape-crash-damage.mjs         # scrapes 2024..currentYear
//   node scripts/scrape-crash-damage.mjs 2026    # scrapes only 2026
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const OUT_PATH = 'public/stats_cache/crash-damage.json';
const BASE_URL = 'https://app.formula1dashboard.com/destructors-championship';
const FIRST_YEAR = 2024;

// Map formula1dashboard team-logo slugs to Jolpica constructorId values
const SLUG_TO_CONSTRUCTOR = {
  rbr: 'red_bull',
  red_bull: 'red_bull',
  'red-bull': 'red_bull',
  'kick-sauber': 'sauber',
  sauber: 'sauber',
  'aston-martin': 'aston_martin',
  aston_martin: 'aston_martin',
  '2026-williams': 'williams',
  williams: 'williams',
  '2026-mercedes': 'mercedes',
  mercedes: 'mercedes',
  ferrari: 'ferrari',
  mclaren: 'mclaren',
  rb: 'rb',
  alpine: 'alpine',
  haas: 'haas',
  audi: 'audi',
  cadillac: 'cadillac',
};

function normalizeTeamSlug(slug) {
  if (!slug) return null;
  const cleaned = slug.replace(/^\d{4}-/, '').toLowerCase();
  return SLUG_TO_CONSTRUCTOR[slug.toLowerCase()] || SLUG_TO_CONSTRUCTOR[cleaned] || cleaned.replace(/-/g, '_');
}

function parseSeasonHtml(html) {
  const teams = {};
  const rows = [...html.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)]
    .map((m) => m[1])
    .filter((row) => row.includes('team-logos/'));

  for (const row of rows) {
    const slug = row.match(/team-logos\/([^"'?]+)-normalized-logo\.png/)?.[1];
    const constructorId = normalizeTeamSlug(slug);
    if (!constructorId) continue;

    const costMatch = row.match(/\$[\d,]+/);
    if (!costMatch) continue;
    const cost = Number(costMatch[0].replace(/[$,]/g, ''));
    if (!Number.isFinite(cost)) continue;

    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((c) =>
      c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    const driverName = cells[1] || 'Unknown';

    if (!teams[constructorId]) {
      teams[constructorId] = { total: 0, drivers: [] };
    }
    teams[constructorId].total += cost;
    teams[constructorId].drivers.push({ name: driverName, cost });
  }

  for (const entry of Object.values(teams)) {
    entry.drivers.sort((a, b) => b.cost - a.cost);
  }
  return teams;
}

async function scrapeSeason(year) {
  const url = `${BASE_URL}/${year}/`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'F1-Telemetry-Stats-Scraper/1.0' },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  const teams = parseSeasonHtml(html);
  return Object.keys(teams).length > 0 ? teams : null;
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(OUT_PATH, 'utf8'));
  } catch {
    return { seasons: {} };
  }
}

async function main() {
  const argYear = process.argv.slice(2).find((a) => /^\d{4}$/.test(a));
  const currentYear = new Date().getFullYear();
  const years = argYear
    ? [Number(argYear)]
    : Array.from({ length: Math.max(1, currentYear - FIRST_YEAR + 1) }, (_, i) => FIRST_YEAR + i);

  const existing = await loadExisting();
  const seasons = { ...(existing.seasons || {}) };

  for (const year of years) {
    try {
      const data = await scrapeSeason(year);
      if (data) {
        seasons[String(year)] = data;
        const totalTeams = Object.keys(data).length;
        console.log(`${year}: scraped ${totalTeams} constructors`);
      } else {
        console.log(`${year}: no data (404 or empty), keeping existing if any`);
      }
    } catch (err) {
      console.warn(`${year}: failed (${err.message}), keeping existing if any`);
    }
  }

  await mkdir('public/stats_cache', { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    source: 'formula1dashboard.com',
    seasons,
  };
  await writeFile(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

