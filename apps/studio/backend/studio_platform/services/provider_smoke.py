from __future__ import annotations

import io
import time
from dataclasses import dataclass
from typing import Any, Optional, Type

from PIL import Image, ImageDraw

from config.env import Settings, get_settings, has_configured_secret
from security.redaction import redact_sensitive_text

from ..llm import StudioLLMGateway
from ..providers import (
    ProviderReferenceImage,
    ProviderRegistry,
    ProviderResult,
    ProviderTemporaryError,
    StudioImageProvider,
)


@dataclass(frozen=True, slots=True)
class ProviderSmokeCase:
    label: str
    provider_name: str
    workflow: str
    prompt: str
    surface: str = "image"
    lane: str | None = None
    model: str | None = None
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    seed: int = 424242
    steps: int = 28
    cfg_scale: float = 6.0
    reference_image: ProviderReferenceImage | None = None
    expected_error_type: Type[Exception] | None = None


@dataclass(frozen=True, slots=True)
class ProviderSmokeResult:
    label: str
    provider_name: str
    workflow: str
    surface: str
    lane: str | None
    status: str
    latency_ms: int
    model: str | None = None
    actual_provider: str | None = None
    mime_type: str | None = None
    output_bytes: int | None = None
    estimated_cost: float | None = None
    text_preview: str | None = None
    error_type: str | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, object]:
        return {
            "label": self.label,
            "provider_name": self.provider_name,
            "workflow": self.workflow,
            "surface": self.surface,
            "lane": self.lane,
            "status": self.status,
            "latency_ms": self.latency_ms,
            "model": self.model,
            "actual_provider": self.actual_provider,
            "mime_type": self.mime_type,
            "output_bytes": self.output_bytes,
            "estimated_cost": self.estimated_cost,
            "text_preview": self.text_preview,
            "error_type": self.error_type,
            "error": self.error,
        }


def ensure_live_provider_smoke_enabled(settings: Settings) -> None:
    if not settings.enable_live_provider_smoke:
        raise RuntimeError(
            "Live provider smoke tests are disabled. Set ENABLE_LIVE_PROVIDER_SMOKE=true to run them intentionally."
        )


def build_smoke_reference_image() -> ProviderReferenceImage:
    image = Image.new("RGB", (384, 384), color=(13, 18, 28))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((24, 24, 360, 360), radius=42, outline=(86, 185, 255), width=6)
    draw.rectangle((72, 92, 312, 172), fill=(27, 137, 255))
    draw.rectangle((96, 214, 288, 296), fill=(252, 186, 3))
    draw.ellipse((132, 124, 252, 244), outline=(247, 247, 247), width=5)

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return ProviderReferenceImage(
        asset_id="smoke-reference",
        image_bytes=buffer.getvalue(),
        mime_type="image/png",
        title="Provider smoke reference",
    )


