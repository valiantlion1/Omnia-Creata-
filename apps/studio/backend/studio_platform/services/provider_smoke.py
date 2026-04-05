from __future__ import annotations

import io
import time
from dataclasses import dataclass
from typing import Optional, Type

from PIL import Image, ImageDraw

from config.env import Settings

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
    status: str
    latency_ms: int
    actual_provider: str | None = None
    mime_type: str | None = None
    output_bytes: int | None = None
    estimated_cost: float | None = None
    error_type: str | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, object]:
        return {
            "label": self.label,
            "provider_name": self.provider_name,
            "workflow": self.workflow,
            "status": self.status,
            "latency_ms": self.latency_ms,
            "actual_provider": self.actual_provider,
            "mime_type": self.mime_type,
            "output_bytes": self.output_bytes,
            "estimated_cost": self.estimated_cost,
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
    include_failure_probe: bool = True,
) -> list[ProviderSmokeCase]:
    normalized_provider = (selected_provider or "all").strip().lower()
    reference_image = build_smoke_reference_image()
    cases: list[ProviderSmokeCase] = []

    if normalized_provider in {"all", "fal"}:
        cases.append(
            ProviderSmokeCase(
                label="fal-text-to-image",
                provider_name="fal",
                workflow="text_to_image",
                prompt="Minimal studio product photograph of a matte ceramic mug on a soft gray backdrop, premium commercial lighting, clean composition, crisp detail.",
            )
        )
        cases.append(
            ProviderSmokeCase(
                label="fal-image-edit",
                provider_name="fal",
                workflow="edit",
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
                    prompt="Attempt edit without a reference image to verify failure mapping.",
                    expected_error_type=ProviderTemporaryError,
                )
            )

    if normalized_provider in {"all", "runware"}:
        cases.append(
            ProviderSmokeCase(
                label="runware-text-to-image",
                provider_name="runware",
                workflow="text_to_image",
                prompt="Premium beauty product packshot on a sculpted stone pedestal, dramatic softbox lighting, luxury campaign style, ultra clean background.",
            )
        )
        if include_failure_probe:
            cases.append(
                ProviderSmokeCase(
                    label="runware-edit-missing-reference-probe",
                    provider_name="runware",
                    workflow="edit",
                    prompt="Attempt edit without a reference image to verify fallback does not silently degrade.",
                    expected_error_type=ProviderTemporaryError,
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
    provider: StudioImageProvider,
    case: ProviderSmokeCase,
) -> ProviderSmokeResult:
    started_at = time.perf_counter()
    if not await provider.is_available():
        return ProviderSmokeResult(
            label=case.label,
            provider_name=case.provider_name,
            workflow=case.workflow,
            status="skipped",
            latency_ms=0,
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
                status="expected_failure",
                latency_ms=latency_ms,
                error_type=exc.__class__.__name__,
                error=str(exc),
            )
        return ProviderSmokeResult(
            label=case.label,
            provider_name=case.provider_name,
            workflow=case.workflow,
            status="error",
            latency_ms=latency_ms,
            error_type=exc.__class__.__name__,
            error=str(exc),
        )

    latency_ms = int((time.perf_counter() - started_at) * 1000)
    if case.expected_error_type is not None:
        return ProviderSmokeResult(
            label=case.label,
            provider_name=case.provider_name,
            workflow=case.workflow,
            status="error",
            latency_ms=latency_ms,
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
        status="ok",
        latency_ms=latency_ms,
        actual_provider=result.provider,
        mime_type=result.mime_type,
        output_bytes=len(result.image_bytes),
        estimated_cost=result.estimated_cost,
    )


async def run_provider_smoke_suite(
    *,
    registry: ProviderRegistry,
    selected_provider: str = "all",
    include_failure_probe: bool = True,
) -> list[ProviderSmokeResult]:
    results: list[ProviderSmokeResult] = []
    for case in build_default_smoke_cases(
        selected_provider=selected_provider,
        include_failure_probe=include_failure_probe,
    ):
        provider = find_provider(registry, case.provider_name)
        if provider is None:
            results.append(
                ProviderSmokeResult(
                    label=case.label,
                    provider_name=case.provider_name,
                    workflow=case.workflow,
                    status="skipped",
                    latency_ms=0,
                    error="Provider is not registered in this environment",
                )
            )
            continue
        results.append(await run_provider_smoke_case(provider, case))
    return results
