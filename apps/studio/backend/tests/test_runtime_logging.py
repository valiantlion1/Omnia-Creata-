from __future__ import annotations

import logging
import os
from pathlib import Path

import pytest

from config.env import Environment, Settings
from runtime_logging import configure_runtime_logging


def test_settings_runtime_root_prefers_localappdata(monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", r"C:\Users\creator\AppData\Local")
    monkeypatch.delenv("XDG_STATE_HOME", raising=False)

    settings = Settings(_env_file=None, jwt_secret="x" * 32)

    assert settings.runtime_root_path == Path(r"C:\Users\creator\AppData\Local\OmniaCreata\Studio")
    assert settings.log_directory_path == Path(r"C:\Users\creator\AppData\Local\OmniaCreata\Studio\logs")


def test_settings_log_directory_override_wins(tmp_path):
    runtime_root = tmp_path / "runtime-root"
    log_root = tmp_path / "custom-logs"

    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        studio_runtime_root=str(runtime_root),
        studio_log_directory=str(log_root),
    )

    assert settings.runtime_root_path == runtime_root.resolve()
    assert settings.log_directory_path == log_root.resolve()


def test_runtime_logging_creates_external_log_directory(tmp_path):
    log_root = tmp_path / "runtime-logs"
    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        studio_log_directory=str(log_root),
    )

    configured_path = configure_runtime_logging(settings)

    assert configured_path == log_root.resolve()
    assert configured_path.exists()
    file_handler_paths = {
        getattr(handler, "_oc_runtime_file_path", None)
        for handler in logging.getLogger().handlers
        if getattr(handler, "_oc_runtime_file_path", None)
    }
    assert str((log_root / "backend.app.log").resolve()) in file_handler_paths
    assert str((log_root / "backend.error.log").resolve()) in file_handler_paths


def test_settings_enable_demo_auth_defaults_to_development_only():
    development = Settings(_env_file=None, jwt_secret="x" * 32, environment=Environment.DEVELOPMENT)
    staging = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.STAGING,
        database_url="postgresql://user:pass@localhost:5432/studio",
        supabase_url="https://example.supabase.co",
        supabase_service_role_key="x" * 32,
        state_store_backend="postgres",
    )

    assert development.enable_demo_auth is True
    assert staging.enable_demo_auth is False


def test_settings_enable_api_docs_defaults_to_development_only():
    development = Settings(_env_file=None, jwt_secret="x" * 32, environment=Environment.DEVELOPMENT)
    staging = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.STAGING,
        database_url="postgresql://user:pass@localhost:5432/studio",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="anon-key",
        supabase_service_role_key="x" * 32,
        redis_url="redis://127.0.0.1:6379/0",
        state_store_backend="postgres",
        asset_storage_backend="supabase",
        public_web_base_url="https://studio.example.com",
        public_api_base_url="https://api.example.com",
    )

    assert development.enable_api_docs is True
    assert staging.enable_api_docs is False


def test_validate_production_requirements_requires_launch_shaped_runtime_values():
    staging = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.STAGING,
        database_url="postgresql://user:pass@db.example.com:5432/studio",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="anon-key",
        supabase_service_role_key="x" * 32,
        redis_url="redis://cache.example.com:6379/0",
        state_store_backend="postgres",
        asset_storage_backend="supabase",
        public_web_base_url="https://studio.example.com",
        public_api_base_url="https://api.example.com",
    )

    staging.validate_production_requirements()


@pytest.mark.parametrize(
    ("overrides", "expected_message"),
    [
        ({"supabase_anon_key": None}, "supabase_anon_key"),
        ({"redis_url": None}, "redis_url"),
        ({"asset_storage_backend": "local"}, "ASSET_STORAGE_BACKEND"),
        ({"public_web_base_url": "http://localhost:5173"}, "PUBLIC_WEB_BASE_URL"),
        ({"public_api_base_url": "http://127.0.0.1:8000"}, "PUBLIC_API_BASE_URL"),
        ({"enable_demo_auth": True}, "ENABLE_DEMO_AUTH"),
        ({"enable_demo_generation_fallback": True}, "ENABLE_DEMO_GENERATION_FALLBACK"),
        ({"enable_api_docs": True}, "ENABLE_API_DOCS"),
    ],
)
def test_validate_production_requirements_rejects_unsafe_launch_drift(overrides, expected_message):
    base_kwargs = {
        "_env_file": None,
        "jwt_secret": "x" * 32,
        "environment": Environment.STAGING,
        "database_url": "postgresql://user:pass@db.example.com:5432/studio",
        "supabase_url": "https://example.supabase.co",
        "supabase_anon_key": "anon-key",
        "supabase_service_role_key": "x" * 32,
        "redis_url": "redis://cache.example.com:6379/0",
        "state_store_backend": "postgres",
        "asset_storage_backend": "supabase",
        "public_web_base_url": "https://studio.example.com",
        "public_api_base_url": "https://api.example.com",
    }
    base_kwargs.update(overrides)

    settings = Settings(**base_kwargs)

    with pytest.raises(ValueError, match=expected_message):
        settings.validate_production_requirements()
