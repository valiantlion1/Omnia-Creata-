"""Provider truth evaluation for launch readiness.

Extracted from launch_readiness.py to isolate provider classification,
smoke lookup, and truth building logic into a focused module.

All functions are pure: they accept settings/data and return dicts.
No side effects, no file I/O, no persistence.
"""
from __future__ import annotations

from typing import Any

from config.env import Settings, has_configured_secret

from ..versioning import load_version_info

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CHAT_LAUNCH_GRADE_PROVIDERS = frozenset({"gemini", "openrouter", "openai"})
IMAGE_LAUNCH_GRADE_PROVIDERS = frozenset({"openai", "fal", "runware"})
IMAGE_FALLBACK_ONLY_PROVIDERS = frozenset({"huggingface", "pollinations"})
IMAGE_DEGRADED_ONLY_PROVIDERS = frozenset({"demo"})

# ---------------------------------------------------------------------------
# Protected-beta provider helpers
# ---------------------------------------------------------------------------


def _protected_beta_chat_provider(settings: Settings) -> str:
    value = str(getattr(settings, "protected_beta_chat_provider", "gemini") or "").strip().lower()
    if value in CHAT_LAUNCH_GRADE_PROVIDERS:
        return value
    return "gemini"


def _protected_beta_image_provider(settings: Settings) -> str:
    value = str(getattr(settings, "protected_beta_image_provider", "runware") or "").strip().lower()
    if value in IMAGE_LAUNCH_GRADE_PROVIDERS:
        return value
    return "runware"


def protected_beta_requires_final_image_lane(settings: Settings) -> bool:
    return bool(getattr(settings, "protected_beta_image_require_final_lane", False))


# ---------------------------------------------------------------------------
# Smoke surface inference (shared with smoke persistence)
# ---------------------------------------------------------------------------


def infer_smoke_surface(result: dict[str, Any]) -> str:
    surface = str(result.get("surface") or "").strip().lower()
    if surface in {"chat", "image"}:
        return surface
    workflow = str(result.get("workflow") or "").strip().lower()
    if workflow == "chat":
        return "chat"
    return "image"


# ---------------------------------------------------------------------------
# Smoke state helpers
# ---------------------------------------------------------------------------


def build_provider_smoke_lookup(
    report: dict[str, Any] | None,
) -> dict[tuple[str, str], dict[str, Any]]:
    if not isinstance(report, dict):
        return {}
    results = report.get("results")
    if not isinstance(results, list):
        return {}
    current_build = load_version_info().build
    report_build = str(report.get("build") or "").strip()
    recorded_at = str(report.get("recorded_at") or "").strip()
    lookup: dict[tuple[str, str], dict[str, Any]] = {}
    for result in results:
        if not isinstance(result, dict):
            continue
        provider = str(result.get("provider_name") or "").strip().lower()
        if not provider:
            continue
        surface = infer_smoke_surface(result)
        key = (surface, provider)
        entry = lookup.setdefault(
            key,
            {
                "surface": surface,
                "provider": provider,
                "recorded_at": recorded_at or None,
                "build": report_build or None,
                "current_build_match": bool(report_build and current_build and report_build == current_build),
                "ok_count": 0,
                "expected_failure_count": 0,
                "skipped_count": 0,
                "error_count": 0,
                "statuses": [],
                "labels": [],
                "models": [],
                "lanes": [],
                "lane_ok": {},
                "lane_error": {},
                "last_error": None,
                "last_error_type": None,
                "successful_probe": False,
                "hard_error": False,
                "status": "unknown",
            },
        )
        status = str(result.get("status") or "").strip().lower() or "unknown"
        entry["status"] = status
        if status == "ok":
            entry["ok_count"] += 1
            entry["successful_probe"] = True
        elif status == "expected_failure":
            entry["expected_failure_count"] += 1
        elif status == "skipped":
            entry["skipped_count"] += 1
        elif status == "error":
            entry["error_count"] += 1
            entry["hard_error"] = True
        if status not in entry["statuses"]:
            entry["statuses"].append(status)
        label = str(result.get("label") or "").strip()
        if label and label not in entry["labels"]:
            entry["labels"].append(label)
        model = str(result.get("model") or "").strip()
        if model and model not in entry["models"]:
            entry["models"].append(model)
        lane = str(result.get("lane") or "").strip().lower()
        if lane:
            if lane not in entry["lanes"]:
                entry["lanes"].append(lane)
            lane_ok = entry.setdefault("lane_ok", {})
            lane_error = entry.setdefault("lane_error", {})
            lane_ok[lane] = bool(lane_ok.get(lane)) or status == "ok"
            lane_error[lane] = bool(lane_error.get(lane)) or status == "error"
        if result.get("error") is not None:
            entry["last_error"] = result.get("error")
        if result.get("error_type") is not None:
            entry["last_error_type"] = result.get("error_type")
    return lookup


def _smoke_state_for_provider(
    *,
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
    surface: str,
    provider: str,
) -> dict[str, Any] | None:
    state = smoke_lookup.get((surface, provider))
    return dict(state) if isinstance(state, dict) else None


def _smoke_verified_for_current_build(smoke: dict[str, Any] | None) -> bool:
    return bool(
        smoke
        and smoke.get("current_build_match")
        and int(smoke.get("ok_count") or 0) > 0
    )


def _smoke_has_current_build_error(smoke: dict[str, Any] | None) -> bool:
    return bool(
        smoke
        and smoke.get("current_build_match")
        and int(smoke.get("error_count") or 0) > 0
    )


def _smoke_lane_verified_for_current_build(smoke: dict[str, Any] | None, *, lane: str) -> bool:
    normalized_lane = lane.strip().lower()
    if not normalized_lane or not smoke or smoke.get("current_build_match") is not True:
        return False
    lane_ok = smoke.get("lane_ok") if isinstance(smoke.get("lane_ok"), dict) else {}
    return lane_ok.get(normalized_lane) is True


# ---------------------------------------------------------------------------
# Spend helpers
# ---------------------------------------------------------------------------


