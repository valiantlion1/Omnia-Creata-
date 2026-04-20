from __future__ import annotations

import json
import logging
import os

import httpx

from config.env import configured_secret_value, get_settings

from .models import (
    AgeAmbiguity,
    ContextAnalysis,
    ContextType,
    LlmModerationAnalysis,
    ModerationAction,
    ParsedPrompt,
    SexualIntent,
)

logger = logging.getLogger("omnia.studio.moderation")

_SYSTEM_PROMPT = (
    "You analyze AI image prompts for a moderation decision engine. "
    "Return JSON only with keys: risk_score, recommended_action, reason_code, "
    "age_ambiguity, sexual_intent, context_type, rewrite_safe, rewrite_prompt, explanation, signals. "
    "Allowed recommended_action values: allow, allow_with_log, rewrite, review, hard_block. "
    "Allowed age_ambiguity values: clear_adult, ambiguous, implied_minor, explicit_minor, unknown. "
    "Allowed sexual_intent values: none, mild, suggestive, explicit. "
    "Allowed context_type values: general, fashion, editorial, swimwear, lingerie, romantic, explicit_sexual, graphic_violence, self_harm, illegal, unknown. "
    "The LLM is advisory only, so be conservative and descriptive. "
    "Rewrite only when the prompt looks salvageable by clarifying adulthood or reframing as fashion/editorial without preserving unsafe intent."
)


def should_invoke_llm_analysis(context: ContextAnalysis) -> bool:
    if context.risk_score >= 85:
        return False
    return context.risk_score >= 25 or (
        context.age_ambiguity == AgeAmbiguity.AMBIGUOUS
        and context.sexual_intent in {SexualIntent.MILD, SexualIntent.SUGGESTIVE}
    )


def _coerce_action(value: str | None) -> ModerationAction:
    try:
        return ModerationAction(str(value or "").strip().lower())
    except ValueError:
        return ModerationAction.ALLOW


def _coerce_age(value: str | None) -> AgeAmbiguity:
    try:
        return AgeAmbiguity(str(value or "").strip().lower())
    except ValueError:
        return AgeAmbiguity.UNKNOWN


def _coerce_sexual_intent(value: str | None) -> SexualIntent:
    try:
        return SexualIntent(str(value or "").strip().lower())
    except ValueError:
        return SexualIntent.NONE


def _coerce_context_type(value: str | None) -> ContextType:
    try:
        return ContextType(str(value or "").strip().lower())
    except ValueError:
        return ContextType.UNKNOWN


def _parse_llm_payload(payload: dict, *, model: str) -> LlmModerationAnalysis:
    raw_signals = payload.get("signals")
    signals = tuple(
        str(item).strip()
        for item in raw_signals
        if str(item).strip()
    ) if isinstance(raw_signals, list) else ()
    rewrite_prompt = str(payload.get("rewrite_prompt") or "").strip() or None
    return LlmModerationAnalysis(
        risk_score=max(0, min(100, int(payload.get("risk_score") or 0))),
        recommended_action=_coerce_action(payload.get("recommended_action")),
        reason_code=str(payload.get("reason_code") or "").strip() or None,
        age_ambiguity=_coerce_age(payload.get("age_ambiguity")),
        sexual_intent=_coerce_sexual_intent(payload.get("sexual_intent")),
        context_type=_coerce_context_type(payload.get("context_type")),
        rewrite_safe=bool(payload.get("rewrite_safe")),
        rewrite_prompt=rewrite_prompt,
        explanation=str(payload.get("explanation") or "").strip(),
        signals=signals,
        model=model,
    )


async def _call_openrouter(prompt: str, context: ContextAnalysis) -> LlmModerationAnalysis | None:
    settings = get_settings()
    api_key = configured_secret_value(settings.openrouter_api_key)
    if not api_key:
        return None

    model = settings.openrouter_model
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "prompt": prompt,
                        "heuristic_context": {
                            "risk_score": context.risk_score,
                            "reason_code": context.reason_code,
                            "age_ambiguity": context.age_ambiguity.value,
                            "sexual_intent": context.sexual_intent.value,
                            "context_type": context.context_type.value,
                            "signals": list(context.signals),
                        },
                    },
                    ensure_ascii=True,
                ),
            },
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json=payload,
            )
            response.raise_for_status()
        content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")
        data = json.loads(content)
        return _parse_llm_payload(data, model=model)
    except Exception as exc:
        logger.warning("OpenRouter moderation analysis failed: %s", exc)
        return None


async def _call_openai(prompt: str, context: ContextAnalysis) -> LlmModerationAnalysis | None:
    settings = get_settings()
    api_key = configured_secret_value(settings.openai_api_key)
    if not api_key:
        return None

    model = settings.openai_model
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "prompt": prompt,
                        "heuristic_context": {
                            "risk_score": context.risk_score,
                            "reason_code": context.reason_code,
                            "age_ambiguity": context.age_ambiguity.value,
                            "sexual_intent": context.sexual_intent.value,
                            "context_type": context.context_type.value,
                            "signals": list(context.signals),
                        },
                    },
                    ensure_ascii=True,
                ),
            },
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
        content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "{}")
        data = json.loads(content)
        return _parse_llm_payload(data, model=model)
    except Exception as exc:
        logger.warning("OpenAI moderation analysis failed: %s", exc)
        return None


async def run_llm_analysis(parsed: ParsedPrompt, context: ContextAnalysis) -> LlmModerationAnalysis | None:
    if not should_invoke_llm_analysis(context):
        return None
    if os.getenv("PYTEST_CURRENT_TEST"):
        return None

    result = await _call_openrouter(parsed.original, context)
    if result is not None:
        return result
    return await _call_openai(parsed.original, context)
