from __future__ import annotations

import logging
from typing import Any, Callable, Mapping

from config.env import Environment, Settings

from .deployment_stack_ops import build_deployment_stack_summary
from .contract_catalog import build_contract_freeze_summary
from .models import ManualReviewState, StudioState, utc_now
from .operator_control_plane_ops import build_owner_ai_control_plane
from .services.deployment_verification import load_deployment_verification_report
from .services.launch_readiness import (
    build_launch_readiness_report,
    build_runtime_log_snapshot,
    load_provider_smoke_report,
    load_startup_verification_report,
)
from .services.provider_economics_dossier import persist_provider_economics_dossier

logger = logging.getLogger(__name__)


def _redacted_owner_error_detail(exc: Exception) -> str:
    error_type = exc.__class__.__name__ if exc.__class__.__name__ else "RuntimeError"
    return (
        "Exact failure details are redacted from the owner-health payload. "
        f"Error type={error_type}. Check runtime logs for full context."
    )


def _build_owner_detail_error_payload(*, summary: str, exc: Exception) -> dict[str, str]:
    return {
        "status": "error",
        "summary": summary,
        "detail": _redacted_owner_error_detail(exc),
    }


def _build_launch_readiness_fallback(*, error_payload: Mapping[str, Any]) -> dict[str, Any]:
    check = {
        "key": "launch_readiness_runtime",
        "status": "blocked",
        "summary": str(error_payload.get("summary") or "Launch readiness truth is unavailable."),
        "detail": str(error_payload.get("detail") or "Launch readiness report failed to build."),
    }
    blocking_reason = f"{check['key']}: {check['summary']}"
    return {
        "status": "blocked",
        "summary": check["summary"],
        "checks": [check],
        "operator_checklists": {
            "signed_in_happy_path": [
                {
                    "id": "auth_me",
                    "path": "/v1/auth/me",
                    "goal": "Confirm the session resolves and identity bootstraps cleanly.",
                },
                {
                    "id": "settings_bootstrap",
                    "path": "/v1/settings/bootstrap",
                    "goal": "Confirm shell payload, draft projects, styles, prompt memory, and entitlements stay canonical.",
                },
                {
                    "id": "projects",
                    "path": "/v1/projects",
                    "goal": "Confirm user-managed projects list cleanly and system-managed drafts stay hidden.",
                },
                {
                    "id": "assets",
                    "path": "/v1/assets",
                    "goal": "Confirm private assets serialize with canonical library and protection fields.",
                },
                {
                    "id": "health_detail",
                    "path": "/v1/healthz/detail",
                    "goal": "Confirm owner truth exposes launch gate, provider truth, and artefact sync.",
                },
            ],
            "private_assets_happy_path": [
                {
                    "id": "asset_preview",
                    "path": "/v1/assets/{asset_id}/preview",
                    "goal": "Protected preview delivery should stay renderable for owned assets.",
                },
                {
                    "id": "asset_clean_export",
                    "path": "/v1/assets/{asset_id}/clean-export",
                    "goal": "Clean export should remain owner-gated and attachment-only.",
                },
                {
                    "id": "project_export",
                    "path": "/v1/projects/{project_id}/export",
                    "goal": "Project export should remain explicit and authenticated.",
                },
            ],
        },
        "launch_gate": {
            "status": "blocked",
            "summary": check["summary"],
            "ready_for_protected_launch": False,
            "blocking_keys": [check["key"]],
            "warning_keys": [],
            "blocking_reasons": [blocking_reason],
            "warning_reasons": [],
            "last_verified_build": None,
        },
        "provider_truth": {
            "status": "blocked",
            "summary": check["summary"],
            "chat": {"status": "blocked", "summary": check["summary"]},
            "image": {"status": "blocked", "summary": check["summary"]},
            "economics": {"status": "warning", "summary": "Launch economics truth unavailable while readiness is degraded."},
            "public_paid_usage_safe": False,
        },
        "platform_readiness": {
            "status": "blocked",
            "current_stage": "protected_beta",
            "next_stage": "protected_beta",
            "phases": [],
        },
        "truth_sync": {
            "all_present": False,
            "all_current_build": False,
            "current_build": None,
            "warning_artifacts": [check["key"]],
        },
    }


def _build_ai_control_plane_fallback(
    *,
    settings: Settings,
    chat_routing: Mapping[str, Any],
    generation_routing: Mapping[str, Any],
    error_payload: Mapping[str, Any],
) -> dict[str, Any]:
    return {
        "status": "error",
        "summary": str(error_payload.get("summary") or "AI control plane is unavailable."),
        "detail": str(error_payload.get("detail") or "AI control plane failed to build."),
        "contract_freeze": build_contract_freeze_summary(),
        "protected_beta_policy": {
            "chat_provider": settings.protected_beta_chat_provider,
            "image_provider": settings.protected_beta_image_provider,
            "image_final_lane_required": bool(settings.protected_beta_image_require_final_lane),
        },
        "operator_policy": {
            "protected_beta_lock_is_temporary": True,
            "public_paid_provider_strategy_locked": False,
            "current_operator_source": "ai_control_plane.surface_matrix",
        },
        "chat": {
            "primary_provider": settings.chat_primary_provider,
            "fallback_provider": settings.chat_fallback_provider,
            "providers": [],
            "multimodal_policy": chat_routing.get("multimodal_policy"),
        },
        "image": {
            "default_strategy": generation_routing.get("default_strategy"),
            "protected_beta_provider": settings.protected_beta_image_provider,
            "openai": {},
        },
        "surface_matrix": [],
        "studio_models": [],
    }


def _is_expected_local_generation_broker_fallback(
    *,
    settings: Settings,
    generation_runtime_mode: str,
    generation_broker_degraded_reason: str | None,
) -> bool:
    if settings.environment != Environment.DEVELOPMENT:
        return False
    if generation_runtime_mode not in {"all", "web"}:
        return False
    return generation_broker_degraded_reason in {
        "redis_unavailable_fallback_local_queue",
        "web_runtime_local_fallback_no_shared_broker",
    }


def derive_overall_health_status(
    *,
    settings: Settings,
    provider_status: list[dict[str, Any]],
    generation_runtime_mode: str,
    generation_broker_degraded_reason: str | None,
) -> str:
    degraded_states = {"degraded", "unavailable", "error"}
    overall = "degraded" if any(provider.get("status") in degraded_states for provider in provider_status) else "healthy"
    if generation_broker_degraded_reason is not None and not _is_expected_local_generation_broker_fallback(
        settings=settings,
        generation_runtime_mode=generation_runtime_mode,
        generation_broker_degraded_reason=generation_broker_degraded_reason,
    ):
        return "degraded"
    return overall


def load_owner_health_artifacts(settings: Settings) -> dict[str, Any]:
    return {
        "provider_smoke": load_provider_smoke_report(settings),
        "startup_verification": load_startup_verification_report(settings),
        "deployment_verification": load_deployment_verification_report(settings),
        "runtime_logs": build_runtime_log_snapshot(settings),
    }


async def load_owner_security_summary(store) -> dict[str, int]:
    def query(state: StudioState) -> dict[str, int]:
        now = utc_now()
        temp_blocked = sum(
            1
            for identity in state.identities.values()
            if identity.temp_block_until is not None and identity.temp_block_until > now
        )
        manual_review_required = sum(
            1
            for identity in state.identities.values()
            if identity.manual_review_state == ManualReviewState.REQUIRED
        )
        active_shares = sum(1 for share in state.shares.values() if share.revoked_at is None)
        revoked_shares = sum(1 for share in state.shares.values() if share.revoked_at is not None)
        deleted_identity_tombstones = len(state.deleted_identity_tombstones)
        return {
            "temp_blocked_identities": temp_blocked,
            "manual_review_required_identities": manual_review_required,
            "active_shares": active_shares,
            "revoked_shares": revoked_shares,
            "deleted_identity_tombstones": deleted_identity_tombstones,
        }

    return await store.read(query)


