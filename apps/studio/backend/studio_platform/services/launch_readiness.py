from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

from config.env import Environment, Settings

from ..versioning import load_version_info

_ALLOWED_PROTECTED_LAUNCH_WARNING_KEYS = {
    "provider_smoke",
    "provider_health_snapshot",
    "chat_provider_lane",
    "image_provider_lane",
    "provider_economics",
}

_CHAT_LAUNCH_GRADE_PROVIDERS = frozenset({"gemini", "openrouter", "openai"})
_IMAGE_LAUNCH_GRADE_PROVIDERS = frozenset({"fal", "runware"})
_IMAGE_FALLBACK_ONLY_PROVIDERS = frozenset({"huggingface", "pollinations"})
_IMAGE_DEGRADED_ONLY_PROVIDERS = frozenset({"demo"})


def provider_smoke_report_path(settings: Settings) -> Path:
    return (settings.runtime_root_path / "reports" / "provider-smoke-latest.json").resolve()


def startup_verification_report_path(settings: Settings) -> Path:
    return (settings.runtime_root_path / "reports" / "local-verify-latest.json").resolve()


def persist_provider_smoke_report(
    settings: Settings,
    *,
    selected_provider: str,
    selected_surface: str,
    include_failure_probe: bool,
    source_env_file: str | None = None,
    results: Iterable[Any],
) -> dict[str, Any]:
    version = load_version_info()
    new_results = [
        result.to_dict() if hasattr(result, "to_dict") else dict(result)
        for result in results
    ]
    existing_payload = load_provider_smoke_report(settings)
    serialized_results = _merge_provider_smoke_results(
        existing_payload=existing_payload,
        new_results=new_results,
        build=version.build,
        source_env_file=source_env_file,
    )
    summary = _summarize_smoke_results(serialized_results)
    coverage = _summarize_smoke_coverage(serialized_results)
    surfaces_recorded = sorted(
        {
            _infer_smoke_surface(result)
            for result in serialized_results
            if isinstance(result, dict)
        }
    )
    payload: dict[str, Any] = {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "version": version.version,
        "build": version.build,
        "provider": selected_provider,
        "surface": selected_surface,
        "surfaces_recorded": surfaces_recorded,
        "include_failure_probe": include_failure_probe,
        "source_env_file": source_env_file,
        "summary": summary,
        "coverage": coverage,
        "results": serialized_results,
    }
    report_path = provider_smoke_report_path(settings)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")
    payload["path"] = str(report_path)
    return payload


