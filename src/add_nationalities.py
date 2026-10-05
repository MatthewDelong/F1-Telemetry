import json

nationalities = {
    "fornaroli": "italian",
    "stanek": "czech",
    "marti": "spanish",
    "tsolov": "bulgarian",
    "lindblad": "british",
    "goethe": "german",
    "verschoor": "dutch",
    "browning": "british",
    "beganovic": "swedish",
    "montoya": "colombian",
    "mini": "italian",
    "crawford": "american",
    "maini": "indian",
    "martins": "french",
    "miyata": "japanese",
    "cordeel": "belgian",
    "stenshorne": "norwegian",
    "dunne": "irish",
    "durksen": "paraguayan",
    "shields": "british",
    "meguetounif": "french",
    "van_hoepen": "dutch",
    "esterson": "american",
    "inthraphuvasak": "thai",
    "bennett": "british",
    "villagomez": "mexican"
}

with open('src/config/f2/2025/drivers.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for k, v in data.items():
    if "Driver" in v:
        driver_id = v["Driver"]["driverId"]
        if driver_id in nationalities:
            v["Driver"]["nationality"] = nationalities[driver_id]
        else:
            print("Missing nationality for:", driver_id)
            
    if "Driver2" in v:
        driver_id = v["Driver2"]["driverId"]
        if driver_id in nationalities:
            v["Driver2"]["nationality"] = nationalities[driver_id]
        else:
            print("Missing nationality for:", driver_id)

with open('src/config/f2/2025/drivers.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4, ensure_ascii=False)

print("Done")