async def build_owner_health_detail_extensions(
    *,
    store,
    settings: Settings,
    providers,
    llm_gateway,
    generation_routing: Mapping[str, Any],
    chat_routing: Mapping[str, Any],
    provider_status: list[dict[str, Any]],
    data_authority: Mapping[str, Any],
    generation_runtime_mode: str,
    generation_broker_payload: Mapping[str, Any],
    build_provider_spend_guardrails_summary,
    build_cost_telemetry_summary,
    build_public_plan_payload: Callable[[], Mapping[str, Any]],
) -> dict[str, Any]:
    security_summary = await load_owner_security_summary(store)
    operator_artifacts = load_owner_health_artifacts(settings)
    provider_smoke_report = operator_artifacts["provider_smoke"]
    startup_verification_report = operator_artifacts["startup_verification"]
    deployment_verification_report = operator_artifacts["deployment_verification"]
    runtime_logs = operator_artifacts["runtime_logs"]
    provider_spend_guardrails: dict[str, Any]
    try:
        provider_spend_guardrails = await build_provider_spend_guardrails_summary()
    except Exception as exc:  # pragma: no cover - exercised through caller behavior tests
        logger.warning("Owner health detail provider spend guardrails failed: %s", exc)
        provider_spend_guardrails = _build_owner_detail_error_payload(
            summary="Provider spend guardrails are unavailable.",
            exc=exc,
        )

    cost_telemetry: dict[str, Any] | None
    try:
        cost_telemetry = await build_cost_telemetry_summary()
    except Exception as exc:  # pragma: no cover - exercised through caller behavior tests
        logger.warning("Owner health detail cost telemetry failed: %s", exc)
        cost_telemetry = _build_owner_detail_error_payload(
            summary="Cost telemetry is unavailable.",
            exc=exc,
        )

    economics_dossier: dict[str, Any] | None
    try:
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=build_public_plan_payload(),
        )
    except Exception as exc:  # pragma: no cover - exercised through caller behavior tests
        logger.warning("Owner health detail economics dossier failed: %s", exc)
        economics_dossier = _build_owner_detail_error_payload(
            summary="Provider economics dossier is unavailable.",
            exc=exc,
        )

    try:
        ai_control_plane = build_owner_ai_control_plane(
            settings=settings,
            providers=providers,
            llm_gateway=llm_gateway,
            chat_routing=chat_routing,
            generation_routing=generation_routing,
        )
    except Exception as exc:  # pragma: no cover - exercised through caller behavior tests
        logger.warning("Owner health detail AI control plane failed: %s", exc)
        ai_control_plane = _build_ai_control_plane_fallback(
            settings=settings,
            chat_routing=chat_routing,
            generation_routing=generation_routing,
            error_payload=_build_owner_detail_error_payload(
                summary="AI control plane is unavailable.",
                exc=exc,
            ),
        )

    try:
        launch_readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=provider_status,
            data_authority=dict(data_authority),
            generation_runtime_mode=generation_runtime_mode,
            generation_broker=dict(generation_broker_payload),
            chat_routing=dict(chat_routing),
            provider_smoke_report=provider_smoke_report,
            startup_verification_report=startup_verification_report,
            deployment_verification_report=deployment_verification_report,
            runtime_logs=runtime_logs,
            cost_telemetry=cost_telemetry,
            economics_dossier=economics_dossier,
        )
    except Exception as exc:  # pragma: no cover - exercised through caller behavior tests
        logger.warning("Owner health detail launch readiness failed: %s", exc)
        launch_readiness = _build_launch_readiness_fallback(
            error_payload=_build_owner_detail_error_payload(
                summary="Launch readiness truth is unavailable.",
                exc=exc,
            )
        )
    return {
        "security_summary": security_summary,
        "provider_smoke_report": provider_smoke_report,
        "startup_verification_report": startup_verification_report,
        "deployment_verification_report": deployment_verification_report,
        "runtime_logs": runtime_logs,
        "deployment_stack": build_deployment_stack_summary(settings),
        "provider_spend_guardrails": provider_spend_guardrails,
        "cost_telemetry": cost_telemetry,
        "provider_economics_dossier": economics_dossier,
        "ai_control_plane": ai_control_plane,
        "launch_readiness": launch_readiness,
    }


