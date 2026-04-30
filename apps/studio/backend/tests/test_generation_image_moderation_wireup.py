"""Wire-up tests for the post-generation image moderation analyzer.

The analyzer module itself (test_moderation_image_analyzer.py) covers the
pure logic. These tests cover the integration glue inside
`GenerationService._apply_image_moderation_post_check`:

  - The analyzer skips inside pytest by design, so the wire-up path must
    handle the "skipped" branch gracefully and leave assets unmodified
    (other than the audit metadata that records the skip).
  - When a non-skipped analyzer call returns an override (we simulate this
    by patching `analyze_generated_image` and `decide_image_action`),
    `library_state` and `protection_state` flip on the affected asset and
    audit metadata is recorded.
  - When `_read_asset_bytes` cannot retrieve bytes, the helper logs and
    continues without failing the generation.
  - The library service surfaces `needs_review` as a recognized state
    (does not silently downgrade it to "ready").
"""

from __future__ import annotations

from typing import Any

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
)
from studio_platform.models import (
    GenerationJob,
    JobStatus,
    MediaAsset,
    PromptSnapshot,
)


# --- A small fake host for the helper -------------------------------------
#
# The helper only touches `_read_asset_bytes`, `analyze_generated_image`,
# and `decide_image_action`. We isolate the unit under test by importing
# the bound method off the real GenerationService class and binding it to
# a bare object that supplies just the required surface.


class _FakeGenerationHost:
    """Minimal stand-in for a GenerationService instance.

    Only `_read_asset_bytes` is invoked by the helper, so we expose just
    that as an awaitable. The helper does not touch `self.service` at all.
    """

    def __init__(self, *, fake_bytes: bytes | None = b"\x89PNGfake", fake_mime: str = "image/png", raise_on_read: bool = False) -> None:
        self._fake_bytes = fake_bytes
        self._fake_mime = fake_mime
        self._raise_on_read = raise_on_read

    async def _read_asset_bytes(self, asset: MediaAsset, *, variant: str) -> tuple[bytes, str]:
        if self._raise_on_read:
            raise RuntimeError("simulated read failure")
        assert variant == "content"
        return self._fake_bytes or b"", self._fake_mime


def _make_job() -> GenerationJob:
    return GenerationJob(
        id="job-1",
        workspace_id="ws-1",
        project_id="proj-1",
        identity_id="id-1",
        title="Test",
        model="flux-2",
        provider="runware",
        estimated_cost=0.0,
        credit_cost=0,
        status=JobStatus.SUCCEEDED,
        prompt_snapshot=PromptSnapshot(
            prompt="adult model in editorial fashion portrait",
            negative_prompt="",
            model="flux-2",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.5,
            seed=42,
            aspect_ratio="1:1",
        ),
    )


def _make_asset() -> MediaAsset:
    return MediaAsset(
        id="asset-1",
        workspace_id="ws-1",
        project_id="proj-1",
        identity_id="id-1",
        title="Test",
        prompt="adult model in editorial fashion portrait",
        url="stored",
        local_path="",
        metadata={"library_state": "ready"},
    )


# Bind the helper as an unbound method to call against a stand-in host.
# This is the same pattern as testing any standalone async coroutine.
from studio_platform.services.generation_service import GenerationService

_apply_image_moderation_post_check = GenerationService._apply_image_moderation_post_check


@pytest.mark.asyncio
async def test_post_check_skips_inside_pytest_environment_records_skip_reason():
    """Inside pytest the analyzer short-circuits with skipped=True.

    The wire-up should record the skip reason on each asset's metadata
    without changing library_state.
    """
    host = _FakeGenerationHost()
    job = _make_job()
    asset = _make_asset()

    await _apply_image_moderation_post_check(
        host,
        job=job,
        created_assets=[asset],
    )

    assert asset.metadata["library_state"] == "ready"  # unchanged
    # The pytest short-circuit leaves analyzer_skipped True with the
    # canonical reason — wire-up should record it for audit.
    assert asset.metadata.get("moderation_analyzer_skipped_reason") == "pytest_environment"
    assert "moderation_analyzer_used" not in asset.metadata


@pytest.mark.asyncio
async def test_post_check_no_assets_is_a_noop():
    host = _FakeGenerationHost()
    job = _make_job()
    # Should not raise even with empty list.
    await _apply_image_moderation_post_check(
        host,
        job=job,
        created_assets=[],
    )


