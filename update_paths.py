import os

file_path = "src/config/f1/api_update.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace specific string literals
replacements = {
    "'results.json'": "f'{current_year}/results.json'",
    "'qualifying.json'": "f'{current_year}/qualifying.json'",
    "'sprint.json'": "f'{current_year}/sprint.json'",
    '"results.json"': 'f"{current_year}/results.json"',
    '"qualifying.json"': 'f"{current_year}/qualifying.json"',
    '"sprint.json"': 'f"{current_year}/sprint.json"'
}

for old, new in replacements.items():
    content = content.replace(old, new)

# Ensure the year directory is created
dir_creation_code = """
    if not os.path.exists(str(current_year)):
        os.makedirs(str(current_year))
"""

if "os.makedirs(str(current_year))" not in content:
    # Insert it right after current_year is defined
    content = content.replace(
        "current_year = dt.datetime.now().year", 
        "current_year = dt.datetime.now().year" + dir_creation_code
    )

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated api_update.py successfully!")
