from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config.env import Settings

from ..versioning import load_version_info

_TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_CLOSURE_SPRINT_LABEL = "Sprint 9"
_ALLOWED_PROTECTED_LAUNCH_WARNING_KEYS = {
    "provider_smoke",
    "provider_health_snapshot",
    "chat_provider_lane",
    "image_provider_lane",
}


def deployment_verification_report_path(settings: Settings, *, label: str) -> Path:
    normalized = _normalize_label(label)
    return (settings.runtime_root_path / "reports" / f"{normalized}-verify-latest.json").resolve()


def persist_deployment_verification_report(
    settings: Settings,
    *,
    label: str,
    base_url: str,
    report: dict[str, Any],
) -> dict[str, Any]:
    version = load_version_info()
    payload = dict(report)
    payload["recorded_at"] = datetime.now(timezone.utc).isoformat()
    payload["version"] = version.version
    payload["build"] = version.build
    payload["label"] = label
    payload["base_url"] = base_url
    report_path = deployment_verification_report_path(settings, label=label)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")
    payload["path"] = str(report_path)
    return payload


def build_blocked_deployment_verification_report(
    *,
    expected_build: str | None,
    summary: str,
    detail: str,
    check_key: str = "staging_environment",
    owner_health_checked: bool = False,
) -> dict[str, Any]:
    return {
        "status": "blocked",
        "summary": summary,
        "blocking_count": 1,
        "warning_count": 0,
        "expected_build": expected_build,
        "actual_build": None,
        "health_status": None,
        "checks": [
            {
                "key": check_key,
                "status": "blocked",
                "summary": summary,
                "detail": detail,
            }
        ],
        "owner_health_checked": owner_health_checked,
        "closure_ready": False,
        "closure_summary": (
            f"Protected staging verification cannot close {_CLOSURE_SPRINT_LABEL} "
            "until this blocker is cleared."
        ),
        "closure_gaps": [detail],
    }


def load_deployment_verification_report(
    settings: Settings,
    *,
    label: str | None = None,
) -> dict[str, Any] | None:
    candidate_paths: list[Path] = []
    if label:
        candidate_paths.append(deployment_verification_report_path(settings, label=label))
    else:
        reports_root = (settings.runtime_root_path / "reports").resolve()
        if reports_root.exists():
            candidate_paths.extend(sorted(reports_root.glob("*-verify-latest.json")))

    newest_payload: dict[str, Any] | None = None
    newest_time: float | None = None
    for path in candidate_paths:
        payload = _load_json_payload(path)
        if not isinstance(payload, dict):
            continue
        if "base_url" not in payload or "label" not in payload:
            continue
        try:
            modified_at = path.stat().st_mtime
        except OSError:
            modified_at = 0.0
        payload["path"] = str(path.resolve())
        if newest_payload is None or newest_time is None or modified_at >= newest_time:
            newest_payload = payload
            newest_time = modified_at
    return newest_payload


