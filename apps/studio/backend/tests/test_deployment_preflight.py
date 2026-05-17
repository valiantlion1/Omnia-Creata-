from __future__ import annotations

from pathlib import Path

from studio_platform.services.deployment_preflight import build_deployment_preflight, load_dotenv_file


STUDIO_ROOT = Path(__file__).resolve().parents[2]


def test_deployment_preflight_passes_for_launch_shaped_staging_env() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "PUBLIC_API_BASE_URL": "https://staging-studio-api.onrender.com",
            "ASSET_STORAGE_BACKEND": "supabase",
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
            "OPENAI_API_KEY": "openai",
            "PROTECTED_BETA_CHAT_PROVIDER": "openai",
            "PROTECTED_BETA_IMAGE_PROVIDER": "openai",
            "BILLING_BACKBONE_PROVIDER": "none",
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
    assert report["warning_count"] == 2
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["premium_chat_lane"]["status"] == "warning"
    assert checks["premium_image_lane"]["status"] == "warning"
    assert checks["billing_backbone"]["status"] == "pass"


def test_load_dotenv_file_tolerates_utf8_bom_on_first_key(tmp_path) -> None:
    env_file = tmp_path / ".env.platform"
    env_file.write_text(
        "\ufeffENVIRONMENT=staging\nPUBLIC_WEB_BASE_URL=https://studio.omniacreata.com\n",
        encoding="utf-8",
    )

    values = load_dotenv_file(env_file)

    assert values["ENVIRONMENT"] == "staging"
    assert values["PUBLIC_WEB_BASE_URL"] == "https://studio.omniacreata.com"


def test_deployment_preflight_treats_placeholders_as_missing_for_selected_beta_lanes() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
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
            "OPENAI_API_KEY": "your-openai-key",
            "PROTECTED_BETA_CHAT_PROVIDER": "openai",
            "PROTECTED_BETA_IMAGE_PROVIDER": "openai",
        }
    )

    assert report["status"] == "blocked"
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["required_secrets"]["status"] == "blocked"
    assert checks["premium_chat_lane"]["status"] == "warning"
    assert checks["premium_image_lane"]["status"] == "warning"


def test_deployment_preflight_blocks_when_postgres_service_creds_drift_from_database_url() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
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
            "FRONTEND_DEPLOY_PLATFORM": "vercel",
            "API_DEPLOY_PLATFORM": "render",
            "WORKER_DEPLOY_PLATFORM": "render",
            "REDIS_DEPLOY_PLATFORM": "render",
            "DATA_DEPLOY_PLATFORM": "supabase",
            "STORAGE_DEPLOY_PLATFORM": "supabase",
            "BILLING_BACKBONE_PROVIDER": "none",
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
        }
    )

    assert report["status"] == "pass"
    checks = {check["key"]: check for check in report["checks"]}
    assert checks["deployment_stack"]["status"] == "pass"
    assert checks["public_api_base_url"]["status"] == "pass"
    assert checks["asset_storage_backend"]["status"] == "pass"
    assert checks["postgres_credentials_alignment"]["status"] == "pass"
    assert checks["billing_backbone"]["status"] == "pass"


def test_render_blueprint_declares_live_studio_cors_and_host_boundaries() -> None:
    render_yaml = (STUDIO_ROOT / "render.yaml").read_text(encoding="utf-8")

    assert render_yaml.count("key: CORS_ORIGINS") >= 2
    assert render_yaml.count("value: https://studio.omniacreata.com") >= 2
    assert render_yaml.count("key: ALLOWED_HOSTS") >= 2
    assert render_yaml.count("value: omnia-studio-api.onrender.com,studio.omniacreata.com") >= 2
