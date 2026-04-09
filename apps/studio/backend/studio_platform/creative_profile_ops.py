from __future__ import annotations

from .models import CreativeProfileEntry, ModelCatalogEntry

_MODEL_PROFILE_OVERRIDES: dict[str, dict[str, str]] = {
    "flux-schnell": {
        "id": "fast-draft",
        "label": "Fast Draft",
        "badge": "Quick ideas",
        "description": "Best for rapid concept passes, early exploration, and lightweight prompt iteration.",
        "default_lane": "draft",
    },
    "sdxl-base": {
        "id": "balanced-render",
        "label": "Balanced Render",
        "badge": "Everyday quality",
        "description": "A steadier all-purpose render profile for clean compositions and everyday creative work.",
        "default_lane": "standard",
    },
    "realvis-xl": {
        "id": "polished-realism",
        "label": "Polished Realism",
        "badge": "Premium final",
        "description": "Sharper realism tuned for presentation-ready images, client previews, and polished outputs.",
        "default_lane": "final",
    },
    "juggernaut-xl": {
        "id": "cinematic-detail",
        "label": "Cinematic Detail",
        "badge": "Hero frames",
        "description": "Higher drama and richer detail for showcase visuals, hero shots, and premium final passes.",
        "default_lane": "final",
    },
}

_LANE_PROFILE_FALLBACKS: dict[str, dict[str, str]] = {
    "draft": {
        "id": "fast-draft",
        "label": "Fast Draft",
        "badge": "Quick ideas",
        "description": "A quick concept profile for trying ideas before committing to a more polished render.",
        "default_lane": "draft",
    },
    "standard": {
        "id": "balanced-render",
        "label": "Balanced Render",
        "badge": "Everyday quality",
        "description": "A balanced render profile for versatile creative work without pushing into premium final cost.",
        "default_lane": "standard",
    },
    "final": {
        "id": "premium-final",
        "label": "Premium Final",
        "badge": "Presentation ready",
        "description": "A higher-fidelity profile for premium outputs, final selects, and presentation-ready results.",
        "default_lane": "final",
    },
    "fallback": {
        "id": "preview-render",
        "label": "Preview Render",
        "badge": "Fallback preview",
        "description": "A lighter preview profile used when Studio falls back to a non-launch-grade image route.",
        "default_lane": "fallback",
    },
    "degraded": {
        "id": "degraded-preview",
        "label": "Degraded Preview",
        "badge": "Temporary fallback",
        "description": "A degraded preview profile used only when premium or managed image routes are unavailable.",
        "default_lane": "degraded",
    },
}

_DEFAULT_PROFILE = {
    "id": "studio-render",
    "label": "Studio Render",
    "badge": "Creative default",
    "description": "A general Studio render profile for creative work when no model-specific profile is available.",
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

    normalized_model_id = (model_id or "").strip().lower()
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
