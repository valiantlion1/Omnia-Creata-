from studio_platform.creative_profile_ops import attach_creative_profile, resolve_creative_profile
from studio_platform.models import IdentityPlan, ModelCatalogEntry


def test_resolve_creative_profile_prefers_model_specific_mapping() -> None:
    profile = resolve_creative_profile(model_id="realvis-xl", pricing_lane="fallback")

    assert profile.id == "polished-realism"
    assert profile.label == "Polished Realism"
    assert profile.default_lane == "final"


def test_resolve_creative_profile_falls_back_to_lane_when_model_is_unknown() -> None:
    profile = resolve_creative_profile(model_id="unknown-model", pricing_lane="fallback")

    assert profile.id == "preview-render"
    assert profile.label == "Preview Render"
    assert profile.default_lane == "fallback"


def test_attach_creative_profile_enriches_model_catalog_entry() -> None:
    model = ModelCatalogEntry(
        id="flux-schnell",
        label="Flux Schnell",
        description="Fast ideation model",
        min_plan=IdentityPlan.FREE,
        credit_cost=6,
        estimated_cost=0.003,
        max_width=1024,
        max_height=1024,
    )

    enriched = attach_creative_profile(model)

    assert enriched.creative_profile is not None
    assert enriched.creative_profile.id == "fast-draft"
    assert enriched.creative_profile.badge == "Quick ideas"
