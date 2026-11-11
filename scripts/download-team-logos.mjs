// Run from the project root:
//   node scripts/download-team-logos.mjs            all years
//   node scripts/download-team-logos.mjs 2024 2025  only those years
//   --force    download again even if the file already exists
//   --verbose  print every address tried and the result                     (Node 18+)
// Saves to public/images/teams/<year>/<constructorId>.webp (or .png if only that exists).
import { mkdir, writeFile, access } from 'node:fs/promises';

const MEDIA = 'https://media.formula1.com';
const CDN = `${MEDIA}/image/upload`;
const VERSIONS = ['v1740000001', 'v1740000000']; // the CDN folder version; the script tries each
const EXTS = ['webp', 'png'];

// Left: constructorId as used by the stats API. Right: team folder name on the F1 site.
const CORE = { mercedes: 'mercedes', ferrari: 'ferrari', red_bull: 'redbullracing', mclaren: 'mclaren', haas: 'haasf1team', williams: 'williams' };
const TEAMS = {
  2026: { ...CORE, rb: 'racingbulls', alpine: 'alpine', audi: 'audi', aston_martin: 'astonmartin', cadillac: 'cadillac' },
  2025: { ...CORE, rb: 'racingbulls', alpine: 'alpine', sauber: 'kicksauber', aston_martin: 'astonmartin' },
  2024: { mercedes: 'mercedes', ferrari: 'ferrari', red_bull: 'redbullracing', mclaren: 'mclaren', williams: 'williams', haas: ['haasf1team', 'haas'],
    rb: ['racingbulls', 'visacashapprb', 'rb'], alpine: 'alpine', sauber: 'kicksauber', aston_martin: 'astonmartin' },
  2023: { ...CORE, alfa: 'alfaromeo', alpine: 'alpine', alphatauri: 'alphatauri', aston_martin: 'astonmartin' },
  2022: { ...CORE, alfa: 'alfaromeo', alpine: 'alpine', alphatauri: 'alphatauri', aston_martin: 'astonmartin' },
  2021: { ...CORE, alfa: 'alfaromeo', alpine: 'alpine', alphatauri: 'alphatauri', aston_martin: 'astonmartin' },
  2020: { ...CORE, alfa: 'alfaromeo', renault: 'renault', alphatauri: 'alphatauri', racing_point: 'racingpoint' },
  2019: { ...CORE, alfa: 'alfaromeo', renault: 'renault', toro_rosso: 'tororosso', racing_point: 'racingpoint' },
  2018: { ...CORE, sauber: 'sauber', renault: 'renault', toro_rosso: 'tororosso', force_india: 'forceindia', racing_point: 'racingpoint' },
};

// Older seasons: the F1 site used a different layout. These are best guesses, tried only when the main pattern fails.
const SLUGS = { mercedes: 'mercedes', ferrari: 'ferrari', red_bull: 'red-bull-racing', mclaren: 'mclaren', haas: 'haas-f1-team', williams: 'williams',
  alfa: 'alfa-romeo', alpine: 'alpine', alphatauri: 'alphatauri', aston_martin: 'aston-martin', renault: 'renault', racing_point: 'racing-point',
  toro_rosso: 'toro-rosso', sauber: 'sauber', force_india: 'force-india', rb: 'rb' };
const LEGACY = [
  (y, s) => `${MEDIA}/content/dam/fom-website/teams/${y}/${s}-logo.png`,
  (y, s) => `${MEDIA}/content/dam/fom-website/teams/${y}/${s}-logo.png.transform/2col/image.png`,
  (y, s) => `${CDN}/content/dam/fom-website/teams/${y}/${s}-logo.png.transform/2col/image.png`,
];

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const force = args.includes('--force');
const years = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
const todo = (years.length ? years : Object.keys(TEAMS).map(Number)).sort((a, b) => b - a);

const exists = (p) => access(p).then(() => true, () => false);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.formula1.com/' };

function candidates(year, id, folders) {
  const out = [];
  for (const folder of [].concat(folders)) for (const v of VERSIONS) for (const ext of EXTS)
    out.push({ ext, url: `${CDN}/${v}/common/f1/${year}/${folder}/${year}${folder}logo.${ext}` });
  if (SLUGS[id]) for (const make of LEGACY) out.push({ ext: 'png', url: make(year, SLUGS[id]) });
  return out;
}

async function download(year, id, folders) {
  for (const { ext, url } of candidates(year, id, folders)) {
    try {
      const res = await fetch(url, { headers });
      await wait(120);
      const isImage = res.ok && (res.headers.get('content-type') || '').startsWith('image/');
      if (verbose) console.log(`   ${isImage ? 'ok  ' : res.status} ${url}`);
      if (isImage) return { ext, buf: Buffer.from(await res.arrayBuffer()) };
    } catch { /* try the next one */ }
  }
  return null;
}

const failed = [];
let saved = 0;
for (const year of todo) {
  if (!TEAMS[year]) { console.log(`No team list for ${year}, skipped`); continue; }
  const dir = `public/images/teams/${year}`;
  await mkdir(dir, { recursive: true });
  for (const [id, folders] of Object.entries(TEAMS[year])) {
    if (!force && ((await exists(`${dir}/${id}.webp`)) || (await exists(`${dir}/${id}.png`)))) { console.log(`have   ${year} ${id}`); continue; }
    const got = await download(year, id, folders);
    if (got) { await writeFile(`${dir}/${id}.${got.ext}`, got.buf); saved++; console.log(`saved  ${year} ${id}`); }
    else { failed.push(`${year} ${id}`); console.log(`FAILED ${year} ${id}`); }
  }
}
console.log(`\nSaved ${saved}. Failed ${failed.length}.`);
if (failed.length) console.log('Failed:\n  ' + failed.join('\n  ') + '\nFor these, save the logo yourself as public/images/teams/<year>/<id>.webp');
