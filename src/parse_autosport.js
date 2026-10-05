const fs = require('fs');

function parseAutosport(file, type) {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.includes('<table')) return [];
  const tableStr = '<table' + content.split('<table')[1].split('</table>')[0];

  const rows = tableStr.split('<tr');
  rows.shift(); // remove first part
  const results = [];
  rows.forEach(row => {
    let nameMatch;
    if (type === 'driver') {
      nameMatch = row.match(/<span class="name-short">(.*?)<\/span>/s);
    } else {
      nameMatch = row.match(/class="ms-table_cell ms-table_field--team.*?>(.*?)<\/td>/s);
    }
    
    const ptsMatch = row.match(/class="ms-table_cell ms-table_field--total_points.*?>(.*?)<\/td>/s);
    if (nameMatch && ptsMatch) {
      let name = nameMatch[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
      const ptsStr = ptsMatch[1].replace(/<[^>]+>/g, '').trim();
      const pts = ptsStr ? parseInt(ptsStr, 10) : 0;
      results.push({ name, points: pts });
    }
  });
  return results;
}

const driverRes = parseAutosport('C:/Users/Matthew Delong/.gemini/antigravity-ide/brain/3b4e8a5d-0872-41a3-9750-d34fe11ff93e/.system_generated/steps/809/content.md', 'driver');
const teamRes = parseAutosport('C:/Users/Matthew Delong/.gemini/antigravity-ide/brain/3b4e8a5d-0872-41a3-9750-d34fe11ff93e/.system_generated/steps/833/content.md', 'team');

fs.writeFileSync('src/config/f2/official_driver_standings_2025.json', JSON.stringify(driverRes, null, 2));
fs.writeFileSync('src/config/f2/official_team_standings_2025.json', JSON.stringify(teamRes, null, 2));

console.log('Done!');
