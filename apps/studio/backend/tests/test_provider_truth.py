"""Focused unit tests for provider truth evaluation logic.

These tests exercise provider_truth.py functions directly with minimal
fixtures, covering edge cases that the full launch_readiness flow tests
do not isolate: wrong build pins, mixed tiers, stale smoke, free-tier-only
configs, and economics signoff boundaries.
"""
from __future__ import annotations

import pytest

from config.env import get_settings, has_configured_secret, is_placeholder_secret_value
from studio_platform.services.provider_truth import (
    build_provider_smoke_lookup,
    build_provider_spend_lookup,
    build_provider_truth_report,
    chat_provider_counts_as_launch_grade,
    chat_provider_is_configured,
    chat_provider_service_tier,
    image_provider_counts_as_launch_grade,
    infer_smoke_surface,
    protected_beta_requires_final_image_lane,
    CHAT_LAUNCH_GRADE_PROVIDERS,
    IMAGE_LAUNCH_GRADE_PROVIDERS,
    IMAGE_FALLBACK_ONLY_PROVIDERS,
)
from studio_platform.versioning import load_version_info


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_smoke_report(*, build: str, results: list[dict]) -> dict:
    return {
        "recorded_at": "2026-04-13T10:00:00+00:00",
        "build": build,
        "results": results,
    }


def _make_chat_routing(*, providers: dict | None = None, primary: str = "", fallback: str = "") -> dict:
    return {
        "providers": providers or {},
        "primary_provider": primary,
        "fallback_provider": fallback,
    }


def _provider_payload(name: str, *, configured: bool = True, status: str = "healthy") -> dict:
    return {
        "configured": configured,
        "status": status if configured else "not_configured",
    }


# ---------------------------------------------------------------------------
# infer_smoke_surface
# ---------------------------------------------------------------------------


class TestInferSmokeSurface:
    def test_explicit_chat_surface(self) -> None:
        assert infer_smoke_surface({"surface": "chat"}) == "chat"

    def test_explicit_image_surface(self) -> None:
        assert infer_smoke_surface({"surface": "image"}) == "image"

    def test_workflow_chat_infers_chat(self) -> None:
        assert infer_smoke_surface({"workflow": "chat"}) == "chat"

    def test_workflow_text_to_image_infers_image(self) -> None:
        assert infer_smoke_surface({"workflow": "text_to_image"}) == "image"

    def test_missing_surface_and_workflow_defaults_to_image(self) -> None:
        assert infer_smoke_surface({}) == "image"


# ---------------------------------------------------------------------------
# build_provider_smoke_lookup
# ---------------------------------------------------------------------------


class TestBuildProviderSmokeLookup:
    def test_none_report_returns_empty(self) -> None:
        assert build_provider_smoke_lookup(None) == {}

    def test_current_build_match(self) -> None:
        current_build = load_version_info().build
        lookup = build_provider_smoke_lookup(
            _make_smoke_report(
                build=current_build,
                results=[{"provider_name": "openai", "surface": "chat", "status": "ok"}],
            )
        )
        entry = lookup[("chat", "openai")]
        assert entry["current_build_match"] is True
        assert entry["ok_count"] == 1
        assert entry["successful_probe"] is True

    def test_stale_build_no_match(self) -> None:
        lookup = build_provider_smoke_lookup(
            _make_smoke_report(
                build="1999.01.01.0",
                results=[{"provider_name": "openai", "surface": "chat", "status": "ok"}],
            )
        )
        entry = lookup[("chat", "openai")]
        assert entry["current_build_match"] is False

    def test_error_sets_hard_error(self) -> None:
        current_build = load_version_info().build
        lookup = build_provider_smoke_lookup(
            _make_smoke_report(
                build=current_build,
                results=[{"provider_name": "fal", "surface": "image", "status": "error", "error": "timeout"}],
            )
        )
        entry = lookup[("image", "fal")]
        assert entry["hard_error"] is True
        assert entry["error_count"] == 1
        assert entry["last_error"] == "timeout"

    def test_lane_tracking(self) -> None:
        current_build = load_version_info().build
        lookup = build_provider_smoke_lookup(
            _make_smoke_report(
                build=current_build,
                results=[
                    {"provider_name": "openai", "surface": "image", "lane": "draft", "status": "ok"},
                    {"provider_name": "openai", "surface": "image", "lane": "final", "status": "ok"},
                ],
            )
        )
        entry = lookup[("image", "openai")]
        assert "draft" in entry["lanes"]
        assert "final" in entry["lanes"]
        assert entry["lane_ok"]["draft"] is True
        assert entry["lane_ok"]["final"] is True


