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
}


def provider_smoke_report_path(settings: Settings) -> Path:
    return (settings.runtime_root_path / "reports" / "provider-smoke-latest.json").resolve()


def startup_verification_report_path(settings: Settings) -> Path:
    return (settings.runtime_root_path / "reports" / "local-verify-latest.json").resolve()


def persist_provider_smoke_report(
    settings: Settings,
    *,
    selected_provider: str,
    include_failure_probe: bool,
    results: Iterable[Any],
) -> dict[str, Any]:
    version = load_version_info()
    serialized_results = [
        result.to_dict() if hasattr(result, "to_dict") else dict(result)
        for result in results
    ]
    summary = _summarize_smoke_results(serialized_results)
    payload: dict[str, Any] = {
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "version": version.version,
        "build": version.build,
        "provider": selected_provider,
        "include_failure_probe": include_failure_probe,
        "summary": summary,
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
    payload["path"] = str(report_path)
    return payload


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

    chat_provider_check = _build_chat_provider_check(settings=settings, chat_routing=chat_routing)
    add_check(
        "chat_provider_lane",
        chat_provider_check["status"],
        chat_provider_check["summary"],
        chat_provider_check["detail"],
    )

    premium_image_configured = bool((settings.fal_api_key or "").strip()) or bool((settings.runware_api_key or "").strip())
    if premium_image_configured:
        add_check(
            "image_provider_lane",
            "pass",
            "At least one premium image provider is configured.",
            "Live image generation can use a managed premium lane.",
        )
    else:
        add_check(
            "image_provider_lane",
            "warning",
            "No managed premium image provider is configured.",
            "Studio can still route through standard lanes, but launch confidence is lower without fal or Runware.",
        )

    smoke_check = _build_smoke_check(provider_smoke_report)
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
    }


def _summarize_smoke_results(results: list[dict[str, Any]]) -> dict[str, int]:
    summary = {"ok": 0, "expected_failure": 0, "skipped": 0, "error": 0}
    for result in results:
        status = str(result.get("status") or "").strip()
        if status in summary:
            summary[status] += 1
    return summary


def _build_smoke_check(provider_smoke_report: dict[str, Any] | None) -> dict[str, str]:
    if provider_smoke_report is None:
        return {
            "status": "blocked",
            "summary": "No live provider smoke report has been recorded yet.",
            "detail": "Run scripts/provider_smoke.py intentionally before treating Studio as launch-ready.",
        }

    summary = provider_smoke_report.get("summary") if isinstance(provider_smoke_report.get("summary"), dict) else {}
    ok_count = int(summary.get("ok") or 0)
    error_count = int(summary.get("error") or 0)
    recorded_at_raw = str(provider_smoke_report.get("recorded_at") or "").strip()
    recorded_at = _parse_iso8601(recorded_at_raw)
    if recorded_at is None:
        return {
            "status": "warning",
            "summary": "Provider smoke report exists but timestamp is unreadable.",
            "detail": "Re-run the smoke suite so launch-readiness can trust report freshness.",
        }
    age = datetime.now(timezone.utc) - recorded_at
    if error_count > 0:
        return {
            "status": "blocked",
            "summary": "The latest live provider smoke report contains errors.",
            "detail": f"Last smoke run was { _format_age(age) } ago and recorded {error_count} hard errors.",
        }
    if ok_count <= 0:
        return {
            "status": "warning",
            "summary": "The latest provider smoke report recorded no successful live cases.",
            "detail": f"Last smoke run was { _format_age(age) } ago.",
        }
    if age > timedelta(days=7):
        return {
            "status": "warning",
            "summary": "The latest live provider smoke report is stale.",
            "detail": f"Last smoke run was { _format_age(age) } ago. Refresh it before launch decisions.",
        }
    return {
        "status": "pass",
        "summary": "A recent live provider smoke report is available.",
        "detail": f"Last smoke run was { _format_age(age) } ago with {ok_count} successful cases.",
    }


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
