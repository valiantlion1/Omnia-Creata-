from __future__ import annotations

from studio_platform.services.deployment_preflight import build_deployment_preflight


def test_deployment_preflight_passes_for_launch_shaped_staging_env() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "ALLOWED_HOSTS": "staging-api.omniacreata.com,staging-studio.omniacreata.com",
            "STATE_STORE_BACKEND": "postgres",
            "POSTGRES_DB": "studio",
            "POSTGRES_USER": "studio",
            "POSTGRES_PASSWORD": "secret",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://studio:secret@postgres:5432/studio",
            "REDIS_URL": "redis://redis:6379/0",
            "RUNWARE_API_KEY": "runware",
            "PROTECTED_BETA_CHAT_PROVIDER": "runware",
            "PROTECTED_BETA_IMAGE_PROVIDER": "runware",
            "PADDLE_API_KEY": "paddle-api-key",
            "PADDLE_WEBHOOK_SECRET": "paddle-webhook-secret",
            "PADDLE_CHECKOUT_BASE_URL": "https://sandbox-checkout.paddle.test",
        }
    )

    assert report["status"] == "pass"
    assert report["blocking_count"] == 0
    assert report["warning_count"] == 0
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["billing_backbone"]["status"] == "pass"


def test_deployment_preflight_blocks_when_env_is_local_or_topology_is_wrong() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "development",
            "PUBLIC_WEB_BASE_URL": "http://localhost:5173",
            "STATE_STORE_BACKEND": "sqlite",
            "GENERATION_RUNTIME_MODE_WEB": "all",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "",
            "SUPABASE_ANON_KEY": "",
            "SUPABASE_SERVICE_ROLE_KEY": "",
            "JWT_SECRET": "",
            "DATABASE_URL": "",
            "REDIS_URL": "",
        }
    )

    assert report["status"] == "blocked"
    assert report["blocking_count"] >= 4
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["public_web_base_url"]["status"] == "blocked"
    assert checks["generation_runtime_topology"]["status"] == "blocked"


def test_deployment_preflight_warns_when_premium_provider_secrets_are_missing() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "ALLOWED_HOSTS": "staging-api.omniacreata.com,staging-studio.omniacreata.com",
            "STATE_STORE_BACKEND": "postgres",
            "POSTGRES_DB": "studio",
            "POSTGRES_USER": "studio",
            "POSTGRES_PASSWORD": "secret",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://studio:secret@postgres:5432/studio",
            "REDIS_URL": "redis://redis:6379/0",
        }
    )

    assert report["status"] == "warning"
    assert report["blocking_count"] == 0
    assert report["warning_count"] == 3
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["premium_chat_lane"]["status"] == "warning"
    assert checks["premium_image_lane"]["status"] == "warning"
    assert checks["billing_backbone"]["status"] == "warning"


def test_deployment_preflight_treats_placeholders_as_missing_for_selected_beta_lanes() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "ALLOWED_HOSTS": "staging-api.omniacreata.com,staging-studio.omniacreata.com",
            "STATE_STORE_BACKEND": "postgres",
            "POSTGRES_DB": "studio",
            "POSTGRES_USER": "studio",
            "POSTGRES_PASSWORD": "secret",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "your-staging-supabase-url",
            "SUPABASE_ANON_KEY": "your-staging-supabase-anon-key",
            "SUPABASE_SERVICE_ROLE_KEY": "your-staging-role-key",
            "JWT_SECRET": "your-secure-32-char-jwt-secret-staging",
            "DATABASE_URL": "postgresql://studio:secret@postgres:5432/studio",
            "REDIS_URL": "redis://redis:6379/0",
            "RUNWARE_API_KEY": "your-runware-key",
            "PROTECTED_BETA_CHAT_PROVIDER": "runware",
            "PROTECTED_BETA_IMAGE_PROVIDER": "runware",
        }
    )

    assert report["status"] == "blocked"
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["required_secrets"]["status"] == "blocked"
    assert checks["premium_chat_lane"]["status"] == "warning"
    assert checks["premium_image_lane"]["status"] == "warning"


def test_deployment_preflight_runware_chat_and_image_lanes_share_runware_key() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "ALLOWED_HOSTS": "staging-api.omniacreata.com,staging-studio.omniacreata.com",
            "STATE_STORE_BACKEND": "postgres",
            "POSTGRES_DB": "studio",
            "POSTGRES_USER": "studio",
            "POSTGRES_PASSWORD": "secret",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://studio:secret@postgres:5432/studio",
            "REDIS_URL": "redis://redis:6379/0",
            "RUNWARE_API_KEY": "runware",
            "PROTECTED_BETA_CHAT_PROVIDER": "runware",
            "PROTECTED_BETA_IMAGE_PROVIDER": "runware",
            "PADDLE_API_KEY": "paddle-api-key",
            "PADDLE_WEBHOOK_SECRET": "paddle-webhook-secret",
            "PADDLE_CHECKOUT_BASE_URL": "https://sandbox-checkout.paddle.test",
        }
    )

    assert report["status"] == "pass"
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["premium_chat_lane"]["status"] == "pass"
    assert checks["premium_image_lane"]["status"] == "pass"
    assert "runware is available" in checks["premium_chat_lane"]["detail"]
    assert "OPENAI_API_KEY" not in checks["premium_image_lane"]["detail"]


