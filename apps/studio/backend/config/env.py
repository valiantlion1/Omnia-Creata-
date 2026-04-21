"""Environment configuration with validation using Pydantic v2."""

import logging
import os
from enum import Enum
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

from pydantic import Field, field_validator, model_validator, SecretStr
from pydantic_settings import BaseSettings

# Always resolve .env relative to unified root (apps/studio/.env), regardless of cwd
_BACKEND_DIR = Path(__file__).parent.parent
_STUDIO_ROOT = _BACKEND_DIR.parent
_ENV_FILE = str(_STUDIO_ROOT / ".env")
logger = logging.getLogger("omnia.studio.env")
_DEVELOPMENT_JWT_FALLBACK = "dev-jwt-secret-0123456789abcdef0123456789abcdef"


def reveal_secret(value: SecretStr | str | None) -> str:
    """Return the plain string value for a SecretStr-or-string setting."""
    if value is None:
        return ""
    if isinstance(value, SecretStr):
        return value.get_secret_value()
    return str(value)


def reveal_secret_with_audit(secret_name: str, value: SecretStr | str | None) -> str:
    """Return a secret value and emit a value-free audit trail for the lookup."""
    from security.logging import audit_secret_revealed

    audit_secret_revealed(secret_name)
    return reveal_secret(value)


def is_placeholder_secret_value(value: SecretStr | str | None) -> bool:
    """Treat obvious example placeholders as effectively unset."""
    normalized = reveal_secret(value).strip().strip("\"'").lower()
    if not normalized:
        return False

    exact_placeholders = {
        "changeme",
        "change-me",
        "change_me",
        "replace-me",
        "replace_me",
        "replace-with-real-value",
        "replace_with_real_value",
        "placeholder",
        "your-api-key",
        "your_api_key",
        "your-api-key-here",
        "your_api_key_here",
        "your-key-here",
        "your_key_here",
        "your-token-here",
        "your_token_here",
        "your-secret-here",
        "your_secret_here",
    }
    if normalized in exact_placeholders:
        return True

    looks_like_wrapped_placeholder = normalized.startswith("<") and normalized.endswith(">")
    if looks_like_wrapped_placeholder:
        return True

    token_markers = ("key", "token", "secret", "password", "credential")
    if "placeholder" in normalized:
        return True
    if "replace" in normalized and any(marker in normalized for marker in token_markers):
        return True
    if "your" in normalized and "here" in normalized and any(marker in normalized for marker in token_markers):
        return True
    return False


def has_configured_secret(value: SecretStr | str | None) -> bool:
    normalized = reveal_secret(value).strip()
    if not normalized:
        return False
    return not is_placeholder_secret_value(normalized)


def has_configured_string(value: str | None) -> bool:
    normalized = str(value or "").strip()
    if not normalized:
        return False
    return not is_placeholder_secret_value(normalized)


def configured_secret_value(value: SecretStr | str | None) -> str:
    normalized = reveal_secret(value).strip()
    if not normalized or is_placeholder_secret_value(normalized):
        return ""
    return normalized


def is_known_development_secret_value(value: SecretStr | str | None) -> bool:
    normalized = reveal_secret(value).strip()
    if not normalized:
        return False
    return normalized == _DEVELOPMENT_JWT_FALLBACK