def load_provider_smoke_report(settings: Settings) -> dict[str, Any] | None:
    report_path = provider_smoke_report_path(settings)
    if not report_path.exists():
        return None
    try:
        payload = json.loads(report_path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    if not isinstance(payload.get("coverage"), dict):
        results = payload.get("results") if isinstance(payload.get("results"), list) else []
        payload["coverage"] = _summarize_smoke_coverage(results)
    payload["path"] = str(report_path)
    return payload


def _merge_provider_smoke_results(
    *,
    existing_payload: dict[str, Any] | None,
    new_results: list[dict[str, Any]],
    build: str,
    source_env_file: str | None,
) -> list[dict[str, Any]]:
    if not isinstance(existing_payload, dict):
        return list(new_results)

    existing_build = str(existing_payload.get("build") or "").strip()
    existing_env_file = existing_payload.get("source_env_file")
    if existing_build != build or existing_env_file != source_env_file:
        return list(new_results)

    existing_results = existing_payload.get("results")
    if not isinstance(existing_results, list):
        return list(new_results)

    merged: dict[tuple[str, str, str, str], dict[str, Any]] = {}
    for raw_result in [*existing_results, *new_results]:
        if not isinstance(raw_result, dict):
            continue
        provider_name = str(raw_result.get("provider_name") or "").strip().lower()
        workflow = str(raw_result.get("workflow") or "").strip().lower()
        surface = _infer_smoke_surface(raw_result)
        label = str(raw_result.get("label") or "").strip().lower()
        key = (surface, provider_name, workflow, label)
        merged[key] = dict(raw_result)
    return list(merged.values())


def persist_startup_verification_report(
    settings: Settings,
    *,
    expected_build: str | None,
    backend_build: str | None,
    backend_health: str | None,
    backend_url: str,
    frontend_url: str,
    frontend_login_ok: bool,
    frontend_shell_ok: bool,
    backend_mode: str,
    frontend_mode: str,
    failures: Iterable[str] | None = None,
) -> dict[str, Any]:
    version = load_version_info()
    failure_list = [str(item).strip() for item in (failures or []) if str(item).strip()]
    checks = {
        "backend_version_match": not expected_build or backend_build == expected_build,
        "backend_health_present": bool((backend_health or "").strip()),
        "frontend_login_ok": frontend_login_ok,
        "frontend_shell_ok": frontend_shell_ok,
    }
    status = "pass" if not failure_list and all(checks.values()) else "blocked"
    summary = (
        "Studio local verification passed."
        if status == "pass"
        else "Studio local verification detected blocking issues."
    )
    payload: dict[str, Any] = {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "version": version.version,
        "build": version.build,
        "expected_build": expected_build,
        "backend_build": backend_build,
        "backend_health": backend_health,
        "backend_url": backend_url,
        "frontend_url": frontend_url,
        "runtime_root": str(settings.runtime_root_path),
        "log_directory": str(settings.log_directory_path),
        "backend_mode": backend_mode,
        "frontend_mode": frontend_mode,
        "checks": checks,
        "failures": failure_list,
        "status": status,
        "summary": summary,
    }
    report_path = startup_verification_report_path(settings)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")
    payload["path"] = str(report_path)
    return payload


def load_startup_verification_report(settings: Settings) -> dict[str, Any] | None:
    report_path = startup_verification_report_path(settings)
    if not report_path.exists():
        return None
    try:
        payload = json.loads(report_path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    payload["path"] = str(report_path)
    return payload


def build_runtime_log_snapshot(settings: Settings) -> dict[str, Any]:
    log_directory = settings.log_directory_path
    repo_root = Path(__file__).resolve().parents[3]
    tracked_files = (
        "backend.app.log",
        "backend.error.log",
        "backend.stdout.log",
        "backend.stderr.log",
        "frontend.stdout.log",
        "frontend.stderr.log",
        "frontend.build.stdout.log",
        "frontend.build.stderr.log",
    )
    files: dict[str, dict[str, Any]] = {}
    existing_files: list[str] = []
    for name in tracked_files:
        file_path = (log_directory / name).resolve()
        entry: dict[str, Any] = {
            "path": str(file_path),
            "exists": file_path.exists(),
        }
        if file_path.exists():
            try:
                stat = file_path.stat()
            except OSError:
                pass
            else:
                entry["size_bytes"] = stat.st_size
                entry["modified_at"] = datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat()
                existing_files.append(name)
        files[name] = entry
    return {
        "directory": str(log_directory.resolve()),
        "exists": log_directory.exists(),
        "outside_repo": _is_outside_repo(log_directory, repo_root=repo_root),
        "existing_count": len(existing_files),
        "existing_files": existing_files,
        "files": files,
    }


def build_launch_readiness_report(
    *,
    settings: Settings,
    provider_status: list[dict[str, Any]],
    data_authority: dict[str, Any],
    generation_runtime_mode: str,
    generation_broker: dict[str, Any],
    chat_routing: dict[str, Any],
    provider_smoke_report: dict[str, Any] | None,
    startup_verification_report: dict[str, Any] | None,
    deployment_verification_report: dict[str, Any] | None,
    runtime_logs: dict[str, Any] | None,
) -> dict[str, Any]:
    checks: list[dict[str, str]] = []

    def add_check(key: str, status: str, summary: str, detail: str) -> None:
        checks.append(
            {
                "key": key,
                "status": status,
                "summary": summary,
                "detail": detail,
            }
        )

    is_launch_environment = settings.environment in {Environment.STAGING, Environment.PRODUCTION}
    if is_launch_environment:
        add_check(
            "deployment_environment",
            "pass",
            "Launch environment is not local development.",
            f"Studio is running in {settings.environment.value}.",
        )
    else:
        add_check(
            "deployment_environment",
            "blocked",
            "Studio is still running in local development mode.",
            "Public launch should not rely on a development environment or a single local machine.",
        )

    auth_fields = {
        "supabase_url": bool((settings.supabase_url or "").strip()),
        "supabase_anon_key": bool((settings.supabase_anon_key or "").strip()),
        "supabase_service_role_key": bool((settings.supabase_service_role_key or "").strip()),
    }
    missing_auth = [key for key, present in auth_fields.items() if not present]
    if missing_auth:
        add_check(
            "auth_configuration",
            "blocked",
            "Supabase auth configuration is incomplete.",
            f"Missing auth settings: {', '.join(missing_auth)}.",
        )
    else:
        add_check(
            "auth_configuration",
            "pass",
            "Supabase auth configuration is present.",
            "URL, anon key, and service-role key are configured.",
        )

    durable = bool(data_authority.get("durable"))
    backend = str(data_authority.get("backend") or "")
    if not durable:
        add_check(
            "data_authority",
            "blocked",
            "Metadata persistence is not durable.",
            "Launch readiness requires a durable state store.",
        )
    elif is_launch_environment and backend != "postgres":
        add_check(
            "data_authority",
            "blocked",
            "Launch environments must use Postgres data authority.",
            f"Current backend is {backend or 'unknown'}.",
        )
    else:
        add_check(
            "data_authority",
            "pass",
            "Metadata authority is durable.",
            f"Current authority backend is {backend or 'unknown'}.",
        )

    broker_enabled = generation_broker.get("enabled") is True
    broker_configured = generation_broker.get("configured") is True
    if generation_runtime_mode == "all":
        add_check(
            "runtime_topology",
            "warning",
            "Generation still runs in all-in-one local convenience mode.",
            "Launch readiness is stronger with explicit web/worker topology.",
        )
    elif generation_runtime_mode in {"web", "worker"} and not (broker_enabled or broker_configured):
        add_check(
            "runtime_topology",
            "blocked",
            "Split runtime is missing its shared broker.",
            "Web/worker launch topology should not run without a configured shared queue.",
        )
    else:
        add_check(
            "runtime_topology",
            "pass",
            "Generation runtime topology is coherent.",
            f"Runtime mode is {generation_runtime_mode}.",
        )

    provider_truth = _build_provider_truth_report(
        settings=settings,
        provider_status=provider_status,
        chat_routing=chat_routing,
        provider_smoke_report=provider_smoke_report,
    )
    chat_provider_check = provider_truth["chat"]
    add_check(
        "chat_provider_lane",
        chat_provider_check["status"],
        chat_provider_check["summary"],
        chat_provider_check["detail"],
    )

    image_provider_check = provider_truth["image"]
    add_check(
        "image_provider_lane",
        image_provider_check["status"],
        image_provider_check["summary"],
        image_provider_check["detail"],
    )

    provider_economics_check = provider_truth["economics"]
    add_check(
        "provider_economics",
        provider_economics_check["status"],
        provider_economics_check["summary"],
        provider_economics_check["detail"],
    )

    smoke_check = _build_smoke_check(
        settings=settings,
        provider_smoke_report=provider_smoke_report,
        provider_status=provider_status,
        chat_routing=chat_routing,
    )
    add_check("provider_smoke", smoke_check["status"], smoke_check["summary"], smoke_check["detail"])

    startup_check = _build_startup_verification_check(startup_verification_report)
    add_check(
        "startup_verification",
        startup_check["status"],
        startup_check["summary"],
        startup_check["detail"],
    )

    deployment_check = _build_deployment_verification_check(deployment_verification_report)
    add_check(
        "deployment_verification",
        deployment_check["status"],
        deployment_check["summary"],
        deployment_check["detail"],
    )

    logs_check = _build_runtime_logs_check(runtime_logs, settings=settings)
    add_check(
        "external_logs",
        logs_check["status"],
        logs_check["summary"],
        logs_check["detail"],
    )

    hard_unhealthy_providers: list[str] = []
    degraded_providers: list[str] = []
    for provider in provider_status:
        provider_name = str(provider.get("name") or "unknown").strip() or "unknown"
        health_class = _classify_provider_snapshot(provider)
        if health_class == "hard_unhealthy":
            hard_unhealthy_providers.append(provider_name)
        elif health_class == "degraded":
            degraded_providers.append(provider_name)

    if hard_unhealthy_providers:
        add_check(
            "provider_health_snapshot",
            "warning",
            "Some providers are currently failing real traffic.",
            "Latest snapshot shows hard provider failures for: "
            + ", ".join(sorted(hard_unhealthy_providers)),
        )
    elif degraded_providers:
        add_check(
            "provider_health_snapshot",
            "warning",
            "Some providers are currently degraded.",
            "Latest snapshot shows degraded provider health for: "
            + ", ".join(sorted(degraded_providers)),
        )
    else:
        add_check(
            "provider_health_snapshot",
            "pass",
            "Current provider snapshot does not show recent provider instability.",
            "No provider lane is currently reporting recent hard failures or degraded live success.",
        )

    blocking = sum(1 for check in checks if check["status"] == "blocked")
    warnings = sum(1 for check in checks if check["status"] == "warning")
    if blocking:
        status = "blocked"
        summary = "Launch is still blocked by one or more hard readiness gaps."
    elif warnings:
        status = "needs_attention"
        summary = "Launch readiness is improving, but some warnings still need attention."
    else:
        status = "ready"
        summary = "No launch-readiness blockers or warnings are currently detected."

    launch_gate = _build_launch_gate(
        checks=checks,
        startup_verification_report=startup_verification_report,
        deployment_verification_report=deployment_verification_report,
        provider_smoke_report=provider_smoke_report,
    )

    return {
        "status": status,
        "summary": summary,
        "blocking_count": blocking,
        "warning_count": warnings,
        "checks": checks,
        "launch_gate": launch_gate,
        "provider_truth": provider_truth,
    }


def _summarize_smoke_results(results: list[dict[str, Any]]) -> dict[str, int]:
    summary = {"ok": 0, "expected_failure": 0, "skipped": 0, "error": 0}
    for result in results:
        status = str(result.get("status") or "").strip()
        if status in summary:
            summary[status] += 1
    return summary


def _summarize_smoke_coverage(results: list[dict[str, Any]]) -> dict[str, Any]:
    def _empty_surface() -> dict[str, Any]:
        return {
            "ok": 0,
            "expected_failure": 0,
            "skipped": 0,
            "error": 0,
            "providers": [],
        }

    surfaces: dict[str, dict[str, Any]] = {
        "chat": _empty_surface(),
        "image": _empty_surface(),
    }

    for result in results:
        surface = _infer_smoke_surface(result)
        surface_summary = surfaces.setdefault(surface, _empty_surface())
        status = str(result.get("status") or "").strip()
        if status in {"ok", "expected_failure", "skipped", "error"}:
            surface_summary[status] += 1
        provider_name = str(result.get("provider_name") or "").strip().lower()
        if provider_name and provider_name not in surface_summary["providers"]:
            surface_summary["providers"].append(provider_name)

    chat_tested = sorted(
        provider
        for provider in surfaces.get("chat", {}).get("providers", [])
        if provider in _CHAT_LAUNCH_GRADE_PROVIDERS
    )
    image_launch_grade_tested = sorted(
        provider
        for provider in surfaces.get("image", {}).get("providers", [])
        if provider in _IMAGE_LAUNCH_GRADE_PROVIDERS
    )
    image_fallback_tested = sorted(
        provider
        for provider in surfaces.get("image", {}).get("providers", [])
        if provider in _IMAGE_FALLBACK_ONLY_PROVIDERS
    )

    return {
        "surfaces": surfaces,
        "chat_launch_grade_providers_tested": chat_tested,
        "image_launch_grade_providers_tested": image_launch_grade_tested,
        "image_fallback_only_providers_tested": image_fallback_tested,
    }


def _build_provider_truth_report(
    *,
    settings: Settings,
    provider_status: list[dict[str, Any]],
    chat_routing: dict[str, Any],
    provider_smoke_report: dict[str, Any] | None,
) -> dict[str, Any]:
    smoke_lookup = _build_provider_smoke_lookup(provider_smoke_report)
    chat_truth = _build_chat_provider_truth(
        settings=settings,
        chat_routing=chat_routing,
        smoke_lookup=smoke_lookup,
    )
    image_truth = _build_image_provider_truth(
        provider_status=provider_status,
        smoke_lookup=smoke_lookup,
    )
    economics_reasons = [
        reason
        for reason in (
            chat_truth["economics_summary"] if chat_truth["economics_status"] != "pass" else "",
            image_truth["economics_summary"] if image_truth["economics_status"] != "pass" else "",
        )
        if reason
    ]
    resilience_warnings = [
        warning
        for warning in (
            chat_truth["resilience_summary"] if chat_truth["resilience_status"] != "pass" else "",
            image_truth["resilience_summary"] if image_truth["resilience_status"] != "pass" else "",
        )
        if warning
    ]
    if chat_truth["status"] == "blocked" or image_truth["status"] == "blocked":
        status = "blocked"
        summary = "Studio still lacks a trustworthy launch-grade AI provider mix."
    elif economics_reasons or resilience_warnings:
        status = "warning"
        summary = "Studio has live provider lanes, but the current economics mix is not public-launch-safe yet."
    else:
        status = "pass"
        summary = "Studio currently has a launch-grade AI provider mix for protected usage."
    return {
        "status": status,
        "summary": summary,
        "public_paid_usage_safe": status == "pass",
        "economics": {
            "status": "warning" if economics_reasons or resilience_warnings else "pass",
            "summary": (
                "Provider economics still need attention before broader paid launch."
                if economics_reasons or resilience_warnings
                else "Current provider mix includes launch-grade billable lanes."
            ),
            "detail": " | ".join(economics_reasons + resilience_warnings)
            if economics_reasons or resilience_warnings
            else "Chat can use premium API lanes and image generation has a managed launch-grade lane.",
            "chat_cost_class": chat_truth["cost_class"],
            "image_cost_class": image_truth["cost_class"],
            "chat_public_paid_usage_ready": chat_truth["public_paid_usage_ready"],
            "image_public_paid_usage_ready": image_truth["public_paid_usage_ready"],
            "chat_resilience_status": chat_truth["resilience_status"],
            "image_resilience_status": image_truth["resilience_status"],
            "resilience_warnings": resilience_warnings,
        },
        "chat": chat_truth,
        "image": image_truth,
    }


def _build_provider_smoke_lookup(
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
        surface = _infer_smoke_surface(result)
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


def _serialize_chat_provider_state(
    *,
    provider_name: str,
    payload: dict[str, Any],
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    configured = payload.get("configured") is True
    status = str(payload.get("status") or "").strip().lower() or ("healthy" if configured else "not_configured")
    cooldown_remaining_seconds = int(payload.get("cooldown_remaining_seconds") or 0)
    smoke = _smoke_state_for_provider(smoke_lookup=smoke_lookup, surface="chat", provider=provider_name)
    smoke_failed = _smoke_has_current_build_error(smoke)
    smoke_verified_for_current_build = _smoke_verified_for_current_build(smoke)
    runtime_available = configured and status == "healthy" and not smoke_failed
    healthy_for_launch = runtime_available and smoke_verified_for_current_build
    launch_classification = _classify_launch_provider_state(
        configured=configured,
        runtime_available=healthy_for_launch,
        launch_grade=True,
    )
    return {
        "provider": provider_name,
        "lane_class": "launch_grade",
        "launch_grade": True,
        "credential_present": configured,
        "configured": configured,
        "status": status,
        "detail": _format_chat_provider_state(provider_name, payload),
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


def _build_chat_provider_truth(
    *,
    settings: Settings,
    chat_routing: dict[str, Any],
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    providers_payload = chat_routing.get("providers") if isinstance(chat_routing, dict) else None
    primary_provider = str(chat_routing.get("primary_provider") or "").strip().lower()
    fallback_provider = str(chat_routing.get("fallback_provider") or "").strip().lower()
    provider_states: list[dict[str, Any]] = []

    if isinstance(providers_payload, dict):
        for provider_name in ("gemini", "openrouter", "openai"):
            payload = providers_payload.get(provider_name)
            if not isinstance(payload, dict):
                continue
            provider_states.append(
                _serialize_chat_provider_state(
                    provider_name=provider_name,
                    payload=payload,
                    smoke_lookup=smoke_lookup,
                )
            )

    if not provider_states:
        for provider_name in ("gemini", "openrouter", "openai"):
            configured = _chat_provider_is_configured(settings=settings, provider=provider_name)
            provider_states.append(
                _serialize_chat_provider_state(
                    provider_name=provider_name,
                    payload={
                        "configured": configured,
                        "status": "healthy" if configured else "not_configured",
                    },
                    smoke_lookup=smoke_lookup,
                )
            )

    configured_premium = [item for item in provider_states if item["configured"]]
    healthy_premium = [item for item in configured_premium if item["healthy_for_launch"] is True]
    degraded_premium = [item for item in configured_premium if item["healthy_for_launch"] is not True]
    unverified_runtime_healthy = [
        item
        for item in configured_premium
        if item["runtime_available"] is True and item["smoke_verified_for_current_build"] is not True
    ]
    detail = ", ".join(item["detail"] for item in configured_premium) or "no premium chat provider configured"

    if healthy_premium and not degraded_premium:
        status = "pass"
        summary = "Premium chat has at least one healthy launch-grade lane."
    elif healthy_premium:
        status = "warning"
        summary = "Premium chat is available, but some configured premium lanes are degraded."
    elif unverified_runtime_healthy:
        status = "blocked"
        summary = "Premium chat lanes exist, but the current build has not proven them through live smoke yet."
    else:
        status = "blocked"
        summary = "Premium chat does not currently have a healthy launch-grade lane."

    economics_status = "pass" if configured_premium else "warning"
    economics_summary = (
        "Premium chat still depends on heuristic fallback only."
        if not configured_premium
        else (
            "Only one premium chat provider is configured, so cost and resilience still need attention."
            if len(configured_premium) == 1
            else ""
        )
    )
    if len(configured_premium) >= 2:
        resilience_status = "pass"
        resilience_summary = "Premium chat has more than one configured launch-grade lane."
    elif configured_premium:
        resilience_status = "warning"
        resilience_summary = "Premium chat currently relies on a single configured launch-grade lane."
    else:
        resilience_status = "blocked"
        resilience_summary = "Premium chat does not yet have any configured launch-grade lane redundancy."

    return {
        "status": status,
        "summary": summary,
        "detail": detail,
        "launch_grade_ready": bool(healthy_premium),
        "public_paid_usage_ready": bool(configured_premium),
        "primary_provider": primary_provider or None,
        "fallback_provider": fallback_provider or None,
        "configured_launch_grade_provider_count": len(configured_premium),
        "healthy_launch_grade_provider_count": len(healthy_premium),
        "configured_launch_grade_providers": [item["provider"] for item in configured_premium],
        "healthy_launch_grade_providers": [item["provider"] for item in healthy_premium],
        "degraded_launch_grade_providers": [item["provider"] for item in degraded_premium],
        "fallback_only_provider": "heuristic",
        "cost_class": "premium_api_variable" if configured_premium else "fallback_only",
        "economics_status": economics_status,
        "economics_summary": economics_summary,
        "resilience_status": resilience_status,
        "resilience_summary": resilience_summary,
        "providers": provider_states,
    }


def _image_lane_class(provider: str) -> str:
    if provider in _IMAGE_LAUNCH_GRADE_PROVIDERS:
        return "launch_grade"
    if provider in _IMAGE_FALLBACK_ONLY_PROVIDERS:
        return "fallback_only"
    return "degraded_only"


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


def _build_image_provider_truth(
    *,
    provider_status: list[dict[str, Any]],
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    provider_map = {
        str(provider.get("name") or "").strip().lower(): provider
        for provider in provider_status
        if isinstance(provider, dict) and str(provider.get("name") or "").strip()
    }

    launch_grade_states = [
        _serialize_image_provider_state(provider_map.get(name), provider=name, smoke_lookup=smoke_lookup)
        for name in ("fal", "runware")
    ]
    fallback_states = [
        _serialize_image_provider_state(provider_map.get(name), provider=name, smoke_lookup=smoke_lookup)
        for name in ("huggingface", "pollinations")
    ]
    degraded_states = [
        _serialize_image_provider_state(provider_map.get(name), provider=name, smoke_lookup=smoke_lookup)
        for name in ("demo",)
    ]

    configured_launch_grade = [item for item in launch_grade_states if item["configured"]]
    healthy_launch_grade = [item for item in configured_launch_grade if item["healthy_for_launch"] is True]
    unverified_runtime_healthy = [
        item
        for item in configured_launch_grade
        if item["runtime_available"] is True and item["smoke_verified_for_current_build"] is not True
    ]
    configured_fallback = [item for item in fallback_states if item["configured"]]
    configured_degraded = [item for item in degraded_states if item["configured"]]

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

    if healthy_launch_grade:
        status = "pass"
        summary = "Image generation has a healthy managed launch-grade lane."
    elif unverified_runtime_healthy:
        status = "blocked"
        summary = "Managed image lanes exist, but the current build has not proven them through live smoke yet."
    elif configured_launch_grade:
        status = "blocked"
        summary = "Managed image providers are configured, but none are currently healthy."
    else:
        status = "blocked"
        summary = "Image generation does not currently have a launch-grade managed lane."

    if configured_launch_grade:
        economics_status = "pass"
        economics_summary = ""
    elif configured_fallback or configured_degraded:
        economics_status = "warning"
        economics_summary = (
            "Current image routing depends on fallback lanes, so paid public image generation is not trustworthy yet."
        )
    else:
        economics_status = "warning"
        economics_summary = "No managed image provider is configured for public paid usage."

    if len(configured_launch_grade) >= 2:
        resilience_status = "pass"
        resilience_summary = "Image generation has more than one configured managed launch-grade lane."
    elif configured_launch_grade:
        resilience_status = "warning"
        resilience_summary = "Image generation currently relies on a single configured managed launch-grade lane."
    else:
        resilience_status = "blocked"
        resilience_summary = "Image generation does not yet have managed launch-grade lane redundancy."

    return {
        "status": status,
        "summary": summary,
        "detail": detail,
        "launch_grade_ready": bool(healthy_launch_grade),
        "public_paid_usage_ready": bool(healthy_launch_grade),
        "configured_launch_grade_provider_count": len(configured_launch_grade),
        "healthy_launch_grade_provider_count": len(healthy_launch_grade),
        "configured_launch_grade_providers": [item["provider"] for item in configured_launch_grade],
        "healthy_launch_grade_providers": [item["provider"] for item in healthy_launch_grade],
        "fallback_only_providers": [item["provider"] for item in configured_fallback],
        "degraded_only_providers": [item["provider"] for item in configured_degraded],
        "cost_class": "managed_image_variable" if configured_launch_grade else "fallback_only_or_missing",
        "economics_status": economics_status,
        "economics_summary": economics_summary,
        "resilience_status": resilience_status,
        "resilience_summary": resilience_summary,
        "providers": launch_grade_states + fallback_states + degraded_states,
    }


def _serialize_image_provider_state(
    payload: dict[str, Any] | None,
    *,
    provider: str,
    smoke_lookup: dict[tuple[str, str], dict[str, Any]],
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        smoke = _smoke_state_for_provider(smoke_lookup=smoke_lookup, surface="image", provider=provider)
        return {
            "provider": provider,
            "lane_class": _image_lane_class(provider),
            "launch_grade": provider in _IMAGE_LAUNCH_GRADE_PROVIDERS,
            "credential_present": False,
            "configured": False,
            "status": "not_configured",
            "detail": f"{provider}:not_configured",
            "runtime_available": False,
            "healthy_for_launch": False,
            "launch_classification": "blocked" if provider in _IMAGE_LAUNCH_GRADE_PROVIDERS else "pass",
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
        and provider in _IMAGE_LAUNCH_GRADE_PROVIDERS
        and smoke_verified_for_current_build
    )
    launch_classification = _classify_launch_provider_state(
        configured=configured,
        runtime_available=healthy_for_launch,
        launch_grade=provider in _IMAGE_LAUNCH_GRADE_PROVIDERS,
    )
    return {
        "provider": provider,
        "lane_class": _image_lane_class(provider),
        "launch_grade": provider in _IMAGE_LAUNCH_GRADE_PROVIDERS,
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


def _chat_provider_is_configured(*, settings: Settings, provider: str) -> bool:
    normalized = provider.strip().lower()
    if normalized == "gemini":
        return bool((settings.gemini_api_key or "").strip())
    if normalized == "openrouter":
        return bool((settings.openrouter_api_key or "").strip())
    if normalized == "openai":
        return bool((settings.openai_api_key or "").strip())
    return False


def _build_smoke_check(
    *,
    settings: Settings,
    provider_smoke_report: dict[str, Any] | None,
    provider_status: list[dict[str, Any]],
    chat_routing: dict[str, Any],
) -> dict[str, str]:
    if provider_smoke_report is None:
        return {
            "status": "warning",
            "summary": "No live provider smoke report has been recorded yet.",
            "detail": "Run scripts/provider_smoke.py intentionally before broader public launch decisions; Sprint 9 should keep this visible.",
        }

    current_build = load_version_info().build
    summary = provider_smoke_report.get("summary") if isinstance(provider_smoke_report.get("summary"), dict) else {}
    coverage = (
        provider_smoke_report.get("coverage")
        if isinstance(provider_smoke_report.get("coverage"), dict)
        else _summarize_smoke_coverage(
            provider_smoke_report.get("results") if isinstance(provider_smoke_report.get("results"), list) else []
        )
    )
    ok_count = int(summary.get("ok") or 0)
    error_count = int(summary.get("error") or 0)
    report_build = str(provider_smoke_report.get("build") or "").strip()
    recorded_at_raw = str(provider_smoke_report.get("recorded_at") or "").strip()
    recorded_at = _parse_iso8601(recorded_at_raw)
    if recorded_at is None:
        return {
            "status": "warning",
            "summary": "Provider smoke report exists but timestamp is unreadable.",
            "detail": "Re-run the smoke suite so launch-readiness can trust report freshness.",
        }
    age = datetime.now(timezone.utc) - recorded_at
    coverage_detail = _format_smoke_coverage_detail(coverage)
    coverage_gaps = _resolve_smoke_coverage_gaps(
        settings=settings,
        provider_status=provider_status,
        chat_routing=chat_routing,
        coverage=coverage,
    )
    build_gap = (
        f"report_build={report_build} does not match current_build={current_build}"
        if report_build and current_build and report_build != current_build
        else ""
    )
    if error_count > 0:
        return {
            "status": "warning",
            "summary": "The latest live provider smoke report contains errors.",
            "detail": (
                f"Last smoke run was {_format_age(age)} ago"
                f"{f' on build {report_build}' if report_build else ''} and recorded {error_count} hard errors. "
                f"Coverage: {coverage_detail}. Keep this visible for Sprint 9 provider work."
            ),
        }
    if ok_count <= 0:
        return {
            "status": "warning",
            "summary": "The latest provider smoke report recorded no successful live cases.",
            "detail": (
                f"Last smoke run was {_format_age(age)} ago"
                f"{f' on build {report_build}' if report_build else ''}. "
                f"Coverage: {coverage_detail}."
            ),
        }
    if age > timedelta(days=7):
        return {
            "status": "warning",
            "summary": "The latest live provider smoke report is stale.",
            "detail": (
                f"Last smoke run was {_format_age(age)} ago"
                f"{f' on build {report_build}' if report_build else ''}. "
                f"Coverage: {coverage_detail}. Refresh it before launch decisions."
            ),
        }
    if build_gap or coverage_gaps:
        gap_bits = [bit for bit in [build_gap, *coverage_gaps] if bit]
        return {
            "status": "warning",
            "summary": "The latest provider smoke report does not fully cover the current launch-grade provider mix.",
            "detail": (
                f"Last smoke run was {_format_age(age)} ago"
                f"{f' on build {report_build}' if report_build else ''} with {ok_count} successful cases. "
                f"Coverage: {coverage_detail}. Remaining gaps: {'; '.join(gap_bits)}."
            ),
        }
    return {
        "status": "pass",
        "summary": "A recent live provider smoke report is available.",
        "detail": (
            f"Last smoke run was {_format_age(age)} ago"
            f"{f' on build {report_build}' if report_build else ''} with {ok_count} successful cases. "
            f"Coverage: {coverage_detail}."
        ),
    }


def _resolve_smoke_coverage_gaps(
    *,
    settings: Settings,
    provider_status: list[dict[str, Any]],
    chat_routing: dict[str, Any],
    coverage: dict[str, Any],
) -> list[str]:
    gaps: list[str] = []
    chat_tested = set(_coerce_string_list(coverage.get("chat_launch_grade_providers_tested")))
    image_tested = set(_coerce_string_list(coverage.get("image_launch_grade_providers_tested")))

    configured_chat = set(_configured_chat_launch_grade_providers(settings=settings, chat_routing=chat_routing))
    missing_chat = sorted(configured_chat - chat_tested)
    if missing_chat:
        gaps.append(
            "configured premium chat lanes were not smoke-tested on this build: "
            + ", ".join(missing_chat)
        )

    configured_image = set(_configured_image_launch_grade_providers(provider_status=provider_status))
    missing_image = sorted(configured_image - image_tested)
    if missing_image:
        gaps.append(
            "configured managed image lanes were not smoke-tested on this build: "
            + ", ".join(missing_image)
        )

    return gaps


def _configured_chat_launch_grade_providers(*, settings: Settings, chat_routing: dict[str, Any]) -> list[str]:
    providers_payload = chat_routing.get("providers") if isinstance(chat_routing, dict) else None
    configured: list[str] = []
    if isinstance(providers_payload, dict):
        for provider_name in ("gemini", "openrouter", "openai"):
            payload = providers_payload.get(provider_name)
            if isinstance(payload, dict) and payload.get("configured") is True:
                configured.append(provider_name)
    if configured:
        return configured

    fallback_configured: list[str] = []
    for provider_name in ("gemini", "openrouter", "openai"):
        if _chat_provider_is_configured(settings=settings, provider=provider_name):
            fallback_configured.append(provider_name)
    return fallback_configured


def _configured_image_launch_grade_providers(*, provider_status: list[dict[str, Any]]) -> list[str]:
    provider_map = {
        str(provider.get("name") or "").strip().lower(): provider
        for provider in provider_status
        if isinstance(provider, dict) and str(provider.get("name") or "").strip()
    }
    configured: list[str] = []
    for provider_name in ("fal", "runware"):
        payload = provider_map.get(provider_name)
        if not isinstance(payload, dict):
            continue
        status = str(payload.get("status") or "").strip().lower()
        if status and status != "not_configured":
            configured.append(provider_name)
    return configured


def _format_smoke_coverage_detail(coverage: dict[str, Any]) -> str:
    surfaces = coverage.get("surfaces") if isinstance(coverage.get("surfaces"), dict) else {}
    details: list[str] = []
    for surface in ("chat", "image"):
        surface_payload = surfaces.get(surface)
        if not isinstance(surface_payload, dict):
            continue
        providers = _coerce_string_list(surface_payload.get("providers"))
        ok_count = int(surface_payload.get("ok") or 0)
        if providers:
            details.append(f"{surface}={','.join(providers)} (ok={ok_count})")
    if not details:
        return "no provider surfaces were captured"
    return " | ".join(details)


def _coerce_string_list(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    result: list[str] = []
    for raw_value in values:
        value = str(raw_value or "").strip().lower()
        if value and value not in result:
            result.append(value)
    return result


def _infer_smoke_surface(result: dict[str, Any]) -> str:
    surface = str(result.get("surface") or "").strip().lower()
    if surface in {"chat", "image"}:
        return surface
    workflow = str(result.get("workflow") or "").strip().lower()
    if workflow == "chat":
        return "chat"
    return "image"


def _build_startup_verification_check(startup_verification_report: dict[str, Any] | None) -> dict[str, str]:
    if startup_verification_report is None:
        return {
            "status": "warning",
            "summary": "No local startup verification report has been recorded yet.",
            "detail": "Run apps/studio/ops/verify-studio-local.ps1 after startup so operator truth survives outside the repo.",
        }

    report_status = str(startup_verification_report.get("status") or "").strip().lower()
    recorded_at_raw = str(startup_verification_report.get("recorded_at") or "").strip()
    recorded_at = _parse_iso8601(recorded_at_raw)
    backend_build = str(startup_verification_report.get("backend_build") or "").strip()
    expected_build = str(startup_verification_report.get("expected_build") or "").strip()
    backend_health = str(startup_verification_report.get("backend_health") or "").strip()
    failure_items = startup_verification_report.get("failures")
    failures = [str(item).strip() for item in failure_items] if isinstance(failure_items, list) else []

    if report_status != "pass":
        failure_detail = ", ".join(failures) if failures else "unknown verification failure"
        return {
            "status": "blocked",
            "summary": "The latest local startup verification report is failing.",
            "detail": (
                f"{failure_detail}. "
                f"Backend build={backend_build or 'unknown'}, expected={expected_build or 'unknown'}, "
                f"health={backend_health or 'unknown'}."
            ),
        }

    if recorded_at is None:
        return {
            "status": "warning",
            "summary": "Startup verification exists but the timestamp is unreadable.",
            "detail": "Re-run the local verify script so launch readiness can trust report freshness.",
        }

    age = datetime.now(timezone.utc) - recorded_at
    if age > timedelta(days=1):
        return {
            "status": "warning",
            "summary": "The latest local startup verification report is stale.",
            "detail": f"Last local verify run was { _format_age(age) } ago on build {backend_build or 'unknown'}.",
        }

    return {
        "status": "pass",
        "summary": "A recent local startup verification report is available.",
        "detail": (
            f"Last local verify run was { _format_age(age) } ago on build {backend_build or 'unknown'} "
            f"with backend health {backend_health or 'unknown'}."
        ),
    }


def _build_runtime_logs_check(runtime_logs: dict[str, Any] | None, *, settings: Settings) -> dict[str, str]:
    if runtime_logs is None:
        return {
            "status": "warning",
            "summary": "Runtime log snapshot is unavailable.",
            "detail": str(settings.log_directory_path),
        }

    directory = str(runtime_logs.get("directory") or settings.log_directory_path)
    if runtime_logs.get("outside_repo") is not True:
        return {
            "status": "warning",
            "summary": "Runtime logs are still inside the repo tree.",
            "detail": directory,
        }

    files = runtime_logs.get("files")
    backend_app_log_exists = False
    if isinstance(files, dict):
        backend_app_log = files.get("backend.app.log")
        if isinstance(backend_app_log, dict):
            backend_app_log_exists = backend_app_log.get("exists") is True

    if not backend_app_log_exists:
        return {
            "status": "warning",
            "summary": "Runtime log directory is external, but the main backend app log is missing.",
            "detail": directory,
        }

    existing_count = int(runtime_logs.get("existing_count") or 0)
    return {
        "status": "pass",
        "summary": "Runtime logs are external and active.",
        "detail": f"{existing_count} known runtime log file(s) detected under {directory}.",
    }


def _build_deployment_verification_check(deployment_verification_report: dict[str, Any] | None) -> dict[str, str]:
    if deployment_verification_report is None:
        return {
            "status": "warning",
            "summary": "No protected deployment verification report has been recorded yet.",
            "detail": "Run deploy/verify-studio-staging.ps1 after a staging bring-up so operator truth covers the deployed stack too.",
        }

    report_status = str(deployment_verification_report.get("status") or "").strip().lower()
    recorded_at_raw = str(deployment_verification_report.get("recorded_at") or "").strip()
    recorded_at = _parse_iso8601(recorded_at_raw)
    label = str(deployment_verification_report.get("label") or "deployment").strip()
    base_url = str(deployment_verification_report.get("base_url") or "").strip()
    actual_build = str(deployment_verification_report.get("actual_build") or deployment_verification_report.get("build") or "").strip()
    summary = str(deployment_verification_report.get("summary") or "").strip()

    if report_status == "blocked":
        return {
            "status": "blocked",
            "summary": "The latest deployment verification report is failing.",
            "detail": f"{label} at {base_url or 'unknown base URL'} reports blockers for build {actual_build or 'unknown'}.",
        }

    if recorded_at is None:
        return {
            "status": "warning",
            "summary": "Deployment verification exists but its timestamp is unreadable.",
            "detail": f"{label} at {base_url or 'unknown base URL'}.",
        }

    age = datetime.now(timezone.utc) - recorded_at
    if age > timedelta(days=7):
        return {
            "status": "warning",
            "summary": "The latest deployment verification report is stale.",
            "detail": f"{label} at {base_url or 'unknown base URL'} was verified { _format_age(age) } ago.",
        }

    if report_status == "warning":
        return {
            "status": "warning",
            "summary": "The latest deployment verification report passed with warnings.",
            "detail": f"{label} at {base_url or 'unknown base URL'} was verified { _format_age(age) } ago. {summary or 'warnings remain.'}",
        }

    return {
        "status": "pass",
        "summary": "A recent protected deployment verification report is available.",
        "detail": f"{label} at {base_url or 'unknown base URL'} was verified { _format_age(age) } ago on build {actual_build or 'unknown'}.",
    }


def _build_chat_provider_check(*, settings: Settings, chat_routing: dict[str, Any]) -> dict[str, str]:
    providers_payload = chat_routing.get("providers") if isinstance(chat_routing, dict) else None
    provider_states: list[tuple[str, dict[str, Any]]] = []
    if isinstance(providers_payload, dict):
        for provider_name in ("gemini", "openrouter", "openai"):
            payload = providers_payload.get(provider_name)
            if isinstance(payload, dict):
                provider_states.append((provider_name, payload))

    configured_states = [
        (provider_name, payload)
        for provider_name, payload in provider_states
        if payload.get("configured") is True
    ]

    if not configured_states:
        configured_by_settings = any(
            (
                provider == "gemini"
                and bool((settings.gemini_api_key or "").strip())
            )
            or (
                provider == "openrouter"
                and bool((settings.openrouter_api_key or "").strip())
            )
            or (
                provider == "openai"
                and bool((settings.openai_api_key or "").strip())
            )
            for provider in {
                str(chat_routing.get("primary_provider") or "").strip().lower(),
                str(chat_routing.get("fallback_provider") or "").strip().lower(),
                "gemini",
                "openrouter",
                "openai",
            }
        )
        if configured_by_settings:
            return {
                "status": "warning",
                "summary": "Premium chat providers are configured, but runtime health is not visible yet.",
                "detail": "Launch readiness should inspect real chat provider health, not only raw API key presence.",
            }
        return {
            "status": "blocked",
            "summary": "No premium chat provider lane is configured.",
            "detail": "Launch-ready chat should not depend on heuristic fallback alone.",
        }

    healthy_states = [
        (provider_name, payload)
        for provider_name, payload in configured_states
        if str(payload.get("status") or "").strip().lower() == "healthy"
    ]
    degraded_details = ", ".join(
        _format_chat_provider_state(provider_name, payload)
        for provider_name, payload in configured_states
    )

    if healthy_states and len(healthy_states) == len(configured_states):
        return {
            "status": "pass",
            "summary": "Configured premium chat lanes are currently healthy.",
            "detail": degraded_details,
        }

    if healthy_states:
        return {
            "status": "warning",
            "summary": "At least one premium chat lane is healthy, but others are degraded.",
            "detail": degraded_details,
        }

    return {
        "status": "blocked",
        "summary": "All configured premium chat providers are currently degraded.",
        "detail": degraded_details,
    }


def _build_launch_gate(
    *,
    checks: list[dict[str, str]],
    startup_verification_report: dict[str, Any] | None,
    deployment_verification_report: dict[str, Any] | None,
    provider_smoke_report: dict[str, Any] | None,
) -> dict[str, Any]:
    blocking_checks = [
        check
        for check in checks
        if str(check.get("status") or "").strip().lower() == "blocked"
    ]
    blocking_reasons = [_format_launch_gate_reason(check) for check in blocking_checks]
    warning_checks = [
        check
        for check in checks
        if str(check.get("status") or "").strip().lower() == "warning"
    ]
    warning_reasons = [_format_launch_gate_reason(check) for check in warning_checks]
    blocking_keys = _collect_launch_gate_keys(blocking_checks)
    warning_keys = _collect_launch_gate_keys(warning_checks)
    disallowed_warning_keys = sorted(key for key in warning_keys if key not in _ALLOWED_PROTECTED_LAUNCH_WARNING_KEYS)
    ready_for_protected_launch = not blocking_reasons and not disallowed_warning_keys
    if ready_for_protected_launch:
        status = "ready"
        summary = "Studio has no launch-shaped blockers for a protected external rollout."
    elif blocking_reasons:
        status = "blocked"
        summary = "Studio still has hard blockers before it is safe for a protected launch."
    else:
        status = "needs_attention"
        summary = "Studio has no hard blockers, but some non-launch-safe warnings still need to be cleared."
    return {
        "status": status,
        "summary": summary,
        "ready_for_protected_launch": ready_for_protected_launch,
        "blocking_keys": blocking_keys,
        "warning_keys": warning_keys,
        "blocking_reasons": blocking_reasons,
        "warning_reasons": warning_reasons,
        "last_verified_build": _resolve_last_verified_build(
            startup_verification_report=startup_verification_report,
            deployment_verification_report=deployment_verification_report,
            provider_smoke_report=provider_smoke_report,
        ),
    }


def _parse_iso8601(value: str) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _format_age(age: timedelta) -> str:
    total_seconds = max(int(age.total_seconds()), 0)
    if total_seconds < 60:
        return "under a minute"
    minutes = total_seconds // 60
    if minutes < 60:
        return f"{minutes} minute(s)"
    hours = minutes // 60
    if hours < 48:
        return f"{hours} hour(s)"
    days = hours // 24
    return f"{days} day(s)"


def _format_chat_provider_state(provider_name: str, payload: dict[str, Any]) -> str:
    status = str(payload.get("status") or "unknown").strip().lower()
    status_code = payload.get("last_status_code")
    reason = str(payload.get("last_failure_reason") or "").strip()
    if status_code:
        return f"{provider_name}:{status} ({status_code}, {reason or 'failure'})"
    if reason:
        return f"{provider_name}:{status} ({reason})"
    return f"{provider_name}:{status}"


def _format_launch_gate_reason(check: dict[str, str]) -> str:
    key = str(check.get("key") or "").strip()
    summary = str(check.get("summary") or "").strip()
    detail = str(check.get("detail") or "").strip()
    if key and summary:
        return f"{key}: {summary}"
    if summary:
        return summary
    if detail:
        return detail
    return key or "unknown readiness issue"


def _collect_launch_gate_keys(checks: list[dict[str, str]]) -> list[str]:
    keys: list[str] = []
    for check in checks:
        key = str(check.get("key") or "").strip()
        if key and key not in keys:
            keys.append(key)
    return keys


def _resolve_last_verified_build(
    *,
    startup_verification_report: dict[str, Any] | None,
    deployment_verification_report: dict[str, Any] | None,
    provider_smoke_report: dict[str, Any] | None,
) -> str | None:
    deployment_build = _read_report_build(
        deployment_verification_report,
        keys=("actual_build", "build"),
    )
    if deployment_build:
        return deployment_build
    startup_build = _read_report_build(
        startup_verification_report,
        keys=("backend_build", "expected_build", "build"),
    )
    if startup_build:
        return startup_build
    smoke_build = _read_report_build(provider_smoke_report, keys=("build",))
    if smoke_build:
        return smoke_build
    return None


def _read_report_build(
    report: dict[str, Any] | None,
    *,
    keys: tuple[str, ...],
) -> str | None:
    if not isinstance(report, dict):
        return None
    for key in keys:
        value = str(report.get(key) or "").strip()
        if value:
            return value
    return None


def _classify_provider_snapshot(provider: dict[str, Any]) -> str:
    status = str(provider.get("status") or "").strip().lower()
    if status in {"error", "unavailable"}:
        return "hard_unhealthy"
    if status in {"degraded", "cooldown"}:
        return "degraded"

    circuit_breaker = provider.get("circuit_breaker")
    if isinstance(circuit_breaker, dict):
        circuit_state = str(circuit_breaker.get("state") or "").strip().lower()
        last_error = str(circuit_breaker.get("last_error") or "").strip()
        consecutive_failures = int(circuit_breaker.get("consecutive_failures") or 0)
        if circuit_state == "open":
            return "hard_unhealthy"
        if circuit_state == "half_open":
            return "degraded"
        if consecutive_failures > 0 and last_error:
            return "degraded"

    success_rate = provider.get("success_rate_last_5m")
    if isinstance(success_rate, (int, float)):
        if success_rate <= 0.0:
            return "hard_unhealthy"
        if success_rate < 1.0:
            return "degraded"

    return "healthy"


def _is_outside_repo(path: Path, *, repo_root: Path) -> bool:
    try:
        path.resolve().relative_to(repo_root.resolve())
    except ValueError:
        return True
    return False
