from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import pytest

from config.env import Environment, get_settings
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
from studio_platform.services import launch_readiness as launch_readiness_module
from studio_platform.services.launch_readiness import (
    build_runtime_log_snapshot,
    build_launch_readiness_report,
    build_truth_sync_summary,
    load_provider_smoke_report,
    load_startup_verification_report,
    persist_provider_smoke_report,
    persist_startup_verification_report,
)
from studio_platform.services.deployment_verification import persist_deployment_verification_report
from studio_platform.services.provider_economics_dossier import persist_provider_economics_dossier
from studio_platform.store import SqliteStudioStateStore
from studio_platform.versioning import load_version_info


class _UnreadablePath:
    def __init__(self, raw_path: str = "C:/blocked/studio-runtime/reports/report.json") -> None:
        self.raw_path = raw_path

    def exists(self) -> bool:
        raise PermissionError("runtime path is not readable")

    def read_text(self, *args, **kwargs) -> str:
        raise PermissionError("runtime path is not readable")

    def resolve(self):
        raise PermissionError("runtime path is not readable")

    def __str__(self) -> str:
        return self.raw_path


@pytest.fixture(autouse=True)
def _enable_captcha_for_existing_launch_readiness_expectations():
    settings = get_settings()
    original = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    try:
        yield
    finally:
        settings.captcha_verification_enabled = original
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key


@pytest.fixture(autouse=True)
def _restore_launch_readiness_runtime_baseline():
    settings = get_settings()
    original_environment = settings.environment
    original_runtime_mode = settings.generation_runtime_mode
    try:
        yield
    finally:
        settings.environment = original_environment
        settings.generation_runtime_mode = original_runtime_mode


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


def _public_plan_payload(tmp_path: Path) -> dict[str, object]:
    service = StudioService(
        SqliteStudioStateStore(tmp_path / "runtime" / "plan-catalog.sqlite3"),
        ProviderRegistry(),
        tmp_path / "plan-media",
    )
    return service.get_public_plan_payload()


