import fs from 'fs';

const driver1 = JSON.parse(fs.readFileSync('src/config/f1/drivers/antonelli.json', 'utf8'));
const driver2 = JSON.parse(fs.readFileSync('src/config/f1/drivers/russell.json', 'utf8'));

console.log("Driver 1 ID:", driver1.driverId);
console.log("Driver 2 ID:", driver2.driverId);