def build_default_smoke_cases(
    *,
    selected_provider: str = "all",
    selected_surface: str = "all",
    include_failure_probe: bool = True,
    profile: str = "full",
) -> list[ProviderSmokeCase]:
    settings = get_settings()
    normalized_provider = (selected_provider or "all").strip().lower()
    normalized_surface = (selected_surface or "all").strip().lower()
    normalized_profile = (profile or "full").strip().lower()
    if normalized_profile not in {"full", "refresh"}:
        normalized_profile = "full"
    include_edit_cases = normalized_profile == "full"
    include_failure_probe = include_failure_probe and normalized_profile == "full"
    reference_image = build_smoke_reference_image()
    cases: list[ProviderSmokeCase] = []

    if normalized_surface in {"all", "image"} and normalized_provider in {"all", "fal"}:
        cases.append(
            ProviderSmokeCase(
                label="fal-text-to-image",
                provider_name="fal",
                workflow="text_to_image",
                surface="image",
                lane="managed_primary",
                prompt="Minimal studio product photograph of a matte ceramic mug on a soft gray backdrop, premium commercial lighting, clean composition, crisp detail.",
            )
        )
        if include_edit_cases:
            cases.append(
                ProviderSmokeCase(
                    label="fal-image-edit",
                    provider_name="fal",
                    workflow="edit",
                    surface="image",
                    lane="managed_primary",
                    prompt="Turn this into a premium editorial product shot with refined reflections, soft studio lighting, and luxury art-direction.",
                    reference_image=reference_image,
                )
            )
        if include_failure_probe:
            cases.append(
                ProviderSmokeCase(
                    label="fal-edit-missing-reference-probe",
                    provider_name="fal",
                    workflow="edit",
                    surface="image",
                    lane="managed_primary",
                    prompt="Attempt edit without a reference image to verify failure mapping.",
                    expected_error_type=ProviderTemporaryError,
                )
            )

    if normalized_surface in {"all", "image"} and normalized_provider in {"all", "runware"}:
        cases.append(
            ProviderSmokeCase(
                label="runware-text-to-image",
                provider_name="runware",
                workflow="text_to_image",
                surface="image",
                lane="managed_primary",
                prompt="Premium beauty product packshot on a sculpted stone pedestal, dramatic softbox lighting, luxury campaign style, ultra clean background.",
            )
        )
        if include_failure_probe:
            cases.append(
                ProviderSmokeCase(
                    label="runware-edit-missing-reference-probe",
                    provider_name="runware",
                    workflow="edit",
                    surface="image",
                    lane="managed_primary",
                    prompt="Attempt edit without a reference image to verify fallback does not silently degrade.",
                    expected_error_type=ProviderTemporaryError,
                )
            )

    if normalized_surface in {"all", "image"} and normalized_provider == "openai":
        cases.append(
            ProviderSmokeCase(
                label="openai-draft-text-to-image",
                provider_name="openai",
                workflow="text_to_image",
                surface="image",
                lane="draft",
                model=settings.openai_image_draft_model,
                prompt="Low-cost draft render of a skincare bottle on a minimal plinth, clean lighting, simple ecommerce framing.",
            )
        )
        cases.append(
            ProviderSmokeCase(
                label="openai-final-text-to-image",
                provider_name="openai",
                workflow="text_to_image",
                surface="image",
                lane="final",
                model=settings.openai_image_model,
                prompt="Luxury skincare bottle on a sculpted stone plinth, premium studio campaign lighting, editorial polish, high-end product photography.",
            )
        )
        if include_edit_cases:
            cases.append(
                ProviderSmokeCase(
                    label="openai-final-image-edit",
                    provider_name="openai",
                    workflow="edit",
                    surface="image",
                    lane="final",
                    model=settings.openai_image_model,
                    prompt="Turn this into a premium ecommerce hero image with soft daylight, clean background separation, and crisp product styling.",
                    reference_image=reference_image,
                )
            )
        if include_failure_probe:
            cases.append(
                ProviderSmokeCase(
                    label="openai-edit-missing-reference-probe",
                    provider_name="openai",
                    workflow="edit",
                    surface="image",
                    lane="final",
                    model=settings.openai_image_model,
                    prompt="Attempt edit without a reference image to verify honest failure mapping.",
                    expected_error_type=ProviderTemporaryError,
                )
            )

    if normalized_surface in {"all", "chat"} and normalized_provider in {"all", "gemini"}:
        cases.append(
            ProviderSmokeCase(
                label="gemini-chat-premium-smoke",
                provider_name="gemini",
                workflow="chat",
                surface="chat",
                lane="primary" if settings.chat_primary_provider == "gemini" else "dev_or_backup",
                model=settings.gemini_model,
                prompt="Return the token STUDIO_SMOKE_OK and one short sentence about premium creative direction.",
            )
        )

    if normalized_surface in {"all", "chat"} and normalized_provider in {"all", "openrouter"}:
        cases.append(
            ProviderSmokeCase(
                label="openrouter-chat-premium-smoke",
                provider_name="openrouter",
                workflow="chat",
                surface="chat",
                lane=(
                    "primary"
                    if settings.chat_primary_provider == "openrouter"
                    else "secondary" if settings.chat_fallback_provider == "openrouter" else "backup"
                ),
                model=settings.openrouter_model,
                prompt="Return the token STUDIO_SMOKE_OK and one short sentence about premium creative direction.",
            )
        )

    if normalized_surface in {"all", "chat"} and normalized_provider in {"all", "runware"}:
        cases.append(
            ProviderSmokeCase(
                label="runware-chat-premium-smoke",
                provider_name="runware",
                workflow="chat",
                surface="chat",
                lane=(
                    "primary"
                    if settings.chat_primary_provider == "runware"
                    else "secondary" if settings.chat_fallback_provider == "runware" else "backup"
                ),
                model=settings.runware_chat_model,
                prompt="Return the token STUDIO_SMOKE_OK and one short sentence about premium creative direction.",
            )
        )

    if normalized_surface in {"all", "chat"} and normalized_provider in {"all", "openai"}:
        cases.append(
            ProviderSmokeCase(
                label="openai-chat-premium-smoke",
                provider_name="openai",
                workflow="chat",
                surface="chat",
                lane=(
                    "primary"
                    if settings.chat_primary_provider == "openai"
                    else "secondary" if settings.chat_fallback_provider == "openai" else "optional"
                ),
                model=settings.openai_model,
                prompt="Return the token STUDIO_SMOKE_OK and one short sentence about premium creative direction.",
            )
        )

    return cases