@pytest.mark.asyncio
async def test_post_check_handles_unreadable_asset_bytes():
    """If the asset bytes can't be read, the helper logs and continues."""
    host = _FakeGenerationHost(raise_on_read=True)
    job = _make_job()
    asset = _make_asset()

    # Should not raise.
    await _apply_image_moderation_post_check(
        host,
        job=job,
        created_assets=[asset],
    )
    # Asset state untouched.
    assert asset.metadata["library_state"] == "ready"
    assert "moderation_analyzer_used" not in asset.metadata


@pytest.mark.asyncio
async def test_post_check_applies_blocked_override_when_analyzer_returns_hard_block(monkeypatch):
    """Patch the analyzer to return a hard_block decision and assert
    library_state flips and audit metadata is recorded."""
    host = _FakeGenerationHost()
    job = _make_job()
    asset = _make_asset()

    fake_analysis = ImageModerationAnalysis(
        risk_score=92,
        recommended_action=ModerationAction.HARD_BLOCK,
        reason_code="non_consensual_sexual_content",
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.EXPLICIT,
        context_type=ContextType.ILLEGAL,
        signals=("ncii_signal",),
        explanation="Image depicts non-consensual content.",
        model="vision-test",
    )
    fake_decision = ImageModerationDecision(
        result=ModerationResult.HARD_BLOCK,
        action=ModerationAction.HARD_BLOCK,
        risk_level=PromptRiskLevel.CRITICAL,
        risk_score=95,
        reason="non_consensual_sexual_content",
        library_state_override="blocked",
        analyzer_used=True,
        analyzer_model="vision-test",
        signals=("ncii_signal",),
    )

    async def fake_analyze(**_kwargs: Any) -> ImageModerationAnalysis:
        return fake_analysis

    def fake_decide(_analysis: ImageModerationAnalysis, *, prompt_decision=None) -> ImageModerationDecision:
        return fake_decision

    monkeypatch.setattr(
        "studio_platform.services.generation_service.analyze_generated_image",
        fake_analyze,
    )
    monkeypatch.setattr(
        "studio_platform.services.generation_service.decide_image_action",
        fake_decide,
    )

    await _apply_image_moderation_post_check(
        host,
        job=job,
        created_assets=[asset],
    )

    assert asset.metadata["library_state"] == "blocked"
    assert asset.metadata["protection_state"] == "blocked"
    assert asset.metadata["moderation_analyzer_used"] is True
    assert asset.metadata["moderation_analyzer_model"] == "vision-test"
    assert asset.metadata["moderation_analyzer_action"] == ModerationAction.HARD_BLOCK.value
    assert asset.metadata["moderation_analyzer_risk_score"] == 95
    assert asset.metadata["moderation_analyzer_reason"] == "non_consensual_sexual_content"
    assert asset.metadata["moderation_analyzer_signals"] == ["ncii_signal"]


@pytest.mark.asyncio
async def test_post_check_applies_needs_review_override_for_review_decision(monkeypatch):
    host = _FakeGenerationHost()
    job = _make_job()
    asset = _make_asset()

    fake_analysis = ImageModerationAnalysis(
        risk_score=42,
        recommended_action=ModerationAction.REVIEW,
        reason_code=None,
        age_ambiguity=AgeAmbiguity.AMBIGUOUS,
        sexual_intent=SexualIntent.SUGGESTIVE,
        context_type=ContextType.SWIMWEAR,
        signals=("ambiguous_age_signal",),
        model="vision-test",
    )
    fake_decision = ImageModerationDecision(
        result=ModerationResult.REVIEW,
        action=ModerationAction.REVIEW,
        risk_level=PromptRiskLevel.MEDIUM,
        risk_score=42,
        reason="image_review",
        library_state_override="needs_review",
        analyzer_used=True,
        analyzer_model="vision-test",
        signals=("ambiguous_age_signal",),
    )

    async def fake_analyze(**_kwargs: Any) -> ImageModerationAnalysis:
        return fake_analysis

    def fake_decide(_analysis: ImageModerationAnalysis, *, prompt_decision=None) -> ImageModerationDecision:
        return fake_decision

    monkeypatch.setattr(
        "studio_platform.services.generation_service.analyze_generated_image",
        fake_analyze,
    )
    monkeypatch.setattr(
        "studio_platform.services.generation_service.decide_image_action",
        fake_decide,
    )

    await _apply_image_moderation_post_check(
        host,
        job=job,
        created_assets=[asset],
    )

    assert asset.metadata["library_state"] == "needs_review"
    # needs_review must NOT flip protection_state — only "blocked" does.
    assert asset.metadata.get("protection_state") != "blocked"
    assert asset.metadata["moderation_analyzer_action"] == ModerationAction.REVIEW.value


