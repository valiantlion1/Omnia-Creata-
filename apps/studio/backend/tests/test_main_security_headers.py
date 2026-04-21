from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from config.env import Environment, Settings
from main import _requires_no_store_headers, _should_enforce_trusted_hosts, app, settings
from observability.context import current_request_id


def _ensure_runtime_error_probe_route() -> None:
    if any(getattr(route, "path", None) == "/__tests/runtime-error" for route in app.routes):
        return

    @app.get("/__tests/runtime-error", include_in_schema=False)
    async def _runtime_error_probe():
        raise RuntimeError("security headers probe boom")


_ensure_runtime_error_probe_route()


def _ensure_request_context_probe_route() -> None:
    if any(getattr(route, "path", None) == "/__tests/request-context" for route in app.routes):
        return

    @app.get("/__tests/request-context", include_in_schema=False)
    async def _request_context_probe():
        return {"request_id": current_request_id()}


_ensure_request_context_probe_route()


@pytest.fixture()
def _restore_security_header_settings():
    original_environment = settings.environment
    original_enable_api_docs = settings.enable_api_docs
    try:
        yield
    finally:
        settings.environment = original_environment
        settings.enable_api_docs = original_enable_api_docs


def test_api_responses_emit_locked_csp_when_docs_are_disabled(_restore_security_header_settings):
    settings.environment = Environment.DEVELOPMENT
    settings.enable_api_docs = False

    with TestClient(app) as client:
        response = client.get("/v1/version")

    assert response.status_code == 200
    assert response.headers["Content-Security-Policy"] == (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )
    assert response.headers["Cross-Origin-Opener-Policy"] == "same-origin"
    assert "payment=()" in response.headers["Permissions-Policy"]
    assert "fullscreen=(self)" in response.headers["Permissions-Policy"]
    assert response.headers["X-Request-ID"]
    assert response.headers["X-Response-Time"].endswith("s")


def test_api_responses_emit_hsts_for_staging(_restore_security_header_settings):
    settings.environment = Environment.STAGING
    settings.enable_api_docs = False

    with TestClient(app) as client:
        response = client.get("/v1/version")

    assert response.status_code == 200
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"


def test_trusted_hosts_are_required_for_staging_and_production():
    assert _should_enforce_trusted_hosts(Settings(_env_file=None, jwt_secret="x" * 32)) is False
    assert _should_enforce_trusted_hosts(
        Settings(
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
    ) is True


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        ("/v1/auth/me", True),
        ("/v1/settings/bootstrap", True),
        ("/v1/billing/summary", True),
        ("/v1/owner/health", True),
        ("/v1/healthz/detail", True),
        ("/v1/profiles/me/export", True),
        ("/v1/projects/project-1/export", True),
        ("/v1/assets/asset-1/content", True),
        ("/v1/assets/asset-1/thumbnail", True),
        ("/v1/assets/asset-1/preview", True),
        ("/v1/assets/asset-1/blocked-preview", True),
        ("/v1/assets/asset-1/clean-export", True),
        ("/v1/version", False),
        ("/v1/healthz", False),
        ("/v1/public/export", False),
    ],
)
def test_requires_no_store_headers_only_for_sensitive_routes(path: str, expected: bool):
    assert _requires_no_store_headers(path) is expected


def test_auth_route_responses_emit_no_store_headers(_restore_security_header_settings):
    settings.environment = Environment.DEVELOPMENT
    settings.enable_api_docs = False

    with TestClient(app) as client:
        response = client.get("/v1/auth/me")

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store, private"
    assert response.headers["Pragma"] == "no-cache"


def test_public_share_route_responses_emit_no_store_headers(_restore_security_header_settings):
    settings.environment = Environment.DEVELOPMENT
    settings.enable_api_docs = False

    with TestClient(app) as client:
        response = client.get("/v1/shares/public/missing-share-token")

    assert response.status_code == 404
    assert response.headers["Cache-Control"] == "no-store, private"
    assert response.headers["Pragma"] == "no-cache"


def test_asset_delivery_route_responses_emit_no_store_headers(_restore_security_header_settings):
    settings.environment = Environment.DEVELOPMENT
    settings.enable_api_docs = False

    with TestClient(app) as client:
        response = client.get("/v1/assets/asset-1/content?token=abcdefghijklmnop")

    assert response.status_code in {403, 404}
    assert response.headers["Cache-Control"] == "no-store, private"
    assert response.headers["Pragma"] == "no-cache"


def test_unhandled_error_responses_keep_trace_and_security_headers(_restore_security_header_settings):
    settings.environment = Environment.DEVELOPMENT
    settings.enable_api_docs = False

    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/__tests/runtime-error")

    assert response.status_code == 500
    body = response.json()
    assert body["error"] == "A server error occurred. Our team has been notified."
    assert response.headers["X-Request-ID"] == body["request_id"]
    assert response.headers["X-Response-Time"].endswith("s")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["Content-Security-Policy"] == (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
    )


def test_request_context_middleware_binds_request_id_contextvar(_restore_security_header_settings):
    settings.environment = Environment.DEVELOPMENT
    settings.enable_api_docs = False

    with TestClient(app) as client:
        response = client.get(
            "/__tests/request-context",
            headers={"X-Request-ID": "studio-context-test-1234"},
        )

    assert response.status_code == 200
    assert response.json()["request_id"] == "studio-context-test-1234"
    assert response.headers["X-Request-ID"] == "studio-context-test-1234"
