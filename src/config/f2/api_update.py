import sys
import json
import re
import requests
import os

# PASTE YOUR URL HERE:
URL_TO_SCRAPE = "https://www.fiaformula2.com/Results?raceid=1097"


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
        
        if pole_car_number and res["number"] == pole_car_number:
            res["grid"] = "1"
        
        if pos == "1":
            res["gap"] = "-"
            
        if time_val == "":
            res.pop("laps", None)
            res.pop("gap", None)
            
        best_time = d.get('Best', '')
        if best_time and time_val != "":
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

def main():
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
        return
        
    next_data = json.loads(match.group(1))
    page_data = next_data.get('props', {}).get('pageProps', {}).get('pageData', {})
    
    if not page_data:
        print("Could not find pageData in __NEXT_DATA__")
        return
        
    session_results = page_data.get('SessionResults', [])
    sprint_data = []
    feature_data = []
    
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
            
    for session in session_results:
        name = session.get('SessionName', '')
        if name == 'Sprint Race':
            sprint_data = session.get('Results', [])
        elif name == 'Feature Race':
            feature_data = session.get('Results', [])
        elif 'Qualifying' in name:
            quali_results = session.get('Results', [])
            for res in quali_results:
                if str(res.get('FinishPosition', '')) == '1' or str(res.get('DisplayFinishPosition', '')) == '1':
                    t = time_to_ms(res.get('Best', ''))
                    if t < fastest_quali_time:
                        fastest_quali_time = t
                        pole_car_number = str(res.get('CarNumber', ''))
            
    if not sprint_data and not feature_data:
        print("No Sprint Race or Feature Race results found in the data.")
        return
        
    season = str(page_data.get('SeasonName', '2026'))
    if " " in season:
        season = season.split()[-1]
        
    round_number = str(page_data.get('RoundNumber', ''))
    country_name = page_data.get('CountryName', '')
    race_name = country_name + " Grand Prix"
    
    circuit_info = page_data.get('CircuitInformation', '')
    if isinstance(circuit_info, dict):
        circuit_info = circuit_info.get('CircuitName', '')
        
    new_round = {
        "season": season,
        "round": round_number,
        "raceName": race_name,
        "Circuit": {
            "circuitId": country_name.lower().replace(' ', '_'),
            "circuitName": circuit_info
        },
        "Results": {
            "race1": format_race(sprint_data),
            "race2": format_race(feature_data, pole_car_number=pole_car_number)
        }
    }
    
    results_path = os.path.join(os.path.dirname(__file__), 'results.json')
        
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
        
    out = custom_stringify(results)
    
    with open(results_path, 'w', encoding='utf-8') as f:
        f.write(out)
        
    print(f"Successfully updated results.json with {race_name} (Round {round_number})")

if __name__ == '__main__':
    main()