# ---------------------------------------------------------------------------
# build_provider_spend_lookup
# ---------------------------------------------------------------------------


class TestBuildProviderSpendLookup:
    def test_none_returns_empty(self) -> None:
        assert build_provider_spend_lookup(None) == {}

    def test_extracts_spend(self) -> None:
        result = build_provider_spend_lookup({
            "providers": [
                {"provider": "openai", "total_spend_usd": 1.5},
                {"provider": "fal", "total_spend_usd": 0.3},
            ]
        })
        assert result["openai"] == 1.5
        assert result["fal"] == 0.3

    def test_invalid_spend_defaults_to_zero(self) -> None:
        result = build_provider_spend_lookup({
            "providers": [{"provider": "openai", "total_spend_usd": "not-a-number"}]
        })
        assert result["openai"] == 0.0


# ---------------------------------------------------------------------------
# Chat provider classification
# ---------------------------------------------------------------------------


class TestChatProviderClassification:
    def test_placeholder_secret_is_treated_as_not_configured(self) -> None:
        settings = get_settings()
        original = settings.openrouter_api_key
        settings.openrouter_api_key = "your_openrouter_api_key_here"
        try:
            assert is_placeholder_secret_value(settings.openrouter_api_key) is True
            assert has_configured_secret(settings.openrouter_api_key) is False
            assert chat_provider_is_configured(settings=settings, provider="openrouter") is False
        finally:
            settings.openrouter_api_key = original

    def test_paid_tier_is_launch_grade(self) -> None:
        settings = get_settings()
        original = settings.openai_service_tier
        settings.openai_service_tier = "paid"
        try:
            assert chat_provider_counts_as_launch_grade(settings=settings, provider="openai") is True
        finally:
            settings.openai_service_tier = original

    def test_free_tier_is_not_launch_grade(self) -> None:
        settings = get_settings()
        original = settings.gemini_service_tier
        settings.gemini_service_tier = "free"
        try:
            assert chat_provider_counts_as_launch_grade(settings=settings, provider="gemini") is False
        finally:
            settings.gemini_service_tier = original

    def test_unknown_provider_is_not_launch_grade(self) -> None:
        settings = get_settings()
        assert chat_provider_counts_as_launch_grade(settings=settings, provider="some_other") is False


# ---------------------------------------------------------------------------
# Image provider classification
# ---------------------------------------------------------------------------


class TestImageProviderClassification:
    def test_selected_provider_is_launch_grade(self) -> None:
        settings = get_settings()
        original = settings.protected_beta_image_provider
        settings.protected_beta_image_provider = "fal"
        try:
            assert image_provider_counts_as_launch_grade(settings=settings, provider="fal") is True
            assert image_provider_counts_as_launch_grade(settings=settings, provider="openai") is False
        finally:
            settings.protected_beta_image_provider = original

    def test_non_launch_grade_provider(self) -> None:
        settings = get_settings()
        assert image_provider_counts_as_launch_grade(settings=settings, provider="huggingface") is False


# ---------------------------------------------------------------------------
# Provider economics truth
# ---------------------------------------------------------------------------


