import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from config.env import Environment, get_settings
from security.auth import AuthConfig, setup_auth
from security.rate_limit import build_rate_limiter
from studio_platform.providers import ProviderRegistry
from studio_platform.router import create_router
from studio_platform.service import StudioService
from studio_platform.store import build_state_store
from studio_platform.versioning import STUDIO_API_VERSION, load_version_info


BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
LEGACY_STATE_PATH = DATA_DIR / "studio-state.json"
SQLITE_STATE_PATH = DATA_DIR / "studio-state.sqlite3"


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("omnia.studio")


settings = get_settings()
version_info = load_version_info()
state_store = build_state_store(
    settings,
    default_json_path=LEGACY_STATE_PATH,
    default_sqlite_path=SQLITE_STATE_PATH,
)
providers = ProviderRegistry()
service = StudioService(state_store, providers, MEDIA_DIR)
rate_limiter = build_rate_limiter(settings)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_auth(
        AuthConfig(
            secret_key=settings.jwt_secret or "",
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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=settings.cors_allow_headers_list,
    expose_headers=["Retry-After", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)

if settings.environment == Environment.PRODUCTION:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts_list)

MEDIA_DIR.mkdir(parents=True, exist_ok=True)

app.include_router(create_router(service, rate_limiter))


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cross-Origin-Resource-Policy", "same-site")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


@app.get("/")
async def root():
    return {
        "name": "OmniaCreata Studio API",
        "version": version_info.version,
        "build": version_info.build,
        "api_version": STUDIO_API_VERSION,
        "channel": version_info.channel,
        "status": version_info.status,
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
    return version_info.to_public_payload()


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


@app.exception_handler(Exception)
async def global_exception_handler(_, exc: Exception):
    logger.error(f"Unhandled backend exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "A server error occurred. Our team has been notified."},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )
