from __future__ import annotations

import base64
import binascii
import logging
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Sequence

import httpx

from config.env import Environment, configured_secret_value, get_settings, has_configured_secret

from .ai_provider_catalog import chat_model_cost_rates
from .models import ChatAttachment, ChatMessage, ChatRole
from .prompt_engineering import analyze_generation_prompt_profile, improve_prompt_candidate
from .services.launch_readiness import load_provider_smoke_report
from .versioning import load_version_info

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class LLMResult:
    text: str
    provider: str
    model: str
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    estimated_cost_usd: float | None = None
    used_fallback: bool = False
    requested_quality_tier: str | None = None
    selected_quality_tier: str | None = None
    degraded: bool = False
    routing_strategy: str | None = None
    routing_reason: str | None = None


@dataclass(slots=True)
class ChatProviderCandidate:
    provider: str
    model: str
    quality_tier: str
    used_fallback: bool = False


@dataclass(slots=True)
class ChatExecutionPlan:
    requested_quality_tier: str
    routing_strategy: str
    routing_reason: str
    provider_plan: list[ChatProviderCandidate]


@dataclass(slots=True)
class ChatProviderHealthState:
    status: str = "healthy"
    consecutive_failures: int = 0
    cooldown_until: datetime | None = None
    last_failure_at: datetime | None = None
    last_failure_reason: str | None = None
    last_status_code: int | None = None
    last_error_class: str | None = None
    last_success_at: datetime | None = None


