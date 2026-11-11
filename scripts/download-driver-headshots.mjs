// Run from the project root (Node 18+):
//   node scripts/download-driver-headshots.mjs            current year
//   node scripts/download-driver-headshots.mjs 2025       a specific year
//   --force    download again even if the file already exists
//   --verbose  print every address tried and the result
//   --fix      crop full-length photos already in the folder to head and shoulders (add the word 'historical' for that folder)
// Full-length photos are cropped to a square from the top. This needs sharp:  npm install -D sharp
// Saves to public/images/<year>/drivers/<CODE>.png (or .webp if that is all the server has).
import { mkdir, writeFile, readFile, readdir, access } from 'node:fs/promises';

const MEDIA = 'https://media.formula1.com/image/upload';
const VERSIONS = ['v1740000001', 'v1740000000'];
const SIZE = 'c_lfill,w_440/q_auto'; // 440px wide, compressed. No fallback image, so a missing photo is a clean 404.
const EXT_BY_TYPE = { 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' };

// constructorId from the stats API -> team folder name on the F1 site
const TEAM_FOLDERS = {
  mercedes: 'mercedes', ferrari: 'ferrari', red_bull: 'redbullracing', mclaren: 'mclaren', haas: 'haasf1team', williams: 'williams',
  rb: 'racingbulls', alpine: 'alpine', audi: 'audi', aston_martin: 'astonmartin', cadillac: 'cadillac', sauber: 'kicksauber',
  alfa: 'alfaromeo', alphatauri: 'alphatauri', renault: 'renault', racing_point: 'racingpoint', toro_rosso: 'tororosso', force_india: 'forceindia',
};

const args = process.argv.slice(2);
const force = args.includes('--force');
const verbose = args.includes('--verbose');
const year = Number(args.find((a) => /^\d{4}$/.test(a))) || new Date().getFullYear();

let sharp = null;
try { sharp = (await import('sharp')).default; } catch { /* optional */ }

// Full-length photos (much taller than wide) become a square head-and-shoulders crop from the top.
async function toHeadshot(buf) {
  if (!sharp) return buf;
  const img = sharp(buf);
  const { width, height, format } = await img.metadata();
  if (!width || !height || height <= width * 1.15) return buf;
  const out = img.extract({ left: 0, top: 0, width, height: width });
  return format === 'webp' ? out.webp({ quality: 90 }).toBuffer()
    : format === 'jpeg' ? out.jpeg({ quality: 90 }).toBuffer() : out.png({ compressionLevel: 9 }).toBuffer();
}

const exists = (p) => access(p).then(() => true, () => false);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const letters = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const headers = { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.formula1.com/' };

// The F1 site's driver id: 3 letters of first name + 3 of surname + 01, e.g. maxver01, andant01.
function driverIds(d) {
  const first = d.givenName.split(/\s+/);
  const last = letters(d.familyName);
  const firsts = [...new Set([letters(first.join('')).slice(0, 3), letters(first[0]).slice(0, 3), letters(first[first.length - 1]).slice(0, 3)])];
  return firsts.map((f) => `${f}${last.slice(0, 3)}01`);
}

async function getDrivers() {
  const res = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/driverstandings.json?limit=100`);
  if (!res.ok) throw new Error(`Jolpica returned ${res.status}`);
  const list = (await res.json()).MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
  if (list.length) return list.map((s) => ({ ...s.Driver, teams: s.Constructors.map((c) => c.constructorId).reverse() }));
  const res2 = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/drivers.json?limit=100`);
  if (!res2.ok) throw new Error(`Jolpica returned ${res2.status}`);
  return (await res2.json()).MRData.DriverTable.Drivers.map((d) => ({ ...d, teams: [] }));
}

async function download(d) {
  const folders = d.teams.map((t) => TEAM_FOLDERS[t]).filter(Boolean);
  const teamFolders = folders.length ? folders : [...new Set(Object.values(TEAM_FOLDERS))]; // unknown team: try them all
  for (const team of teamFolders) for (const id of driverIds(d)) for (const v of VERSIONS) for (const ext of ['png', 'webp']) {
    const url = `${MEDIA}/${SIZE}/${v}/common/f1/${year}/${team}/${id}/${year}${team}${id}right.${ext}`;
    try {
      const res = await fetch(url, { headers });
      await wait(120);
      const type = (res.headers.get('content-type') || '').split(';')[0];
      const ok = res.ok && type.startsWith('image/');
      if (verbose) console.log(`   ${ok ? 'ok  ' : res.status} ${url}`);
      if (ok) return { ext: EXT_BY_TYPE[type] ?? ext, buf: Buffer.from(await res.arrayBuffer()) };
    } catch { /* try the next address */ }
  }
  return null;
}

const dir = `public/images/${year}/drivers`;
await mkdir(dir, { recursive: true });

if (args.includes('--fix')) {
  if (!sharp) { console.log('This needs sharp. Run: npm install -D sharp'); process.exit(1); }
  const target = args.includes('historical') ? 'public/images/historical/drivers' : dir;
  let n = 0;
  for (const f of (await readdir(target)).filter((x) => /\.(png|webp|jpe?g)$/i.test(x))) {
    const buf = await readFile(`${target}/${f}`);
    const out = await toHeadshot(buf);
    if (out !== buf) { await writeFile(`${target}/${f}`, out); n++; console.log(`cropped ${f}`); }
  }
  console.log(`\nCropped ${n} full-length photos in ${target}.`);
  process.exit(0);
}

if (!sharp) console.log('Note: sharp is not installed, so full-length photos will be saved uncropped. Run: npm install -D sharp\n');
const drivers = await getDrivers();
console.log(`${year}: ${drivers.length} drivers\n`);

const failed = [];
let saved = 0;
for (const d of drivers) {
  const code = (d.code || letters(d.familyName).slice(0, 3)).toUpperCase();
  const name = `${d.givenName} ${d.familyName}`;
  if (!force && ((await exists(`${dir}/${code}.png`)) || (await exists(`${dir}/${code}.webp`)))) { console.log(`have   ${code} ${name}`); continue; }
  const got = await download(d);
  if (got) { await writeFile(`${dir}/${code}.${got.ext}`, await toHeadshot(got.buf)); saved++; console.log(`saved  ${code} ${name}`); }
  else { failed.push(`${code} ${name}`); console.log(`FAILED ${code} ${name}`); }
}
console.log(`\nSaved ${saved}. Failed ${failed.length}.`);
if (failed.length) console.log(`Failed:\n  ${failed.join('\n  ')}\nFor these, save the photo yourself as ${dir}/<CODE>.png`);
