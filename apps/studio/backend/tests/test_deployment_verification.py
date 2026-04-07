from __future__ import annotations

from pathlib import Path

from config.env import get_settings
from studio_platform.services.deployment_verification import (
    build_deployment_verification_report,
    deployment_verification_report_path,
    load_deployment_verification_report,
    persist_deployment_verification_report,
)


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


def test_deployment_verification_passes_when_launch_truth_is_ready() -> None:
    report = build_deployment_verification_report(
        base_url="https://staging-studio.omniacreata.com",
        expected_build="2026.04.07.26",
        version_payload={"build": "2026.04.07.26"},
        health_payload={"status": "healthy"},
        health_detail_payload={
            "launch_readiness": {"status": "ready", "summary": "No blockers"},
            "startup_verification": {"status": "pass"},
            "deployment_verification": {
                "label": "protected-staging",
                "base_url": "https://staging-studio.omniacreata.com",
                "actual_build": "2026.04.07.26",
            },
            "runtime_logs": {"outside_repo": True},
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
