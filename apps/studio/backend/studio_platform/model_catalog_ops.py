from __future__ import annotations

from typing import Any

from .billing_ops import BillingStateSnapshot
from .creative_profile_ops import attach_creative_profile, resolve_creative_profile
from .experience_contract_ops import build_model_route_preview
from .models import IdentityPlan, ModelCatalogEntry, OmniaIdentity
from .studio_model_contract import (
    STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    STUDIO_DEFAULT_IMAGE_MODEL_ID,
    STUDIO_DESIGN_IMAGE_MODEL_ID,
    STUDIO_FAST_MODEL_ID,
    STUDIO_IDEOGRAM_MODEL_ID,
    STUDIO_MULTI_REFERENCE_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID,
    STUDIO_PUBLIC_MODEL_IDS,
    STUDIO_QUICK_IMAGE_MODEL_ID,
    STUDIO_SEEDREAM_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID,
    STUDIO_STANDARD_MODEL_ID,
    STUDIO_TEXT_IMAGE_MODEL_ID,
    normalize_studio_model_id,
)

SUPPORTED_ASPECT_RATIOS: dict[str, tuple[int, int]] = {
    "1:1": (1, 1),
    "16:9": (16, 9),
    "9:16": (9, 16),
    "4:5": (4, 5),
    "3:4": (3, 4),
    "2:3": (2, 3),
    "3:2": (3, 2),
}
_DIMENSION_MULTIPLE = 64
_MODEL_ASPECT_DIMENSIONS: dict[str, dict[str, tuple[int, int]]] = {
    STUDIO_QUICK_IMAGE_MODEL_ID: {
        "1:1": (1024, 1024),
        "16:9": (1344, 768),
        "9:16": (768, 1344),
        "4:5": (896, 1152),
        "3:4": (864, 1184),
        "2:3": (832, 1248),
        "3:2": (1248, 832),
    },
    STUDIO_DEFAULT_IMAGE_MODEL_ID: {
        "1:1": (2048, 2048),
        "16:9": (2752, 1536),
        "9:16": (1536, 2752),
        "4:5": (1856, 2304),
        "3:4": (1792, 2400),
        "2:3": (1696, 2528),
        "3:2": (2528, 1696),
    },
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: {
        "1:1": (2048, 2048),
        "16:9": (2816, 1536),
        "9:16": (1536, 2816),
        "4:5": (1792, 2304),
        "3:4": (1792, 2560),
        "2:3": (1728, 2592),
        "3:2": (2592, 1728),
    },
    STUDIO_MULTI_REFERENCE_MODEL_ID: {
        "1:1": (2048, 2048),
        "16:9": (2560, 1440),
        "9:16": (1440, 2560),
        "4:5": (1728, 2160),
        "3:4": (1728, 2304),
        "2:3": (1664, 2496),
        "3:2": (2496, 1664),
    },
    STUDIO_SEEDREAM_MODEL_ID: {
        "1:1": (2048, 2048),
        "16:9": (2560, 1440),
        "9:16": (1440, 2560),
        "4:5": (1728, 2160),
        "3:4": (1728, 2304),
        "2:3": (1664, 2496),
        "3:2": (2496, 1664),
    },
    STUDIO_DESIGN_IMAGE_MODEL_ID: {
        "1:1": (1024, 1024),
        "16:9": (1344, 768),
        "9:16": (768, 1344),
        "4:5": (896, 1152),
        "3:4": (896, 1216),
        "2:3": (832, 1280),
        "3:2": (1280, 832),
    },
}

# Model catalog
# estimated_cost is the conservative fallback when the provider does not return
# a live cost quote for the exact request. Public Studio output now exposes
# named modern models instead of hiding everything behind the older four-lane
# Fast/Standard/Premium/Signature shell.
#
# Official/public anchors refreshed on 2026-05-02:
#   Nano Banana          google:4@1                    $0.039 / 1K image
#   Nano Banana 2        google:4@3                    $0.06895 1K, $0.10255 2K, $0.15295 4K
#   Grok Imagine Pro     xai:grok-imagine@image-pro    $0.07 / text image, ~$0.072 edit
#   FLUX.2 Max           bfl:7@1                       $0.07 first MP + $0.03 / extra or ref MP
#   Wan 2.7 Image Pro    alibaba:wan@2.7-image-pro     $0.075 / image
#   GPT Image 2          openai:gpt-image@2            live provider quote preferred
#   Recraft V4           recraft:v4@0                  $0.04 / 1K image
#   Ideogram 3.0         ideogram:4@1                  $0.06 / image
#   Seedream 4.5         bytedance:seedream@4.5        $0.04 / 2K or 4K image

