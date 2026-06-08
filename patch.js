const fs = require('fs');
const p = 'src/config/f1/api_update.py';
let c = fs.readFileSync(p, 'utf8');

const funcDef = `
def remove_jak_crawford():
    import json
    import os
    print("==========Removing Jak Crawford==========")
    path = os.path.join(os.path.dirname(__file__), 'constructors', '2026', 'aston_martin.json')
    try:
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as file:
                data = json.load(file)
            
            if isinstance(data, list):
                data = [d for d in data if d.get('driverId') != 'jak_crawford']
            elif 'Drivers' in data:
                data['Drivers'] = [d for d in data['Drivers'] if d.get('driverId') != 'jak_crawford']
                
            with open(path, 'w', encoding='utf-8') as file:
                json.dump(data, file, indent=4)
    except Exception as e:
        pass
`;

c = c.replace('def fix_antonelli_name():', funcDef + '\ndef fix_antonelli_name():');
fs.writeFileSync(p, c);
console.log('Patched');
