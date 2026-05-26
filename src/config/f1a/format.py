import json

with open('results.json', 'r') as f:
    data = json.load(f)

def format_race_results(race_list):
    if not race_list:
        return '[]'
    lines = ['[']
    for i, obj in enumerate(race_list):
        # Dump the object to a single string without spaces around separators
        line_str = json.dumps(obj, separators=(', ', ': '))
        # Add 16 spaces of indentation
        if i < len(race_list) - 1:
            lines.append('                ' + line_str + ',')
        else:
            lines.append('                ' + line_str)
    lines.append('            ]')
    return '\n'.join(lines)

output_lines = ['[']
for idx, season_data in enumerate(data):
    lines = []
    lines.append('    {')
    lines.append('        "season": "' + season_data['season'] + '",')
    lines.append('        "round": "' + season_data['round'] + '",')
    lines.append('        "raceName": "' + season_data['raceName'] + '",')
    lines.append('        "Circuit": {')
    lines.append('            "circuitId": "' + season_data['Circuit']['circuitId'] + '",')
    lines.append('            "circuitName": "' + season_data['Circuit']['circuitName'] + '"')
    lines.append('        },')
    lines.append('        "Results": {')
    lines.append('            "race1": ' + format_race_results(season_data['Results'].get('race1', [])) + ',')
    lines.append('            "race2": ' + format_race_results(season_data['Results'].get('race2', [])))
    lines.append('        }')
    
    if idx < len(data) - 1:
        lines.append('    },')
    else:
        lines.append('    }')
    output_lines.extend(lines)
output_lines.append(']')

with open('results.json', 'w') as f:
    f.write('\n'.join(output_lines) + '\n')

print("Formatted results.json horizontally")