MODEL_CATALOG: dict[str, ModelCatalogEntry] = {
    STUDIO_DEFAULT_IMAGE_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_DEFAULT_IMAGE_MODEL_ID,
        label="Nano Banana 2",
        description="Default Studio final lane for modern 2K image generation, prompt following, readable text, and strong everyday creative output.",
        min_plan=IdentityPlan.FREE,
        credit_cost=20,
        estimated_cost=0.10255,
        max_width=4096,
        max_height=4096,
        featured=True,
        runtime="cloud",
        provider_hint="runware",
        source_id="google:4@3",
        license_reference="Runware Google Nano Banana 2",
    ),
    STUDIO_QUICK_IMAGE_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_QUICK_IMAGE_MODEL_ID,
        label="Nano Banana",
        description="Quick 1K visual drafting for chat-first ideas, lightweight references, and low-friction prompt exploration.",
        min_plan=IdentityPlan.FREE,
        credit_cost=10,
        estimated_cost=0.039,
        max_width=1536,
        max_height=1536,
        runtime="cloud",
        provider_hint="runware",
        source_id="google:4@1",
        license_reference="Runware Google Nano Banana",
    ),
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_CINEMATIC_IMAGE_MODEL_ID,
        label="Grok Imagine Pro",
        description="Photoreal and cinematic image lane for polished editorial scenes, atmospheric realism, and commercial-looking hero images.",
        min_plan=IdentityPlan.FREE,
        credit_cost=16,
        estimated_cost=0.07,
        max_width=2816,
        max_height=2816,
        featured=True,
        runtime="cloud",
        provider_hint="runware",
        source_id="xai:grok-imagine@image-pro",
        license_reference="Runware xAI Grok Imagine Image Pro",
    ),
    STUDIO_PREMIUM_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_PREMIUM_MODEL_ID,
        label="FLUX.2 Max",
        description="Premium final-pick lane for high-control hero shots, reference-guided production renders, and flagship visual polish.",
        min_plan=IdentityPlan.CREATOR,
        credit_cost=20,
        estimated_cost=0.16,
        max_width=2048,
        max_height=2048,
        featured=True,
        runtime="cloud",
        provider_hint="runware",
        source_id="bfl:7@1",
        license_reference="Runware Black Forest Labs FLUX.2 Max",
    ),
    STUDIO_MULTI_REFERENCE_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_MULTI_REFERENCE_MODEL_ID,
        label="Wan 2.7 Image Pro",
        description="Multi-reference and edit-capable production lane for preserving people, objects, style cues, and composition across references.",
        min_plan=IdentityPlan.CREATOR,
        credit_cost=20,
        estimated_cost=0.075,
        max_width=4096,
        max_height=4096,
        runtime="cloud",
        provider_hint="runware",
        source_id="alibaba:wan@2.7-image-pro",
        license_reference="Runware Alibaba Wan 2.7 Image Pro",
    ),
    STUDIO_TEXT_IMAGE_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_TEXT_IMAGE_MODEL_ID,
        label="GPT Image 2",
        description="Instruction-heavy text, layout, and logo-aware image lane. Studio uses live provider cost quotes when this lane is selected.",
        min_plan=IdentityPlan.CREATOR,
        credit_cost=24,
        estimated_cost=0.12,
        max_width=2048,
        max_height=2048,
        runtime="cloud",
        provider_hint="runware",
        source_id="openai:gpt-image@2",
        license_reference="Runware OpenAI GPT Image 2",
    ),
    STUDIO_DESIGN_IMAGE_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_DESIGN_IMAGE_MODEL_ID,
        label="Recraft V4",
        description="Design and marketing visual lane for tasteful 1K brand assets, product compositions, and controlled visual language.",
        min_plan=IdentityPlan.FREE,
        credit_cost=10,
        estimated_cost=0.04,
        max_width=1536,
        max_height=1536,
        runtime="cloud",
        provider_hint="runware",
        source_id="recraft:v4@0",
        license_reference="Runware Recraft V4",
    ),
    STUDIO_IDEOGRAM_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_IDEOGRAM_MODEL_ID,
        label="Ideogram 3.0",
        description="Text-forward poster, logo, typography, and graphic-layout lane when readable words matter more than photoreal polish.",
        min_plan=IdentityPlan.CREATOR,
        credit_cost=14,
        estimated_cost=0.06,
        max_width=2048,
        max_height=2048,
        runtime="cloud",
        provider_hint="runware",
        source_id="ideogram:4@1",
        license_reference="Runware Ideogram 3.0",
    ),
    STUDIO_SEEDREAM_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_SEEDREAM_MODEL_ID,
        label="Seedream 4.5",
        description="High-fidelity multi-reference lane for precise 2K to 4K composition, small text, and design-heavy image edits.",
        min_plan=IdentityPlan.CREATOR,
        credit_cost=18,
        estimated_cost=0.04,
        max_width=4096,
        max_height=4096,
        runtime="cloud",
        provider_hint="runware",
        source_id="bytedance:seedream@4.5",
        license_reference="Runware ByteDance Seedream 4.5",
    ),
    STUDIO_FAST_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_FAST_MODEL_ID,
        label="FLUX.2 Klein",
        description="Internal compatibility lane for older fast-preview requests and development zero-cost routing checks.",
        min_plan=IdentityPlan.FREE,
        credit_cost=4,
        estimated_cost=0.001,
        max_width=1024,
        max_height=1024,
        runtime="cloud",
        provider_hint="runware",
        source_id="runware:400@2",
    ),
    STUDIO_STANDARD_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_STANDARD_MODEL_ID,
        label="Qwen Image 2512",
        description="Internal compatibility lane for older standard requests and Qwen-specific proof coverage.",
        min_plan=IdentityPlan.FREE,
        credit_cost=8,
        estimated_cost=0.0051,
        max_width=1536,
        max_height=1536,
        runtime="cloud",
        provider_hint="runware",
        source_id="alibaba:qwen-image@2512",
    ),
    STUDIO_SIGNATURE_MODEL_ID: ModelCatalogEntry(
        id=STUDIO_SIGNATURE_MODEL_ID,
        label="FLUX.2 Flex",
        description="Internal hold/manual lane for advanced brand-system work. It is not part of the public self-serve catalog.",
        min_plan=IdentityPlan.PRO,
        credit_cost=40,
        estimated_cost=0.060,
        max_width=2048,
        max_height=2048,
        runtime="cloud",
        owner_only=True,
        provider_hint="runware",
        source_id="bfl:6@1",
    ),
}


