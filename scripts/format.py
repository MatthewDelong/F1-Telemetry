import os
import json
import glob

def format_json_files(directory):
    # Find all JSON files in the specified directory
    json_files = glob.glob(os.path.join(directory, "*.json"))
    
    formatted_count = 0
    for file_path in json_files:
        try:
            # Read the unformatted JSON
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Write the beautifully formatted JSON back to the file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
                
            formatted_count += 1
            print(f"Formatted: {os.path.basename(file_path)}")
        except Exception as e:
            print(f"Error formatting {os.path.basename(file_path)}: {e}")
            
    print(f"\nSuccessfully formatted {formatted_count} JSON files!")

if __name__ == "__main__":
    # Point it to the trackdata folder
    target_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'trackdata')
    format_json_files(target_dir)
