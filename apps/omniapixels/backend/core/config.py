from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./omniapixels.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # MinIO S3
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_SECURE: bool = False
    MINIO_BUCKET: str = "omniapixels"

    # API
    APP_VERSION: str = "1.0.0"
    ENV: str = "development"
    ALLOWED_ORIGINS: list = ["http://localhost:3000", "http://localhost:8001", "http://localhost:8080"]

    # File Upload
    FILE_UPLOAD_MAX_MB: int = 50
    PRESIGN_EXPIRES_SEC: int = 3600

    # JWT (legacy, kept for local fallback)
    JWT_SECRET_KEY: str = "omnia-creata-local-dev-secret-2026-please-change-this-okey:D"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    # Admin emails (comma-separated)
    ADMIN_EMAILS: str = "alierdincyigitaslan@gmail.com,ghostsofter12@gmail.com"

    @property
    def ADMIN_EMAILS_LIST(self) -> List[str]:
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
