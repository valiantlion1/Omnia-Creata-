from pathlib import Path

import pytest

from config.env import Environment, get_settings
from studio_platform.asset_storage import AssetNotFoundError, LocalAssetStorageBackend, build_asset_storage_registry


def test_development_defaults_to_local_asset_storage_even_when_supabase_is_configured(tmp_path: Path) -> None:
    settings = get_settings()
    original_environment = settings.environment
    original_backend = settings.asset_storage_backend
    original_url = settings.supabase_url
    original_key = settings.supabase_service_role_key
    original_flag = settings.development_remote_asset_storage_enabled

    try:
        settings.environment = Environment.DEVELOPMENT
        settings.asset_storage_backend = "supabase"
        settings.supabase_url = "https://example.supabase.co"
        settings.supabase_service_role_key = "service-role-key"
        settings.development_remote_asset_storage_enabled = False

        registry = build_asset_storage_registry(settings, tmp_path / "media")

        assert registry.default_kind == "local"
        assert registry.supabase_backend is not None
    finally:
        settings.environment = original_environment
        settings.asset_storage_backend = original_backend
        settings.supabase_url = original_url
        settings.supabase_service_role_key = original_key
        settings.development_remote_asset_storage_enabled = original_flag


def test_development_can_opt_in_to_remote_asset_storage(tmp_path: Path) -> None:
    settings = get_settings()
    original_environment = settings.environment
    original_backend = settings.asset_storage_backend
    original_url = settings.supabase_url
    original_key = settings.supabase_service_role_key
    original_flag = settings.development_remote_asset_storage_enabled

    try:
        settings.environment = Environment.DEVELOPMENT
        settings.asset_storage_backend = "supabase"
        settings.supabase_url = "https://example.supabase.co"
        settings.supabase_service_role_key = "service-role-key"
        settings.development_remote_asset_storage_enabled = True

        registry = build_asset_storage_registry(settings, tmp_path / "media")

        assert registry.default_kind == "supabase"
        assert registry.supabase_backend is not None
    finally:
        settings.environment = original_environment
        settings.asset_storage_backend = original_backend
        settings.supabase_url = original_url
        settings.supabase_service_role_key = original_key
        settings.development_remote_asset_storage_enabled = original_flag


@pytest.mark.asyncio
async def test_local_asset_storage_fetch_treats_read_errors_as_missing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    backend = LocalAssetStorageBackend(tmp_path / "media")
    key = "generated/ws/project/asset.png"
    path = backend.resolve_path(key)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"image-bytes")
    original_read_bytes = Path.read_bytes

    def fake_read_bytes(candidate: Path) -> bytes:
        if candidate == path:
            raise PermissionError("local asset payload is not readable")
        return original_read_bytes(candidate)

    monkeypatch.setattr(Path, "read_bytes", fake_read_bytes)

    with pytest.raises(AssetNotFoundError, match="Local asset not found"):
        await backend.fetch_bytes(key)
