import requests, json, os, datetime, math, numpy as np, shutil
import time
from datetime import datetime as dt

api_url = 'https://api.jolpi.ca/ergast/f1'
# api_url = 'http://ergast.com/api/f1'
current_year = datetime.date.today().year

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

def update_constructors():
    season = current_year
    response = requests.get(f'{api_url}/{season}/constructors.json')
    if response.status_code==200:
        responsedata = response.json()
        constructors = responsedata["MRData"]["ConstructorTable"]["Constructors"]
        # print(constructors)
        # apx = {
        #     "constructorId": "apx",
        #     "url": "https://en.wikipedia.org/wiki/Untitled_Joseph_Kosinski_film",
        #     "name": "APXGP",
        #     "nationality": "American"
        # }
        # constructors.append(apx)
        with open(f'constructors/{season}.json', 'w', encoding='utf-8') as file:
            json.dump(constructors, file, ensure_ascii=False, indent=4)
        print("Constructors updated successfully!")
    else:
        print(response.status_code)

def update_constructor_drivers():
    season = current_year

    with open(f'constructors/{current_year}.json', 'r', encoding='utf-8') as file:
        data = json.load(file)

    def fetchDrivers(team):
        print(team)
        response = requests.get(f'{api_url}/{season}/constructors/{team}/drivers.json')
        if response.status_code == 200:
            responsedata = response.json()
            drivers = responsedata["MRData"]["DriverTable"]["Drivers"]
            # Ensure the directory exists
            folder_path = f'constructors/{season}'
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
            # Write the file in the folder
            with open(f'{folder_path}/{team}.json', 'w', encoding='utf-8') as file:
                json.dump(drivers, file, ensure_ascii=False, indent=4)
        else:
            print(response.status_code)


    for team in data:
        if team["constructorId"]!="apx":
            fetchDrivers(team["constructorId"])

    print("Constructor drivers updated successfully!")

def update_driverData():
    import os
    import datetime
    import json
    import requests

    url1 = f'{api_url}/current/last/results.json'

    response1 = requests.get(url1)

    input_directory = 'drivers/'
    output_directory = 'drivers2/'
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)

    if response1.status_code == 200:
        responsedata1 = response1.json()
        race = responsedata1["MRData"]["RaceTable"]["Races"][0]
        raceName = race["raceName"]
        season = race["season"]
        round = race["round"]
        results = race["Results"]
        drivers_done = 0

        for result in results:
            driverId = result["Driver"]["driverId"]
            input_file = os.path.join(input_directory, f'{driverId}.json')
            output_file = os.path.join(output_directory, f'{driverId}.json')

            # Load driver data from the input file or create a new default structure if it doesn't exist
            if os.path.exists(input_file):
                with open(input_file, 'r', encoding='utf-8') as file:
                    data = json.load(file)
            else:
                # Create a new file structure with default (empty) values
                data = {
                    "driverId": driverId,
                    "driverCode": result["Driver"].get("code", ""),
                    "driverNumber": result["Driver"].get("permanentNumber", ""),
                    "lastUpdate": "",
                    "totalWins": 0,
                    "totalPodiums": 0,
                    "totalPoles": 0,
                    "totalDNFs": 0,
                    "seasonWins": {},
                    "seasonPodiums": {},
                    "seasonPoles": {},
                    "seasonDNFs": {},
                    "poles": {},
                    "podiums": {},
                    "DNFs": {},
                    "fastLaps": {},
                    "finalStandings": {},
                    "posAfterRace": {},
                    "racePosition": {},
                    "qualiPosition": {},
                    "driverQualifyingTimes": {},
                    "consistency": {},
                    "peakSeason": {},
                    "avgRacePositions": {},
                    "avgQualiPositions": {},
                    "rates": {},
                    "winRate": 0.0,
                    "podiumRate": 0.0,
                    "poleRate": 0.0,
                    "dnfRate": 0.0,
                    "ptwConRate": {},
                    "positionsGainLost": {}
                }

            # Update last update time
            data["lastUpdate"] = datetime.datetime.now().isoformat()

            # Ensure keys exist for the new season
            if season not in data["seasonWins"]:
                data["seasonWins"][season] = 0
            if season not in data["seasonPodiums"]:
                data["seasonPodiums"][season] = 0
            if season not in data["seasonPoles"]:
                data["seasonPoles"][season] = 0
            if season not in data["seasonDNFs"]:
                data["seasonDNFs"][season] = 0
            if season not in data["fastLaps"]:
                data["fastLaps"][season] = {}
            if season not in data["DNFs"]:
                data["DNFs"][season] = {}
            if season not in data["podiums"]:
                data["podiums"][season] = {}
            if season not in data["racePosition"]:
                data["racePosition"][season] = {"year": season, "positions": {}}
            if season not in data["qualiPosition"]:
                data["qualiPosition"][season] = {"year": season, "positions": {}}
            if season not in data["driverQualifyingTimes"]:
                data["driverQualifyingTimes"][season] = {"year": season, "QualiTimes": {}}
            if season not in data["finalStandings"]:
                data["finalStandings"][season] = {"year": season, "position": "0", "points": "0"}
            if season not in data["posAfterRace"]:
                data["posAfterRace"][season] = {"year": season, "pos": {}}
            if season not in data["poles"]:
                data["poles"][season] = []

            # Update DNF, Podium, and Win Data
            if not (result["status"] == "Finished" or '+' in result["status"]):
                data["DNFs"][season][raceName] = result["status"]
                data["seasonDNFs"][season] = len(data["DNFs"][season].keys())
                data["totalDNFs"] = sum(data["seasonDNFs"].values())

            if result["position"] in ["1", "2", "3"]:
                data["podiums"][season][raceName] = result["position"]
                data["seasonPodiums"][season] = len(data["podiums"][season].keys())
                data["totalPodiums"] = sum(data["seasonPodiums"].values())

            if "FastestLap" in result:
                data["fastLaps"][season][raceName] = result["FastestLap"]["Time"]["time"]
            else:
                data["fastLaps"][season][raceName] = -1

            data["racePosition"][season]["positions"][raceName] = result["position"]

            if result["position"] == "1":
                data["seasonWins"][season] = list(data["racePosition"][season]["positions"].values()).count("1")
                data["totalWins"] = sum(data["seasonWins"].values())

            data["qualiPosition"][season]["positions"][raceName] = result["grid"]

            # Update driver standings
            url2 = f'{api_url}/current/drivers/{driverId}/driverStandings.json'
            response2 = requests.get(url2)
            if response2.status_code == 200:
                responsedata2 = response2.json()
                driverStanding = responsedata2["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"][0]
                data["finalStandings"][season]["position"] = driverStanding.get("position", "40")
                data["finalStandings"][season]["points"] = driverStanding["points"]
                data["posAfterRace"][season]["pos"][raceName] = {"points": int(driverStanding["points"])}
            else:
                print("url2", response2.status_code)

            # Update qualifying results
            url3 = f'{api_url}/current/drivers/{driverId}/qualifying.json'
            response3 = requests.get(url3)
            if response3.status_code == 200:
                responsedata3 = response3.json()
                qualifyings = responsedata3["MRData"]["RaceTable"]["Races"]
                for qualifyingit in reversed(qualifyings):
                    if qualifyingit["round"] == round:
                        qualifying = qualifyingit["QualifyingResults"][0]
                        if qualifying["position"] == "1":
                            if raceName not in data["poles"][season]:
                                data["poles"][season].append(raceName)
                            data["seasonPoles"][season] = len(data["poles"][season])
                            data["totalPoles"] = sum(data["seasonPoles"].values())
                        val1 = qualifying.get("Q1", "N/A")
                        val2 = qualifying.get("Q2", "N/A")
                        val3 = qualifying.get("Q3", "N/A")
                        data["driverQualifyingTimes"][season]["QualiTimes"][raceName] = [val1, val2, val3]
                        break
            else:
                print("url3", response3.status_code)

            # Save updated data to output file
            with open(output_file, "w", encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False)

            drivers_done += 1
            print(drivers_done, output_file)
            print("------------------------------")
    else:
        print(response1.status_code)

    print("Driver Data updated successfully!")