def test_launch_readiness_missing_report_loaders_tolerate_inaccessible_paths(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    unreadable = _UnreadablePath()
    monkeypatch.setattr(launch_readiness_module, "provider_smoke_report_path", lambda _settings: unreadable)
    monkeypatch.setattr(launch_readiness_module, "startup_verification_report_path", lambda _settings: unreadable)

    assert launch_readiness_module._path_exists(unreadable) is False
    assert launch_readiness_module._safe_resolve(unreadable) is unreadable
    assert load_provider_smoke_report(settings) is None
    assert load_startup_verification_report(settings) is None


def test_provider_smoke_report_persists_outside_repo(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        report = persist_provider_smoke_report(
            settings,
            selected_provider="fal",
            selected_surface="image",
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
        assert loaded["surface"] == "image"
        assert loaded["summary"]["ok"] == 1
        assert loaded["coverage"]["surfaces"]["image"]["providers"] == ["fal"]
        assert loaded["coverage"]["surfaces"]["chat"]["providers"] == []
        assert Path(loaded["path"]).exists()
        assert str(Path(loaded["path"]).parent).startswith(str((tmp_path / "runtime-root").resolve()))
        assert report["build"]
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_provider_smoke_report_merges_current_build_surfaces_for_same_env_source(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        persist_provider_smoke_report(
            settings,
            selected_provider="openrouter",
            selected_surface="chat",
            include_failure_probe=False,
            source_env_file="C:/fake/staging.env",
            results=[
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                }
            ],
        )
        merged = persist_provider_smoke_report(
            settings,
            selected_provider="fal",
            selected_surface="image",
            include_failure_probe=False,
            source_env_file="C:/fake/staging.env",
            results=[
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 920,
                }
            ],
        )

        assert merged["surfaces_recorded"] == ["chat", "image"]
        assert merged["summary"]["ok"] == 2
        assert merged["coverage"]["chat_launch_grade_providers_tested"] == ["openrouter"]
        assert merged["coverage"]["image_launch_grade_providers_tested"] == ["fal"]
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_provider_smoke_report_drops_stale_environment_preflight_result_on_same_build_refresh(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            source_env_file="C:/fake/staging.env",
            results=[
                {
                    "label": "provider-smoke-env-validation",
                    "provider_name": "environment",
                    "workflow": "preflight",
                    "surface": "all",
                    "lane": "env",
                    "status": "error",
                    "latency_ms": 0,
                    "error_type": "environment_validation",
                    "error": "PUBLIC_API_BASE_URL must be a configured HTTPS non-local URL in staging and production environments",
                }
            ],
        )
        merged = persist_provider_smoke_report(
            settings,
            selected_provider="openai",
            selected_surface="chat",
            include_failure_probe=False,
            source_env_file="C:/fake/staging.env",
            results=[
                {
                    "label": "openai-chat-premium-smoke",
                    "provider_name": "openai",
                    "workflow": "chat",
                    "surface": "chat",
                    "lane": "primary",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "gpt-4o-mini",
                }
            ],
        )

        assert merged["summary"]["error"] == 0
        assert merged["summary"]["ok"] == 1
        assert all(
            str(result.get("provider_name") or "").strip().lower() != "environment"
            for result in merged["results"]
        )
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_provider_smoke_report_tracks_openai_image_lanes_for_current_build(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    try:
        report = persist_provider_smoke_report(
            settings,
            selected_provider="openai",
            selected_surface="image",
            include_failure_probe=False,
            results=[
                {
                    "label": "openai-draft-text-to-image",
                    "provider_name": "openai",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "lane": "draft",
                    "model": "gpt-image-1-mini",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "openai-final-text-to-image",
                    "provider_name": "openai",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "lane": "final",
                    "model": "gpt-image-1.5",
                    "status": "ok",
                    "latency_ms": 730,
                },
            ],
        )

        assert report["coverage"]["image_launch_grade_providers_tested"] == ["openai"]
        assert report["coverage"]["image_lanes_tested"]["openai"] == ["draft", "final"]
        assert report["coverage"]["surfaces"]["image"]["lanes"]["openai"] == ["draft", "final"]
    finally:
        settings.studio_runtime_root = original_runtime_root


def test_launch_readiness_keeps_successful_smoke_when_failure_probe_also_exists(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_image_provider = settings.protected_beta_image_provider

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_image_provider = "fal"
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="fal",
            selected_surface="image",
            include_failure_probe=True,
            results=[
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 950,
                },
                {
                    "label": "fal-edit-probe",
                    "provider_name": "fal",
                    "workflow": "edit",
                    "surface": "image",
                    "status": "expected_failure",
                    "latency_ms": 210,
                    "error_type": "ProviderTemporaryError",
                    "error": "reference image required",
                },
            ],
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "fal", "status": "healthy", "detail": "configured"}],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={"providers": {}},
            provider_smoke_report=report,
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        fal_state = next(
            provider
            for provider in readiness["provider_truth"]["image"]["providers"]
            if provider["provider"] == "fal"
        )
        assert fal_state["smoke_verified_for_current_build"] is True
        assert fal_state["healthy_for_launch"] is True
        assert fal_state["smoke"]["ok_count"] == 1
        assert fal_state["smoke"]["expected_failure_count"] == 1
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.fal_api_key = original_fal_api_key
        settings.protected_beta_image_provider = original_protected_beta_image_provider


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
    original_gemini_service_tier = settings.gemini_service_tier
    original_openrouter_service_tier = settings.openrouter_service_tier
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_protected_beta_image_provider = settings.protected_beta_image_provider

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.fal_api_key = "fal-key"
    settings.gemini_service_tier = "paid"
    settings.openrouter_service_tier = "paid"
    settings.protected_beta_chat_provider = "gemini"
    settings.protected_beta_image_provider = "fal"
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
            selected_surface="all",
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
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                    "text_preview": "STUDIO_SMOKE_OK premium creative direction ready.",
                },
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                    "text_preview": "STUDIO_SMOKE_OK creative direction aligned.",
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

        assert readiness["status"] == "needs_attention"
        assert readiness["blocking_count"] == 0
        assert readiness["warning_count"] == 1
        assert readiness["launch_gate"]["ready_for_protected_launch"] is True
        assert readiness["launch_gate"]["blocking_keys"] == []
        assert readiness["launch_gate"]["warning_keys"] == ["provider_economics"]
        assert readiness["launch_gate"]["blocking_reasons"] == []
        assert any(
            "provider_economics" in reason
            for reason in readiness["launch_gate"]["warning_reasons"]
        )
        assert readiness["launch_gate"]["last_verified_build"] == "2026.04.07.25"
        assert readiness["provider_truth"]["public_paid_usage_safe"] is False
        assert readiness["provider_truth"]["image"]["launch_grade_ready"] is True
        assert readiness["provider_truth"]["image"]["public_paid_usage_ready"] is False
        assert readiness["provider_truth"]["chat"]["launch_grade_ready"] is True
        assert readiness["provider_truth"]["chat"]["public_paid_usage_ready"] is True
        assert readiness["provider_truth"]["chat"]["resilience_status"] == "pass"
        assert readiness["provider_truth"]["image"]["resilience_status"] == "warning"
        assert readiness["provider_truth"]["mix"]["status"] == "warning"
        assert readiness["provider_truth"]["economics"]["status"] == "warning"
        assert readiness["provider_truth"]["economics"]["chat_cost_class"] == "premium_api_variable"
        assert readiness["provider_truth"]["economics"]["image_cost_class"] == "managed_image_variable"
        assert readiness["provider_truth"]["economics"]["image_resilience_status"] == "warning"
        comparison = readiness["provider_truth"]["economics"]["chat_provider_comparison"]
        assert [item["provider"] for item in comparison] == ["gemini", "openrouter", "openai"]
        gemini_entry = next(item for item in comparison if item["provider"] == "gemini")
        openrouter_entry = next(item for item in comparison if item["provider"] == "openrouter")
        assert gemini_entry["routing_role"] == "primary"
        assert gemini_entry["default_model"] == settings.gemini_model
        assert openrouter_entry["routing_role"] == "fallback"
        assert openrouter_entry["default_model"] == settings.openrouter_model
        assert "single selected launch lane" in " ".join(
            readiness["provider_truth"]["economics"]["resilience_warnings"]
        )
        assert readiness["platform_readiness"]["current_stage"] == "protected_beta"
        assert readiness["platform_readiness"]["next_stage"] == "public_paid_platform"
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )
        assert public_paid_phase["status"] == "blocked"
        assert "provider_mix" in public_paid_phase["blocking_keys"]
        assert "image_public_paid_usage" in public_paid_phase["blocking_keys"]
        assert any(
            "proven managed backup lane" in reason
            for reason in public_paid_phase["blockers"]
        )
        assert any(
            "single selected launch lane" in reason
            for reason in public_paid_phase["blockers"]
        )
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.fal_api_key = original_fal_api_key
        settings.gemini_service_tier = original_gemini_service_tier
        settings.openrouter_service_tier = original_openrouter_service_tier
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.protected_beta_image_provider = original_protected_beta_image_provider


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
        gemini_state = next(
            provider
            for provider in readiness["provider_truth"]["chat"]["providers"]
            if provider["provider"] == "gemini"
        )
        assert chat_check["status"] == "blocked"
        assert "gemini:cooldown" in chat_check["detail"]
        assert "openrouter:cooldown" in chat_check["detail"]
        assert gemini_state["credential_present"] is True
        assert gemini_state["runtime_available"] is False
        assert gemini_state["healthy_for_launch"] is False
        assert gemini_state["launch_classification"] == "warning"
        assert gemini_state["cooldown"]["active"] is True
        assert gemini_state["recent_failure_state"]["last_status_code"] == 429
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