class TestProviderEconomicsTruth:
    def _build_economics(
        self,
        *,
        signoff: bool,
        signoff_build: str | None,
        signoff_note: str = "test note",
        economics_dossier: dict | None = None,
    ) -> dict:
        settings = get_settings()
        original_ready = settings.public_paid_provider_economics_ready
        original_build = settings.public_paid_provider_economics_ready_build
        original_note = settings.public_paid_provider_economics_ready_note
        settings.public_paid_provider_economics_ready = signoff
        settings.public_paid_provider_economics_ready_build = signoff_build
        settings.public_paid_provider_economics_ready_note = signoff_note
        try:
            return build_provider_truth_report(
                settings=settings,
                provider_status=[],
                chat_routing=_make_chat_routing(),
                provider_smoke_report=None,
                cost_telemetry=None,
                economics_dossier=economics_dossier,
            )["economics"]
        finally:
            settings.public_paid_provider_economics_ready = original_ready
            settings.public_paid_provider_economics_ready_build = original_build
            settings.public_paid_provider_economics_ready_note = original_note

    def test_no_signoff_is_warning(self) -> None:
        result = self._build_economics(signoff=False, signoff_build=None)
        assert result["status"] == "warning"
        assert result["signoff_recorded"] is False
        assert result["signoff_state"] == "missing"

    def test_signoff_with_wrong_build_is_warning(self) -> None:
        result = self._build_economics(signoff=True, signoff_build="1999.01.01.0")
        assert result["status"] == "warning"
        assert result["signoff_matches_current_build"] is False
        assert result["signoff_state"] == "stale_build"
        assert "stale" in result["summary"].lower()

    def test_signoff_with_correct_build_but_no_dossier_is_warning(self) -> None:
        current_build = load_version_info().build
        result = self._build_economics(signoff=True, signoff_build=current_build)
        assert result["status"] == "warning"
        assert result["signoff_matches_current_build"] is True
        assert result["signoff_state"] == "missing_dossier"
        assert result["signoff_has_note"] is True
        assert result["dossier_state"] == "missing_dossier"

    def test_signoff_with_stale_dossier_is_warning(self) -> None:
        current_build = load_version_info().build
        result = self._build_economics(
            signoff=True,
            signoff_build=current_build,
            economics_dossier={
                "report_kind": "provider_economics_dossier",
                "build": "1999.01.01.0",
                "complete": True,
                "summary": "stale dossier",
            },
        )
        assert result["status"] == "warning"
        assert result["signoff_state"] == "stale_dossier"
        assert result["dossier_state"] == "stale_dossier"
        assert result["dossier_matches_current_build"] is False

    def test_signoff_with_current_complete_dossier_is_pass(self) -> None:
        current_build = load_version_info().build
        result = self._build_economics(
            signoff=True,
            signoff_build=current_build,
            economics_dossier={
                "report_kind": "provider_economics_dossier",
                "build": current_build,
                "complete": True,
                "summary": "complete dossier",
                "generated_at": "2026-04-14T12:00:00+00:00",
                "path": "C:/runtime/provider-economics-latest.json",
            },
        )
        assert result["status"] == "pass"
        assert result["signoff_matches_current_build"] is True
        assert result["signoff_state"] == "current"
        assert result["dossier_state"] == "current"
        assert result["dossier_complete"] is True

    def test_signoff_without_build_ref_is_warning(self) -> None:
        result = self._build_economics(signoff=True, signoff_build="")
        assert result["status"] == "warning"
        assert result["signoff_state"] == "missing_build"
        assert "missing a build reference" in result["summary"].lower()

    def test_signoff_without_note_is_warning(self) -> None:
        current_build = load_version_info().build
        result = self._build_economics(signoff=True, signoff_build=current_build, signoff_note="")
        assert result["status"] == "warning"
        assert result["signoff_matches_current_build"] is True
        assert result["signoff_has_note"] is False
        assert result["signoff_state"] == "missing_note"
        assert "missing an explicit signoff note" in result["summary"].lower()


# ---------------------------------------------------------------------------
# Provider mix truth
# ---------------------------------------------------------------------------


