from __future__ import annotations

import studio_platform.providers as provider_module
from studio_platform.experience_contract_ops import (
    build_chat_experience,
    build_model_route_preview,
    build_render_experience,
)
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
    ) -> None:
        self.name = name
        self.rollout_tier = rollout_tier
        self.billable = billable
        self.capabilities = ProviderCapabilities(workflows=("text_to_image",))
        self._configured = configured

    async def is_available(self) -> bool:
        return self._configured

    def is_configured(self) -> bool:
        return self._configured

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {"name": self.name, "status": "healthy" if self._configured else "disabled", "detail": "fake"}

    async def generate(self, **kwargs) -> provider_module.ProviderResult:
        return provider_module.ProviderResult(
            provider=self.name,
            image_bytes=b"ok",
            mime_type="image/png",
            width=int(kwargs["width"]),
            height=int(kwargs["height"]),
            estimated_cost=0.0,
            provider_rollout_tier=self.rollout_tier,
            billable=self.billable,
        )


def _registry_with(*providers: StudioImageProvider) -> ProviderRegistry:
    registry = ProviderRegistry()
    registry.providers = list(providers)
    registry._providers_by_name = {provider.name: provider for provider in providers}
    registry._provider_circuits = {
        provider.name: provider_module.ProviderCircuitState() for provider in providers
    }
    return registry


def _model(model_id: str = "flux-schnell") -> ModelCatalogEntry:
    return ModelCatalogEntry(
        id=model_id,
        label="Flux Schnell",
        description="Fast draft profile",
        min_plan=IdentityPlan.FREE,
        credit_cost=6,
        estimated_cost=0.003,
        max_width=1024,
        max_height=1024,
    )


def test_build_render_experience_marks_ready_for_launch_grade_route() -> None:
    experience = build_render_experience(
        provider_name="openai",
        pricing_lane="final",
        degraded=False,
        provider_billable=True,
    )

    assert experience["state"] == "ready"
    assert experience["launch_grade"] is True
    assert experience["billable"] is True


def test_build_render_experience_marks_fallback_for_preview_route() -> None:
    experience = build_render_experience(
        provider_name="pollinations",
        pricing_lane="fallback",
        degraded=False,
        provider_billable=False,
    )

    assert experience["state"] == "fallback"
    assert experience["launch_grade"] is False


def test_build_render_experience_marks_unavailable_without_provider() -> None:
    experience = build_render_experience(
        provider_name=None,
        pricing_lane="draft",
        degraded=False,
        provider_billable=None,
    )

    assert experience["state"] == "unavailable"
    assert experience["billable"] is False


def test_build_chat_experience_hides_provider_for_fallback_states() -> None:
    experience = build_chat_experience(
        {
            "provider": "heuristic",
            "response_mode": "degraded_fallback_reply",
            "premium_lane_unavailable": True,
            "degraded": True,
        }
    )

    assert experience is not None
    assert experience["state"] == "degraded_fallback"
    assert experience["show_provider"] is False
    assert experience["provider_label"] is None


def test_build_chat_experience_marks_premium_lane_unavailable() -> None:
    experience = build_chat_experience(
        {
            "provider": "openrouter",
            "response_mode": "premium_lane_unavailable",
            "premium_lane_unavailable": True,
        }
    )

    assert experience is not None
    assert experience["state"] == "premium_unavailable"
    assert experience["show_provider"] is False


def test_build_model_route_preview_marks_unavailable_when_no_provider_is_configured() -> None:
    registry = _registry_with(
        _FakeProvider(name="openai", rollout_tier="primary", billable=True, configured=False),
        _FakeProvider(name="pollinations", rollout_tier="degraded", billable=False, configured=False),
        _FakeProvider(name="demo", rollout_tier="local-fallback", billable=False, configured=False),
    )

    preview = build_model_route_preview(
        model=_model(),
        identity_plan=IdentityPlan.PRO,
        providers=registry,
    )

    assert preview["planned_provider"] is None
    assert preview["render_experience"]["state"] == "unavailable"


def test_build_model_route_preview_prefers_runware_for_wallet_backed_free_accounts() -> None:
    registry = _registry_with(
        _FakeProvider(name="runware", rollout_tier="primary", billable=True),
        _FakeProvider(name="pollinations", rollout_tier="fallback", billable=False),
        _FakeProvider(name="huggingface", rollout_tier="fallback", billable=False),
    )

    preview = build_model_route_preview(
        model=_model(),
        identity_plan=IdentityPlan.FREE,
        providers=registry,
        wallet_backed=True,
    )

    assert preview["planned_provider"] == "runware"
    assert preview["pricing_lane"] == "draft"
    assert preview["render_experience"]["state"] == "ready"
