import fastf1
import json
import os
import sys

fastf1.Cache.enable_cache('.')  # use current directory

def fetch_track(year, name, file_name):
    try:
        session = fastf1.get_session(year, name, 'R')
        session.load(telemetry=True)
        fastest = session.laps.pick_fastest()
        tel = fastest.get_telemetry()
        
        output = []
        for index, row in tel.iterrows():
            output.append({
                "x": int(row['X']) if not (row.isna()['X']) else 0,
                "y": int(row['Y']) if not (row.isna()['Y']) else 0,
                "z": int(row['Z']) if not (row.isna()['Z']) else 0
            })
        
        os.makedirs('public/trackdata', exist_ok=True)
        with open(f'public/trackdata/{file_name}.json', 'w') as f:
            json.dump(output, f)
        print(f"Successfully generated {file_name}.json with {len(output)} points")
    except Exception as e:
        print(f"Error processing {name}: {e}")

if __name__ == "__main__":
    fetch_track(2017, 'Malaysia', 'sepang')
