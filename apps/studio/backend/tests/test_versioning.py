import json
from pathlib import Path

from studio_platform.versioning import STUDIO_API_VERSION, StudioVersionInfo, load_version_info


def _read_manifest() -> dict[str, str]:
    version_path = Path(__file__).resolve().parents[2] / "version.json"
    return json.loads(version_path.read_text(encoding="utf-8"))


def test_load_version_info_reads_studio_manifest() -> None:
    manifest = _read_manifest()
    version = load_version_info()
    assert isinstance(version, StudioVersionInfo)
    assert version.product == "OmniaCreata Studio"
    assert version.version == manifest["version"]
    assert version.build == manifest["build"]


def test_version_payload_exposes_api_version() -> None:
    manifest = _read_manifest()
    payload = load_version_info().to_public_payload()
    assert payload["apiVersion"] == STUDIO_API_VERSION
    assert payload["build"] == manifest["build"]
