from __future__ import annotations

from pathlib import Path

from config.env import get_settings
from studio_platform.services.deployment_verification import (
    build_blocked_deployment_verification_report,
    build_deployment_verification_report,
    deployment_verification_exit_code,
    deployment_verification_report_path,
    load_deployment_verification_report,
    persist_deployment_verification_report,
)
from studio_platform.versioning import load_version_info


def _platform_readiness_payload(
    *,
    current_stage: str = "protected_beta",
    current_stage_label: str = "Protected Beta",
    current_stage_status: str = "needs_attention",
    next_stage: str | None = "public_paid_platform",
    next_stage_label: str | None = "Public Paid Platform",
    summary: str = "Studio is stable for local alpha and progressing toward protected beta.",
) -> dict[str, object]:
    return {
        "current_stage": current_stage,
        "current_stage_label": current_stage_label,
        "current_stage_status": current_stage_status,
        "next_stage": next_stage,
        "next_stage_label": next_stage_label,
        "summary": summary,
        "phases": [],
    }


def test_deployment_verification_blocks_on_build_mismatch() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.07.26",
        version_payload={"build": "2026.04.07.25"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_readiness": {"status": "ready", "summary": "ready"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.07.25",
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(),
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.07.26",
    )

    assert report["status"] == "blocked"
    assert report["closure_ready"] is False
    build_check = next(check for check in report["checks"] if check["key"] == "version_build")
    assert build_check["status"] == "blocked"


def test_blocked_deployment_verification_report_is_not_closure_ready() -> None:
    report = build_blocked_deployment_verification_report(
        expected_build="2026.04.08.02",
        summary="Protected staging verification could not reach the deployment cleanly.",
        detail="Network failure while requesting https://staging.example.com/api/v1/version: timeout",
        check_key="deployment_connectivity",
        owner_health_checked=True,
    )

    assert report["status"] == "blocked"
    assert report["closure_ready"] is False
    assert report["owner_health_checked"] is True
    assert report["closure_gaps"] == [
        "Network failure while requesting https://staging.example.com/api/v1/version: timeout"
    ]
    assert "Sprint 9" in report["closure_summary"]
    blocked_check = report["checks"][0]
    assert blocked_check["key"] == "deployment_connectivity"
    assert blocked_check["status"] == "blocked"


def test_deployment_verification_passes_when_launch_truth_is_ready() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.07.26",
        version_payload={"build": "2026.04.07.26"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_gate": {
                "status": "ready",
                "summary": "Safe for protected launch.",
                "ready_for_protected_launch": True,
                "blocking_keys": [],
                "warning_keys": [],
                "blocking_reasons": [],
                "warning_reasons": [],
                "last_verified_build": "2026.04.07.26",
            },
            "launch_readiness": {"status": "ready", "summary": "No blockers"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.07.26",
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(
                current_stage_status="ready",
                summary="Protected beta gate is clear and public paid work is next.",
            ),
            "cost_telemetry": {
                "window_days": 30,
                "total_spend_usd": 0.0,
                "event_count": 0,
                "providers": [],
                "provider_models": [],
                "studio_models": [],
                "surfaces": [],
                "days": [],
                "recent_events": [],
                "coverage": {},
            },
            "truth_sync": {
                "current_build": "2026.04.07.26",
                "summary": "Operator artefacts are synchronized to the current build.",
                "all_present": True,
                "all_current_build": True,
                "blocking_artifacts": [],
                "warning_artifacts": [],
                "artifacts": [],
            },
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.07.26",
    )

    assert report["status"] == "pass"
    assert report["blocking_count"] == 0
    assert report["warning_count"] == 0
    assert report["closure_ready"] is True
    gate_check = next(check for check in report["checks"] if check["key"] == "launch_gate")
    assert gate_check["status"] == "pass"
    visibility_check = next(
        check for check in report["checks"] if check["key"] == "platform_readiness_visibility"
    )
    assert visibility_check["status"] == "pass"
    assert report["platform_readiness"]["current_stage"] == "protected_beta"


def test_deployment_verification_uses_launch_gate_for_closure_truth() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.08.01",
        version_payload={"build": "2026.04.08.01"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_gate": {
                "status": "blocked",
                "summary": "Protected launch is still blocked.",
                "ready_for_protected_launch": False,
                "blocking_keys": ["deployment_environment"],
                "warning_keys": [],
                "blocking_reasons": ["deployment_environment: Studio is still running in local development mode."],
                "warning_reasons": [],
                "last_verified_build": "2026.04.08.01",
            },
            "launch_readiness": {"status": "ready", "summary": "legacy ready"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.08.01",
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(
                summary="Protected beta is still blocked by launch truth."
            ),
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.08.01",
    )

    assert report["status"] == "blocked"
    assert report["closure_ready"] is False
    assert any("deployment_environment" in gap for gap in report["closure_gaps"])
    gate_check = next(check for check in report["checks"] if check["key"] == "launch_gate")
    assert gate_check["status"] == "blocked"


