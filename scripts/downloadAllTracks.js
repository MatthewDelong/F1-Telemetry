const fs = require('fs');
const https = require('https');

const fetchJson = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'NodeJS/18.0' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(JSON.parse(data)));
  }).on('error', reject);
});

const delay = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('Fetching all 2024 sessions...');
  const sessions = await fetchJson('https://api.openf1.org/v1/sessions?year=2024&session_name=Race');
  
  if(!fs.existsSync('public/trackdata')) fs.mkdirSync('public/trackdata', {recursive:true});
  
  const circuitsMapping = {
    10: 'albert_park', 2: 'silverstone', 15: 'catalunya', 22: 'monaco',
    14: 'interlagos', 39: 'monza', 7: 'spa', 46: 'suzuka', 55: 'zandvoort',
    4: 'hungaroring', 61: 'marina_bay', 9: 'cota', 144: 'baku',
    23: 'villeneuve', 70: 'yas_marina', 63: 'bahrain', 6: 'imola',
    149: 'jeddah', 19: 'red_bull_ring', 151: 'miami', 152: 'vegas',
    150: 'losail', 49: 'shanghai', 65: 'rodriguez'
  };

  for (const session of sessions) {
    const circuitId = circuitsMapping[session.circuit_key];
    if (!circuitId) continue;
    
    const filePath = 'public/trackdata/' + circuitId + '.json';
    if (fs.existsSync(filePath)) {
      console.log('Skipping ' + circuitId + ', already exists.');
      continue;
    }

    console.log('Processing ' + circuitId + ' (Session ' + session.session_key + ')...');
    try {
      const laps = await fetchJson('https://api.openf1.org/v1/laps?session_key=' + session.session_key);
      const validLaps = laps.filter(l => l.lap_duration > 50 && !l.is_pit_out_lap && l.duration_sector_1).sort((a,b)=>a.lap_duration-b.lap_duration);
      
      if (validLaps.length > 0) {
        const best = validLaps[0];
        const endMs = new Date(best.date_start).getTime() + (best.lap_duration * 1000);
        const dateEnd = new Date(endMs).toISOString();
        
        await delay(1000); // Respect rate limit
        const locUrl = 'https://api.openf1.org/v1/location?session_key=' + session.session_key + '&driver_number=' + best.driver_number + '&date>=' + best.date_start + '&date<=' + dateEnd;
        const loc = await fetchJson(locUrl);
        
        if (loc.length > 0) {
          fs.writeFileSync(filePath, JSON.stringify(loc));
          console.log('Saved ' + circuitId + '!');
        }
      }
    } catch(e) {
      console.error('Failed on ' + circuitId + ':', e.message);
    }
    await delay(1500); // 1.5s delay between tracks
  }
  console.log('All tracks downloaded!');
})();