def analyse_driverData():
    input_directory = 'drivers2/'
    output_directory = 'drivers2/'

    if not os.path.exists(output_directory):
        os.makedirs(output_directory)

    json_files = [f for f in os.listdir(input_directory) if f.endswith('.json')]

    def calculate_consistency(metric):
        mean = np.mean(metric)
        std_dev = np.std(metric)
        cv = std_dev / mean if mean !=0 else 0
        return mean, std_dev, cv

    def find_peak_season(metric, seasons):
        peak_value = np.max(metric)
        peak_season = seasons[np.argmax(metric)]
        if peak_value == 0:
            return "No peak season", 0
        return peak_season, peak_value

    def calculate_positions_gained_lost(seasons, race_positions, quali_positions):
        positions_gained_lost = {}
        for season in seasons:
            positions_gained_lost[season] = {}
            for race in race_positions[season]['positions']:
                if race in quali_positions[season]['positions']:
                    race_pos = race_positions[season]['positions'][race]
                    quali_pos = quali_positions[season]['positions'][race]
                    positions_gained_lost[season][race] = int(quali_pos) - int(race_pos)
        return positions_gained_lost

    def average_positions_gained_lost(seasons, positions_gained_lost):
        avg_positions_gained_lost = {}
        for season in seasons:
            gains_losses = list(positions_gained_lost[season].values())
            avg_positions_gained_lost[season] = np.mean(gains_losses) if gains_losses else 0
        return avg_positions_gained_lost

    def replace_nan_with_minus_one(d):
        def replace_nan(x):
            if isinstance(x, dict):
                return {k: replace_nan(v) for k, v in x.items()}
            elif isinstance(x, list):
                return [replace_nan(i) for i in x]
            elif isinstance(x, float) and math.isnan(x):
                return -1
            else:
                return x

        new_d = replace_nan(d)
        
        new_d = {(k if not (isinstance(k, float) and math.isnan(k)) else -1): v for k, v in new_d.items()}
        
        return new_d

    def convert_np_int_to_int(d):
        for key, value in d.items():
            if isinstance(value, np.int32):
                d[key] = int(value)
            elif isinstance(value, dict):
                convert_np_int_to_int(value)

    def process(input_file):
        with open(input_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
        if(data):
            seasons = sorted(data['seasonWins'].keys())
            wins_per_season = [data['seasonWins'][season] for season in seasons]
            podiums_per_season = [data['seasonPodiums'][season] for season in seasons]
            poles_per_season = [data['seasonPoles'][season] for season in seasons]
            dnfs_per_season = [data['seasonDNFs'][season] for season in seasons]

            # final_positions = [int(data['finalStandings'][season]['position']) for season in seasons]
            points_per_season = [float(data['finalStandings'][season]['points']) for season in seasons]

            mean_wins, std_dev_wins, cv_wins = calculate_consistency(wins_per_season)
            mean_podiums, std_dev_podiums, cv_podiums = calculate_consistency(podiums_per_season)
            mean_poles, std_dev_poles, cv_poles = calculate_consistency(poles_per_season)
            mean_points, std_dev_points, cv_points = calculate_consistency(points_per_season)

            peak_season_wins, peak_wins = find_peak_season(wins_per_season, seasons)
            peak_season_podiums, peak_podiums = find_peak_season(podiums_per_season, seasons)
            peak_season_poles, peak_poles = find_peak_season(poles_per_season, seasons)

            race_positions_per_season = {season: [int(data['racePosition'][season]['positions'][race]) for race in data['racePosition'][season]['positions']] for season in seasons}
            quali_positions_per_season = {season: [int(data['qualiPosition'][season]['positions'][race]) for race in data['qualiPosition'][season]['positions']] for season in seasons}
            avg_race_positions = [np.mean(race_positions_per_season[season]) for season in seasons]
            avg_quali_positions = [np.mean(quali_positions_per_season[season]) for season in seasons]

            total_races_per_season = {season: len(data['racePosition'][season]['positions']) for season in seasons}
            total_races = 0
            pole_conversion_rate = {}
            for season in seasons:
                total_races += total_races_per_season[season]
                pole_races = data["poles"][season]
                if len(pole_races):
                    tempwins = 0
                    for racex in pole_races:
                        if data["racePosition"][season]["positions"][racex] == "1":
                            tempwins += 1
                    pole_conversion_rate[season] = tempwins/len(pole_races)
                else:
                    pole_conversion_rate[season] = -1
            win_rate_per_season = [wins_per_season[seasons.index(season)] / total_races_per_season[season] for season in seasons]
            podium_rate_per_season = [podiums_per_season[seasons.index(season)] / total_races_per_season[season] for season in seasons]
            pole_rate_per_season = [poles_per_season[seasons.index(season)] / total_races_per_season[season] for season in seasons]
            dnf_rate_per_season = [dnfs_per_season[seasons.index(season)] / total_races_per_season[season] for season in seasons]
            win_rate = data['totalWins']/total_races
            podium_rate = data['totalPodiums']/total_races
            pole_rate = data['totalPoles']/total_races
            dnf_rate = data['totalDNFs']/total_races


            # pole_conversion_rate = data['totalWins'] / data['totalPoles'] if data['totalPoles'] > 0 else 0
            positions_gained_lost = calculate_positions_gained_lost(seasons, data['racePosition'], data['qualiPosition'])

            avg_positions_gained_lost_per_season = average_positions_gained_lost(seasons, positions_gained_lost)

            data['consistency'] = {
                'mean' : {
                    'wins' : mean_wins,
                    'podiums' : mean_podiums,
                    'poles' : mean_poles,
                    'points' : mean_points
                },
                'std' : {
                    'wins' : std_dev_wins,
                    'podiums' : std_dev_podiums,
                    'poles' : std_dev_poles,
                    'points': std_dev_points
                },
                'cv' : {
                    'wins' : cv_wins,
                    'podiums' : cv_podiums,
                    'poles' : cv_poles,
                    'points' : cv_points
                }
            }
            data['peakSeason'] = {
                'wins' : {
                    'season' : peak_season_wins,
                    'wins' : peak_wins
                },
                'podiums' : {
                    'season': peak_season_podiums,
                    'podiums': peak_podiums
                },
                'poles' : {
                    'season' : peak_season_poles,
                    'poles' : peak_poles
                }
            }
            data['avgRacePositions'] = {
                season : avg_race_positions[seasons.index(season)]
                for season in seasons
            }
            data['avgQualiPositions'] = {
                season : avg_quali_positions[seasons.index(season)]
                for season in seasons
            }
            data['rates'] = {
                'wins' : {
                    season : win_rate_per_season[seasons.index(season)] for season in seasons
                },
                'podiums' : {
                    season : podium_rate_per_season[seasons.index(season)] for season in seasons
                },
                'poles' : {
                    season : pole_rate_per_season[seasons.index(season)] for season in seasons
                },
                'DNFs': {
                    season : dnf_rate_per_season[seasons.index(season)] for season in seasons
                }
            }
            data['winRate'] = win_rate
            data['podiumRate'] = podium_rate
            data['poleRate'] = pole_rate
            data['dnfRate'] = dnf_rate
            data['ptwConRate'] = pole_conversion_rate
            data['positionsGainLost'] = positions_gained_lost
            convert_np_int_to_int(data)
            # replace_nan_with_minus_one(data)
        return data


    files_done = 0
    for filename in json_files:
        input_file = os.path.join(input_directory, filename)
        output_file = os.path.join(output_directory, filename)
        files_done += 1
        print("Current file: ", input_file)

        processed_data = process(input_file)

        f = open(output_file, "w", encoding='utf-8')
        json.dump(processed_data, f, indent=4, ensure_ascii=False, cls=NpEncoder)
        f.close()
        print(files_done, input_file, output_file)
        print("---------------------------------------------")

    print("Driver Data analysis complete!")

def replace_NaN():
    input_directory = 'drivers2/'
    output_directory = 'drivers/'

    if not os.path.exists(output_directory):
        os.makedirs(output_directory)

    json_files = [f for f in os.listdir(input_directory) if f.endswith('.json')]

    def replace_nan_with_minus_one(d):
        def replace_nan(x):
            if isinstance(x, dict):
                return {k: replace_nan(v) for k, v in x.items()}
            elif isinstance(x, list):
                return [replace_nan(i) for i in x]
            elif isinstance(x, float) and math.isnan(x):
                return -1
            else:
                return x

        new_d = replace_nan(d)
        
        new_d = {(k if not (isinstance(k, float) and math.isnan(k)) else -1): v for k, v in new_d.items()}
        
        return new_d

    files_done = 0
    for filename in json_files:
        input_file = os.path.join(input_directory, filename)
        output_file = os.path.join(output_directory, filename)
        files_done += 1
        print("Current file: ", input_file)

        with open(input_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
        if(data):
            updated_data = replace_nan_with_minus_one(data)
        f = open(output_file, "w", encoding='utf-8')
        json.dump(updated_data, f, indent=4, ensure_ascii=False, cls=NpEncoder)
        f.close()
        print(files_done, input_file, output_file)
        print("-----------------------------------")
        
    shutil.rmtree('drivers2')
    print("Replaced NaNs in Driver Data!")

class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        import numpy as np
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NpEncoder, self).default(obj)

def ensure_directory_exists(directory_path):
    """Create directory if it doesn't exist"""
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)
        print(f"Created directory: {directory_path}")