def list_model_catalog_entries() -> list[ModelCatalogEntry]:
    return [
        attach_creative_profile(MODEL_CATALOG[model_id])
        for model_id in STUDIO_PUBLIC_MODEL_IDS
        if model_id in MODEL_CATALOG
    ]


def get_model_catalog_entry(model_id: str) -> ModelCatalogEntry | None:
    model = MODEL_CATALOG.get(normalize_studio_model_id(model_id))
    if model is None:
        return None
    return attach_creative_profile(model)


def get_model_catalog_entry_or_raise(model_id: str) -> ModelCatalogEntry:
    model = get_model_catalog_entry(model_id)
    if model is None:
        raise KeyError("Model not found")
    return model


def serialize_model_catalog_for_identity(
    *,
    identity: OmniaIdentity,
    model: ModelCatalogEntry,
    providers,
    billing_state: BillingStateSnapshot | None = None,
) -> dict[str, Any]:
    effective_plan = billing_state.effective_plan if billing_state is not None else identity.plan
    creative_profile = resolve_creative_profile(
        model_id=model.id,
        pricing_lane=None,
        existing_profile=model.creative_profile,
    )
    route_preview = build_model_route_preview(
        model=model,
        identity_plan=effective_plan,
        providers=providers,
        wallet_backed=effective_plan == IdentityPlan.FREE and max(int(identity.extra_credits or 0), 0) > 0,
    )
    serialized = model.model_dump(mode="json")
    serialized["label"] = creative_profile.label
    serialized["description"] = creative_profile.description
    serialized["creative_profile"] = creative_profile.model_dump(mode="json")
    serialized["display_label"] = creative_profile.label
    serialized["display_badge"] = creative_profile.badge
    serialized["display_description"] = creative_profile.description
    serialized["render_experience"] = dict(route_preview["render_experience"])
    serialized["route_preview"] = route_preview
    return serialized