def test_persisted_deployment_verification_report_lives_under_runtime_root(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        persisted = persist_deployment_verification_report(
            settings,
            label="protected-staging",
            base_url="https://staging-studio.omniacreata.com",
            report={
                "status": "pass",
                "summary": "Deployment verification passed.",
                "checks": [],
            },
        )

        report_path = deployment_verification_report_path(settings, label="protected-staging")
        assert Path(persisted["path"]).exists()
        assert report_path.exists()
        assert str(report_path.parent).startswith(str((tmp_path / "runtime-root").resolve()))
        assert persisted["build"]
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_load_deployment_verification_report_prefers_latest_runtime_report(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        persist_deployment_verification_report(
            settings,
            label="staging-a",
            base_url="https://a.example.com",
            report={"status": "pass", "summary": "first", "checks": []},
        )
        persist_deployment_verification_report(
            settings,
            label="staging-b",
            base_url="https://b.example.com",
            report={"status": "warning", "summary": "second", "checks": []},
        )

        loaded = load_deployment_verification_report(settings)

        assert loaded is not None
        assert loaded["label"] == "staging-b"
        assert loaded["base_url"] == "https://b.example.com"
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_deployment_verification_warns_when_owner_health_detail_is_skipped() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.07.26",
        version_payload={"build": "2026.04.07.26"},
        health_payload={"status": "healthy"},
        health_detail_payload=None,
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=False,
    )

    assert report["status"] == "warning"
    assert report["closure_ready"] is False
    launch_check = next(check for check in report["checks"] if check["key"] == "launch_readiness")
    assert launch_check["status"] == "warning"


def test_deployment_verification_closure_allows_provider_only_launch_warnings() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.07.26",
        version_payload={"build": "2026.04.07.26"},
        health_payload={"status": "degraded"},
        health_detail_payload={
            "launch_gate": {
                "status": "ready",
                "summary": "Only provider-class warnings remain.",
                "ready_for_protected_launch": True,
                "blocking_keys": [],
                "warning_keys": ["provider_smoke", "image_provider_lane"],
                "blocking_reasons": [],
                "warning_reasons": [
                    "provider_smoke: Provider smoke has not been run recently.",
                    "image_provider_lane: No managed image lane is configured.",
                ],
                "last_verified_build": "2026.04.07.26",
            },
            "launch_readiness": {
                "status": "needs_attention",
                "summary": "Premium provider warnings remain.",
                "checks": [
                    {
                        "key": "provider_smoke",
                        "status": "warning",
                        "summary": "Provider smoke has not been run recently.",
                        "detail": "optional",
                    },
                    {
                        "key": "image_provider_lane",
                        "status": "warning",
                        "summary": "No managed image lane is configured.",
                        "detail": "optional",
                    },
                ],
            },
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.07.26",
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(
                current_stage_status="needs_attention",
                summary="Protected beta is close, but provider warnings remain.",
            ),
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.07.26",
    )

    assert report["status"] == "warning"
    assert report["closure_ready"] is True
    assert report["closure_gaps"] == []


def test_deployment_verification_requires_launch_gate_build_to_match_expected_build() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.08.01",
        version_payload={"build": "2026.04.08.01"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_gate": {
                "status": "ready",
                "summary": "Safe for protected launch.",
                "ready_for_protected_launch": True,
                "blocking_keys": [],
                "warning_keys": [],
                "blocking_reasons": [],
                "warning_reasons": [],
                "last_verified_build": "2026.04.07.99",
            },
            "launch_readiness": {"status": "ready", "summary": "No blockers"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.08.01",
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(
                summary="Protected beta truth is present, but the verified build is stale."
            ),
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.08.01",
    )

    assert report["status"] == "warning"
    assert report["closure_ready"] is False
    build_check = next(check for check in report["checks"] if check["key"] == "launch_gate_build")
    assert build_check["status"] == "warning"
    assert any("last_verified_build" in gap for gap in report["closure_gaps"])


def test_deployment_verification_closure_requires_deployment_report_visibility() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.07.26",
        version_payload={"build": "2026.04.07.26"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_readiness": {"status": "ready", "summary": "No blockers"},
            "startup_verification": {"status": "pass"},
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(),
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.07.26",
    )

    assert report["status"] == "warning"
    assert report["closure_ready"] is False
    visibility_check = next(
        check for check in report["checks"] if check["key"] == "deployment_verification_visibility"
    )
    assert visibility_check["status"] == "warning"


def test_deployment_verification_warning_report_can_still_round_trip_into_launch_gate() -> None:
    current_build = load_version_info().build
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build=current_build,
        version_payload={"build": current_build},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_gate": {
                "status": "ready",
                "summary": "Only provider-class warnings remain.",
                "ready_for_protected_launch": True,
                "blocking_keys": [],
                "warning_keys": ["provider_smoke", "image_provider_lane"],
                "blocking_reasons": [],
                "warning_reasons": [],
                "last_verified_build": current_build,
            },
            "launch_readiness": {"status": "needs_attention", "summary": "Provider warnings only"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": current_build,
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(
                current_stage_status="ready",
                summary="Protected beta is clear and public paid readiness is next.",
            ),
            "cost_telemetry": {
                "window_days": 30,
                "total_spend_usd": 0.0,
                "event_count": 0,
                "providers": [],
                "provider_models": [],
                "studio_models": [],
                "surfaces": [],
                "days": [],
                "recent_events": [],
                "coverage": {},
            },
            "truth_sync": {
                "current_build": current_build,
                "summary": "Operator artefacts are synchronized to the current build.",
                "all_present": True,
                "all_current_build": True,
                "blocking_artifacts": [],
                "warning_artifacts": [],
                "artifacts": [],
            },
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build=current_build,
    )

    assert report["status"] == "pass"
    assert report["closure_ready"] is True


