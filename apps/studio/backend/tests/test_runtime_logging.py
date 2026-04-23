from __future__ import annotations

import logging
import os
from pathlib import Path

import pytest

from config.env import Environment, Settings, reveal_secret_with_audit
from observability.context import bind_identity_id, bind_request_id
from runtime_logging import RedactingLogFilter, RequestContextLogFilter, configure_runtime_logging


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
    assert any(
        any(isinstance(log_filter, RedactingLogFilter) for log_filter in handler.filters)
        for handler in logging.getLogger().handlers
    )
    assert any(
        any(isinstance(log_filter, RequestContextLogFilter) for log_filter in handler.filters)
        for handler in logging.getLogger().handlers
    )


def test_redacting_log_filter_masks_secret_like_message_content():
    record = logging.LogRecord(
        name="omnia.test",
        level=logging.ERROR,
        pathname=__file__,
        lineno=1,
        msg="Authorization header: %s",
        args=("Bearer sk-or-v1-secret-token-1234567890",),
        exc_info=None,
    )

    assert RedactingLogFilter().filter(record) is True
    assert "***REDACTED***" in record.args[0]
    assert "sk-or-v1-secret-token-1234567890" not in record.args[0]


def test_redacting_log_filter_masks_secret_like_extra_fields():
    record = logging.LogRecord(
        name="omnia.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="structured security event",
        args=(),
        exc_info=None,
    )
    record.token_preview = "Bearer sk-or-v1-secret-token-1234567890"
    record.details = {
        "authorization": "Bearer sk-or-v1-secret-token-1234567890",
        "query": "?api_key=super-secret-value-1234567890",
    }

    assert RedactingLogFilter().filter(record) is True
    assert "***REDACTED***" in record.token_preview
    assert "sk-or-v1-secret-token-1234567890" not in record.token_preview
    assert "***REDACTED***" in record.details["authorization"]
    assert "super-secret-value-1234567890" not in record.details["query"]


def test_request_context_log_filter_appends_bound_request_and_identity_ids():
    bind_request_id("req-123")
    bind_identity_id("user-456")
    record = logging.LogRecord(
        name="omnia.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="runtime event",
        args=(),
        exc_info=None,
    )

    assert RequestContextLogFilter().filter(record) is True
    assert record.request_id == "req-123"
    assert record.identity_id == "user-456"
    assert record.context_suffix == " | request_id=req-123 identity_id=user-456"


def test_request_context_log_filter_respects_explicit_record_context():
    bind_request_id("req-context")
    bind_identity_id("user-context")
    record = logging.LogRecord(
        name="omnia.test",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="runtime event",
        args=(),
        exc_info=None,
    )
    record.request_id = "req-explicit"
    record.identity_id = "user-explicit"

    assert RequestContextLogFilter().filter(record) is True
    assert record.request_id == "req-explicit"
    assert record.identity_id == "user-explicit"
    assert record.context_suffix == " | request_id=req-explicit identity_id=user-explicit"


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
        generation_runtime_mode="web",
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
        ({"generation_runtime_mode": "all"}, "GENERATION_RUNTIME_MODE"),
        ({"public_web_base_url": "http://localhost:5173"}, "PUBLIC_WEB_BASE_URL"),
        ({"public_api_base_url": "http://127.0.0.1:8000"}, "PUBLIC_API_BASE_URL"),
        ({"enable_demo_auth": True}, "ENABLE_DEMO_AUTH"),
        ({"enable_demo_generation_fallback": True}, "ENABLE_DEMO_GENERATION_FALLBACK"),
        ({"enable_api_docs": True}, "ENABLE_API_DOCS"),
        ({"jwt_secret": "dev-jwt-secret-0123456789abcdef0123456789abcdef"}, "JWT_SECRET"),
    ],
)
def test_validate_production_requirements_rejects_unsafe_launch_drift(overrides, expected_message):
    base_kwargs = {
        "_env_file": None,
        "jwt_secret": "x" * 32,
        "environment": Environment.STAGING,
        "generation_runtime_mode": "web",
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


def test_validate_runtime_accepts_launch_shaped_runtime_values():
    staging = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.STAGING,
        generation_runtime_mode="web",
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

    warnings = staging.validate_runtime()

    assert isinstance(warnings, list)


def test_validate_runtime_rejects_too_small_request_body_limit():
    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.DEVELOPMENT,
        max_request_body_bytes=512,
    )

    with pytest.raises(ValueError, match="MAX_REQUEST_BODY_BYTES"):
        settings.validate_runtime()


def test_validate_runtime_rejects_known_development_jwt_secret_in_staging():
    settings = Settings(
        _env_file=None,
        environment=Environment.STAGING,
        jwt_secret="dev-jwt-secret-0123456789abcdef0123456789abcdef",
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

    with pytest.raises(ValueError, match="JWT_SECRET"):
        settings.validate_runtime()


def test_validate_runtime_warns_when_split_web_runtime_uses_default_postgres_pool_budget():
    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.STAGING,
        generation_runtime_mode="web",
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

    warnings = settings.validate_runtime()

    assert any(
        "POSTGRES_STATE_STORE_WEB_MIN_CONNECTIONS/POSTGRES_STATE_STORE_WEB_MAX_CONNECTIONS" in warning
        for warning in warnings
    )


def test_validate_runtime_rejects_all_in_one_runtime_outside_development():
    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.STAGING,
        generation_runtime_mode="all",
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

    with pytest.raises(ValueError, match="GENERATION_RUNTIME_MODE"):
        settings.validate_runtime()


def test_validate_runtime_rejects_invalid_runtime_specific_postgres_pool_budget():
    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        environment=Environment.STAGING,
        generation_runtime_mode="worker",
        database_url="postgresql://user:pass@db.example.com:5432/studio",
        supabase_url="https://example.supabase.co",
        supabase_anon_key="anon-key",
        supabase_service_role_key="x" * 32,
        redis_url="redis://cache.example.com:6379/0",
        state_store_backend="postgres",
        asset_storage_backend="supabase",
        public_web_base_url="https://studio.example.com",
        public_api_base_url="https://api.example.com",
        postgres_state_store_worker_min_connections=8,
        postgres_state_store_worker_max_connections=4,
    )

    with pytest.raises(ValueError, match="POSTGRES_STATE_STORE_WORKER_MAX_CONNECTIONS"):
        settings.validate_runtime()


def test_reveal_secret_with_audit_reports_secret_name_without_value(monkeypatch):
    import security.logging as security_logging

    captured: list[str] = []

    def fake_audit(secret_name: str) -> None:
        captured.append(secret_name)

    monkeypatch.setattr(security_logging, "audit_secret_revealed", fake_audit)

    value = reveal_secret_with_audit("JWT_SECRET", "super-secret-value")

    assert value == "super-secret-value"
    assert captured == ["JWT_SECRET"]