def find_provider(registry: ProviderRegistry, provider_name: str) -> StudioImageProvider | None:
    normalized = provider_name.strip().lower()
    for provider in registry.providers:
        if provider.name == normalized:
            return provider
    return None


async def run_provider_smoke_case(
    provider: Any,
    case: ProviderSmokeCase,
) -> ProviderSmokeResult:
    if case.surface == "chat":
        return await run_chat_provider_smoke_case(provider, case)

    started_at = time.perf_counter()
    if not await provider.is_available():
        return ProviderSmokeResult(
            label=case.label,
            provider_name=case.provider_name,
            workflow=case.workflow,
            surface=case.surface,
            lane=case.lane,
            status="skipped",
            latency_ms=0,
            model=case.model,
            error="Provider is not configured in this environment",
        )

    try:
        result = await provider.generate(
            prompt=case.prompt,
            negative_prompt=case.negative_prompt,
            width=case.width,
            height=case.height,
            seed=case.seed,
            reference_image=case.reference_image,
            model_id=case.model,
            steps=case.steps,
            cfg_scale=case.cfg_scale,
            workflow=case.workflow,
        )
    except Exception as exc:
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        if case.expected_error_type is not None and isinstance(exc, case.expected_error_type):
            return ProviderSmokeResult(
                label=case.label,
                provider_name=case.provider_name,
                workflow=case.workflow,
                surface=case.surface,
                lane=case.lane,
                status="expected_failure",
                latency_ms=latency_ms,
                model=case.model,
                error_type=exc.__class__.__name__,
                error=redact_sensitive_text(exc),
            )
        return ProviderSmokeResult(
            label=case.label,
            provider_name=case.provider_name,
            workflow=case.workflow,
            surface=case.surface,
            lane=case.lane,
            status="error",
            latency_ms=latency_ms,
            model=case.model,
            error_type=exc.__class__.__name__,
            error=redact_sensitive_text(exc),
        )

    latency_ms = int((time.perf_counter() - started_at) * 1000)
    if case.expected_error_type is not None:
        return ProviderSmokeResult(
            label=case.label,
            provider_name=case.provider_name,
            workflow=case.workflow,
            surface=case.surface,
            lane=case.lane,
            status="error",
            latency_ms=latency_ms,
            model=case.model,
            actual_provider=result.provider,
            mime_type=result.mime_type,
            output_bytes=len(result.image_bytes),
            estimated_cost=result.estimated_cost,
            error=f"Expected {case.expected_error_type.__name__} but generation succeeded",
        )

    return ProviderSmokeResult(
        label=case.label,
        provider_name=case.provider_name,
        workflow=case.workflow,
        surface=case.surface,
        lane=case.lane,
        status="ok",
        latency_ms=latency_ms,
        model=case.model,
        actual_provider=result.provider,
        mime_type=result.mime_type,
        output_bytes=len(result.image_bytes),
        estimated_cost=result.estimated_cost,
    )


