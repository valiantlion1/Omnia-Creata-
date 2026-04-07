from __future__ import annotations

from studio_platform.services.deployment_preflight import build_deployment_preflight


def test_deployment_preflight_passes_for_launch_shaped_staging_env() -> None:
    report = build_deployment_preflight(
        {
            "ENVIRONMENT": "staging",
            "PUBLIC_WEB_BASE_URL": "https://staging-studio.omniacreata.com",
            "STATE_STORE_BACKEND": "postgres",
            "GENERATION_RUNTIME_MODE_WEB": "web",
            "GENERATION_RUNTIME_MODE_WORKER": "worker",
            "SUPABASE_URL": "https://example.supabase.co",
            "SUPABASE_ANON_KEY": "anon",
            "SUPABASE_SERVICE_ROLE_KEY": "service",
            "JWT_SECRET": "secret",
            "DATABASE_URL": "postgresql://studio:secret@postgres:5432/studio",
            "REDIS_URL": "redis://redis:6379/0",
            "GEMINI_API_KEY": "gemini",
            "FAL_API_KEY": "fal",
        }
    )

    assert report["status"] == "pass"
    assert report["blocking_count"] == 0
    assert report["warning_count"] == 0


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
