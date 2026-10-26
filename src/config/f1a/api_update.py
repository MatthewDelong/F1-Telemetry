import sys
import json
import re
import requests
import os

# OPTIONAL: set the full path of your project's results.json to force where it is written.
# Example (Windows): r"C:\Users\you\my-project\src\config\f1a\2026\results.json"
# Leave as "" to auto-detect <project>/src/config/f1a/<season>/results.json
RESULTS_PATH = ""

# PASTE YOUR URL HERE:
URL_TO_SCRAPE = "https://www.f1academy.com/Racing-Series/Results?raceid=24"

def parse_time(t_str):
    if not t_str:
        return float('inf')
    parts = t_str.split(':')
    if len(parts) == 2:
        return float(parts[0]) * 60 + float(parts[1])
    try:
        return float(t_str)
    except:
        return float('inf')

def format_race(data, pole_car_number=None):
    if not data:
        return []
    
    min_time = float('inf')
    fastest_driver_id = None
    
    for d in data:
        best = d.get('Best')
        if best:
            time_obj = parse_time(best)
            if time_obj < min_time:
                min_time = time_obj
                fastest_driver_id = d.get('DriverId')
                
    formatted_data = []
    for index, d in enumerate(data):
        is_fastest = d.get('DriverId') == fastest_driver_id
        
        pos = d.get('DisplayFinishPosition') or d.get('FinishPosition') or d.get('ResultStatus') or ""
        pos = str(pos)
        
        if pos in ["DNF", "Ret", ""]:
            pos = str(index + 1)
            
        gap = d.get('Gap', "-")
        if gap == "DNF":
            gap = ""
            
        laps = str(d.get('LapsCompleted', '0'))
        
        time_or_reason = d.get('TimeOrFinishReason', '')
        display_pos = str(d.get('DisplayFinishPosition', ''))
        
        time_val = "" if (display_pos == "DNF" or display_pos == "") else time_or_reason
        
        res = {
            "number": str(d.get('CarNumber', '')),
            "position": pos,
            "laps": laps,
            "gap": gap,
            "status": "Finished",
            "Time": { "time": time_val }
        }
        
        base_points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
        pts = 0
        try:
            p_num = int(pos)
            if 1 <= p_num <= 10:
                pts += base_points[p_num - 1]
        except:
            p_num = -1
            
        if pole_car_number and res["number"] == pole_car_number:
            res["grid"] = "1"
            pts += 2
            
        if is_fastest and 1 <= p_num <= 10:
            pts += 1
            
        res["points"] = str(pts)

        
        if pos == "1":
            res["gap"] = "-"
            
        if time_val == "":
            res.pop("laps", None)
            res.pop("gap", None)
            
        best_time = d.get('Best', '')
        if best_time:
            res["FastestLap"] = {
                "rank": "1" if is_fastest else "",
                "lap": str(d.get('BestLap', '1')),
                "Time": { "time": best_time }
            }
            
        formatted_data.append(res)
        
    return formatted_data

def custom_stringify(results):
    json_str = json.dumps(results, indent=4, ensure_ascii=False)
    
    def replacer(match):
        text = match.group(0)
        # remove newlines and multiple spaces
        text = re.sub(r'\n\s+', ' ', text)
        text = text.replace('" }', '"}')
        text = text.replace('} }', '}}')
        return text

    json_str = re.sub(r'\{\n\s+"number"[\s\S]*?\n\s+\}', replacer, json_str)
    return json_str

class _Tee:
    def __init__(self, *streams):
        self.streams = streams
    def write(self, data):
        for st in self.streams:
            st.write(data)
    def flush(self):
        for st in self.streams:
            st.flush()

