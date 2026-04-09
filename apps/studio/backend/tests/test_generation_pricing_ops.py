from __future__ import annotations

from studio_platform.generation_pricing_ops import build_generation_pricing_quote
from studio_platform.models import IdentityPlan, ModelCatalogEntry
from studio_platform.providers import GenerationRoutingDecision


def _model(
    model_id: str,
    *,
    credit_cost: int,
    estimated_cost: float,
    min_plan: IdentityPlan = IdentityPlan.FREE,
) -> ModelCatalogEntry:
    return ModelCatalogEntry(
        id=model_id,
        label=model_id,
        description=f"{model_id} test model",
        min_plan=min_plan,
        credit_cost=credit_cost,
        estimated_cost=estimated_cost,
        max_width=1536,
        max_height=1536,
        runtime="cloud",
        provider_hint="managed",
    )


def _decision(
    *,
    workflow: str,
    selected_provider: str,
    provider_candidates: tuple[str, ...],
    degraded: bool = False,
    requested_quality_tier: str = "standard",
    selected_quality_tier: str = "standard",
) -> GenerationRoutingDecision:
    return GenerationRoutingDecision(
        workflow=workflow,
        requested_quality_tier=requested_quality_tier,
        selected_quality_tier=selected_quality_tier,
        degraded=degraded,
        routing_strategy="balanced",
        routing_reason="test",
        prompt_profile="generic",
        provider_candidates=provider_candidates,
        selected_provider=selected_provider,
    )


def test_openai_draft_route_uses_provider_quote_and_draft_lane() -> None:
    quote = build_generation_pricing_quote(
        selected_provider="openai",
        routing_decision=_decision(
            workflow="text_to_image",
            selected_provider="openai",
            provider_candidates=("openai", "fal", "runware"),
            requested_quality_tier="premium",
            selected_quality_tier="premium",
        ),
        requested_model_id="flux-schnell",
        workflow="text_to_image",
        width=1024,
        height=1024,
        output_count=2,
        provider_estimated_cost=0.009,
        legacy_model=_model("flux-schnell", credit_cost=6, estimated_cost=0.003),
    )

    assert quote.pricing_lane == "draft"
    assert quote.estimated_cost_source == "provider_quote"
    assert quote.estimated_cost == 0.018
    assert quote.credit_cost == 12
    assert quote.reserved_credit_cost == 12


def test_openai_edit_route_forces_final_lane_with_provider_quote() -> None:
    quote = build_generation_pricing_quote(
        selected_provider="openai",
        routing_decision=_decision(
            workflow="edit",
            selected_provider="openai",
            provider_candidates=("openai", "fal"),
            requested_quality_tier="premium",
            selected_quality_tier="premium",
        ),
        requested_model_id="flux-schnell",
        workflow="edit",
        width=1024,
        height=1536,
        output_count=1,
        provider_estimated_cost=0.2,
        legacy_model=_model("flux-schnell", credit_cost=6, estimated_cost=0.003),
    )

    assert quote.pricing_lane == "final"
    assert quote.estimated_cost_source == "provider_quote"
    assert quote.estimated_cost == 0.2
    assert quote.reserved_credit_cost == 6


def test_fallback_only_route_uses_catalog_fallback_and_discounted_hold() -> None:
    quote = build_generation_pricing_quote(
        selected_provider="pollinations",
        routing_decision=_decision(
            workflow="text_to_image",
            selected_provider="pollinations",
            provider_candidates=("pollinations", "huggingface"),
        ),
        requested_model_id="sdxl-base",
        workflow="text_to_image",
        width=1024,
        height=1024,
        output_count=1,
        provider_estimated_cost=None,
        legacy_model=_model("sdxl-base", credit_cost=8, estimated_cost=0.008),
    )

    assert quote.pricing_lane == "fallback"
    assert quote.estimated_cost_source == "catalog_fallback"
    assert quote.estimated_cost == 0.008
    assert quote.credit_cost == 8
    assert quote.reserved_credit_cost == 4


def test_degraded_demo_route_stays_free_to_hold() -> None:
    quote = build_generation_pricing_quote(
        selected_provider="demo",
        routing_decision=_decision(
            workflow="text_to_image",
            selected_provider="demo",
            provider_candidates=("demo",),
            degraded=True,
            selected_quality_tier="degraded",
        ),
        requested_model_id="flux-schnell",
        workflow="text_to_image",
        width=1024,
        height=1024,
        output_count=1,
        provider_estimated_cost=None,
        legacy_model=_model("flux-schnell", credit_cost=6, estimated_cost=0.003),
    )

    assert quote.pricing_lane == "degraded"
    assert quote.estimated_cost_source == "catalog_fallback"
    assert quote.credit_cost == 6
    assert quote.reserved_credit_cost == 0
