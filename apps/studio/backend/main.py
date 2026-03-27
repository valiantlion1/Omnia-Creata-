import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from config.env import Environment, get_settings
from security.auth import setup_auth
from studio_platform.providers import ProviderRegistry
from studio_platform.router import create_router
from studio_platform.service import StudioService
from studio_platform.store import StudioStateStore


BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
STATE_PATH = DATA_DIR / "studio-state.json"


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("omnia.studio")


state_store = StudioStateStore(STATE_PATH)
providers = ProviderRegistry()
service = StudioService(state_store, providers, MEDIA_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_auth()
    await service.initialize()
    app.state.studio_service = service
    logger.info("OmniaCreata Studio backend ready")
    yield
    logger.info("OmniaCreata Studio backend stopped")


app = FastAPI(
    title="OmniaCreata Studio API",
    description="Creative production backend for OmniaCreata Studio.",
    version="2.0.0",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

if settings.environment == Environment.PRODUCTION:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=getattr(settings, "allowed_hosts", ["studio.omniacreata.com"]))

MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

app.include_router(create_router(service))


@app.get("/")
async def root():
    return {
        "name": "OmniaCreata Studio API",
        "version": "2.0.0",
        "docs": "/docs",
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


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


@app.exception_handler(Exception)
async def global_exception_handler(_, exc: Exception):
    logger.exception("Unhandled backend exception", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"},
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