def build_provider_spend_lookup(cost_telemetry: dict[str, Any] | None) -> dict[str, float]:
    if not isinstance(cost_telemetry, dict):
        return {}
    providers = cost_telemetry.get("providers")
    if not isinstance(providers, list):
        return {}
    lookup: dict[str, float] = {}
    for item in providers:
        if not isinstance(item, dict):
            continue
        provider = str(item.get("provider") or "").strip().lower()
        if not provider:
            continue
        try:
            lookup[provider] = float(item.get("total_spend_usd") or 0.0)
        except (TypeError, ValueError):
            lookup[provider] = 0.0
    return lookup


# ---------------------------------------------------------------------------
# Chat provider helpers
# ---------------------------------------------------------------------------


def chat_provider_is_configured(*, settings: Settings, provider: str) -> bool:
    normalized = provider.strip().lower()
    if normalized == "gemini":
        return has_configured_secret(settings.gemini_api_key)
    if normalized == "openrouter":
        return has_configured_secret(settings.openrouter_api_key)
    if normalized == "openai":
        return has_configured_secret(settings.openai_api_key)
    return False


def _chat_provider_default_model(*, settings: Settings, provider: str) -> str | None:
    normalized = provider.strip().lower()
    if normalized == "gemini":
        return str(settings.gemini_model or "").strip() or None
    if normalized == "openrouter":
        return str(settings.openrouter_model or "").strip() or None
    if normalized == "openai":
        return str(settings.openai_model or "").strip() or None
    return None


def _chat_provider_premium_model(*, settings: Settings, provider: str) -> str | None:
    normalized = provider.strip().lower()
    if normalized == "gemini":
        return str(settings.gemini_premium_model or "").strip() or None
    if normalized == "openrouter":
        return str(settings.openrouter_premium_model or "").strip() or None
    if normalized == "openai":
        return str(settings.openai_premium_model or "").strip() or None
    return None


def _chat_model_quality_profile(model: str | None) -> str:
    normalized = str(model or "").strip().lower()
    if not normalized:
        return "unknown"
    if "flash" in normalized or "mini" in normalized:
        return "latency_optimized"
    if "pro" in normalized or "gpt-5" in normalized:
        return "premium_reasoning"
    return "balanced_generalist"


def chat_provider_service_tier(*, settings: Settings, provider: str) -> str:
    normalized = provider.strip().lower()
    if normalized == "gemini":
        return str(settings.gemini_service_tier or "free").strip().lower() or "free"
    if normalized == "openrouter":
        return str(settings.openrouter_service_tier or "paid").strip().lower() or "paid"
    if normalized == "openai":
        return str(settings.openai_service_tier or "paid").strip().lower() or "paid"
    return "paid"


def chat_provider_counts_as_launch_grade(*, settings: Settings, provider: str) -> bool:
    normalized = provider.strip().lower()
    if normalized not in CHAT_LAUNCH_GRADE_PROVIDERS:
        return False
    return chat_provider_service_tier(settings=settings, provider=normalized) == "paid"


# ---------------------------------------------------------------------------
# Image provider helpers
# ---------------------------------------------------------------------------


def image_provider_counts_as_launch_grade(*, settings: Settings, provider: str) -> bool:
    normalized = provider.strip().lower()
    if normalized not in IMAGE_LAUNCH_GRADE_PROVIDERS:
        return False
    return normalized == _protected_beta_image_provider(settings)


def _image_lane_class(*, settings: Settings, provider: str) -> str:
    if image_provider_counts_as_launch_grade(settings=settings, provider=provider):
        return "launch_grade"
    if provider in IMAGE_LAUNCH_GRADE_PROVIDERS:
        return "managed_backup"
    if provider in IMAGE_FALLBACK_ONLY_PROVIDERS:
        return "fallback_only"
    return "degraded_only"


# ---------------------------------------------------------------------------
# Classification helpers
# ---------------------------------------------------------------------------


def _classify_launch_provider_state(
    *,
    configured: bool,
    runtime_available: bool,
    launch_grade: bool,
) -> str:
    if launch_grade:
        if not configured:
            return "blocked"
        if runtime_available:
            return "pass"
        return "warning"
    if not configured:
        return "pass"
    if runtime_available:
        return "warning"
    return "warning"


# ---------------------------------------------------------------------------
# Format helpers (shared with launch_readiness smoke checks)
# ---------------------------------------------------------------------------


def format_chat_provider_state(provider_name: str, payload: dict[str, Any]) -> str:
    status = str(payload.get("status") or "unknown").strip().lower()
    status_code = payload.get("last_status_code")
    reason = str(payload.get("last_failure_reason") or "").strip()
    if status_code:
        return f"{provider_name}:{status} ({status_code}, {reason or 'failure'})"
    if reason:
        return f"{provider_name}:{status} ({reason})"
    return f"{provider_name}:{status}"


# ---------------------------------------------------------------------------
# Provider state serialization
# ---------------------------------------------------------------------------


