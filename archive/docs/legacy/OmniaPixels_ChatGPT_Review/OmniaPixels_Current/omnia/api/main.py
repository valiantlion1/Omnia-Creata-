from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from core.config import settings

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
app.include_router(router, prefix="/v1")

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
    return {"status": "ok"}

@app.get("/version")
def version():
    return {"version": settings.APP_VERSION, "env": settings.ENV}
