const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { buildDriverStats } = require('./driverStatsBuilder');
const { connectDB } = require('./database');

const JOLPICA_BASE = 'https://api.jolpi.ca/ergast/f1';
const THROTTLE_MS = 500;
const START_YEAR = 1975;
const END_YEAR = new Date().getFullYear();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function run() {
  await connectDB();
  console.log(`Starting massive historical rebuild from ${START_YEAR} to ${END_YEAR}...`);

  const constructorsBase = path.join(__dirname, '..', 'src', 'config', 'f1', 'constructors');
  const driversBase = path.join(__dirname, '..', 'src', 'config', 'f1', 'drivers');
  
  await ensureDir(constructorsBase);
  await ensureDir(driversBase);

  const allDriversToBuild = new Set();

  for (let year = END_YEAR; year >= START_YEAR; year--) {
    console.log(`\n=== Processing Year ${year} ===`);
    const yearDir = path.join(constructorsBase, String(year));
    await ensureDir(yearDir);

    const yearFile = path.join(constructorsBase, `${year}.json`);
    let constructors = [];

    // 1. Fetch Constructors for the year
    try {
      if (fs.existsSync(yearFile)) {
        constructors = JSON.parse(fs.readFileSync(yearFile, 'utf8'));
        console.log(`Loaded ${constructors.length} constructors for ${year} from local file.`);
      } else {
        const res = await axios.get(`${JOLPICA_BASE}/${year}/constructors.json?limit=100`);
        constructors = res.data.MRData.ConstructorTable.Constructors;
        
        fs.writeFileSync(
          yearFile, 
          JSON.stringify(constructors, null, 4), 
          'utf8'
        );
        console.log(`Saved ${constructors.length} constructors for ${year}`);
      }

      // 2. Fetch Drivers for each Constructor
      for (const team of constructors) {
        const teamId = team.constructorId;
        const teamFile = path.join(yearDir, `${teamId}.json`);
        
        if (fs.existsSync(teamFile)) {
            const drivers = JSON.parse(fs.readFileSync(teamFile, 'utf8'));
            for (const d of drivers) {
              allDriversToBuild.add(d.driverId);
            }
            continue; // Skip fetching if already exists
        }

        await sleep(THROTTLE_MS);
        try {
          const driverRes = await axios.get(`${JOLPICA_BASE}/${year}/constructors/${teamId}/drivers.json`);
          const drivers = driverRes.data.MRData.DriverTable.Drivers;
          
          fs.writeFileSync(
            teamFile,
            JSON.stringify(drivers, null, 4),
            'utf8'
          );
          
          for (const d of drivers) {
            allDriversToBuild.add(d.driverId);
          }
        } catch (err) {
          console.error(`Failed to fetch drivers for ${teamId} in ${year}: ${err.message}`);
          if (err.message.includes('429')) {
             console.log(`Rate limit hit fetching teams! Pausing 60s...`);
             await sleep(60000);
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch constructors for ${year}:`, err.message);
      if (err.message.includes('429')) {
         console.log(`Rate limit hit fetching constructors! Pausing 60s...`);
         await sleep(60000);
         year++; // Increment year to counteract the year-- in the loop, effectively retrying this year
      }
    }
  }

  console.log(`\n=== Building Full Career Stats for ${allDriversToBuild.size} Historical Drivers ===`);
  console.log(`This will take a very long time. You can stop it with Ctrl+C and run it again later (it caches progress).`);
  
  let i = 1;
  for (const driverId of allDriversToBuild) {
    const driverPath = path.join(driversBase, `${driverId}.json`);
    
    // Skip if we already built it and it looks complete (has multiple seasons)
    // For a real full rebuild, you might remove this check, but it saves hours on restarts.
    if (fs.existsSync(driverPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(driverPath, 'utf8'));
        if (existing.totalRaces > 0 && existing.winRate !== undefined) {
           console.log(`[${i}/${allDriversToBuild.size}] Skipping ${driverId}, already exists.`);
           i++;
           continue;
        }
      } catch (e) {}
    }

    console.log(`[${i}/${allDriversToBuild.size}] Building stats for ${driverId}...`);
    let success = false;
    let retries = 0;
    while (!success) {
      try {
        const stats = await buildDriverStats(driverId);
        if (stats) {
          fs.writeFileSync(driverPath, JSON.stringify(stats, null, 4), 'utf8');
        }
        success = true;
      } catch (err) {
        console.error(`Error building ${driverId}:`, err.message);
        if (err.message.includes('Rate limit') || err.message.includes('429')) {
          console.log(`Rate limit hit! Pausing for 90 seconds before retrying...`);
          await sleep(90000);
          retries++;
        } else {
          // Break on non-rate-limit errors
          console.error(`Non-rate limit error, skipping ${driverId}`);
          break; 
        }
      }
    }
    i++;
  }

  console.log(`\n✅ Finished generating all historical static data! Commit it to GitHub!`);
  process.exit(0);
}

run().catch(console.error);
