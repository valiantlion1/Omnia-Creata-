import json
import logging
import re
import unicodedata
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Tuple

import httpx

from config.env import configured_secret_value, get_settings

logger = logging.getLogger("omnia.studio.moderation")

# Common leet-speak / unicode substitutions
_LEET_MAP = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "9": "g",
    "@": "a",
    "$": "s",
    "!": "i",
    "+": "t",
    "|": "l",
}


def _normalize_for_moderation(text: str) -> str:
    """Aggressively normalize text to defeat common evasion techniques."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = "".join(_LEET_MAP.get(ch, ch) for ch in text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _term_matches(term: str, text: str) -> bool:
    """Match term in text. Short terms use word boundaries to avoid false positives."""
    if len(term) <= 3:
        return bool(re.search(r"\b" + re.escape(term) + r"\b", text))
    return term in text


class ModerationResult(str, Enum):
    SAFE = "safe"
    REVIEW = "review"
    SOFT_BLOCK = "soft_block"
    HARD_BLOCK = "hard_block"


@dataclass(frozen=True, slots=True)
class PromptModerationDecision:
    result: ModerationResult
    reason: Optional[str] = None
    provider_moderation: str = "auto"
    provider_review_required: bool = False

    def __iter__(self):
        yield self.result
        yield self.reason


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

_MINOR_TERMS = {
    "child",
    "children",
    "kid",
    "kids",
    "minor",
    "minors",
    "teen",
    "teens",
    "teenager",
    "teenagers",
    "underage",
    "schoolgirl",
    "schoolgirls",
    "schoolboy",
    "schoolboys",
    "young girl",
    "young girls",
    "young boy",
    "young boys",
    "little girl",
    "little girls",
    "little boy",
    "little boys",
    "toddler",
    "toddlers",
}

_SEXUALIZED_TERMS = {
    "sex",
    "sexual",
    "sexy",
    "erotic",
    "porn",
    "pornographic",
    "hardcore",
    "lingerie",
    "underwear",
    "bikini",
    "cleavage",
    "boudoir",
    "topless",
    "nude",
    "naked",
    "fetish",
    "lace bra",
    "panties",
    "bralette",
}

_REVIEW_TERMS = {
    "bikini",
    "swimsuit",
    "swimwear",
    "beachwear",
    "lingerie",
    "lace lingerie",
    "lace bra",
    "bra",
    "bralette",
    "panties",
    "underwear",
    "cleavage",
    "boudoir",
    "sensual",
    "sultry",
    "sexy",
    "glamour",
    "romantic bedroom",
}

_SOFT_BLOCK_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(?:porn|pornographic|xxx|hardcore)\b"), "explicit_sexual_content"),
    (re.compile(r"\b(?:blowjob|handjob|cumshot|creampie|orgasm|ejaculat\w*)\b"), "explicit_sexual_content"),
    (re.compile(r"\b(?:penetrat\w*|anal sex|oral sex|sex scene)\b"), "explicit_sexual_content"),
    (re.compile(r"\b(?:fully nude|completely nude|genitals visible|spread legs)\b"), "explicit_nudity"),
    (re.compile(r"\b(?:graphic gore|dismember\w*|beheading|guts exposed|bloodbath|snuff)\b"), "graphic_violence"),
)

_HARD_BLOCK_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\b(?:csam|child porn|pedophile|pedophilia|underage sex)\b"), "sexual_minors"),
    (re.compile(r"\b(?:rape|sexual assault|forced sex|forced nudity|non consensual)\b"), "non_consensual_sexual_content"),
    (re.compile(r"\b(?:revenge porn|deepfake porn|celeb sex tape)\b"), "non_consensual_real_person_intimacy"),
    (re.compile(r"\b(?:terrorist execution|execution video)\b"), "graphic_extreme_violence"),
    (re.compile(r"\b(?:suicide tutorial|self harm instructions)\b"), "self_harm_instructions"),
)

_OPENAI_HARD_BLOCK_CATEGORIES = frozenset(
    {
        "sexual/minors",
        "self-harm",
        "self-harm/intent",
        "self-harm/instructions",
        "hate/threatening",
        "harassment/threatening",
        "illicit/violent",
    }
)

_OPENAI_SOFT_BLOCK_CATEGORIES = frozenset({"violence", "violence/graphic", "sexual", "illicit", "hate"})


def _decision(
    result: ModerationResult,
    reason: str | None = None,
    *,
    provider_moderation: str = "auto",
    provider_review_required: bool = False,
) -> PromptModerationDecision:
    return PromptModerationDecision(
        result=result,
        reason=reason,
        provider_moderation=provider_moderation,
        provider_review_required=provider_review_required,
    )


def _contains_any(terms: set[str], text: str) -> Optional[str]:
    for term in terms:
        if _term_matches(term, text):
            return term
    return None


def _first_matching_pattern(
    patterns: tuple[tuple[re.Pattern[str], str], ...],
    text: str,
) -> Optional[str]:
    for pattern, reason in patterns:
        if pattern.search(text):
            return reason
    return None


def _deterministic_prompt_decision(normalized: str) -> PromptModerationDecision:
    minor_term = _contains_any(_MINOR_TERMS, normalized)
    sexualized_term = _contains_any(_SEXUALIZED_TERMS, normalized)
    if minor_term and sexualized_term:
        return _decision(ModerationResult.HARD_BLOCK, "sexual_minors")

    hard_reason = _first_matching_pattern(_HARD_BLOCK_PATTERNS, normalized)
    if hard_reason:
        return _decision(ModerationResult.HARD_BLOCK, hard_reason)

    soft_reason = _first_matching_pattern(_SOFT_BLOCK_PATTERNS, normalized)
    if soft_reason:
        return _decision(ModerationResult.SOFT_BLOCK, soft_reason)

    review_reason = _contains_any(_REVIEW_TERMS, normalized)
    if review_reason:
        return _decision(
            ModerationResult.REVIEW,
            review_reason,
            provider_moderation="low",
            provider_review_required=True,
        )

    return _decision(ModerationResult.SAFE, None)


async def _moderate_with_openai(
    *,
    prompt: str,
    api_key: str,
    deterministic: PromptModerationDecision,
) -> Optional[PromptModerationDecision]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/moderations",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "omni-moderation-latest",
                    "input": prompt,
                },
            )
            response.raise_for_status()
    except Exception as exc:
        logger.warning("OpenAI moderation failed: %s. Falling back to local moderation.", exc)
        return None

    payload = response.json()
    results = payload.get("results")
    if not isinstance(results, list) or not results:
        return None

    first = results[0] if isinstance(results[0], dict) else {}
    categories = first.get("categories")
    if not isinstance(categories, dict):
        categories = {}

    flagged_categories = {
        str(name): bool(value)
        for name, value in categories.items()
        if bool(value)
    }

    if not flagged_categories:
        return deterministic

    if any(flagged_categories.get(category) for category in _OPENAI_HARD_BLOCK_CATEGORIES):
        return _decision(ModerationResult.HARD_BLOCK, next(iter(flagged_categories.keys())))

    if flagged_categories.get("sexual"):
        if deterministic.result == ModerationResult.REVIEW:
            return deterministic
        return _decision(ModerationResult.SOFT_BLOCK, "explicit_sexual_content")

    if any(flagged_categories.get(category) for category in _OPENAI_SOFT_BLOCK_CATEGORIES):
        return _decision(ModerationResult.SOFT_BLOCK, next(iter(flagged_categories.keys())))

    return deterministic


async def _moderate_with_openrouter(
    *,
    prompt: str,
    api_key: str,
    deterministic: PromptModerationDecision,
) -> Optional[PromptModerationDecision]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {
                "model": "google/gemma-2-9b-it:free",
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a content moderation classifier for an AI image product. "
                            "Return JSON only with keys result and reason. "
                            "Allowed result values: SAFE, REVIEW, SOFT_BLOCK, HARD_BLOCK. "
                            "HARD_BLOCK is for sexual content involving minors, non-consensual intimate content, "
                            "graphic extreme violence, self-harm instructions, or illegal exploitative content. "
                            "SOFT_BLOCK is for explicit pornographic sexual acts or graphic gore. "
                            "REVIEW is for non-explicit adult-adjacent fashion or swimwear requests that may need "
                            "provider-level filtering but are not clearly disallowed. "
                            "SAFE is for everything else."
                        ),
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                "response_format": {"type": "json_object"},
            }
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
    except Exception as exc:
        logger.warning("OpenRouter moderation failed: %s. Falling back to local moderation.", exc)
        return None

    content = (
        response.json()
        .get("choices", [{}])[0]
        .get("message", {})
        .get("content", "{}")
    )
    try:
        data = json.loads(content)
    except Exception:
        return None

    result = str(data.get("result", "SAFE")).strip().upper()
    reason = str(data.get("reason") or "").strip() or None
    if result == "HARD_BLOCK":
        return _decision(ModerationResult.HARD_BLOCK, reason or "policy_hard_block")
    if result == "SOFT_BLOCK":
        return _decision(ModerationResult.SOFT_BLOCK, reason or "policy_soft_block")
    if result == "REVIEW":
        return _decision(
            ModerationResult.REVIEW,
            reason or deterministic.reason or "adult_adjacent_review",
            provider_moderation="low",
            provider_review_required=True,
        )
    return deterministic


async def moderate_generation_prompt(prompt: str) -> PromptModerationDecision:
    if not prompt:
        return _decision(ModerationResult.SAFE, None)

    normalized = _normalize_for_moderation(prompt)
    deterministic = _deterministic_prompt_decision(normalized)
    if deterministic.result in {ModerationResult.HARD_BLOCK, ModerationResult.SOFT_BLOCK}:
        return deterministic

    settings = get_settings()

    openai_api_key = configured_secret_value(settings.openai_api_key)
    if openai_api_key:
        openai_decision = await _moderate_with_openai(
            prompt=prompt,
            api_key=openai_api_key,
            deterministic=deterministic,
        )
        if openai_decision is not None:
            return openai_decision

    openrouter_api_key = configured_secret_value(settings.openrouter_api_key)
    if openrouter_api_key:
        openrouter_decision = await _moderate_with_openrouter(
            prompt=prompt,
            api_key=openrouter_api_key,
            deterministic=deterministic,
        )
        if openrouter_decision is not None:
            return openrouter_decision

    return deterministic


def check_display_name_safety(display_name: str) -> Tuple[ModerationResult, Optional[str]]:
    """Run the deterministic moderation layer for profile display names."""
    if not display_name:
        return (ModerationResult.SAFE, None)

    normalized = _normalize_for_moderation(display_name)

    for term in DISPLAY_NAME_HARD_BLOCK_TERMS:
        if _term_matches(term, normalized):
            return (ModerationResult.HARD_BLOCK, term)

    for term in DISPLAY_NAME_SOFT_BLOCK_TERMS:
        if _term_matches(term, normalized):
            return (ModerationResult.SOFT_BLOCK, term)

    return (ModerationResult.SAFE, None)


async def check_prompt_safety(prompt: str) -> PromptModerationDecision:
    """Compatibility wrapper for prompt moderation callers."""
    return await moderate_generation_prompt(prompt)
