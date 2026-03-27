from __future__ import annotations

import argparse
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import requests


@dataclass(frozen=True)
class ModelDownload:
    key: str
    label: str
    url: str
    output: Path


MODEL_PACK: tuple[ModelDownload, ...] = (
    ModelDownload(
        key="juggernaut-ragnarok",
        label="Juggernaut Ragnarok (Civitai)",
        url="https://civitai.com/api/download/models/1759168",
        output=Path(r"C:\AI\models\checkpoints\juggernautXL_ragnarokBy.safetensors"),
    ),
    ModelDownload(
        key="wai-illustrious-v16",
        label="WAI Illustrious SDXL v16 (Civitai)",
        url="https://civitai.com/api/download/models/2514310",
        output=Path(r"C:\AI\models\checkpoints\waiIllustriousSDXL_v160.safetensors"),
    ),
    ModelDownload(
        key="juggernaut-inpainting-xi",
        label="Juggernaut XL Inpainting XI (Civitai)",
        url="https://civitai.com/api/download/models/965389",
        output=Path(r"C:\AI\models\checkpoints\juggernautXLInpainting_xiInpainting.safetensors"),
    ),
    ModelDownload(
        key="sdxl-lightning-4step-lora",
        label="SDXL Lightning 4-step LoRA (Hugging Face)",
        url="https://huggingface.co/ByteDance/SDXL-Lightning/resolve/main/sdxl_lightning_4step_lora.safetensors?download=true",
        output=Path(r"C:\AI\models\loras\sdxl_lightning_4step_lora.safetensors"),
    ),
    ModelDownload(
        key="hyper-sd-2step-lora",
        label="Hyper-SD 2-step LoRA (Hugging Face)",
        url="https://huggingface.co/ByteDance/Hyper-SD/resolve/main/Hyper-SDXL-2steps-lora.safetensors?download=true",
        output=Path(r"C:\AI\models\loras\Hyper-SDXL-2steps-lora.safetensors"),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download Omnia Studio local model pack with resume support.")
    parser.add_argument(
        "--model",
        action="append",
        dest="models",
        help="Download only the given model key. Can be repeated.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available model keys and exit.",
    )
    parser.add_argument(
        "--retries",
        type=int,
        default=200,
        help="Retry count per model before giving up.",
    )
    return parser.parse_args()


def iter_targets(selected: list[str] | None) -> Iterable[ModelDownload]:
    if not selected:
        return MODEL_PACK
    wanted = {item.strip().lower() for item in selected}
    return [model for model in MODEL_PACK if model.key in wanted]


def format_mb(size_bytes: int) -> str:
    return f"{size_bytes / (1024 * 1024):.1f} MB"


def get_total_bytes(response: requests.Response, existing_bytes: int) -> int | None:
    content_range = response.headers.get("Content-Range")
    if content_range and "/" in content_range:
        try:
            return int(content_range.rsplit("/", 1)[1])
        except ValueError:
            return None
    content_length = response.headers.get("Content-Length")
    if content_length:
        try:
            return int(content_length) + existing_bytes
        except ValueError:
            return None
    return None


def ensure_partial_path(output: Path) -> Path:
    partial = output.with_suffix(output.suffix + ".partial")
    if output.exists() and not partial.exists():
        output.replace(partial)
    partial.parent.mkdir(parents=True, exist_ok=True)
    return partial


def download_with_resume(model: ModelDownload, retries: int) -> None:
    output = model.output
    partial = ensure_partial_path(output)
    session = requests.Session()
    session.headers["User-Agent"] = "OmniaCreata-Studio-Downloader/1.0"

    for attempt in range(1, retries + 1):
        existing = partial.stat().st_size if partial.exists() else 0
        headers = {"Range": f"bytes={existing}-"} if existing else {}
        try:
            with session.get(model.url, headers=headers, stream=True, allow_redirects=True, timeout=(30, 120)) as response:
                response.raise_for_status()
                total = get_total_bytes(response, existing)
                mode = "ab" if existing and response.status_code == 206 else "wb"
                if mode == "wb" and partial.exists():
                    partial.unlink()
                written = existing if mode == "ab" else 0
                with partial.open(mode) as handle:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if not chunk:
                            continue
                        handle.write(chunk)
                        written += len(chunk)
                final_size = partial.stat().st_size
                if total is None or final_size >= total:
                    partial.replace(output)
                    print(f"[done] {model.label} -> {output} ({format_mb(output.stat().st_size)})")
                    return
                print(
                    f"[resume] {model.label}: {format_mb(final_size)} / {format_mb(total)} downloaded, continuing..."
                )
        except requests.RequestException as exc:
            current = partial.stat().st_size if partial.exists() else 0
            print(
                f"[retry {attempt}/{retries}] {model.label}: {exc.__class__.__name__} after {format_mb(current)}"
            )
            time.sleep(min(30, attempt))
            continue
    raise RuntimeError(f"Failed to finish {model.label} after {retries} retries.")


def main() -> int:
    args = parse_args()
    if args.list:
        for model in MODEL_PACK:
            print(f"{model.key:28} {model.label}")
        return 0

    targets = list(iter_targets(args.models))
    if not targets:
        print("No matching model keys.")
        return 1

    for model in targets:
        download_with_resume(model, retries=args.retries)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
