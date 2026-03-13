import os
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONFIG_DIR = ROOT / 'config'
MODELS_PATHS_FILE = CONFIG_DIR / 'models.paths.json'
INDEX_OUT_FILE = CONFIG_DIR / 'models.index.json'

SUPPORTED_EXTS = {'.safetensors', '.ckpt', '.pth'}


def load_paths():
    with open(MODELS_PATHS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    root = Path(data.get('root', str(ROOT.parent)))
    paths = {k: Path(v) for k, v in data.get('paths', {}).items()}
    return root, paths


def scan_dir(dir_path: Path, kind: str):
    items = []
    if not dir_path.exists():
        return items
    for p in dir_path.rglob('*'):
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS:
            stat = p.stat()
            size_mb = round(stat.st_size / (1024*1024), 2)
            family = 'sdxl' if 'xl' in p.name.lower() or 'sdxl' in p.name.lower() else ('sd15' if 'sd15' in str(p.parent).lower() or '1.5' in p.name else 'unknown')
            items.append({
                'name': p.name,
                'path': str(p.resolve()),
                'type': kind,
                'family': family,
                'ext': p.suffix.lower(),
                'size_mb': size_mb,
                'modified_ts': int(stat.st_mtime)
            })
    return items


def build_index():
    root, paths = load_paths()
    index = {
        'generated_at': int(time.time()),
        'root': str(root),
        'sets': {}
    }
    for kind, dir_path in paths.items():
        index['sets'][kind] = scan_dir(dir_path, kind)
    return index


def main():
    index = build_index()
    with open(INDEX_OUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    print(f"Indexed {sum(len(v) for v in index['sets'].values())} model files -> {INDEX_OUT_FILE}")


if __name__ == '__main__':
    main()