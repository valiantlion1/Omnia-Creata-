"""Studio backend FastAPI entrypoint.

**Purpose:** Wire up every singleton the app needs — state store, providers,
service orchestrator, rate limiter, metrics collector — and expose the HTTP
surface (router, middlewares, health probes, metrics endpoint).

**Bootstrap order (do not reorder without testing):**
    1. :mod:`runtime_logging` — configure log handlers/levels.
    2. :func:`build_state_store` — pick JSON/SQLite/Postgres backend.
    3. :class:`ProviderRegistry` — assemble upstream generation clients.
    4. :class:`StudioService` — orchestrator (calls back into store/providers).
    5. Rate limiter + metrics collector.
    6. FastAPI app creation, middleware registration, router mounting.
    7. ``lifespan`` context — ``setup_auth``, ``rate_limiter.initialize``,
       ``service.initialize`` (in that order).

**Middleware order (outermost first when a request comes in):**
    - CORSMiddleware (cross-origin handling)
    - MaintenanceMiddleware (503 when maintenance flag is on)
    - TrustedHostMiddleware (staging/prod only)
    - IngressLimitMiddleware (body size caps, request ID resolution)
    - Request logging / timing (in ``@app.middleware``)

**Why everything is module-level:** FastAPI builds the app once at import
time. Keeping singletons at the module level (rather than inside a factory)
matches the uvicorn ``main:app`` reload model and avoids re-initialising
expensive objects on every worker boot.

**AI-maintainer note:** If you need a new singleton, add it next to the
existing ones (``state_store``, ``providers``, ``service``) and initialise
it inside ``lifespan`` if it has async setup. Do not hide lifecycle inside
:class:`StudioService`; keep startup ordering visible here.
"""

import logging
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response

from config.env import Environment, get_settings, reveal_secret_with_audit
from config.feature_flags import FEATURE_FLAGS, FLAG_STRICT_STARTUP_VALIDATION
from observability.context import (
    bind_identity_id,
    bind_request_id,
    reset_identity_id,
    reset_request_id,
)
from observability.metrics import PrometheusMetricsCollector
from security.auth import AuthConfig, setup_auth
from security.auth_policy import validate_route_policy_coverage
from security.ingress import IngressLimitMiddleware, resolve_request_id
from security.maintenance import MaintenanceMiddleware, load_maintenance_config
from security.rate_limit import build_rate_limiter
from security.response_headers import requires_no_store_headers as _requires_no_store_headers
from runtime_logging import configure_runtime_logging
from studio_platform.providers import ProviderRegistry
from studio_platform.router import create_router
from studio_platform.service import StudioService
from studio_platform.store import StoreUnavailable, build_state_store
from studio_platform.versioning import STUDIO_API_VERSION, build_runtime_version_payload, load_version_info


BASE_DIR = Path(__file__).parent
settings = get_settings()
LEGACY_DATA_DIR = BASE_DIR / "data"
RUNTIME_DATA_DIR = settings.runtime_root_path / "data"
MEDIA_DIR = LEGACY_DATA_DIR / "media"
LEGACY_STATE_PATH = LEGACY_DATA_DIR / "studio-state.json"
LEGACY_SQLITE_STATE_PATH = LEGACY_DATA_DIR / "studio-state.sqlite3"
SQLITE_STATE_PATH = RUNTIME_DATA_DIR / "studio-state.sqlite3"


configure_runtime_logging(settings)
logger = logging.getLogger("omnia.studio")
boot_version_info = load_version_info()
process_booted_at = datetime.now(timezone.utc).isoformat()
state_store = build_state_store(
    settings,
    default_json_path=LEGACY_STATE_PATH,
    default_sqlite_path=SQLITE_STATE_PATH,
    default_legacy_sqlite_path=LEGACY_SQLITE_STATE_PATH,
)
providers = ProviderRegistry()
service = StudioService(state_store, providers, MEDIA_DIR)
rate_limiter = build_rate_limiter(settings)
metrics_collector = PrometheusMetricsCollector()


