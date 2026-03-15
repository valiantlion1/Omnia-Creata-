import os
import requests
import sys

MODELS = [
    # Uncomment the following block to download Pony Diffusion V6 XL (6.94 GB)
    # {
    #    "name": "Pony Diffusion V6 XL (Safetensors)",
    #    "url": "https://huggingface.co/Polenov2024/Pony-Diffusion-V6-XL/resolve/main/ponyDiffusionV6XL_v6StartWithThisOne.safetensors",
    #    "path": "C:/AI/models/checkpoints/ponyDiffusionV6XL_v6StartWithThisOne.safetensors",
    #    "size_gb": 6.94
    # },
    {
        "name": "Detail Tweaker XL LoRA",
        "url": "https://huggingface.co/XL-Models/Detail-Tweaker-XL/resolve/main/add-detail-xl.safetensors",
        "path": "C:/AI/models/loras/add-detail-xl.safetensors",
        "size_gb": 0.4
    }
]

def download_file(url, filepath, name):
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    if os.path.exists(filepath):
        print(f"[*] {name} is already downloaded at {filepath}.")
        return

    print(f"[\u2193] Downloading {name}...")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024 * 1024 # 1 MB
        downloaded = 0
        
        with open(filepath, 'wb') as f:
            for data in response.iter_content(block_size):
                f.write(data)
                downloaded += len(data)
                
                if total_size > 0:
                    percent = int(50 * downloaded / total_size)
                    sys.stdout.write(f"\r[{'=' * percent}{' ' * (50-percent)}] {downloaded/1024/1024:.1f} MB / {total_size/1024/1024:.1f} MB")
                    sys.stdout.flush()
        print(f"\n[\u2713] Successfully downloaded {name} to {filepath}")
    except Exception as e:
        print(f"\n[!] Failed to download {name}: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)

if __name__ == "__main__":
    print("Omnia Creata Studio - Model Downloader (NSFW/General SDXL Models)")
    print("----------------------------------------------------------------")
    for model in MODELS:
        print(f"Preparing to download: {model['name']} (~{model['size_gb']} GB)")
        download_file(model['url'], model['path'], model['name'])
    print("All downloads processed.")
