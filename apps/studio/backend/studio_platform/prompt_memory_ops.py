from __future__ import annotations

import re
from collections import Counter
from datetime import datetime
from typing import Iterable

from .models import PromptMemoryProfile

_STOP_WORDS = {
    "with",
    "from",
    "that",
    "this",
    "into",
    "over",
    "under",
    "your",
    "their",
    "there",
    "have",
    "will",
    "would",
    "should",
    "could",
    "very",
    "more",
    "less",
    "than",
    "about",
    "after",
    "before",
    "while",
    "like",
    "just",
    "make",
    "create",
    "image",
    "photo",
    "shot",
    "render",
    "style",
    "prompt",
}

_AESTHETIC_KEYWORDS = {
    "cinematic": {"cinematic", "film", "moody", "dramatic"},
    "editorial": {"editorial", "fashion", "magazine", "campaign"},
    "anime": {"anime", "manga", "cel", "illustration"},
    "realism": {"realistic", "realism", "photoreal", "portrait"},
    "luxury": {"luxury", "premium", "polished", "glossy"},
    "surreal": {"surreal", "dream", "abstract", "fantasy"},
    "product": {"product", "packshot", "catalog", "commercial"},
}

_TONE_KEYWORDS = {
    "minimal": {"minimal", "clean", "simple", "quiet"},
    "dramatic": {"dramatic", "intense", "bold", "moody"},
    "playful": {"playful", "cute", "fun", "joyful"},
    "luxury": {"luxury", "premium", "elegant", "refined"},
    "futuristic": {"future", "futuristic", "cyberpunk", "sci-fi"},
}


def derive_display_title(prompt: str, fallback: str = "Untitled image set") -> str:
    cleaned = " ".join((prompt or "").strip().split())
    if not cleaned:
        return fallback
    lead = re.split(r"[.!?,:;\n]", cleaned, maxsplit=1)[0].strip()
    lead = re.sub(r"^(create|generate|make|render|show|design)\s+", "", lead, flags=re.IGNORECASE)
    words = lead.split()
    title = " ".join(words[:6]).strip()
    if not title:
        return fallback
    return title[:72]


def derive_prompt_keywords(prompt: str, *, limit: int = 8) -> list[str]:
    normalized = re.findall(r"[a-z0-9][a-z0-9'_-]*", (prompt or "").lower())
    counts: Counter[str] = Counter(
        token for token in normalized if len(token) >= 4 and token not in _STOP_WORDS and not token.isdigit()
    )
    return [token for token, _ in counts.most_common(limit)]


def derive_prompt_tags(prompt: str, negative_prompt: str = "", *, limit: int = 8) -> list[str]:
    lowered = f"{prompt} {negative_prompt}".lower()
    tags: list[str] = []
    for tag, keywords in _AESTHETIC_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            tags.append(tag)
    for keyword in derive_prompt_keywords(prompt, limit=limit):
        if keyword not in tags:
            tags.append(keyword)
    return tags[:limit]


def derive_prompt_tone(prompt: str) -> str:
    lowered = (prompt or "").lower()
    for tone, keywords in _TONE_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return tone
    return "balanced"


def derive_negative_terms(negative_prompt: str, *, limit: int = 6) -> list[str]:
    return derive_prompt_keywords(negative_prompt, limit=limit)


def merge_preference_list(current: Iterable[str], new_values: Iterable[str], *, limit: int) -> list[str]:
    counts: Counter[str] = Counter(value for value in current if value)
    counts.update(value for value in new_values if value)
    return [value for value, _ in counts.most_common(limit)]


def build_prompt_memory_context(profile: PromptMemoryProfile | None) -> str:
    if profile is None:
        return ""
    chunks: list[str] = []
    if profile.topic_tags:
        chunks.append(f"Recurring subjects: {', '.join(profile.topic_tags[:4])}.")
    if profile.aesthetic_tags:
        chunks.append(f"Preferred look: {', '.join(profile.aesthetic_tags[:4])}.")
    if profile.preferred_aspect_ratios:
        chunks.append(f"Common aspect ratios: {', '.join(profile.preferred_aspect_ratios[:3])}.")
    if profile.negative_prompt_terms:
        chunks.append(f"Usually avoids: {', '.join(profile.negative_prompt_terms[:4])}.")
    if profile.tone and profile.tone != "balanced":
        chunks.append(f"Overall tone leans {profile.tone}.")
    return " ".join(chunks[:4]).strip()


def refresh_governance_hints(profile: PromptMemoryProfile) -> list[str]:
    hints: list[str] = []
    if profile.hourly_burst_peak >= 8:
        hints.append("high_velocity")
    if profile.flagged_generation_count >= 2:
        hints.append("moderation_watch")
    if profile.generation_count >= 25:
        hints.append("power_user")
    if profile.flagged_generation_count >= 4:
        hints.append("manual_review_candidate")
    return hints


def update_prompt_memory_profile(
    profile: PromptMemoryProfile | None,
    *,
    identity_id: str,
    prompt: str,
    negative_prompt: str,
    model_id: str | None,
    aspect_ratio: str | None,
    improved: bool = False,
    flagged: bool = False,
    recent_hourly_generation_count: int = 0,
    now: datetime,
) -> PromptMemoryProfile:
    current = profile.model_copy(deep=True) if profile is not None else PromptMemoryProfile(identity_id=identity_id)
    current.identity_id = identity_id
    current.topic_tags = merge_preference_list(current.topic_tags, derive_prompt_keywords(prompt, limit=6), limit=8)
    current.aesthetic_tags = merge_preference_list(current.aesthetic_tags, derive_prompt_tags(prompt, negative_prompt, limit=6), limit=8)
    current.repeated_phrases = merge_preference_list(current.repeated_phrases, derive_prompt_keywords(prompt, limit=4), limit=6)
    current.negative_prompt_terms = merge_preference_list(
        current.negative_prompt_terms,
        derive_negative_terms(negative_prompt, limit=4),
        limit=6,
    )
    if model_id:
        current.preferred_model_ids = merge_preference_list(current.preferred_model_ids, [model_id], limit=4)
    if aspect_ratio:
        current.preferred_aspect_ratios = merge_preference_list(current.preferred_aspect_ratios, [aspect_ratio], limit=4)
    current.tone = derive_prompt_tone(prompt)
    if prompt.strip():
        current.recent_prompt_examples = merge_preference_list(
            current.recent_prompt_examples,
            [derive_display_title(prompt)],
            limit=5,
        )
    if improved:
        current.improve_count += 1
    else:
        current.generation_count += 1
    if flagged:
        current.flagged_generation_count += 1
    current.hourly_burst_peak = max(current.hourly_burst_peak, recent_hourly_generation_count)
    current.governance_hints = refresh_governance_hints(current)
    current.updated_at = now
    return current