def test_launch_readiness_marks_provider_smoke_warning_when_report_is_stale_for_current_build(tmp_path: Path) -> None:
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
                "actual_build": "2026.04.08.14",
            },
        )
        stale_build = "2026.04.08.13" if load_version_info().build != "2026.04.08.13" else "2026.04.08.12"
        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "fal", "status": "healthy", "detail": "configured"}],
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
                "recorded_at": datetime.now(timezone.utc).isoformat(),
                "build": stale_build,
                "summary": {"ok": 1, "error": 0},
                "coverage": {
                    "surfaces": {
                        "chat": {"ok": 0, "expected_failure": 0, "skipped": 0, "error": 0, "providers": []},
                        "image": {"ok": 1, "expected_failure": 0, "skipped": 0, "error": 0, "providers": ["fal"]},
                    },
                    "chat_launch_grade_providers_tested": [],
                    "image_launch_grade_providers_tested": ["fal"],
                    "image_fallback_only_providers_tested": [],
                },
            },
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        smoke_check = next(check for check in readiness["checks"] if check["key"] == "provider_smoke")
        assert smoke_check["status"] == "warning"
        assert "current_build" in smoke_check["detail"]
        assert "premium chat lanes were not smoke-tested" in smoke_check["detail"]
        assert readiness["truth_sync"]["warning_artifacts"] == ["provider_smoke", "startup_verification", "deployment_verification"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.fal_api_key = original_fal_api_key


def test_launch_readiness_does_not_treat_free_tier_gemini_as_public_paid_ready(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_gemini_api_key = settings.gemini_api_key
    original_gemini_service_tier = settings.gemini_service_tier

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.gemini_api_key = "gemini-key"
    settings.gemini_service_tier = "free"
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="gemini",
            selected_surface="chat",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                    "text_preview": "STUDIO_SMOKE_OK creative direction aligned.",
                }
            ],
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "pollinations", "status": "healthy", "detail": "fallback lane"}],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={
                "primary_provider": "gemini",
                "fallback_provider": "heuristic",
                "providers": {
                    "gemini": {"configured": True, "status": "healthy"},
                    "openrouter": {"configured": False, "status": "not_configured"},
                    "openai": {"configured": False, "status": "not_configured"},
                },
            },
            provider_smoke_report=report,
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        gemini_state = next(
            provider
            for provider in readiness["provider_truth"]["chat"]["providers"]
            if provider["provider"] == "gemini"
        )
        assert gemini_state["service_tier"] == "free"
        assert gemini_state["lane_class"] == "limited_free_tier"
        assert gemini_state["runtime_available"] is True
        assert gemini_state["healthy_for_launch"] is False
        assert readiness["provider_truth"]["chat"]["public_paid_usage_ready"] is False
        assert readiness["provider_truth"]["chat"]["configured_launch_grade_provider_count"] == 0
        assert readiness["provider_truth"]["chat"]["configured_limited_provider_count"] == 1
        assert readiness["provider_truth"]["chat"]["cost_class"] == "fallback_only_or_free_tier"
        assert "free-tier" in readiness["provider_truth"]["chat"]["economics_summary"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.gemini_api_key = original_gemini_api_key
        settings.gemini_service_tier = original_gemini_service_tier


def test_launch_readiness_reports_openai_image_lane_truth_for_current_build_smoke(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openai_api_key = settings.openai_api_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openai_api_key = "openai-key"
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="runware",
            selected_surface="image",
            include_failure_probe=False,
            results=[
                {
                    "label": "runware-text-to-image",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "runware", "status": "healthy", "detail": "configured"}],
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
            economics_dossier=economics_dossier,
        )

        lane_truth = readiness["provider_truth"]["image"]["lane_truth"]
        assert lane_truth["status"] == "pass"
        assert lane_truth["selected_lane"]["provider"] == "runware"
        assert lane_truth["selected_lane"]["configured"] is True
        assert lane_truth["selected_lane"]["smoke_verified_for_current_build"] is True
        assert lane_truth["draft_lane"]["configured"] is False
        assert lane_truth["final_lane"]["configured"] is False
        assert lane_truth["healthy_secondary_launch_grade_providers"] == []
        assert "no secondary launch-grade image lane configured" in lane_truth["detail"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openai_api_key = original_openai_api_key


def test_launch_readiness_blocks_when_only_fallback_image_lanes_exist(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.protected_beta_chat_provider = "openrouter"
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
                "actual_build": "2026.04.08.01",
            },
        )
        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "pollinations", "status": "healthy", "detail": "public lane reachable"},
                {"name": "huggingface", "status": "healthy", "detail": "token configured"},
            ],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={
                "primary_provider": "gemini",
                "fallback_provider": "openrouter",
                "providers": {
                    "gemini": {"configured": False, "status": "not_configured"},
                    "openrouter": {"configured": True, "status": "healthy"},
                    "openai": {"configured": False, "status": "not_configured"},
                },
            },
            provider_smoke_report=None,
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        image_check = next(check for check in readiness["checks"] if check["key"] == "image_provider_lane")
        fal_state = next(
            provider
            for provider in readiness["provider_truth"]["image"]["providers"]
            if provider["provider"] == "fal"
        )
        huggingface_state = next(
            provider
            for provider in readiness["provider_truth"]["image"]["providers"]
            if provider["provider"] == "huggingface"
        )
        assert image_check["status"] == "blocked"
        assert readiness["provider_truth"]["chat"]["resilience_status"] == "blocked"
        assert readiness["provider_truth"]["image"]["launch_grade_ready"] is False
        assert readiness["provider_truth"]["image"]["public_paid_usage_ready"] is False
        assert readiness["provider_truth"]["image"]["resilience_status"] == "blocked"
        assert readiness["provider_truth"]["image"]["fallback_only_providers"] == ["huggingface", "pollinations"]
        assert fal_state["lane_class"] == "managed_backup"
        assert fal_state["launch_classification"] == "pass"
        assert fal_state["credential_present"] is False
        assert huggingface_state["lane_class"] == "fallback_only"
        assert huggingface_state["launch_classification"] == "warning"
        assert huggingface_state["runtime_available"] is True
        assert readiness["provider_truth"]["public_paid_usage_safe"] is False
        assert readiness["launch_gate"]["ready_for_protected_launch"] is False
        assert readiness["platform_readiness"]["current_stage"] == "local_alpha"
        assert readiness["platform_readiness"]["next_stage"] == "protected_beta"
        local_alpha_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "local_alpha"
        )
        assert local_alpha_phase["ready"] is True
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider


