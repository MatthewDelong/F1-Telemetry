const { buildDriverStats } = require('../backend/driverStatsBuilder');

async function test() {
  try {
    const stats = await buildDriverStats('leclerc');
    console.log('Stats built successfully:', !!stats);
    if (stats) {
      console.log('Final Standings 2026:', stats.finalStandings['2026']);
      console.log('Season Wins 2026:', stats.seasonWins['2026']);
      console.log('Season Podiums 2026:', stats.seasonPodiums['2026']);
      console.log('Season Poles 2026:', stats.seasonPoles['2026']);
      console.log('Season DNFs 2026:', stats.seasonDNFs['2026']);
    }
  } catch (err) {
    console.error('Error building stats:', err);
  }
}

test();
