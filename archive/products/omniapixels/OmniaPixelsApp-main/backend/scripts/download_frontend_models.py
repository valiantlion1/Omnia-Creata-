import os
import requests
from tqdm import tqdm

# On-Device (ONNX) Models for Frontend
MODELS = {
    # u2net (standard) ~170MB
    "u2net.onnx": "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx",
    # u2netp (quantized/small) ~4MB - Better for mobile
    "u2netp.onnx": "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx"
}

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "public", "models")

def download_file(url, filename):
    filepath = os.path.join(MODELS_DIR, filename)
    if os.path.exists(filepath):
        print(f"File {filename} already exists. Skipping.")
        return

    print(f"Downloading {filename} to {filepath}...")
    response = requests.get(url, stream=True)
    total_size_in_bytes = int(response.headers.get('content-length', 0))
    block_size = 1024
    progress_bar = tqdm(total=total_size_in_bytes, unit='iB', unit_scale=True)
    
    with open(filepath, 'wb') as file:
        for data in response.iter_content(block_size):
            progress_bar.update(len(data))
            file.write(data)
    progress_bar.close()
    
    if total_size_in_bytes != 0 and progress_bar.n != total_size_in_bytes:
        print("ERROR, something went wrong")
        if os.path.exists(filepath):
            os.remove(filepath)

if __name__ == "__main__":
    if not os.path.exists(MODELS_DIR):
        os.makedirs(MODELS_DIR)
    
    for filename, url in MODELS.items():
        download_file(url, filename)
    
    print("All frontend ONNX models downloaded.")