def test_launch_readiness_keeps_local_alpha_when_development_uses_demo_auth(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_enable_demo_auth = settings.enable_demo_auth
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.DEVELOPMENT
    settings.enable_demo_auth = True
    settings.supabase_url = None
    settings.supabase_anon_key = None
    settings.supabase_service_role_key = None
    try:
        startup_report, runtime_logs = _seed_operator_runtime_artifacts(
            settings,
            (tmp_path / "runtime-root").resolve(),
        )
        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[],
            data_authority={"backend": "sqlite", "durable": True},
            generation_runtime_mode="all",
            generation_broker={"enabled": False, "configured": False},
            chat_routing={"providers": {}},
            provider_smoke_report=None,
            startup_verification_report=startup_report,
            deployment_verification_report=None,
            runtime_logs=runtime_logs,
        )

        auth_check = next(check for check in readiness["checks"] if check["key"] == "auth_configuration")
        assert auth_check["status"] == "warning"
        assert readiness["platform_readiness"]["current_stage"] == "local_alpha"
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.enable_demo_auth = original_enable_demo_auth
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key


def test_launch_readiness_blocks_all_in_one_runtime_outside_local_development(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_enable_demo_auth = settings.enable_demo_auth
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.enable_demo_auth = False
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "x" * 32
    try:
        startup_report, runtime_logs = _seed_operator_runtime_artifacts(
            settings,
            (tmp_path / "runtime-root").resolve(),
        )
        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="all",
            generation_broker={"enabled": False, "configured": False},
            chat_routing={"providers": {}},
            provider_smoke_report=None,
            startup_verification_report=startup_report,
            deployment_verification_report=None,
            runtime_logs=runtime_logs,
        )

        runtime_check = next(check for check in readiness["checks"] if check["key"] == "runtime_topology")
        assert runtime_check["status"] == "blocked"
        assert "development-only" in runtime_check["detail"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.enable_demo_auth = original_enable_demo_auth
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
            selected_surface="image",
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
            assert "provider_truth" in health
            assert "platform_readiness" in health
            assert "truth_sync" in health
            assert "provider_economics_dossier" in health
            assert "operator_checklists" in health["launch_readiness"]
            assert health["launch_readiness"]["operator_checklists"]["signed_in_happy_path"][0]["path"] == "/v1/auth/me"
            assert "chat" in health["provider_truth"]
            assert "image" in health["provider_truth"]
            assert health["provider_economics_dossier"]["report_kind"] == "provider_economics_dossier"
            assert health["provider_truth"]["economics"]["dossier_present"] is True
            assert health["platform_readiness"]["current_stage"] == "local_alpha"
            assert health["launch_gate"]["last_verified_build"] == "2026.04.07.25"
            assert health["truth_sync"]["all_current_build"] is False
            assert "startup_verification" in health["truth_sync"]["warning_artifacts"]
            assert "deployment_verification" in health["truth_sync"]["warning_artifacts"]
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
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_protected_beta_image_provider = settings.protected_beta_image_provider

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "openrouter"
    settings.protected_beta_image_provider = "fal"
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
                "recorded_at": datetime.now(timezone.utc).isoformat(),
                "build": load_version_info().build,
                "summary": {"ok": 1, "error": 0},
                "results": [
                    {
                        "label": "openrouter-chat",
                        "provider_name": "openrouter",
                        "workflow": "chat",
                        "surface": "chat",
                        "status": "ok",
                    },
                    {
                        "label": "fal-text",
                        "provider_name": "fal",
                        "workflow": "text_to_image",
                        "surface": "image",
                        "status": "ok",
                    },
                ],
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
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.protected_beta_image_provider = original_protected_beta_image_provider


def test_launch_readiness_allows_warning_deployment_verification_when_selected_lanes_are_proven(
    tmp_path: Path,
) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openai_api_key = settings.openai_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_protected_beta_image_provider = settings.protected_beta_image_provider

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openai_api_key = "openai-key"
    settings.protected_beta_chat_provider = "openai"
    settings.protected_beta_image_provider = "openai"
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
                "summary": "Deployment verification passed with warnings.",
                "checks": [],
                "actual_build": "2026.04.07.25",
            },
        )
        smoke_report = persist_provider_smoke_report(
            settings,
            selected_provider="openai",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "openai-chat",
                    "provider_name": "openai",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 120,
                    "model": "gpt-4o-mini",
                    "text_preview": "STUDIO_SMOKE_OK creative direction aligned.",
                },
                {
                    "label": "openai-draft",
                    "provider_name": "openai",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "lane": "draft",
                    "status": "ok",
                    "latency_ms": 850,
                    "model": "gpt-image-1-mini",
                },
                {
                    "label": "openai-final",
                    "provider_name": "openai",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "lane": "final",
                    "status": "ok",
                    "latency_ms": 980,
                    "model": "gpt-image-1.5",
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[{"name": "openai", "status": "healthy"}],
            data_authority={"backend": "postgres", "durable": True},
            generation_runtime_mode="web",
            generation_broker={"enabled": True, "configured": True},
            chat_routing={
                "primary_provider": "openai",
                "fallback_provider": "openrouter",
                "providers": {
                    "openai": {"configured": True, "status": "healthy"},
                    "openrouter": {"configured": False, "status": "not_configured"},
                    "gemini": {"configured": False, "status": "not_configured"},
                },
            },
            provider_smoke_report=smoke_report,
            startup_verification_report=startup_report,
            deployment_verification_report=deployment_report,
            runtime_logs=runtime_logs,
        )

        assert readiness["status"] == "needs_attention"
        assert readiness["blocking_count"] == 0
        assert readiness["launch_gate"]["ready_for_protected_launch"] is True
        assert "deployment_verification" in readiness["launch_gate"]["warning_keys"]
        assert "provider_economics" in readiness["launch_gate"]["warning_keys"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openai_api_key = original_openai_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.protected_beta_image_provider = original_protected_beta_image_provider


def test_launch_readiness_keeps_protected_beta_stage_when_selected_lanes_are_proven(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_openai_api_key = settings.openai_api_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.openai_api_key = "openai-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "gemini"
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                },
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                },
                {
                    "label": "runware-text",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 910,
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "runware", "status": "healthy", "detail": "configured"},
                {"name": "fal", "status": "healthy", "detail": "configured"},
            ],
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
            economics_dossier=economics_dossier,
        )

        assert readiness["provider_truth"]["status"] == "warning"
        assert readiness["provider_truth"]["mix"]["status"] == "pass"
        assert readiness["launch_gate"]["ready_for_protected_launch"] is True
        assert readiness["platform_readiness"]["current_stage"] == "public_paid_platform"
        assert readiness["platform_readiness"]["next_stage"] is None
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )
        assert public_paid_phase["status"] == "needs_attention"
        assert public_paid_phase["ready"] is True
        assert public_paid_phase["warning_keys"] == ["provider_economics"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider


def test_launch_readiness_blocks_public_paid_when_captcha_verification_is_disabled(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_openai_api_key = settings.openai_api_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_public_paid_provider_economics_ready = settings.public_paid_provider_economics_ready
    original_public_paid_provider_economics_ready_build = settings.public_paid_provider_economics_ready_build
    original_public_paid_provider_economics_ready_note = settings.public_paid_provider_economics_ready_note
    original_captcha_verification_enabled = settings.captcha_verification_enabled

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.openai_api_key = "openai-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "gemini"
    settings.public_paid_provider_economics_ready = True
    settings.public_paid_provider_economics_ready_build = load_version_info().build
    settings.public_paid_provider_economics_ready_note = "Founders signed off provider cost exposure for this build."
    settings.captcha_verification_enabled = False
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                },
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                },
                {
                    "label": "runware-text",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 910,
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "runware", "status": "healthy", "detail": "configured"},
                {"name": "fal", "status": "healthy", "detail": "configured"},
            ],
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
            economics_dossier=economics_dossier,
        )

        assert readiness["launch_gate"]["ready_for_protected_launch"] is True
        assert "abuse_hardening" in readiness["launch_gate"]["warning_keys"]
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )
        assert public_paid_phase["status"] == "blocked"
        assert "abuse_hardening" in public_paid_phase["blocking_keys"]
        assert any("CAPTCHA" in blocker or "captcha" in blocker for blocker in public_paid_phase["blockers"])
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.openai_api_key = original_openai_api_key
        settings.fal_api_key = original_fal_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.public_paid_provider_economics_ready = original_public_paid_provider_economics_ready
        settings.public_paid_provider_economics_ready_build = original_public_paid_provider_economics_ready_build
        settings.public_paid_provider_economics_ready_note = original_public_paid_provider_economics_ready_note
        settings.captcha_verification_enabled = original_captcha_verification_enabled


def test_launch_readiness_blocks_public_paid_when_captcha_keys_are_missing(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_openai_api_key = settings.openai_api_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_public_paid_provider_economics_ready = settings.public_paid_provider_economics_ready
    original_public_paid_provider_economics_ready_build = settings.public_paid_provider_economics_ready_build
    original_public_paid_provider_economics_ready_note = settings.public_paid_provider_economics_ready_note
    original_captcha_verification_enabled = settings.captcha_verification_enabled
    original_captcha_provider = settings.captcha_provider
    original_turnstile_site_key = settings.turnstile_site_key
    original_turnstile_secret_key = settings.turnstile_secret_key

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.openai_api_key = "openai-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "gemini"
    settings.public_paid_provider_economics_ready = True
    settings.public_paid_provider_economics_ready_build = load_version_info().build
    settings.public_paid_provider_economics_ready_note = "Founders signed off provider cost exposure for this build."
    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = None
    settings.turnstile_secret_key = None
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                },
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                },
                {
                    "label": "runware-text",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 910,
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "runware", "status": "healthy", "detail": "configured"},
                {"name": "fal", "status": "healthy", "detail": "configured"},
            ],
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
            economics_dossier=economics_dossier,
        )

        assert readiness["launch_gate"]["ready_for_protected_launch"] is True
        assert "abuse_hardening" in readiness["launch_gate"]["warning_keys"]
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )
        assert public_paid_phase["status"] == "blocked"
        assert "abuse_hardening" in public_paid_phase["blocking_keys"]
        assert any("site key" in blocker.lower() or "turnstile" in blocker.lower() for blocker in public_paid_phase["blockers"])
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.openai_api_key = original_openai_api_key
        settings.fal_api_key = original_fal_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.public_paid_provider_economics_ready = original_public_paid_provider_economics_ready
        settings.public_paid_provider_economics_ready_build = original_public_paid_provider_economics_ready_build
        settings.public_paid_provider_economics_ready_note = original_public_paid_provider_economics_ready_note
        settings.captcha_verification_enabled = original_captcha_verification_enabled
        settings.captcha_provider = original_captcha_provider
        settings.turnstile_site_key = original_turnstile_site_key
        settings.turnstile_secret_key = original_turnstile_secret_key


