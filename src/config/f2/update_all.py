import subprocess
import time

urls = [
    "https://www.fiaformula2.com/en/racing/2026/melbourne",
    "https://www.fiaformula2.com/en/racing/2026/miami",
    "https://www.fiaformula2.com/en/racing/2026/imola",
    "https://www.fiaformula2.com/en/racing/2026/monaco",
    "https://www.fiaformula2.com/en/racing/2026/barcelona",
    "https://www.fiaformula2.com/en/racing/2026/spielberg",
    "https://www.fiaformula2.com/en/racing/2026/silverstone",
    "https://www.fiaformula2.com/en/racing/2026/spa-francorchamps",
    "https://www.fiaformula2.com/en/racing/2026/budapest"
]

for url in urls:
    print(f"Updating {url}...")
    subprocess.run(["python", "api_update.py", url])
    time.sleep(2)
