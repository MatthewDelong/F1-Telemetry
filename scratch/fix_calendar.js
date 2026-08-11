const fs = require('fs');

function fixFile(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace Bahrain (Sepang) with Malaysian Grand Prix
  content = content.replace(
    /"Bahrain Grand Prix": \{\s*round: 16,\s*raceKey: "f1.races.bahrain",\s*circuitKey: "f1.circuits.sepang"/g,
    `"Malaysian Grand Prix": {\n      round: 16,\n      raceKey: "f1.races.malaysia",\n      circuitKey: "f1.circuits.sepang"`
  );

  // Insert Bahrain before Miami
  const bahrainInsert = `"Bahrain Grand Prix": {
      round: 4,
      raceKey: "f1.races.bahrain",
      circuitKey: "f1.circuits.sakhir",
      date: "2026-04-12",
      localTime: "18:00",
      ukTime: "15:00",
      laps: 57,
      city: "Sakhir, BH",
      country: "Bahrain",
      lat: 26.0325,
      lng: 50.5106,
      displayName: "Sakhir",
      countDownDate: "2026-04-12T15:00:00Z",
      flag: "bh.webp",
      track: "Bahrain.webp",
      direction: "cw",
    },
    `;
  content = content.replace(/"Miami Grand Prix":/g, bahrainInsert + '"Miami Grand Prix":');

  // Fix all rounds inside RACES_DATA
  const startIdx = content.indexOf('const RACES_DATA = {');
  if (startIdx !== -1) {
    let bracketCount = 0;
    let endIdx = startIdx;
    for (let i = startIdx; i < content.length; i++) {
      if (content[i] === '{') bracketCount++;
      else if (content[i] === '}') {
        bracketCount--;
        if (bracketCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }
    
    let racesData = content.substring(startIdx, endIdx);
    let counter = 0;
    racesData = racesData.replace(/round:\s*\d+/g, () => {
      counter++;
      return `round: ${counter}`;
    });
    
    content = content.substring(0, startIdx) + racesData + content.substring(endIdx);
  }

  // Fix midpoint
  content = content.replace(/const midpoint = 11;/g, 'const midpoint = 12;');
  
  fs.writeFileSync(path, content, 'utf8');
}

fixFile('c:\\\\Users\\\\Matthew Delong\\\\Downloads\\\\F1-Telemetry\\\\src\\\\components\\\\RaceCalendar.jsx');
fixFile('c:\\\\Users\\\\Matthew Delong\\\\Downloads\\\\Matthews-World\\\\src\\\\pages\\\\FormulaOne.jsx');
console.log('Fixed');
