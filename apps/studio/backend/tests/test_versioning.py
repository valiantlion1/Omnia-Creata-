from studio_platform.versioning import STUDIO_API_VERSION, StudioVersionInfo, load_version_info


def test_load_version_info_reads_studio_manifest() -> None:
    version = load_version_info()
    assert isinstance(version, StudioVersionInfo)
    assert version.product == "OmniaCreata Studio"
    assert version.version == "0.5.1-alpha"
    assert version.build == "2026.04.05.02"


def test_version_payload_exposes_api_version() -> None:
    payload = load_version_info().to_public_payload()
    assert payload["apiVersion"] == STUDIO_API_VERSION
    assert payload["build"] == "2026.04.05.02"