class TestProviderMixTruth:
    def test_no_providers_is_blocked(self) -> None:
        settings = get_settings()
        result = build_provider_truth_report(
            settings=settings,
            provider_status=[],
            chat_routing=_make_chat_routing(),
            provider_smoke_report=None,
            cost_telemetry=None,
        )
        assert result["mix"]["status"] in {"blocked", "warning"}
        assert result["public_paid_usage_safe"] is False

    def test_chat_blocked_means_overall_blocked(self) -> None:
        settings = get_settings()
        result = build_provider_truth_report(
            settings=settings,
            provider_status=[],
            chat_routing=_make_chat_routing(),
            provider_smoke_report=None,
            cost_telemetry=None,
        )
        assert result["status"] == "blocked"
        assert result["chat"]["status"] == "blocked"

    def test_chat_single_proven_lane_reports_unproven_backup_gap(self) -> None:
        settings = get_settings()
        current_build = load_version_info().build
        original_chat = settings.protected_beta_chat_provider
        original_openai_tier = settings.openai_service_tier
        original_openrouter_tier = settings.openrouter_service_tier
        settings.protected_beta_chat_provider = "openai"
        settings.openai_service_tier = "paid"
        settings.openrouter_service_tier = "paid"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[],
                chat_routing=_make_chat_routing(
                    providers={
                        "openai": _provider_payload("openai"),
                        "openrouter": _provider_payload("openrouter"),
                    },
                    primary="openai",
                    fallback="openrouter",
                ),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[{"provider_name": "openai", "surface": "chat", "status": "ok"}],
                ),
                cost_telemetry=None,
            )
            assert result["chat"]["resilience_status"] == "warning"
            assert "configured backup lanes (openrouter) are not proven" in result["chat"]["resilience_summary"]
            assert result["chat"]["healthy_launch_grade_provider_count"] == 1
            assert result["chat"]["configured_unproven_backup_launch_grade_provider_count"] == 1
            assert result["chat"]["configured_unproven_backup_launch_grade_providers"] == ["openrouter"]
        finally:
            settings.protected_beta_chat_provider = original_chat
            settings.openai_service_tier = original_openai_tier
            settings.openrouter_service_tier = original_openrouter_tier


# ---------------------------------------------------------------------------
# Chat provider truth with smoke
# ---------------------------------------------------------------------------


class TestChatProviderTruthWithSmoke:
    def test_healthy_provider_with_current_build_smoke_is_pass(self) -> None:
        settings = get_settings()
        current_build = load_version_info().build
        original_chat = settings.protected_beta_chat_provider
        original_tier = settings.openai_service_tier
        settings.protected_beta_chat_provider = "openai"
        settings.openai_service_tier = "paid"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[],
                chat_routing=_make_chat_routing(
                    providers={"openai": _provider_payload("openai")},
                    primary="openai",
                ),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[{"provider_name": "openai", "surface": "chat", "status": "ok"}],
                ),
                cost_telemetry=None,
            )
            assert result["chat"]["status"] == "pass"
            assert result["chat"]["launch_grade_ready"] is True
        finally:
            settings.protected_beta_chat_provider = original_chat
            settings.openai_service_tier = original_tier

    def test_healthy_provider_with_stale_smoke_is_blocked(self) -> None:
        settings = get_settings()
        original_chat = settings.protected_beta_chat_provider
        original_tier = settings.openai_service_tier
        settings.protected_beta_chat_provider = "openai"
        settings.openai_service_tier = "paid"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[],
                chat_routing=_make_chat_routing(
                    providers={"openai": _provider_payload("openai")},
                    primary="openai",
                ),
                provider_smoke_report=_make_smoke_report(
                    build="old-build",
                    results=[{"provider_name": "openai", "surface": "chat", "status": "ok"}],
                ),
                cost_telemetry=None,
            )
            assert result["chat"]["status"] == "blocked"
            assert result["chat"]["launch_grade_ready"] is False
        finally:
            settings.protected_beta_chat_provider = original_chat
            settings.openai_service_tier = original_tier

    def test_free_tier_only_provider_is_blocked(self) -> None:
        settings = get_settings()
        original_chat = settings.protected_beta_chat_provider
        original_tier = settings.gemini_service_tier
        settings.protected_beta_chat_provider = "gemini"
        settings.gemini_service_tier = "free"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[],
                chat_routing=_make_chat_routing(
                    providers={"gemini": _provider_payload("gemini")},
                ),
                provider_smoke_report=None,
                cost_telemetry=None,
            )
            assert result["chat"]["status"] == "blocked"
            assert "free-tier" in result["chat"]["summary"].lower()
        finally:
            settings.protected_beta_chat_provider = original_chat
            settings.gemini_service_tier = original_tier


