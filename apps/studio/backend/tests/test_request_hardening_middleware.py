from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from security.ingress import IngressLimitMiddleware, resolve_request_id


def _build_test_app(*, max_header_bytes: int = 16 * 1024, max_body_bytes: int = 1024) -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        IngressLimitMiddleware,
        max_header_bytes=max_header_bytes,
        max_body_bytes=max_body_bytes,
    )

    @app.middleware("http")
    async def request_context_middleware(request: Request, call_next):
        request_id = resolve_request_id(request.headers.get("X-Request-ID"))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers.setdefault("X-Request-ID", request_id)
        response.headers.setdefault("X-Response-Time", "0.001s")
        return response

    @app.post("/echo")
    async def echo(request: Request):
        body = await request.body()
        return {
            "request_id": request.state.request_id,
            "size": len(body),
        }

    return app


def test_request_hardening_middleware_preserves_safe_request_id():
    app = _build_test_app()

    with TestClient(app) as client:
        response = client.post("/echo", headers={"X-Request-ID": "studio-test-request-1234"}, content=b"ok")

    assert response.status_code == 200
    assert response.json()["request_id"] == "studio-test-request-1234"
    assert response.headers["X-Request-ID"] == "studio-test-request-1234"


def test_request_hardening_middleware_replaces_invalid_request_id():
    app = _build_test_app()

    with TestClient(app) as client:
        response = client.post("/echo", headers={"X-Request-ID": "bad id with spaces"}, content=b"ok")

    request_id = response.json()["request_id"]
    assert response.status_code == 200
    assert request_id != "bad id with spaces"
    assert response.headers["X-Request-ID"] == request_id
    assert len(request_id) >= 8


def test_request_hardening_middleware_rejects_large_headers():
    app = _build_test_app(max_header_bytes=128)

    with TestClient(app) as client:
        response = client.post("/echo", headers={"X-Fill": "a" * 256}, content=b"ok")

    assert response.status_code == 431
    assert response.json()["error"] == "Request headers too large."
    assert response.headers["X-Request-ID"]


def test_request_hardening_middleware_rejects_large_bodies():
    app = _build_test_app(max_body_bytes=16)

    with TestClient(app) as client:
        response = client.post("/echo", content=b"x" * 17)

    assert response.status_code == 413
    assert response.json()["error"] == "Request body too large."
    assert response.headers["X-Request-ID"]