def _should_enforce_trusted_hosts(current_settings) -> bool:
    return current_settings.environment in {Environment.STAGING, Environment.PRODUCTION} and bool(
        current_settings.allowed_hosts_list
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_route_policy_coverage(app)
    try:
        runtime_warnings = settings.validate_runtime()
    except ValueError as exc:
        if FEATURE_FLAGS.is_enabled(FLAG_STRICT_STARTUP_VALIDATION):
            raise RuntimeError(f"Studio runtime validation failed: {exc}") from exc
        logger.warning("Studio runtime validation warning: %s", exc)
        runtime_warnings = []
    for warning in runtime_warnings:
        logger.warning("Studio runtime validation warning: %s", warning)
    setup_auth(
        AuthConfig(
            secret_key=reveal_secret_with_audit("JWT_SECRET", settings.jwt_secret),
            algorithm=settings.jwt_algorithm,
        )
    )
    await rate_limiter.initialize()
    await service.initialize()
    app.state.studio_service = service
    app.state.rate_limiter = rate_limiter
    logger.info("OmniaCreata Studio backend ready")
    yield
    await service.shutdown()
    logger.info("OmniaCreata Studio backend stopped")


app = FastAPI(
    title="OmniaCreata Studio API",
    description="Creative production backend for OmniaCreata Studio.",
    version=STUDIO_API_VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.enable_api_docs else None,
    redoc_url="/redoc" if settings.enable_api_docs else None,
    openapi_url="/openapi.json" if settings.enable_api_docs else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=settings.cors_allow_headers_list,
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

maintenance_config = load_maintenance_config()
if maintenance_config.enabled or maintenance_config.override_token:
    app.add_middleware(MaintenanceMiddleware, config=maintenance_config)

if _should_enforce_trusted_hosts(settings):
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)

app.add_middleware(
    IngressLimitMiddleware,
    max_header_bytes=settings.max_request_header_bytes,
    max_body_bytes=settings.max_request_body_bytes,
)

MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app.include_router(create_router(service, rate_limiter))


def _apply_security_headers(response: Response, *, request_path: str) -> None:
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), "
        "accelerometer=(), gyroscope=(), fullscreen=(self), "
        "clipboard-read=(self), clipboard-write=(self)",
    )
    if settings.environment in {Environment.STAGING, Environment.PRODUCTION}:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    if not settings.enable_api_docs:
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
        )
    if _requires_no_store_headers(request_path):
        response.headers.setdefault("Cache-Control", "no-store, private")
        response.headers.setdefault("Pragma", "no-cache")


def _apply_request_context_headers(
    response: Response,
    *,
    request_id: str | None,
    duration_seconds: float | None = None,
) -> None:
    if request_id:
        response.headers.setdefault("X-Request-ID", request_id)
    if duration_seconds is not None:
        response.headers.setdefault("X-Response-Time", f"{duration_seconds:.3f}s")


def _request_duration_seconds(request: Request) -> float | None:
    started_at = getattr(request.state, "request_started_at", None)
    if isinstance(started_at, (float, int)):
        return max(0.0, time.perf_counter() - float(started_at))
    return None


def _path_label_for_request(request: Request) -> str:
    route_path = getattr(request.scope.get("route"), "path", None)
    return metrics_collector.route_label(request.url.path, route_path)


def _log_completed_request(request: Request, *, request_id: str | None, status_code: int, duration_seconds: float) -> None:
    if request.url.path in {"/docs", "/openapi.json", "/redoc", "/metrics"}:
        return
    duration_ms = int(duration_seconds * 1000)
    client_ip = request.client.host if request.client else "unknown"
    logger.info(
        "request_completed request_id=%s method=%s path=%s status=%s duration_ms=%s client_ip=%s",
        request_id or "unknown",
        request.method,
        request.url.path,
        status_code,
        duration_ms,
        client_ip,
    )


def _build_internal_error_response(request: Request, exc: Exception) -> JSONResponse:
    logger.error("Unhandled backend exception: %s", exc)
    payload = {"error": "A server error occurred. Our team has been notified."}
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        payload["request_id"] = request_id
    response = JSONResponse(status_code=500, content=payload)
    duration_seconds = _request_duration_seconds(request)
    _apply_request_context_headers(response, request_id=request_id, duration_seconds=duration_seconds)
    _apply_security_headers(response, request_path=request.url.path)
    return response


