from __future__ import annotations

import re

_REPLACEMENT = "***REDACTED***"

_SECRET_PATTERNS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"([?&](?:key|api_key|token|access_token|auth|authorization)=)([^&#\s]+)", re.IGNORECASE),
        rf"\1{_REPLACEMENT}",
    ),
    (
        re.compile(
            r"\b((?:GEMINI|OPENROUTER|OPENAI|FAL|RUNWARE|HUGGINGFACE|SUPABASE|JWT|RESEND|LEMONSQUEEZY)_[A-Z0-9_]*=)([^\s'\"`]+)",
            re.IGNORECASE,
        ),
        rf"\1{_REPLACEMENT}",
    ),
    (
        re.compile(r"\b(Bearer)\s+[A-Za-z0-9._\-]{12,}", re.IGNORECASE),
        rf"\1 {_REPLACEMENT}",
    ),
    (
        re.compile(r"\b(Key)\s+[A-Za-z0-9._\-]{12,}", re.IGNORECASE),
        rf"\1 {_REPLACEMENT}",
    ),
    (
        re.compile(r"\bAIza[0-9A-Za-z\-_]{16,}\b"),
        f"AIza{_REPLACEMENT}",
    ),
    (
        re.compile(r"\bsk-or-v1-[0-9A-Za-z._\-]+\b"),
        f"sk-or-v1-{_REPLACEMENT}",
    ),
)


def redact_sensitive_text(value: object) -> str:
    text = "" if value is None else str(value)
    if not text:
        return text

    redacted = text
    for pattern, replacement in _SECRET_PATTERNS:
        redacted = pattern.sub(replacement, redacted)
    return redacted
