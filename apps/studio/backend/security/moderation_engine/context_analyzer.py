from __future__ import annotations

import re

from .lexicon import (
    ADULT_TERMS,
    AMBIGUOUS_YOUTH_TERMS,
    EXPLICIT_MINOR_TERMS,
    EXPLICIT_SEXUAL_TERMS,
    FASHION_TERMS,
    GRAPHIC_VIOLENCE_TERMS,
    LINGERIE_TERMS,
    NON_CONSENSUAL_TERMS,
    ROMANTIC_TERMS,
    SELF_HARM_TERMS,
    SUGGESTIVE_TERMS,
    SWIMWEAR_TERMS,
)
from .models import AgeAmbiguity, ContextAnalysis, ContextType, ParsedPrompt, SexualIntent
from .normalization import contains_any

_ADULT_AGE_PATTERN = re.compile(r"\b(?:age\s*)?(2[1-9]|[3-9][0-9])\s*(?:year old|yo)\b")
_MINOR_AGE_PATTERN = re.compile(r"\b(?:age\s*)?(1[0-7]|[1-9])\s*(?:year old|yo)\b")


def analyze_context(parsed: ParsedPrompt) -> ContextAnalysis:
    normalized = parsed.normalized
    signals: list[str] = []
    risk_score = 0
    reason_code: str | None = None

    has_explicit_minor = contains_any(normalized, EXPLICIT_MINOR_TERMS) is not None or bool(_MINOR_AGE_PATTERN.search(normalized))
    has_adult = contains_any(normalized, ADULT_TERMS) is not None or bool(_ADULT_AGE_PATTERN.search(normalized))
    has_ambiguous_youth = contains_any(normalized, AMBIGUOUS_YOUTH_TERMS) is not None
    has_swimwear = contains_any(normalized, SWIMWEAR_TERMS) is not None
    has_lingerie = contains_any(normalized, LINGERIE_TERMS) is not None
    has_fashion = contains_any(normalized, FASHION_TERMS) is not None
    has_romantic = contains_any(normalized, ROMANTIC_TERMS) is not None
    has_suggestive = contains_any(normalized, SUGGESTIVE_TERMS) is not None
    has_explicit_sexual = contains_any(normalized, EXPLICIT_SEXUAL_TERMS) is not None
    has_non_consensual = contains_any(normalized, NON_CONSENSUAL_TERMS) is not None
    has_violence = contains_any(normalized, GRAPHIC_VIOLENCE_TERMS) is not None
    has_self_harm = contains_any(normalized, SELF_HARM_TERMS) is not None

    if has_explicit_minor:
        age_ambiguity = AgeAmbiguity.EXPLICIT_MINOR
        signals.append("explicit_minor_signal")
        risk_score += 85
        reason_code = reason_code or "minor_signal"
    elif has_ambiguous_youth and (has_swimwear or has_lingerie or has_suggestive or has_explicit_sexual):
        age_ambiguity = AgeAmbiguity.AMBIGUOUS
        signals.append("age_ambiguity_signal")
        risk_score += 35
        reason_code = reason_code or "age_ambiguity"
    elif has_adult:
        age_ambiguity = AgeAmbiguity.CLEAR_ADULT
        signals.append("clear_adult_signal")
    elif has_ambiguous_youth:
        age_ambiguity = AgeAmbiguity.AMBIGUOUS
        signals.append("age_ambiguous_nonsexual_signal")
        risk_score += 8
        reason_code = reason_code or "age_ambiguity"
    else:
        age_ambiguity = AgeAmbiguity.UNKNOWN

    if has_self_harm:
        context_type = ContextType.SELF_HARM
        sexual_intent = SexualIntent.NONE
        signals.append("self_harm_signal")
        risk_score += 85
        reason_code = reason_code or "self_harm_instructions"
    elif has_non_consensual:
        context_type = ContextType.ILLEGAL
        sexual_intent = SexualIntent.EXPLICIT
        signals.append("non_consensual_signal")
        risk_score += 90
        reason_code = reason_code or "non_consensual_sexual_content"
    elif has_violence:
        context_type = ContextType.GRAPHIC_VIOLENCE
        sexual_intent = SexualIntent.NONE
        signals.append("graphic_violence_signal")
        risk_score += 80
        reason_code = reason_code or "graphic_extreme_violence"
    elif has_explicit_sexual:
        context_type = ContextType.EXPLICIT_SEXUAL
        sexual_intent = SexualIntent.EXPLICIT
        signals.append("explicit_sexual_signal")
        risk_score += 75
        reason_code = reason_code or "explicit_sexual_content"
    elif has_lingerie:
        context_type = ContextType.LINGERIE
        sexual_intent = SexualIntent.SUGGESTIVE if has_suggestive or has_romantic else SexualIntent.MILD
        signals.append("lingerie_signal")
        risk_score += 28 if age_ambiguity == AgeAmbiguity.CLEAR_ADULT else 34
        reason_code = reason_code or "adult_adjacent_lingerie"
    elif has_swimwear:
        context_type = ContextType.SWIMWEAR
        sexual_intent = SexualIntent.SUGGESTIVE if has_suggestive else SexualIntent.MILD
        signals.append("swimwear_signal")
        risk_score += 20 if age_ambiguity == AgeAmbiguity.CLEAR_ADULT else 28
        reason_code = reason_code or "adult_adjacent_swimwear"
    elif has_suggestive:
        context_type = ContextType.EDITORIAL if has_fashion else ContextType.ROMANTIC
        sexual_intent = SexualIntent.SUGGESTIVE
        signals.append("suggestive_signal")
        risk_score += 22
        reason_code = reason_code or "suggestive_intent"
    elif has_fashion:
        context_type = ContextType.FASHION
        sexual_intent = SexualIntent.NONE
        signals.append("fashion_signal")
        risk_score += 4
    elif has_romantic:
        context_type = ContextType.ROMANTIC
        sexual_intent = SexualIntent.MILD
        signals.append("romantic_signal")
        risk_score += 10
    else:
        context_type = ContextType.GENERAL
        sexual_intent = SexualIntent.NONE

    if age_ambiguity == AgeAmbiguity.EXPLICIT_MINOR and sexual_intent != SexualIntent.NONE:
        signals.append("minor_with_sexual_context")
        risk_score = max(risk_score, 95)
        reason_code = "sexual_minors"
    elif age_ambiguity == AgeAmbiguity.AMBIGUOUS and sexual_intent in {SexualIntent.MILD, SexualIntent.SUGGESTIVE, SexualIntent.EXPLICIT}:
        signals.append("age_ambiguity_with_sexual_context")
        risk_score += 18
        reason_code = reason_code or "age_ambiguity"

    explanation = ", ".join(signals) if signals else "no_significant_signals"
    return ContextAnalysis(
        risk_score=min(100, max(0, risk_score)),
        reason_code=reason_code,
        age_ambiguity=age_ambiguity,
        sexual_intent=sexual_intent,
        context_type=context_type,
        signals=tuple(signals),
        explanation=explanation,
    )
