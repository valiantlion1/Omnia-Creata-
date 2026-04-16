import json
import logging
import re
import unicodedata
from enum import Enum
from typing import Optional, Tuple
import httpx

from config.env import configured_secret_value, get_settings

logger = logging.getLogger("omnia.studio.moderation")

# Common leet-speak / unicode substitutions
_LEET_MAP = {
    '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's',
    '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's',
    '!': 'i', '+': 't', '|': 'l',
}


def _normalize_for_moderation(text: str) -> str:
    """Aggressively normalize text to defeat common evasion techniques."""
    # 1. NFKD unicode normalization (decomposes characters)
    text = unicodedata.normalize("NFKD", text)
    # 2. Strip all non-ASCII characters (removes zero-width, Cyrillic lookalikes, etc.)
    text = text.encode("ascii", "ignore").decode("ascii")
    # 3. Lowercase
    text = text.lower()
    # 4. Apply leet-speak substitutions
    text = "".join(_LEET_MAP.get(ch, ch) for ch in text)
    # 5. Remove all non-alphanumeric except spaces
    text = re.sub(r"[^a-z0-9\s]", "", text)
    # 6. Collapse multiple spaces
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _term_matches(term: str, text: str) -> bool:
    """Match term in text. Short terms use word boundaries to avoid false positives."""
    if len(term) <= 3:
        return bool(re.search(r'\b' + re.escape(term) + r'\b', text))
    return term in text


class ModerationResult(str, Enum):
    SAFE = "safe"
    SOFT_BLOCK = "soft_block"
    HARD_BLOCK = "hard_block"


# Terms are stored in their normalized form (no hyphens/punctuation) so they
# match correctly against the normalized input text.
HARD_BLOCK_TERMS = {
    "child porn", "cp", "rape", "pedophile", "murder", "gore", "terrorist",
    "suicide", "selfharm", "self harm", "beheading", "dismemberment", "csam",
}

SOFT_BLOCK_TERMS = {
    "naked", "nude", "blood", "sexy", "erotic", "nsfw",
    "biden", "trump", "putin", "politician",
}

async def check_prompt_safety(prompt: str) -> Tuple[ModerationResult, Optional[str]]:
    """
    Evaluates the generation prompt against pre-defined safety boundaries.
    Tries to use an OpenRouter free model to smartly classify the prompt.
    Falls back to regex if OpenRouter fails or is misconfigured.
    Returns the ModerationResult and the term/reason if blocked.
    """
    if not prompt:
        return (ModerationResult.SAFE, None)

    normalized = _normalize_for_moderation(prompt)

    settings = get_settings()

    # Check strict hard boundaries immediately (regex layer 1)
    for term in HARD_BLOCK_TERMS:
        if _term_matches(term, normalized):
            return (ModerationResult.HARD_BLOCK, term)
            
    # Try OpenRouter LLM approach if available
    api_key = configured_secret_value(settings.openrouter_api_key)
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                payload = {
                    "model": "google/gemma-2-9b-it:free",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a content moderation AI. Your ONLY output should be a JSON object with two fields: 'result' (one of: 'SAFE', 'SOFT_BLOCK', 'HARD_BLOCK') and 'reason' (a short explanation if not SAFE). Classify the following prompt. HARD_BLOCK is for extreme violence, non-consensual exploitation, or strict illegality. SOFT_BLOCK is for explicit nudity, highly political figures, or mild gore. SAFE is for everything else."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "response_format": {"type": "json_object"}
                }
                
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json=payload
                )
                
                if response.status_code == 200:
                    content_str = response.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")
                    data = json.loads(content_str)
                    res = data.get("result", "SAFE")
                    reason = data.get("reason")
                    
                    if res == "HARD_BLOCK":
                        return (ModerationResult.HARD_BLOCK, reason or "AI filtered (Hard)")
                    if res == "SOFT_BLOCK":
                        return (ModerationResult.SOFT_BLOCK, reason or "AI filtered (Soft)")
                    return (ModerationResult.SAFE, None)
                else:
                    logger.warning(f"OpenRouter moderation returned {response.status_code}. Falling back to regex.")
        except Exception as exc:
            logger.warning(f"OpenRouter LLM moderation failed: {exc}. Falling back to regex.")
            
    # Regex Layer 2: Soft block fallback
    for term in SOFT_BLOCK_TERMS:
        if _term_matches(term, normalized):
            return (ModerationResult.SOFT_BLOCK, term)
            
    return (ModerationResult.SAFE, None)
