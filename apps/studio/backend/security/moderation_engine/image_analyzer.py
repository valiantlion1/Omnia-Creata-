"""Post-generation image moderation analyzer.

Mirrors `llm_analyzer.py` for prompt analysis but runs against generated
image bytes (or URLs) using a vision-capable model. The goal is to catch
content that slipped past the prompt-side filter — for example, a
benign-looking prompt that the provider rendered with unsafe details, or
an output that drifts into NSFW/CSAM territory at render time.

Design notes:
- **Optional, fail-open.** If no vision-capable provider is configured,
  this module returns a `skipped` analysis. Generation flow still
  succeeds; the asset just doesn't get the post-check signal.
- **Same vocabulary as the prompt-side path.** Reuses
  `AgeAmbiguity / SexualIntent / ContextType / ModerationAction` so the
  decision engine can compose results without translating between
  taxonomies.
- **No-op in tests.** Like `llm_analyzer`, exits early when
  `PYTEST_CURRENT_TEST` is set so unit tests don't hit the network.
- **Conservative thresholds.** Hard-blocks only on high-confidence,
  legally-critical reasons (CSAM-shape, non-consensual sexual content,
  graphic violence) so we don't flag every swimwear/lingerie output.
"""

from __future__ import annotations

import base64
import json
import logging
import os
from dataclasses import replace
from typing import Optional

import httpx

from config.env import configured_secret_value, get_settings

from .models import (
    AgeAmbiguity,
    ContextType,
    ImageModerationAnalysis,
    ImageModerationDecision,
    ModerationAction,
    ModerationResult,
    PromptModerationDecision,
    PromptRiskLevel,
    SexualIntent,
)

logger = logging.getLogger("omnia.studio.moderation.image")


_MAX_INLINE_IMAGE_BYTES = 4 * 1024 * 1024  # 4 MiB — keeps vision payload bounded
_VISION_TIMEOUT_SECONDS = 12.0


_SYSTEM_PROMPT = (
    "You are a vision moderator for a creative AI image platform. You receive a "
    "single generated image plus the user's original prompt. Return JSON only "
    "with keys: risk_score, recommended_action, reason_code, age_ambiguity, "
    "sexual_intent, context_type, explanation, signals. "
    "Allowed recommended_action values: allow, allow_with_log, review, hard_block. "
    "Allowed age_ambiguity values: clear_adult, ambiguous, implied_minor, "
    "explicit_minor, unknown. "
    "Allowed sexual_intent values: none, mild, suggestive, explicit. "
    "Allowed context_type values: general, fashion, editorial, swimwear, "
    "lingerie, romantic, explicit_sexual, graphic_violence, self_harm, illegal, "
    "unknown. "
    "Be conservative on borderline content but do not over-flag — fashion, "
    "editorial, swimwear, and lingerie outputs that depict clear adults are "
    "acceptable for review/log actions, not hard_block. Hard-block only when the "
    "image plausibly depicts: minors in any sexual context, non-consensual "
    "sexual content, graphic gore or self-harm methods, or other clearly "
    "illegal material."
)


def _coerce_action(value: object) -> ModerationAction:
    try:
        return ModerationAction(str(value or "").strip().lower())
    except ValueError:
        return ModerationAction.ALLOW


def _coerce_age(value: object) -> AgeAmbiguity:
    try:
        return AgeAmbiguity(str(value or "").strip().lower())
    except ValueError:
        return AgeAmbiguity.UNKNOWN


def _coerce_sexual_intent(value: object) -> SexualIntent:
    try:
        return SexualIntent(str(value or "").strip().lower())
    except ValueError:
        return SexualIntent.NONE


def _coerce_context_type(value: object) -> ContextType:
    try:
        return ContextType(str(value or "").strip().lower())
    except ValueError:
        return ContextType.UNKNOWN


def _parse_vision_payload(payload: dict, *, model: str) -> ImageModerationAnalysis:
    raw_signals = payload.get("signals")
    signals = (
        tuple(str(item).strip() for item in raw_signals if str(item).strip())
        if isinstance(raw_signals, list)
        else ()
    )
    return ImageModerationAnalysis(
        risk_score=max(0, min(100, int(payload.get("risk_score") or 0))),
        recommended_action=_coerce_action(payload.get("recommended_action")),
        reason_code=str(payload.get("reason_code") or "").strip() or None,
        age_ambiguity=_coerce_age(payload.get("age_ambiguity")),
        sexual_intent=_coerce_sexual_intent(payload.get("sexual_intent")),
        context_type=_coerce_context_type(payload.get("context_type")),
        explanation=str(payload.get("explanation") or "").strip(),
        signals=signals,
        model=model,
    )


def _encode_image_data_url(image_bytes: bytes, *, mime_type: str | None) -> str | None:
    if not image_bytes or len(image_bytes) > _MAX_INLINE_IMAGE_BYTES:
        return None
    media_type = (mime_type or "").strip().lower() or "image/png"
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return f"data:{media_type};base64,{encoded}"


