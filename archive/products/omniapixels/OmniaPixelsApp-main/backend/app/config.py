from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

# Resolve env file relative to project root (../.. from backend/app)
_ENV_PATH = (Path(__file__).resolve().parents[2] / "ops" / "env" / ".env")


class Settings(BaseSettings):
    # App settings
    APP_ENV: str = "dev"
    API_BASE_URL: str = "http://localhost:8000"
    
    # Database: default to local SQLite for ease of local runs; Docker overrides via .env
    DATABASE_URL: str = "sqlite:///./omniapixels.db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # MinIO/S3
    MINIO_ENDPOINT: str = "minio:9000"
    MINIO_ACCESS_KEY: str = "miniokey"
    MINIO_SECRET_KEY: str = "miniosecret"
    MINIO_BUCKET: str = "omniapixels"
    MINIO_SECURE: bool = False
    # Public endpoint to rewrite presigned URLs for external access (e.g., http://localhost:9000)
    MINIO_PUBLIC_ENDPOINT: Optional[str] = "http://localhost:9000"
    
    # JWT
    JWT_SECRET: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Cost shield
    COST_SHIELD: bool = True

    # Sprint-2: Credit & Ads config
    DAILY_FREE_CREDITS: int = 5
    AD_REWARD_CREDITS: int = 3
    ADS_ENABLED: bool = True
    ADS_TEST_MODE: bool = True
    
    # Local/MinIO storage selection (Sprint-3)
    STORAGE_KIND: str = "local"  # 'local' or 'minio'
    LOCAL_STORAGE_DIR: str = "local_storage"
    # Queue mode selection
    QUEUE_MODE: str = "local"  # 'local' or 'rq'
    class Config:
        env_file = str(_ENV_PATH) if _ENV_PATH.exists() else None


settings = Settings()
