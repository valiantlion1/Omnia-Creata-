from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence

from .billing_ops import BillingStateSnapshot, calculate_generation_final_charge
from .creative_profile_ops import resolve_creative_profile
from .experience_contract_ops import build_render_experience
from .generation_pricing_ops import build_generation_pricing_quote
from .models import IdentityPlan, ModelCatalogEntry
from .providers import ProviderRegistry

_LANE_ORDER = {"draft": 0, "standard": 1, "final": 2, "fallback": 3, "degraded": 4}
_GENERIC_FORECAST_PROMPT = "Studio generation credit forecast"


@dataclass(frozen=True, slots=True)
class GenerationCreditForecast:
    model_id: str
    label: str
    creative_profile: dict[str, Any]
    render_experience: dict[str, Any]
    pricing_lane: str
    planned_provider: str | None
    estimated_cost: float
    estimated_cost_source: str
    quoted_credit_cost: int
    reserved_credit_cost: int
    settlement_credit_cost: int
    settlement_policy: str
    affordable_now: bool
    max_startable_jobs_now: int | None
    start_status: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_id": self.model_id,
            "label": self.label,
            "creative_profile": dict(self.creative_profile),
            "render_experience": dict(self.render_experience),
            "pricing_lane": self.pricing_lane,
            "planned_provider": self.planned_provider,
            "estimated_cost": self.estimated_cost,
            "estimated_cost_source": self.estimated_cost_source,
            "quoted_credit_cost": self.quoted_credit_cost,
            "reserved_credit_cost": self.reserved_credit_cost,
            "settlement_credit_cost": self.settlement_credit_cost,
            "settlement_policy": self.settlement_policy,
            "affordable_now": self.affordable_now,
            "max_startable_jobs_now": self.max_startable_jobs_now,
            "start_status": self.start_status,
        }


def build_generation_credit_forecasts(
    *,
    identity_plan: IdentityPlan,
    billing_state: BillingStateSnapshot,
    models: Sequence[ModelCatalogEntry],
    providers: ProviderRegistry,
) -> dict[str, Any]:
    forecasts: list[GenerationCreditForecast] = []
    for model in models:
        creative_profile = resolve_creative_profile(
            model_id=model.id,
            pricing_lane=None,
            existing_profile=model.creative_profile,
        )
        routing_decision = providers.plan_generation_route(
            plan=identity_plan,
            prompt=_GENERIC_FORECAST_PROMPT,
            model_id=model.id,
            workflow="text_to_image",
            has_reference_image=False,
        )
        provider_estimated_cost = providers.estimate_generation_cost(
            provider_name=routing_decision.selected_provider,
            width=model.max_width,
            height=model.max_height,
            model_id=model.id,
            workflow=routing_decision.workflow,
            has_reference_image=False,
        )
        pricing_quote = build_generation_pricing_quote(
            selected_provider=routing_decision.selected_provider,
            routing_decision=routing_decision,
            requested_model_id=model.id,
            workflow=routing_decision.workflow,
            width=model.max_width,
            height=model.max_height,
            output_count=1,
            provider_estimated_cost=provider_estimated_cost,
            legacy_model=model,
            unlimited_generation_access=billing_state.unlimited,
        )
        settlement_policy, settlement_credit_cost = calculate_generation_final_charge(
            base_credit_cost=pricing_quote.credit_cost,
            provider_name=routing_decision.selected_provider,
            provider_billable=providers.provider_billable(routing_decision.selected_provider),
            degraded=routing_decision.degraded,
        )
        max_startable_jobs_now, start_status = _start_capacity(
            billing_state=billing_state,
            reserved_credit_cost=pricing_quote.reserved_credit_cost,
        )
        affordable_now = (
            billing_state.unlimited
            or pricing_quote.reserved_credit_cost <= 0
            or billing_state.available_to_spend >= pricing_quote.reserved_credit_cost
        )
        forecasts.append(
            GenerationCreditForecast(
                model_id=model.id,
                label=creative_profile.label,
                creative_profile=creative_profile.model_dump(mode="json"),
                render_experience=build_render_experience(
                    provider_name=routing_decision.selected_provider,
                    pricing_lane=pricing_quote.pricing_lane,
                    degraded=routing_decision.degraded,
                    provider_billable=providers.provider_billable(routing_decision.selected_provider),
                ),
                pricing_lane=pricing_quote.pricing_lane,
                planned_provider=routing_decision.selected_provider,
                estimated_cost=pricing_quote.estimated_cost,
                estimated_cost_source=pricing_quote.estimated_cost_source,
                quoted_credit_cost=pricing_quote.credit_cost,
                reserved_credit_cost=pricing_quote.reserved_credit_cost,
                settlement_credit_cost=settlement_credit_cost,
                settlement_policy=settlement_policy,
                affordable_now=affordable_now,
                max_startable_jobs_now=max_startable_jobs_now,
                start_status=start_status,
            )
        )

    sorted_forecasts = sorted(
        forecasts,
        key=lambda item: (
            _LANE_ORDER.get(item.pricing_lane, 99),
            item.reserved_credit_cost,
            item.quoted_credit_cost,
            item.label.lower(),
        ),
    )
    lane_highlights: list[dict[str, Any]] = []
    seen_lanes: set[str] = set()
    for forecast in sorted_forecasts:
        if forecast.pricing_lane in seen_lanes:
            continue
        lane_highlights.append(forecast.to_dict())
        seen_lanes.add(forecast.pricing_lane)

    return {
        "available_to_spend": billing_state.available_to_spend,
        "reserved_total": billing_state.reserved_total,
        "unlimited": billing_state.unlimited,
        "lane_highlights": lane_highlights,
        "models": [forecast.to_dict() for forecast in sorted_forecasts],
    }


def _start_capacity(
    *,
    billing_state: BillingStateSnapshot,
    reserved_credit_cost: int,
) -> tuple[int | None, str]:
    if billing_state.unlimited:
        return (None, "unlimited")
    normalized_hold = max(int(reserved_credit_cost or 0), 0)
    if normalized_hold <= 0:
        return (None, "no_hold")
    max_jobs = billing_state.available_to_spend // normalized_hold
    if max_jobs <= 0:
        return (0, "blocked")
    if max_jobs == 1:
        return (1, "limited")
    return (max_jobs, "ready")
