from __future__ import annotations

import re

_ASCII_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_ZERO_WIDTH_RE = re.compile(r"[\u200b\u200c\u200d\ufeff\u2060]")
_REPEATED_CHARACTER_RE = re.compile(r"(.)\1{2048,}", re.DOTALL)


def sanitize_prompt(text: str) -> str:
    candidate = str(text or "")
    sanitized = _ASCII_CONTROL_RE.sub("", candidate)
    sanitized = sanitized.replace("\r", "")
    sanitized = _ZERO_WIDTH_RE.sub("", sanitized)
    if _REPEATED_CHARACTER_RE.search(sanitized):
        raise ValueError("Prompt contains an excessively repeated character sequence.")
    return sanitized


__all__ = ["sanitize_prompt"]
