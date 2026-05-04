from __future__ import annotations

from .models import CreativeProfileEntry, ModelCatalogEntry
from .studio_model_contract import (
    STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    STUDIO_DEFAULT_IMAGE_MODEL_ID,
    STUDIO_DESIGN_IMAGE_MODEL_ID,
    STUDIO_FAST_MODEL_ID,
    STUDIO_IDEOGRAM_MODEL_ID,
    STUDIO_MULTI_REFERENCE_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID,
    STUDIO_QUICK_IMAGE_MODEL_ID,
    STUDIO_SEEDREAM_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID,
    STUDIO_STANDARD_MODEL_ID,
    STUDIO_TEXT_IMAGE_MODEL_ID,
    normalize_studio_model_id,
)

_MODEL_PROFILE_OVERRIDES: dict[str, dict[str, str]] = {
    STUDIO_DEFAULT_IMAGE_MODEL_ID: {
        "id": "default-image",
        "label": "Nano Banana 2",
        "badge": "Default 2K",
        "description": "The main Studio image lane for modern 2K output, strong prompt following, readable text, and everyday final picks.",
        "default_lane": "standard",
    },
    STUDIO_QUICK_IMAGE_MODEL_ID: {
        "id": "quick-image",
        "label": "Nano Banana",
        "badge": "Quick 1K",
        "description": "A fast 1K lane for chat drafts, quick references, and lower-cost prompt exploration.",
        "default_lane": "draft",
    },
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: {
        "id": "cinematic",
        "label": "Grok Imagine Pro",
        "badge": "Cinematic",
        "description": "A photoreal and cinematic lane for polished editorial scenes, atmospheric realism, and commercial-looking hero images.",
        "default_lane": "final",
    },
    STUDIO_PREMIUM_MODEL_ID: {
        "id": "premium-final",
        "label": "FLUX.2 Max",
        "badge": "Premium final",
        "description": "A flagship final-pick lane for high-control production renders, reference-guided hero shots, and the highest-polish selections.",
        "default_lane": "final",
    },
    STUDIO_MULTI_REFERENCE_MODEL_ID: {
        "id": "multi-reference",
        "label": "Wan 2.7 Image Pro",
        "badge": "Multi-reference",
        "description": "A production lane for preserving people, products, style cues, and composition across one or more references.",
        "default_lane": "final",
    },
    STUDIO_TEXT_IMAGE_MODEL_ID: {
        "id": "text-layout",
        "label": "GPT Image 2",
        "badge": "Text and layout",
        "description": "An instruction-heavy lane for text, logos, layout-aware prompts, and cases where live quote pricing matters.",
        "default_lane": "final",
    },
    STUDIO_DESIGN_IMAGE_MODEL_ID: {
        "id": "design",
        "label": "Recraft V4",
        "badge": "Design",
        "description": "A design and marketing lane for tasteful 1K brand assets, product compositions, and controlled visual language.",
        "default_lane": "standard",
    },
    STUDIO_IDEOGRAM_MODEL_ID: {
        "id": "typography",
        "label": "Ideogram 3.0",
        "badge": "Typography",
        "description": "A text-forward lane for posters, logos, and graphic layouts where readable words are part of the image.",
        "default_lane": "final",
    },
    STUDIO_SEEDREAM_MODEL_ID: {
        "id": "precision-edit",
        "label": "Seedream 4.5",
        "badge": "Precision edit",
        "description": "A high-fidelity multi-reference lane for precise 2K to 4K composition, small text, and design-heavy edits.",
        "default_lane": "final",
    },
    STUDIO_FAST_MODEL_ID: {
        "id": "internal-fast",
        "label": "FLUX.2 Klein",
        "badge": "Internal fast",
        "description": "Internal compatibility fast-preview lane for legacy requests and development routing checks.",
        "default_lane": "draft",
    },
    STUDIO_STANDARD_MODEL_ID: {
        "id": "internal-standard",
        "label": "Qwen Image 2512",
        "badge": "Internal standard",
        "description": "Internal compatibility standard lane for Qwen-specific regression coverage.",
        "default_lane": "standard",
    },
    STUDIO_SIGNATURE_MODEL_ID: {
        "id": "signature-hold",
        "label": "FLUX.2 Flex",
        "badge": "Internal hold",
        "description": "An internal hold/manual lane for advanced brand-system visuals; it is not public self-serve.",
        "default_lane": "final",
    },
}

_LANE_PROFILE_FALLBACKS: dict[str, dict[str, str]] = {
    "draft": {
        "id": "quick-image",
        "label": "Quick",
        "badge": "Quick start",
        "description": "A quick lane for early exploration when speed matters more than a heavy finishing pass.",
        "default_lane": "draft",
    },
    "standard": {
        "id": "default-image",
        "label": "Standard",
        "badge": "Default final",
        "description": "A balanced modern lane for versatile creative work without pushing into specialist finishing cost.",
        "default_lane": "standard",
    },
    "final": {
        "id": "premium-final",
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
