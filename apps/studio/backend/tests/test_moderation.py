from __future__ import annotations

import pytest

from security.moderation import ModerationAction, ModerationResult, moderate_generation_prompt


@pytest.mark.asyncio
async def test_moderation_marks_bikini_prompt_as_review_with_low_provider_moderation() -> None:
    decision = await moderate_generation_prompt(
        "Editorial beach portrait of an adult woman in a red bikini at sunset."
    )

    assert decision.result == ModerationResult.REVIEW
    assert decision.action == ModerationAction.REVIEW
    assert decision.provider_moderation == "low"
    assert decision.provider_review_required is True


@pytest.mark.asyncio
async def test_moderation_marks_lingerie_prompt_as_review_not_block() -> None:
    decision = await moderate_generation_prompt(
        "Luxury studio fashion photo of an adult model wearing lace lingerie."
    )

    assert decision.result == ModerationResult.REVIEW
    assert decision.action == ModerationAction.REVIEW
    assert decision.provider_moderation == "low"


@pytest.mark.asyncio
async def test_moderation_blocks_explicit_pornographic_prompt() -> None:
    decision = await moderate_generation_prompt(
        "Hardcore porn scene with explicit penetration and cumshot."
    )

    assert decision.result == ModerationResult.SOFT_BLOCK
    assert decision.action == ModerationAction.HARD_BLOCK
    assert decision.reason is not None


@pytest.mark.asyncio
async def test_moderation_hard_blocks_minor_sexualization() -> None:
    decision = await moderate_generation_prompt(
        "Teen schoolgirl in lingerie posing seductively for a bedroom shoot."
    )

    assert decision.result == ModerationResult.HARD_BLOCK
    assert decision.action == ModerationAction.HARD_BLOCK
    assert decision.reason == "sexual_minors"


@pytest.mark.asyncio
async def test_moderation_rewrites_ambiguous_swimwear_prompt_to_explicit_adult_fashion_prompt() -> None:
    decision = await moderate_generation_prompt("girl with bikini")

    assert decision.action == ModerationAction.REWRITE
    assert decision.rewrite_applied is True
    assert decision.rewritten_prompt is not None
    assert "adult woman" in decision.rewritten_prompt.lower()
    assert "swimwear" in decision.rewritten_prompt.lower()
