from __future__ import annotations

import studio_platform.providers as provider_module
from studio_platform.billing_ops import BillingStateSnapshot
from studio_platform.generation_credit_forecast_ops import build_generation_credit_forecasts
from studio_platform.models import IdentityPlan, ModelCatalogEntry
from studio_platform.providers import ProviderCapabilities, ProviderRegistry, StudioImageProvider


class _FakeProvider(StudioImageProvider):
    def __init__(
        self,
        *,
        name: str,
        rollout_tier: str,
        billable: bool,
        configured: bool = True,
        workflows: tuple[str, ...] = ("text_to_image",),
    ) -> None:
        self.name = name
        self.rollout_tier = rollout_tier
        self.billable = billable
        self._configured = configured
        self.capabilities = ProviderCapabilities(workflows=workflows)

    async def is_available(self) -> bool:
        return self._configured

    def is_configured(self) -> bool:
        return self._configured

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {"name": self.name, "status": "healthy" if self._configured else "disabled", "detail": "fake"}

    async def generate(self, **kwargs):
        raise NotImplementedError


def _registry_with(*providers: StudioImageProvider) -> ProviderRegistry:
    registry = ProviderRegistry()
    registry.providers = list(providers)
    registry._providers_by_name = {provider.name: provider for provider in providers}
    registry._provider_circuits = {
        provider.name: provider_module.ProviderCircuitState() for provider in providers
    }
    return registry


def _billing_state(*, available_to_spend: int, reserved_total: int = 0, unlimited: bool = False) -> BillingStateSnapshot:
    return BillingStateSnapshot(
        gross_remaining=available_to_spend + reserved_total,
        reserved_total=reserved_total,
        available_to_spend=available_to_spend,
        monthly_remaining=available_to_spend + reserved_total,
        monthly_allowance=1200,
        extra_credits=0,
        unlimited=unlimited,
        effective_plan=IdentityPlan.PRO,
        subscription_active=True,
    )


def _model(model_id: str, *, credit_cost: int, estimated_cost: float) -> ModelCatalogEntry:
    return ModelCatalogEntry(
        id=model_id,
        label=model_id,
        description=f"{model_id} test model",
        min_plan=IdentityPlan.FREE,
        credit_cost=credit_cost,
        estimated_cost=estimated_cost,
        max_width=1024,
        max_height=1024,
    )


def test_credit_forecasts_follow_openai_managed_lane_truth() -> None:
    registry = _registry_with(
        provider_module.OpenAIImageProvider(
            "openai-key",
            draft_image_model="gpt-image-1-mini",
            image_model="gpt-image-1.5",
        )
    )
    summary = build_generation_credit_forecasts(
        identity_plan=IdentityPlan.PRO,
        billing_state=_billing_state(available_to_spend=60),
        models=[
            _model("flux-schnell", credit_cost=6, estimated_cost=0.003),
            _model("realvis-xl", credit_cost=12, estimated_cost=0.015),
        ],
        providers=registry,
    )

    draft = next(entry for entry in summary["models"] if entry["model_id"] == "flux-schnell")
    final = next(entry for entry in summary["models"] if entry["model_id"] == "realvis-xl")

    assert draft["pricing_lane"] == "draft"
    assert draft["planned_provider"] == "openai"
    assert draft["estimated_cost_source"] == "provider_quote"
    assert draft["reserved_credit_cost"] == 6
    assert draft["settlement_credit_cost"] == 6
    assert draft["settlement_policy"] == "managed_full"
    assert draft["max_startable_jobs_now"] == 10

    assert final["pricing_lane"] == "final"
    assert final["planned_provider"] == "openai"
    assert final["estimated_cost_source"] == "provider_quote"
    assert final["reserved_credit_cost"] == 12
    assert final["settlement_credit_cost"] == 12
    assert final["max_startable_jobs_now"] == 5


def test_credit_forecasts_show_discounted_fallback_hold() -> None:
    registry = _registry_with(
        _FakeProvider(name="pollinations", rollout_tier="fallback", billable=False),
        _FakeProvider(name="huggingface", rollout_tier="fallback", billable=False),
    )
    summary = build_generation_credit_forecasts(
        identity_plan=IdentityPlan.FREE,
        billing_state=_billing_state(available_to_spend=57, reserved_total=3),
        models=[_model("flux-schnell", credit_cost=6, estimated_cost=0.003)],
        providers=registry,
    )

    flux = summary["models"][0]
    assert flux["pricing_lane"] == "fallback"
    assert flux["estimated_cost_source"] == "catalog_fallback"
    assert flux["reserved_credit_cost"] == 3
    assert flux["settlement_credit_cost"] == 3
    assert flux["settlement_policy"] == "standard_discount"
    assert flux["max_startable_jobs_now"] == 19
