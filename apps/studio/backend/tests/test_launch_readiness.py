from __future__ import annotations

from pathlib import Path

import pytest

from config.env import Environment, get_settings
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
from studio_platform.services.launch_readiness import (
    build_runtime_log_snapshot,
    build_launch_readiness_report,
    load_provider_smoke_report,
    load_startup_verification_report,
    persist_provider_smoke_report,
    persist_startup_verification_report,
)
from studio_platform.services.deployment_verification import persist_deployment_verification_report
from studio_platform.store import SqliteStudioStateStore


def _seed_operator_runtime_artifacts(settings, runtime_root: Path) -> tuple[dict[str, object], dict[str, object]]:
    logs_root = runtime_root / "logs"
    logs_root.mkdir(parents=True, exist_ok=True)
    (logs_root / "backend.app.log").write_text("studio launch readiness\n", encoding="utf-8")
    startup_report = persist_startup_verification_report(
        settings,
        expected_build="2026.04.07.25",
        backend_build="2026.04.07.25",
        backend_health="healthy",
        backend_url="http://127.0.0.1:8000",
        frontend_url="http://127.0.0.1:5173",
        frontend_login_ok=True,
        frontend_shell_ok=True,
        backend_mode="stable always-on",
        frontend_mode="stable preview",
    )
    runtime_logs = build_runtime_log_snapshot(settings)
    return startup_report, runtime_logs


def test_provider_smoke_report_persists_outside_repo(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        report = persist_provider_smoke_report(
            settings,
            selected_provider="fal",
            include_failure_probe=True,
            results=[
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "status": "ok",
                    "latency_ms": 1234,
                }
            ],
        )
        loaded = load_provider_smoke_report(settings)

        assert loaded is not None
        assert loaded["provider"] == "fal"
        assert loaded["summary"]["ok"] == 1
        assert Path(loaded["path"]).exists()
        assert str(Path(loaded["path"]).parent).startswith(str((tmp_path / "runtime-root").resolve()))
        assert report["build"]
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_load_startup_verification_report_accepts_utf8_bom(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        report = persist_startup_verification_report(
            settings,
            expected_build="2026.04.07.30",
            backend_build="2026.04.07.30",
            backend_health="degraded",
            backend_url="http://127.0.0.1:8000",
            frontend_url="http://127.0.0.1:5173",
            frontend_login_ok=True,
            frontend_shell_ok=True,
            backend_mode="stable always-on",
            frontend_mode="stable preview",
        )
        report_path = Path(report["path"])
        report_path.write_text(report_path.read_text(encoding="utf-8"), encoding="utf-8-sig")

        loaded = load_startup_verification_report(settings)

        assert loaded is not None
        assert loaded["status"] == "pass"
        assert loaded["build"] == report["build"]
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_launch_readiness_report_can_be_ready_when_launch_inputs_are_present(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_fal_api_key = settings.fal_api_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.fal_api_key = "fal-key"
    try:
        startup_report, runtime_logs = _seed_operator_runtime_artifacts(
            settings,
            (tmp_path / "runtime-root").resolve(),
        )
        deployment_report = persist_deployment_verification_report(
            settings,
            label="protected-staging",
            base_url="https://staging-studio.omniacreata.com",
            report={
                "status": "pass",
                "summary": "Deployment verification passed.",
                "checks": [],
                "actual_build": "2026.04.07.25",
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            include_failure_probe=True,
            results=[
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "status": "ok",
                    "latency_ms": 950,
                },
                {
                    "label": "runware-probe",
                    "provider_name": "runware",
                    "workflow": "edit",
                    "status": "expected_failure",
                    "latency_ms": 210,
                },
            ],
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "fal", "status": "healthy"}],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={
                "primary_provider": "gemini",
                "fallback_provider": "openrouter",
                "providers": {
                    "gemini": {"configured": True, "status": "healthy"},
                    "openrouter": {"configured": True, "status": "healthy"},
                    "openai": {"configured": False, "status": "not_configured"},
                },
            },
            provider_smoke_report=report,
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        assert readiness["status"] == "ready"
        assert readiness["blocking_count"] == 0
        assert readiness["warning_count"] == 0
        assert readiness["launch_gate"]["ready_for_protected_launch"] is True
        assert readiness["launch_gate"]["blocking_keys"] == []
        assert readiness["launch_gate"]["warning_keys"] == []
        assert readiness["launch_gate"]["blocking_reasons"] == []
        assert readiness["launch_gate"]["warning_reasons"] == []
        assert readiness["launch_gate"]["last_verified_build"] == "2026.04.07.25"
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.fal_api_key = original_fal_api_key


def test_launch_readiness_blocks_when_all_configured_chat_providers_are_degraded(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_gemini_api_key = settings.gemini_api_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.gemini_api_key = "gemini-key"
    try:
        startup_report, runtime_logs = _seed_operator_runtime_artifacts(
            settings,
            (tmp_path / "runtime-root").resolve(),
        )
        deployment_report = persist_deployment_verification_report(
            settings,
            label="protected-staging",
            base_url="https://staging-studio.omniacreata.com",
            report={
                "status": "warning",
                "summary": "Owner token missing.",
                "checks": [],
                "actual_build": "2026.04.07.25",
            },
        )
        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "pollinations", "status": "healthy"}],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={
                "primary_provider": "gemini",
                "fallback_provider": "openrouter",
                "providers": {
                    "gemini": {
                        "configured": True,
                        "status": "cooldown",
                        "last_status_code": 429,
                        "last_failure_reason": "http_status_error",
                    },
                    "openrouter": {
                        "configured": True,
                        "status": "cooldown",
                        "last_status_code": 401,
                        "last_failure_reason": "http_status_error",
                    },
                    "openai": {"configured": False, "status": "not_configured"},
                },
            },
            provider_smoke_report={
                "recorded_at": "2026-04-07T00:00:00+00:00",
                "summary": {"ok": 1, "error": 0},
            },
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        chat_check = next(check for check in readiness["checks"] if check["key"] == "chat_provider_lane")
        assert chat_check["status"] == "blocked"
        assert "gemini:cooldown" in chat_check["detail"]
        assert "openrouter:cooldown" in chat_check["detail"]
        assert readiness["launch_gate"]["ready_for_protected_launch"] is False
        assert "chat_provider_lane" in readiness["launch_gate"]["blocking_keys"]
        assert any(
            "chat_provider_lane" in reason
            for reason in readiness["launch_gate"]["blocking_reasons"]
        )
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.gemini_api_key = original_gemini_api_key