def build_deployment_verification_report(
    *,
    base_url: str,
    expected_build: str | None,
    version_payload: dict[str, Any] | None,
    health_payload: dict[str, Any] | None,
    health_detail_payload: dict[str, Any] | None,
    login_page_html: str | None,
    owner_health_checked: bool,
    expected_report_label: str | None = None,
    expected_report_base_url: str | None = None,
    expected_report_build: str | None = None,
) -> dict[str, Any]:
    checks: list[dict[str, str]] = []
    platform_readiness_payload: dict[str, Any] | None = None
    cost_telemetry_payload: dict[str, Any] | None = None
    truth_sync_payload: dict[str, Any] | None = None

    def add_check(key: str, status: str, summary: str, detail: str) -> None:
        checks.append(
            {
                "key": key,
                "status": status,
                "summary": summary,
                "detail": detail,
            }
        )

    actual_build = ""
    manifest_build = ""
    if isinstance(version_payload, dict):
        manifest_build = str(version_payload.get("build") or "").strip()
        actual_build = str(version_payload.get("bootBuild") or manifest_build).strip()
    if actual_build:
        if expected_build and actual_build != expected_build:
            add_check(
                "version_build",
                "blocked",
                "The deployed build does not match the expected Studio build.",
                f"expected={expected_build}, actual={actual_build}, manifest={manifest_build or 'unknown'}",
            )
        else:
            add_check(
                "version_build",
                "pass",
                "The deployed build matches the expected Studio build.",
                f"build={actual_build}, manifest={manifest_build or actual_build}",
            )
    else:
        add_check(
            "version_build",
            "blocked",
            "The version endpoint did not expose a build number.",
            f"base_url={base_url}",
        )

    health_status = ""
    if isinstance(health_payload, dict):
        health_status = str(health_payload.get("status") or "").strip()
    if health_status:
        add_check(
            "health_status",
            "pass" if health_status in {"healthy", "degraded"} else "warning",
            "The deployment health endpoint returned a status.",
            f"status={health_status}",
        )
    else:
        add_check(
            "health_status",
            "blocked",
            "The deployment health endpoint did not return a status.",
            f"base_url={base_url}",
        )

    title = _extract_title(login_page_html)
    if title == "OmniaCreata Studio" and login_page_html and "OmniaCreata Studio" in login_page_html:
        add_check(
            "login_shell",
            "pass",
            "The public login shell is serving the expected Studio document.",
            title,
        )
    else:
        add_check(
            "login_shell",
            "blocked",
            "The public login shell is missing or serving the wrong document.",
            title or "missing title",
        )

    closure_gaps: list[str] = []
    launch_gate = None
    if isinstance(health_detail_payload, dict):
        launch_gate = health_detail_payload.get("launch_gate")
    if isinstance(launch_gate, dict):
        launch_gate_status = str(launch_gate.get("status") or "").strip().lower()
        launch_gate_summary = str(launch_gate.get("summary") or "").strip()
        launch_gate_ready = launch_gate.get("ready_for_protected_launch") is True
        launch_gate_blocking_reasons = _coerce_string_list(launch_gate.get("blocking_reasons"))
        launch_gate_warning_reasons = _coerce_string_list(launch_gate.get("warning_reasons"))
        launch_gate_blocking_keys = set(_coerce_string_list(launch_gate.get("blocking_keys")))
        launch_gate_warning_keys = set(_coerce_string_list(launch_gate.get("warning_keys")))
        disallowed_launch_gate_warning_keys = sorted(
            key for key in launch_gate_warning_keys if key not in _ALLOWED_PROTECTED_LAUNCH_WARNING_KEYS
        )
        launch_gate_last_verified_build = str(launch_gate.get("last_verified_build") or "").strip()

        if launch_gate_ready and launch_gate_warning_reasons:
            add_check(
                "launch_gate",
                "warning",
                "Owner launch gate says protected launch is safe, but advisory warnings still remain.",
                launch_gate_summary or "ready with advisory warnings",
            )
        elif launch_gate_ready:
            add_check(
                "launch_gate",
                "pass",
                "Owner health detail reports protected launch is currently safe.",
                launch_gate_summary or "ready",
            )
        elif launch_gate_status == "blocked" or launch_gate_blocking_reasons or launch_gate_blocking_keys:
            add_check(
                "launch_gate",
                "blocked",
                "Owner launch gate still reports blocking issues.",
                launch_gate_summary or "blocked",
            )
            if launch_gate_blocking_reasons:
                closure_gaps.extend(launch_gate_blocking_reasons)
            elif launch_gate_blocking_keys:
                closure_gaps.append(
                    "launch gate still blocks on: " + ", ".join(sorted(launch_gate_blocking_keys))
                )
            else:
                closure_gaps.append("owner launch gate still reports blocking issues")
        else:
            add_check(
                "launch_gate",
                "warning",
                "Owner launch gate still reports warnings.",
                launch_gate_summary or "needs attention",
            )
            if disallowed_launch_gate_warning_keys:
                closure_gaps.append(
                    "launch gate still has non-Sprint-9 warnings: "
                    + ", ".join(disallowed_launch_gate_warning_keys)
                )

        if launch_gate_last_verified_build:
            if expected_report_build and launch_gate_last_verified_build != expected_report_build:
                add_check(
                    "launch_gate_build",
                    "warning",
                    "Owner launch gate is reporting a different last verified build.",
                    f"expected={expected_report_build}, launch_gate={launch_gate_last_verified_build}",
                )
                closure_gaps.append(
                    "owner launch gate last_verified_build does not match the expected staging build"
                )
            else:
                add_check(
                    "launch_gate_build",
                    "pass",
                    "Owner launch gate reports the expected verified build.",
                    f"build={launch_gate_last_verified_build}",
                )
        else:
            add_check(
                "launch_gate_build",
                "warning",
                "Owner launch gate did not report a last verified build.",
                "Launch operators should be able to see which build was last proven.",
            )
            closure_gaps.append("owner launch gate did not expose last_verified_build")
    elif owner_health_checked:
        add_check(
            "launch_gate",
            "warning",
            "Owner health detail did not expose the explicit launch gate.",
            "Expected /v1/healthz/detail to include launch_gate.",
        )
        closure_gaps.append("owner health detail did not expose launch_gate")

    launch_readiness = None
    if isinstance(health_detail_payload, dict):
        launch_readiness = health_detail_payload.get("launch_readiness")
    if isinstance(launch_readiness, dict) and not isinstance(launch_gate, dict):
        launch_status = str(launch_readiness.get("status") or "").strip().lower()
        summary = str(launch_readiness.get("summary") or "").strip()
        launch_checks = launch_readiness.get("checks")
        launch_blocked_keys = _collect_check_keys(launch_checks, status="blocked")
        launch_warning_keys = _collect_check_keys(launch_checks, status="warning")
        disallowed_launch_warning_keys = sorted(launch_warning_keys - _ALLOWED_PROTECTED_LAUNCH_WARNING_KEYS)
        if launch_status == "ready":
            add_check(
                "launch_readiness",
                "pass",
                "Owner health detail reports no remaining launch blockers.",
                summary or "ready",
            )
        elif launch_status == "needs_attention" and not launch_blocked_keys:
            add_check(
                "launch_readiness",
                "warning",
                "Owner health detail still reports launch warnings.",
                summary or "needs attention",
            )
            if disallowed_launch_warning_keys:
                closure_gaps.append(
                    "launch readiness still has non-Sprint-9 warnings: "
                    + ", ".join(disallowed_launch_warning_keys)
                )
        else:
            add_check(
                "launch_readiness",
                "blocked",
                "Owner health detail still reports launch blockers.",
                summary or (launch_status or "blocked"),
            )
            closure_gaps.append(
                "launch readiness still reports blockers"
                if not launch_blocked_keys
                else "launch readiness still blocks on: " + ", ".join(sorted(launch_blocked_keys))
            )
    elif owner_health_checked and not isinstance(launch_gate, dict):
        add_check(
            "launch_readiness",
            "blocked",
            "Owner health detail did not expose launch readiness.",
            "Expected /v1/healthz/detail to include launch_readiness.",
        )
        closure_gaps.append("owner health detail did not expose launch_readiness")
    elif not owner_health_checked:
        add_check(
            "launch_readiness",
            "warning",
            "Owner health detail was not checked because no owner bearer token was supplied.",
            "Pass an owner token to verify launch readiness directly from the protected deployment.",
        )
        closure_gaps.append("protected staging closure requires an owner bearer token")

    startup_verification = None
    if isinstance(health_detail_payload, dict):
        startup_verification = health_detail_payload.get("startup_verification")
    if isinstance(startup_verification, dict):
        startup_status = str(startup_verification.get("status") or "").strip().lower()
        add_check(
            "startup_verification_visibility",
            "pass" if startup_status else "warning",
            "Owner health detail exposes startup verification metadata.",
            f"status={startup_status or 'unknown'}",
        )
        if not startup_status:
            closure_gaps.append("owner health detail exposed startup_verification without a status")
    elif owner_health_checked:
        add_check(
            "startup_verification_visibility",
            "warning",
            "Owner health detail does not expose startup verification metadata.",
            "This is acceptable only if the deployment runtime does not share host operator reports.",
        )
        closure_gaps.append("owner health detail did not expose startup_verification")
    else:
        add_check(
            "startup_verification_visibility",
            "warning",
            "Startup verification visibility was not checked because owner health detail was skipped.",
            "Pass an owner token if you want the deployment verify step to inspect owner-only health detail.",
        )

    deployment_verification = None
    if isinstance(health_detail_payload, dict):
        deployment_verification = health_detail_payload.get("deployment_verification")
    if isinstance(deployment_verification, dict):
        visible_label = str(deployment_verification.get("label") or "").strip()
        visible_base_url = str(deployment_verification.get("base_url") or "").strip()
        visible_build = str(
            deployment_verification.get("actual_build")
            or deployment_verification.get("build")
            or ""
        ).strip()
        mismatches: list[str] = []
        if expected_report_label and visible_label and visible_label != expected_report_label:
            mismatches.append(f"label={visible_label}")
        if expected_report_base_url and visible_base_url and visible_base_url.rstrip("/") != expected_report_base_url.rstrip("/"):
            mismatches.append(f"base_url={visible_base_url}")
        if expected_report_build and visible_build and visible_build != expected_report_build:
            mismatches.append(f"build={visible_build}")
        if mismatches:
            add_check(
                "deployment_verification_visibility",
                "warning",
                "Owner health detail exposes deployment verification metadata, but it is not the expected report.",
                ", ".join(mismatches),
            )
            closure_gaps.append(
                "owner health detail deployment_verification does not match the expected staging report"
            )
        else:
            detail_parts: list[str] = []
            if visible_label:
                detail_parts.append(f"label={visible_label}")
            if visible_build:
                detail_parts.append(f"build={visible_build}")
            add_check(
                "deployment_verification_visibility",
                "pass",
                "Owner health detail exposes deployment verification metadata.",
                ", ".join(detail_parts) or "deployment verification is visible",
            )
    elif owner_health_checked:
        add_check(
            "deployment_verification_visibility",
            "warning",
            "Owner health detail does not expose deployment verification metadata.",
            "Run deployment verify from the same runtime root as Studio so the report can round-trip back into /v1/healthz/detail.",
        )
        closure_gaps.append("owner health detail did not expose deployment_verification")
    else:
        add_check(
            "deployment_verification_visibility",
            "warning",
            "Deployment verification visibility was not checked because owner health detail was skipped.",
            "Pass an owner token if you want deployment verify to inspect owner-only deployment metadata.",
        )

    runtime_logs = None
    if isinstance(health_detail_payload, dict):
        runtime_logs = health_detail_payload.get("runtime_logs")
    if isinstance(runtime_logs, dict):
        outside_repo = runtime_logs.get("outside_repo") is True
        add_check(
            "runtime_logs",
            "pass" if outside_repo else "warning",
            "Owner health detail exposes runtime log snapshot.",
            f"outside_repo={outside_repo}",
        )
        if not outside_repo:
            closure_gaps.append("runtime logs are not confirmed outside the repo")
    elif owner_health_checked:
        add_check(
            "runtime_logs",
            "warning",
            "Owner health detail does not expose runtime log snapshot.",
            "Launch operators should still be able to inspect external logs directly.",
        )
        closure_gaps.append("owner health detail did not expose runtime_logs")
    else:
        add_check(
            "runtime_logs",
            "warning",
            "Runtime log visibility was not checked because owner health detail was skipped.",
            "Pass an owner token if you want deployment verify to inspect owner-only runtime log metadata.",
        )

    platform_readiness = None
    if isinstance(health_detail_payload, dict):
        platform_readiness = health_detail_payload.get("platform_readiness")
    if isinstance(platform_readiness, dict):
        platform_readiness_payload = platform_readiness
        current_stage = str(platform_readiness.get("current_stage") or "").strip()
        current_stage_label = str(
            platform_readiness.get("current_stage_label") or current_stage or ""
        ).strip()
        current_stage_status = str(platform_readiness.get("current_stage_status") or "").strip().lower()
        next_stage = str(platform_readiness.get("next_stage") or "").strip()
        next_stage_label = str(platform_readiness.get("next_stage_label") or next_stage or "").strip()
        summary = str(platform_readiness.get("summary") or "").strip()
        detail_parts: list[str] = []
        if current_stage_label:
            if current_stage_status:
                detail_parts.append(f"current={current_stage_label} ({current_stage_status})")
            else:
                detail_parts.append(f"current={current_stage_label}")
        if next_stage_label:
            detail_parts.append(f"next={next_stage_label}")
        if summary:
            detail_parts.append(summary)
        add_check(
            "platform_readiness_visibility",
            "pass" if current_stage else "warning",
            "Owner health detail exposes platform readiness phases.",
            ", ".join(detail_parts) or "platform readiness is visible",
        )
        if not current_stage:
            closure_gaps.append("owner health detail exposed platform_readiness without current_stage")
    elif owner_health_checked:
        add_check(
            "platform_readiness_visibility",
            "warning",
            "Owner health detail does not expose platform readiness phases.",
            "Expected /v1/healthz/detail to include platform_readiness alongside launch truth.",
        )
        closure_gaps.append("owner health detail did not expose platform_readiness")
    else:
        add_check(
            "platform_readiness_visibility",
            "warning",
            "Platform readiness visibility was not checked because owner health detail was skipped.",
            "Pass an owner token if you want deployment verify to inspect owner-only platform readiness phases.",
        )

    cost_telemetry = None
    if isinstance(health_detail_payload, dict):
        cost_telemetry = health_detail_payload.get("cost_telemetry")
    if isinstance(cost_telemetry, dict):
        cost_telemetry_payload = cost_telemetry
        add_check(
            "cost_telemetry_visibility",
            "pass",
            "Owner health detail exposes cost telemetry summary.",
            (
                f"window_days={cost_telemetry.get('window_days')}, "
                f"total_spend_usd={cost_telemetry.get('total_spend_usd')}"
            ),
        )
    elif owner_health_checked:
        add_check(
            "cost_telemetry_visibility",
            "warning",
            "Owner health detail does not expose cost telemetry summary.",
            "Expected /v1/healthz/detail to include cost_telemetry for owner-side spend truth.",
        )
    else:
        add_check(
            "cost_telemetry_visibility",
            "warning",
            "Cost telemetry visibility was not checked because owner health detail was skipped.",
            "Pass an owner token if you want deployment verify to inspect owner-only cost telemetry.",
        )

    truth_sync = None
    if isinstance(health_detail_payload, dict):
        truth_sync = health_detail_payload.get("truth_sync")
    if isinstance(truth_sync, dict):
        truth_sync_payload = truth_sync
    elif owner_health_checked:
        add_check(
            "truth_sync_visibility",
            "warning",
            "Owner health detail does not expose current-build truth sync metadata.",
            "Expected /v1/healthz/detail to include truth_sync for current-build artefact drift visibility.",
        )
    else:
        add_check(
            "truth_sync_visibility",
            "warning",
            "Truth sync visibility was not checked because owner health detail was skipped.",
            "Pass an owner token if you want deployment verify to inspect owner-only current-build truth sync.",
        )

    blocked = sum(1 for check in checks if check["status"] == "blocked")
    warnings = sum(1 for check in checks if check["status"] == "warning")
    closure_ready = owner_health_checked and blocked == 0 and not closure_gaps
    if closure_ready:
        closure_summary = (
            f"Protected staging verification satisfies the {_CLOSURE_SPRINT_LABEL} closure gate."
        )
    elif not owner_health_checked:
        closure_summary = (
            "Protected staging verification still needs an owner-token run before "
            f"{_CLOSURE_SPRINT_LABEL} can close."
        )
    elif blocked:
        closure_summary = "Protected staging verification still has deployment blockers."
    else:
        closure_summary = (
            f"Protected staging verification passed, but {_CLOSURE_SPRINT_LABEL} closure gaps remain."
        )
    if blocked:
        status = "blocked"
        summary = "Deployment verification found one or more blocking issues."
    elif warnings:
        status = "warning"
        summary = "Deployment verification passed with warnings."
    else:
        status = "pass"
        summary = "Deployment verification passed."

    report = {
        "status": status,
        "summary": summary,
        "blocking_count": blocked,
        "warning_count": warnings,
        "expected_build": expected_build,
        "actual_build": actual_build or None,
        "health_status": health_status or None,
        "checks": checks,
        "owner_health_checked": owner_health_checked,
        "closure_ready": closure_ready,
        "closure_summary": closure_summary,
        "closure_gaps": closure_gaps,
    }
    if platform_readiness_payload is not None:
        report["platform_readiness"] = platform_readiness_payload
    if cost_telemetry_payload is not None:
        report["cost_telemetry"] = cost_telemetry_payload
    if truth_sync_payload is not None:
        report["truth_sync"] = truth_sync_payload
    return report


