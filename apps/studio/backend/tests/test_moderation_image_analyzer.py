"""Unit tests for the post-generation image moderation analyzer.

The analyzer itself short-circuits inside pytest (sets
`PYTEST_CURRENT_TEST` is detected at the top of `analyze_generated_image`),
so these tests cover the pure-logic surface: encoding helpers, decision
mapping, and the "skipped" fallthrough behavior. The live vision
provider call is covered separately by integration smoke when keys are
configured.
"""

from __future__ import annotations

import asyncio

import pytest

from security.moderation_engine import (
    AgeAmbiguity,
    ContextType,
    ImageModerationAnalysis,
    ImageModerationDecision,
    ModerationAction,
    ModerationResult,
    PromptRiskLevel,
    SexualIntent,
    analyze_generated_image,
    decide_image_action,
)
from security.moderation_engine.image_analyzer import (
    _encode_image_data_url,
    _has_any_vision_provider,
    _risk_level_for_score,
)


def test_encode_image_data_url_handles_small_payload():
    encoded = _encode_image_data_url(b"\x89PNGfake", mime_type="image/png")
    assert encoded is not None
    assert encoded.startswith("data:image/png;base64,")


def test_encode_image_data_url_rejects_oversize_payload():
    five_mib = b"\x00" * (5 * 1024 * 1024)
    assert _encode_image_data_url(five_mib, mime_type="image/png") is None


def test_encode_image_data_url_defaults_to_png_when_mime_missing():
    encoded = _encode_image_data_url(b"abc", mime_type=None)
    assert encoded is not None
    assert encoded.startswith("data:image/png;base64,")


def test_risk_level_for_score_buckets_low_medium_high_critical():
    assert _risk_level_for_score(0) is PromptRiskLevel.LOW
    assert _risk_level_for_score(29) is PromptRiskLevel.LOW
    assert _risk_level_for_score(30) is PromptRiskLevel.MEDIUM
    assert _risk_level_for_score(59) is PromptRiskLevel.MEDIUM
    assert _risk_level_for_score(60) is PromptRiskLevel.HIGH
    assert _risk_level_for_score(84) is PromptRiskLevel.HIGH
    assert _risk_level_for_score(85) is PromptRiskLevel.CRITICAL
    assert _risk_level_for_score(100) is PromptRiskLevel.CRITICAL


def test_decide_image_action_skipped_passthrough_does_not_block():
    analysis = ImageModerationAnalysis(skipped=True, skipped_reason="no_vision_provider_configured")
    decision = decide_image_action(analysis)
    assert decision.analyzer_used is False
    assert decision.analyzer_skipped is True
    assert decision.analyzer_skipped_reason == "no_vision_provider_configured"
    assert decision.action is ModerationAction.ALLOW
    assert decision.library_state_override is None


def test_decide_image_action_hard_blocks_minors_in_sexual_context():
    analysis = ImageModerationAnalysis(
        risk_score=80,
        recommended_action=ModerationAction.HARD_BLOCK,
        reason_code=None,
        age_ambiguity=AgeAmbiguity.IMPLIED_MINOR,
        sexual_intent=SexualIntent.SUGGESTIVE,
        context_type=ContextType.UNKNOWN,
        signals=("minor_silhouette",),
        explanation="Composition implies minor with suggestive context.",
        model="vision-test",
    )
    decision = decide_image_action(analysis)
    assert decision.result is ModerationResult.HARD_BLOCK
    assert decision.action is ModerationAction.HARD_BLOCK
    assert decision.risk_level is PromptRiskLevel.CRITICAL
    assert decision.library_state_override == "blocked"
    assert decision.reason == "sexual_minors"


def test_decide_image_action_hard_blocks_critical_reason_code():
    analysis = ImageModerationAnalysis(
        risk_score=70,
        recommended_action=ModerationAction.HARD_BLOCK,
        reason_code="non_consensual_sexual_content",
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.EXPLICIT,
        context_type=ContextType.EXPLICIT_SEXUAL,
        signals=(),
        explanation="",
        model="vision-test",
    )
    decision = decide_image_action(analysis)
    assert decision.result is ModerationResult.HARD_BLOCK
    assert decision.library_state_override == "blocked"
    assert decision.reason == "non_consensual_sexual_content"