def main():
    _log = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'last_run.log'), 'w', encoding='utf-8')
    sys.stdout = _Tee(sys.__stdout__, _log)
    print("api_update.py version: 3-race-fix v4")
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = URL_TO_SCRAPE
        
    print(f"Fetching {url} ...")
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch: {response.status_code}")
        return
        
    html = response.text
    match = re.search(r'<script id="__NEXT_DATA__" type="application/json">([\s\S]*?)</script>', html)
    if not match:
        print("Could not find __NEXT_DATA__ in the page")
        sys.exit(1)
        
    next_data = json.loads(match.group(1))
    page_data = next_data.get('props', {}).get('pageProps', {}).get('pageData', {})
    
    if not page_data:
        print("Could not find pageData in __NEXT_DATA__")
        return
        
    session_results = page_data.get('SessionResults', [])
    races_data = {}

    # Dump the raw sessions next to the script so we can see exactly what the site returned
    debug_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'debug_sessions.json')
    with open(debug_path, 'w', encoding='utf-8') as f:
        json.dump([{ 'SessionName': x.get('SessionName'), 'count': len(x.get('Results', []) or []),
                     'keys': list(x.keys()) } for x in session_results], f, indent=2)
    print(f"Wrote {debug_path}")

    # Show exactly what the site gave us, so naming problems are obvious
    print("Sessions found on page:")
    for session in session_results:
        print(f"  - {session.get('SessionName', '')!r}: {len(session.get('Results', []) or [])} results")

    def keyword_slot(name):
        if 'opening' in name:
            return 'opening'
        if 'reverse' in name:
            return 'reverse'
        if 'feature' in name or 'main race' in name:
            return 'feature'
        return None

    race_sessions = []
    for session in session_results:
        name = session.get('SessionName', '').lower()
        results = session.get('Results', []) or []
        if 'qualif' in name:
            races_data['qualifying'] = results
        elif 'practice' in name or 'test' in name:
            continue
        else:
            race_sessions.append((name, results))

    # 3 race sessions = opening / reverse / feature weekend, 2 = reverse / feature
    if len(race_sessions) >= 3:
        slots = ['opening', 'reverse', 'feature']
    elif len(race_sessions) == 2:
        slots = ['reverse', 'feature']
    else:
        slots = ['feature']

    # First assign by name, then fill anything left over by page order
    unassigned = []
    for name, results in race_sessions:
        slot = keyword_slot(name)
        if slot in slots and slot not in races_data:
            races_data[slot] = results
        else:
            unassigned.append((name, results))
    for slot in slots:
        if slot not in races_data and unassigned:
            name, results = unassigned.pop(0)
            races_data[slot] = results
            print(f"  (assigned {name!r} to {slot} by page order)")

    fastest_quali_time = float('inf')
    pole_car_number = None

    def time_to_ms(t_str):
        if not t_str: return float('inf')
        parts = t_str.split(':')
        if len(parts) == 2:
            return float(parts[0]) * 60 * 1000 + float(parts[1]) * 1000
        try:
            return float(t_str) * 1000
        except:
            return float('inf')

    if 'qualifying' in races_data:
        for res in races_data['qualifying']:
            if str(res.get('FinishPosition', '')) == '1' or str(res.get('DisplayFinishPosition', '')) == '1':
                t = time_to_ms(res.get('Best', ''))
                if t < fastest_quali_time:
                    fastest_quali_time = t
                    pole_car_number = str(res.get('CarNumber', ''))
            
    if not races_data:
        print("No Race results found in the data.")
        return
        
    # Map them properly based on the number of races available
    new_results = {}
    if 'opening' in races_data and 'reverse' in races_data and 'feature' in races_data:
        # 3 Races Weekend: race1 = opening, race2 = reverse grid, race3 = feature
        new_results['race1'] = format_race(races_data['opening'], pole_car_number=pole_car_number)
        new_results['race2'] = format_race(races_data['reverse'])
        new_results['race3'] = format_race(races_data['feature'], pole_car_number=pole_car_number)
        if not races_data['feature']:
            print("WARNING: Feature race has no results yet - race3 will be empty. Re-run after it finishes.")
    elif 'reverse' in races_data and 'feature' in races_data:
        # 2 Races Weekend
        new_results['race1'] = format_race(races_data['reverse'])
        new_results['race2'] = format_race(races_data['feature'], pole_car_number=pole_car_number)
    else:
        count = 1
        for k in ['opening', 'reverse', 'feature']:
            if k in races_data:
                is_pole_race = k in ['opening', 'feature']
                new_results[f'race{count}'] = format_race(races_data[k], pole_car_number=pole_car_number if is_pole_race else None)
                count += 1

    print("Saved races: " + ", ".join(f"{k}={len(v)} drivers" for k, v in new_results.items()))

    season = str(page_data.get('SeasonName', '2026'))
    if " " in season:
        season = season.split()[0]
        
    round_number = str(page_data.get('RoundNumber', ''))
    country_name = page_data.get('CountryName', '')
    race_name = country_name + " Grand Prix"
    
    circuit_info = page_data.get('CircuitInformation', '')
    circuit_name = circuit_info.get('CircuitName', '') if isinstance(circuit_info, dict) else str(circuit_info)
    
    c_map = {
        "China": "shanghai",
        "Saudi Arabia": "jeddah",
        "Miami": "miami",
        "Canada": "villeneuve",
        "Netherlands": "zandvoort",
        "Singapore": "marina_bay",
        "Las Vegas": "las_vegas",
        "Great Britain": "silverstone",
        "Spain": "barcelona",
        "Malaysia": "sepang",
        "Bahrain": "sepang"
    }
    circuit_id = c_map.get(country_name, country_name.lower().replace(' ', '_'))
    
    new_round = {
        "season": season,
        "round": round_number,
        "raceName": race_name,
        "Circuit": {
            "circuitId": circuit_id,
            "circuitName": circuit_name
        },
        "Results": new_results
    }
    
    # Write to <project>/src/config/f1a/<season>/results.json
    # (project root = the nearest parent folder of this script that contains "src")
    root = os.path.dirname(os.path.abspath(__file__))
    probe = root
    while True:
        if os.path.isdir(os.path.join(probe, 'src')):
            root = probe
            break
        parent = os.path.dirname(probe)
        if parent == probe:
            break
        probe = parent
    results_dir = os.path.join(root, 'src', 'config', 'f1a', season)
    os.makedirs(results_dir, exist_ok=True)
    results_path = os.path.join(results_dir, 'results.json')
    if RESULTS_PATH:
        results_path = RESULTS_PATH
        os.makedirs(os.path.dirname(os.path.abspath(results_path)), exist_ok=True)
    if not os.path.exists(results_path):
        print("!!! WARNING: results.json did not exist at this path, so a NEW file will be created.")
        print("!!! If your site's file is somewhere else, set RESULTS_PATH at the top of this script.")

    if os.path.exists(results_path):
        with open(results_path, 'r', encoding='utf-8') as f:
            try:
                results = json.load(f)
            except:
                results = []
    else:
        results = []
        
    # Check if this round already exists to replace or append
    replaced = False
    for i, r in enumerate(results):
        if r.get('season') == season and r.get('round') == round_number:
            results[i] = new_round
            replaced = True
            break
            
    if not replaced:
        results.append(new_round)
        
    results.sort(key=lambda r: int(r.get('round') or 0))
    out = custom_stringify(results)
    
    with open(results_path, 'w', encoding='utf-8') as f:
        f.write(out)
        
    print(f"Wrote file: {os.path.abspath(results_path)}")
    with open(results_path, 'r', encoding='utf-8') as f:
        check = json.load(f)
    for r in check:
        if r.get('round') == round_number:
            print(f"READ-BACK round {round_number}: " + ", ".join(f"{k}={len(v)}" for k, v in r['Results'].items()))
    print(f"Successfully updated results.json with {race_name} (Round {round_number})")

if __name__ == '__main__':
    main()