def validate_model_for_identity(
    *,
    identity: OmniaIdentity,
    model: ModelCatalogEntry,
    billing_state: BillingStateSnapshot | None = None,
) -> None:
    effective_plan = billing_state.effective_plan if billing_state is not None else identity.plan
    if effective_plan == IdentityPlan.FREE and model.min_plan in {IdentityPlan.CREATOR, IdentityPlan.PRO}:
        required_label = "Creator" if model.min_plan == IdentityPlan.CREATOR else "Pro"
        raise PermissionError(f"This model requires {required_label}")
    if effective_plan == IdentityPlan.CREATOR and model.min_plan == IdentityPlan.PRO:
        raise PermissionError("This model requires Pro")
    if effective_plan == IdentityPlan.GUEST:
        raise PermissionError("Guests cannot generate images")
    if model.owner_only and not (identity.owner_mode or identity.root_admin or identity.local_access):
        raise PermissionError("This model is not available for self-serve generation")


def validate_dimensions_for_model(
    *,
    width: int,
    height: int,
    model: ModelCatalogEntry,
) -> None:
    if width > model.max_width or height > model.max_height:
        creative_profile = resolve_creative_profile(
            model_id=model.id,
            pricing_lane=None,
            existing_profile=model.creative_profile,
        )
        raise ValueError(
            f"{creative_profile.label} supports up to {model.max_width}x{model.max_height}"
        )


def normalize_generation_aspect_ratio(aspect_ratio: str | None) -> str:
    normalized = str(aspect_ratio or "1:1").strip()
    if normalized not in SUPPORTED_ASPECT_RATIOS:
        supported = ", ".join(SUPPORTED_ASPECT_RATIOS.keys())
        raise ValueError(f"Unsupported aspect ratio. Choose one of: {supported}")
    return normalized


def _snap_dimension(value: float, *, maximum: int) -> int:
    bounded = max(1.0, min(float(maximum), float(value)))
    snapped = int(round(bounded / _DIMENSION_MULTIPLE) * _DIMENSION_MULTIPLE)
    if snapped > maximum:
        snapped -= _DIMENSION_MULTIPLE
    if snapped <= 0:
        return min(maximum, _DIMENSION_MULTIPLE)
    return min(maximum, snapped)


def resolve_generation_dimensions_for_model(
    *,
    model: ModelCatalogEntry,
    aspect_ratio: str,
) -> tuple[int, int]:
    normalized_ratio = normalize_generation_aspect_ratio(aspect_ratio)
    model_dimensions = _MODEL_ASPECT_DIMENSIONS.get(normalize_studio_model_id(model.id))
    if model_dimensions is not None and normalized_ratio in model_dimensions:
        width, height = model_dimensions[normalized_ratio]
        validate_dimensions_for_model(width=width, height=height, model=model)
        return width, height

    ratio_width, ratio_height = SUPPORTED_ASPECT_RATIOS[normalized_ratio]
    scale = min(model.max_width / ratio_width, model.max_height / ratio_height)
    if scale <= 0:
        raise ValueError("Model dimensions are not configured for generation.")

    width = _snap_dimension(ratio_width * scale, maximum=model.max_width)
    height = _snap_dimension(ratio_height * scale, maximum=model.max_height)
    validate_dimensions_for_model(width=width, height=height, model=model)
    return width, height
