const fs = require('fs');
const file = 'c:/Users/Matthew Delong/Downloads/F1-Telemetry/src/config/f1a/results.json';
let content = fs.readFileSync(file, 'utf8');

// The regex will match `, "FastestLap": {"rank": "...", ...}`
const regex = /, "FastestLap": \{"rank": "([^"]+)", "lap": "([^"]+)", "Time": \{"time": "([^"]+)"\}\}/g;

content = content.replace(regex, (match, rank) => {
    return rank === '1' ? match : '';
});

// There is one edge case where it's missing the "lap" field for Canada?
// Let's check f1a/results.json Canada:
// "FastestLap": {"rank": "11", "lap": "0", "Time": {"time": "1:40.030"}}
// Wait, one of them has lap "-" ? No, that was F2. In F1A they all have "lap": "0".
// Let's use a simpler regex that just matches the whole object:
const simplerRegex = /, "FastestLap": \{"rank": "([^"]+)"[^\}]+\{[^\}]+\}\}/g;

content = content.replace(simplerRegex, (match, rank) => {
    return rank === '1' ? match : '';
});

// Some might just have `"FastestLap": {"rank": "6", "lap": "0", "Time": {"time": "1:39.867"}}`
// Let's do a more robust string manipulation:
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/, "FastestLap": \{"rank": "([^"]+)"/);
    if (match && match[1] !== '1') {
        lines[i] = lines[i].replace(/, "FastestLap": \{.*\}/, '');
    }
}

fs.writeFileSync(file, lines.join('\n'));
console.log("Done");