# ---------------------------------------------------------------------------
# Image provider truth with smoke
# ---------------------------------------------------------------------------


class TestImageProviderTruthWithSmoke:
    def test_image_no_launch_grade_is_blocked(self) -> None:
        settings = get_settings()
        result = build_provider_truth_report(
            settings=settings,
            provider_status=[],
            chat_routing=_make_chat_routing(),
            provider_smoke_report=None,
            cost_telemetry=None,
        )
        assert result["image"]["status"] == "blocked"

    def test_openai_draft_only_without_final_required_is_pass(self) -> None:
        settings = get_settings()
        current_build = load_version_info().build
        original_image = settings.protected_beta_image_provider
        original_final = settings.protected_beta_image_require_final_lane
        original_key = settings.openai_api_key
        settings.protected_beta_image_provider = "openai"
        settings.protected_beta_image_require_final_lane = False
        settings.openai_api_key = "test-key"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[{"name": "openai", "status": "healthy"}],
                chat_routing=_make_chat_routing(),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[
                        {"provider_name": "openai", "surface": "image", "lane": "draft", "status": "ok"},
                    ],
                ),
                cost_telemetry=None,
            )
            assert result["image"]["status"] == "pass"
            lane = result["image"]["lane_truth"]
            assert lane["status"] == "pass"
            assert lane["draft_lane"]["smoke_verified_for_current_build"] is True
        finally:
            settings.protected_beta_image_provider = original_image
            settings.protected_beta_image_require_final_lane = original_final
            settings.openai_api_key = original_key

    def test_openai_draft_only_with_final_required_is_warning(self) -> None:
        settings = get_settings()
        current_build = load_version_info().build
        original_image = settings.protected_beta_image_provider
        original_final = settings.protected_beta_image_require_final_lane
        original_key = settings.openai_api_key
        settings.protected_beta_image_provider = "openai"
        settings.protected_beta_image_require_final_lane = True
        settings.openai_api_key = "test-key"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[{"name": "openai", "status": "healthy"}],
                chat_routing=_make_chat_routing(),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[
                        {"provider_name": "openai", "surface": "image", "lane": "draft", "status": "ok"},
                    ],
                ),
                cost_telemetry=None,
            )
            lane = result["image"]["lane_truth"]
            assert lane["status"] == "warning"
            assert "partially proven" in lane["summary"].lower()
        finally:
            settings.protected_beta_image_provider = original_image
            settings.protected_beta_image_require_final_lane = original_final
            settings.openai_api_key = original_key


# ---------------------------------------------------------------------------
# Public paid usage readiness
# ---------------------------------------------------------------------------


class TestPublicPaidUsageReadiness:
    def test_public_paid_requires_managed_backup_for_image(self) -> None:
        settings = get_settings()
        current_build = load_version_info().build
        original_image = settings.protected_beta_image_provider
        original_key = settings.openai_api_key
        settings.protected_beta_image_provider = "openai"
        settings.openai_api_key = "test-key"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[{"name": "openai", "status": "healthy"}],
                chat_routing=_make_chat_routing(),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[
                        {"provider_name": "openai", "surface": "image", "lane": "draft", "status": "ok"},
                    ],
                ),
                cost_telemetry=None,
            )
            assert result["image"]["public_paid_usage_ready"] is False
            assert "managed backup" in result["image"]["public_paid_usage_summary"].lower()
        finally:
            settings.protected_beta_image_provider = original_image
            settings.openai_api_key = original_key


