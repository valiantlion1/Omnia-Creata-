from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import time
import traceback
from api.routes import router
from auth.routes import router as auth_router
from core.config import settings
from core.database import engine
from core.queue import redis_client
from storage.s3 import s3_client

app = FastAPI(
    title="OmniaPixels API",
    description="AI-powered image processing platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Include routers
app.include_router(router, prefix="/v1")
app.include_router(auth_router, prefix="/auth")

@app.get("/")
def root():
    return {
        "message": "Welcome to OmniaPixels API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
def health():
    """Production-ready health check with dependency validation"""
    health_status = {
        "status": "ok",
        "timestamp": int(time.time()),
        "version": settings.APP_VERSION,
        "environment": settings.ENV,
        "services": {}
    }
    
    # Check database
    try:
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        redis_client.ping()
        health_status["services"]["redis"] = "healthy"
    except Exception as e:
        health_status["services"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check MinIO
    try:
        s3_client.list_buckets()
        health_status["services"]["minio"] = "healthy"
    except Exception as e:
        health_status["services"]["minio"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status

# Production Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with detailed logging"""
    logging.error(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": int(time.time()),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    logging.error(f"Validation error: {exc.errors()} - Path: {request.url.path}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation failed",
            "details": exc.errors(),
            "timestamp": int(time.time()),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    error_id = f"err_{int(time.time())}"
    logging.error(f"Unexpected error [{error_id}]: {str(exc)}\n{traceback.format_exc()}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "error_id": error_id,
            "timestamp": int(time.time()),
            "path": str(request.url.path)
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logging.info("OmniaPixels API starting up...")
    logging.info(f"Environment: {settings.ENV}")
    logging.info(f"Version: {settings.APP_VERSION}")

# Shutdown event  
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logging.info("OmniaPixels API shutting down...")

@app.get("/version")
def version():
    return {"version": settings.APP_VERSION, "env": settings.ENV}