@pytest.mark.asyncio
async def test_post_check_leaves_clean_asset_unchanged_when_decision_has_no_override(monkeypatch):
    host = _FakeGenerationHost()
    job = _make_job()
    asset = _make_asset()

    fake_analysis = ImageModerationAnalysis(
        risk_score=5,
        recommended_action=ModerationAction.ALLOW,
        reason_code=None,
        age_ambiguity=AgeAmbiguity.CLEAR_ADULT,
        sexual_intent=SexualIntent.NONE,
        context_type=ContextType.GENERAL,
        signals=(),
        model="vision-test",
    )
    fake_decision = ImageModerationDecision(
        result=ModerationResult.SAFE,
        action=ModerationAction.ALLOW,
        risk_level=PromptRiskLevel.LOW,
        risk_score=5,
        reason=None,
        library_state_override=None,
        analyzer_used=True,
        analyzer_model="vision-test",
    )

    async def fake_analyze(**_kwargs: Any) -> ImageModerationAnalysis:
        return fake_analysis

    def fake_decide(_analysis: ImageModerationAnalysis, *, prompt_decision=None) -> ImageModerationDecision:
        return fake_decision

    monkeypatch.setattr(
        "studio_platform.services.generation_service.analyze_generated_image",
        fake_analyze,
    )
    monkeypatch.setattr(
        "studio_platform.services.generation_service.decide_image_action",
        fake_decide,
    )

    await _apply_image_moderation_post_check(
        host,
        job=job,
        created_assets=[asset],
    )

    # No override applied.
    assert asset.metadata["library_state"] == "ready"
    # But the analyzer-used audit trail is still written so we can prove
    # this asset was checked.
    assert asset.metadata["moderation_analyzer_used"] is True
    assert asset.metadata["moderation_analyzer_action"] == ModerationAction.ALLOW.value
    assert asset.metadata["moderation_analyzer_risk_score"] == 5


@pytest.mark.asyncio
async def test_post_check_swallows_analyzer_exceptions(monkeypatch):
    """If the analyzer raises (network outage, OOM, etc.), the helper must
    log and continue rather than crashing the generation pipeline."""
    host = _FakeGenerationHost()
    job = _make_job()
    asset = _make_asset()

    async def boom(**_kwargs: Any) -> ImageModerationAnalysis:
        raise RuntimeError("simulated analyzer failure")

    monkeypatch.setattr(
        "studio_platform.services.generation_service.analyze_generated_image",
        boom,
    )

    # Must not raise.
    await _apply_image_moderation_post_check(
        host,
        job=job,
        created_assets=[asset],
    )
    # Asset stays clean.
    assert asset.metadata["library_state"] == "ready"
    assert "moderation_analyzer_used" not in asset.metadata


# --- Library service surface contract ---


def test_library_service_recognizes_needs_review_as_distinct_state():
    """The library service must recognize "needs_review" as its own state,
    not silently downgrade it to "ready"."""
    from pathlib import Path
    from studio_platform.providers import ProviderRegistry
    from studio_platform.service import StudioService
    from studio_platform.store import StudioStateStore

    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")

        review_asset = MediaAsset(
            id="needs-review-1",
            workspace_id="ws-1",
            project_id="proj-1",
            identity_id="id-1",
            title="Needs review",
            prompt="prompt",
            url="stored",
            local_path="",
            metadata={"library_state": "needs_review"},
        )
        ready_asset = MediaAsset(
            id="ready-1",
            workspace_id="ws-1",
            project_id="proj-1",
            identity_id="id-1",
            title="Ready",
            prompt="prompt",
            url="stored",
            local_path="",
            metadata={"library_state": "ready"},
        )

        # Library service should preserve the needs_review state, not coerce
        # it to ready.
        assert service.library.asset_library_state(review_asset) == "needs_review"
        assert service.library.asset_library_state(ready_asset) == "ready"

        # needs_review assets are NOT public-share-eligible (require ready).
        assert service.library.is_public_share_eligible_asset(review_asset) is False