def ensure_file_exists(file_path, default_content):
    """Create file with default content if it doesn't exist"""
    directory = os.path.dirname(file_path)
    ensure_directory_exists(directory)
    
    if not os.path.exists(file_path):
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(default_content, file, indent=4, ensure_ascii=False)
        print(f"Created file: {file_path}")

def update_races():
    season = current_year
    
    # Ensure races directory exists
    ensure_directory_exists('races')
    
    # Ensure races.json exists with default structure
    races_file = 'races/races.json'
    default_races = {str(season): {}}
    ensure_file_exists(races_file, default_races)
    
    # Ensure racesbyMK.json exists with default structure
    races_by_mk_file = 'races/racesbyMK.json'
    ensure_file_exists(races_by_mk_file, {})
    
    response = requests.get(f'https://api.openf1.org/v1/meetings?year={season}')
    if response.status_code == 200:
        responsedata = response.json()
        
        if not responsedata or len(responsedata) == 0:
            print("Warning: No race meetings found from OpenF1 API")
            return
            
        with open(races_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
        
        # Create season entry if it doesn't exist
        if str(season) not in data:
            data[str(season)] = {}
        
        # Add all races to the data structure, not just the last one
        updated = False
        for race in responsedata:
            # Skip "Pre-Season Testing" events
            if "Pre-Season Testing" in race.get("meeting_name", ""):
                continue
                
            if race["meeting_name"] not in data[str(season)]:
                data[str(season)][race["meeting_name"]] = {}
                data[str(season)][race["meeting_name"]]["meeting_key"] = race["meeting_key"]
                data[str(season)][race["meeting_name"]]["location"] = race["location"]
                updated = True
                
                # Also update racesbyMK.json
                with open(races_by_mk_file, 'r', encoding='utf-8') as g:
                    result = json.load(g)
                
                result[race["meeting_key"]] = {}
                result[race["meeting_key"]]["raceName"] = race["meeting_name"]
                result[race["meeting_key"]]["location"] = race["location"]
                result[race["meeting_key"]]["year"] = str(season)
                
                with open(races_by_mk_file, 'w', encoding='utf-8') as g:
                    json.dump(result, g, indent=4, ensure_ascii=False, cls=NpEncoder)
        
        if updated:
            with open(races_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4, ensure_ascii=False, cls=NpEncoder)
            print(f"Added new races to races.json and racesbyMK.json")
        else:
            print("No new races to add")
    else:
        print(f"Failed to get race meetings from OpenF1 API (Status: {response.status_code})")
    
    print("Race Details updated successfully!")

def format_race_entry(api_race):
    """Format a race entry from API data into the compact results.json format"""
    entry = {
        "season": api_race.get("season", str(current_year)),
        "round": api_race.get("round", ""),
        "url": api_race.get("url", ""),
        "raceName": api_race.get("raceName", ""),
        "Circuit": {
            "circuitId": api_race.get("Circuit", {}).get("circuitId", ""),
            "circuitName": api_race.get("Circuit", {}).get("circuitName", ""),
            "Location": {
                "locality": api_race.get("Circuit", {}).get("Location", {}).get("locality", ""),
                "country": api_race.get("Circuit", {}).get("Location", {}).get("country", "")
            }
        },
        "date": api_race.get("date", ""),
        "time": api_race.get("time", ""),
        "Results": []
    }
    for r in api_race.get("Results", []):
        result_entry = {
            "number": r.get("number", ""),
            "position": r.get("position", ""),
            "points": r.get("points", "0"),
            "grid": r.get("grid", ""),
            "Driver": {
                "code": r.get("Driver", {}).get("code", ""),
                "givenName": r.get("Driver", {}).get("givenName", ""),
                "familyName": r.get("Driver", {}).get("familyName", "")
            },
            "Constructor": {
                "constructorId": r.get("Constructor", {}).get("constructorId", ""),
                "name": r.get("Constructor", {}).get("name", "")
            },
            "Time": { "time": r.get("Time", {}).get("time", "") if "Time" in r else r.get("status", "DNF") }
        }
        # Add FastestLap if present
        if "FastestLap" in r:
            fl = r["FastestLap"]
            fl_entry = {
                "rank": fl.get("rank", ""),
                "lap": fl.get("lap", ""),
                "Time": { "time": fl.get("Time", {}).get("time", "") }
            }
            if "AverageSpeed" in fl:
                fl_entry["AverageSpeed"] = {
                    "units": fl["AverageSpeed"].get("units", "kph"),
                    "speed": fl["AverageSpeed"].get("speed", "")
                }
            result_entry["FastestLap"] = fl_entry
        entry["Results"].append(result_entry)
    return entry

def format_qualifying_entry(api_race):
    """Format a qualifying entry from API data into the compact qualifying.json format"""
    entry = {
        "season": api_race.get("season", str(current_year)),
        "round": api_race.get("round", ""),
        "url": api_race.get("url", ""),
        "raceName": api_race.get("raceName", ""),
        "Circuit": {
            "circuitId": api_race.get("Circuit", {}).get("circuitId", ""),
            "circuitName": api_race.get("Circuit", {}).get("circuitName", ""),
            "Location": {
                "locality": api_race.get("Circuit", {}).get("Location", {}).get("locality", ""),
                "country": api_race.get("Circuit", {}).get("Location", {}).get("country", "")
            }
        },
        "date": api_race.get("date", ""),
        "time": api_race.get("time", ""),
        "QualifyingResults": []
    }
    for qr in api_race.get("QualifyingResults", []):
        qr_entry = {
            "number": qr.get("number", ""),
            "position": qr.get("position", ""),
            "Driver": {
                "code": qr.get("Driver", {}).get("code", ""),
                "givenName": qr.get("Driver", {}).get("givenName", ""),
                "familyName": qr.get("Driver", {}).get("familyName", "")
            },
            "Constructor": {
                "constructorId": qr.get("Constructor", {}).get("constructorId", ""),
                "name": qr.get("Constructor", {}).get("name", "")
            }
        }
        # Add Q1, Q2, Q3 only if present
        if "Q1" in qr:
            qr_entry["Q1"] = qr["Q1"]
        if "Q2" in qr:
            qr_entry["Q2"] = qr["Q2"]
        if "Q3" in qr:
            qr_entry["Q3"] = qr["Q3"]
        entry["QualifyingResults"].append(qr_entry)
    return entry

def format_sprint_entry(api_race):
    """Format a sprint entry from API data into the compact sprint.json format"""
    entry = {
        "season": api_race.get("season", str(current_year)),
        "round": api_race.get("round", ""),
        "url": api_race.get("url", ""),
        "raceName": api_race.get("raceName", ""),
        "Circuit": {
            "circuitId": api_race.get("Circuit", {}).get("circuitId", ""),
            "circuitName": api_race.get("Circuit", {}).get("circuitName", ""),
            "Location": {
                "locality": api_race.get("Circuit", {}).get("Location", {}).get("locality", ""),
                "country": api_race.get("Circuit", {}).get("Location", {}).get("country", "")
            }
        },
        "date": api_race.get("date", ""),
        "time": api_race.get("time", ""),
        "Results": []
    }
    for r in api_race.get("SprintResults", api_race.get("Results", [])):
        result_entry = {
            "number": r.get("number", ""),
            "position": r.get("position", ""),
            "points": r.get("points", "0"),
            "grid": r.get("grid", ""),
            "Driver": {
                "code": r.get("Driver", {}).get("code", ""),
                "givenName": r.get("Driver", {}).get("givenName", ""),
                "familyName": r.get("Driver", {}).get("familyName", "")
            },
            "Constructor": {
                "constructorId": r.get("Constructor", {}).get("constructorId", ""),
                "name": r.get("Constructor", {}).get("name", "")
            },
            "Time": { "time": r.get("Time", {}).get("time", "") if "Time" in r else r.get("status", "DNF") }
        }
        entry["Results"].append(result_entry)
    return entry

def write_compact_race_json(data, filepath, results_key="Results"):
    """Write race data in compact readable format: one line per driver result"""
    lines = ["["]
    for i, race in enumerate(data):
        lines.append("    {")
        header = ", ".join(f'"{k}": {json.dumps(race[k], ensure_ascii=False)}' for k in ["season", "round", "url", "raceName"] if k in race)
        lines.append(f"        {header},")
        lines.append(f'        "Circuit": {json.dumps(race.get("Circuit", {}), ensure_ascii=False)},')
        dt_parts = ", ".join(f'"{k}": {json.dumps(race[k], ensure_ascii=False)}' for k in ["date", "time"] if k in race)
        lines.append(f"        {dt_parts},")
        results = race.get(results_key, [])
        lines.append(f'        "{results_key}": [')
        for j, result in enumerate(results):
            comma = "," if j < len(results) - 1 else ""
            lines.append(f"            {json.dumps(result, ensure_ascii=False, cls=NpEncoder)}{comma}")
        lines.append("        ]")
        comma = "," if i < len(data) - 1 else ""
        lines.append(f"    }}{comma}")
    lines.append("]")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines) + "\n")