async def run_chat_provider_smoke_case(
    gateway: Any,
    case: ProviderSmokeCase,
) -> ProviderSmokeResult:
    settings = get_settings()
    provider_name = (case.provider_name or "").strip().lower()
    model = case.model or _default_chat_smoke_model(settings, provider_name)
    if not _chat_provider_is_configured(settings, provider_name):
        return ProviderSmokeResult(
            label=case.label,
            provider_name=provider_name,
            workflow=case.workflow,
            surface=case.surface,
            lane=case.lane,
            status="skipped",
            latency_ms=0,
            model=model,
            error="Provider is not configured in this environment",
        )

    runner_name = _chat_smoke_runner_name(provider_name)
    runner = getattr(gateway, runner_name, None)
    if runner is None:
        return ProviderSmokeResult(
            label=case.label,
            provider_name=provider_name,
            workflow=case.workflow,
            surface=case.surface,
            lane=case.lane,
            status="skipped",
            latency_ms=0,
            model=model,
            error="Chat provider smoke runner is not registered in this environment",
        )

    started_at = time.perf_counter()
    try:
        result = await runner(
            model=model,
            system_prompt=(
                "You are a provider smoke probe for OmniaCreata Studio. "
                "Reply briefly, do not use markdown, and include the token STUDIO_SMOKE_OK."
            ),
            history=(),
            current_message=case.prompt,
            attachments=(),
            temperature=0.2,
            max_output_tokens=120,
        )
    except Exception as exc:
        latency_ms = int((time.perf_counter() - started_at) * 1000)
        return ProviderSmokeResult(
            label=case.label,
            provider_name=provider_name,
            workflow=case.workflow,
            surface=case.surface,
            lane=case.lane,
            status="error",
            latency_ms=latency_ms,
            model=model,
            error_type=exc.__class__.__name__,
            error=redact_sensitive_text(exc),
        )

    latency_ms = int((time.perf_counter() - started_at) * 1000)
    if result is None or not getattr(result, "text", "").strip():
        return ProviderSmokeResult(
            label=case.label,
            provider_name=provider_name,
            workflow=case.workflow,
            surface=case.surface,
            lane=case.lane,
            status="error",
            latency_ms=latency_ms,
            model=model,
            error="Chat provider returned an empty smoke response",
        )

    text = str(result.text).strip()
    return ProviderSmokeResult(
        label=case.label,
        provider_name=provider_name,
        workflow=case.workflow,
        surface=case.surface,
        lane=case.lane,
        status="ok",
        latency_ms=latency_ms,
        model=getattr(result, "model", None) or model,
        actual_provider=getattr(result, "provider", None) or provider_name,
        mime_type="text/plain",
        output_bytes=len(text.encode("utf-8")),
        estimated_cost=getattr(result, "estimated_cost_usd", None),
        text_preview=_truncate_text_preview(text),
    )


async def run_provider_smoke_suite(
    *,
    registry: ProviderRegistry,
    selected_provider: str = "all",
    selected_surface: str = "all",
    include_failure_probe: bool = True,
    profile: str = "full",
) -> list[ProviderSmokeResult]:
    results: list[ProviderSmokeResult] = []
    gateway = StudioLLMGateway()
    for case in build_default_smoke_cases(
        selected_provider=selected_provider,
        selected_surface=selected_surface,
        include_failure_probe=include_failure_probe,
        profile=profile,
    ):
        if case.surface == "chat":
            results.append(await run_provider_smoke_case(gateway, case))
            continue
        provider = find_provider(registry, case.provider_name)
        if provider is None:
            results.append(
                ProviderSmokeResult(
                    label=case.label,
                    provider_name=case.provider_name,
                    workflow=case.workflow,
                    surface=case.surface,
                    lane=case.lane,
                    status="skipped",
                    latency_ms=0,
                    model=case.model,
                    error="Provider is not registered in this environment",
                )
            )
            continue
        results.append(await run_provider_smoke_case(provider, case))
    return results


def _chat_provider_is_configured(settings: Settings, provider_name: str) -> bool:
    normalized = provider_name.strip().lower()
    if normalized == "gemini":
        return has_configured_secret(settings.gemini_api_key)
    if normalized == "openrouter":
        return has_configured_secret(settings.openrouter_api_key)
    if normalized == "runware":
        return has_configured_secret(settings.runware_api_key)
    if normalized == "openai":
        return has_configured_secret(settings.openai_api_key)
    return False


def _default_chat_smoke_model(settings: Settings, provider_name: str) -> str | None:
    normalized = provider_name.strip().lower()
    if normalized == "gemini":
        return settings.gemini_model
    if normalized == "openrouter":
        return settings.openrouter_model
    if normalized == "runware":
        return settings.runware_chat_model
    if normalized == "openai":
        return settings.openai_model
    return None


def _chat_smoke_runner_name(provider_name: str) -> str:
    normalized = provider_name.strip().lower()
    if normalized == "gemini":
        return "_chat_with_gemini"
    if normalized == "openrouter":
        return "_chat_with_openrouter"
    if normalized == "runware":
        return "_chat_with_runware"
    if normalized == "openai":
        return "_chat_with_openai"
    return ""


def _truncate_text_preview(value: str, limit: int = 120) -> str:
    cleaned = " ".join(value.strip().split())
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[: limit - 1].rstrip()}..."