class StudioLLMGateway:
    def __init__(self) -> None:
        self._timeout = httpx.Timeout(18.0, connect=5.0)
        self._provider_health: dict[str, ChatProviderHealthState] = {}
        self._provider_smoke_fingerprint: tuple[str, str] | None = None

    def routing_summary(self) -> dict[str, Any]:
        self._seed_provider_health_from_smoke_report()
        settings = get_settings()
        return {
            "plan_defaults": {
                "free": "standard",
                "pro": "premium",
            },
            "primary_provider": settings.chat_primary_provider,
            "fallback_provider": settings.chat_fallback_provider,
            "multimodal_policy": "configured_provider_order",
            "models": {
                "gemini_standard": settings.gemini_model,
                "gemini_premium": settings.gemini_premium_model,
                "openrouter_standard": settings.openrouter_model,
                "openrouter_premium": settings.openrouter_premium_model,
                "openai_standard": settings.openai_model,
                "openai_premium": settings.openai_premium_model,
            },
            "cooldown_policy": {
                "auth_error_seconds": 600,
                "rate_limit_seconds": 180,
                "transient_error_seconds": 60,
                "empty_response_seconds": 45,
            },
            "providers": {
                "gemini": self._provider_runtime_summary("gemini"),
                "openrouter": self._provider_runtime_summary("openrouter"),
                "openai": self._provider_runtime_summary("openai"),
            },
            "heuristic_fallback": {
                "provider": "heuristic",
                "quality_tier": "degraded",
                "status": "always_available",
            },
        }

    async def generate_chat_reply(
        self,
        *,
        requested_model: str | None,
        mode: str,
        history: Sequence[ChatMessage],
        content: str,
        attachments: Sequence[ChatAttachment],
        premium_chat: bool = False,
        intent_kind: str = "creative_guidance",
        prompt_profile: str = "generic",
        detail_score: int = 0,
        premium_intent: bool = False,
        recommended_workflow: str = "text_to_image",
        continuity_summary: str | None = None,
    ) -> LLMResult | None:
        execution_plan = self.resolve_chat_execution_plan(
            requested_model=requested_model,
            mode=mode,
            attachments=attachments,
            premium_chat=premium_chat,
            prompt_profile=prompt_profile,
            detail_score=detail_score,
            premium_intent=premium_intent,
            recommended_workflow=recommended_workflow,
        )
        current_message = self._render_user_message(content, attachments)
        system_prompt = self._build_chat_system_prompt(
            mode=mode,
            intent_kind=intent_kind,
            prompt_profile=prompt_profile,
            recommended_workflow=recommended_workflow,
            premium_chat=premium_chat,
            continuity_summary=continuity_summary,
        )
        temperature = self._resolve_chat_temperature(
            intent_kind=intent_kind,
            prompt_profile=prompt_profile,
        )
        max_output_tokens = 1400 if execution_plan.requested_quality_tier == "premium" else 1100

        for candidate in execution_plan.provider_plan:
            if candidate.provider == "heuristic":
                continue
            skip_reason = self._provider_skip_reason(candidate.provider)
            if skip_reason is not None:
                self._log_chat_provider_skip(
                    provider=candidate.provider,
                    model=candidate.model,
                    requested_quality_tier=execution_plan.requested_quality_tier,
                    selected_quality_tier=candidate.quality_tier,
                    routing_strategy=execution_plan.routing_strategy,
                    routing_reason=execution_plan.routing_reason,
                    used_fallback=candidate.used_fallback,
                    skip_reason=skip_reason,
                )
                continue
            try:
                result = await self._call_provider(
                    provider=candidate.provider,
                    model=candidate.model,
                    system_prompt=system_prompt,
                    history=history,
                    current_message=current_message,
                    attachments=attachments,
                    temperature=temperature,
                    max_output_tokens=max_output_tokens,
                )
            except Exception as exc:
                health_state = self._record_provider_failure(
                    provider=candidate.provider,
                    error=exc,
                )
                self._log_chat_provider_failure(
                    provider=candidate.provider,
                    model=candidate.model,
                    requested_quality_tier=execution_plan.requested_quality_tier,
                    selected_quality_tier=candidate.quality_tier,
                    routing_strategy=execution_plan.routing_strategy,
                    routing_reason=execution_plan.routing_reason,
                    used_fallback=candidate.used_fallback,
                    error=exc,
                    health_state=health_state,
                )
                continue

            if not result or not result.text.strip():
                health_state = self._record_provider_failure(
                    provider=candidate.provider,
                    failure_reason="empty_response",
                )
                self._log_chat_provider_failure(
                    provider=candidate.provider,
                    model=candidate.model,
                    requested_quality_tier=execution_plan.requested_quality_tier,
                    selected_quality_tier=candidate.quality_tier,
                    routing_strategy=execution_plan.routing_strategy,
                    routing_reason=execution_plan.routing_reason,
                    used_fallback=candidate.used_fallback,
                    failure_reason="empty_response",
                    health_state=health_state,
                )
                continue
            if self._looks_truncated(result.text, result.completion_tokens):
                try:
                    retry_result = await self._call_provider(
                        provider=candidate.provider,
                        model=candidate.model,
                        system_prompt=(
                            f"{system_prompt} Keep the reply short but complete. "
                            "Use 2 to 4 full sentences or a compact bullet list, and never stop mid-word or mid-sentence."
                        ),
                        history=history,
                        current_message=current_message,
                        attachments=attachments,
                        temperature=temperature,
                        max_output_tokens=max_output_tokens,
                    )
                except Exception as exc:
                    health_state = self._record_provider_failure(
                        provider=candidate.provider,
                        error=exc,
                        failure_reason="retry_failed",
                    )
                    self._log_chat_provider_failure(
                        provider=candidate.provider,
                        model=candidate.model,
                        requested_quality_tier=execution_plan.requested_quality_tier,
                        selected_quality_tier=candidate.quality_tier,
                        routing_strategy=execution_plan.routing_strategy,
                        routing_reason=execution_plan.routing_reason,
                        used_fallback=candidate.used_fallback,
                        error=exc,
                        failure_reason="retry_failed",
                        health_state=health_state,
                    )
                    retry_result = None
                if retry_result and retry_result.text.strip():
                    result = retry_result
            self._record_provider_success(candidate.provider)
            result.used_fallback = candidate.used_fallback
            result.requested_quality_tier = execution_plan.requested_quality_tier
            result.selected_quality_tier = candidate.quality_tier
            result.degraded = self._is_quality_degraded(
                execution_plan.requested_quality_tier,
                candidate.quality_tier,
            )
            result.routing_strategy = execution_plan.routing_strategy
            result.routing_reason = execution_plan.routing_reason
            return result

        return None

    async def improve_prompt(self, prompt: str, *, memory_context: str = "") -> LLMResult | None:
        cleaned = " ".join(prompt.strip().split())
        if not cleaned:
            return None
        settings = get_settings()

        profile_analysis = analyze_generation_prompt_profile(prompt=cleaned)
        execution_plan = self.resolve_chat_execution_plan(
            requested_model="studio-assist",
            mode="think",
            attachments=(),
            premium_chat=True,
            prompt_profile=profile_analysis.profile,
            detail_score=profile_analysis.detail_score,
            premium_intent=True,
            recommended_workflow=profile_analysis.workflow,
        )

        memory_guidance = " ".join(memory_context.strip().split())
        request_text = (
            "Rewrite this into one production-ready image generation prompt. "
            "Preserve the user's intent, but sharpen subject clarity, composition, camera feel, lighting, "
            "environment, material detail, and finish quality. "
            "Infer only helpful visual details, avoid generic filler, and keep the result under 95 words. "
            "Return only the final prompt.\n\n"
            + (f"Creator preference context: {memory_guidance}\n\n" if memory_guidance else "")
            + f"Prompt: {cleaned}"
        )
        system_prompt = (
            "You are OmniaCreata Studio's senior prompt director for premium image generation. "
            "Rewrite weak prompts into commercially strong visual briefs. "
            "Prioritize clear subject identity, intentional framing, controlled lighting, believable materials, "
            "and a premium finish. Do not add artist names, no bullets, no labels, no explanation."
        )

        for candidate in execution_plan.provider_plan:
            if candidate.provider == "heuristic":
                continue
            skip_reason = self._provider_skip_reason(candidate.provider)
            if skip_reason is not None:
                self._log_chat_provider_skip(
                    provider=candidate.provider,
                    model=candidate.model,
                    requested_quality_tier=execution_plan.requested_quality_tier,
                    selected_quality_tier=candidate.quality_tier,
                    routing_strategy=execution_plan.routing_strategy,
                    routing_reason=execution_plan.routing_reason,
                    used_fallback=candidate.used_fallback,
                    skip_reason=skip_reason,
                )
                continue
            try:
                candidate_model = candidate.model
                candidate_quality_tier = candidate.quality_tier
                if (
                    candidate.provider == "openai"
                    and candidate.used_fallback
                    and candidate_quality_tier == "premium"
                ):
                    candidate_model = settings.openai_model
                    candidate_quality_tier = self._infer_quality_tier_from_model(candidate_model)
                if candidate.provider == "gemini":
                    result = await self._chat_with_gemini(
                        model=candidate_model,
                        system_prompt=system_prompt,
                        history=(),
                        current_message=request_text,
                        attachments=(),
                        temperature=0.45,
                        max_output_tokens=700,
                    )
                elif candidate.provider == "openrouter":
                    result = await self._chat_with_openrouter(
                        model=candidate_model,
                        system_prompt=system_prompt,
                        history=(),
                        current_message=request_text,
                        attachments=(),
                        temperature=0.45,
                        max_output_tokens=700,
                    )
                elif candidate.provider == "openai":
                    result = await self._chat_with_openai(
                        model=candidate_model,
                        system_prompt=system_prompt,
                        history=(),
                        current_message=request_text,
                        attachments=(),
                        temperature=0.45,
                        max_output_tokens=700,
                    )
                else:
                    continue
            except Exception as exc:
                health_state = self._record_provider_failure(
                    provider=candidate.provider,
                    error=exc,
                )
                self._log_chat_provider_failure(
                    provider=candidate.provider,
                    model=candidate.model,
                    requested_quality_tier=execution_plan.requested_quality_tier,
                    selected_quality_tier=candidate.quality_tier,
                    routing_strategy=execution_plan.routing_strategy,
                    routing_reason=execution_plan.routing_reason,
                    used_fallback=candidate.used_fallback,
                    error=exc,
                    health_state=health_state,
                )
                continue

            if not result or not result.text.strip():
                health_state = self._record_provider_failure(
                    provider=candidate.provider,
                    failure_reason="empty_response",
                )
                self._log_chat_provider_failure(
                    provider=candidate.provider,
                    model=candidate.model,
                    requested_quality_tier=execution_plan.requested_quality_tier,
                    selected_quality_tier=candidate.quality_tier,
                    routing_strategy=execution_plan.routing_strategy,
                    routing_reason=execution_plan.routing_reason,
                    used_fallback=candidate.used_fallback,
                    failure_reason="empty_response",
                    health_state=health_state,
                )
                continue
            self._record_provider_success(candidate.provider)
            result.text = improve_prompt_candidate(self._normalize_prompt(result.text))
            result.used_fallback = candidate.used_fallback
            result.requested_quality_tier = execution_plan.requested_quality_tier
            result.selected_quality_tier = candidate_quality_tier
            result.degraded = self._is_quality_degraded(
                execution_plan.requested_quality_tier,
                candidate_quality_tier,
            )
            result.routing_strategy = execution_plan.routing_strategy
            result.routing_reason = execution_plan.routing_reason
            return result

        return None

    def resolve_chat_execution_plan(
        self,
        *,
        requested_model: str | None,
        mode: str,
        attachments: Sequence[ChatAttachment],
        premium_chat: bool,
        prompt_profile: str,
        detail_score: int,
        premium_intent: bool,
        recommended_workflow: str,
    ) -> ChatExecutionPlan:
        settings = get_settings()
        normalized = (requested_model or "").strip().lower()

        explicit_openai_model = self._resolve_explicit_openai_model(normalized, requested_model)
        if explicit_openai_model is not None:
            quality_tier = self._infer_quality_tier_from_model(explicit_openai_model)
            return ChatExecutionPlan(
                requested_quality_tier=quality_tier,
                routing_strategy="explicit-model",
                routing_reason="explicit_model_request",
                provider_plan=[
                    ChatProviderCandidate(
                        provider="openai",
                        model=explicit_openai_model,
                        quality_tier=quality_tier,
                        used_fallback=False,
                    )
                ],
            )
        if normalized.startswith("gemini-"):
            quality_tier = self._infer_quality_tier_from_model(requested_model or settings.gemini_model)
            return ChatExecutionPlan(
                requested_quality_tier=quality_tier,
                routing_strategy="explicit-model",
                routing_reason="explicit_model_request",
                provider_plan=[
                    ChatProviderCandidate(
                        provider="gemini",
                        model=requested_model or settings.gemini_model,
                        quality_tier=quality_tier,
                        used_fallback=False,
                    )
                ],
            )
        if normalized.startswith("openrouter:"):
            model = (requested_model or "").split(":", 1)[1] or settings.openrouter_model
            quality_tier = self._infer_quality_tier_from_model(model)
            return ChatExecutionPlan(
                requested_quality_tier=quality_tier,
                routing_strategy="explicit-model",
                routing_reason="explicit_model_request",
                provider_plan=[
                    ChatProviderCandidate(
                        provider="openrouter",
                        model=model,
                        quality_tier=quality_tier,
                        used_fallback=False,
                    )
                ],
            )
        if "/" in normalized and normalized not in {"think", "vision", "edit", "studio-assist"}:
            model = requested_model or settings.openrouter_model
            quality_tier = self._infer_quality_tier_from_model(model)
            return ChatExecutionPlan(
                requested_quality_tier=quality_tier,
                routing_strategy="explicit-model",
                routing_reason="explicit_model_request",
                provider_plan=[
                    ChatProviderCandidate(
                        provider="openrouter",
                        model=model,
                        quality_tier=quality_tier,
                        used_fallback=False,
                    )
                ],
            )

        requested_quality_tier = "premium" if premium_chat else "standard"
        multimodal_request = bool(attachments) or mode in {"vision", "edit"} or recommended_workflow in {
            "image_to_image",
            "edit",
        }
        routing_strategy = "premium-studio" if premium_chat else "standard-studio"
        routing_reason = self._determine_routing_reason(
            premium_chat=premium_chat,
            multimodal_request=multimodal_request,
            prompt_profile=prompt_profile,
            detail_score=detail_score,
            premium_intent=premium_intent,
        )
        raw_candidates: list[tuple[str, str, str]] = []
        seen: set[tuple[str, str]] = set()
        ordered_providers = self._ordered_chat_providers(multimodal_request=multimodal_request)

        if requested_quality_tier == "premium":
            for provider in ordered_providers:
                self._append_provider_candidate(
                    candidates=raw_candidates,
                    seen=seen,
                    provider=provider,
                    quality_tier="premium",
                )
            for provider in ordered_providers:
                self._append_provider_candidate(
                    candidates=raw_candidates,
                    seen=seen,
                    provider=provider,
                    quality_tier="standard",
                )
        else:
            for provider in ordered_providers:
                self._append_provider_candidate(
                    candidates=raw_candidates,
                    seen=seen,
                    provider=provider,
                    quality_tier="standard",
                )

        provider_plan = [
            ChatProviderCandidate(
                provider=provider,
                model=model,
                quality_tier=quality_tier,
                used_fallback=index > 0,
            )
            for index, (provider, model, quality_tier) in enumerate(raw_candidates)
        ]
        provider_plan.append(
            ChatProviderCandidate(
                provider="heuristic",
                model="heuristic",
                quality_tier="degraded",
                used_fallback=bool(provider_plan),
            )
        )
        return ChatExecutionPlan(
            requested_quality_tier=requested_quality_tier,
            routing_strategy=routing_strategy,
            routing_reason=routing_reason,
            provider_plan=provider_plan,
        )

    def _resolve_provider_model_and_quality(
        self,
        provider: str,
        quality_tier: str = "standard",
    ) -> tuple[str, str]:
        settings = get_settings()
        if provider == "gemini":
            model = settings.gemini_premium_model if quality_tier == "premium" else settings.gemini_model
            return model, quality_tier
        if provider == "openrouter":
            model = settings.openrouter_premium_model if quality_tier == "premium" else settings.openrouter_model
            return model, quality_tier
        if provider == "openai":
            if quality_tier == "premium" and settings.environment == Environment.DEVELOPMENT:
                # Keep local/dev fallback inexpensive unless premium is requested explicitly.
                model = settings.openai_model
                return model, self._infer_quality_tier_from_model(model)
            model = settings.openai_premium_model if quality_tier == "premium" else settings.openai_model
            return model, quality_tier
        return "heuristic", "degraded"

    def _ordered_chat_providers(self, *, multimodal_request: bool) -> list[str]:
        settings = get_settings()
        del multimodal_request
        seed: list[str] = []
        seed.extend(
            [
                settings.chat_primary_provider,
                settings.chat_fallback_provider,
                "openrouter",
                "openai",
                "gemini",
            ]
        )
        ordered: list[str] = []
        for provider in seed:
            normalized = provider.strip().lower()
            if normalized in {"gemini", "openrouter", "openai"} and normalized not in ordered:
                ordered.append(normalized)
        return ordered

    def _append_provider_candidate(
        self,
        *,
        candidates: list[tuple[str, str, str]],
        seen: set[tuple[str, str]],
        provider: str,
        quality_tier: str,
    ) -> None:
        normalized_provider = provider.strip().lower()
        if normalized_provider not in {"gemini", "openrouter", "openai"}:
            return
        if not self._provider_is_configured(normalized_provider):
            return
        model, effective_quality_tier = self._resolve_provider_model_and_quality(
            normalized_provider,
            quality_tier,
        )
        key = (normalized_provider, model)
        if key in seen:
            return
        seen.add(key)
        candidates.append((normalized_provider, model, effective_quality_tier))

    def _provider_is_configured(self, provider: str) -> bool:
        settings = get_settings()
        if provider == "gemini":
            return has_configured_secret(settings.gemini_api_key)
        if provider == "openrouter":
            return has_configured_secret(settings.openrouter_api_key)
        if provider == "openai":
            return has_configured_secret(settings.openai_api_key)
        return False

    def _resolve_explicit_openai_model(self, normalized: str, requested_model: str | None) -> str | None:
        settings = get_settings()
        if normalized.startswith("openai:"):
            model = (requested_model or "").split(":", 1)[1].strip()
            return model or settings.openai_model
        if normalized.startswith(("gpt-", "o1", "o3", "o4")):
            return requested_model or settings.openai_model
        return None

    def _provider_skip_reason(self, provider: str) -> str | None:
        self._seed_provider_health_from_smoke_report()
        if not self._provider_is_configured(provider):
            return "not_configured"
        health = self._provider_health.get(provider)
        if health is None:
            return None
        now = self._utcnow()
        if health.cooldown_until is None:
            return None
        if health.cooldown_until <= now:
            health.cooldown_until = None
            health.status = "healthy"
            return None
        return "cooldown_active"

    def _provider_runtime_summary(self, provider: str) -> dict[str, Any]:
        self._seed_provider_health_from_smoke_report()
        configured = self._provider_is_configured(provider)
        health = self._provider_health.get(provider)
        now = self._utcnow()
        if health is not None and health.cooldown_until is not None and health.cooldown_until <= now:
            health.cooldown_until = None
            health.status = "healthy"
        cooldown_remaining_seconds = 0
        status = "not_configured" if not configured else "healthy"
        if configured and health is not None:
            if health.cooldown_until is not None and health.cooldown_until > now:
                status = "cooldown"
                cooldown_remaining_seconds = max(
                    1,
                    int((health.cooldown_until - now).total_seconds()),
                )
            else:
                status = health.status or "healthy"
        return {
            "configured": configured,
            "status": status,
            "cooldown_remaining_seconds": cooldown_remaining_seconds,
            "consecutive_failures": health.consecutive_failures if health is not None else 0,
            "last_failure_reason": health.last_failure_reason if health is not None else None,
            "last_status_code": health.last_status_code if health is not None else None,
            "last_error_class": health.last_error_class if health is not None else None,
            "last_failure_at": health.last_failure_at.isoformat() if health and health.last_failure_at else None,
            "last_success_at": health.last_success_at.isoformat() if health and health.last_success_at else None,
        }

    def _seed_provider_health_from_smoke_report(self) -> None:
        settings = get_settings()
        report = load_provider_smoke_report(settings)
        if not isinstance(report, dict):
            self._provider_smoke_fingerprint = None
            return

        report_build = str(report.get("build") or "").strip()
        recorded_at_raw = str(report.get("recorded_at") or "").strip()
        fingerprint = (report_build, recorded_at_raw)
        if self._provider_smoke_fingerprint == fingerprint:
            return
        self._provider_smoke_fingerprint = fingerprint

        current_build = load_version_info().build
        if not report_build or report_build != current_build:
            return

        recorded_at = self._parse_report_timestamp(recorded_at_raw) or self._utcnow()
        results = report.get("results")
        if not isinstance(results, list):
            return

        latest_chat_result_by_provider: dict[str, dict[str, Any]] = {}
        for raw_result in results:
            if not isinstance(raw_result, dict):
                continue
            surface = str(raw_result.get("surface") or "").strip().lower()
            workflow = str(raw_result.get("workflow") or "").strip().lower()
            if surface != "chat" and workflow != "chat":
                continue
            provider = str(raw_result.get("provider_name") or "").strip().lower()
            if provider not in {"gemini", "openrouter", "openai"}:
                continue
            latest_chat_result_by_provider[provider] = dict(raw_result)

        for provider, raw_result in latest_chat_result_by_provider.items():
            if not self._provider_is_configured(provider):
                continue
            status = str(raw_result.get("status") or "").strip().lower()
            if status == "ok":
                self._record_smoke_provider_success(provider=provider, recorded_at=recorded_at)
            elif status == "error":
                self._record_smoke_provider_failure(
                    provider=provider,
                    result=raw_result,
                    recorded_at=recorded_at,
                )

    def _record_smoke_provider_success(self, *, provider: str, recorded_at: datetime) -> None:
        health = self._provider_health.setdefault(provider, ChatProviderHealthState())
        if health.last_failure_at is not None and health.last_failure_at > recorded_at:
            return
        health.status = "healthy"
        health.consecutive_failures = 0
        health.cooldown_until = None
        health.last_success_at = recorded_at

    def _record_smoke_provider_failure(
        self,
        *,
        provider: str,
        result: dict[str, Any],
        recorded_at: datetime,
    ) -> None:
        health = self._provider_health.setdefault(provider, ChatProviderHealthState())
        if health.last_success_at is not None and health.last_success_at >= recorded_at:
            return
        if health.last_failure_at is not None and health.last_failure_at > recorded_at:
            return

        status_code = self._status_code_from_smoke_result(result)
        cooldown_seconds = self._cooldown_seconds_for_smoke_status(status_code=status_code)
        cooldown_until = recorded_at + timedelta(seconds=cooldown_seconds) if cooldown_seconds > 0 else None
        now = self._utcnow()

        health.status = "cooldown" if cooldown_until is not None and cooldown_until > now else "healthy"
        health.consecutive_failures = max(health.consecutive_failures, 1)
        health.cooldown_until = cooldown_until if cooldown_until is not None and cooldown_until > now else None
        health.last_failure_at = recorded_at
        health.last_failure_reason = "smoke_report_error"
        health.last_status_code = status_code
        health.last_error_class = str(result.get("error_type") or "").strip() or None

    def _status_code_from_smoke_result(self, result: dict[str, Any]) -> int | None:
        error_text = str(result.get("error") or "").strip()
        if not error_text:
            return None
        match = re.search(r"\b([1-5][0-9]{2})\b", error_text)
        if not match:
            return None
        try:
            return int(match.group(1))
        except ValueError:
            return None

    def _cooldown_seconds_for_smoke_status(self, *, status_code: int | None) -> int:
        if status_code in {400, 401, 403}:
            return 600
        if status_code == 429:
            return 180
        if status_code is not None and 500 <= status_code <= 599:
            return 60
        return 60

    def _parse_report_timestamp(self, value: str) -> datetime | None:
        if not value:
            return None
        normalized = value.strip()
        if normalized.endswith("Z"):
            normalized = f"{normalized[:-1]}+00:00"
        try:
            parsed = datetime.fromisoformat(normalized)
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    def _record_provider_failure(
        self,
        *,
        provider: str,
        error: Exception | None = None,
        failure_reason: str | None = None,
    ) -> dict[str, Any]:
        health = self._provider_health.setdefault(provider, ChatProviderHealthState())
        now = self._utcnow()
        status_code: int | None = None
        if isinstance(error, httpx.HTTPStatusError):
            status_code = error.response.status_code
        resolved_failure_reason = failure_reason or (
            "http_status_error" if isinstance(error, httpx.HTTPStatusError) else "provider_error"
        )
        cooldown_seconds = self._cooldown_seconds_for_failure(
            provider=provider,
            error=error,
            failure_reason=resolved_failure_reason,
        )
        health.status = "cooldown" if cooldown_seconds > 0 else "healthy"
        health.consecutive_failures += 1
        health.cooldown_until = now + timedelta(seconds=cooldown_seconds) if cooldown_seconds > 0 else None
        health.last_failure_at = now
        health.last_failure_reason = resolved_failure_reason
        health.last_status_code = status_code
        health.last_error_class = type(error).__name__ if error is not None else None
        return {
            "status": health.status,
            "cooldown_seconds": cooldown_seconds,
            "last_status_code": health.last_status_code,
            "last_failure_reason": health.last_failure_reason,
            "consecutive_failures": health.consecutive_failures,
        }

    def _record_provider_success(self, provider: str) -> None:
        health = self._provider_health.setdefault(provider, ChatProviderHealthState())
        health.status = "healthy"
        health.consecutive_failures = 0
        health.cooldown_until = None
        health.last_success_at = self._utcnow()

    def _cooldown_seconds_for_failure(
        self,
        *,
        provider: str,
        error: Exception | None,
        failure_reason: str,
    ) -> int:
        del provider
        if isinstance(error, httpx.HTTPStatusError):
            status_code = error.response.status_code
            if status_code in {401, 403}:
                return 600
            if status_code == 429:
                return 180
            if 500 <= status_code <= 599:
                return 60
        if failure_reason in {"empty_response", "retry_failed"}:
            return 45
        return 60

    def _utcnow(self) -> datetime:
        return datetime.now(timezone.utc)

    def _determine_routing_reason(
        self,
        *,
        premium_chat: bool,
        multimodal_request: bool,
        prompt_profile: str,
        detail_score: int,
        premium_intent: bool,
    ) -> str:
        if premium_chat and multimodal_request:
            return "premium_multimodal_chat"
        if premium_chat and premium_intent:
            return "premium_visual_direction"
        if premium_chat and detail_score >= 4:
            return "premium_high_detail_chat"
        if premium_chat:
            return "premium_chat_default"
        if multimodal_request:
            return "standard_multimodal_chat"
        if prompt_profile in {"stylized_illustration", "fantasy_concept"}:
            return "standard_creative_direction"
        return "standard_chat_default"

    def _resolve_chat_temperature(self, *, intent_kind: str, prompt_profile: str) -> float:
        if intent_kind == "analyze_image":
            return 0.35
        if intent_kind in {"edit_image", "prompt_help"}:
            return 0.45
        if prompt_profile in {"stylized_illustration", "fantasy_concept"}:
            return 0.7
        return 0.6

    def _build_chat_system_prompt(
        self,
        *,
        mode: str,
        intent_kind: str,
        prompt_profile: str,
        recommended_workflow: str,
        premium_chat: bool,
        continuity_summary: str | None = None,
    ) -> str:
        resolved_mode = (mode or "think").strip().lower()
        mode_instruction = {
            "vision": (
                "Focus on render direction, visual hierarchy, prompt strength, camera feel, and production-ready output."
            ),
            "edit": (
                "Focus on edit planning, what should stay, what should change, masking strategy, and safe visual revision advice."
            ),
            "think": (
                "Focus on creative direction, options, constraints, and next-best action without overexplaining."
            ),
        }.get(resolved_mode, "Focus on useful creative guidance and next-best action.")
        intent_instruction = {
            "generate_image": (
                "When the user is clearly asking for generation, give one render-ready direction instead of multiple weak options. "
                "Prefer a polished final prompt plus a short explanation of what makes it work."
            ),
            "edit_image": (
                "When the user is asking for an edit, preserve anchor elements first: identity, pose, composition, perspective, and protected details. "
                "Then describe only what changes, in the safest edit order."
            ),
            "analyze_image": (
                "When analyzing an image, speak like a premium creative director: identify subject, composition, lighting, materials, mood, weaknesses, and the next improvement."
            ),
            "prompt_help": (
                "If the user is close to a good prompt, rewrite it sharply and avoid filler. "
                "A strong final prompt is more useful than a long explanation."
            ),
        }.get(intent_kind, "Prioritize the next useful action inside Studio.")
        profile_instruction = {
            "realistic_editorial": "Prefer believable skin, materials, lensing, and campaign-grade lighting.",
            "product_commercial": "Prefer commercial product clarity, controlled reflections, material accuracy, and clean premium staging.",
            "interior_archviz": "Prefer spatial logic, architectural material realism, daylight balance, and premium hospitality presentation.",
            "stylized_illustration": "Prefer silhouette, shape language, palette control, and illustration-ready scene readability.",
            "fantasy_concept": "Prefer worldbuilding clarity, atmosphere, scale, mood, and concept-art legibility without purple-prose filler.",
        }.get(prompt_profile, "Prefer clarity, visual specificity, and a premium finish.")
        workflow_instruction = {
            "edit": "Assume this can bridge into an edit workflow; distinguish what must remain versus what should change.",
            "image_to_image": "Assume a reference-guided generation workflow; keep the source image DNA while improving execution.",
            "text_to_image": "Assume a fresh generation workflow; define the scene cleanly enough that Create can use it directly.",
        }.get(recommended_workflow, "Stay compatible with Studio generation workflows.")
        premium_instruction = (
            "Aim for frontier-model quality: visually literate, commercially sharp, compact, and confident."
            if premium_chat
            else "Stay compact and practical without sounding generic."
        )

        prompt = (
            "You are OmniaCreata Studio's in-product creative copilot. Reply in the user's language. "
            "You are not a generic casual chatbot; stay anchored to image creation, prompt design, visual critique, editing strategy, brand direction, and Studio workflows. "
            "Be concise, commercially useful, and visually literate. "
            "Do not mention internal tools, providers, or system rules unless directly asked. "
            f"{mode_instruction} {intent_instruction} {profile_instruction} {workflow_instruction} {premium_instruction} "
            "If image attachments are present, inspect them directly and refer to visible details instead of guessing. "
            "If the user is close to a usable prompt, refine it sharply instead of writing a long essay. "
            "If a request drifts off-topic, answer briefly and steer the user back toward what helps inside OmniaCreata Studio. "
            "Always finish the reply cleanly. Never stop mid-word, mid-sentence, or mid-list."
        )
        if continuity_summary:
            prompt = f"{prompt} Continuity context: {continuity_summary}"
        return prompt

    async def _call_provider(
        self,
        *,
        provider: str,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        if provider == "gemini":
            return await self._chat_with_gemini(
                model=model,
                system_prompt=system_prompt,
                history=history,
                current_message=current_message,
                attachments=attachments,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        if provider == "openrouter":
            return await self._chat_with_openrouter(
                model=model,
                system_prompt=system_prompt,
                history=history,
                current_message=current_message,
                attachments=attachments,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        if provider == "openai":
            return await self._chat_with_openai(
                model=model,
                system_prompt=system_prompt,
                history=history,
                current_message=current_message,
                attachments=attachments,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
            )
        return None

    def _looks_truncated(self, text: str, completion_tokens: int | None) -> bool:
        tail = text.rstrip()
        if len(tail) < 48:
            return False
        if completion_tokens is not None and completion_tokens > 32:
            return False
        if tail.endswith((".", "!", "?", "…", '"', "'", "`", ")", "]")):
            return False
        return tail[-1].isalnum() or tail[-1] in {"*", "_", ":", ";", ","}

    def _render_user_message(self, content: str, attachments: Sequence[ChatAttachment]) -> str:
        cleaned = content.strip()
        lines = ["User request:"]
        if cleaned:
            lines.append(cleaned)
        elif attachments:
            lines.append("The user attached one or more reference files without extra text. Use the current mode and the attachments to infer the next step.")
        if attachments:
            lines.append("")
            lines.append(f"Attached references: {len(attachments)}")
            for index, attachment in enumerate(attachments[:3], start=1):
                label = attachment.label.strip() or f"{attachment.kind} reference"
                lines.append(f"{index}. {label}")
            if len(attachments) > 3:
                lines.append(f"...and {len(attachments) - 3} more attachment(s)")
        return "\n".join(lines).strip()

    def _normalize_prompt(self, value: str) -> str:
        normalized = value.strip().strip("`").strip().strip('"').strip("'")
        normalized = " ".join(normalized.split())
        lowered = normalized.lower()
        for prefix in ("prompt:", "improved prompt:"):
            if lowered.startswith(prefix):
                normalized = normalized[len(prefix):].strip()
                break
        return normalized[:420]

    async def _chat_with_gemini(
        self,
        *,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        settings = get_settings()
        gemini_api_key = configured_secret_value(settings.gemini_api_key)
        if not gemini_api_key:
            return None

        contents: list[dict[str, Any]] = []
        for message in self._select_relevant_history(history):
            text = self._flatten_message(message)
            if not text:
                continue
            contents.append(
                {
                    "role": "model" if message.role == ChatRole.ASSISTANT else "user",
                    "parts": [{"text": text}],
                }
            )
        contents.append({"role": "user", "parts": self._build_gemini_user_parts(current_message, attachments)})

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        body = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "topP": 0.9,
                "maxOutputTokens": max_output_tokens,
                "responseMimeType": "text/plain",
            },
        }
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": gemini_api_key,
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, json=body, headers=headers)
            response.raise_for_status()

        payload = response.json()
        candidates = payload.get("candidates") or []
        if not candidates:
            return None

        parts = ((candidates[0] or {}).get("content") or {}).get("parts") or []
        text = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
        if not text:
            return None

        usage = payload.get("usageMetadata") or {}
        prompt_tokens = self._as_int(usage.get("promptTokenCount"))
        completion_tokens = self._as_int(usage.get("candidatesTokenCount"))

        return LLMResult(
            text=text,
            provider="gemini",
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=self._estimate_cost_usd(model, prompt_tokens, completion_tokens),
        )

    async def _chat_with_openrouter(
        self,
        *,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        settings = get_settings()
        openrouter_api_key = configured_secret_value(settings.openrouter_api_key)
        if not openrouter_api_key:
            return None

        body = self._build_openrouter_request_body(
            model=model,
            system_prompt=system_prompt,
            history=history,
            current_message=current_message,
            attachments=attachments,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

        headers = {
            "Authorization": f"Bearer {openrouter_api_key}",
            "Content-Type": "application/json",
            "X-Title": "OmniaCreata Studio",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post("https://openrouter.ai/api/v1/chat/completions", json=body, headers=headers)
            response.raise_for_status()

        payload = response.json()
        choices = payload.get("choices") or []
        if not choices:
            return None

        message = (choices[0] or {}).get("message") or {}
        text = self._extract_openrouter_text(message.get("content"))
        if not text:
            return None

        usage = payload.get("usage") or {}
        prompt_tokens = self._as_int(usage.get("prompt_tokens"))
        completion_tokens = self._as_int(usage.get("completion_tokens"))

        return LLMResult(
            text=text,
            provider="openrouter",
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=self._estimate_cost_usd(model, prompt_tokens, completion_tokens),
        )

    async def _chat_with_openai(
        self,
        *,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        settings = get_settings()
        openai_api_key = configured_secret_value(settings.openai_api_key)
        if not openai_api_key:
            return None

        body = self._build_openai_request_body(
            model=model,
            system_prompt=system_prompt,
            history=history,
            current_message=current_message,
            attachments=attachments,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
        headers = {
            "Authorization": f"Bearer {openai_api_key}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post("https://api.openai.com/v1/responses", json=body, headers=headers)
            response.raise_for_status()

        payload = response.json()
        text = self._extract_openai_text(payload.get("output"))
        if not text:
            return None

        usage = payload.get("usage") or {}
        prompt_tokens = self._as_int(usage.get("input_tokens"))
        completion_tokens = self._as_int(usage.get("output_tokens"))

        return LLMResult(
            text=text,
            provider="openai",
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            estimated_cost_usd=self._estimate_cost_usd(model, prompt_tokens, completion_tokens),
        )

    def _build_openrouter_request_body(
        self,
        *,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
        temperature: float,
        max_output_tokens: int,
    ) -> dict[str, Any]:
        messages: list[dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for message in self._select_relevant_history(history):
            text = self._flatten_message(message)
            if not text:
                continue
            messages.append(
                {
                    "role": "assistant" if message.role == ChatRole.ASSISTANT else "user",
                    "content": text,
                }
            )
        messages.append({"role": "user", "content": self._build_openrouter_user_content(current_message, attachments)})
        return {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_output_tokens,
        }

    def _build_openai_request_body(
        self,
        *,
        model: str,
        system_prompt: str,
        history: Sequence[ChatMessage],
        current_message: str,
        attachments: Sequence[ChatAttachment],
        temperature: float,
        max_output_tokens: int,
    ) -> dict[str, Any]:
        input_items: list[dict[str, Any]] = []
        for message in self._select_relevant_history(history):
            content = self._build_openai_message_content(self._flatten_message(message), message.attachments)
            if not content:
                continue
            input_items.append(
                {
                    "role": "assistant" if message.role == ChatRole.ASSISTANT else "user",
                    "content": content,
                }
            )
        input_items.append(
            {
                "role": "user",
                "content": self._build_openai_message_content(current_message, attachments),
            }
        )
        return {
            "model": model,
            "instructions": system_prompt,
            "input": input_items,
            "temperature": temperature,
            "max_output_tokens": max_output_tokens,
        }

    def _select_relevant_history(self, history: Sequence[ChatMessage]) -> list[ChatMessage]:
        ordered = sorted(history, key=lambda item: item.created_at)
        if len(ordered) <= 6:
            return list(ordered)

        selected_by_id: dict[str, ChatMessage] = {}
        message_map = {message.id: message for message in ordered}

        def remember(message: ChatMessage | None) -> None:
            if message is None:
                return
            selected_by_id.setdefault(message.id, message)

        for message in ordered[-4:]:
            remember(message)

        latest_bridge_message = next(
            (
                message
                for message in reversed(ordered)
                if message.role == ChatRole.ASSISTANT
                and isinstance(message.metadata.get("generation_bridge"), dict)
            ),
            None,
        )
        remember(latest_bridge_message)
        if latest_bridge_message is not None and latest_bridge_message.parent_message_id:
            remember(message_map.get(latest_bridge_message.parent_message_id))

        latest_visual_user = next(
            (
                message
                for message in reversed(ordered)
                if message.role == ChatRole.USER and message.attachments
            ),
            None,
        )
        remember(latest_visual_user)

        selected = sorted(selected_by_id.values(), key=lambda item: item.created_at)
        if len(selected) >= 6:
            return selected[-6:]

        for message in reversed(ordered[:-4]):
            if message.id in selected_by_id:
                continue
            selected_by_id[message.id] = message
            if len(selected_by_id) >= 6:
                break

        return sorted(selected_by_id.values(), key=lambda item: item.created_at)

    def _flatten_message(self, message: ChatMessage) -> str:
        parts = [message.content.strip()]
        context_summary = self._build_message_context_summary(message)
        if context_summary:
            parts.append(context_summary)
        if message.attachments:
            attachment_bits = [
                attachment.label.strip() or f"{attachment.kind} reference"
                for attachment in message.attachments[:3]
            ]
            if attachment_bits:
                parts.append(f"Attachments: {', '.join(attachment_bits)}")
        return "\n".join(part for part in parts if part).strip()

    def _build_message_context_summary(self, message: ChatMessage) -> str:
        metadata = message.metadata if isinstance(message.metadata, dict) else {}
        bridge = metadata.get("generation_bridge") if isinstance(metadata.get("generation_bridge"), dict) else None
        blueprint = bridge.get("blueprint") if isinstance((bridge or {}).get("blueprint"), dict) else {}

        summary_bits: list[str] = []

        workflow = self._context_string(blueprint.get("workflow")) or self._context_string((bridge or {}).get("workflow"))
        if workflow:
            summary_bits.append(f"workflow={workflow}")

        model = self._context_string(blueprint.get("model"))
        if model:
            summary_bits.append(f"model={model}")

        aspect_ratio = self._context_string(blueprint.get("aspect_ratio"))
        if aspect_ratio:
            summary_bits.append(f"aspect={aspect_ratio}")

        reference_mode = self._context_string(blueprint.get("reference_mode"))
        if reference_mode:
            summary_bits.append(f"reference_mode={reference_mode}")

        prompt_profile = self._context_string(metadata.get("prompt_profile"))
        if prompt_profile:
            summary_bits.append(f"profile={prompt_profile}")

        creative_direction_summary = self._context_string(metadata.get("creative_direction_summary"))
        if creative_direction_summary:
            summary_bits.append(
                f"direction={self._truncate_context_text(creative_direction_summary, 140)}"
            )

        negative_guardrails_summary = self._context_string(metadata.get("negative_guardrails_summary"))
        if not negative_guardrails_summary:
            negative_guardrails_summary = (
                self._context_string(blueprint.get("negative_prompt"))
                or self._context_string((bridge or {}).get("negative_prompt"))
            )
        if negative_guardrails_summary:
            summary_bits.append(
                f"negative_guardrails={self._truncate_context_text(negative_guardrails_summary, 140)}"
            )

        if metadata.get("follow_up_refinement") is True:
            summary_bits.append("follow_up=refinement")

        planned_prompt = self._context_string(blueprint.get("prompt")) or self._context_string((bridge or {}).get("prompt"))
        if planned_prompt:
            summary_bits.append(f"planned_prompt={self._truncate_context_text(planned_prompt, 160)}")

        if not summary_bits:
            return ""
        return f"Visual context: {'; '.join(summary_bits)}"

    def _context_string(self, value: Any) -> str:
        if not isinstance(value, str):
            return ""
        return " ".join(value.strip().split())

    def _truncate_context_text(self, value: str, limit: int) -> str:
        cleaned = " ".join(value.strip().split())
        if len(cleaned) <= limit:
            return cleaned
        return f"{cleaned[: limit - 1].rstrip()}..."

    def _build_gemini_user_parts(
        self,
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> list[dict[str, Any]]:
        parts: list[dict[str, Any]] = [{"text": current_message}]
        for attachment in self._extract_image_attachments(attachments):
            if attachment["source"] != "inline":
                continue
            parts.append(
                {
                    "inline_data": {
                        "mime_type": attachment["mime_type"],
                        "data": attachment["data"],
                    }
                }
            )
        return parts

    def _build_openrouter_user_content(
        self,
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> list[dict[str, Any]]:
        content: list[dict[str, Any]] = [{"type": "text", "text": current_message}]
        for attachment in self._extract_image_attachments(attachments):
            content.append(
                {
                    "type": "image_url",
                    "image_url": {
                        "url": attachment["url"],
                    },
                }
            )
        return content

    def _build_openai_message_content(
        self,
        current_message: str,
        attachments: Sequence[ChatAttachment],
    ) -> list[dict[str, Any]]:
        content: list[dict[str, Any]] = []
        if current_message.strip():
            content.append({"type": "input_text", "text": current_message})
        for attachment in self._extract_image_attachments(attachments):
            content.append({"type": "input_image", "image_url": attachment["url"]})
        return content

    def _extract_image_attachments(self, attachments: Sequence[ChatAttachment]) -> list[dict[str, str]]:
        prepared: list[dict[str, str]] = []
        for attachment in attachments[:4]:
            if attachment.kind != "image":
                continue
            image = self._normalize_image_attachment(attachment.url)
            if image:
                prepared.append(image)
        return prepared

    def _normalize_image_attachment(self, url: str) -> dict[str, str] | None:
        value = url.strip()
        if not value:
            return None
        if value.startswith("data:"):
            return self._parse_data_url_image(value)
        if value.startswith(("https://", "http://")):
            return {"source": "remote", "url": value, "mime_type": "image/*", "data": ""}
        return None

    def _parse_data_url_image(self, url: str) -> dict[str, str] | None:
        header, separator, payload = url.partition(",")
        if not separator or not header.startswith("data:") or ";base64" not in header:
            return None
        mime_type = header[5:].split(";", 1)[0].strip().lower()
        if mime_type not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
            return None
        try:
            # Validate once so malformed payloads don't go to the provider.
            base64.b64decode(payload, validate=True)
        except (ValueError, binascii.Error):
            return None
        return {
            "source": "inline",
            "url": url,
            "mime_type": mime_type,
            "data": payload,
        }

    def _extract_openrouter_text(self, content: Any) -> str:
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                if not isinstance(item, dict):
                    continue
                if item.get("type") == "text" and item.get("text"):
                    parts.append(str(item["text"]))
            return "".join(parts).strip()
        return ""

    def _extract_openai_text(self, output: Any) -> str:
        if not isinstance(output, list):
            return ""
        parts: list[str] = []
        for item in output:
            if not isinstance(item, dict):
                continue
            if item.get("type") != "message":
                continue
            for content_item in item.get("content") or []:
                if not isinstance(content_item, dict):
                    continue
                if content_item.get("type") == "output_text" and content_item.get("text"):
                    parts.append(str(content_item["text"]))
        return "".join(parts).strip()

    def _estimate_cost_usd(
        self,
        model: str,
        prompt_tokens: int | None,
        completion_tokens: int | None,
    ) -> float | None:
        if prompt_tokens is None and completion_tokens is None:
            return None
        input_rate, output_rate = self._price_per_million(model)
        if input_rate is None or output_rate is None:
            return None
        prompt_cost = ((prompt_tokens or 0) / 1_000_000) * input_rate
        completion_cost = ((completion_tokens or 0) / 1_000_000) * output_rate
        return round(prompt_cost + completion_cost, 6)

    def _price_per_million(self, model: str) -> tuple[float | None, float | None]:
        return chat_model_cost_rates(model)

    def _infer_quality_tier_from_model(self, model: str) -> str:
        normalized = model.strip().lower()
        if any(marker in normalized for marker in ("pro", "opus", "sonnet", "gpt-5", "grok-4", "o3")):
            return "premium"
        if any(marker in normalized for marker in ("flash", "lite", "mini", "haiku")):
            return "standard"
        return "standard"

    def _is_quality_degraded(self, requested_quality_tier: str, selected_quality_tier: str) -> bool:
        order = {"degraded": 0, "standard": 1, "premium": 2}
        return order.get(selected_quality_tier, 0) < order.get(requested_quality_tier, 0)

    def _as_int(self, value: Any) -> int | None:
        try:
            if value is None:
                return None
            return int(value)
        except (TypeError, ValueError):
            return None

    def _log_chat_provider_failure(
        self,
        *,
        provider: str,
        model: str,
        requested_quality_tier: str,
        selected_quality_tier: str,
        routing_strategy: str,
        routing_reason: str,
        used_fallback: bool,
        error: Exception | None = None,
        failure_reason: str | None = None,
        health_state: dict[str, Any] | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "event": "chat_provider_failure",
            "provider": provider,
            "model": model,
            "requested_quality_tier": requested_quality_tier,
            "selected_quality_tier": selected_quality_tier,
            "routing_strategy": routing_strategy,
            "routing_reason": routing_reason,
            "used_fallback": used_fallback,
            "failure_reason": failure_reason or "provider_error",
        }
        if isinstance(error, httpx.HTTPStatusError):
            payload["status_code"] = error.response.status_code
            payload["error_class"] = type(error).__name__
            payload["failure_reason"] = failure_reason or "http_status_error"
        elif error is not None:
            payload["error_class"] = type(error).__name__
        if health_state:
            payload["provider_status"] = health_state.get("status")
            payload["cooldown_seconds"] = health_state.get("cooldown_seconds")
            payload["consecutive_failures"] = health_state.get("consecutive_failures")
        logger.warning("chat_provider_failure %s", payload)

    def _log_chat_provider_skip(
        self,
        *,
        provider: str,
        model: str,
        requested_quality_tier: str,
        selected_quality_tier: str,
        routing_strategy: str,
        routing_reason: str,
        used_fallback: bool,
        skip_reason: str,
    ) -> None:
        payload = {
            "event": "chat_provider_skip",
            "provider": provider,
            "model": model,
            "requested_quality_tier": requested_quality_tier,
            "selected_quality_tier": selected_quality_tier,
            "routing_strategy": routing_strategy,
            "routing_reason": routing_reason,
            "used_fallback": used_fallback,
            "skip_reason": skip_reason,
            "provider_status": self._provider_runtime_summary(provider),
        }
        logger.info("chat_provider_skip %s", payload)
