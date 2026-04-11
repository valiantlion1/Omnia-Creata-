from pathlib import Path

from config.env import Environment, get_settings
from studio_platform.asset_storage import build_asset_storage_registry


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
