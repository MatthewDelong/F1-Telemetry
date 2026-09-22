import os
import json

mapping = {
    "Spanish Grand Prix (Madrid)": "Spain Grand Prix (Madrid)",
    "Madrid Grand Prix": "Spain Grand Prix (Madrid)",
    "Spanish Grand Prix": "Spain Grand Prix",
    "Barcelona Grand Prix": "Spain Grand Prix",
    "Austrian Grand Prix": "Austria Grand Prix",
    "British Grand Prix": "Great Britain Grand Prix",
    "Belgian Grand Prix": "Belgium Grand Prix",
    "Hungarian Grand Prix": "Hungary Grand Prix",
    "Dutch Grand Prix": "Netherlands Grand Prix",
    "Italian Grand Prix": "Italy Grand Prix",
    "Canadian Grand Prix": "Canada Grand Prix",
    "Japanese Grand Prix": "Japan Grand Prix",
    "Brazilian Grand Prix": "Brazil Grand Prix",
    "Saudi Arabian Grand Prix": "Saudi Arabia Grand Prix",
    "Mexican Grand Prix": "Mexico Grand Prix",
    "Mexico City Grand Prix": "Mexico Grand Prix",
    "United States Grand Prix": "United States Grand Prix",
    "Australian Grand Prix": "Australia Grand Prix"
}

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
                    for old_name, new_name in mapping.items():
                        if v == old_name:
                            obj[k] = new_name
                            modified = True
                            break
                elif k == "raceName" and isinstance(v, str) and "Spa-francorchamps" in v:
                    obj[k] = "Belgium Grand Prix"
                    modified = True
                else:
                    replace_in_obj(v)
            
            # For races.json which has keys as race names
            keys_to_change = []
            for k in obj.keys():
                for old_name, new_name in mapping.items():
                    if k == old_name:
                        keys_to_change.append((k, new_name))
            
            for old_k, new_k in keys_to_change:
                # Be careful not to overwrite a valid entry with duplicate like Spain
                if new_k == "Spain Grand Prix" and obj[old_k].get("location") == "Madrid":
                    new_k = "Spain Grand Prix (Madrid)"
                obj[new_k] = obj.pop(old_k)
                modified = True
                
        elif isinstance(obj, list):
            for item in obj:
                replace_in_obj(item)

    replace_in_obj(data)

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            # f2/results.json uses indent=2, others might use 4. Let's stick to 4.
            json.dump(data, f, indent=4, ensure_ascii=False)

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