def update_raceResults():
    """Fetch race results and write to results.json in compact format"""
    season = current_year
    race_details_file = 'raceDetails.json'
    if not os.path.exists(race_details_file):
        race_details_file = f'races/{season}/raceDetails.json'
    ensure_file_exists(race_details_file, [])

    with open(race_details_file, 'r', encoding='utf-8') as file:
        races = json.load(file)

    result = []
    for race in races:
        if dt.strptime(race['date'], '%Y-%m-%d') < dt.now():
            print(race['raceName'], season)
            url = f'{api_url}/{season}/{race["round"]}/results.json'

            max_retries = 5
            wait_time = 10
            for attempt in range(1, max_retries + 1):
                response = requests.get(url)
                if response.status_code == 200:
                    responsedata = response.json()
                    api_races = responsedata.get('MRData', {}).get('RaceTable', {}).get('Races', [])
                    if api_races:
                        result.append(format_race_entry(api_races[0]))
                    break
                elif response.status_code == 429:
                    retry_after = response.headers.get('Retry-After')
                    sleep_for = int(retry_after) if retry_after else wait_time
                    wait_time = min(wait_time * 2, 60)
                    print(f"Rate limited (429). Waiting {sleep_for}s before retry {attempt}/{max_retries}...")
                    time.sleep(sleep_for)
                else:
                    print(f"Failed to get race results for {race['raceName']} (Status: {response.status_code})")
                    break
            else:
                print(f"Exceeded max retries for {race['raceName']}, skipping.")
        else:
            break

    write_compact_race_json(result, 'results.json', 'Results')

    print("Race Results updated successfully!")

