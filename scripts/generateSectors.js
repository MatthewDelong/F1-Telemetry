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
  const circuitsMapping = {
    10: 'albert_park', 2: 'silverstone', 15: 'catalunya', 22: 'monaco',
    14: 'interlagos', 39: 'monza', 7: 'spa', 46: 'suzuka', 55: 'zandvoort',
    4: 'hungaroring', 61: 'marina_bay', 9: 'cota', 144: 'baku',
    23: 'villeneuve', 70: 'yas_marina', 63: 'bahrain', 6: 'imola',
    149: 'jeddah', 19: 'red_bull_ring', 151: 'miami', 152: 'vegas',
    150: 'losail', 49: 'shanghai', 65: 'rodriguez'
  };

  const sessions = await fetchJson('https://api.openf1.org/v1/sessions?year=2024&session_name=Race');
  const sectorMap = {};

  for (const session of sessions) {
    const circuitId = circuitsMapping[session.circuit_key];
    if (!circuitId) continue;
    
    try {
      const laps = await fetchJson('https://api.openf1.org/v1/laps?session_key=' + session.session_key);
      const validLaps = laps.filter(l => l.lap_duration > 50 && !l.is_pit_out_lap && l.duration_sector_1 && l.duration_sector_2 && l.duration_sector_3).sort((a,b)=>a.lap_duration-b.lap_duration);
      
      if (validLaps.length > 0) {
        const best = validLaps[0];
        
        // Calculate timestamps
        const startMs = new Date(best.date_start).getTime();
        const s1EndMs = startMs + (best.duration_sector_1 * 1000);
        const s2EndMs = s1EndMs + (best.duration_sector_2 * 1000);
        const endMs = startMs + (best.lap_duration * 1000);
        
        await delay(500);
        const locUrl = 'https://api.openf1.org/v1/location?session_key=' + session.session_key + '&driver_number=' + best.driver_number + '&date>=' + new Date(startMs).toISOString() + '&date<=' + new Date(endMs).toISOString();
        const loc = await fetchJson(locUrl);
        
        if (loc.length > 0) {
          // Find closest indices
          let s1Index = 0;
          let s2Index = 0;
          
          for (let i = 0; i < loc.length; i++) {
            const t = new Date(loc[i].date).getTime();
            if (t >= s1EndMs && s1Index === 0) s1Index = i;
            if (t >= s2EndMs && s2Index === 0) s2Index = i;
          }
          
          const s1Percent = s1Index / loc.length;
          const s2Percent = s2Index / loc.length;
          
          sectorMap[circuitId] = [s1Percent, s2Percent];
          console.log(circuitId, s1Percent.toFixed(3), s2Percent.toFixed(3));
        }
      }
    } catch(e) {
      console.log('Failed', circuitId, e.message);
    }
    await delay(1000);
  }
  
  fs.writeFileSync('src/config/f1/sectorBoundaries.json', JSON.stringify(sectorMap, null, 2));
  console.log('Done!');
})();
