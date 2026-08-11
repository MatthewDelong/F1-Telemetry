const fs = require('fs');

function fixTelemetry(path) {
  let content = fs.readFileSync(path, 'utf8');
  
  // Replace Bahrain with Malaysian GP
  content = content.replace(
    /\{ meeting_name: "Bahrain Grand Prix", location: "Kuala Lumpur", country_name: "Malaysia", date_start: "2026-10-04T07:00:00Z", meeting_key: "bah2026" \},/g,
    `{ meeting_name: "Malaysian Grand Prix", location: "Kuala Lumpur", country_name: "Malaysia", date_start: "2026-10-04T07:00:00Z", meeting_key: "mal2026" },`
  );

  // Insert Bahrain before Miami
  const bahrainInsert = `    { meeting_name: "Bahrain Grand Prix", location: "Sakhir", country_name: "Bahrain", date_start: "2026-04-12T15:00:00Z", meeting_key: "bhr2026" },\n`;
  content = content.replace(/    \{ meeting_name: "Miami Grand Prix",/g, bahrainInsert + '    { meeting_name: "Miami Grand Prix",');

  fs.writeFileSync(path, content, 'utf8');
}

fixTelemetry('c:\\\\Users\\\\Matthew Delong\\\\Downloads\\\\Matthews-World\\\\src\\\\pages\\\\Telemetry.jsx');
console.log('Fixed');
