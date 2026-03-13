import asyncio
import logging
import sys
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import json

# Add backend to path for imports
sys.path.append(str(Path(__file__).parent))

# Config directory anchored to backend folder
CONFIG_DIR = Path(__file__).parent / 'config'
from api.routes import router as api_router, initialize_dependencies
from providers.manager import ProviderManager, FallbackStrategy
from presets.resolver import PresetResolver
from presets.assets import AssetResolver
from config.env import get_settings, Environment
from api.models import router as models_router
from api.engine_routes import router as engine_router
from providers.base import ProviderConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('backend.log')
    ]
)
logger = logging.getLogger(__name__)

# Global instances
provider_manager: ProviderManager = None
preset_resolver: PresetResolver = None
asset_resolver: AssetResolver = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global provider_manager, preset_resolver, asset_resolver
    
    try:
        logger.info("Starting OmniaCreata Backend...")
        
        # Load settings
        settings = get_settings()
        logger.info(f"Environment: {settings.environment}")
        
        # Initialize Asset Resolver
        logger.info("Initializing Asset Resolver...")
        asset_config = {
            'local': {
                'models': 'C:/AI/models/checkpoints',
                'loras': 'C:/AI/models/loras',
                'vaes': 'C:/AI/models/vae',
                'upscalers': 'C:/AI/models/upscale_models',
                'embeddings': 'C:/AI/models/embeddings',
                'controlnet': 'C:/AI/models/controlnet'
            },
            'huggingface': {
                'cacheDir': 'C:/AI/models/hf_cache',
                'readOnly': True
            }
        }
        asset_resolver = AssetResolver(asset_config)
        
        # Initialize Preset Resolver
        logger.info("Initializing Preset Resolver...")
        preset_resolver = PresetResolver(
            config_path=str(CONFIG_DIR / 'presets.json')
        )
        
        # Initialize Provider Manager
        logger.info("Initializing Provider Manager...")
        provider_manager = ProviderManager()
        # Load providers from JSON config
        with open(CONFIG_DIR / 'providers.json', 'r', encoding='utf-8') as f:
            providers_cfg = json.load(f)

        providers = providers_cfg.get('providers', {})
        for key, p in providers.items():
            if not p.get('enabled', True):
                continue
            name_lower = p.get('name', key).lower()
            # Map API keys from settings
            api_key = None
            if name_lower == 'huggingface':
                api_key = settings.huggingface_token
            elif name_lower == 'gemini':
                api_key = settings.gemini_api_key
            elif name_lower == 'openrouter':
                api_key = settings.openrouter_api_key
            elif name_lower == 'openai':
                api_key = settings.openai_api_key
            elif name_lower == 'stability':
                api_key = settings.stability_api_key

            cfg = ProviderConfig(
                name=name_lower or key,
                base_url=p.get('baseUrl', ''),
                api_key=api_key,
                timeout=int(p.get('timeout', 30)),
                max_retries=int(p.get('retries', 3)),
                rate_limit_per_minute=int(p.get('rateLimit', 60)),
                cost_estimate_per_request=float(p.get('costEstimate', 0.01)),
                priority=int(p.get('priority', 1)),
            )
            provider_manager.add_provider(cfg)

        # Configure fallback strategy
        fallback = providers_cfg.get('fallback', {})
        strategy = fallback.get('strategy')
        if strategy:
            try:
                provider_manager.set_fallback_strategy(FallbackStrategy(strategy))
            except Exception:
                logger.warning(f"Unknown fallback strategy in config: {strategy}")
        
        # Start provider manager
        await provider_manager.start()
        
        # Initialize API dependencies
        initialize_dependencies(provider_manager, preset_resolver, asset_resolver)
        
        logger.info("Backend initialization completed successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Error during startup: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down backend...")
        if provider_manager:
            await provider_manager.stop()
        logger.info("Backend shutdown completed")


# Create FastAPI app
app = FastAPI(
    title="OmniaCreata API",
    description="AI Image Generation Platform with Multi-Provider Support",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Load settings for CORS
settings = get_settings()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted Host Middleware
if settings.environment == Environment.PRODUCTION:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.allowed_hosts
    )

# Include API router
app.include_router(api_router)
app.include_router(models_router, prefix="/v1")
app.include_router(engine_router)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "OmniaCreata API",
        "version": "1.0.0",
        "description": "AI Image Generation Platform",
        "docs": "/docs",
        "health": "/v1/healthz",
        "endpoints": {
            "generate": "/v1/generate",
            "batch_generate": "/v1/generate/batch",
            "presets": "/v1/presets",
            "loras": "/v1/loras",
            "queue": "/v1/queue",
            "usage": "/v1/usage"
        }
    }


# Custom OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="OmniaCreata API",
        version="1.0.0",
        description="""
        # OmniaCreata API
        
        A powerful AI image generation platform with multi-provider support.
        
        ## Features
        
        - **Multi-Provider Support**: ComfyUI, HuggingFace, Gemini, OpenRouter
        - **Preset System**: Realistic, Anime, Ultra quality presets
        - **LoRA Integration**: Dynamic LoRA application based on keywords
        - **Asset Management**: Local and cloud asset resolution
        - **Batch Processing**: Generate multiple images efficiently
        - **Health Monitoring**: Real-time provider health checks
        - **Queue Management**: Track generation progress and queue status
        
        ## Authentication
        
        Currently, the API is open for development. Production deployment will include JWT authentication.
        
        ## Rate Limits
        
        - **Free Tier**: 100 images/day
        - **Pro Tier**: 1000 images/day
        - **Enterprise**: Custom limits
        
        ## Error Handling
        
        The API uses standard HTTP status codes and returns detailed error information in JSON format.
        """,
        routes=app.routes,
    )
    
    # Add custom tags
    openapi_schema["tags"] = [
        {
            "name": "Generation",
            "description": "Image generation endpoints"
        },
        {
            "name": "Presets",
            "description": "Preset management endpoints"
        },
        {
            "name": "Assets",
            "description": "Asset and LoRA management"
        },
        {
            "name": "System",
            "description": "Health, queue, and usage monitoring"
        }
    ]
    
    # Add security schemes (for future JWT implementation)
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "details": [],
            "request_id": None,
            "timestamp": str(asyncio.get_event_loop().time())
        }
    )


# HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "details": [],
            "request_id": None,
            "timestamp": str(asyncio.get_event_loop().time())
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    # Development server
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info"
    )