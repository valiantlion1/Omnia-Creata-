from __future__ import annotations

from typing import Any

from .billing_ops import BillingStateSnapshot
from .creative_profile_ops import attach_creative_profile, resolve_creative_profile
from .experience_contract_ops import build_model_route_preview
from .models import IdentityPlan, ModelCatalogEntry, OmniaIdentity

MODEL_CATALOG: dict[str, ModelCatalogEntry] = {
    "flux-schnell": ModelCatalogEntry(
        id="flux-schnell",
        label="Fast",
        description="High-speed model for rapid ideation and layout testing.",
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
        description="Balanced generation engine for standard high-quality compositions.",
        min_plan=IdentityPlan.FREE,
        credit_cost=8,
        estimated_cost=0.008,
        max_width=1024,
        max_height=1024,
        runtime="cloud",
        provider_hint="managed",
    ),
    "realvis-xl": ModelCatalogEntry(
        id="realvis-xl",
        label="Premium",
        description="Advanced engine tuned for photorealism and cinematic renders.",
        min_plan=IdentityPlan.CREATOR,
        credit_cost=12,
        estimated_cost=0.015,
        max_width=1536,
        max_height=1536,
        featured=True,
        runtime="cloud",
        provider_hint="managed",
    ),
    "juggernaut-xl": ModelCatalogEntry(
        id="juggernaut-xl",
        label="Pro",
        description="Powerful engine delivering extreme detail for stylized hero shots.",
        min_plan=IdentityPlan.PRO,
        credit_cost=14,
        estimated_cost=0.02,
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