def test_deployment_verification_requires_platform_readiness_visibility_for_owner_truth() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.09.33",
        version_payload={"build": "2026.04.09.33"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_gate": {
                "status": "ready",
                "summary": "Safe for protected launch.",
                "ready_for_protected_launch": True,
                "blocking_keys": [],
                "warning_keys": [],
                "blocking_reasons": [],
                "warning_reasons": [],
                "last_verified_build": "2026.04.09.33",
            },
            "launch_readiness": {"status": "ready", "summary": "No blockers"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.09.33",
            },
            "runtime_logs": {"outside_repo": True},
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.09.33",
    )

    assert report["status"] == "warning"
    assert report["closure_ready"] is False
    visibility_check = next(
        check for check in report["checks"] if check["key"] == "platform_readiness_visibility"
    )
    assert visibility_check["status"] == "warning"
    assert any("platform_readiness" in gap for gap in report["closure_gaps"])


def test_deployment_verification_includes_cost_telemetry_when_owner_truth_exposes_it() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.10.43",
        version_payload={"build": "2026.04.10.43"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_gate": {
                "status": "ready",
                "summary": "Safe for protected launch.",
                "ready_for_protected_launch": True,
                "blocking_keys": [],
                "warning_keys": [],
                "blocking_reasons": [],
                "warning_reasons": [],
                "last_verified_build": "2026.04.10.43",
            },
            "launch_readiness": {"status": "ready", "summary": "No blockers"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.10.43",
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(
                current_stage_status="ready",
                summary="Protected beta is clear and public paid readiness is next.",
            ),
            "cost_telemetry": {
                "window_days": 30,
                "window_start": "2026-03-11T00:00:00Z",
                "window_end": "2026-04-10T23:59:59Z",
                "total_spend_usd": 1.23,
                "event_count": 3,
                "providers": [{"provider": "openai", "total_spend_usd": 1.23, "event_count": 3}],
                "provider_models": [],
                "studio_models": [],
                "surfaces": [],
                "days": [],
                "recent_events": [],
                "coverage": {},
            },
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.10.43",
    )

    visibility_check = next(check for check in report["checks"] if check["key"] == "cost_telemetry_visibility")
    assert visibility_check["status"] == "pass"
    assert report["cost_telemetry"]["total_spend_usd"] == 1.23
    assert report["cost_telemetry"]["window_days"] == 30


def test_deployment_verification_includes_truth_sync_when_owner_truth_exposes_it() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.10.44",
        version_payload={"build": "2026.04.10.44"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_gate": {
                "status": "ready",
                "summary": "Safe for protected launch.",
                "ready_for_protected_launch": True,
                "blocking_keys": [],
                "warning_keys": [],
                "blocking_reasons": [],
                "warning_reasons": [],
                "last_verified_build": "2026.04.10.44",
            },
            "launch_readiness": {"status": "ready", "summary": "No blockers"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.10.44",
            },
            "runtime_logs": {"outside_repo": True},
            "platform_readiness": _platform_readiness_payload(
                current_stage_status="ready",
                summary="Protected beta is clear and public paid readiness is next.",
            ),
            "truth_sync": {
                "current_build": "2026.04.10.44",
                "summary": "Some operator artefacts still point at an older build.",
                "all_present": True,
                "all_current_build": False,
                "blocking_artifacts": [],
                "warning_artifacts": ["provider_smoke"],
                "artifacts": [],
            },
        },
        login_page_html="<html><head><title>OmniaCreata Studio</title></head><body>OmniaCreata Studio</body></html>",
        owner_health_checked=True,
        expected_report_label="protected-staging",
        expected_report_base_url="https://staging-studio.omniacreata.com",
        expected_report_build="2026.04.10.44",
    )

    assert report["truth_sync"]["current_build"] == "2026.04.10.44"
    assert report["truth_sync"]["warning_artifacts"] == ["provider_smoke"]


def test_deployment_verification_exit_code_requires_closure_ready_when_requested() -> None:
    report = {
        "status": "warning",
        "closure_ready": False,
    }

    assert deployment_verification_exit_code(report, require_closure_ready=False) == 0
    assert deployment_verification_exit_code(report, require_closure_ready=True) == 2


def test_deployment_verification_exit_code_blocks_on_blocked_status() -> None:
    report = {
        "status": "blocked",
        "closure_ready": True,
    }

    assert deployment_verification_exit_code(report, require_closure_ready=False) == 1
    assert deployment_verification_exit_code(report, require_closure_ready=True) == 1
