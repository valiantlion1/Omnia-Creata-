from __future__ import annotations

from collections.abc import Mapping
from typing import Literal

from fastapi import FastAPI
from fastapi.routing import APIRoute

Policy = Literal["public", "authenticated", "owner", "admin"]
RoutePolicyKey = tuple[str, str]

ROUTE_POLICY: dict[RoutePolicyKey, Policy] = {
    ("GET", "/"): "public",
    ("GET", "/v1/version"): "public",
    ("GET", "/metrics"): "public",
    ("POST", "/v1/auth/demo-login"): "public",
    ("POST", "/v1/auth/local-owner-login"): "public",
    ("POST", "/v1/auth/signup"): "public",
    ("POST", "/v1/auth/login"): "public",
    ("GET", "/v1/public/plans"): "public",
    ("GET", "/v1/auth/me"): "public",
    ("GET", "/v1/healthz"): "public",
    ("GET", "/v1/healthz/ready"): "public",
    ("GET", "/v1/healthz/startup"): "public",
    ("GET", "/v1/models"): "public",
    ("GET", "/v1/presets"): "public",
    ("GET", "/v1/public/posts"): "public",
    ("GET", "/v1/public/export"): "public",
    ("GET", "/v1/profiles/{username}"): "public",
    ("GET", "/v1/assets/{asset_id}/content"): "public",
    ("GET", "/v1/assets/{asset_id}/thumbnail"): "public",
    ("GET", "/v1/assets/{asset_id}/preview"): "public",
    ("GET", "/v1/assets/{asset_id}/blocked-preview"): "public",
    ("GET", "/v1/shares/public/{token}"): "public",
    ("POST", "/v1/webhooks/paddle"): "public",
    ("POST", "/v1/webhooks/lemonsqueezy"): "public",
    ("POST", "/v1/prompts/improve"): "authenticated",
    ("GET", "/v1/personas"): "authenticated",
    ("POST", "/v1/personas"): "authenticated",
    ("GET", "/v1/projects"): "authenticated",
    ("POST", "/v1/projects"): "authenticated",
    ("GET", "/v1/projects/{project_id}"): "authenticated",
    ("POST", "/v1/projects/{project_id}/export"): "authenticated",
    ("PATCH", "/v1/projects/{project_id}"): "authenticated",
    ("DELETE", "/v1/projects/{project_id}"): "authenticated",
    ("GET", "/v1/profiles/me"): "authenticated",
    ("GET", "/v1/profiles/me/favorites"): "authenticated",
    ("GET", "/v1/profiles/me/export"): "authenticated",
    ("DELETE", "/v1/profiles/me"): "authenticated",
    ("PATCH", "/v1/profiles/me"): "authenticated",
    ("GET", "/v1/conversations"): "authenticated",
    ("POST", "/v1/conversations"): "authenticated",
    ("GET", "/v1/conversations/{conversation_id}"): "authenticated",
    ("DELETE", "/v1/conversations/{conversation_id}"): "authenticated",
    ("POST", "/v1/conversations/{conversation_id}/messages"): "authenticated",
    ("PATCH", "/v1/conversations/{conversation_id}/messages/{message_id}"): "authenticated",
    ("POST", "/v1/conversations/{conversation_id}/messages/{message_id}/regenerate"): "authenticated",
    ("POST", "/v1/conversations/{conversation_id}/messages/{message_id}/revert"): "authenticated",
    ("PATCH", "/v1/conversations/{conversation_id}/messages/{message_id}/feedback"): "authenticated",
    ("GET", "/v1/generations"): "authenticated",
    ("POST", "/v1/generations"): "authenticated",
    ("GET", "/v1/generations/{generation_id}"): "authenticated",
    ("DELETE", "/v1/generations/{generation_id}"): "authenticated",
    ("GET", "/v1/assets"): "authenticated",
    ("POST", "/v1/assets/import"): "authenticated",
    ("PATCH", "/v1/assets/{asset_id}"): "authenticated",
    ("DELETE", "/v1/assets/{asset_id}"): "authenticated",
    ("POST", "/v1/assets/{asset_id}/restore"): "authenticated",
    ("DELETE", "/v1/assets/{asset_id}/permanent"): "authenticated",
    ("POST", "/v1/assets/trash/empty"): "authenticated",
    ("GET", "/v1/assets/{asset_id}/clean-export"): "authenticated",
    ("PATCH", "/v1/posts/{post_id}"): "authenticated",
    ("POST", "/v1/posts/{post_id}/move"): "authenticated",
    ("POST", "/v1/posts/{post_id}/trash"): "authenticated",
    ("POST", "/v1/posts/{post_id}/like"): "authenticated",
    ("DELETE", "/v1/posts/{post_id}/like"): "authenticated",
    ("POST", "/v1/posts/{post_id}/report"): "authenticated",
    ("POST", "/v1/moderation/appeals"): "authenticated",
    ("POST", "/v1/shares"): "authenticated",
    ("GET", "/v1/shares"): "authenticated",
    ("DELETE", "/v1/shares/{share_id}"): "authenticated",
    ("GET", "/v1/billing/summary"): "authenticated",
    ("GET", "/v1/styles"): "authenticated",
    ("POST", "/v1/styles"): "authenticated",
    ("POST", "/v1/styles/from-prompt"): "authenticated",
    ("PATCH", "/v1/styles/{style_id}"): "authenticated",
    ("DELETE", "/v1/styles/{style_id}"): "authenticated",
    ("GET", "/v1/prompt-memory"): "authenticated",
    ("POST", "/v1/billing/checkout"): "authenticated",
    ("GET", "/v1/settings/bootstrap"): "authenticated",
    ("POST", "/v1/settings/sessions/end-others"): "authenticated",
    ("GET", "/v1/healthz/detail"): "owner",
    ("GET", "/v1/admin/moderation/cases"): "owner",
    ("PATCH", "/v1/admin/moderation/cases/{case_id}"): "owner",
    ("GET", "/v1/admin/telemetry"): "admin",
}

_EXCLUDED_PATHS = frozenset({"/docs", "/redoc", "/openapi.json"})


def iter_registered_route_keys(app: FastAPI) -> list[RoutePolicyKey]:
    keys: list[RoutePolicyKey] = []
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path in _EXCLUDED_PATHS:
            continue
        if route.path.startswith("/__tests/"):
            continue
        for method in sorted(route.methods or ()):
            if method in {"HEAD", "OPTIONS"}:
                continue
            keys.append((method.upper(), route.path))
    return keys


def missing_route_policies(
    app: FastAPI,
    *,
    route_policy: Mapping[RoutePolicyKey, Policy] | None = None,
) -> list[RoutePolicyKey]:
    coverage = route_policy or ROUTE_POLICY
    return [key for key in iter_registered_route_keys(app) if key not in coverage]


def validate_route_policy_coverage(
    app: FastAPI,
    *,
    route_policy: Mapping[RoutePolicyKey, Policy] | None = None,
) -> None:
    missing = missing_route_policies(app, route_policy=route_policy)
    if not missing:
        return
    rendered = ", ".join(f"{method} {path}" for method, path in missing)
    raise RuntimeError(f"Studio route auth policy coverage missing: {rendered}")
