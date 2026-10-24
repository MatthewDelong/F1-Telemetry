import os
import json

mapping = {
    "Spanish Grand Prix (Madrid)": "Spain Grand Prix",
    "Spain Grand Prix (Madrid)": "Spain Grand Prix",
    "Madrid Grand Prix": "Spain Grand Prix",
    "Spanish Grand Prix": "Spain Grand Prix",
    "Barcelona Grand Prix": "Barcelona-Catalunya Grand Prix",
    "Chinese Grand Prix": "China Grand Prix",
    "Bahrain Grand Prix in Malaysia": "Bahrain Grand Prix (Malaysia)",
    "Austrian Grand Prix": "Austria Grand Prix",
    "British Grand Prix": "Great Britain Grand Prix",
    "Belgian Grand Prix": "Belgium Grand Prix",
    "Hungarian Grand Prix": "Hungary Grand Prix",
    "Dutch Grand Prix": "Netherlands Grand Prix",
    "Italian Grand Prix": "Italy Grand Prix",
    "Bahrain Grand Prix": "Bahrain Grand Prix",
    "Canadian Grand Prix": "Canada Grand Prix",
    "Japanese Grand Prix": "Japan Grand Prix",
    "Brazilian Grand Prix": "Brazil Grand Prix",
    "Saudi Arabian Grand Prix": "Saudi Arabia Grand Prix",
    "Mexican Grand Prix": "Mexico Grand Prix",
    "Mexico City Grand Prix": "Mexico Grand Prix",
    "United States Grand Prix": "United States Grand Prix",
    "Australian Grand Prix": "Australia Grand Prix"
}

BARCELONA_LOCATIONS = {"barcelona", "montmeló", "montmelo", "catalunya"}


def canonical_race_name(name, season=None, circuit_id="", location=""):
    """Return the standardised race name used as a key across the site."""
    if not isinstance(name, str):
        return name
    new_name = mapping.get(name, name)
    if "Spa-francorchamps" in new_name:
        new_name = "Belgium Grand Prix"
    try:
        year = int(season) if season is not None else None
    except (TypeError, ValueError):
        year = None
    loc = (location or "").lower()
    circ = (circuit_id or "").lower()
    # From 2026 Barcelona and Madrid are separate rounds
    if year is not None and year >= 2026 and new_name == "Spain Grand Prix":
        if circ == "catalunya" or loc in BARCELONA_LOCATIONS:
            new_name = "Barcelona-Catalunya Grand Prix"
    if new_name == "Bahrain Grand Prix" and (circ == "sepang" or loc in ("sepang", "kuala lumpur")):
        new_name = "Bahrain Grand Prix (Malaysia)"
    return new_name


def standardize_names(file_path):
    if not os.path.exists(file_path): return
    with open(file_path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except:
            return
            
    modified = False

    def replace_in_obj(obj):
        nonlocal modified
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == "raceName" and isinstance(v, str):
                    circuit = obj.get("Circuit", {}) if isinstance(obj.get("Circuit"), dict) else {}
                    loc = circuit.get("Location", {}).get("locality", "") or obj.get("location", "")
                    new_name = canonical_race_name(v, obj.get("season", obj.get("year")), circuit.get("circuitId", ""), loc)
                    if new_name != v:
                        obj[k] = new_name
                        modified = True
                else:
                    replace_in_obj(v)

            # For files keyed by race name (races.json, driver files)
            keys_to_change = [(k, mapping[k]) for k in list(obj.keys()) if k in mapping and mapping[k] != k]
            for old_k, new_k in keys_to_change:
                if new_k in obj:
                    # Canonical key already exists - drop the alias instead of duplicating/overwriting
                    obj.pop(old_k)
                else:
                    obj[new_k] = obj.pop(old_k)
                modified = True
                
        elif isinstance(obj, list):
            for item in obj:
                replace_in_obj(item)

    replace_in_obj(data)

    if modified:
        results_key = _compact_results_key(data)
        if results_key:
            # Keep race result files in compact one-line-per-driver format
            write_compact_race_json(data, file_path, results_key)
            return
        with open(file_path, 'w', encoding='utf-8') as f:
            # f2/results.json uses indent=2, others might use 4. Let's stick to 4.
            json.dump(data, f, indent=4, ensure_ascii=False)


RESULT_KEYS = ("QualifyingResults", "SprintResults", "Results")


def _compact_results_key(data):
    """Return the results key if data is a list of race entries, else None."""
    if not isinstance(data, list) or not data or not all(isinstance(r, dict) for r in data):
        return None
    for key in RESULT_KEYS:
        if all(key in r for r in data):
            return key
    return None


def write_compact_race_json(data, filepath, results_key="Results"):
    """Write race data with one line per driver result (matches f1/api_update.py)."""
    header_keys = ["season", "round", "url", "raceName"]
    dt_keys = ["date", "time"]
    lines = ["["]
    for i, race in enumerate(data):
        lines.append("    {")
        parts = []
        header = ", ".join(f'"{k}": {json.dumps(race[k], ensure_ascii=False)}' for k in header_keys if k in race)
        if header:
            parts.append(f"        {header}")
        if "Circuit" in race:
            parts.append(f'        "Circuit": {json.dumps(race["Circuit"], ensure_ascii=False)}')
        dt_parts = ", ".join(f'"{k}": {json.dumps(race[k], ensure_ascii=False)}' for k in dt_keys if k in race)
        if dt_parts:
            parts.append(f"        {dt_parts}")
        # Any other keys not covered above
        known = set(header_keys + dt_keys + ["Circuit", results_key])
        for k, v in race.items():
            if k not in known:
                parts.append(f'        "{k}": {json.dumps(v, ensure_ascii=False)}')
        results = race.get(results_key, [])
        res_lines = [f'        "{results_key}": [']
        for j, result in enumerate(results):
            comma = "," if j < len(results) - 1 else ""
            res_lines.append(f"            {json.dumps(result, ensure_ascii=False)}{comma}")
        res_lines.append("        ]")
        parts.append("\n".join(res_lines))
        lines.append(",\n".join(parts))
        comma = "," if i < len(data) - 1 else ""
        lines.append(f"    }}{comma}")
    lines.append("]")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines) + "\n")

if __name__ == "__main__":
    # Base dir: relative to src/config/
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Process all JSON files in f1, f2, f1a
    for folder in ['f1', 'f2', 'f1a']:
        folder_path = os.path.join(base_dir, folder)
        if not os.path.exists(folder_path): continue
        for root, dirs, files in os.walk(folder_path):
            for f in files:
                if f.endswith('.json'):
                    standardize_names(os.path.join(root, f))
    print("Standardization complete.")
