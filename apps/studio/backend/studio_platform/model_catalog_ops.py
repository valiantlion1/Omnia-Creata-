from __future__ import annotations

from typing import Any

from .billing_ops import BillingStateSnapshot
from .creative_profile_ops import attach_creative_profile, resolve_creative_profile
from .experience_contract_ops import build_model_route_preview
from .models import IdentityPlan, ModelCatalogEntry, OmniaIdentity

SUPPORTED_ASPECT_RATIOS: dict[str, tuple[int, int]] = {
    "1:1": (1, 1),
    "16:9": (16, 9),
    "9:16": (9, 16),
    "4:5": (4, 5),
    "3:4": (3, 4),
    "2:3": (2, 3),
}
_DIMENSION_MULTIPLE = 64

# ── Model catalog ──
# estimated_cost reflects Runware-first pricing (primary provider).
# Values are set slightly above observed Runware API costs to stay conservative
# for stop-loss guardrail evaluation. Runware returns actual cost per call;
# these estimates are fallbacks for forecasting and credit guides.
#
# Runware observed costs (2026-04):
#   flux-schnell  ~$0.002-0.003/image
#   sdxl-base     ~$0.003-0.005/image
#   realvis-xl    ~$0.005-0.008/image
#   juggernaut-xl ~$0.008-0.012/image
#
# Credit cost rationale (Pro floor $0.02/credit):
#   Fast 6cr      -> $0.12 revenue, $0.003 cost -> 97% margin
#   Standard 8cr  -> $0.16 revenue, $0.005 cost -> 97% margin
#   Premium 12cr  -> $0.24 revenue, $0.010 cost -> 96% margin
#   Signature 14cr-> $0.28 revenue, $0.012 cost -> 96% margin

MODEL_CATALOG: dict[str, ModelCatalogEntry] = {
    "flux-schnell": ModelCatalogEntry(
        id="flux-schnell",
        label="Fast",
        description="Quick starts for ideas, layout checks, and fast variations.",
        min_plan=IdentityPlan.FREE,
        credit_cost=6,
        estimated_cost=0.003,
        max_width=1024,
        max_height=1024,
        featured=True,
        runtime="cloud",
        provider_hint="managed",
    ),
    "sdxl-base": ModelCatalogEntry(
        id="sdxl-base",
        label="Standard",
        description="Balanced quality for everyday creative work and dependable detail.",
        min_plan=IdentityPlan.FREE,
        credit_cost=8,
        estimated_cost=0.005,
        max_width=1024,
        max_height=1024,
        runtime="cloud",
        provider_hint="managed",
    ),
    "realvis-xl": ModelCatalogEntry(
        id="realvis-xl",
        label="Premium",
        description="Richer detail and cleaner finish when the result needs to look polished.",
        min_plan=IdentityPlan.CREATOR,
        credit_cost=12,
        estimated_cost=0.010,
        max_width=1536,
        max_height=1536,
        featured=True,
        runtime="cloud",
        provider_hint="managed",
    ),
    "juggernaut-xl": ModelCatalogEntry(
        id="juggernaut-xl",
        label="Signature",
        description="Internal advanced finish for special high-detail runs.",
        min_plan=IdentityPlan.PRO,
        credit_cost=14,
        estimated_cost=0.012,
        max_width=1536,
        max_height=1536,
        runtime="cloud",
        provider_hint="managed",
    ),
}


def list_model_catalog_entries() -> list[ModelCatalogEntry]:
    return [attach_creative_profile(model) for model in MODEL_CATALOG.values()]


def get_model_catalog_entry(model_id: str) -> ModelCatalogEntry | None:
    model = MODEL_CATALOG.get(model_id)
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
    ratio_width, ratio_height = SUPPORTED_ASPECT_RATIOS[normalized_ratio]
    scale = min(model.max_width / ratio_width, model.max_height / ratio_height)
    if scale <= 0:
        raise ValueError("Model dimensions are not configured for generation.")

    width = _snap_dimension(ratio_width * scale, maximum=model.max_width)
    height = _snap_dimension(ratio_height * scale, maximum=model.max_height)
    validate_dimensions_for_model(width=width, height=height, model=model)
    return width, height
