from __future__ import annotations

from typing import Any, Mapping

from config.env import Settings, has_configured_secret

_CANONICAL_STACK = {
    "frontend": "vercel",
    "api": "render",
    "worker": "render",
    "redis": "render",
    "data": "supabase",
    "storage": "supabase",
    "billing": "paddle",
}


def build_deployment_stack_summary(settings: Settings) -> dict[str, Any]:
    configured = {
        "frontend": settings.frontend_deploy_platform,
        "api": settings.api_deploy_platform,
        "worker": settings.worker_deploy_platform,
        "redis": settings.redis_deploy_platform,
        "data": settings.data_deploy_platform,
        "storage": settings.storage_deploy_platform,
        "billing": settings.billing_backbone_provider,
    }
    mismatches = [
        surface
        for surface, expected in _CANONICAL_STACK.items()
        if configured.get(surface) != expected
    ]
    runtime_contract = {
        "state_store_backend": settings.state_store_backend,
        "asset_storage_backend": settings.asset_storage_backend,
        "generation_runtime_mode": settings.generation_runtime_mode,
    }
    credentials = {
        "supabase_core": bool(
            (settings.supabase_url or "").strip()
            and has_configured_secret(settings.supabase_anon_key)
            and has_configured_secret(settings.supabase_service_role_key)
        ),
        "redis": bool((settings.redis_url or "").strip()),
        "paddle": bool(
            has_configured_secret(settings.paddle_api_key)
            and has_configured_secret(settings.paddle_webhook_secret)
            and (settings.paddle_checkout_base_url or "").strip()
        ),
    }
    if mismatches:
        status = "warning"
        summary = "Configured deployment stack drifts from the locked launch stack."
    else:
        status = "pass"
        summary = "Configured deployment stack matches the locked Vercel/Render/Supabase/Redis/Paddle contract."
    return {
        "status": status,
        "summary": summary,
        "canonical_stack": dict(_CANONICAL_STACK),
        "configured_stack": configured,
        "matches_canonical": not mismatches,
        "mismatches": mismatches,
        "public_web_base_url": (settings.public_web_base_url or "").strip() or None,
        "public_api_base_url": (settings.public_api_base_url or "").strip() or None,
        "runtime_contract": runtime_contract,
        "credentials": credentials,
    }


def build_deployment_stack_summary_from_env(env_values: Mapping[str, str]) -> dict[str, Any]:
    def _normalized(key: str, fallback: str) -> str:
        value = str(env_values.get(key, "") or "").strip().lower()
        return value or fallback

    configured = {
        "frontend": _normalized("FRONTEND_DEPLOY_PLATFORM", _CANONICAL_STACK["frontend"]),
        "api": _normalized("API_DEPLOY_PLATFORM", _CANONICAL_STACK["api"]),
        "worker": _normalized("WORKER_DEPLOY_PLATFORM", _CANONICAL_STACK["worker"]),
        "redis": _normalized("REDIS_DEPLOY_PLATFORM", _CANONICAL_STACK["redis"]),
        "data": _normalized("DATA_DEPLOY_PLATFORM", _CANONICAL_STACK["data"]),
        "storage": _normalized("STORAGE_DEPLOY_PLATFORM", _CANONICAL_STACK["storage"]),
        "billing": _normalized("BILLING_BACKBONE_PROVIDER", _CANONICAL_STACK["billing"]),
    }
    explicit_platform_keys = {
        key
        for key in (
            "FRONTEND_DEPLOY_PLATFORM",
            "API_DEPLOY_PLATFORM",
            "WORKER_DEPLOY_PLATFORM",
            "REDIS_DEPLOY_PLATFORM",
            "DATA_DEPLOY_PLATFORM",
            "STORAGE_DEPLOY_PLATFORM",
            "BILLING_BACKBONE_PROVIDER",
            "PUBLIC_API_BASE_URL",
        )
        if str(env_values.get(key, "") or "").strip()
    }
    mismatches = [
        surface
        for surface, expected in _CANONICAL_STACK.items()
        if configured.get(surface) != expected
    ]
    return {
        "canonical_stack": dict(_CANONICAL_STACK),
        "configured_stack": configured,
        "matches_canonical": not mismatches,
        "mismatches": mismatches,
        "public_web_base_url": str(env_values.get("PUBLIC_WEB_BASE_URL", "") or "").strip() or None,
        "public_api_base_url": str(env_values.get("PUBLIC_API_BASE_URL", "") or "").strip() or None,
        "asset_storage_backend": str(env_values.get("ASSET_STORAGE_BACKEND", "") or "").strip().lower(),
        "state_store_backend": str(env_values.get("STATE_STORE_BACKEND", "") or "").strip().lower(),
        "explicit_platform_mode": bool(explicit_platform_keys),
    }
