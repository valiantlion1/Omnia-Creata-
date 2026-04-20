from __future__ import annotations

from .lexicon import (
    EXPLICIT_MINOR_TERMS,
    EXPLICIT_SEXUAL_TERMS,
    GRAPHIC_VIOLENCE_TERMS,
    NON_CONSENSUAL_TERMS,
    RISK_LEXICON,
    SELF_HARM_TERMS,
)
from .models import FastFilterDecision, FastFilterOutcome, ModerationResult, ParsedPrompt
from .normalization import contains_any


def run_fast_filter(parsed: ParsedPrompt) -> FastFilterDecision:
    normalized = parsed.normalized
    if not normalized:
        return FastFilterDecision(outcome=FastFilterOutcome.SAFE, signals=("empty_prompt",))

    if contains_any(normalized, EXPLICIT_MINOR_TERMS) and contains_any(normalized, EXPLICIT_SEXUAL_TERMS):
        return FastFilterDecision(
            outcome=FastFilterOutcome.BLOCK,
            reason="sexual_minors",
            result=ModerationResult.HARD_BLOCK,
            signals=("explicit_minor_term", "explicit_sexual_term"),
        )

    if contains_any(normalized, NON_CONSENSUAL_TERMS):
        return FastFilterDecision(
            outcome=FastFilterOutcome.BLOCK,
            reason="non_consensual_sexual_content",
            result=ModerationResult.HARD_BLOCK,
            signals=("non_consensual_term",),
        )

    if contains_any(normalized, GRAPHIC_VIOLENCE_TERMS):
        return FastFilterDecision(
            outcome=FastFilterOutcome.BLOCK,
            reason="graphic_extreme_violence",
            result=ModerationResult.HARD_BLOCK,
            signals=("graphic_violence_term",),
        )

    if contains_any(normalized, SELF_HARM_TERMS):
        return FastFilterDecision(
            outcome=FastFilterOutcome.BLOCK,
            reason="self_harm_instructions",
            result=ModerationResult.HARD_BLOCK,
            signals=("self_harm_term",),
        )

    if contains_any(normalized, EXPLICIT_SEXUAL_TERMS):
        return FastFilterDecision(
            outcome=FastFilterOutcome.BLOCK,
            reason="explicit_sexual_content",
            result=ModerationResult.SOFT_BLOCK,
            signals=("explicit_sexual_term",),
        )

    if contains_any(normalized, RISK_LEXICON):
        return FastFilterDecision(
            outcome=FastFilterOutcome.ANALYZE,
            signals=("risk_lexicon_match",),
        )

    return FastFilterDecision(
        outcome=FastFilterOutcome.SAFE,
        signals=("no_risk_terms",),
    )