def test_decide_image_action_soft_blocks_explicit_sexual_for_clear_adult():
    analysis = ImageModerationAnalysis(
        risk_score=68,
        recommended_action=ModerationAction.HARD_BLOCK,
        reason_code="explicit_sexual",
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.EXPLICIT,
        context_type=ContextType.EXPLICIT_SEXUAL,
        signals=(),
        explanation="",
        model="vision-test",
    )
    decision = decide_image_action(analysis)
    assert decision.result is ModerationResult.SOFT_BLOCK
    assert decision.action is ModerationAction.HARD_BLOCK
    assert decision.library_state_override == "blocked"


def test_decide_image_action_reviews_swimwear_with_elevated_score():
    analysis = ImageModerationAnalysis(
        risk_score=42,
        recommended_action=ModerationAction.REVIEW,
        reason_code=None,
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.SUGGESTIVE,
        context_type=ContextType.SWIMWEAR,
        signals=("beach",),
        explanation="",
        model="vision-test",
    )
    decision = decide_image_action(analysis)
    assert decision.result is ModerationResult.REVIEW
    assert decision.action is ModerationAction.REVIEW
    assert decision.library_state_override == "needs_review"
    assert decision.risk_level is PromptRiskLevel.MEDIUM


def test_decide_image_action_does_not_review_low_risk_clear_swimwear():
    analysis = ImageModerationAnalysis(
        risk_score=10,
        recommended_action=ModerationAction.ALLOW,
        reason_code=None,
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.NONE,
        context_type=ContextType.SWIMWEAR,
        signals=("beach",),
        explanation="",
        model="vision-test",
    )
    decision = decide_image_action(analysis)
    assert decision.action is ModerationAction.ALLOW
    assert decision.library_state_override is None


def test_decide_image_action_logs_when_score_moderate_no_hard_signal():
    analysis = ImageModerationAnalysis(
        risk_score=20,
        recommended_action=ModerationAction.ALLOW_WITH_LOG,
        reason_code=None,
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.NONE,
        context_type=ContextType.GENERAL,
        signals=("low_confidence",),
        explanation="",
        model="vision-test",
    )
    decision = decide_image_action(analysis)
    assert decision.action is ModerationAction.ALLOW_WITH_LOG
    assert decision.library_state_override is None


def test_decide_image_action_allows_clean_image():
    analysis = ImageModerationAnalysis(
        risk_score=2,
        recommended_action=ModerationAction.ALLOW,
        reason_code=None,
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.NONE,
        context_type=ContextType.GENERAL,
        signals=(),
        explanation="",
        model="vision-test",
    )
    decision = decide_image_action(analysis)
    assert decision.result is ModerationResult.SAFE
    assert decision.action is ModerationAction.ALLOW
    assert decision.library_state_override is None
    assert decision.risk_level is PromptRiskLevel.LOW


def test_analyze_generated_image_skips_during_pytest():
    # The analyzer must not hit the network from inside the test runner —
    # PYTEST_CURRENT_TEST is the canonical signal.
    result = asyncio.run(
        analyze_generated_image(
            image_bytes=b"\x89PNGfake",
            image_mime_type="image/png",
            prompt="a cat sitting on a chair",
        )
    )
    assert isinstance(result, ImageModerationAnalysis)
    assert result.skipped is True
    assert result.skipped_reason == "pytest_environment"


def test_analyze_generated_image_skips_when_no_payload(monkeypatch):
    # If we suppress the pytest short-circuit but provide no image payload,
    # the analyzer should still skip cleanly with a no_image_payload reason.
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setattr(
        "security.moderation_engine.image_analyzer._has_any_vision_provider",
        lambda: True,
    )
    result = asyncio.run(
        analyze_generated_image(
            image_bytes=None,
            image_url=None,
            prompt="a cat sitting on a chair",
        )
    )
    assert result.skipped is True
    assert result.skipped_reason == "no_image_payload"


def test_has_any_vision_provider_false_with_no_keys(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")

    # Force a fresh settings probe — _has_any_vision_provider reads through
    # get_settings() which is process-global, so we reach into the helper
    # only to assert the gate behavior under no-key conditions.
    from config.env import Settings

    settings = Settings(_env_file=None, jwt_secret="x" * 32)
    monkeypatch.setattr("security.moderation_engine.image_analyzer.get_settings", lambda: settings)
    assert _has_any_vision_provider() is False


def test_decide_image_action_decision_is_dataclass():
    decision = ImageModerationDecision()
    assert decision.action is ModerationAction.ALLOW
    assert decision.library_state_override is None
