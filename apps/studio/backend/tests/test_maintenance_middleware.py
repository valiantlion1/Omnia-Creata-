from __future__ import annotations

import importlib
import sys
from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from security.maintenance import (
    DEFAULT_MAINTENANCE_MESSAGE,
    DEFAULT_RETRY_AFTER_SECONDS,
    MaintenanceMiddleware,
    load_maintenance_config,
)


MAINTENANCE_ENV_KEYS = (
    "MAINTENANCE_MODE",
    "MAINTENANCE_MESSAGE",
    "MAINTENANCE_RETRY_AFTER_SECONDS",
    "MAINTENANCE_OVERRIDE_TOKEN",
)


def _set_maintenance_env(
    monkeypatch: pytest.MonkeyPatch,
    *,
    enabled: str | None = None,
    message: str | None = None,
    retry_after_seconds: str | None = None,
    override_token: str | None = None,
) -> None:
    values = {
        "MAINTENANCE_MODE": enabled,
        "MAINTENANCE_MESSAGE": message,
        "MAINTENANCE_RETRY_AFTER_SECONDS": retry_after_seconds,
        "MAINTENANCE_OVERRIDE_TOKEN": override_token,
    }
    for key, value in values.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)


def _build_test_app(
    monkeypatch: pytest.MonkeyPatch,
    *,
    enabled: str | None = None,
    message: str | None = None,
    retry_after_seconds: str | None = None,
    override_token: str | None = None,
) -> tuple[FastAPI, object]:
    _set_maintenance_env(
        monkeypatch,
        enabled=enabled,
        message=message,
        retry_after_seconds=retry_after_seconds,
        override_token=override_token,
    )

    app = FastAPI()
    config = load_maintenance_config()
    if config.enabled or config.override_token:
        app.add_middleware(MaintenanceMiddleware, config=config)

    @app.get("/")
    async def root():
        return {"status": "ok"}

    @app.get("/v1/version")
    async def version():
        return {"version": "test"}

    @app.get("/v1/healthz")
    async def healthz():
        return {"status": "healthy"}

    @app.get("/v1/healthz/detail")
    async def healthz_detail():
        return {"status": "healthy", "detail": True}

    @app.get("/v1/healthz/ready")
    async def healthz_ready():
        return {"status": "ready", "ready": True}

    @app.get("/v1/healthz/startup")
    async def healthz_startup():
        return {"status": "started", "started": True}

    @app.post("/v1/auth/login")
    async def login():
        return JSONResponse(status_code=401, content={"detail": "Invalid login credentials"})

    return app, config


async def _request(
    app: FastAPI,
    method: str,
    path: str,
    *,
    headers: dict[str, str] | None = None,
) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        return await client.request(method, path, headers=headers)


def _load_main_module(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
    *,
    enabled: str | None = None,
    override_token: str | None = None,
):
    _set_maintenance_env(
        monkeypatch,
        enabled=enabled,
        override_token=override_token,
    )
    monkeypatch.setenv("JWT_SECRET", "x" * 32)
    monkeypatch.setenv("STUDIO_RUNTIME_ROOT", str((tmp_path / "runtime").resolve()))
    monkeypatch.setenv("STUDIO_LOG_DIRECTORY", str((tmp_path / "logs").resolve()))
    runtime_logging_module = importlib.import_module("runtime_logging")
    monkeypatch.setattr(runtime_logging_module, "configure_runtime_logging", lambda settings: settings.log_directory_path)

    env_module = sys.modules.get("config.env")
    if env_module is None:
        importlib.import_module("config.env")
    else:
        importlib.reload(env_module)

    sys.modules.pop("main", None)
    return importlib.import_module("main")


@pytest.mark.asyncio
async def test_maintenance_middleware_disabled_keeps_login_route_on_normal_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch)

    response = await _request(app, "POST", "/v1/auth/login")

    assert response.status_code == 401
    assert response.status_code != 503


