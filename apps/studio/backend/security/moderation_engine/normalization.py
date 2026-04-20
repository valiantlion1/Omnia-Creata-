from __future__ import annotations

import re
import unicodedata

from .models import ParsedPrompt

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


def normalize_for_moderation(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = "".join(_LEET_MAP.get(ch, ch) for ch in text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_prompt(text: str) -> ParsedPrompt:
    normalized = normalize_for_moderation(text)
    tokens = tuple(token for token in normalized.split(" ") if token)
    return ParsedPrompt(
        original=text,
        normalized=normalized,
        tokens=tokens,
        word_count=len(tokens),
    )


def term_matches(term: str, text: str) -> bool:
    if len(term) <= 3:
        return bool(re.search(r"\b" + re.escape(term) + r"\b", text))
    return term in text


def contains_any(text: str, terms: set[str]) -> str | None:
    for term in terms:
        if term_matches(term, text):
            return term
    return None