def test_launch_readiness_marks_provider_snapshot_warning_when_recent_live_failures_exist(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    try:
        startup_report, runtime_logs = _seed_operator_runtime_artifacts(
            settings,
            (tmp_path / "runtime-root").resolve(),
        )
        deployment_report = persist_deployment_verification_report(
            settings,
            label="protected-staging",
            base_url="https://staging-studio.omniacreata.com",
            report={
                "status": "pass",
                "summary": "Deployment verification passed.",
                "checks": [],
                "actual_build": "2026.04.07.30",
            },
        )
        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {
                    "name": "pollinations",
                    "status": "healthy",
                    "circuit_breaker": {
                        "state": "open",
                        "consecutive_failures": 1,
                        "retry_after_seconds": 45,
                        "last_error": "Pollinations returned 401",
                    },
                    "success_rate_last_5m": 0.0,
                }
            ],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={"providers": {}},
            provider_smoke_report={
                "recorded_at": "2026-04-07T00:00:00+00:00",
                "summary": {"ok": 1, "error": 0},
            },
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        provider_check = next(check for check in readiness["checks"] if check["key"] == "provider_health_snapshot")
        assert provider_check["status"] == "warning"
        assert "pollinations" in provider_check["detail"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key


@pytest.mark.asyncio
async def test_health_detail_includes_provider_smoke_and_launch_readiness(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        persist_startup_verification_report(
            settings,
            expected_build="2026.04.07.25",
            backend_build="2026.04.07.25",
            backend_health="healthy",
            backend_url="http://127.0.0.1:8000",
            frontend_url="http://127.0.0.1:5173",
            frontend_login_ok=True,
            frontend_shell_ok=True,
            backend_mode="stable always-on",
            frontend_mode="stable preview",
        )
        persist_deployment_verification_report(
            settings,
            label="protected-staging",
            base_url="https://staging-studio.omniacreata.com",
            report={
                "status": "pass",
                "summary": "Deployment verification passed.",
                "checks": [],
                "actual_build": "2026.04.07.25",
            },
        )
        logs_root = (tmp_path / "runtime-root" / "logs").resolve()
        logs_root.mkdir(parents=True, exist_ok=True)
        (logs_root / "backend.app.log").write_text("ready\n", encoding="utf-8")
        persist_provider_smoke_report(
            settings,
            selected_provider="fal",
            include_failure_probe=False,
            results=[
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "status": "ok",
                    "latency_ms": 600,
                }
            ],
        )
        store = SqliteStudioStateStore(tmp_path / "runtime" / "studio-state.sqlite3")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        try:
            await service.initialize()
            health = await service.health(detail=True)

            assert "provider_smoke" in health
            assert health["provider_smoke"]["summary"]["ok"] == 1
            assert "startup_verification" in health
            assert health["startup_verification"]["status"] == "pass"
            assert "deployment_verification" in health
            assert health["deployment_verification"]["status"] == "pass"
            assert "runtime_logs" in health
            assert health["runtime_logs"]["outside_repo"] is True
            assert "launch_readiness" in health
            assert "launch_gate" in health
            assert health["launch_gate"]["last_verified_build"] == "2026.04.07.25"
            assert any(check["key"] == "provider_smoke" for check in health["launch_readiness"]["checks"])
            assert any(check["key"] == "startup_verification" for check in health["launch_readiness"]["checks"])
            assert any(check["key"] == "deployment_verification" for check in health["launch_readiness"]["checks"])
        finally:
            await service.shutdown()
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_launch_gate_is_not_ready_when_warning_is_not_provider_only(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_fal_api_key = settings.fal_api_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.fal_api_key = "fal-key"
    try:
        startup_report, runtime_logs = _seed_operator_runtime_artifacts(
            settings,
            (tmp_path / "runtime-root").resolve(),
        )
        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "fal", "status": "healthy"}],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={
                "providers": {
                    "gemini": {"configured": False, "status": "not_configured"},
                    "openrouter": {"configured": True, "status": "healthy"},
                    "openai": {"configured": False, "status": "not_configured"},
                },
            },
            provider_smoke_report={
                "recorded_at": "2026-04-07T00:00:00+00:00",
                "summary": {"ok": 1, "error": 0},
            },
            startup_verification_report=startup_report,
            deployment_verification_report=None,
            runtime_logs=runtime_logs,
        )

        assert readiness["status"] == "needs_attention"
        assert readiness["launch_gate"]["ready_for_protected_launch"] is False
        assert "deployment_verification" in readiness["launch_gate"]["warning_keys"]
        assert any(
            "deployment_verification" in reason
            for reason in readiness["launch_gate"]["warning_reasons"]
        )
        assert readiness["launch_gate"]["last_verified_build"] == "2026.04.07.25"
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.fal_api_key = original_fal_api_key