def _build_user_message(
    *,
    image_reference: str,
    prompt: str,
    prompt_decision: PromptModerationDecision | None,
) -> dict:
    decision_summary: dict[str, object] = {}
    if prompt_decision is not None:
        decision_summary = {
            "prompt_action": prompt_decision.action.value,
            "prompt_reason": prompt_decision.reason,
            "prompt_age_ambiguity": prompt_decision.age_ambiguity.value,
            "prompt_sexual_intent": prompt_decision.sexual_intent.value,
            "prompt_context_type": prompt_decision.context_type.value,
            "prompt_signals": list(prompt_decision.signals),
        }
    text_payload = json.dumps(
        {"prompt": prompt, "prompt_decision": decision_summary},
        ensure_ascii=True,
    )
    return {
        "role": "user",
        "content": [
            {"type": "text", "text": text_payload},
            {"type": "image_url", "image_url": {"url": image_reference}},
        ],
    }


async def _call_openrouter_vision(
    image_reference: str,
    *,
    prompt: str,
    prompt_decision: PromptModerationDecision | None,
) -> ImageModerationAnalysis | None:
    settings = get_settings()
    api_key = configured_secret_value(settings.openrouter_api_key)
    if not api_key:
        return None

    model = settings.openrouter_model
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            _build_user_message(
                image_reference=image_reference,
                prompt=prompt,
                prompt_decision=prompt_decision,
            ),
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    try:
        async with httpx.AsyncClient(timeout=_VISION_TIMEOUT_SECONDS) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
        content = (
            response.json()
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "{}")
        )
        data = json.loads(content)
        return _parse_vision_payload(data, model=model)
    except (httpx.HTTPError, json.JSONDecodeError, ValueError) as exc:
        logger.warning("OpenRouter image moderation analysis failed: %s", exc)
        return None


async def _call_openai_vision(
    image_reference: str,
    *,
    prompt: str,
    prompt_decision: PromptModerationDecision | None,
) -> ImageModerationAnalysis | None:
    settings = get_settings()
    api_key = configured_secret_value(settings.openai_api_key)
    if not api_key:
        return None

    model = settings.openai_model
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            _build_user_message(
                image_reference=image_reference,
                prompt=prompt,
                prompt_decision=prompt_decision,
            ),
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    try:
        async with httpx.AsyncClient(timeout=_VISION_TIMEOUT_SECONDS) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
        content = (
            response.json()
            .get("choices", [{}])[0]
            .get("message", {})
            .get("content", "{}")
        )
        data = json.loads(content)
        return _parse_vision_payload(data, model=model)
    except (httpx.HTTPError, json.JSONDecodeError, ValueError) as exc:
        logger.warning("OpenAI image moderation analysis failed: %s", exc)
        return None


def _has_any_vision_provider() -> bool:
    settings = get_settings()
    return bool(
        configured_secret_value(settings.openrouter_api_key)
        or configured_secret_value(settings.openai_api_key)
    )


async def analyze_generated_image(
    *,
    image_bytes: bytes | None = None,
    image_url: str | None = None,
    image_mime_type: str | None = None,
    prompt: str,
    prompt_decision: PromptModerationDecision | None = None,
) -> ImageModerationAnalysis:
    """Analyze a generated image and return a structured moderation analysis.

    The caller can pass either inline `image_bytes` (will be base64-encoded
    inline up to 4 MiB) or a `image_url` the vision provider can fetch.
    Returns an `ImageModerationAnalysis` — when no vision provider is
    configured or the network call fails, the result has `skipped=True`
    so callers can treat the post-check as a soft signal.
    """

    if os.getenv("PYTEST_CURRENT_TEST"):
        return ImageModerationAnalysis(
            skipped=True, skipped_reason="pytest_environment"
        )

    if not _has_any_vision_provider():
        return ImageModerationAnalysis(
            skipped=True, skipped_reason="no_vision_provider_configured"
        )

    image_reference: Optional[str] = None
    if image_bytes:
        image_reference = _encode_image_data_url(image_bytes, mime_type=image_mime_type)
    elif image_url:
        image_reference = image_url.strip() or None

    if not image_reference:
        return ImageModerationAnalysis(
            skipped=True, skipped_reason="no_image_payload"
        )

    safe_prompt = (prompt or "").strip()
    result = await _call_openrouter_vision(
        image_reference,
        prompt=safe_prompt,
        prompt_decision=prompt_decision,
    )
    if result is not None:
        return result
    result = await _call_openai_vision(
        image_reference,
        prompt=safe_prompt,
        prompt_decision=prompt_decision,
    )
    if result is not None:
        return result
    return ImageModerationAnalysis(
        skipped=True, skipped_reason="vision_provider_unavailable"
    )


