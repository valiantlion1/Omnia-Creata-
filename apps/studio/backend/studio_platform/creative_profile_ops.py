from __future__ import annotations

from .models import CreativeProfileEntry, ModelCatalogEntry
from .studio_model_contract import (
    STUDIO_FLUX_STRONG_MODEL_ID,
    STUDIO_GPT_IMAGE_2_MODEL_ID,
    STUDIO_GROK_IMAGINE_IMAGE_PRO_MODEL_ID,
    STUDIO_NANO_BANANA_2_MODEL_ID,
    STUDIO_NANO_BANANA_MODEL_ID,
    STUDIO_WAN_27_IMAGE_PRO_MODEL_ID,
    normalize_studio_model_id,
)

_MODEL_PROFILE_OVERRIDES: dict[str, dict[str, str]] = {
    STUDIO_GPT_IMAGE_2_MODEL_ID: {
        "id": "gpt-image-2",
        "label": "GPT Image 2",
        "badge": "Modern base",
        "description": "Modern OpenAI image generation through Runware for fast starts, edits, and everyday Studio work.",
        "default_lane": "draft",
    },
    STUDIO_NANO_BANANA_MODEL_ID: {
        "id": "nano-banana",
        "label": "Nano Banana",
        "badge": "Everyday polish",
        "description": "A polished everyday model for chat-led creation, variations, and clean social or product visuals.",
        "default_lane": "standard",
    },
    STUDIO_NANO_BANANA_2_MODEL_ID: {
        "id": "nano-banana-2",
        "label": "Nano Banana 2",
        "badge": "Premium polish",
        "description": "A higher-quality Nano Banana lane for final picks and premium creative output.",
        "default_lane": "final",
    },
    STUDIO_GROK_IMAGINE_IMAGE_PRO_MODEL_ID: {
        "id": "grok-imagine-image-pro",
        "label": "Grok Imagine Image Pro",
        "badge": "Image Pro",
        "description": "A premium model for cinematic, social, and campaign-style outputs where the user wants a named pro lane.",
        "default_lane": "final",
    },
    STUDIO_WAN_27_IMAGE_PRO_MODEL_ID: {
        "id": "wan-2-7-image-pro",
        "label": "Wan 2.7 Image Pro",
        "badge": "Image Pro",
        "description": "A high-end Wan image lane for explicit premium selections and stronger final-generation workflows.",
        "default_lane": "final",
    },
    STUDIO_FLUX_STRONG_MODEL_ID: {
        "id": "flux-2-max",
        "label": "FLUX.2 Max",
        "badge": "Strongest FLUX",
        "description": "The strongest FLUX lane in the launch catalog for premium campaign visuals and reference-heavy final picks.",
        "default_lane": "final",
    },
}

_LANE_PROFILE_FALLBACKS: dict[str, dict[str, str]] = {
    "draft": {
        "id": "fast",
        "label": "Fast",
        "badge": "Quick starts",
        "description": "A quick lane for early exploration when speed matters more than a heavy finishing pass.",
        "default_lane": "draft",
    },
    "standard": {
        "id": "standard",
        "label": "Standard",
        "badge": "Everyday detail",
        "description": "A balanced lane for versatile creative work without pushing into premium finishing cost.",
        "default_lane": "standard",
    },
    "final": {
        "id": "premium",
        "label": "Premium",
        "badge": "Presentation ready",
        "description": "A higher-fidelity lane for premium outputs, final selections, and presentation-ready results.",
        "default_lane": "final",
    },
    "fallback": {
        "id": "preview",
        "label": "Preview",
        "badge": "Fallback lane",
        "description": "A lighter temporary lane Studio uses when the main image routes are unavailable.",
        "default_lane": "fallback",
    },
    "degraded": {
        "id": "limited",
        "label": "Limited",
        "badge": "Temporary fallback",
        "description": "A reduced-capability lane used only while managed image routes are unavailable.",
        "default_lane": "degraded",
    },
}

_DEFAULT_PROFILE = {
    "id": "studio-render",
    "label": "Studio",
    "badge": "Creative default",
    "description": "A general Studio quality lane used when no model-specific profile is available.",
    "default_lane": "standard",
}


def resolve_creative_profile(
    *,
    model_id: str | None = None,
    pricing_lane: str | None = None,
    existing_profile: CreativeProfileEntry | None = None,
) -> CreativeProfileEntry:
    if existing_profile is not None:
        return existing_profile.model_copy(deep=True)

    normalized_model_id = normalize_studio_model_id(model_id)
    if normalized_model_id in _MODEL_PROFILE_OVERRIDES:
        return CreativeProfileEntry.model_validate(_MODEL_PROFILE_OVERRIDES[normalized_model_id])

    normalized_lane = (pricing_lane or "").strip().lower()
    if normalized_lane in _LANE_PROFILE_FALLBACKS:
        return CreativeProfileEntry.model_validate(_LANE_PROFILE_FALLBACKS[normalized_lane])

    return CreativeProfileEntry.model_validate(_DEFAULT_PROFILE)


def attach_creative_profile(model: ModelCatalogEntry) -> ModelCatalogEntry:
    resolved = model.model_copy(deep=True)
    resolved.creative_profile = resolve_creative_profile(
        model_id=resolved.id,
        pricing_lane=None,
        existing_profile=resolved.creative_profile,
    )
    return resolved
