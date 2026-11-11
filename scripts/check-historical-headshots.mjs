// Run from the project root: node scripts/check-historical-headshots.mjs   (Node 18+)
// Lists photos in public/images/historical/drivers whose names match no driver in the API,
// and suggests the closest driver id for each.
import { readdir } from 'node:fs/promises';

const DIR = process.argv[2] ?? 'public/images/historical/drivers';
const files = (await readdir(DIR)).filter((f) => /\.png$/i.test(f)).map((f) => f.replace(/\.png$/i, ''));

const ids = [];
for (let offset = 0; ; offset += 100) {
  const res = await fetch(`https://api.jolpi.ca/ergast/f1/drivers.json?limit=100&offset=${offset}`);
  if (!res.ok) throw new Error(`The API returned ${res.status}`);
  const d = (await res.json()).MRData;
  ids.push(...d.DriverTable.Drivers.map((x) => x.driverId));
  if (offset + 100 >= +d.total) break;
  await new Promise((r) => setTimeout(r, 500));
}

const lev = (a, b) => {
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
};

const idSet = new Set(ids);
const fileSet = new Set(files);
const unmatched = files.filter((f) => !idSet.has(f));
console.log(`${files.length} photos. ${files.length - unmatched.length} match a driver id exactly.`);

if (!unmatched.length) process.exit(0);
console.log(`\n${unmatched.length} photos match no driver id. Closest ids, best first:\n`);
const suggestions = [];
for (const f of unmatched) {
  const near = ids.filter((id) => !fileSet.has(id)).map((id) => [id, lev(f, id)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
  console.log(`  ${f}  ->  ${near.map(([id, d]) => `${id} (${d})`).join(', ')}`);
  if (near[0][1] <= 2) suggestions.push(`  ${near[0][0]}: '${f}',`);
}
if (suggestions.length) {
  console.log('\nPossible overrides. Check each one, then paste into src/headshotOverrides.js:\n');
  console.log(suggestions.join('\n'));
}
