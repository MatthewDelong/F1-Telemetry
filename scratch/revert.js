const fs = require('fs');

function revertFile(path) {
  let content = fs.readFileSync(path, 'utf8');

  // 1. Remove Bahrain from RACES_DATA / Races
  content = content.replace(
    /"Bahrain Grand Prix": \{\s*round: \d+,\s*raceKey: "f1\.races\.bahrain",\s*circuitKey: "f1\.circuits\.sakhir".*?\},/s,
    ''
  );

  // 2. Fix all rounds inside RACES_DATA
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

  // 3. Fix midpoint
  content = content.replace(/const midpoint = 12;/g, 'const midpoint = 11;');
  
  fs.writeFileSync(path, content, 'utf8');
}

revertFile('c:\\\\Users\\\\Matthew Delong\\\\Downloads\\\\F1-Telemetry\\\\src\\\\components\\\\RaceCalendar.jsx');
revertFile('c:\\\\Users\\\\Matthew Delong\\\\Downloads\\\\Matthews-World\\\\src\\\\pages\\\\FormulaOne.jsx');

// Now revert the Telemetry.jsx FALLBACK_MEETINGS array
let telemetryPath = 'c:\\\\Users\\\\Matthew Delong\\\\Downloads\\\\Matthews-World\\\\src\\\\pages\\\\Telemetry.jsx';
let tContent = fs.readFileSync(telemetryPath, 'utf8');
tContent = tContent.replace(/    \{ meeting_name: "Bahrain Grand Prix", location: "Sakhir".*?\},[\r\n]+/g, '');
fs.writeFileSync(telemetryPath, tContent, 'utf8');

// Now revert the races.json
let racesPath = 'c:\\\\Users\\\\Matthew Delong\\\\Downloads\\\\F1-Telemetry\\\\src\\\\config\\\\f1\\\\races.json';
let rContent = fs.readFileSync(racesPath, 'utf8');
rContent = rContent.replace(/\s*"Bahrain Grand Prix": \{\s*"meeting_key": 1282,\s*"location": "Sakhir"\s*\},/g, '');
fs.writeFileSync(racesPath, rContent, 'utf8');

console.log('Reverted to 23 races');