def update_qualifying():
    """Fetch qualifying results and write to qualifying.json in compact format"""
    season = current_year
    race_details_file = 'raceDetails.json'
    if not os.path.exists(race_details_file):
        race_details_file = f'races/{season}/raceDetails.json'
    ensure_file_exists(race_details_file, [])

    with open(race_details_file, 'r', encoding='utf-8') as file:
        races = json.load(file)

    result = []
    for race in races:
        if dt.strptime(race['date'], '%Y-%m-%d') < dt.now():
            print(race['raceName'], season)
            url = f'{api_url}/{season}/{race["round"]}/qualifying.json'

            max_retries = 5
            wait_time = 10
            for attempt in range(1, max_retries + 1):
                response = requests.get(url)
                if response.status_code == 200:
                    responsedata = response.json()
                    api_races = responsedata.get('MRData', {}).get('RaceTable', {}).get('Races', [])
                    if api_races:
                        result.append(format_qualifying_entry(api_races[0]))
                    break
                elif response.status_code == 429:
                    retry_after = response.headers.get('Retry-After')
                    sleep_for = int(retry_after) if retry_after else wait_time
                    wait_time = min(wait_time * 2, 60)
                    print(f"Rate limited (429). Waiting {sleep_for}s before retry {attempt}/{max_retries}...")
                    time.sleep(sleep_for)
                else:
                    print(f"Failed to get qualifying results for {race['raceName']} (Status: {response.status_code})")
                    break
            else:
                print(f"Exceeded max retries for {race['raceName']}, skipping.")
        else:
            break

    write_compact_race_json(result, 'qualifying.json', 'QualifyingResults')

    print("Qualifying results updated successfully!")

