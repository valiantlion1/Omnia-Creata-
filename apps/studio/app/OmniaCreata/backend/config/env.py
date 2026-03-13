"""Environment configuration with validation using Pydantic v2."""

import os
from typing import Optional, List
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings
from enum import Enum


class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class Settings(BaseSettings):
    """Application settings with validation."""
    
    # API Keys (Required in production)
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    huggingface_token: Optional[str] = None
    openrouter_api_key: Optional[str] = None
    stability_api_key: Optional[str] = None
    
    # Model Configuration
    huggingface_model: str = "stabilityai/stable-diffusion-xl-base-1.0"
    gemini_model: str = "gemini-2.5-flash"
    openai_model: str = "gpt-4o-mini"
    
    # ComfyUI Configuration
    comfyui_base_url: str = "http://127.0.0.1:8188"
    comfyui_timeout: int = 30
    
    # Database Configuration
    database_url: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    
    # Redis Configuration
    redis_url: str = "redis://localhost:6379"
    
    # Server Configuration
    port: int = 8000
    host: str = "0.0.0.0"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = True
    log_level: LogLevel = LogLevel.INFO
    
    # CORS Configuration
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    # Security
    jwt_secret: Optional[str] = None  # Optional in dev
    jwt_algorithm: str = "HS256"
    jwt_expiration: str = "24h"
    
    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_burst: int = 10
    
    # Stripe Configuration
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    
    # Monitoring
    sentry_dsn: Optional[str] = None
    opentelemetry_endpoint: Optional[str] = None
    
    # Model Storage
    model_storage_path: str = "C:/AI/models"
    max_model_size_gb: int = 10
    
    # Generation Limits
    max_concurrent_generations: int = 3
    max_queue_size: int = 100
    default_timeout_seconds: int = 300
    
    # Cost Tracking
    cost_per_generation_usd: float = 0.01
    cost_per_upscale_usd: float = 0.005

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @field_validator("port")
    @classmethod
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError("Port must be between 1 and 65535")
        return v
    
    @field_validator("comfyui_timeout", "default_timeout_seconds")
    @classmethod
    def validate_timeout(cls, v):
        if v <= 0:
            raise ValueError("Timeout must be positive")
        return v

    @model_validator(mode="after")
    def _ensure_jwt(self):
        if not self.jwt_secret:
            # Provide a stable development fallback
            if self.environment == Environment.DEVELOPMENT:
                self.jwt_secret = "dev-jwt-secret-0123456789abcdef0123456789abcdef"
            else:
                raise ValueError("JWT_SECRET must be set in non-development environments")
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        return self
    
    def validate_production_requirements(self):
        """Validate that required settings are present in production."""
        if self.environment == Environment.PRODUCTION:
            required_fields = [
                ("database_url", self.database_url),
                ("supabase_url", self.supabase_url),
                ("supabase_service_role_key", self.supabase_service_role_key),
            ]
            
            missing_fields = [
                field_name for field_name, field_value in required_fields 
                if not field_value
            ]
            
            if missing_fields:
                raise ValueError(
                    f"Missing required production settings: {', '.join(missing_fields)}"
                )
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


# Global settings instance
settings = Settings()

# Validate production requirements
settings.validate_production_requirements()


def get_settings() -> Settings:
    """Get application settings."""
    return settings