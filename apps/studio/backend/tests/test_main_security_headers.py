from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from config.env import Environment
from main import _requires_no_store_headers, app, settings


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


def test_api_responses_emit_hsts_for_staging(_restore_security_header_settings):
    settings.environment = Environment.STAGING
    settings.enable_api_docs = False

    with TestClient(app) as client:
        response = client.get("/v1/version")

    assert response.status_code == 200
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"


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
