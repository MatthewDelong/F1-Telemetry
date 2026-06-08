const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: 'backend/f1_cache.sqlite', logging: false });
sequelize.query("SELECT value FROM Caches WHERE key = 'f1:drivers/alonso.json'").then(([res]) => {
  if (res.length) {
    const data = JSON.parse(res[0].value);
    console.log("alonso", data.finalStandings['2026']);
  } else console.log('alonso not found');
});
sequelize.query("SELECT value FROM Caches WHERE key = 'f1:drivers/perez.json'").then(([res]) => {
  if (res.length) {
    const data = JSON.parse(res[0].value);
    console.log("perez", data.finalStandings['2026']);
  } else console.log('perez not found');
});