def _risk_level_for_score(score: int) -> PromptRiskLevel:
    if score >= 85:
        return PromptRiskLevel.CRITICAL
    if score >= 60:
        return PromptRiskLevel.HIGH
    if score >= 30:
        return PromptRiskLevel.MEDIUM
    return PromptRiskLevel.LOW


def decide_image_action(
    analysis: ImageModerationAnalysis,
    *,
    prompt_decision: PromptModerationDecision | None = None,
) -> ImageModerationDecision:
    """Map a vision analysis into a final image moderation decision.

    Layered ladder (matches the prompt-side action vocabulary the user
    asked for: hard / mid / soft / AI-assisted):
        - **hard_block** — minors in sexual context, non-consensual sexual
          content, graphic violence, or self-harm. Asset is blocked from
          library exposure.
        - **soft_block / review** — explicit sexual content, illegal
          context, or LLM-recommended hard_block but reason isn't in the
          critical set. Asset is hidden behind protected preview.
        - **review (mid)** — ambiguous adulthood + suggestive sexual
          intent, or swimwear/lingerie context with elevated risk score.
          Asset is allowed to render but flagged for human/operator review.
        - **allow_with_log (soft)** — moderate risk score (>=15) without a
          hard signal. Asset is visible; signal is logged.
        - **allow** — clean.
    """

    if analysis.skipped:
        return ImageModerationDecision(
            analyzer_used=False,
            analyzer_skipped=True,
            analyzer_skipped_reason=analysis.skipped_reason,
            analyzer_model=analysis.model,
        )

    risk_score = max(0, min(100, int(analysis.risk_score)))
    risk_level = _risk_level_for_score(risk_score)
    base = ImageModerationDecision(
        risk_score=risk_score,
        risk_level=risk_level,
        reason=analysis.reason_code,
        age_ambiguity=analysis.age_ambiguity,
        sexual_intent=analysis.sexual_intent,
        context_type=analysis.context_type,
        signals=analysis.signals,
        explanation=analysis.explanation,
        analyzer_used=True,
        analyzer_model=analysis.model,
    )

    critical_reasons = {
        "sexual_minors",
        "non_consensual_sexual_content",
        "graphic_extreme_violence",
        "self_harm_instructions",
    }

    minors_in_sexual_context = analysis.age_ambiguity in {
        AgeAmbiguity.EXPLICIT_MINOR,
        AgeAmbiguity.IMPLIED_MINOR,
    } and analysis.sexual_intent != SexualIntent.NONE

    if minors_in_sexual_context or (analysis.reason_code in critical_reasons):
        return replace(
            base,
            result=ModerationResult.HARD_BLOCK,
            action=ModerationAction.HARD_BLOCK,
            risk_level=PromptRiskLevel.CRITICAL,
            risk_score=max(risk_score, 95),
            library_state_override="blocked",
            reason=analysis.reason_code or "sexual_minors",
        )

    if analysis.context_type in {
        ContextType.EXPLICIT_SEXUAL,
        ContextType.GRAPHIC_VIOLENCE,
        ContextType.SELF_HARM,
        ContextType.ILLEGAL,
    } or analysis.recommended_action == ModerationAction.HARD_BLOCK:
        return replace(
            base,
            result=ModerationResult.SOFT_BLOCK,
            action=ModerationAction.HARD_BLOCK,
            risk_level=PromptRiskLevel.HIGH if risk_level != PromptRiskLevel.CRITICAL else risk_level,
            risk_score=max(risk_score, 75),
            library_state_override="blocked",
            reason=analysis.reason_code or analysis.context_type.value,
        )

    needs_review = (
        analysis.recommended_action == ModerationAction.REVIEW
        or (
            analysis.age_ambiguity == AgeAmbiguity.AMBIGUOUS
            and analysis.sexual_intent in {SexualIntent.MILD, SexualIntent.SUGGESTIVE}
        )
        or (
            analysis.context_type in {ContextType.SWIMWEAR, ContextType.LINGERIE}
            and risk_score >= 35
        )
    )
    if needs_review:
        return replace(
            base,
            result=ModerationResult.REVIEW,
            action=ModerationAction.REVIEW,
            risk_level=PromptRiskLevel.MEDIUM if risk_level == PromptRiskLevel.LOW else risk_level,
            risk_score=max(risk_score, 30),
            library_state_override="needs_review",
            reason=analysis.reason_code or "image_review",
        )

    if (
        analysis.recommended_action == ModerationAction.ALLOW_WITH_LOG
        or risk_score >= 15
    ):
        return replace(
            base,
            result=ModerationResult.SAFE,
            action=ModerationAction.ALLOW_WITH_LOG,
            risk_level=risk_level,
            risk_score=risk_score,
            reason=analysis.reason_code,
        )

    return base


__all__ = [
    "analyze_generated_image",
    "decide_image_action",
]
