const fs = require('fs');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/proxy/f1';
const EXPORT_DIR = path.join(__dirname, '..', 'export_to_github');

async function exportData() {
  console.log('Starting export for GitHub...');

  // Create export directories
  if (!fs.existsSync(EXPORT_DIR)) fs.mkdirSync(EXPORT_DIR);
  const driversDir = path.join(EXPORT_DIR, 'drivers');
  const constructorsDir = path.join(EXPORT_DIR, 'constructors', '2026');
  if (!fs.existsSync(driversDir)) fs.mkdirSync(driversDir);
  if (!fs.existsSync(path.join(EXPORT_DIR, 'constructors'))) fs.mkdirSync(path.join(EXPORT_DIR, 'constructors'));
  if (!fs.existsSync(constructorsDir)) fs.mkdirSync(constructorsDir, { recursive: true });

  try {
    // 1. Get the list of drivers from the 2026 results
    const resultsPath = path.join(__dirname, '..', 'src', 'config', 'f1', 'results.json');
    const resultsData = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    
    const driverIds = new Set();
    const teamIds = new Set();
    
    resultsData.forEach(race => {
      race.Results.forEach(r => {
        if (r.Driver.driverId) driverIds.add(r.Driver.driverId);
        else if (r.Driver.code) driverIds.add(r.Driver.code.toLowerCase());
        
        if (r.Constructor.constructorId) teamIds.add(r.Constructor.constructorId);
      });
    });

    console.log(`Found ${driverIds.size} drivers and ${teamIds.size} teams to export.`);

    // 2. Export Driver JSONs
    for (const id of driverIds) {
      try {
        process.stdout.write(`Exporting driver: ${id}... `);
        const res = await axios.get(`${BASE_URL}/drivers/${id}.json`);
        fs.writeFileSync(path.join(driversDir, `${id}.json`), JSON.stringify(res.data, null, 2));
        console.log('Done.');
      } catch (e) {
        console.log(`Failed! (${e.response?.status || e.message})`);
      }
      await new Promise(r => setTimeout(r, 500)); // Small delay
    }

    // 3. Export Constructor Roster JSONs
    for (const teamId of teamIds) {
      try {
        process.stdout.write(`Exporting team roster: ${teamId}... `);
        const res = await axios.get(`${BASE_URL}/constructors/2026/${teamId}.json`);
        fs.writeFileSync(path.join(constructorsDir, `${teamId}.json`), JSON.stringify(res.data, null, 2));
        console.log('Done.');
      } catch (e) {
        console.log(`Failed! (${e.response?.status || e.message})`);
      }
      await new Promise(r => setTimeout(r, 200));
    }

    console.log('\nSUCCESS! All files saved to: ' + EXPORT_DIR);
    console.log('You can now drag these folders into your "f1nsight-api-2" GitHub repository.');

  } catch (err) {
    console.error('Export failed:', err.message);
  }
}

exportData();