def update_sprintResults():
    """Fetch sprint results and write to sprint.json in compact format"""
    season = current_year
    race_details_file = 'raceDetails.json'
    if not os.path.exists(race_details_file):
        race_details_file = f'races/{season}/raceDetails.json'
    ensure_file_exists(race_details_file, [])

    with open(race_details_file, 'r', encoding='utf-8') as file:
        races = json.load(file)

    result = []
    for race in races:
        # Only fetch sprints for sprint weekends (have "Sprint" in raceDetails)
        if 'Sprint' not in race:
            continue
        sprint_date = race['Sprint']['date']
        if dt.strptime(sprint_date, '%Y-%m-%d') < dt.now():
            print(f"Sprint: {race['raceName']}", season)
            url = f'{api_url}/{season}/{race["round"]}/sprint.json'

            max_retries = 5
            wait_time = 10
            for attempt in range(1, max_retries + 1):
                response = requests.get(url)
                if response.status_code == 200:
                    responsedata = response.json()
                    api_races = responsedata.get('MRData', {}).get('RaceTable', {}).get('Races', [])
                    if api_races:
                        result.append(format_sprint_entry(api_races[0]))
                    break
                elif response.status_code == 429:
                    retry_after = response.headers.get('Retry-After')
                    sleep_for = int(retry_after) if retry_after else wait_time
                    wait_time = min(wait_time * 2, 60)
                    print(f"Rate limited (429). Waiting {sleep_for}s before retry {attempt}/{max_retries}...")
                    time.sleep(sleep_for)
                else:
                    print(f"Failed to get sprint results for {race['raceName']} (Status: {response.status_code})")
                    break
            else:
                print(f"Exceeded max retries for {race['raceName']}, skipping.")
        else:
            # Don't break - future sprint weekends may exist after non-sprint ones
            continue

    write_compact_race_json(result, 'sprint.json', 'Results')

    print("Sprint Results updated successfully!")