def _collect_circuit_breaker_snapshots() -> dict[str, object]:
    broker_breaker = None
    if service.generation_broker is not None:
        describe_generation_broker_breaker = getattr(
            service.generation_broker,
            "describe_circuit_breaker",
            None,
        )
        if callable(describe_generation_broker_breaker):
            broker_breaker = describe_generation_broker_breaker()
    return {
        "generation_broker": broker_breaker,
        "providers": service.providers.describe_circuit_breakers(),
        "postgres_pool": service.store.describe_circuit_breaker(),
    }


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    request_id = resolve_request_id(request.headers.get("X-Request-ID"))
    request.state.request_id = request_id
    request_id_token = bind_request_id(request_id)
    identity_id_token = bind_identity_id("")
    request.state.request_started_at = time.perf_counter()
    started_at = float(request.state.request_started_at)
    metrics_collector.request_started()
    try:
        try:
            response = await call_next(request)
        except Exception as exc:  # pragma: no cover - exercised via TestClient runtime behavior
            path_label = _path_label_for_request(request)
            if path_label != "/metrics":
                metrics_collector.record_exception(
                    method=request.method,
                    path=path_label,
                    exception_type=exc.__class__.__name__,
                )
            response = _build_internal_error_response(request, exc)
    finally:
        metrics_collector.request_finished()
        reset_identity_id(identity_id_token)
        reset_request_id(request_id_token)
    duration_seconds = time.perf_counter() - started_at
    path_label = _path_label_for_request(request)
    if path_label != "/metrics":
        metrics_collector.record_request(
            method=request.method,
            path=path_label,
            status_code=response.status_code,
            duration_seconds=duration_seconds,
        )
    _apply_request_context_headers(response, request_id=request_id, duration_seconds=duration_seconds)
    _log_completed_request(
        request,
        request_id=request_id,
        status_code=response.status_code,
        duration_seconds=duration_seconds,
    )
    return response


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    _apply_security_headers(response, request_path=request.url.path)
    return response


@app.get("/")
async def root():
    version_payload = build_runtime_version_payload(
        boot_build=boot_version_info.build,
        booted_at=process_booted_at,
    )
    return {
        "name": "OmniaCreata Studio API",
        "version": version_payload["version"],
        "build": version_payload["build"],
        "boot_build": version_payload.get("bootBuild"),
        "booted_at": version_payload.get("bootedAt"),
        "api_version": STUDIO_API_VERSION,
        "channel": version_payload["channel"],
        "status": version_payload["status"],
        "docs": "/docs" if settings.enable_api_docs else None,
        "health": "/v1/healthz",
        "app": "studio.omniacreata.com",
        "endpoints": {
            "auth_me": "/v1/auth/me",
            "projects": "/v1/projects",
            "conversations": "/v1/conversations",
            "generations": "/v1/generations",
            "assets": "/v1/assets",
            "billing": "/v1/billing/summary",
        },
    }


@app.get("/v1/version")
async def get_version():
    return build_runtime_version_payload(
        boot_build=boot_version_info.build,
        booted_at=process_booted_at,
    )


if settings.enable_metrics_endpoint:
    @app.get("/metrics", include_in_schema=False)
    async def get_metrics():
        version_payload = build_runtime_version_payload(
            boot_build=boot_version_info.build,
            booted_at=process_booted_at,
        )
        return PlainTextResponse(
            metrics_collector.render(
                version=version_payload["version"],
                build=version_payload["build"],
                channel=version_payload["channel"],
                status=version_payload["status"],
                circuit_breakers=_collect_circuit_breaker_snapshots(),
            ),
            media_type="text/plain; version=0.0.4",
        )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    payload = {"error": exc.detail}
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        payload["request_id"] = request_id
    response = JSONResponse(status_code=exc.status_code, content=payload)
    _apply_request_context_headers(
        response,
        request_id=request_id,
        duration_seconds=_request_duration_seconds(request),
    )
    _apply_security_headers(response, request_path=request.url.path)
    return response


@app.exception_handler(StoreUnavailable)
async def store_unavailable_exception_handler(request: Request, exc: StoreUnavailable):
    payload = {"error": str(exc)}
    request_id = getattr(request.state, "request_id", None)
    if request_id:
        payload["request_id"] = request_id
    response = JSONResponse(status_code=503, content=payload)
    _apply_request_context_headers(
        response,
        request_id=request_id,
        duration_seconds=_request_duration_seconds(request),
    )
    _apply_security_headers(response, request_path=request.url.path)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return _build_internal_error_response(request, exc)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )
