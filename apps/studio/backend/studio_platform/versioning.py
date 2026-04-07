from __future__ import annotations

import json
from pathlib import Path

from pydantic import BaseModel


STUDIO_API_VERSION = "2.0.0"


class StudioVersionInfo(BaseModel):
    product: str
    brand: str = "OmniaCreata"
    version: str
    channel: str
    build: str
    codename: str
    status: str
    releaseDate: str
    notes: str

    def to_public_payload(self) -> dict[str, str]:
        return {
            "product": self.product,
            "brand": self.brand,
            "version": self.version,
            "channel": self.channel,
            "build": self.build,
            "codename": self.codename,
            "status": self.status,
            "releaseDate": self.releaseDate,
            "notes": self.notes,
            "apiVersion": STUDIO_API_VERSION,
        }


def build_runtime_version_payload(
    *,
    boot_build: str | None = None,
    booted_at: str | None = None,
) -> dict[str, str]:
    payload = load_version_info().to_public_payload()
    if boot_build:
        payload["bootBuild"] = boot_build
    if booted_at:
        payload["bootedAt"] = booted_at
    return payload


def _default_version_path() -> Path:
    return Path(__file__).resolve().parents[2] / "version.json"


def load_version_info(path: str | None = None) -> StudioVersionInfo:
    version_path = Path(path) if path else _default_version_path()
    payload = json.loads(version_path.read_text(encoding="utf-8"))
    return StudioVersionInfo.model_validate(payload)