def test_launch_readiness_requires_current_build_economics_signoff_for_public_paid_ready(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_openai_api_key = settings.openai_api_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_public_paid_provider_economics_ready = settings.public_paid_provider_economics_ready
    original_public_paid_provider_economics_ready_build = settings.public_paid_provider_economics_ready_build
    original_public_paid_provider_economics_ready_note = settings.public_paid_provider_economics_ready_note

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.openai_api_key = "openai-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "gemini"
    settings.public_paid_provider_economics_ready = True
    settings.public_paid_provider_economics_ready_build = load_version_info().build
    settings.public_paid_provider_economics_ready_note = "Founders signed off provider cost exposure for this build."
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                },
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                },
                {
                    "label": "runware-text",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 910,
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "runware", "status": "healthy", "detail": "configured"},
                {"name": "fal", "status": "healthy", "detail": "configured"},
            ],
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
            economics_dossier=economics_dossier,
        )

        assert readiness["provider_truth"]["economics"]["status"] == "pass"
        assert readiness["provider_truth"]["economics"]["signoff_matches_current_build"] is True
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )
        assert public_paid_phase["status"] == "ready"
        assert public_paid_phase["ready"] is True
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.openai_api_key = original_openai_api_key
        settings.fal_api_key = original_fal_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.public_paid_provider_economics_ready = original_public_paid_provider_economics_ready
        settings.public_paid_provider_economics_ready_build = original_public_paid_provider_economics_ready_build
        settings.public_paid_provider_economics_ready_note = original_public_paid_provider_economics_ready_note


