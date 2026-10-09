from rembg import remove
from PIL import Image
import io
import sys

input_path = "public/images/2026/principals/alpine.png"
output_path = "public/images/2026/principals/alpine.png"

try:
    print("Reading image...")
    with open(input_path, "rb") as i:
        input_data = i.read()
    
    print("Removing background...")
    output_data = remove(input_data)
    
    print("Resizing image...")
    img = Image.open(io.BytesIO(output_data))
    
    # Calculate aspect ratio
    width, height = img.size
    aspect_ratio = width / height
    
    # Target size similar to ferrari (238x277)
    target_height = 277
    target_width = int(target_height * aspect_ratio)
    
    img = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
    
    print("Saving image...")
    img.save(output_path, "PNG")
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
