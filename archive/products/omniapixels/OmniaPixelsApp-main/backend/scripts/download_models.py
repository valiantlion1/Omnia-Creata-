import os
import requests
from tqdm import tqdm

MODELS = {
    "RealESRGAN_x4plus.pth": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
    "RealESRGAN_x2plus.pth": "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth",
    # RemBG uses 'u2net' by default, which is downloaded automatically by the library on first use.
    # We can pre-download it here if we want to bake it into docker image.
    # "u2net.onnx": "https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net.onnx"
}

MODELS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")

def download_file(url, filename):
    filepath = os.path.join(MODELS_DIR, filename)
    if os.path.exists(filepath):
        print(f"File {filename} already exists. Skipping.")
        return

    print(f"Downloading {filename}...")
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
    
    print("All models downloaded.")