def build_generation_broker_payload(
    *,
    settings: Settings,
    generation_runtime_mode: str,
    generation_broker,
    shared_queue_configured: bool,
    generation_broker_degraded_reason: str | None,
    broker_metrics: dict[str, Any] | None,
    claimed_count: int,
) -> dict[str, Any]:
    advisory_fallback = _is_expected_local_generation_broker_fallback(
        settings=settings,
        generation_runtime_mode=generation_runtime_mode,
        generation_broker_degraded_reason=generation_broker_degraded_reason,
    )
    return {
        "enabled": generation_broker is not None,
        "configured": shared_queue_configured,
        "degraded": generation_broker_degraded_reason is not None and not advisory_fallback,
        "advisory": advisory_fallback,
        "detail": generation_broker_degraded_reason
        or ("shared_queue_active" if generation_broker is not None else "local_queue_only"),
        "kind": generation_broker.__class__.__name__ if generation_broker is not None else None,
        "queued_by_priority": broker_metrics,
        "claimed": claimed_count,
    }


def build_owner_health_payload(
    *,
    overall_status: str,
    provider_status: list[dict[str, Any]],
    counts: Mapping[str, Any],
    generation_runtime_mode: str,
    generation_queue: Mapping[str, Any],
    generation_broker_payload: Mapping[str, Any],
    worker_id: str,
    worker_processing_active: bool,
    generation_routing: Mapping[str, Any],
    chat_routing: Mapping[str, Any],
    data_authority: Mapping[str, Any],
    security_summary: Mapping[str, Any] | None = None,
    provider_smoke_report: Mapping[str, Any] | None = None,
    startup_verification_report: Mapping[str, Any] | None = None,
    deployment_verification_report: Mapping[str, Any] | None = None,
    runtime_logs: Mapping[str, Any] | None = None,
    deployment_stack: Mapping[str, Any] | None = None,
    provider_spend_guardrails: Mapping[str, Any] | None = None,
    cost_telemetry: Mapping[str, Any] | None = None,
    provider_economics_dossier: Mapping[str, Any] | None = None,
    ai_control_plane: Mapping[str, Any] | None = None,
    launch_readiness: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "status": overall_status,
        "providers": provider_status,
        "counts": counts,
        "generation_runtime_mode": generation_runtime_mode,
        "generation_queue": generation_queue,
        "generation_broker": dict(generation_broker_payload),
        "generation_worker": {
            "id": worker_id,
            "processing_active": worker_processing_active,
        },
        "generation_routing": dict(generation_routing),
        "chat_routing": dict(chat_routing),
        "data_authority": dict(data_authority),
    }
    if security_summary is not None:
        payload["security_summary"] = dict(security_summary)
    if provider_smoke_report is not None:
        payload["provider_smoke"] = dict(provider_smoke_report)
    if startup_verification_report is not None:
        payload["startup_verification"] = dict(startup_verification_report)
    if deployment_verification_report is not None:
        payload["deployment_verification"] = dict(deployment_verification_report)
    if runtime_logs is not None:
        payload["runtime_logs"] = dict(runtime_logs)
    if deployment_stack is not None:
        payload["deployment_stack"] = dict(deployment_stack)
    if provider_spend_guardrails is not None:
        payload["provider_spend_guardrails"] = dict(provider_spend_guardrails)
    if cost_telemetry is not None:
        payload["cost_telemetry"] = dict(cost_telemetry)
    if provider_economics_dossier is not None:
        payload["provider_economics_dossier"] = dict(provider_economics_dossier)
    if ai_control_plane is not None:
        payload["ai_control_plane"] = dict(ai_control_plane)
    if launch_readiness is not None:
        payload["launch_readiness"] = dict(launch_readiness)
        launch_gate = launch_readiness.get("launch_gate")
        if isinstance(launch_gate, dict):
            payload["launch_gate"] = launch_gate
        provider_truth = launch_readiness.get("provider_truth")
        if isinstance(provider_truth, dict):
            payload["provider_truth"] = provider_truth
        platform_readiness = launch_readiness.get("platform_readiness")
        if isinstance(platform_readiness, dict):
            payload["platform_readiness"] = platform_readiness
        truth_sync = launch_readiness.get("truth_sync")
        if isinstance(truth_sync, dict):
            payload["truth_sync"] = truth_sync
    return payload
