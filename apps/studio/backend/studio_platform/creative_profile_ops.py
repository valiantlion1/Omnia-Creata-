from __future__ import annotations

from .models import CreativeProfileEntry, ModelCatalogEntry
from .studio_model_contract import (
    STUDIO_FAST_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID,
    STUDIO_STANDARD_MODEL_ID,
    normalize_studio_model_id,
)

_MODEL_PROFILE_OVERRIDES: dict[str, dict[str, str]] = {
    STUDIO_FAST_MODEL_ID: {
        "id": "fast",
        "label": "Fast",
        "badge": "Quick starts",
        "description": "Quick starts for ideas, composition checks, and modern low-latency variations without making the result feel throwaway.",
        "default_lane": "draft",
    },
    STUDIO_STANDARD_MODEL_ID: {
        "id": "standard",
        "label": "Standard",
        "badge": "Everyday detail",
        "description": "A balanced quality lane for everyday work when you want cleaner detail and dependable modern final picks.",
        "default_lane": "standard",
    },
    STUDIO_PREMIUM_MODEL_ID: {
        "id": "premium",
        "label": "Premium",
        "badge": "Presentation ready",
        "description": "A richer production lane with cleaner lighting, stronger materials, and presentation-ready polish.",
        "default_lane": "final",
    },
    STUDIO_SIGNATURE_MODEL_ID: {
        "id": "signature",
        "label": "Signature",
        "badge": "Internal advanced",
        "description": "An internal advanced lane for layout-critical, typography-heavy, and brand-system visuals.",
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
