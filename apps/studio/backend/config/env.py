"""Environment configuration with validation using Pydantic v2."""

import os
from enum import Enum
from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings

# Always resolve .env relative to this file's parent (backend/), regardless of cwd
_BACKEND_DIR = Path(__file__).parent.parent
_ENV_FILE = str(_BACKEND_DIR / ".env")


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
    fal_api_key: Optional[str] = None
    runware_api_key: Optional[str] = None

    # Model Configuration
    huggingface_model: str = "stabilityai/stable-diffusion-xl-base-1.0"
    gemini_model: str = "gemini-2.5-flash"
    gemini_premium_model: str = "gemini-2.5-pro"
    openrouter_model: str = "google/gemini-2.5-flash"
    openrouter_premium_model: str = "google/gemini-2.5-pro"
    openai_model: str = "gpt-4o-mini"
    openai_premium_model: str = "gpt-5.4"
    openai_image_draft_model: str = "gpt-image-1-mini"
    openai_image_model: str = "gpt-image-1.5"
    chat_primary_provider: str = "openrouter"
    chat_fallback_provider: str = "openai"
    gemini_service_tier: str = "free"
    openrouter_service_tier: str = "paid"
    openai_service_tier: str = "paid"
    generation_provider_strategy: str = "free-first"

    studio_owner_email: Optional[str] = None
    studio_owner_emails: str = ""
    studio_root_admin_emails: str = ""

    # Database Configuration
    database_url: Optional[str] = None
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_storage_bucket: str = "studio-assets"
    state_store_backend: str = "sqlite"
    state_store_path: Optional[str] = None
    legacy_state_store_path: Optional[str] = None
    studio_runtime_root: Optional[str] = None
    studio_log_directory: Optional[str] = None

    # Asset Storage
    asset_storage_backend: str = "local"

    # Redis Configuration
    redis_url: Optional[str] = None
    enable_live_provider_smoke: bool = False

    # Server Configuration
    port: int = 8000
    host: str = "0.0.0.0"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = True
    log_level: LogLevel = LogLevel.INFO

    # CORS Configuration
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    cors_allow_headers: str = "Authorization,Content-Type,X-API-Key,Accept,Origin"
    allowed_hosts: str = "localhost,127.0.0.1,studio.omniacreata.com"

    # Security
    jwt_secret: Optional[str] = None  # Optional in dev
    jwt_algorithm: str = "HS256"
    jwt_expiration: str = "24h"
    enable_api_docs: Optional[bool] = None
    enable_demo_auth: Optional[bool] = None

    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_burst: int = 10

    # LemonSqueezy Configuration
    lemonsqueezy_api_key: Optional[str] = None
    lemonsqueezy_webhook_secret: Optional[str] = None
    lemonsqueezy_store_id: Optional[str] = None

    # Mailer Configuration
    resend_api_key: Optional[str] = None

    # Monitoring
    sentry_dsn: Optional[str] = None
    opentelemetry_endpoint: Optional[str] = None

    # Generation Limits
    max_concurrent_generations: int = 3
    max_queue_size: int = 100
    default_timeout_seconds: int = 300
    generation_retry_attempt_limit: int = 3
    generation_retry_delay_seconds: int = 20
    generation_stale_running_seconds: int = 600
    generation_claim_lease_seconds: int = 60
    generation_maintenance_interval_seconds: int = 10
    generation_runtime_mode: str = "all"
    enable_pollinations: bool = True
    enable_demo_generation_fallback: bool = False

    # Cost Tracking
    cost_per_generation_usd: float = 0.01
    cost_per_upscale_usd: float = 0.005

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def cors_allow_headers_list(self) -> List[str]:
        """Parse allowed CORS headers from comma-separated string."""
        return [header.strip() for header in self.cors_allow_headers.split(",") if header.strip()]

    @property
    def allowed_hosts_list(self) -> List[str]:
        """Parse allowed hosts from comma-separated string."""
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def owner_emails_list(self) -> List[str]:
        """Parse owner emails from legacy single value plus comma-separated list."""
        values: List[str] = []
        if self.studio_owner_email:
            values.append(self.studio_owner_email.strip().lower())
        if self.studio_owner_emails:
            values.extend(
                email.strip().lower()
                for email in self.studio_owner_emails.split(",")
                if email.strip()
            )

        deduped: List[str] = []
        for value in values:
            if value and value not in deduped:
                deduped.append(value)
        return deduped

    @property
    def root_admin_emails_list(self) -> List[str]:
        """Parse bootstrap root-admin emails allowed to grant future privileged roles."""
        values: List[str] = []
        if self.studio_root_admin_emails:
            values.extend(
                email.strip().lower()
                for email in self.studio_root_admin_emails.split(",")
                if email.strip()
            )

        deduped: List[str] = []
        for value in values:
            if value and value not in deduped:
                deduped.append(value)
        return deduped

    @property
    def runtime_root_path(self) -> Path:
        if self.studio_runtime_root:
            return Path(self.studio_runtime_root).expanduser().resolve()

        if os.name == "nt":
            local_app_data = os.getenv("LOCALAPPDATA")
            if local_app_data:
                return (Path(local_app_data) / "OmniaCreata" / "Studio").resolve()

        xdg_state_home = os.getenv("XDG_STATE_HOME")
        if xdg_state_home:
            return (Path(xdg_state_home) / "omnia_creata" / "studio").expanduser().resolve()

        return (Path.home() / ".omnia_creata" / "studio").resolve()

    @property
    def log_directory_path(self) -> Path:
        if self.studio_log_directory:
            return Path(self.studio_log_directory).expanduser().resolve()
        return (self.runtime_root_path / "logs").resolve()

    @field_validator("port")
    @classmethod
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError("Port must be between 1 and 65535")
        return v

    @field_validator("default_timeout_seconds")
    @classmethod
    def validate_timeout(cls, v):
        if v <= 0:
            raise ValueError("Timeout must be positive")
        return v

    @field_validator(
        "generation_retry_attempt_limit",
        "generation_retry_delay_seconds",
        "generation_stale_running_seconds",
        "generation_claim_lease_seconds",
        "generation_maintenance_interval_seconds",
    )
    @classmethod
    def validate_generation_runtime_limits(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Generation runtime limits must be positive")
        return v

    @field_validator("generation_runtime_mode")
    @classmethod
    def validate_generation_runtime_mode(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"all", "web", "worker"}:
            raise ValueError("GENERATION_RUNTIME_MODE must be one of: all, web, worker")
        return normalized

    @field_validator("asset_storage_backend")
    @classmethod
    def validate_asset_storage_backend(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"local", "supabase"}:
            raise ValueError("ASSET_STORAGE_BACKEND must be either 'local' or 'supabase'")
        return normalized

    @field_validator("state_store_backend")
    @classmethod
    def validate_state_store_backend(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"json", "sqlite", "postgres"}:
            raise ValueError("STATE_STORE_BACKEND must be one of: json, sqlite, postgres")
        return normalized

    @field_validator("chat_primary_provider", "chat_fallback_provider")
    @classmethod
    def validate_chat_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"gemini", "openrouter", "openai", "heuristic"}:
            raise ValueError("Chat providers must be gemini, openrouter, openai, or heuristic")
        return normalized

    @field_validator("gemini_service_tier", "openrouter_service_tier", "openai_service_tier")
    @classmethod
    def validate_chat_service_tier(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"free", "paid"}:
            raise ValueError("Chat service tiers must be either 'free' or 'paid'")
        return normalized

    @field_validator("generation_provider_strategy")
    @classmethod
    def validate_generation_provider_strategy(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"free-first", "balanced", "managed-first"}:
            raise ValueError("GENERATION_PROVIDER_STRATEGY must be one of: free-first, balanced, managed-first")
        return normalized

    @model_validator(mode="after")
    def _ensure_jwt(self):
        default_non_prod = self.environment != Environment.PRODUCTION
        if self.enable_api_docs is None:
            self.enable_api_docs = default_non_prod
        if self.enable_demo_auth is None:
            self.enable_demo_auth = default_non_prod
        if not self.jwt_secret:
            # Provide a stable development fallback
            if self.environment == Environment.DEVELOPMENT:
                self.jwt_secret = "dev-jwt-secret-0123456789abcdef0123456789abcdef"
            else:
                raise ValueError("JWT_SECRET must be set in non-development environments")
        if len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET must be at least 32 characters long")
        if self.generation_stale_running_seconds < 120:
            self.generation_stale_running_seconds = 180
        minimum_claim_lease = max(30, self.generation_maintenance_interval_seconds * 3)
        if self.generation_claim_lease_seconds < minimum_claim_lease:
            self.generation_claim_lease_seconds = minimum_claim_lease
        if self.generation_claim_lease_seconds > self.generation_stale_running_seconds:
            self.generation_claim_lease_seconds = self.generation_stale_running_seconds
        return self

    def validate_production_requirements(self):
        """Validate that required settings are present in production."""
        if self.environment in {Environment.STAGING, Environment.PRODUCTION}:
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
            if self.state_store_backend != "postgres":
                raise ValueError("STATE_STORE_BACKEND must be set to 'postgres' in staging and production environments")

    model_config = {
        "env_file": _ENV_FILE,
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
        "protected_namespaces": ("settings_",),
    }


# Global settings instance
settings = Settings()

# Validate production requirements
settings.validate_production_requirements()


def get_settings() -> Settings:
    """Get application settings."""
    return settings