def format_deployment_verification_lines(report: dict[str, Any]) -> list[str]:
    lines = [f"Deployment verification: {report.get('status')} - {report.get('summary')}"]
    checks = report.get("checks")
    if isinstance(checks, list):
        for check in checks:
            if not isinstance(check, dict):
                continue
            lines.append(
                f"[{check.get('status')}] {check.get('key')}: {check.get('summary')} ({check.get('detail')})"
            )
    platform_readiness = report.get("platform_readiness")
    if isinstance(platform_readiness, dict):
        stage_line = _format_platform_readiness_line(platform_readiness)
        if stage_line:
            lines.append(stage_line)
    closure_summary = str(report.get("closure_summary") or "").strip()
    if closure_summary:
        lines.append(
            f"{_CLOSURE_SPRINT_LABEL} closure: "
            f"{'ready' if report.get('closure_ready') else 'not ready'} - {closure_summary}"
        )
    return lines


def deployment_verification_exit_code(
    report: dict[str, Any],
    *,
    require_closure_ready: bool = False,
) -> int:
    if str(report.get("status") or "").strip().lower() == "blocked":
        return 1
    if require_closure_ready and report.get("closure_ready") is not True:
        return 2
    return 0


def _collect_check_keys(checks: Any, *, status: str) -> set[str]:
    keys: set[str] = set()
    if not isinstance(checks, list):
        return keys
    for raw_check in checks:
        if not isinstance(raw_check, dict):
            continue
        if str(raw_check.get("status") or "").strip().lower() != status:
            continue
        key = str(raw_check.get("key") or "").strip()
        if key:
            keys.add(key)
    return keys