def is_launch_safe_public_url(value: str | None) -> bool:
    normalized = str(value or "").strip()
    if not normalized or is_placeholder_secret_value(normalized):
        return False
    parsed = urlparse(normalized)
    host = str(parsed.netloc or "").lower()
    return (
        parsed.scheme == "https"
        and bool(host)
        and "localhost" not in host
        and "127.0.0.1" not in host
    )


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
    openai_api_key: Optional[SecretStr] = None
    gemini_api_key: Optional[SecretStr] = None
    huggingface_token: Optional[SecretStr] = None
    openrouter_api_key: Optional[SecretStr] = None
    stability_api_key: Optional[SecretStr] = None
    fal_api_key: Optional[SecretStr] = None
    runware_api_key: Optional[SecretStr] = None

    # Model Configuration
    huggingface_model: str = "stabilityai/stable-diffusion-xl-base-1.0"
    gemini_free_model: str = "gemini-2.5-flash-lite"
    gemini_model: str = "gemini-2.5-flash"
    gemini_premium_model: str = "gemini-2.5-pro"
    openrouter_model: str = "google/gemini-2.5-flash"
    openrouter_premium_model: str = "google/gemini-2.5-pro"
    openai_model: str = "gpt-4o-mini"
    openai_premium_model: str = "gpt-5.4"
    openai_image_draft_model: str = "gpt-image-1-mini"
    openai_image_model: str = "gpt-image-1.5"
    openai_image_premium_qa_enabled: bool = False
    chat_primary_provider: str = "openrouter"
    chat_fallback_provider: str = "openai"
    protected_beta_chat_provider: str = "openrouter"
    protected_beta_image_provider: str = "runware"
    protected_beta_image_require_final_lane: bool = False
    gemini_service_tier: str = "paid"
    openrouter_service_tier: str = "paid"
    openai_service_tier: str = "paid"
    generation_provider_strategy: str = "managed-first"
    development_fast_zero_cost_mode_enabled: bool = True
    provider_spend_guardrails_enabled: bool = True
    provider_spend_emergency_disabled: str = ""
    billable_provider_daily_soft_cap_usd: Optional[float] = None
    billable_provider_daily_hard_cap_usd: Optional[float] = None
    development_billable_provider_daily_soft_cap_usd: float = 1.0
    development_billable_provider_daily_hard_cap_usd: float = 2.0
    openai_daily_soft_cap_usd: Optional[float] = None
    openai_daily_hard_cap_usd: Optional[float] = None
    fal_daily_soft_cap_usd: Optional[float] = None
    fal_daily_hard_cap_usd: Optional[float] = None
    runware_daily_soft_cap_usd: Optional[float] = None
    runware_daily_hard_cap_usd: Optional[float] = None
    huggingface_daily_soft_cap_usd: Optional[float] = None
    huggingface_daily_hard_cap_usd: Optional[float] = None
    openrouter_daily_soft_cap_usd: Optional[float] = None
    openrouter_daily_hard_cap_usd: Optional[float] = None
    # ── Monthly spend guardrails (stop-loss doctrine) ──
    monthly_ai_spend_soft_cap_usd: float = 25.0
    monthly_ai_spend_hard_cap_usd: float = 60.0
    openai_monthly_image_cap_usd: float = 15.0
    openai_image_share_caution_pct: float = 25.0
    openai_image_share_block_pct: float = 40.0
    owner_cost_telemetry_window_days: int = 30
    owner_cost_telemetry_recent_event_limit: int = 20
    public_paid_provider_economics_ready: bool = False
    public_paid_provider_economics_ready_build: Optional[str] = None
    public_paid_provider_economics_ready_note: Optional[str] = None
    creator_monthly_credits: int = 400
    pro_monthly_credits: int = 1200
    credit_pack_small_credits: int = 200
    credit_pack_large_credits: int = 800
    creator_monthly_price_usd: float = 12.0
    pro_monthly_price_usd: float = 24.0
    credit_pack_small_price_usd: float = 8.0
    credit_pack_large_price_usd: float = 24.0
    free_account_chat_message_limit: int = 0
    creator_chat_message_limit: int = 120
    pro_chat_message_limit: int = 200

    studio_owner_email: Optional[str] = None
    studio_owner_emails: str = ""
    studio_root_admin_emails: str = ""

    # Database Configuration
    database_url: Optional[SecretStr] = None
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[SecretStr] = None
    supabase_service_role_key: Optional[SecretStr] = None
    supabase_storage_bucket: str = "studio-assets"
    state_store_backend: str = "sqlite"
    state_store_path: Optional[str] = None
    legacy_state_store_path: Optional[str] = None
    studio_runtime_root: Optional[str] = None
    studio_log_directory: Optional[str] = None
    postgres_state_store_min_connections: int = 2
    postgres_state_store_max_connections: int = 10
    postgres_state_store_web_min_connections: Optional[int] = None
    postgres_state_store_web_max_connections: Optional[int] = None
    postgres_state_store_worker_min_connections: Optional[int] = None
    postgres_state_store_worker_max_connections: Optional[int] = None
    postgres_state_store_statement_timeout_ms: int = 30000
    studio_db_conn_max_age_seconds: int = 1800

    # Asset Storage
    asset_storage_backend: str = "local"
    development_remote_asset_storage_enabled: bool = False

    # Redis Configuration
    redis_url: Optional[str] = None
    enable_live_provider_smoke: bool = False

    # Deployment Topology
    public_web_base_url: Optional[str] = None
    public_api_base_url: Optional[str] = None
    frontend_deploy_platform: str = "vercel"
    api_deploy_platform: str = "render"
    worker_deploy_platform: str = "render"
    redis_deploy_platform: str = "render"
    data_deploy_platform: str = "supabase"
    storage_deploy_platform: str = "supabase"
    billing_backbone_provider: str = "paddle"

    # Server Configuration
    port: int = 8000
    host: str = "0.0.0.0"
    environment: Environment = Environment.DEVELOPMENT
    debug: bool = True
    log_level: LogLevel = LogLevel.INFO

    # CORS Configuration
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
    cors_allow_headers: str = "Authorization,Content-Type,X-API-Key,Accept,Origin,X-Omnia-Client-Display-Mode"
    allowed_hosts: str = "localhost,127.0.0.1,studio.omniacreata.com"

    # Security
    jwt_secret: Optional[SecretStr] = None  # Optional in dev
    studio_asset_token_secondary_secret: Optional[SecretStr] = None
    jwt_algorithm: str = "HS256"
    jwt_expiration: str = "24h"
    captcha_provider: str = "turnstile"
    captcha_verification_enabled: bool = False
    turnstile_site_key: Optional[str] = None
    turnstile_secret_key: Optional[SecretStr] = None
    enable_api_docs: Optional[bool] = None
    enable_metrics_endpoint: bool = True
    enable_demo_auth: Optional[bool] = None

    # Rate Limiting
    rate_limit_per_minute: int = 60
    rate_limit_burst: int = 10
    max_request_header_bytes: int = 16 * 1024
    max_request_body_bytes: int = 8 * 1024 * 1024

    # Paddle Configuration
    paddle_api_key: Optional[SecretStr] = None
    paddle_webhook_secret: Optional[SecretStr] = None
    paddle_checkout_base_url: Optional[str] = None
    paddle_environment: str = "sandbox"

    # Legacy LemonSqueezy Configuration (deprecated; preserved for migration reads only)
    lemonsqueezy_api_key: Optional[SecretStr] = None
    lemonsqueezy_webhook_secret: Optional[SecretStr] = None
    lemonsqueezy_store_id: Optional[str] = None

    # Mailer Configuration
    resend_api_key: Optional[SecretStr] = None

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
    studio_job_stale_seconds: int = 300
    studio_shutdown_drain_seconds: int = 30
    generation_runtime_mode: str = "all"
    enable_pollinations: bool = True
    enable_demo_generation_fallback: bool = False

    # Cost Tracking (conservative defaults, Runware-first doctrine)
    # Real Runware costs are $0.003-0.012 per image depending on model.
    # These defaults are used as fallback when provider doesn't report actual cost.
    cost_per_generation_usd: float = 0.006
    cost_per_upscale_usd: float = 0.004

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
    def provider_spend_emergency_disabled_list(self) -> List[str]:
        values = [
            provider.strip().lower()
            for provider in self.provider_spend_emergency_disabled.split(",")
            if provider.strip()
        ]
        deduped: List[str] = []
        for value in values:
            if value and value not in deduped:
                deduped.append(value)
        return deduped

    @property
    def captcha_provider_normalized(self) -> str:
        return str(self.captcha_provider or "").strip().lower()

    @property
    def captcha_ready_for_sensitive_flows(self) -> bool:
        if self.captcha_verification_enabled is not True:
            return False
        if self.captcha_provider_normalized != "turnstile":
            return False
        return has_configured_string(self.turnstile_site_key) and has_configured_secret(
            self.turnstile_secret_key
        )

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
        "billable_provider_daily_soft_cap_usd",
        "billable_provider_daily_hard_cap_usd",
        "development_billable_provider_daily_soft_cap_usd",
        "development_billable_provider_daily_hard_cap_usd",
        "openai_daily_soft_cap_usd",
        "openai_daily_hard_cap_usd",
        "fal_daily_soft_cap_usd",
        "fal_daily_hard_cap_usd",
        "runware_daily_soft_cap_usd",
        "runware_daily_hard_cap_usd",
        "huggingface_daily_soft_cap_usd",
        "huggingface_daily_hard_cap_usd",
        "openrouter_daily_soft_cap_usd",
        "openrouter_daily_hard_cap_usd",
    )
    @classmethod
    def validate_provider_spend_caps(cls, value: float | None) -> float | None:
        if value is None:
            return None
        if value <= 0:
            raise ValueError("Provider spend caps must be positive when configured")
        return value

    @field_validator(
        "generation_retry_attempt_limit",
        "generation_retry_delay_seconds",
        "generation_stale_running_seconds",
        "generation_claim_lease_seconds",
        "generation_maintenance_interval_seconds",
        "owner_cost_telemetry_window_days",
        "owner_cost_telemetry_recent_event_limit",
        "creator_monthly_credits",
        "pro_monthly_credits",
        "credit_pack_small_credits",
        "credit_pack_large_credits",
        "creator_chat_message_limit",
        "pro_chat_message_limit",
        "postgres_state_store_min_connections",
        "postgres_state_store_max_connections",
        "postgres_state_store_statement_timeout_ms",
    )
    @classmethod
    def validate_generation_runtime_limits(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Generation runtime limits must be positive")
        return v

    @field_validator("free_account_chat_message_limit")
    @classmethod
    def validate_free_account_chat_message_limit(cls, value: int) -> int:
        if value < 0:
            raise ValueError("Free account chat message limit cannot be negative")
        return value

    @field_validator("max_request_header_bytes", "max_request_body_bytes")
    @classmethod
    def validate_ingress_limits(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("Ingress size limits must be positive")
        return value

    @field_validator(
        "creator_monthly_price_usd",
        "pro_monthly_price_usd",
        "credit_pack_small_price_usd",
        "credit_pack_large_price_usd",
    )
    @classmethod
    def validate_catalog_prices(cls, value: float) -> float:
        if value < 0:
            raise ValueError("Catalog prices cannot be negative")
        return round(float(value), 2)

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

    @field_validator("protected_beta_chat_provider")
    @classmethod
    def validate_protected_beta_chat_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"gemini", "openrouter", "openai"}:
            raise ValueError("PROTECTED_BETA_CHAT_PROVIDER must be gemini, openrouter, or openai")
        return normalized

    @field_validator("protected_beta_image_provider")
    @classmethod
    def validate_protected_beta_image_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"openai", "fal", "runware"}:
            raise ValueError("PROTECTED_BETA_IMAGE_PROVIDER must be openai, fal, or runware")
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

    @field_validator("paddle_environment")
    @classmethod
    def validate_paddle_environment(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"sandbox", "production"}:
            raise ValueError("PADDLE_ENVIRONMENT must be either sandbox or production")
        return normalized

    @field_validator("frontend_deploy_platform")
    @classmethod
    def validate_frontend_deploy_platform(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"vercel", "docker", "local"}:
            raise ValueError("FRONTEND_DEPLOY_PLATFORM must be vercel, docker, or local")
        return normalized

    @field_validator("api_deploy_platform", "worker_deploy_platform")
    @classmethod
    def validate_service_deploy_platform(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"render", "docker", "local"}:
            raise ValueError("API/WORKER deploy platforms must be render, docker, or local")
        return normalized

    @field_validator("redis_deploy_platform")
    @classmethod
    def validate_redis_deploy_platform(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"render", "docker", "local"}:
            raise ValueError("REDIS_DEPLOY_PLATFORM must be render, docker, or local")
        return normalized

    @field_validator("data_deploy_platform", "storage_deploy_platform")
    @classmethod
    def validate_data_storage_deploy_platform(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"supabase", "docker", "local"}:
            raise ValueError("DATA/STORAGE deploy platforms must be supabase, docker, or local")
        return normalized

    @field_validator("billing_backbone_provider")
    @classmethod
    def validate_billing_backbone_provider(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"paddle", "lemonsqueezy", "none"}:
            raise ValueError("BILLING_BACKBONE_PROVIDER must be paddle, lemonsqueezy, or none")
        return normalized

    @model_validator(mode="after")
    def _ensure_jwt(self):
        if self.enable_api_docs is None:
            self.enable_api_docs = self.environment == Environment.DEVELOPMENT
        if self.enable_demo_auth is None:
            self.enable_demo_auth = self.environment == Environment.DEVELOPMENT
        if not self.jwt_secret:
            # Provide a stable development fallback
            if self.environment == Environment.DEVELOPMENT:
                self.jwt_secret = _DEVELOPMENT_JWT_FALLBACK
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
        if (
            self.billable_provider_daily_soft_cap_usd is not None
            and self.billable_provider_daily_hard_cap_usd is not None
            and self.billable_provider_daily_hard_cap_usd < self.billable_provider_daily_soft_cap_usd
        ):
            self.billable_provider_daily_hard_cap_usd = self.billable_provider_daily_soft_cap_usd
        if self.development_billable_provider_daily_hard_cap_usd < self.development_billable_provider_daily_soft_cap_usd:
            self.development_billable_provider_daily_hard_cap_usd = self.development_billable_provider_daily_soft_cap_usd
        for provider_name in ("openai", "fal", "runware", "huggingface", "openrouter"):
            soft_field = f"{provider_name}_daily_soft_cap_usd"
            hard_field = f"{provider_name}_daily_hard_cap_usd"
            soft_value = getattr(self, soft_field)
            hard_value = getattr(self, hard_field)
            if soft_value is not None and hard_value is not None and hard_value < soft_value:
                setattr(self, hard_field, soft_value)
        if self.postgres_state_store_max_connections < self.postgres_state_store_min_connections:
            self.postgres_state_store_max_connections = self.postgres_state_store_min_connections
        return self

    def validate_production_requirements(self):
        """Validate that required settings are present in production."""
        if self.environment in {Environment.STAGING, Environment.PRODUCTION}:
            required_secret_fields = [
                ("database_url", self.database_url),
                ("supabase_anon_key", self.supabase_anon_key),
                ("supabase_service_role_key", self.supabase_service_role_key),
                ("redis_url", self.redis_url),
            ]
            required_string_fields = [
                ("supabase_url", self.supabase_url),
            ]

            missing_fields = [
                field_name
                for field_name, field_value in required_secret_fields
                if not has_configured_secret(field_value)
            ]
            missing_fields.extend(
                field_name
                for field_name, field_value in required_string_fields
                if not has_configured_string(field_value)
            )

            if missing_fields:
                raise ValueError(
                    f"Missing required production settings: {', '.join(missing_fields)}"
                )
            if is_known_development_secret_value(self.jwt_secret):
                raise ValueError(
                    "JWT_SECRET must not use the known development fallback value in staging and production environments"
                )
            if self.state_store_backend != "postgres":
                raise ValueError("STATE_STORE_BACKEND must be set to 'postgres' in staging and production environments")
            if self.asset_storage_backend != "supabase":
                raise ValueError("ASSET_STORAGE_BACKEND must be set to 'supabase' in staging and production environments")
            if self.enable_demo_auth:
                raise ValueError("ENABLE_DEMO_AUTH must be disabled in staging and production environments")
            if self.enable_demo_generation_fallback:
                raise ValueError(
                    "ENABLE_DEMO_GENERATION_FALLBACK must be disabled in staging and production environments"
                )
            if self.enable_api_docs:
                raise ValueError("ENABLE_API_DOCS must be disabled in staging and production environments")
            if not is_launch_safe_public_url(self.public_web_base_url):
                raise ValueError(
                    "PUBLIC_WEB_BASE_URL must be a configured HTTPS non-local URL in staging and production environments"
                )
            if not is_launch_safe_public_url(self.public_api_base_url):
                raise ValueError(
                    "PUBLIC_API_BASE_URL must be a configured HTTPS non-local URL in staging and production environments"
                )

    def validate_runtime(self) -> list[str]:
        """Validate startup-critical runtime settings and return soft warnings."""
        issues: list[str] = []
        warnings: list[str] = []
        runtime_mode = str(self.generation_runtime_mode or "all").strip().lower() or "all"

        if self.environment in {Environment.STAGING, Environment.PRODUCTION}:
            if not has_configured_string(self.redis_url):
                issues.append("REDIS_URL must be configured in staging/production")
            if not has_configured_secret(self.database_url):
                issues.append("DATABASE_URL must be configured in staging/production")
            if not has_configured_secret(self.jwt_secret):
                issues.append("JWT_SECRET must be configured in staging/production")
            elif is_known_development_secret_value(self.jwt_secret):
                issues.append("JWT_SECRET must not use the known development fallback value in staging/production")

        if self.environment == Environment.PRODUCTION and not self.cors_origins_list:
            issues.append("CORS_ORIGINS must not be empty in production")

        if self.max_request_body_bytes < 1024:
            issues.append("MAX_REQUEST_BODY_BYTES must be at least 1024 bytes")

        pool_budget_specs = (
            (
                "POSTGRES_STATE_STORE_MIN_CONNECTIONS",
                self.postgres_state_store_min_connections,
                "POSTGRES_STATE_STORE_MAX_CONNECTIONS",
                self.postgres_state_store_max_connections,
            ),
            (
                "POSTGRES_STATE_STORE_WEB_MIN_CONNECTIONS",
                self.postgres_state_store_web_min_connections,
                "POSTGRES_STATE_STORE_WEB_MAX_CONNECTIONS",
                self.postgres_state_store_web_max_connections,
            ),
            (
                "POSTGRES_STATE_STORE_WORKER_MIN_CONNECTIONS",
                self.postgres_state_store_worker_min_connections,
                "POSTGRES_STATE_STORE_WORKER_MAX_CONNECTIONS",
                self.postgres_state_store_worker_max_connections,
            ),
        )
        for min_label, min_value, max_label, max_value in pool_budget_specs:
            if min_value is None and max_value is None:
                continue
            resolved_min = int(min_value if min_value is not None else self.postgres_state_store_min_connections)
            resolved_max = int(max_value if max_value is not None else self.postgres_state_store_max_connections)
            if resolved_min < 1:
                issues.append(f"{min_label} must be at least 1")
            if resolved_max < resolved_min:
                issues.append(f"{max_label} must be greater than or equal to {min_label}")

        if self.environment in {Environment.STAGING, Environment.PRODUCTION} and runtime_mode == "web":
            if self.postgres_state_store_web_min_connections is None and self.postgres_state_store_web_max_connections is None:
                warnings.append(
                    "POSTGRES_STATE_STORE_WEB_MIN_CONNECTIONS/POSTGRES_STATE_STORE_WEB_MAX_CONNECTIONS are not configured; web runtime is using the default Postgres pool budget"
                )
        if self.environment in {Environment.STAGING, Environment.PRODUCTION} and runtime_mode == "worker":
            if (
                self.postgres_state_store_worker_min_connections is None
                and self.postgres_state_store_worker_max_connections is None
            ):
                warnings.append(
                    "POSTGRES_STATE_STORE_WORKER_MIN_CONNECTIONS/POSTGRES_STATE_STORE_WORKER_MAX_CONNECTIONS are not configured; worker runtime is using the default Postgres pool budget"
                )

        provider_secret_fields = (
            ("OPENAI_API_KEY", self.openai_api_key),
            ("GEMINI_API_KEY", self.gemini_api_key),
            ("HUGGINGFACE_TOKEN", self.huggingface_token),
            ("OPENROUTER_API_KEY", self.openrouter_api_key),
            ("FAL_API_KEY", self.fal_api_key),
            ("RUNWARE_API_KEY", self.runware_api_key),
        )
        for env_var, field_value in provider_secret_fields:
            if not has_configured_secret(field_value):
                warnings.append(f"{env_var} is not configured for the current runtime")

        if issues:
            raise ValueError("; ".join(issues))

        return warnings

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
