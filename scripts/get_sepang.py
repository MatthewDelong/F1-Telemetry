import urllib.request
import json
import math
import os

# Overpass API query for Sepang circuit
query = """
[out:json];
way["highway"="raceway"](2.74,101.72,2.77,101.75);
out geom;
"""
url = 'https://overpass-api.de/api/interpreter'
req = urllib.request.Request(url, data=query.encode('utf-8'), headers={'User-Agent': 'F1-Telemetry'})
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())

# The circuit should be the longest way
longest_way = None
max_len = 0
for el in data.get('elements', []):
    if 'geometry' in el and len(el['geometry']) > max_len:
        # Avoid short karting tracks, main circuit has many nodes
        if el.get('tags', {}).get('name', '').find('Kart') == -1:
            max_len = len(el['geometry'])
            longest_way = el['geometry']

if longest_way:
    # Scale coordinates to match FastF1 telemetry scale
    ref_lat = longest_way[0]['lat']
    ref_lon = longest_way[0]['lon']
    
    output = []
    # FastF1 telemetry typically returns points every few meters, we'll interpolate or just use OSM nodes
    for pt in longest_way:
        lat = pt['lat']
        lon = pt['lon']
        
        # Local tangent plane projection (approximate)
        x = (lon - ref_lon) * 111320 * math.cos(math.radians(ref_lat))
        y = (lat - ref_lat) * 111320
        
        # In F1 telemetry, the coordinates are generally returned in decimeters (1/10th of a meter)
        # So we multiply by 10.
        # Also need to check if Y should be inverted, etc, but TrackBuilder centers it anyway.
        output.append({
            'x': int(x * 10),
            'y': int(y * 10),
            'z': 0
        })
    
    os.makedirs('public/trackdata', exist_ok=True)
    with open('public/trackdata/sepang.json', 'w') as f:
        json.dump(output, f)
    print(f"Successfully generated sepang.json with {len(output)} points from OSM!")
else:
    print("Failed to find track geometry.")