def _coerce_string_list(values: Any) -> list[str]:
    if not isinstance(values, list):
        return []
    result: list[str] = []
    for raw_value in values:
        value = str(raw_value or "").strip()
        if value and value not in result:
            result.append(value)
    return result


def _extract_title(html: str | None) -> str:
    if not html:
        return ""
    match = _TITLE_RE.search(html)
    if match is None:
        return ""
    return " ".join(match.group(1).split()).strip()


def _normalize_label(label: str) -> str:
    value = "".join(char.lower() if char.isalnum() else "-" for char in label.strip())
    collapsed = re.sub(r"-{2,}", "-", value).strip("-")
    return collapsed or "deployment"


def _load_json_payload(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def _format_platform_readiness_line(platform_readiness: dict[str, Any]) -> str:
    current_stage_label = str(
        platform_readiness.get("current_stage_label")
        or platform_readiness.get("current_stage")
        or ""
    ).strip()
    current_stage_status = str(platform_readiness.get("current_stage_status") or "").strip().lower()
    next_stage_label = str(
        platform_readiness.get("next_stage_label")
        or platform_readiness.get("next_stage")
        or ""
    ).strip()
    summary = str(platform_readiness.get("summary") or "").strip()
    if not current_stage_label and not summary:
        return ""
    detail_parts: list[str] = []
    if current_stage_label:
        if current_stage_status:
            detail_parts.append(f"current={current_stage_label} ({current_stage_status})")
        else:
            detail_parts.append(f"current={current_stage_label}")
    if next_stage_label:
        detail_parts.append(f"next={next_stage_label}")
    if summary:
        detail_parts.append(summary)
    return "Platform readiness: " + " - ".join(detail_parts)
