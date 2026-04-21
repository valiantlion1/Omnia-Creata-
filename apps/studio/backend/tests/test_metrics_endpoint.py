from __future__ import annotations

import re

from fastapi.testclient import TestClient

from main import app


def _ensure_runtime_error_probe_route() -> None:
    if any(getattr(route, "path", None) == "/__tests/runtime-error" for route in app.routes):
        return

    @app.get("/__tests/runtime-error", include_in_schema=False)
    async def _runtime_error_probe():
        raise RuntimeError("metrics probe boom")


_ensure_runtime_error_probe_route()


def test_metrics_endpoint_exposes_prometheus_text():
    with TestClient(app) as client:
        response = client.get("/metrics")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert "# HELP studio_backend_info" in response.text
    assert "studio_backend_info{" in response.text
    assert "studio_http_requests_total" in response.text
    assert "studio_http_request_exceptions_total" in response.text
    assert "studio_circuit_breaker_state" in response.text


def test_metrics_endpoint_reports_version_route_counts():
    with TestClient(app) as client:
        client.get("/v1/version")
        response = client.get("/metrics")

    assert response.status_code == 200
    assert 'studio_http_requests_total{method="GET",path="/v1/version",status="200"}' in response.text
    assert 'studio_http_request_duration_seconds_count{method="GET",path="/v1/version"}' in response.text
    assert "/metrics" not in response.text


def test_metrics_endpoint_records_unhandled_exception_counts():
    with TestClient(app, raise_server_exceptions=False) as client:
        error_response = client.get("/__tests/runtime-error")
        metrics_response = client.get("/metrics")

    assert error_response.status_code == 500

    exception_match = re.search(
        r'studio_http_request_exceptions_total\{method="GET",path="/__tests/runtime-error",exception_type="RuntimeError"\} (\d+)',
        metrics_response.text,
    )
    request_match = re.search(
        r'studio_http_requests_total\{method="GET",path="/__tests/runtime-error",status="500"\} (\d+)',
        metrics_response.text,
    )

    assert exception_match is not None
    assert int(exception_match.group(1)) >= 1
    assert request_match is not None
    assert int(request_match.group(1)) >= 1
