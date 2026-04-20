from __future__ import annotations

from typing import Optional, Tuple

from security.moderation_engine import (
    ModerationAction,
    ModerationResult,
    PromptModerationDecision,
    moderate_prompt,
)
from security.moderation_engine.normalization import normalize_for_moderation, term_matches

# Display names keep a stricter deterministic filter than generation prompts.
DISPLAY_NAME_HARD_BLOCK_TERMS = {
    "child porn",
    "cp",
    "rape",
    "pedophile",
    "terrorist",
    "csam",
}

DISPLAY_NAME_SOFT_BLOCK_TERMS = {
    "naked",
    "nude",
    "blood",
    "sexy",
    "erotic",
    "nsfw",
    "biden",
    "trump",
    "putin",
    "politician",
}


async def moderate_generation_prompt(prompt: str) -> PromptModerationDecision:
    return await moderate_prompt(prompt)


def check_display_name_safety(display_name: str) -> Tuple[ModerationResult, Optional[str]]:
    if not display_name:
        return (ModerationResult.SAFE, None)

    normalized = normalize_for_moderation(display_name)

    for term in DISPLAY_NAME_HARD_BLOCK_TERMS:
        if term_matches(term, normalized):
            return (ModerationResult.HARD_BLOCK, term)

    for term in DISPLAY_NAME_SOFT_BLOCK_TERMS:
        if term_matches(term, normalized):
            return (ModerationResult.SOFT_BLOCK, term)

    return (ModerationResult.SAFE, None)


async def check_prompt_safety(prompt: str) -> PromptModerationDecision:
    return await moderate_generation_prompt(prompt)


__all__ = [
    "ModerationAction",
    "ModerationResult",
    "PromptModerationDecision",
    "check_display_name_safety",
    "check_prompt_safety",
    "moderate_generation_prompt",
]