def _serialize_chat_provider_state(
    *,
    settings: Settings,
    provider_name: str,
    payload: dict[str, Any],
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    configured = payload.get("configured") is True
    status = str(payload.get("status") or "").strip().lower() or ("healthy" if configured else "not_configured")
    cooldown_remaining_seconds = int(payload.get("cooldown_remaining_seconds") or 0)
    service_tier = chat_provider_service_tier(settings=settings, provider=provider_name)
    launch_grade = chat_provider_counts_as_launch_grade(settings=settings, provider=provider_name)
    smoke = _smoke_state_for_provider(smoke_lookup=smoke_lookup, surface="chat", provider=provider_name)
    smoke_failed = _smoke_has_current_build_error(smoke)
    smoke_verified_for_current_build = _smoke_verified_for_current_build(smoke)
    runtime_available = configured and status == "healthy" and not smoke_failed
    healthy_for_launch = runtime_available and smoke_verified_for_current_build and launch_grade
    launch_classification = _classify_launch_provider_state(
        configured=configured,
        runtime_available=healthy_for_launch,
        launch_grade=launch_grade,
    )
    return {
        "provider": provider_name,
        "lane_class": "launch_grade" if launch_grade else "limited_free_tier",
        "launch_grade": launch_grade,
        "service_tier": service_tier,
        "credential_present": configured,
        "configured": configured,
        "status": status,
        "detail": f"{format_chat_provider_state(provider_name, payload)} [tier={service_tier}]",
        "runtime_available": runtime_available,
        "healthy_for_launch": healthy_for_launch,
        "smoke_verified_for_current_build": smoke_verified_for_current_build,
        "launch_classification": launch_classification,
        "cooldown": {
            "active": status == "cooldown" or cooldown_remaining_seconds > 0,
            "remaining_seconds": cooldown_remaining_seconds,
            "consecutive_failures": int(payload.get("consecutive_failures") or 0),
        },
        "recent_failure_state": {
            "last_failure_reason": payload.get("last_failure_reason"),
            "last_status_code": payload.get("last_status_code"),
            "last_error_class": payload.get("last_error_class"),
            "last_failure_at": payload.get("last_failure_at"),
            "last_success_at": payload.get("last_success_at"),
        },
        "smoke": smoke,
    }


def _serialize_image_provider_state(
    payload: dict[str, Any] | None,
    *,
    provider: str,
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
    settings: Settings,
) -> dict[str, Any]:
    launch_grade = image_provider_counts_as_launch_grade(settings=settings, provider=provider)
    if not isinstance(payload, dict):
        smoke = _smoke_state_for_provider(smoke_lookup=smoke_lookup, surface="image", provider=provider)
        return {
            "provider": provider,
            "lane_class": _image_lane_class(settings=settings, provider=provider),
            "launch_grade": launch_grade,
            "credential_present": False,
            "configured": False,
            "status": "not_configured",
            "detail": f"{provider}:not_configured",
            "runtime_available": False,
            "healthy_for_launch": False,
            "launch_classification": _classify_launch_provider_state(
                configured=False,
                runtime_available=False,
                launch_grade=launch_grade,
            ),
            "circuit_breaker": {
                "state": "closed",
                "consecutive_failures": 0,
                "retry_after_seconds": 0,
                "last_error": None,
            },
            "recent_failure_state": {
                "last_error": None,
                "last_status_code": None,
                "last_failure_reason": None,
                "success_rate_last_5m": None,
            },
            "smoke": smoke,
        }
    status = str(payload.get("status") or "").strip().lower() or "unknown"
    configured = status != "not_configured"
    detail = f"{provider}:{status}"
    detail_suffix = str(payload.get("detail") or "").strip()
    if detail_suffix:
        detail = f"{detail} ({detail_suffix})"
    circuit_breaker = payload.get("circuit_breaker") if isinstance(payload.get("circuit_breaker"), dict) else {}
    smoke = _smoke_state_for_provider(smoke_lookup=smoke_lookup, surface="image", provider=provider)
    smoke_failed = _smoke_has_current_build_error(smoke)
    smoke_verified_for_current_build = _smoke_verified_for_current_build(smoke)
    runtime_available = status == "healthy" and not smoke_failed
    healthy_for_launch = (
        configured
        and runtime_available
        and launch_grade
        and smoke_verified_for_current_build
    )
    launch_classification = _classify_launch_provider_state(
        configured=configured,
        runtime_available=healthy_for_launch,
        launch_grade=launch_grade,
    )
    return {
        "provider": provider,
        "lane_class": _image_lane_class(settings=settings, provider=provider),
        "launch_grade": launch_grade,
        "credential_present": configured,
        "configured": configured,
        "status": status,
        "detail": detail,
        "runtime_available": runtime_available,
        "healthy_for_launch": healthy_for_launch,
        "smoke_verified_for_current_build": smoke_verified_for_current_build,
        "launch_classification": launch_classification,
        "circuit_breaker": {
            "state": str(circuit_breaker.get("state") or "closed").strip().lower() or "closed",
            "consecutive_failures": int(circuit_breaker.get("consecutive_failures") or 0),
            "retry_after_seconds": int(circuit_breaker.get("retry_after_seconds") or 0),
            "last_error": circuit_breaker.get("last_error"),
        },
        "recent_failure_state": {
            "last_error": circuit_breaker.get("last_error"),
            "last_status_code": None,
            "last_failure_reason": None,
            "success_rate_last_5m": payload.get("success_rate_last_5m"),
        },
        "smoke": smoke,
    }


def _build_chat_provider_comparison_entry(
    *,
    settings: Settings,
    provider_state: dict[str, Any],
    primary_provider: str,
    fallback_provider: str,
    recent_spend_usd: float,
) -> dict[str, Any]:
    provider_name = str(provider_state.get("provider") or "").strip().lower()
    current_status = str(provider_state.get("status") or "unknown").strip().lower() or "unknown"
    smoke = provider_state.get("smoke") if isinstance(provider_state.get("smoke"), dict) else None
    smoke_status = "verified" if _smoke_verified_for_current_build(smoke) else "error" if _smoke_has_current_build_error(smoke) else "unverified"
    configured = provider_state.get("configured") is True
    recent_failure = provider_state.get("recent_failure_state") if isinstance(provider_state.get("recent_failure_state"), dict) else {}
    risk_flags: list[str] = []
    if not configured:
        risk_flags.append("not_configured")
    if current_status == "cooldown":
        risk_flags.append("cooldown")
    if _smoke_has_current_build_error(smoke):
        risk_flags.append("current_build_smoke_error")
    if configured and provider_state.get("healthy_for_launch") is not True:
        risk_flags.append("launch_unhealthy")
    last_status_code = recent_failure.get("last_status_code")
    if last_status_code in {401, 403}:
        risk_flags.append("auth_fragile")

    if provider_name == primary_provider:
        routing_role = "primary"
        fallback_behavior = (
            f"Falls back to {fallback_provider} when the primary lane cools down."
            if fallback_provider
            else "No configured fallback lane."
        )
    elif provider_name == fallback_provider:
        routing_role = "fallback"
        fallback_behavior = f"Receives traffic when {primary_provider or 'the primary lane'} is unavailable."
    else:
        routing_role = "standby"
        fallback_behavior = "Not part of the default runtime route today."

    if "auth_fragile" in risk_flags or "current_build_smoke_error" in risk_flags:
        risk_profile = "high"
    elif "cooldown" in risk_flags or "launch_unhealthy" in risk_flags:
        risk_profile = "medium"
    elif configured:
        risk_profile = "low"
    else:
        risk_profile = "unknown"

    return {
        "provider": provider_name,
        "routing_role": routing_role,
        "service_tier": provider_state.get("service_tier"),
        "default_model": _chat_provider_default_model(settings=settings, provider=provider_name),
        "premium_model": _chat_provider_premium_model(settings=settings, provider=provider_name),
        "configured": configured,
        "launch_grade": provider_state.get("launch_grade") is True,
        "healthy_for_launch": provider_state.get("healthy_for_launch") is True,
        "current_status": current_status,
        "smoke_status": smoke_status,
        "estimated_request_cost_class": (
            "paid_variable"
            if chat_provider_service_tier(settings=settings, provider=provider_name) == "paid"
            else "free_or_included"
        ),
        "quality_profile": _chat_model_quality_profile(
            _chat_provider_default_model(settings=settings, provider=provider_name)
        ),
        "recent_spend_usd": round(recent_spend_usd, 6),
        "risk_profile": risk_profile,
        "risk_flags": risk_flags,
        "fallback_behavior": fallback_behavior,
        "last_failure_reason": recent_failure.get("last_failure_reason"),
        "last_status_code": last_status_code,
    }


# ---------------------------------------------------------------------------
# Truth builders
# ---------------------------------------------------------------------------


def _build_chat_provider_truth(
    *,
    settings: Settings,
    chat_routing: dict[str, Any],
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
    provider_spend_lookup: dict[str, float],
) -> dict[str, Any]:
    providers_payload = chat_routing.get("providers") if isinstance(chat_routing, dict) else None
    primary_provider = str(chat_routing.get("primary_provider") or "").strip().lower()
    fallback_provider = str(chat_routing.get("fallback_provider") or "").strip().lower()
    selected_provider = _protected_beta_chat_provider(settings)
    provider_states: list[dict[str, Any]] = []

    if isinstance(providers_payload, dict):
        for provider_name in ("gemini", "openrouter", "openai"):
            payload = providers_payload.get(provider_name)
            if not isinstance(payload, dict):
                continue
            provider_states.append(
                _serialize_chat_provider_state(
                    settings=settings,
                    provider_name=provider_name,
                    payload=payload,
                    smoke_lookup=smoke_lookup,
                )
            )

    if not provider_states:
        for provider_name in ("gemini", "openrouter", "openai"):
            configured = chat_provider_is_configured(settings=settings, provider=provider_name)
            provider_states.append(
                _serialize_chat_provider_state(
                    settings=settings,
                    provider_name=provider_name,
                    payload={
                        "configured": configured,
                        "status": "healthy" if configured else "not_configured",
                    },
                    smoke_lookup=smoke_lookup,
                )
            )

    provider_map = {
        str(item.get("provider") or "").strip().lower(): item
        for item in provider_states
        if isinstance(item, dict)
    }
    selected_state = provider_map.get(selected_provider, {})
    configured_premium = [item for item in provider_states if item["configured"]]
    configured_launch_grade = [item for item in configured_premium if item["launch_grade"] is True]
    configured_limited = [item for item in configured_premium if item["launch_grade"] is not True]
    healthy_premium = [item for item in configured_launch_grade if item["healthy_for_launch"] is True]
    degraded_premium = [item for item in configured_launch_grade if item["healthy_for_launch"] is not True]
    unverified_runtime_healthy = [
        item
        for item in configured_launch_grade
        if item["runtime_available"] is True and item["smoke_verified_for_current_build"] is not True
    ]
    configured_backup_launch_grade = [
        item for item in configured_launch_grade if item["provider"] != selected_provider
    ]
    healthy_backup_launch_grade = [
        item for item in healthy_premium if item["provider"] != selected_provider
    ]
    configured_unproven_launch_grade = [
        item for item in configured_launch_grade if item["healthy_for_launch"] is not True
    ]
    configured_unproven_backup_launch_grade = [
        item for item in configured_backup_launch_grade if item["healthy_for_launch"] is not True
    ]
    detail = ", ".join(item["detail"] for item in configured_premium) or "no premium chat provider configured"

    if selected_state.get("healthy_for_launch") is True and selected_state.get("launch_grade") is True:
        status = "pass"
        summary = "The selected launch chat lane is healthy on the current build."
    elif selected_state.get("launch_grade") is True and selected_state.get("runtime_available") is True:
        status = "blocked"
        summary = (
            "The selected launch chat lane exists, but the current build has not proven it through live smoke yet."
        )
    elif selected_state.get("launch_grade") is True and selected_state.get("configured") is True:
        status = "blocked"
        summary = "The selected launch chat provider is configured, but it is not currently healthy."
    elif selected_state.get("configured") is True and selected_state.get("launch_grade") is not True:
        status = "blocked"
        summary = (
            "The selected launch chat provider is configured but still limited to a free-tier lane."
        )
    else:
        status = "blocked"
        summary = "Premium chat does not currently have the selected launch-grade lane configured."

    if configured_limited and not configured_launch_grade:
        economics_status = "warning"
        economics_summary = (
            "Configured chat providers are limited to free-tier lanes, so paid chat economics cannot be signed off yet."
        )
    elif not configured_premium:
        economics_status = "warning"
        economics_summary = "Premium chat still depends on heuristic fallback only."
    else:
        economics_status = "pass"
        economics_summary = ""

    if len(healthy_premium) >= 2:
        resilience_status = "pass"
        resilience_summary = "Premium chat has more than one proven paid launch-grade lane."
    elif healthy_premium:
        resilience_status = "warning"
        if configured_unproven_backup_launch_grade:
            backup_names = ", ".join(item["provider"] for item in configured_unproven_backup_launch_grade)
            resilience_summary = (
                "Premium chat currently relies on a single proven paid launch-grade lane; "
                f"configured backup lanes ({backup_names}) are not proven on the current build yet."
            )
        else:
            resilience_summary = (
                "Premium chat currently relies on a single proven paid launch-grade lane and no second paid lane is configured."
            )
    elif unverified_runtime_healthy:
        resilience_status = "blocked"
        launch_grade_names = ", ".join(item["provider"] for item in configured_launch_grade)
        resilience_summary = (
            "Configured paid chat lanes"
            + (f" ({launch_grade_names})" if launch_grade_names else "")
            + " exist, but none are proven on the current build yet."
        )
    elif configured_launch_grade:
        resilience_status = "blocked"
        launch_grade_names = ", ".join(item["provider"] for item in configured_launch_grade)
        resilience_summary = (
            "Configured paid chat lanes"
            + (f" ({launch_grade_names})" if launch_grade_names else "")
            + " are present, but none are currently healthy enough to prove redundancy."
        )
    else:
        resilience_status = "blocked"
        resilience_summary = "Premium chat does not yet have any configured paid launch-grade lane."

    if healthy_premium:
        public_paid_usage_status = "pass"
        public_paid_usage_summary = "Premium chat has at least one proven paid launch-grade lane for public usage."
    elif unverified_runtime_healthy:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = (
            "Premium chat has a configured paid lane, but the current build has not proven it through live smoke yet."
        )
    elif configured_launch_grade:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = (
            "Premium chat has a configured paid launch-grade lane, but it is not currently healthy enough for public-paid usage."
        )
    elif configured_limited and not configured_launch_grade:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = (
            "Configured chat providers are limited to free-tier lanes, so public paid usage is not trustworthy yet."
        )
    else:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = "Premium chat still depends on heuristic fallback only."

    comparison = [
        _build_chat_provider_comparison_entry(
            settings=settings,
            provider_state=item,
            primary_provider=primary_provider,
            fallback_provider=fallback_provider,
            recent_spend_usd=provider_spend_lookup.get(str(item.get("provider") or "").strip().lower(), 0.0),
        )
        for item in provider_states
    ]

    return {
        "status": status,
        "summary": summary,
        "detail": detail,
        "launch_grade_ready": bool(selected_state.get("healthy_for_launch") is True and selected_state.get("launch_grade") is True),
        "public_paid_usage_ready": public_paid_usage_status == "pass",
        "public_paid_usage_status": public_paid_usage_status,
        "public_paid_usage_summary": public_paid_usage_summary,
        "selected_provider": selected_provider,
        "primary_provider": primary_provider or None,
        "fallback_provider": fallback_provider or None,
        "configured_launch_grade_provider_count": len(configured_launch_grade),
        "healthy_launch_grade_provider_count": len(healthy_premium),
        "configured_launch_grade_providers": [item["provider"] for item in configured_launch_grade],
        "healthy_launch_grade_providers": [item["provider"] for item in healthy_premium],
        "degraded_launch_grade_providers": [item["provider"] for item in degraded_premium],
        "configured_backup_launch_grade_provider_count": len(configured_backup_launch_grade),
        "healthy_backup_launch_grade_provider_count": len(healthy_backup_launch_grade),
        "configured_backup_launch_grade_providers": [item["provider"] for item in configured_backup_launch_grade],
        "healthy_backup_launch_grade_providers": [item["provider"] for item in healthy_backup_launch_grade],
        "configured_unproven_launch_grade_provider_count": len(configured_unproven_launch_grade),
        "configured_unproven_launch_grade_providers": [item["provider"] for item in configured_unproven_launch_grade],
        "configured_unproven_backup_launch_grade_provider_count": len(configured_unproven_backup_launch_grade),
        "configured_unproven_backup_launch_grade_providers": [
            item["provider"] for item in configured_unproven_backup_launch_grade
        ],
        "configured_limited_provider_count": len(configured_limited),
        "configured_limited_providers": [item["provider"] for item in configured_limited],
        "fallback_only_provider": "heuristic",
        "cost_class": "premium_api_variable" if configured_launch_grade else "fallback_only_or_free_tier",
        "economics_status": economics_status,
        "economics_summary": economics_summary,
        "resilience_status": resilience_status,
        "resilience_summary": resilience_summary,
        "comparison": comparison,
        "providers": provider_states,
    }


def _build_image_lane_truth(
    *,
    settings: Settings,
    launch_grade_states: list[dict[str, Any]],
) -> dict[str, Any]:
    provider_map = {
        str(item.get("provider") or "").strip().lower(): item
        for item in launch_grade_states
        if isinstance(item, dict)
    }
    selected_provider = _protected_beta_image_provider(settings)
    selected_state = provider_map.get(selected_provider, {})
    openai_state = provider_map.get("openai", {})
    openai_smoke = openai_state.get("smoke") if isinstance(openai_state, dict) else None
    openai_configured = bool(openai_state.get("configured"))
    openai_runtime_available = bool(openai_state.get("runtime_available"))
    selected_configured = bool(selected_state.get("configured"))
    selected_runtime_available = bool(selected_state.get("runtime_available"))
    selected_smoke_verified = bool(selected_state.get("smoke_verified_for_current_build"))
    draft_model = str(settings.openai_image_draft_model or "gpt-image-1-mini").strip() or "gpt-image-1-mini"
    final_model = str(settings.openai_image_model or "gpt-image-1.5").strip() or "gpt-image-1.5"
    draft_verified = _smoke_lane_verified_for_current_build(openai_smoke, lane="draft")
    final_verified = _smoke_lane_verified_for_current_build(openai_smoke, lane="final")
    require_final_lane = protected_beta_requires_final_image_lane(settings)

    secondary_states = [
        provider_map.get(name, {"provider": name, "configured": False, "healthy_for_launch": False})
        for name in ("openai", "fal", "runware")
        if name != selected_provider
    ]
    configured_secondary = [
        str(item.get("provider") or "").strip().lower()
        for item in secondary_states
        if item.get("configured") is True
    ]
    healthy_secondary = [
        str(item.get("provider") or "").strip().lower()
        for item in secondary_states
        if item.get("runtime_available") is True and item.get("smoke_verified_for_current_build") is True
    ]

    if selected_provider == "openai":
        if openai_configured and draft_verified and (final_verified or not require_final_lane):
            status = "pass"
            if final_verified:
                summary = "OpenAI draft and owner-QA final image lanes are proven on the current build."
            else:
                summary = "OpenAI draft image lane is proven for the current launch baseline; owner-QA final proof remains optional."
        elif openai_configured and (draft_verified or final_verified):
            status = "warning"
            summary = "OpenAI image lanes are only partially proven on the current build."
        elif openai_configured and openai_runtime_available:
            status = "warning"
            summary = "OpenAI image lanes are configured, but current-build smoke has not proven the selected draft lane yet."
        elif openai_configured:
            status = "warning"
            summary = "OpenAI image lane is configured but not currently healthy enough to prove the selected launch route."
        else:
            status = "warning"
            summary = "OpenAI launch image lane is not configured yet."
    elif selected_configured and selected_runtime_available and selected_smoke_verified:
        status = "pass"
        summary = f"{selected_provider} is proven as the selected launch image lane on the current build."
    elif selected_configured and selected_runtime_available:
        status = "warning"
        summary = f"{selected_provider} is configured, but current-build smoke has not proven it as the selected launch image lane yet."
    elif selected_configured:
        status = "warning"
        summary = f"{selected_provider} is configured but not currently healthy enough to prove the selected launch image route."
    else:
        status = "warning"
        summary = f"{selected_provider} is not configured as the selected launch image lane."

    details: list[str] = []
    details.append(f"selected provider={selected_provider}")
    if selected_provider == "openai" and openai_configured:
        details.append(
            "OpenAI draft="
            + ("verified" if draft_verified else "unproven")
            + f" ({draft_model})"
        )
        details.append(
            "OpenAI final="
            + ("verified" if final_verified else "unproven")
            + f" ({final_model})"
        )
        if not final_verified and not require_final_lane:
            details.append("owner-QA final lane remains optional for the current launch baseline")
    elif selected_provider == "openai":
        details.append("OpenAI draft/final lanes are not configured")
    else:
        details.append(
            f"{selected_provider} smoke="
            + ("verified" if selected_smoke_verified else "unproven")
        )

    if healthy_secondary:
        details.append("secondary healthy=" + ", ".join(healthy_secondary))
    elif configured_secondary:
        details.append("secondary configured but unproven=" + ", ".join(configured_secondary))
    else:
        details.append("no secondary launch-grade image lane configured")

    return {
        "status": status,
        "summary": summary,
        "detail": " | ".join(details),
        "selected_provider": selected_provider,
        "selected_lane": {
            "provider": selected_provider if selected_configured else None,
            "configured": selected_configured,
            "runtime_available": selected_runtime_available,
            "smoke_verified_for_current_build": selected_smoke_verified,
        },
        "draft_lane": {
            "provider": "openai" if selected_provider == "openai" and openai_configured else None,
            "model": draft_model,
            "configured": selected_provider == "openai" and openai_configured,
            "runtime_available": selected_provider == "openai" and openai_runtime_available,
            "smoke_verified_for_current_build": selected_provider == "openai" and draft_verified,
        },
        "final_lane": {
            "provider": "openai" if selected_provider == "openai" and openai_configured else None,
            "model": final_model,
            "configured": selected_provider == "openai" and openai_configured,
            "runtime_available": selected_provider == "openai" and openai_runtime_available,
            "smoke_verified_for_current_build": selected_provider == "openai" and final_verified,
        },
        "secondary_launch_grade_providers": secondary_states,
        "healthy_secondary_launch_grade_providers": healthy_secondary,
    }


def _build_image_provider_truth(
    *,
    settings: Settings,
    provider_status: list[dict[str, Any]],
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    provider_map = {
        str(provider.get("name") or "").strip().lower(): provider
        for provider in provider_status
        if isinstance(provider, dict) and str(provider.get("name") or "").strip()
    }

    launch_grade_states = [
        _serialize_image_provider_state(
            provider_map.get(name),
            provider=name,
            smoke_lookup=smoke_lookup,
            settings=settings,
        )
        for name in ("openai", "fal", "runware")
    ]
    fallback_states = [
        _serialize_image_provider_state(
            provider_map.get(name),
            provider=name,
            smoke_lookup=smoke_lookup,
            settings=settings,
        )
        for name in ("huggingface", "pollinations")
    ]
    degraded_states = [
        _serialize_image_provider_state(
            provider_map.get(name),
            provider=name,
            smoke_lookup=smoke_lookup,
            settings=settings,
        )
        for name in ("demo",)
    ]

    selected_launch_grade = [
        item for item in launch_grade_states if item["configured"] and item["launch_grade"] is True
    ]
    healthy_launch_grade = [item for item in selected_launch_grade if item["healthy_for_launch"] is True]
    unverified_runtime_healthy = [
        item
        for item in selected_launch_grade
        if item["runtime_available"] is True and item["smoke_verified_for_current_build"] is not True
    ]
    managed_backup_states = [
        item for item in launch_grade_states if item.get("lane_class") == "managed_backup"
    ]
    configured_managed_backups = [item for item in managed_backup_states if item["configured"]]
    healthy_managed_backups = [
        item
        for item in configured_managed_backups
        if item["runtime_available"] is True and item["smoke_verified_for_current_build"] is True
    ]
    configured_unproven_managed_backups = [
        item
        for item in configured_managed_backups
        if not (item["runtime_available"] is True and item["smoke_verified_for_current_build"] is True)
    ]
    configured_fallback = [item for item in fallback_states if item["configured"]]
    configured_degraded = [item for item in degraded_states if item["configured"]]
    lane_truth = _build_image_lane_truth(
        settings=settings,
        launch_grade_states=launch_grade_states,
    )

    detail_groups: list[str] = []
    for label, items in (
        ("launch-grade", launch_grade_states),
        ("fallback-only", fallback_states),
        ("degraded-only", degraded_states),
    ):
        active_items = [item["detail"] for item in items if item["configured"]]
        if active_items:
            detail_groups.append(f"{label}: {', '.join(active_items)}")
    detail = " | ".join(detail_groups) or "no image provider is configured"

    selected_provider = _protected_beta_image_provider(settings)
    if healthy_launch_grade:
        status = "pass"
        summary = "Image generation has a healthy selected launch-grade billable lane."
    elif unverified_runtime_healthy:
        status = "blocked"
        summary = (
            "The selected launch image lane exists, but the current build has not proven it through live smoke yet."
        )
    elif selected_launch_grade:
        status = "blocked"
        summary = "The selected launch image provider is configured, but it is not currently healthy."
    else:
        status = "blocked"
        summary = "Image generation does not currently have a selected launch-grade billable lane."

    if selected_launch_grade:
        economics_status = "pass"
        economics_summary = ""
    elif configured_fallback or configured_degraded:
        economics_status = "warning"
        economics_summary = (
            "Current image routing depends on fallback-only or degraded lanes, so billable image economics cannot be signed off yet."
        )
    else:
        economics_status = "warning"
        economics_summary = "No launch-grade billable image provider is configured for public paid usage."

    if healthy_launch_grade and healthy_managed_backups:
        resilience_status = "pass"
        resilience_summary = "Image generation has a proven selected launch lane and at least one proven managed backup lane."
    elif healthy_launch_grade or selected_launch_grade:
        resilience_status = "warning"
        if configured_unproven_managed_backups:
            backup_names = ", ".join(item["provider"] for item in configured_unproven_managed_backups)
            resilience_summary = (
                "Image generation currently relies on a single selected launch lane; "
                f"managed backup lanes ({backup_names}) are configured but not proven on the current build yet."
            )
        else:
            resilience_summary = (
                "Image generation currently relies on a single selected launch lane and no managed backup lane is configured."
            )
    else:
        resilience_status = "blocked"
        resilience_summary = "Image generation does not yet have a selected launch-grade billable lane."

    if healthy_launch_grade and healthy_managed_backups:
        public_paid_usage_status = "pass"
        public_paid_usage_summary = (
            "Image generation has a proven public-paid route with at least one healthy managed backup lane."
        )
    elif healthy_launch_grade:
        public_paid_usage_status = "blocked"
        if configured_unproven_managed_backups:
            backup_names = ", ".join(item["provider"] for item in configured_unproven_managed_backups)
            public_paid_usage_summary = (
                "Image generation still lacks a proven managed backup lane for broader paid rollout; "
                f"configured managed backups ({backup_names}) are not proven on the current build yet."
            )
        else:
            public_paid_usage_summary = (
                "Image generation still lacks a proven managed backup lane for broader paid rollout."
            )
    elif unverified_runtime_healthy:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = (
            "The selected launch image lane exists, but the current build has not proven it through live smoke yet."
        )
    elif selected_launch_grade:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = (
            "The selected launch image provider is configured, but it is not currently healthy enough for public-paid usage."
        )
    elif configured_fallback or configured_degraded:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = (
            "Current image routing depends on fallback-only or degraded lanes, so public paid image generation is not trustworthy yet."
        )
    else:
        public_paid_usage_status = "blocked"
        public_paid_usage_summary = "No launch-grade billable image provider is configured for public paid usage."

    return {
        "status": status,
        "summary": summary,
        "detail": detail,
        "launch_grade_ready": bool(healthy_launch_grade),
        "public_paid_usage_ready": public_paid_usage_status == "pass",
        "public_paid_usage_status": public_paid_usage_status,
        "public_paid_usage_summary": public_paid_usage_summary,
        "selected_provider": selected_provider,
        "configured_launch_grade_provider_count": len(selected_launch_grade),
        "healthy_launch_grade_provider_count": len(healthy_launch_grade),
        "configured_launch_grade_providers": [item["provider"] for item in selected_launch_grade],
        "healthy_launch_grade_providers": [item["provider"] for item in healthy_launch_grade],
        "configured_managed_backup_providers": [item["provider"] for item in configured_managed_backups],
        "healthy_managed_backup_providers": [item["provider"] for item in healthy_managed_backups],
        "configured_unproven_managed_backup_provider_count": len(configured_unproven_managed_backups),
        "configured_unproven_managed_backup_providers": [
            item["provider"] for item in configured_unproven_managed_backups
        ],
        "fallback_only_providers": [item["provider"] for item in configured_fallback],
        "degraded_only_providers": [item["provider"] for item in configured_degraded],
        "cost_class": "managed_image_variable" if selected_launch_grade else "fallback_only_or_missing",
        "economics_status": economics_status,
        "economics_summary": economics_summary,
        "resilience_status": resilience_status,
        "resilience_summary": resilience_summary,
        "lane_truth": lane_truth,
        "providers": launch_grade_states + fallback_states + degraded_states,
    }


def _build_provider_mix_truth(
    *,
    chat_truth: dict[str, Any],
    image_truth: dict[str, Any],
) -> dict[str, Any]:
    blocking_reasons: list[str] = []
    warning_reasons: list[str] = []

    for surface_name, truth in (("chat", chat_truth), ("image", image_truth)):
        resilience_status = str(truth.get("resilience_status") or "").strip().lower()
        resilience_summary = str(truth.get("resilience_summary") or "").strip()
        if not resilience_summary:
            continue
        reason = f"{surface_name}: {resilience_summary}"
        if resilience_status == "blocked":
            blocking_reasons.append(reason)
        elif resilience_status == "warning":
            warning_reasons.append(reason)

    if blocking_reasons:
        status = "blocked"
        summary = "Launch-grade provider mix is not yet redundancy-safe for a public paid platform."
        detail = " | ".join(blocking_reasons)
    elif warning_reasons:
        status = "warning"
        summary = "Launch-grade provider mix still depends on a single paid lane."
        detail = " | ".join(warning_reasons)
    else:
        status = "pass"
        summary = "Launch-grade provider mix is redundancy-safe for a public paid platform."
        detail = "Chat and image both have more than one proven paid lane."

    return {
        "status": status,
        "summary": summary,
        "detail": detail,
        "blocking_reasons": blocking_reasons,
        "warning_reasons": warning_reasons,
    }


def _build_provider_economics_truth(
    *,
    settings: Settings,
    chat_truth: dict[str, Any],
    image_truth: dict[str, Any],
    economics_dossier: dict[str, Any] | None,
) -> dict[str, Any]:
    current_build = load_version_info().build
    signoff_enabled = bool(getattr(settings, "public_paid_provider_economics_ready", False))
    signoff_build = str(getattr(settings, "public_paid_provider_economics_ready_build", "") or "").strip()
    signoff_note = str(getattr(settings, "public_paid_provider_economics_ready_note", "") or "").strip()
    signoff_has_note = bool(signoff_note)
    signoff_matches_current_build = bool(signoff_enabled and signoff_build and signoff_build == current_build)
    dossier_present = (
        isinstance(economics_dossier, dict)
        and str(economics_dossier.get("report_kind") or "").strip().lower() == "provider_economics_dossier"
    )
    dossier_build = str(economics_dossier.get("build") or "").strip() if dossier_present else ""
    dossier_complete = bool(economics_dossier.get("complete")) if dossier_present else False
    dossier_matches_current_build = bool(dossier_present and dossier_build and dossier_build == current_build)
    dossier_summary = str(economics_dossier.get("summary") or "").strip() if dossier_present else ""
    dossier_generated_at = str(economics_dossier.get("generated_at") or "").strip() if dossier_present else ""
    dossier_path = str(economics_dossier.get("path") or "").strip() if dossier_present else ""
    resilience_warnings = [
        warning
        for warning in (
            chat_truth["resilience_summary"] if chat_truth["resilience_status"] != "pass" else "",
            image_truth["resilience_summary"] if image_truth["resilience_status"] != "pass" else "",
        )
        if warning
    ]

    if signoff_matches_current_build and signoff_has_note and dossier_matches_current_build and dossier_complete:
        signoff_state = "current"
        status = "pass"
        summary = "Provider economics have explicit current-build signoff."
        detail = signoff_note
        if dossier_summary:
            detail = f"{detail} Dossier: {dossier_summary}"
    elif signoff_matches_current_build and signoff_has_note and dossier_present and not dossier_matches_current_build:
        signoff_state = "stale_dossier"
        status = "warning"
        summary = "Provider economics dossier is stale for the current build."
        detail = (
            f"Economics dossier references build {dossier_build or 'unknown'}, but the current build is {current_build}."
        )
        if dossier_summary:
            detail = f"{detail} Summary: {dossier_summary}"
    elif signoff_matches_current_build and signoff_has_note:
        signoff_state = "missing_dossier"
        status = "warning"
        if dossier_present and not dossier_complete:
            summary = "Provider economics dossier is incomplete for the current build."
            detail = (
                "Current-build economics dossier is present but incomplete. "
                f"Build {current_build} still needs a complete dossier before economics can be signed off."
            )
        else:
            summary = "Provider economics signoff is missing a current-build dossier."
            detail = (
                f"Generate a complete provider economics dossier for current build {current_build} before treating economics as signed off."
            )
        if dossier_path:
            detail = f"{detail} Path: {dossier_path}"
    elif signoff_matches_current_build:
        signoff_state = "missing_note"
        status = "warning"
        summary = "Provider economics signoff is missing an explicit signoff note."
        detail = (
            "Set PUBLIC_PAID_PROVIDER_ECONOMICS_READY_NOTE to a concrete policy or cost signoff summary "
            f"for current build {current_build} before treating economics as signed off."
        )
    elif signoff_enabled and signoff_build:
        signoff_state = "stale_build"
        status = "warning"
        summary = "Provider economics signoff is stale for the current build."
        detail = (
            f"Economics signoff references build {signoff_build}, but the current build is {current_build}."
        )
        if signoff_note:
            detail = f"{detail} Note: {signoff_note}"
    elif signoff_enabled:
        signoff_state = "missing_build"
        status = "warning"
        summary = "Provider economics signoff is missing a build reference."
        detail = (
            "Set PUBLIC_PAID_PROVIDER_ECONOMICS_READY_BUILD to the current build before treating economics as signed off."
        )
        if signoff_note:
            detail = f"{detail} Note: {signoff_note}"
    else:
        signoff_state = "missing"
        status = "warning"
        summary = "Provider economics still need explicit current-build signoff before broader paid launch."
        detail = (
            f"No explicit economics signoff is recorded for build {current_build}. "
            f"Chat cost class={chat_truth['cost_class']}; image cost class={image_truth['cost_class']}."
        )
        if signoff_note:
            detail = f"{detail} Note: {signoff_note}"

    if not dossier_present:
        dossier_state = "missing_dossier"
    elif not dossier_matches_current_build:
        dossier_state = "stale_dossier"
    elif not dossier_complete:
        dossier_state = "missing_dossier"
    else:
        dossier_state = "current"

    return {
        "status": status,
        "summary": summary,
        "detail": detail,
        "signoff_state": signoff_state,
        "signoff_recorded": signoff_enabled,
        "signoff_build": signoff_build or None,
        "signoff_matches_current_build": signoff_matches_current_build,
        "signoff_has_note": signoff_has_note,
        "signoff_note": signoff_note or None,
        "dossier_present": dossier_present,
        "dossier_state": dossier_state,
        "dossier_build": dossier_build or None,
        "dossier_matches_current_build": dossier_matches_current_build,
        "dossier_complete": dossier_complete,
        "dossier_summary": dossier_summary or None,
        "dossier_generated_at": dossier_generated_at or None,
        "dossier_path": dossier_path or None,
        "chat_cost_class": chat_truth["cost_class"],
        "image_cost_class": image_truth["cost_class"],
        "chat_public_paid_usage_ready": chat_truth["public_paid_usage_ready"],
        "image_public_paid_usage_ready": image_truth["public_paid_usage_ready"],
        "chat_resilience_status": chat_truth["resilience_status"],
        "image_resilience_status": image_truth["resilience_status"],
        "resilience_warnings": resilience_warnings,
        "chat_provider_comparison": chat_truth["comparison"],
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def build_provider_truth_report(
    *,
    settings: Settings,
    provider_status: list[dict[str, Any]],
    chat_routing: dict[str, Any],
    provider_smoke_report: dict[str, Any] | None,
    cost_telemetry: dict[str, Any] | None,
    economics_dossier: dict[str, Any] | None = None,
) -> dict[str, Any]:
    smoke_lookup = build_provider_smoke_lookup(provider_smoke_report)
    provider_spend_lookup = build_provider_spend_lookup(cost_telemetry)
    chat_truth = _build_chat_provider_truth(
        settings=settings,
        chat_routing=chat_routing,
        smoke_lookup=smoke_lookup,
        provider_spend_lookup=provider_spend_lookup,
    )
    image_truth = _build_image_provider_truth(
        settings=settings,
        provider_status=provider_status,
        smoke_lookup=smoke_lookup,
    )
    provider_mix = _build_provider_mix_truth(chat_truth=chat_truth, image_truth=image_truth)
    economics_truth = _build_provider_economics_truth(
        settings=settings,
        chat_truth=chat_truth,
        image_truth=image_truth,
        economics_dossier=economics_dossier,
    )
    if chat_truth["status"] == "blocked" or image_truth["status"] == "blocked":
        status = "blocked"
        summary = "Studio still lacks a trustworthy launch-grade AI provider mix."
    elif provider_mix["status"] != "pass":
        status = "warning"
        summary = "Studio has live provider lanes, but the launch-grade mix is not redundancy-safe for a public paid platform yet."
    elif economics_truth["status"] != "pass":
        status = "warning"
        summary = "Studio has live provider lanes, but provider economics still need attention before broader paid launch."
    else:
        status = "pass"
        summary = "Studio currently has a launch-grade AI provider mix with current-build economics signoff."
    return {
        "status": status,
        "summary": summary,
        "public_paid_usage_safe": status == "pass",
        "economics": economics_truth,
        "mix": provider_mix,
        "chat": chat_truth,
        "image": image_truth,
    }