class TestEngineMatrix:
    def test_engine_matrix_marks_required_optional_and_disabled_lanes(self) -> None:
        settings = get_settings()
        current_build = load_version_info().build
        original_chat = settings.protected_beta_chat_provider
        original_image = settings.protected_beta_image_provider
        original_openai_tier = settings.openai_service_tier
        original_openrouter_tier = settings.openrouter_service_tier
        original_openai_key = settings.openai_api_key
        original_fal_key = settings.fal_api_key
        settings.protected_beta_chat_provider = "openai"
        settings.protected_beta_image_provider = "openai"
        settings.openai_service_tier = "paid"
        settings.openrouter_service_tier = "paid"
        settings.openai_api_key = "test-key"
        settings.fal_api_key = "fal-key"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[
                    {"name": "openai", "status": "healthy"},
                    {"name": "fal", "status": "healthy"},
                ],
                chat_routing=_make_chat_routing(
                    providers={
                        "openai": _provider_payload("openai"),
                        "openrouter": _provider_payload("openrouter"),
                        "gemini": _provider_payload("gemini", configured=False),
                    },
                    primary="openai",
                    fallback="openrouter",
                ),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[
                        {"provider_name": "openai", "surface": "chat", "status": "ok"},
                        {"provider_name": "openai", "surface": "image", "lane": "draft", "status": "ok"},
                    ],
                ),
                cost_telemetry=None,
            )
            matrix = {(row["surface"], row["provider"]): row for row in result["engine_matrix"]}

            assert matrix[("chat", "openai")]["role"] == "required"
            assert matrix[("chat", "openrouter")]["role"] == "optional"
            assert matrix[("chat", "gemini")]["role"] == "disabled"
            assert matrix[("image", "openai")]["role"] == "required"
            assert matrix[("image", "fal")]["role"] == "optional"
            assert matrix[("image", "demo")]["role"] == "disabled"
        finally:
            settings.protected_beta_chat_provider = original_chat
            settings.protected_beta_image_provider = original_image
            settings.openai_service_tier = original_openai_tier
            settings.openrouter_service_tier = original_openrouter_tier
            settings.openai_api_key = original_openai_key
            settings.fal_api_key = original_fal_key

    def test_public_paid_reports_configured_but_unproven_managed_backup(self) -> None:
        settings = get_settings()
        current_build = load_version_info().build
        original_image = settings.protected_beta_image_provider
        original_key = settings.openai_api_key
        original_fal_key = settings.fal_api_key
        settings.protected_beta_image_provider = "openai"
        settings.openai_api_key = "test-key"
        settings.fal_api_key = "fal-key"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[
                    {"name": "openai", "status": "healthy"},
                    {"name": "fal", "status": "healthy"},
                ],
                chat_routing=_make_chat_routing(),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[
                        {"provider_name": "openai", "surface": "image", "lane": "draft", "status": "ok"},
                    ],
                ),
                cost_telemetry=None,
            )
            assert result["image"]["resilience_status"] == "warning"
            assert "managed backup lanes (fal) are configured but not proven" in result["image"]["resilience_summary"]
            assert "configured managed backups (fal) are not proven" in result["image"]["public_paid_usage_summary"]
            assert result["image"]["configured_unproven_managed_backup_provider_count"] == 1
            assert result["image"]["configured_unproven_managed_backup_providers"] == ["fal"]
        finally:
            settings.protected_beta_image_provider = original_image
            settings.openai_api_key = original_key
            settings.fal_api_key = original_fal_key

    def test_protected_beta_truth_not_mixed_with_public_paid(self) -> None:
        """Verify that protected-beta pass does NOT imply public-paid pass."""
        settings = get_settings()
        current_build = load_version_info().build
        original_image = settings.protected_beta_image_provider
        original_key = settings.openai_api_key
        settings.protected_beta_image_provider = "openai"
        settings.openai_api_key = "test-key"
        try:
            result = build_provider_truth_report(
                settings=settings,
                provider_status=[{"name": "openai", "status": "healthy"}],
                chat_routing=_make_chat_routing(),
                provider_smoke_report=_make_smoke_report(
                    build=current_build,
                    results=[
                        {"provider_name": "openai", "surface": "image", "lane": "draft", "status": "ok"},
                    ],
                ),
                cost_telemetry=None,
            )
            # Image is pass for protected beta
            assert result["image"]["status"] == "pass"
            assert result["image"]["launch_grade_ready"] is True
            # But NOT for public paid
            assert result["image"]["public_paid_usage_ready"] is False
            # Overall report should NOT say safe
            assert result["public_paid_usage_safe"] is False
        finally:
            settings.protected_beta_image_provider = original_image
            settings.openai_api_key = original_key
