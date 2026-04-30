from __future__ import annotations

import re

from .models import AgeAmbiguity, ContextAnalysis, ContextType, SexualIntent

_AGE_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    # NOTE: We deliberately do NOT rewrite "young woman/man/women/men" here
    # anymore — those phrases are now in ADULT_TERMS and read as CLEAR_ADULT,
    # so they do not reach this rewrite step. Only the genuinely-ambiguous
    # tokens ("girl", "boy", and "young girl/boy" + plurals) get hardened.
    (re.compile(r"\byoung girls\b", re.IGNORECASE), "adult women"),
    (re.compile(r"\byoung boys\b", re.IGNORECASE), "adult men"),
    (re.compile(r"\byoung girl\b", re.IGNORECASE), "adult woman"),
    (re.compile(r"\byoung boy\b", re.IGNORECASE), "adult man"),
    (re.compile(r"\bgirls\b", re.IGNORECASE), "adult women"),
    (re.compile(r"\bboys\b", re.IGNORECASE), "adult men"),
    (re.compile(r"\bgirl\b", re.IGNORECASE), "adult woman"),
    (re.compile(r"\bboy\b", re.IGNORECASE), "adult man"),
)

_SAFETY_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bwith bikini\b", re.IGNORECASE), "in swimwear"),
    (re.compile(r"\bwith swimsuit\b", re.IGNORECASE), "in swimwear"),
    (re.compile(r"\bbikini\b", re.IGNORECASE), "swimwear"),
    (re.compile(r"\bsexy\b", re.IGNORECASE), "fashion-forward"),
    (re.compile(r"\bsensual\b", re.IGNORECASE), "editorial"),
    (re.compile(r"\bseductive\b", re.IGNORECASE), "confident"),
    (re.compile(r"\bsultry\b", re.IGNORECASE), "editorial"),
)


def rewrite_prompt(original_prompt: str, context: ContextAnalysis) -> str | None:
    if context.context_type in {ContextType.EXPLICIT_SEXUAL, ContextType.GRAPHIC_VIOLENCE, ContextType.SELF_HARM, ContextType.ILLEGAL}:
        return None

    if context.age_ambiguity not in {AgeAmbiguity.AMBIGUOUS, AgeAmbiguity.UNKNOWN}:
        return None

    if context.sexual_intent not in {SexualIntent.MILD, SexualIntent.SUGGESTIVE}:
        return None

    rewritten = original_prompt.strip()
    for pattern, replacement in _AGE_REPLACEMENTS:
        rewritten = pattern.sub(replacement, rewritten)
    for pattern, replacement in _SAFETY_REPLACEMENTS:
        rewritten = pattern.sub(replacement, rewritten)

    if context.context_type == ContextType.SWIMWEAR and "fashion" not in rewritten.lower():
        rewritten = f"{rewritten}, summer fashion portrait"
    elif context.context_type == ContextType.LINGERIE and "editorial" not in rewritten.lower():
        rewritten = f"{rewritten}, editorial fashion portrait"
    elif context.context_type in {ContextType.ROMANTIC, ContextType.EDITORIAL} and "portrait" not in rewritten.lower():
        rewritten = f"{rewritten}, editorial portrait"

    rewritten = re.sub(r"\s+", " ", rewritten).strip(" ,")
    if not rewritten or rewritten == original_prompt.strip():
        return None
    return rewritten
