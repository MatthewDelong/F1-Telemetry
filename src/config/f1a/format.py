import json

PATH = '2026/results.json'

with open(PATH, 'r', encoding='utf-8') as f:
    data = json.load(f)


def q(value):
    """JSON-quote a string safely (keeps accents, escapes quotes)."""
    return json.dumps(value, ensure_ascii=False)


def format_race_results(race_list):
    if not race_list:
        return '[]'
    lines = ['[']
    for i, obj in enumerate(race_list):
        # One driver per line, no extra spaces inside the braces
        line_str = json.dumps(obj, separators=(', ', ': '), ensure_ascii=False)
        comma = ',' if i < len(race_list) - 1 else ''
        lines.append('                ' + line_str + comma)
    lines.append('            ]')
    return '\n'.join(lines)


def race_sort_key(key):
    # race0, race1, race2, race3 ... in numeric order
    digits = ''.join(ch for ch in key if ch.isdigit())
    return int(digits) if digits else 999


output_lines = ['[']
for idx, season_data in enumerate(data):
    c_name = season_data['Circuit']['circuitName']
    c_name_str = c_name.get('CircuitName', '') if isinstance(c_name, dict) else str(c_name)

    lines = []
    lines.append('    {')
    lines.append('        "season": ' + q(season_data['season']) + ',')
    lines.append('        "round": ' + q(season_data['round']) + ',')
    lines.append('        "raceName": ' + q(season_data['raceName']) + ',')
    lines.append('        "Circuit": {')
    lines.append('            "circuitId": ' + q(season_data['Circuit']['circuitId']) + ',')
    lines.append('            "circuitName": ' + q(c_name_str))
    lines.append('        },')
    lines.append('        "Results": {')

    # Keep EVERY race that exists (race0, race1, race2, race3, ...)
    race_keys = sorted(season_data['Results'].keys(), key=race_sort_key)
    for n, key in enumerate(race_keys):
        comma = ',' if n < len(race_keys) - 1 else ''
        lines.append('            ' + q(key) + ': ' + format_race_results(season_data['Results'][key]) + comma)

    lines.append('        }')
    lines.append('    },' if idx < len(data) - 1 else '    }')
    output_lines.extend(lines)
output_lines.append(']')

with open(PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_lines) + '\n')

print("Formatted results.json horizontally")