def update_driverStandings():
    for season in [current_year]:
        # Ensure season directory exists
        season_dir = f'races/{season}'
        ensure_directory_exists(season_dir)
        
        # Ensure raceDetails.json exists with default content
        race_details_file = f'{season_dir}/raceDetails.json'
        ensure_file_exists(race_details_file, [])
        
        with open(race_details_file, 'r', encoding='utf-8') as file:
            races = json.load(file)
        
        result = {}
        prev = []  # Initialize prev with an empty list
        
        for race in races:
            race_date = dt.strptime(race['date'], '%Y-%m-%d')
            if race_date < dt.now():
                print(race['raceName'], season)
                url = f'{api_url}/{season}/{race["round"]}/driverStandings.json'
                
                # retry logic parameters
                max_retries = 5
                wait_time = 10  # start with 10 second
                for attempt in range(1, max_retries + 1):
                    response = requests.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        mt = data.get('MRData', {}).get('StandingsTable', {}) \
                                 .get('StandingsLists', [])
                        if mt and 'DriverStandings' in mt[0]:
                            result[race['round']] = mt[0]['DriverStandings']
                            prev = result[race['round']]
                        break
                    elif response.status_code == 429:
                        # Too many requests: back off
                        retry_after = response.headers.get('Retry-After')
                        if retry_after is not None:
                            sleep_for = int(retry_after)
                        else:
                            sleep_for = wait_time
                            wait_time = min(wait_time * 2, 60)  # cap at 60s
                        print(f"Rate limited (429). Waiting {sleep_for}s before retry {attempt}/{max_retries}...")
                        time.sleep(sleep_for)
                    else:
                        print(f"Failed to get driver standings for {race['raceName']} (Status: {response.status_code})")
                        break
                else:
                    print(f"Exceeded max retries for {race['raceName']}, skipping.")
            else:
                if prev:  # Only add 'latest' if prev has been set
                    result['latest'] = prev
                break
        
        driver_standings_file = f'{season_dir}/driverStandings.json'
        with open(driver_standings_file, 'w', encoding='utf-8') as file:
            json.dump(result, file, indent=4, ensure_ascii=False, cls=NpEncoder)

    print('Driver Standings updated successfully!')

def update_constructorStandings():
    for season in [current_year]:
        # Ensure season directory exists
        season_dir = f'races/{season}'
        ensure_directory_exists(season_dir)
        
        # Ensure raceDetails.json exists with default content
        race_details_file = f'{season_dir}/raceDetails.json'
        ensure_file_exists(race_details_file, [])
        
        with open(race_details_file, 'r', encoding='utf-8') as file:
            races = json.load(file)
        
        result = {}
        prev = []  # Initialize prev with an empty list
        
        for race in races:
            race_date = dt.strptime(race['date'], '%Y-%m-%d')
            if race_date < dt.now():
                print(race['raceName'], season)
                url = f'{api_url}/{season}/{race["round"]}/constructorStandings.json'
                
                # retry logic parameters
                max_retries = 5
                wait_time = 10  # start with 10 second
                for attempt in range(1, max_retries + 1):
                    response = requests.get(url)
                    if response.status_code == 200:
                        data = response.json()
                        standings_lists = (
                            data.get('MRData', {})
                                .get('StandingsTable', {})
                                .get('StandingsLists', [])
                        )
                        if standings_lists and 'ConstructorStandings' in standings_lists[0]:
                            result[race['round']] = standings_lists[0]['ConstructorStandings']
                            prev = result[race['round']]
                        break
                    elif response.status_code == 429:
                        # Too many requests: back off
                        retry_after = response.headers.get('Retry-After')
                        if retry_after is not None:
                            sleep_for = int(retry_after)
                        else:
                            sleep_for = wait_time
                            wait_time = min(wait_time * 2, 60)  # cap at 60s
                        print(f"Rate limited (429). Waiting {sleep_for}s before retry {attempt}/{max_retries}...")
                        time.sleep(sleep_for)
                    else:
                        print(f"Failed to get constructor standings for {race['raceName']} (Status: {response.status_code})")
                        break
                else:
                    print(f"Exceeded max retries for {race['raceName']}, skipping.")
            else:
                if prev:  # Only add 'latest' if prev has been set
                    result['latest'] = prev
                break
        
        constructor_standings_file = f'{season_dir}/constructorStandings.json'
        with open(constructor_standings_file, 'w', encoding='utf-8') as file:
            json.dump(result, file, indent=4, ensure_ascii=False, cls=NpEncoder)

    print('Constructor Standings updated successfully!')