def test_deployment_preflight_blocks_when_postgres_service_creds_drift_from_database_url() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "ALLOWED_HOSTS": "staging-api.omniacreata.com,staging-studio.omniacreata.com",
            "STATE_STORE_BACKEND": "postgres",
            "POSTGRES_DB": "studio",
            "POSTGRES_USER": "studio",
            "POSTGRES_PASSWORD": "different-secret",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://studio:secret@postgres:5432/studio",
            "REDIS_URL": "redis://redis:6379/0",
        }
    )

    assert report["status"] == "blocked"
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["postgres_credentials_alignment"]["status"] == "blocked"


def test_deployment_preflight_accepts_canonical_platform_env_with_external_postgres() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://studio.omniacreata.com",
            "PUBLIC_API_BASE_URL": "https://studio-api.onrender.com",
            "ALLOWED_HOSTS": "studio-api.onrender.com,studio.omniacreata.com",
            "FRONTEND_DEPLOY_PLATFORM": "vercel",
            "API_DEPLOY_PLATFORM": "render",
            "WORKER_DEPLOY_PLATFORM": "render",
            "REDIS_DEPLOY_PLATFORM": "render",
            "DATA_DEPLOY_PLATFORM": "supabase",
            "STORAGE_DEPLOY_PLATFORM": "supabase",
            "BILLING_BACKBONE_PROVIDER": "paddle",
            "STATE_STORE_BACKEND": "postgres",
            "ASSET_STORAGE_BACKEND": "supabase",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://postgres.user:secret@db.abcd.supabase.co:5432/postgres",
            "REDIS_URL": "redis://default:secret@render-redis:6379/0",
            "GEMINI_API_KEY": "gemini-key",
            "GEMINI_SERVICE_TIER": "paid",
            "RUNWARE_API_KEY": "runware-key",
            "PADDLE_API_KEY": "paddle-api-key",
            "PADDLE_WEBHOOK_SECRET": "paddle-webhook-secret",
            "PADDLE_CHECKOUT_BASE_URL": "https://sandbox-checkout.paddle.test",
        }
    )

    assert report["status"] == "pass"
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["deployment_stack"]["status"] == "pass"
    assert checks["public_api_base_url"]["status"] == "pass"
    assert checks["asset_storage_backend"]["status"] == "pass"
    assert checks["postgres_credentials_alignment"]["status"] == "pass"
    assert checks["billing_backbone"]["status"] == "pass"


def test_deployment_preflight_blocks_local_allowed_hosts() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "ALLOWED_HOSTS": "localhost,staging-studio.omniacreata.com",
            "STATE_STORE_BACKEND": "postgres",
            "POSTGRES_DB": "studio",
            "POSTGRES_USER": "studio",
            "POSTGRES_PASSWORD": "secret",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://studio:secret@postgres:5432/studio",
            "REDIS_URL": "redis://redis:6379/0",
        }
    )

    checks = {check["key"]: check for check in report["checks"]}
    assert report["status"] == "blocked"
    assert checks["allowed_hosts"]["status"] == "blocked"


def test_deployment_preflight_blocks_private_public_urls() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://10.0.0.5",
            "PUBLIC_API_BASE_URL": "https://192.168.1.10",
            "ALLOWED_HOSTS": "staging-api.omniacreata.com,staging-studio.omniacreata.com",
            "FRONTEND_DEPLOY_PLATFORM": "vercel",
            "API_DEPLOY_PLATFORM": "render",
            "WORKER_DEPLOY_PLATFORM": "render",
            "REDIS_DEPLOY_PLATFORM": "render",
            "DATA_DEPLOY_PLATFORM": "supabase",
            "STORAGE_DEPLOY_PLATFORM": "supabase",
            "BILLING_BACKBONE_PROVIDER": "paddle",
            "STATE_STORE_BACKEND": "postgres",
            "ASSET_STORAGE_BACKEND": "supabase",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://postgres.user:secret@db.abcd.supabase.co:5432/postgres",
            "REDIS_URL": "redis://default:secret@render-redis:6379/0",
        }
    )

    checks = {check["key"]: check for check in report["checks"]}
    assert report["status"] == "blocked"
    assert checks["public_web_base_url"]["status"] == "blocked"
    assert checks["public_api_base_url"]["status"] == "blocked"