def test_launch_readiness_keeps_public_paid_on_warning_when_economics_dossier_is_missing(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_openai_api_key = settings.openai_api_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_public_paid_provider_economics_ready = settings.public_paid_provider_economics_ready
    original_public_paid_provider_economics_ready_build = settings.public_paid_provider_economics_ready_build
    original_public_paid_provider_economics_ready_note = settings.public_paid_provider_economics_ready_note

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.openai_api_key = "openai-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "gemini"
    settings.public_paid_provider_economics_ready = True
    settings.public_paid_provider_economics_ready_build = load_version_info().build
    settings.public_paid_provider_economics_ready_note = "Founders signed off provider cost exposure for this build."
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                },
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                },
                {
                    "label": "runware-text",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 910,
                },
            ],
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "runware", "status": "healthy", "detail": "configured"},
                {"name": "fal", "status": "healthy", "detail": "configured"},
            ],
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

        assert readiness["provider_truth"]["economics"]["status"] == "warning"
        assert readiness["provider_truth"]["economics"]["signoff_state"] == "missing_dossier"
        assert readiness["provider_truth"]["economics"]["dossier_state"] == "missing_dossier"
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )
        assert public_paid_phase["status"] == "needs_attention"
        assert public_paid_phase["ready"] is True
        assert "provider_economics" in public_paid_phase["warning_keys"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.openai_api_key = original_openai_api_key
        settings.fal_api_key = original_fal_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.public_paid_provider_economics_ready = original_public_paid_provider_economics_ready
        settings.public_paid_provider_economics_ready_build = original_public_paid_provider_economics_ready_build
        settings.public_paid_provider_economics_ready_note = original_public_paid_provider_economics_ready_note


def test_launch_readiness_keeps_public_paid_on_warning_when_economics_note_is_missing(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_openai_api_key = settings.openai_api_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_public_paid_provider_economics_ready = settings.public_paid_provider_economics_ready
    original_public_paid_provider_economics_ready_build = settings.public_paid_provider_economics_ready_build
    original_public_paid_provider_economics_ready_note = settings.public_paid_provider_economics_ready_note

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.openai_api_key = "openai-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "gemini"
    settings.public_paid_provider_economics_ready = True
    settings.public_paid_provider_economics_ready_build = load_version_info().build
    settings.public_paid_provider_economics_ready_note = ""
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                },
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                },
                {
                    "label": "runware-text",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 910,
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "runware", "status": "healthy", "detail": "configured"},
                {"name": "fal", "status": "healthy", "detail": "configured"},
            ],
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
            economics_dossier=economics_dossier,
        )

        assert readiness["provider_truth"]["economics"]["status"] == "warning"
        assert readiness["provider_truth"]["economics"]["signoff_state"] == "missing_note"
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )
        assert public_paid_phase["status"] == "needs_attention"
        assert public_paid_phase["ready"] is True
        assert "provider_economics" in public_paid_phase["warning_keys"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.openai_api_key = original_openai_api_key
        settings.fal_api_key = original_fal_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.public_paid_provider_economics_ready = original_public_paid_provider_economics_ready
        settings.public_paid_provider_economics_ready_build = original_public_paid_provider_economics_ready_build
        settings.public_paid_provider_economics_ready_note = original_public_paid_provider_economics_ready_note


def test_launch_readiness_keeps_optional_provider_smoke_errors_as_public_paid_warning(tmp_path: Path) -> None:
    settings = get_settings()
    original_runtime_root = settings.studio_runtime_root
    original_environment = settings.environment
    original_supabase_url = settings.supabase_url
    original_supabase_anon_key = settings.supabase_anon_key
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_openrouter_api_key = settings.openrouter_api_key
    original_openai_api_key = settings.openai_api_key
    original_fal_api_key = settings.fal_api_key
    original_protected_beta_chat_provider = settings.protected_beta_chat_provider
    original_public_paid_provider_economics_ready = settings.public_paid_provider_economics_ready
    original_public_paid_provider_economics_ready_build = settings.public_paid_provider_economics_ready_build
    original_public_paid_provider_economics_ready_note = settings.public_paid_provider_economics_ready_note

    settings.studio_runtime_root = str(tmp_path / "runtime-root")
    settings.environment = Environment.STAGING
    settings.supabase_url = "https://example.supabase.co"
    settings.supabase_anon_key = "anon-key"
    settings.supabase_service_role_key = "service-role-key"
    settings.openrouter_api_key = "openrouter-key"
    settings.openai_api_key = "openai-key"
    settings.fal_api_key = "fal-key"
    settings.protected_beta_chat_provider = "gemini"
    settings.public_paid_provider_economics_ready = True
    settings.public_paid_provider_economics_ready_build = load_version_info().build
    settings.public_paid_provider_economics_ready_note = "Founders signed off provider cost exposure for this build."
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
                "actual_build": load_version_info().build,
            },
        )
        report = persist_provider_smoke_report(
            settings,
            selected_provider="all",
            selected_surface="all",
            include_failure_probe=False,
            results=[
                {
                    "label": "gemini-chat",
                    "provider_name": "gemini",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 170,
                    "model": "gemini-2.5-flash",
                },
                {
                    "label": "openrouter-chat",
                    "provider_name": "openrouter",
                    "workflow": "chat",
                    "surface": "chat",
                    "status": "ok",
                    "latency_ms": 180,
                    "model": "google/gemini-2.5-flash",
                },
                {
                    "label": "runware-text",
                    "provider_name": "runware",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 420,
                },
                {
                    "label": "fal-text",
                    "provider_name": "fal",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "ok",
                    "latency_ms": 910,
                },
                {
                    "label": "huggingface-image-optional",
                    "provider_name": "huggingface",
                    "workflow": "text_to_image",
                    "surface": "image",
                    "status": "error",
                    "latency_ms": 1200,
                    "error": "optional fallback drift",
                },
            ],
        )
        economics_dossier = persist_provider_economics_dossier(
            settings,
            public_plan_payload=_public_plan_payload(tmp_path),
        )

        readiness = build_launch_readiness_report(
            settings=settings,
            provider_status=[
                {"name": "runware", "status": "healthy", "detail": "configured"},
                {"name": "fal", "status": "healthy", "detail": "configured"},
            ],
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
            economics_dossier=economics_dossier,
        )

        smoke_check = next(check for check in readiness["checks"] if check["key"] == "provider_smoke")
        public_paid_phase = next(
            phase
            for phase in readiness["platform_readiness"]["phases"]
            if phase["id"] == "public_paid_platform"
        )

        assert readiness["provider_truth"]["chat"]["public_paid_usage_ready"] is True
        assert readiness["provider_truth"]["image"]["public_paid_usage_ready"] is True
        assert readiness["provider_truth"]["mix"]["status"] == "pass"
        assert readiness["provider_truth"]["economics"]["status"] == "pass"
        assert smoke_check["status"] == "warning"
        assert public_paid_phase["status"] == "needs_attention"
        assert public_paid_phase["blocking_keys"] == []
        assert "provider_smoke" in public_paid_phase["warning_keys"]
        assert "provider_smoke" not in public_paid_phase["blocking_keys"]
    finally:
        settings.studio_runtime_root = original_runtime_root
        settings.environment = original_environment
        settings.supabase_url = original_supabase_url
        settings.supabase_anon_key = original_supabase_anon_key
        settings.supabase_service_role_key = original_supabase_service_role_key
        settings.openrouter_api_key = original_openrouter_api_key
        settings.openai_api_key = original_openai_api_key
        settings.fal_api_key = original_fal_api_key
        settings.protected_beta_chat_provider = original_protected_beta_chat_provider
        settings.public_paid_provider_economics_ready = original_public_paid_provider_economics_ready
        settings.public_paid_provider_economics_ready_build = original_public_paid_provider_economics_ready_build
        settings.public_paid_provider_economics_ready_note = original_public_paid_provider_economics_ready_note


def test_build_truth_sync_summary_marks_current_and_stale_artifacts() -> None:
    current_build = load_version_info().build
    summary = build_truth_sync_summary(
        provider_smoke_report={
            "build": current_build,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "path": "C:/runtime/provider-smoke-latest.json",
        },
        startup_verification_report={
            "backend_build": current_build,
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "path": "C:/runtime/local-verify-latest.json",
        },
        deployment_verification_report={
            "actual_build": "2026.04.01.01",
            "recorded_at": datetime.now(timezone.utc).isoformat(),
            "path": "C:/runtime/protected-staging-verify-latest.json",
        },
    )

    assert summary["current_build"] == current_build
    assert summary["all_present"] is True
    assert summary["all_current_build"] is False
    assert summary["blocking_artifacts"] == []
    assert summary["warning_artifacts"] == ["deployment_verification"]
    deployment_entry = next(
        item for item in summary["artifacts"] if item["id"] == "deployment_verification"
    )
    assert deployment_entry["status"] == "stale"
    assert deployment_entry["current_build_match"] is False
