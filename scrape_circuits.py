import json
import time
from playwright.sync_api import sync_playwright

def scrape():
    results = {}
    
    links = [
        "https://www.formula1.com/en/racing/2026/japan",
        "https://www.formula1.com/en/racing/2026/barcelona-catalunya",
        "https://www.formula1.com/en/racing/2026/australia",
        "https://www.formula1.com/en/racing/2026/austria",
        "https://www.formula1.com/en/racing/2026/qatar",
        "https://www.formula1.com/en/racing/2026/mexico",
        "https://www.formula1.com/en/racing/2026/monaco",
        "https://www.formula1.com/en/racing/2026/miami",
        "https://www.formula1.com/en/racing/2026/brazil",
        "https://www.formula1.com/en/racing/2026/hungary",
        "https://www.formula1.com/en/racing/2026/las-vegas",
        "https://www.formula1.com/en/racing/2026/azerbaijan",
        "https://www.formula1.com/en/racing/2026/belgium",
        "https://www.formula1.com/en/racing/2026/italy",
        "https://www.formula1.com/en/racing/2026/united-states",
        "https://www.formula1.com/en/racing/2026/great-britain",
        "https://www.formula1.com/en/racing/2026/canada",
        "https://www.formula1.com/en/racing/2026/bahrain",
        "https://www.formula1.com/en/racing/2026/china",
        "https://www.formula1.com/en/racing/2026/united-arab-emirates",
        "https://www.formula1.com/en/racing/2026/spain",
        "https://www.formula1.com/en/racing/2026/netherlands",
        "https://www.formula1.com/en/racing/2026/singapore"
    ]
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for link in links:
            country = link.split('/')[-1]
            circuit_link = link + '/circuit' # Let's omit .html as sometimes they just redirect
            print(f"Scraping {circuit_link}...")
            
            try:
                page.goto(circuit_link, timeout=15000)
                
                # In modern F1 site, stats are in DL/DT/DD or simple P tags
                stats = page.evaluate('''() => {
                    const data = {};
                    const paragraphs = Array.from(document.querySelectorAll('p, div, span'));
                    paragraphs.forEach(el => {
                        const text = el.innerText.trim().toLowerCase();
                        if (text === 'first grand prix') {
                            data.firstGrandPrix = el.nextElementSibling?.innerText?.trim();
                        } else if (text === 'number of laps') {
                            data.raceLaps = el.nextElementSibling?.innerText?.trim();
                        } else if (text === 'circuit length') {
                            data.length = el.nextElementSibling?.innerText?.trim();
                        } else if (text === 'lap record') {
                            data.lapRecord = el.nextElementSibling?.innerText?.trim();
                        }
                    });
                    
                    // Fallback for new F1 site markup which uses specific classes for stats
                    if (!data.length) {
                        const statBlocks = Array.from(document.querySelectorAll('fieldset'));
                        statBlocks.forEach(block => {
                             const legend = block.querySelector('legend')?.innerText?.trim()?.toLowerCase();
                             const value = block.querySelector('p')?.innerText?.trim();
                             if(legend === 'first grand prix') data.firstGrandPrix = value;
                             if(legend === 'number of laps') data.raceLaps = value;
                             if(legend === 'circuit length') data.length = value;
                             if(legend === 'lap record') data.lapRecord = value;
                        });
                    }
                    
                    return data;
                }''')
                
                if stats.get('length'):
                    results[country] = stats
                    print(f"Success for {country}: {stats}")
                else:
                    print(f"Could not parse stats for {country}")
                    
            except Exception as e:
                print(f"Failed {country}: {e}")
                
        browser.close()
        
    with open('scraped_stats.json', 'w') as f:
        json.dump(results, f, indent=4)
        
if __name__ == '__main__':
    scrape()
