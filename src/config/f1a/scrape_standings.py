import requests
from bs4 import BeautifulSoup
import json
import re
import os

def parse_standings(url):
    html = requests.get(url).text
    soup = BeautifulSoup(html, 'html.parser')
    standings = []
    
    # Check for NEXT_DATA
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    if m:
        try:
            data = json.loads(m.group(1))
            st = data.get('props', {}).get('pageProps', {}).get('pageData', {}).get('Standings', [])
            for item in st:
                name = item.get('FullName') or item.get('DisplayName') or item.get('TeamName') or str(item.get('Position'))
                pts = item.get('TotalPoints', 0)
                standings.append({"name": name, "points": pts})
            return standings
        except:
            pass

    for tr in soup.find_all('tr'):
        th = tr.find('th')
        if not th: continue
        name = th.text.strip()
        if not name or name == 'Driver' or name == 'Team' or '-' in name and 'Mar' in name or 'Feb' in name or 'Apr' in name or 'May' in name or 'Jun' in name or 'Jul' in name or 'Aug' in name or 'Sep' in name or 'Oct' in name or 'Nov' in name or 'Dec' in name: 
            continue
        
        tds = tr.find_all('td')
        if tds:
            total_th = tr.find_all('th', class_=re.compile('sticky_right'))
            if total_th:
                total_points = total_th[-1].text.strip()
            else:
                total_points = tds[-1].text.strip()
                
            try:
                pts = float(total_points) if '.' in total_points else int(total_points)
                standings.append({
                    "name": name,
                    "points": pts
                })
            except:
                pass
                
    return standings

def main():
    driver_url = 'https://www.f1academy.com/Racing-Series/Standings/Driver'
    team_url = 'https://www.f1academy.com/Racing-Series/Standings/Team'
    
    drivers = parse_standings(driver_url)
    teams = parse_standings(team_url)
    
    print(f"Scraped {len(drivers)} F1A drivers and {len(teams)} F1A teams.")
    
    with open('official_driver_standings.json', 'w', encoding='utf-8') as f:
        json.dump(drivers, f, indent=2, ensure_ascii=False)
        
    with open('official_team_standings.json', 'w', encoding='utf-8') as f:
        json.dump(teams, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    main()
