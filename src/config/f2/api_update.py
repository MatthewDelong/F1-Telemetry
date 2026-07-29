import sys
import json
import re
import os
import time
from playwright.sync_api import sync_playwright

URL_TO_SCRAPE = "https://www.fiaformula2.com/en/racing/2026/budapest"

def map_result(data):
    pos = str(data.get('positionValue') or data.get('positionNumber') or data.get('displayPosition', ''))
    
    gap = str(data.get('gapToLeader') or "-")
    laps = str(data.get('lapsCompleted', '0'))
    time_val = str(data.get('raceTime') or data.get('completionStatusCode') or "")
    
    if pos == "" or pos == "None" or int(pos) > 40:
        pos = "DNF"
        
    status = "Finished"
    if "DNF" in time_val.upper() or pos == "DNF" or "DNF" in str(data.get('displayPosition', '')).upper():
        pos = str(data.get('displayPosition', pos))
        if gap == "None" or gap == "-":
            gap = ""
        status = time_val if time_val else "DNF"
        
    if gap == "0" or gap == "0.0":
        gap = "-"
        
    res = {
        "number": str(data.get('racingNumber', '')),
        "position": pos,
        "laps": laps,
        "gap": gap,
        "status": status,
        "Time": { "time": time_val }
    }
    
    if pos == "1":
        res["gap"] = "-"
        
    if "DNF" in status.upper():
        res.pop("laps", None)
        res.pop("gap", None)
        
    return res

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
        
    if "?raceid=" in url:
        # Fallback to budapest if they use old URL format
        url = URL_TO_SCRAPE
    
    print(f"Fetching {url} with Playwright...")
    
    all_json_objects = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
def extract_json_objects(text):
    objects = []
    for m in re.finditer(r'\{(?=\s*\\"session\\"|\s*"session")', text):
        start = m.start()
        brace_count = 0
        in_string = False
        escape = False
        for i in range(start, len(text)):
            c = text[i]
            if escape:
                escape = False
                continue
            if c == '\\':
                escape = True
                continue
            if c == '"':
                in_string = not in_string
                continue
            if not in_string:
                if c == '{':
                    brace_count += 1
                elif c == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        obj_str = text[start:i+1]
                        try:
                            if '\\"' in obj_str:
                                obj_str = obj_str.replace('\\"', '"').replace('\\\\', '\\')
                            objects.append(json.loads(obj_str))
                        except:
                            pass
                        break
    return objects

def main():
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = URL_TO_SCRAPE
        
    if "?raceid=" in url:
        # Fallback to budapest if they use old URL format
        url = URL_TO_SCRAPE
    
    print(f"Fetching {url} with Playwright...")
    
    all_json_objects = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        def handle_response(response):
            if response.ok and response.request.resource_type in ["fetch", "xhr", "script"]:
                try:
                    text = response.text()
                    if "session" in text and "results" in text:
                        print("FOUND RESULTS IN RESPONSE:", response.url)
                        all_json_objects.extend(extract_json_objects(text))
                except Exception as e:
                    if "session" in response.url or "rsc" in response.url:
                        print("Failed to read response:", response.url, e)
        page.on('response', handle_response)
        
        page.goto(url, wait_until='domcontentloaded', timeout=15000)
        page.wait_for_timeout(2000)
        
        # Click Accept All just in case it blocks clicks
        try:
            page.locator('text="ACCEPT ALL"').click(timeout=2000)
            page.wait_for_timeout(500)
        except:
            pass

        # Extract options using dropdown
        try:
            dropdown = page.locator('button:has-text("Feature Race")')
            for i in range(dropdown.count()):
                if dropdown.nth(i).is_visible():
                    dropdown.nth(i).evaluate('node => { node.scrollIntoView(); node.click(); }')
                    break
            page.wait_for_timeout(2000)
            
            sprint_options = page.locator('button:has-text("Sprint Race")')
            for i in range(sprint_options.count()):
                if sprint_options.nth(i).is_visible():
                    sprint_options.nth(i).evaluate('node => node.click()')
                    break
            page.wait_for_timeout(3000)
        except Exception as e:
            print("Could not click Sprint Race dropdown option:", e)

        # Scrape html just in case
        html = page.content()
        all_json_objects.extend(extract_json_objects(html))
        
        browser.close()
        
    unique_sessions = {}
    for obj in all_json_objects:
        name = obj.get('shortName')
        if name:
            if not unique_sessions.get(name) or len(obj.get('results', [])) > len(unique_sessions[name].get('results', [])):
                unique_sessions[name] = obj
            
    if not unique_sessions:
        print("No sessions found on the page!")
        sys.exit(1)
        
    sprint_data = []
    feature_data = []
    
    if 'Sprint Race' in unique_sessions:
        sprint_data = [map_result(d) for d in unique_sessions['Sprint Race'].get('results', [])]
        
    if 'Feature Race' in unique_sessions:
        feature_data = [map_result(d) for d in unique_sessions['Feature Race'].get('results', [])]
        
    if 'Race 2' in unique_sessions and not feature_data:
        feature_data = [map_result(d) for d in unique_sessions['Race 2'].get('results', [])]
        
    if 'Race 1' in unique_sessions and not sprint_data:
        sprint_data = [map_result(d) for d in unique_sessions['Race 1'].get('results', [])]
        
    if not sprint_data and not feature_data:
        print("No Sprint Race or Feature Race results found in the data.")
        sys.exit(1)
        
    # Extract round info from URL
    parts = url.strip('/').split('/')
    season = "2026"
    round_number = "1"
    race_name = parts[-1].capitalize() + " Grand Prix"
    
    for p in parts:
        if p.isdigit() and len(p) == 4:
            season = p
            
    circuit_id = parts[-1].lower()
    
    new_round = {
        "season": season,
        "round": round_number,
        "raceName": race_name,
        "Circuit": {
            "circuitId": circuit_id,
            "circuitName": circuit_id.capitalize()
        },
        "Results": {
            "race1": sprint_data,
            "race2": feature_data
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
        
    replaced = False
    for i, r in enumerate(results):
        if r.get('season') == season and r.get('Circuit', {}).get('circuitId') == circuit_id:
            new_round["round"] = r.get("round", round_number)
            results[i] = new_round
            replaced = True
            break
            
    if not replaced:
        new_round["round"] = str(len(results) + 1)
        results.append(new_round)

    try:
        results.sort(key=lambda x: (int(x.get('season', '0')), int(x.get('round', '0'))))
    except Exception:
        pass
        
    out = custom_stringify(results)
    
    with open(results_path, 'w', encoding='utf-8') as f:
        f.write(out)
        
    print(f"Successfully updated results.json with {race_name}")

if __name__ == '__main__':
    main()
