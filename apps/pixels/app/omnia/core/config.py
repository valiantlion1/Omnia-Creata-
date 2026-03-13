from pydantic_settings import BaseSettings
from pydantic import Field
from typing import List

class Settings(BaseSettings):
    POSTGRES_URL: str = Field("postgresql://postgres:postgres@localhost:5432/postgres", env="POSTGRES_URL")
    REDIS_URL: str = Field("redis://localhost:6379/0", env="REDIS_URL")
    MINIO_ENDPOINT: str = Field("localhost:9000", env="MINIO_ENDPOINT")
    MINIO_ACCESS_KEY: str = Field("minioadmin", env="MINIO_ACCESS_KEY")
    MINIO_SECRET_KEY: str = Field("minioadmin", env="MINIO_SECRET_KEY")
    MINIO_BUCKET: str = Field("omnia-bucket", env="MINIO_BUCKET")
    S3_REGION: str = Field("us-east-1", env="S3_REGION")
    FILE_UPLOAD_MAX_MB: int = Field(20, env="FILE_UPLOAD_MAX_MB")
    PRESIGN_EXPIRES_SEC: int = Field(3600, env="PRESIGN_EXPIRES_SEC")
    RATE_LIMIT_RPM: int = Field(60, env="RATE_LIMIT_RPM")
    ALLOWED_ORIGINS: List[str] = Field(["*"], env="ALLOWED_ORIGINS")
    APP_VERSION: str = Field("0.1.0", env="APP_VERSION")
    ENV: str = Field("dev", env="ENV")

settings = Settings()