@pytest.mark.asyncio
async def test_maintenance_middleware_enabled_blocks_login_with_retry_headers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch, enabled="true")

    response = await _request(app, "POST", "/v1/auth/login")

    assert response.status_code == 503
    assert response.headers["Retry-After"] == "120"
    assert response.headers["Cache-Control"] == "no-store, private"
    assert response.json() == {
        "error": "maintenance",
        "message": DEFAULT_MAINTENANCE_MESSAGE,
        "retry_after_seconds": DEFAULT_RETRY_AFTER_SECONDS,
    }


@pytest.mark.asyncio
async def test_maintenance_middleware_enabled_bypasses_healthz(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch, enabled="true")

    response = await _request(app, "GET", "/v1/healthz")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


@pytest.mark.asyncio
async def test_maintenance_middleware_enabled_bypasses_healthz_ready_and_startup(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch, enabled="true")

    ready_response = await _request(app, "GET", "/v1/healthz/ready")
    startup_response = await _request(app, "GET", "/v1/healthz/startup")

    assert ready_response.status_code == 200
    assert ready_response.json() == {"status": "ready", "ready": True}
    assert startup_response.status_code == 200
    assert startup_response.json() == {"status": "started", "started": True}


@pytest.mark.asyncio
async def test_maintenance_middleware_enabled_bypasses_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch, enabled="true")

    response = await _request(app, "GET", "/v1/version")

    assert response.status_code == 200
    assert response.json() == {"version": "test"}


@pytest.mark.asyncio
async def test_maintenance_middleware_enabled_bypasses_root(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch, enabled="true")

    response = await _request(app, "GET", "/")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_maintenance_middleware_override_header_allows_normal_response(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch, enabled="true", override_token="secret-token")

    response = await _request(
        app,
        "POST",
        "/v1/auth/login",
        headers={"X-Maintenance-Override": "secret-token"},
    )

    assert response.status_code == 401
    assert response.status_code != 503


@pytest.mark.asyncio
async def test_maintenance_middleware_wrong_override_header_stays_blocked(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, _ = _build_test_app(monkeypatch, enabled="true", override_token="secret-token")

    response = await _request(
        app,
        "POST",
        "/v1/auth/login",
        headers={"X-Maintenance-Override": "wrong-token"},
    )

    assert response.status_code == 503
    assert response.json()["error"] == "maintenance"


@pytest.mark.asyncio
async def test_maintenance_middleware_accepts_zero_retry_after_when_configured(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, config = _build_test_app(monkeypatch, enabled="true", retry_after_seconds="0")

    response = await _request(app, "POST", "/v1/auth/login")

    assert config.retry_after_seconds == 0
    assert response.status_code == 503
    assert response.headers["Retry-After"] == "0"
    assert response.json()["retry_after_seconds"] == 0


@pytest.mark.parametrize("raw_value", ["abc", "-1"])
def test_load_maintenance_config_defaults_retry_after_when_invalid(
    monkeypatch: pytest.MonkeyPatch,
    raw_value: str,
) -> None:
    _set_maintenance_env(monkeypatch, retry_after_seconds=raw_value)

    config = load_maintenance_config()

    assert config.retry_after_seconds == DEFAULT_RETRY_AFTER_SECONDS


def test_main_registers_maintenance_middleware_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    main_module = _load_main_module(monkeypatch, tmp_path, enabled="true")

    assert any(layer.cls is MaintenanceMiddleware for layer in main_module.app.user_middleware)


def test_main_registers_maintenance_middleware_when_override_token_is_configured(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    main_module = _load_main_module(monkeypatch, tmp_path, override_token="secret-token")

    assert any(layer.cls is MaintenanceMiddleware for layer in main_module.app.user_middleware)


def test_main_skips_maintenance_middleware_when_disabled_and_no_override(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    main_module = _load_main_module(monkeypatch, tmp_path)

    assert all(layer.cls is not MaintenanceMiddleware for layer in main_module.app.user_middleware)