# This function is no longer needed as its functionality is included in update_all()
def initialize_race_details():
    """Initialize race details file for current season if it doesn't exist"""
    season = current_year
    season_dir = f'races/{season}'
    ensure_directory_exists(season_dir)
    
    race_details_file = f'{season_dir}/raceDetails.json'
    
    # If file doesn't exist or is empty, fetch race calendar from API
    if not os.path.exists(race_details_file) or os.path.getsize(race_details_file) == 0:
        races = fetch_race_calendar(season)
        if races and len(races) > 0:
            with open(race_details_file, 'w', encoding='utf-8') as file:
                json.dump(races, file, indent=4, ensure_ascii=False, cls=NpEncoder)
            print(f"Initialized race details for {season} with {len(races)} races")
        else:
            # Create empty array if API doesn't return expected data
            ensure_file_exists(race_details_file, [])
            print("Warning: Could not initialize race details from API")

def fetch_race_calendar(season):
    """Fetch race calendar from API for given season, excluding Pre-Season Testing"""
    url = f'{api_url}/{season}.json'
    response = requests.get(url)
    
    if response.status_code == 200:
        responsedata = response.json()
        if 'MRData' in responsedata and 'RaceTable' in responsedata['MRData'] and 'Races' in responsedata['MRData']['RaceTable']:
            races = responsedata['MRData']['RaceTable']['Races']
            # Filter out any "Pre-Season Testing" events
            filtered_races = [race for race in races if "Pre-Season Testing" not in race.get('raceName', '')]
            return filtered_races
    
    print(f"Warning: Couldn't fetch race calendar for {season} from API")
    return []

def pre_checks():
    """Perform pre-update checks and initialize necessary files"""
    season = current_year
    
    # Ensure base directory structure exists
    ensure_directory_exists('races')
    ensure_directory_exists(f'races/{season}')
    
    # Initialize races.json with proper structure if empty
    races_file = 'races/races.json'
    if not os.path.exists(races_file) or os.path.getsize(races_file) == 0:
        with open(races_file, 'w', encoding='utf-8') as f:
            json.dump({str(season): {}}, f, indent=4, ensure_ascii=False, cls=NpEncoder)
        print(f"Initialized races.json with structure for {season}")
    
    # Initialize racesbyMK.json if empty
    races_by_mk_file = 'races/racesbyMK.json'
    if not os.path.exists(races_by_mk_file) or os.path.getsize(races_by_mk_file) == 0:
        with open(races_by_mk_file, 'w', encoding='utf-8') as f:
            json.dump({}, f, indent=4, ensure_ascii=False, cls=NpEncoder)
        print(f"Initialized racesbyMK.json with empty structure")
    
    # Initialize race details which other functions depend on
    race_details_file = f'races/{season}/raceDetails.json'
    if not os.path.exists(race_details_file) or os.path.getsize(race_details_file) == 0:
        races = fetch_race_calendar(season)
        with open(race_details_file, 'w', encoding='utf-8') as f:
            json.dump(races, f, indent=4, ensure_ascii=False, cls=NpEncoder)
        print(f"Initialized raceDetails.json with {len(races)} races for {season}")
    
    # Verify race details file has data before proceeding
    with open(race_details_file, 'r', encoding='utf-8') as f:
        race_data = json.load(f)
    
    if not race_data or len(race_data) == 0:
        print("Warning: No race data found for the current season. Attempting to fetch from API...")
        race_data = fetch_race_calendar(season)
        if race_data and len(race_data) > 0:
            with open(race_details_file, 'w', encoding='utf-8') as f:
                json.dump(race_data, f, indent=4, ensure_ascii=False, cls=NpEncoder)
            print(f"Successfully fetched and saved {len(race_data)} races for {season}")
            return True
        else:
            print("Error: Could not fetch race data from API. Manual initialization required.")
            print("Skipping remaining updates as they depend on race data.")
            return False
    
    return True

def update():
    print("==========Updating constructors==========")
    update_constructors()
    print("==========Updating constructor drivers==========")
    update_constructor_drivers()
    print("==========Updating Driver Data==========")
    update_driverData()
    print("==========Analysing Driver Data==========")
    analyse_driverData()
    print("==========Replacing NaNs in Driver Data==========")
    replace_NaN()  
    print("==========Updating Race Details==========")
    if not pre_checks():
        return
    update_races()
    print("==========Updating Race Results==========")
    update_raceResults()
    print("==========Updating Qualifying Sessions==========")
    update_qualifying()
    print("==========Updating Sprint Results==========")
    update_sprintResults()
    print("==========Updating Driver Standings==========")
    update_driverStandings()
    print("==========Updating Constructor Standings==========")
    update_constructorStandings()

update()