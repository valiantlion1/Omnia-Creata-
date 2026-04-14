import asyncio
import base64
import json
import time

import httpx
import pytest
from PIL import Image

import studio_platform.providers as provider_module
from studio_platform.models import IdentityPlan
from studio_platform.providers import (
    FalProvider,
    HuggingFaceImageProvider,
    OpenAIImageProvider,
    PollinationsProvider,
    ProviderCapabilities,
    ProviderFatalError,
    ProviderReferenceImage,
    ProviderRegistry,
    ProviderResult,
    RunwareProvider,
    StudioImageProvider,
)


class _FakeProvider(StudioImageProvider):
    def __init__(
        self,
        *,
        name: str,
        rollout_tier: str,
        capabilities: ProviderCapabilities,
        billable: bool = False,
        available: bool = True,
        configured: bool = True,
    ) -> None:
        self.name = name
        self.rollout_tier = rollout_tier
        self.billable = billable
        self.capabilities = capabilities
        self.available = available
        self.configured = configured
        self.calls: list[dict[str, object]] = []

    async def is_available(self) -> bool:
        return self.available

    def is_configured(self) -> bool:
        return self.configured

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {
            "name": self.name,
            "status": "healthy" if self.available and self.configured else "disabled",
            "detail": "fake",
        }

    async def generate(self, **kwargs) -> ProviderResult:
        self.calls.append(kwargs)
        return ProviderResult(
            provider=self.name,
            image_bytes=b"ok",
            mime_type="image/png",
            width=int(kwargs["width"]),
            height=int(kwargs["height"]),
            estimated_cost=0.0,
        )


def _registry_with(*providers: StudioImageProvider) -> ProviderRegistry:
    registry = ProviderRegistry()
    registry.providers = list(providers)
    registry._providers_by_name = {provider.name: provider for provider in providers}
    registry._provider_circuits = {provider.name: provider_module.ProviderCircuitState() for provider in providers}
    return registry


class _FlakyProvider(StudioImageProvider):
    def __init__(self, *, name: str = "flaky", fail_times: int = 0) -> None:
        self.name = name
        self.rollout_tier = "primary"
        self.capabilities = ProviderCapabilities(workflows=("text_to_image",))
        self.fail_times = fail_times
        self.calls = 0

    async def is_available(self) -> bool:
        return True

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {"name": self.name, "status": "healthy", "detail": "flaky"}

    async def generate(self, **kwargs) -> ProviderResult:
        self.calls += 1
        if self.calls <= self.fail_times:
            raise provider_module.ProviderTemporaryError("transient failure")
        return ProviderResult(
            provider=self.name,
            image_bytes=b"ok",
            mime_type="image/png",
            width=int(kwargs["width"]),
            height=int(kwargs["height"]),
            estimated_cost=0.0,
        )


class _FatalProbeProvider(StudioImageProvider):
    def __init__(self, *, name: str = "fatal-probe") -> None:
        self.name = name
        self.rollout_tier = "standard"
        self.capabilities = ProviderCapabilities(workflows=("text_to_image",))

    async def is_available(self) -> bool:
        return True

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {"name": self.name, "status": "healthy", "detail": "configured"}

    async def generate(self, **kwargs) -> ProviderResult:
        raise ProviderFatalError("provider returned 401 expired token")


class _AlwaysTemporaryProvider(StudioImageProvider):
    def __init__(self, *, name: str, detail: str = "temporary failure", billable: bool = False) -> None:
        self.name = name
        self.rollout_tier = "standard"
        self.billable = billable
        self.capabilities = ProviderCapabilities(workflows=("text_to_image",))
        self.detail = detail
        self.calls = 0

    async def is_available(self) -> bool:
        return True

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {"name": self.name, "status": "healthy", "detail": "configured"}

    async def generate(self, **kwargs) -> ProviderResult:
        self.calls += 1
        raise provider_module.ProviderTemporaryError(self.detail)


def test_preview_generation_provider_prefers_first_supported_provider() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="fal",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image"),
                supports_reference_image=True,
                supports_async_queue=True,
            ),
        ),
        _FakeProvider(
            name="runware",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image"),
                supports_reference_image=True,
            ),
        ),
    )

    assert registry.preview_generation_provider(workflow="text_to_image") == "fal"


def test_preview_generation_provider_skips_not_configured_provider() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="fal",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
            available=False,
            configured=False,
        ),
        _FakeProvider(
            name="pollinations",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    assert registry.preview_generation_provider(workflow="text_to_image") == "pollinations"


def test_provider_registry_uses_free_first_strategy_by_default() -> None:
    settings = provider_module.get_settings()
    original_strategy = settings.generation_provider_strategy
    original_hf = settings.huggingface_token
    original_openai = settings.openai_api_key
    original_pollinations = settings.enable_pollinations
    original_fal = settings.fal_api_key
    original_runware = settings.runware_api_key
    original_demo = settings.enable_demo_generation_fallback
    try:
        settings.generation_provider_strategy = "free-first"
        settings.huggingface_token = "hf-token"
        settings.openai_api_key = None
        settings.enable_pollinations = True
        settings.fal_api_key = None
        settings.runware_api_key = None
        settings.enable_demo_generation_fallback = False
        registry = ProviderRegistry()
        assert [provider.name for provider in registry.providers[:3]] == ["pollinations", "huggingface", "openai"]
    finally:
        settings.generation_provider_strategy = original_strategy
        settings.huggingface_token = original_hf
        settings.openai_api_key = original_openai
        settings.enable_pollinations = original_pollinations
        settings.fal_api_key = original_fal
        settings.runware_api_key = original_runware
        settings.enable_demo_generation_fallback = original_demo


def test_provider_registry_treats_placeholder_huggingface_token_as_unconfigured() -> None:
    settings = provider_module.get_settings()
    original_hf = settings.huggingface_token
    original_openai = settings.openai_api_key
    original_pollinations = settings.enable_pollinations
    original_fal = settings.fal_api_key
    original_runware = settings.runware_api_key
    original_demo = settings.enable_demo_generation_fallback
    try:
        settings.huggingface_token = "your_huggingface_token_here"
        settings.openai_api_key = None
        settings.enable_pollinations = False
        settings.fal_api_key = None
        settings.runware_api_key = None
        settings.enable_demo_generation_fallback = False
        registry = ProviderRegistry()
        assert all(provider.name != "huggingface" for provider in registry.providers)
    finally:
        settings.huggingface_token = original_hf
        settings.openai_api_key = original_openai
        settings.enable_pollinations = original_pollinations
        settings.fal_api_key = original_fal
        settings.runware_api_key = original_runware
        settings.enable_demo_generation_fallback = original_demo


def test_provider_registry_disables_demo_fallback_by_default() -> None:
    settings = provider_module.get_settings()
    original_demo = settings.enable_demo_generation_fallback
    original_hf = settings.huggingface_token
    original_pollinations = settings.enable_pollinations
    original_fal = settings.fal_api_key
    original_runware = settings.runware_api_key
    try:
        settings.enable_demo_generation_fallback = False
        settings.huggingface_token = None
        settings.enable_pollinations = False
        settings.fal_api_key = None
        settings.runware_api_key = None
        registry = ProviderRegistry()
        assert all(provider.name != "demo" for provider in registry.providers)
        assert registry.routing_summary()["demo_policy"] == "disabled_by_default_explicit_only"
    finally:
        settings.enable_demo_generation_fallback = original_demo
        settings.huggingface_token = original_hf
        settings.enable_pollinations = original_pollinations
        settings.fal_api_key = original_fal
        settings.runware_api_key = original_runware


def test_provider_registry_can_explicitly_enable_demo_fallback() -> None:
    settings = provider_module.get_settings()
    original_demo = settings.enable_demo_generation_fallback
    original_hf = settings.huggingface_token
    original_pollinations = settings.enable_pollinations
    original_fal = settings.fal_api_key
    original_runware = settings.runware_api_key
    try:
        settings.enable_demo_generation_fallback = True
        settings.huggingface_token = None
        settings.enable_pollinations = False
        settings.fal_api_key = None
        settings.runware_api_key = None
        registry = ProviderRegistry()
        assert any(provider.name == "demo" for provider in registry.providers)
        assert registry.routing_summary()["demo_policy"] == "degraded_only_last_resort"
    finally:
        settings.enable_demo_generation_fallback = original_demo
        settings.huggingface_token = original_hf
        settings.enable_pollinations = original_pollinations
        settings.fal_api_key = original_fal
        settings.runware_api_key = original_runware


def test_provider_registry_disables_openai_image_premium_qa_by_default_in_development() -> None:
    settings = provider_module.get_settings()
    original_environment = settings.environment
    original_openai_api_key = settings.openai_api_key
    original_openai_image_premium_qa_enabled = settings.openai_image_premium_qa_enabled
    try:
        settings.environment = provider_module.Environment.DEVELOPMENT
        settings.openai_api_key = "openai-key"
        settings.openai_image_premium_qa_enabled = False
        registry = ProviderRegistry()
        openai_provider = registry.get_provider("openai")
        assert isinstance(openai_provider, OpenAIImageProvider)
        assert openai_provider.premium_qa_enabled is False
    finally:
        settings.environment = original_environment
        settings.openai_api_key = original_openai_api_key
        settings.openai_image_premium_qa_enabled = original_openai_image_premium_qa_enabled


def test_provider_registry_uses_cost_safe_openai_image_estimate_in_development() -> None:
    settings = provider_module.get_settings()
    original_environment = settings.environment
    original_openai_api_key = settings.openai_api_key
    original_openai_image_premium_qa_enabled = settings.openai_image_premium_qa_enabled
    original_hf = settings.huggingface_token
    original_pollinations = settings.enable_pollinations
    original_fal = settings.fal_api_key
    original_runware = settings.runware_api_key
    try:
        settings.environment = provider_module.Environment.DEVELOPMENT
        settings.openai_api_key = "openai-key"
        settings.openai_image_premium_qa_enabled = False
        settings.huggingface_token = None
        settings.enable_pollinations = False
        settings.fal_api_key = None
        settings.runware_api_key = None
        registry = ProviderRegistry()
        decision = registry.plan_generation_route(
            plan=IdentityPlan.PRO,
            prompt="polished beauty portrait for a premium campaign",
            model_id="realvis-xl",
        )
        assert decision.selected_provider == "openai"
        assert registry.estimate_generation_cost(
            provider_name="openai",
            width=1024,
            height=1024,
            model_id="realvis-xl",
            workflow="text_to_image",
        ) == 0.005
    finally:
        settings.environment = original_environment
        settings.openai_api_key = original_openai_api_key
        settings.openai_image_premium_qa_enabled = original_openai_image_premium_qa_enabled
        settings.huggingface_token = original_hf
        settings.enable_pollinations = original_pollinations
        settings.fal_api_key = original_fal
        settings.runware_api_key = original_runware


def test_plan_generation_route_prefers_pollinations_for_free_realistic_prompts() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="pollinations",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="huggingface",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.FREE,
        prompt="editorial beauty portrait with luxury campaign lighting",
        model_id="flux-schnell",
        workflow="text_to_image",
    )

    assert decision.provider_candidates[:2] == ("pollinations", "huggingface")
    assert decision.prompt_profile == "realistic_editorial"
    assert decision.routing_strategy == "free-first"


def test_plan_generation_route_prefers_huggingface_for_free_stylized_prompts() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="pollinations",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="huggingface",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.FREE,
        prompt="anime warrior princess illustration with dramatic lighting",
        model_id="flux-schnell",
        workflow="text_to_image",
    )

    assert decision.provider_candidates[:2] == ("huggingface", "pollinations")
    assert decision.prompt_profile == "stylized_illustration"


def test_plan_generation_route_prefers_openai_for_free_prompts_in_development_when_managed_lane_is_available() -> None:
    settings = provider_module.get_settings()
    original_environment = settings.environment
    try:
        settings.environment = provider_module.Environment.DEVELOPMENT
        registry = _registry_with(
            _FakeProvider(
                name="openai",
                rollout_tier="primary",
                capabilities=ProviderCapabilities(
                    workflows=("text_to_image", "image_to_image", "edit"),
                    supports_reference_image=True,
                ),
            ),
            _FakeProvider(
                name="pollinations",
                rollout_tier="standard",
                capabilities=ProviderCapabilities(workflows=("text_to_image",)),
            ),
            _FakeProvider(
                name="huggingface",
                rollout_tier="standard",
                capabilities=ProviderCapabilities(workflows=("text_to_image",)),
            ),
            _FakeProvider(
                name="demo",
                rollout_tier="degraded",
                capabilities=ProviderCapabilities(workflows=("text_to_image",)),
            ),
        )

        decision = registry.plan_generation_route(
            plan=IdentityPlan.FREE,
            prompt="anime warrior princess illustration with dramatic lighting",
            model_id="flux-schnell",
            workflow="text_to_image",
        )

        assert decision.provider_candidates[:4] == ("openai", "huggingface", "pollinations", "demo")
        assert decision.selected_provider == "openai"
        assert decision.routing_reason == "free_standard_managed_override"
    finally:
        settings.environment = original_environment


def test_plan_generation_route_prefers_fal_for_pro_premium_intent() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="openai",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
            ),
        ),
        _FakeProvider(
            name="fal",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
            ),
        ),
        _FakeProvider(
            name="runware",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
            ),
        ),
        _FakeProvider(
            name="pollinations",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.PRO,
        prompt="editorial fashion portrait for a luxury campaign",
        model_id="realvis-xl",
        workflow="text_to_image",
    )

    assert decision.provider_candidates[:3] == ("openai", "fal", "runware")
    assert decision.provider_candidates[0] == "openai"
    assert decision.requested_quality_tier == "premium"
    assert decision.selected_quality_tier == "premium"
    assert decision.degraded is False
    assert decision.routing_reason == "premium_intent_managed_preferred"


def test_plan_generation_route_marks_pro_premium_fallback_as_degraded_standard() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="pollinations",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="huggingface",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.PRO,
        prompt="luxury product campaign shot for a perfume bottle",
        model_id="realvis-xl",
        workflow="text_to_image",
    )

    assert decision.provider_candidates[0] == "pollinations"
    assert decision.selected_quality_tier == "standard"
    assert decision.degraded is True
    assert decision.routing_reason == "managed_unavailable_fallback_standard"


def test_plan_generation_route_prefers_managed_lanes_for_pro_stylized_prompts() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="openai",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="fal",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="runware",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="huggingface",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="pollinations",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.PRO,
        prompt="anime warrior princess illustration with dramatic lighting",
        model_id="flux-schnell",
        workflow="text_to_image",
    )

    assert decision.provider_candidates[:5] == ("openai", "fal", "runware", "huggingface", "pollinations")
    assert decision.selected_provider == "openai"
    assert decision.selected_quality_tier == "premium"
    assert decision.degraded is False
    assert decision.routing_reason == "pro_balanced_standard_default"


def test_plan_generation_route_prefers_managed_lanes_for_pro_default_prompts() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="openai",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="fal",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="runware",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="pollinations",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="huggingface",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.PRO,
        prompt="simple blue gradient background with a centered white circle",
        model_id="flux-schnell",
        workflow="text_to_image",
    )

    assert decision.provider_candidates[:5] == ("openai", "fal", "runware", "pollinations", "huggingface")
    assert decision.selected_provider == "openai"
    assert decision.selected_quality_tier == "premium"
    assert decision.degraded is False
    assert decision.routing_reason == "pro_balanced_standard_default"


def test_plan_generation_route_excludes_pollinations_and_demo_for_edit_workflows() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="openai",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
            ),
        ),
        _FakeProvider(
            name="fal",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
            ),
        ),
        _FakeProvider(
            name="huggingface",
            rollout_tier="standard",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
            ),
        ),
        _FakeProvider(
            name="pollinations",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.PRO,
        prompt="make the campaign portrait more dramatic",
        model_id="flux-schnell",
        workflow="edit",
        has_reference_image=True,
    )

    assert decision.provider_candidates == ("openai", "fal", "huggingface")
    assert "pollinations" not in decision.provider_candidates
    assert "demo" not in decision.provider_candidates


@pytest.mark.asyncio
async def test_provider_registry_opens_circuit_after_five_temporary_failures_and_recovers_half_open() -> None:
    flaky = _FlakyProvider(fail_times=5)
    fallback = _FakeProvider(
        name="demo",
        rollout_tier="fallback",
        capabilities=ProviderCapabilities(workflows=("text_to_image",)),
    )
    registry = _registry_with(flaky, fallback)

    for _ in range(5):
        result = await registry.generate(
            prompt="portrait",
            negative_prompt="",
            width=512,
            height=512,
            seed=1,
            model_id="flux-schnell",
        )
        assert result.provider == "demo"

    health = await registry.health_snapshot(probe=False)
    flaky_health = next(item for item in health if item["name"] == "flaky")
    assert flaky_health["circuit_breaker"]["state"] == "open"

    result = await registry.generate(
        prompt="portrait",
        negative_prompt="",
        width=512,
        height=512,
        seed=2,
        model_id="flux-schnell",
    )
    assert result.provider == "demo"
    assert flaky.calls == 5

    registry._provider_circuits["flaky"].opened_until_monotonic = time.monotonic() - 1
    result = await registry.generate(
        prompt="portrait",
        negative_prompt="",
        width=512,
        height=512,
        seed=3,
        model_id="flux-schnell",
    )
    assert result.provider == "flaky"

    health = await registry.health_snapshot(probe=False)
    flaky_health = next(item for item in health if item["name"] == "flaky")
    assert flaky_health["circuit_breaker"]["state"] == "closed"


@pytest.mark.asyncio
async def test_generate_skips_text_to_image_only_provider_for_reference_workflow() -> None:
    pollinations = _FakeProvider(
        name="pollinations",
        rollout_tier="degraded",
        capabilities=ProviderCapabilities(workflows=("text_to_image",)),
    )
    runware = _FakeProvider(
        name="runware",
        rollout_tier="secondary",
        capabilities=ProviderCapabilities(
            workflows=("text_to_image", "image_to_image"),
            supports_reference_image=True,
        ),
    )
    registry = _registry_with(pollinations, runware)

    reference = ProviderReferenceImage(
        asset_id="asset-ref",
        image_bytes=b"image",
        mime_type="image/png",
        title="ref",
    )
    result = await registry.generate(
        prompt="make variations",
        negative_prompt="",
        width=1024,
        height=1024,
        seed=42,
        reference_image=reference,
        model_id="flux-schnell",
        workflow="image_to_image",
    )

    assert result.provider == "runware"
    assert pollinations.calls == []
    assert runware.calls[0]["workflow"] == "image_to_image"


@pytest.mark.asyncio
async def test_health_snapshot_includes_capabilities_and_priority() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="fal",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
                supports_async_queue=True,
            ),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="local-fallback",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    snapshot = await registry.health_snapshot(probe=False)

    assert snapshot[0]["name"] == "fal"
    assert snapshot[0]["priority"] == 1
    assert snapshot[0]["capabilities"]["supports_async_queue"] is True
    assert snapshot[1]["name"] == "demo"
    assert snapshot[1]["priority"] == 2


@pytest.mark.asyncio
async def test_health_snapshot_marks_recent_failure_as_unhealthy_runtime_truth() -> None:
    flaky = _FlakyProvider(fail_times=1)
    fallback = _FakeProvider(
        name="fallback",
        rollout_tier="fallback",
        capabilities=ProviderCapabilities(workflows=("text_to_image",)),
    )
    registry = _registry_with(flaky, fallback)

    result = await registry.generate(
        prompt="portrait",
        negative_prompt="",
        width=512,
        height=512,
        seed=1,
        model_id="flux-schnell",
    )
    snapshot = await registry.health_snapshot(probe=False)
    flaky_health = next(item for item in snapshot if item["name"] == "flaky")

    assert result.provider == "fallback"
    assert flaky_health["reported_status"] == "healthy"
    assert flaky_health["status"] == "error"
    assert flaky_health["circuit_breaker"]["last_error"] == "transient failure"


@pytest.mark.asyncio
async def test_health_snapshot_marks_nonretryable_failure_as_error() -> None:
    provider = _FatalProbeProvider()
    registry = _registry_with(provider)

    registry._record_provider_nonretryable_failure(
        provider.name,
        latency_ms=120.0,
        error=ProviderFatalError("provider returned 401 expired token"),
    )
    snapshot = await registry.health_snapshot(probe=False)
    provider_health = next(item for item in snapshot if item["name"] == provider.name)

    assert provider_health["reported_status"] == "healthy"
    assert provider_health["status"] == "error"
    assert "401 expired token" in provider_health["detail"]


@pytest.mark.asyncio
async def test_plan_generation_route_skips_auth_broken_provider_with_open_circuit() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="pollinations",
            rollout_tier="degraded",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
        _FakeProvider(
            name="huggingface",
            rollout_tier="optional-router",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    registry._record_provider_failure(
        "pollinations",
        latency_ms=55.0,
        error=provider_module.ProviderTemporaryError("Pollinations returned 401 unauthorized"),
    )

    decision = registry.plan_generation_route(
        plan=IdentityPlan.FREE,
        prompt="editorial portrait",
        model_id="flux-schnell",
    )

    assert decision.selected_provider == "huggingface"
    assert "pollinations" not in decision.provider_candidates


@pytest.mark.asyncio
async def test_generate_preserves_last_attempted_provider_on_retryable_failure() -> None:
    registry = _registry_with(
        _AlwaysTemporaryProvider(name="pollinations", detail="pollinations temporary"),
        _AlwaysTemporaryProvider(name="huggingface", detail="huggingface expired token"),
    )

    with pytest.raises(provider_module.ProviderTemporaryError) as exc_info:
        await registry.generate(
            prompt="editorial portrait",
            negative_prompt="",
            width=512,
            height=512,
            seed=5,
            model_id="flux-schnell",
        )

    assert str(exc_info.value) == "huggingface expired token"
    assert getattr(exc_info.value, "provider_name", None) == "huggingface"


@pytest.mark.asyncio
async def test_pollinations_provider_does_not_retry_auth_rejection() -> None:
    request_attempts = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        request_attempts["count"] += 1
        return httpx.Response(401, text="unauthorized")

    provider = PollinationsProvider(enabled=True, transport=httpx.MockTransport(handler))

    with pytest.raises(provider_module.ProviderTemporaryError) as exc_info:
        await provider.generate(
            prompt="portrait",
            negative_prompt="",
            width=512,
            height=512,
            seed=11,
            model_id="flux-schnell",
        )

    assert "401" in str(exc_info.value)
    assert request_attempts["count"] == 1


@pytest.mark.asyncio
async def test_generate_skips_additional_billable_failover_after_billable_failure_in_development() -> None:
    settings = provider_module.get_settings()
    original_environment = settings.environment
    settings.environment = provider_module.Environment.DEVELOPMENT
    try:
        openai = _AlwaysTemporaryProvider(
            name="openai",
            detail="openai temporary",
            billable=True,
        )
        fal = _AlwaysTemporaryProvider(
            name="fal",
            detail="fal temporary",
            billable=True,
        )
        fallback = _FakeProvider(
            name="pollinations",
            rollout_tier="fallback",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
            billable=False,
        )
        registry = _registry_with(openai, fal, fallback)

        result = await registry.generate(
            prompt="portrait",
            negative_prompt="",
            width=512,
            height=512,
            seed=7,
            model_id="flux-schnell",
        )

        assert result.provider == "pollinations"
        assert openai.calls == 1
        assert fal.calls == 0
    finally:
        settings.environment = original_environment


@pytest.mark.asyncio
async def test_fal_provider_generates_via_queue_and_downloads_output() -> None:
    requests: list[tuple[str, str, object | None]] = []
    status_hits = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        payload = None
        if request.content:
            payload = json.loads(request.content.decode("utf-8"))
        requests.append((request.method, str(request.url), payload))

        if request.method == "POST" and str(request.url).startswith("https://queue.fal.run/fal-ai/flux/schnell"):
            return httpx.Response(
                200,
                json={
                    "request_id": "req-1",
                    "status_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/req-1/status",
                    "response_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/req-1",
                },
            )
        if request.url.path.endswith("/status"):
            status_hits["count"] += 1
            if status_hits["count"] == 1:
                return httpx.Response(200, json={"status": "IN_QUEUE"})
            return httpx.Response(200, json={"status": "COMPLETED"})
        if request.url.path.endswith("/req-1"):
            return httpx.Response(
                200,
                json={
                    "images": [
                        {
                            "url": "https://cdn.fal.ai/generated/output.png",
                            "content_type": "image/png",
                            "width": 1024,
                            "height": 1024,
                        }
                    ]
                },
            )
        if str(request.url) == "https://cdn.fal.ai/generated/output.png":
            return httpx.Response(200, content=b"pngbytes", headers={"content-type": "image/png"})
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    provider = FalProvider("test-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="cinematic portrait",
        negative_prompt="",
        width=1024,
        height=1024,
        seed=42,
        model_id="flux-schnell",
    )

    assert result.provider == "fal"
    assert result.image_bytes == b"pngbytes"
    assert result.mime_type == "image/png"
    assert requests[0][0] == "POST"
    assert requests[0][1].startswith("https://queue.fal.run/fal-ai/flux/schnell")
    assert requests[0][2]["prompt"] == "cinematic portrait"


@pytest.mark.asyncio
async def test_fal_provider_uses_reference_image_for_edit_workflow() -> None:
    submitted_payload: dict[str, object] = {}
    submitted_url = ""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal submitted_payload, submitted_url
        if request.method == "POST" and request.content:
            submitted_payload = json.loads(request.content.decode("utf-8"))
            submitted_url = str(request.url)

        if request.method == "POST":
            return httpx.Response(
                200,
                json={
                    "request_id": "req-2",
                    "status_url": "https://queue.fal.run/fal-ai/flux-pro/kontext/requests/req-2/status",
                    "response_url": "https://queue.fal.run/fal-ai/flux-pro/kontext/requests/req-2",
                },
            )
        if request.url.path.endswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        if request.url.path.endswith("/req-2"):
            return httpx.Response(
                200,
                json={
                    "images": [
                        {
                            "url": "https://cdn.fal.ai/generated/edit.png",
                            "content_type": "image/png",
                            "width": 900,
                            "height": 900,
                        }
                    ]
                },
            )
        if str(request.url) == "https://cdn.fal.ai/generated/edit.png":
            return httpx.Response(200, content=b"edit-bytes", headers={"content-type": "image/png"})
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    provider = FalProvider("test-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="make it more editorial",
        negative_prompt="blurry",
        width=900,
        height=900,
        seed=7,
        reference_image=ProviderReferenceImage(
            asset_id="asset-1",
            image_bytes=b"ref-bytes",
            mime_type="image/png",
            title="Reference",
        ),
        model_id="realvis-xl",
        workflow="edit",
    )

    assert result.image_bytes == b"edit-bytes"
    assert submitted_url.startswith("https://queue.fal.run/fal-ai/flux-pro/kontext")
    assert str(submitted_payload["image_url"]).startswith("data:image/png;base64,")
    assert submitted_payload["resolution_mode"] == "match_input"
    assert "Avoid: blurry" in str(submitted_payload["prompt"])


@pytest.mark.asyncio
async def test_fal_provider_surfaces_validation_errors_as_fatal() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, text="invalid payload")

    provider = FalProvider("test-key", transport=httpx.MockTransport(handler))

    with pytest.raises(ProviderFatalError, match="422"):
        await provider.generate(
            prompt="bad",
            negative_prompt="",
            width=1024,
            height=1024,
            seed=1,
            model_id="flux-schnell",
        )


@pytest.mark.asyncio
async def test_runware_provider_generates_from_base64_response() -> None:
    submitted_payload: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.content:
            submitted_payload.extend(json.loads(request.content.decode("utf-8")))
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "taskType": "imageInference",
                        "imageBase64Data": base64_png("runware-image"),
                        "cost": 0.012,
                        "NSFWContent": False,
                    }
                ]
            },
        )

    provider = RunwareProvider("runware-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="editorial portrait",
        negative_prompt="",
        width=768,
        height=1024,
        seed=99,
        model_id="flux-schnell",
    )

    assert result.provider == "runware"
    assert result.mime_type == "image/png"
    assert result.estimated_cost == 0.012
    assert submitted_payload[0]["taskType"] == "imageInference"
    assert submitted_payload[0]["outputType"] == "base64Data"
    assert submitted_payload[0]["positivePrompt"] == "editorial portrait"


@pytest.mark.asyncio
async def test_runware_provider_uses_seed_image_for_reference_workflow() -> None:
    submitted_payload: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.content:
            submitted_payload.extend(json.loads(request.content.decode("utf-8")))
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "taskType": "imageInference",
                        "imageDataURI": f"data:image/png;base64,{base64_png('edit')}",
                        "cost": 0.02,
                        "NSFWContent": False,
                    }
                ]
            },
        )

    provider = RunwareProvider("runware-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="make it brighter",
        negative_prompt="blurry",
        width=900,
        height=900,
        seed=101,
        reference_image=ProviderReferenceImage(
            asset_id="asset-1",
            image_bytes=b"seed-image",
            mime_type="image/png",
        ),
        model_id="realvis-xl",
        workflow="image_to_image",
    )

    assert result.provider == "runware"
    assert submitted_payload[0]["seedImage"].startswith("data:image/png;base64,")
    assert submitted_payload[0]["strength"] == 0.7
    assert submitted_payload[0]["negativePrompt"] == "blurry"


@pytest.mark.asyncio
async def test_runware_provider_surfaces_validation_errors_as_fatal() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"errors": [{"message": "invalid image size"}]})

    provider = RunwareProvider("runware-key", transport=httpx.MockTransport(handler))

    with pytest.raises(ProviderFatalError, match="invalid image size"):
        await provider.generate(
            prompt="bad request",
            negative_prompt="",
            width=64,
            height=64,
            seed=12,
            model_id="flux-schnell",
        )


@pytest.mark.asyncio
async def test_openai_image_provider_generates_from_b64_json_response() -> None:
    submitted_payload: dict[str, object] = {}
    png_bytes = image_bytes(width=1024, height=1024)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal submitted_payload
        submitted_payload = json.loads(request.content.decode("utf-8"))
        assert request.url.path == "/v1/images/generations"
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "b64_json": base64.b64encode(png_bytes).decode("ascii"),
                    }
                ]
            },
        )

    provider = OpenAIImageProvider(
        "openai-key",
        image_model="gpt-image-1.5",
        transport=httpx.MockTransport(handler),
    )
    result = await provider.generate(
        prompt="editorial skincare bottle on marble",
        negative_prompt="blurry, low detail",
        width=1024,
        height=1024,
        seed=10,
        model_id="realvis-xl",
    )

    assert result.provider == "openai"
    assert result.mime_type == "image/png"
    assert result.image_bytes == png_bytes
    assert result.width == 1024
    assert result.height == 1024
    assert result.estimated_cost == 0.133
    assert submitted_payload["model"] == "gpt-image-1.5"
    assert submitted_payload["quality"] == "high"
    assert submitted_payload["size"] == "1024x1024"
    assert "Avoid: blurry, low detail" in str(submitted_payload["prompt"])


@pytest.mark.asyncio
async def test_openai_image_provider_uses_edit_endpoint_for_reference_workflow() -> None:
    seen_content_type = ""
    seen_body = b""
    png_bytes = image_bytes(width=1024, height=1536)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal seen_content_type, seen_body
        seen_content_type = request.headers.get("content-type", "")
        seen_body = request.content
        assert request.url.path == "/v1/images/edits"
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "b64_json": base64.b64encode(png_bytes).decode("ascii"),
                    }
                ]
            },
        )

    provider = OpenAIImageProvider(
        "openai-key",
        image_model="gpt-image-1.5",
        transport=httpx.MockTransport(handler),
    )
    result = await provider.generate(
        prompt="clean premium ecommerce product shot",
        negative_prompt="muddy reflections",
        width=900,
        height=1200,
        seed=11,
        reference_image=ProviderReferenceImage(
            asset_id="asset-1",
            image_bytes=image_bytes(width=256, height=256),
            mime_type="image/png",
            title="Reference",
        ),
        model_id="sdxl-base",
        workflow="edit",
    )

    assert result.provider == "openai"
    assert result.mime_type == "image/png"
    assert result.width == 1024
    assert result.height == 1536
    assert result.estimated_cost == 0.05
    assert "multipart/form-data" in seen_content_type
    assert b'name="model"' in seen_body
    assert b"gpt-image-1.5" in seen_body
    assert b'name="quality"' in seen_body
    assert b"medium" in seen_body
    assert b'name="size"' in seen_body
    assert b"1024x1536" in seen_body


@pytest.mark.asyncio
async def test_openai_image_provider_uses_draft_model_for_draft_lane() -> None:
    submitted_payload: dict[str, object] = {}
    png_bytes = image_bytes(width=1024, height=1024)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal submitted_payload
        submitted_payload = json.loads(request.content.decode("utf-8"))
        assert request.url.path == "/v1/images/generations"
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "b64_json": base64.b64encode(png_bytes).decode("ascii"),
                    }
                ]
            },
        )

    provider = OpenAIImageProvider(
        "openai-key",
        draft_image_model="gpt-image-1-mini",
        image_model="gpt-image-1.5",
        transport=httpx.MockTransport(handler),
    )
    result = await provider.generate(
        prompt="draft skincare bottle on gray seamless",
        negative_prompt="blurry",
        width=1024,
        height=1024,
        seed=12,
        model_id="gpt-image-1-mini",
    )

    assert result.provider == "openai"
    assert result.estimated_cost == 0.005
    assert submitted_payload["model"] == "gpt-image-1-mini"
    assert submitted_payload["quality"] == "low"
    assert submitted_payload["size"] == "1024x1024"


def test_openai_image_provider_estimates_draft_and_final_lane_costs() -> None:
    provider = OpenAIImageProvider(
        "openai-key",
        draft_image_model="gpt-image-1-mini",
        image_model="gpt-image-1.5",
    )

    assert provider.estimate_generation_cost(
        width=1024,
        height=1024,
        model_id="flux-schnell",
        workflow="text_to_image",
    ) == 0.005
    assert provider.estimate_generation_cost(
        width=1024,
        height=1024,
        model_id="realvis-xl",
        workflow="text_to_image",
    ) == 0.133


@pytest.mark.asyncio
async def test_openai_image_provider_uses_draft_model_when_premium_qa_is_disabled() -> None:
    submitted_payload: dict[str, object] = {}
    png_bytes = image_bytes(width=1024, height=1024)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal submitted_payload
        submitted_payload = json.loads(request.content.decode("utf-8"))
        assert request.url.path == "/v1/images/generations"
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "b64_json": base64.b64encode(png_bytes).decode("ascii"),
                    }
                ]
            },
        )

    provider = OpenAIImageProvider(
        "openai-key",
        draft_image_model="gpt-image-1-mini",
        image_model="gpt-image-1.5",
        premium_qa_enabled=False,
        transport=httpx.MockTransport(handler),
    )
    result = await provider.generate(
        prompt="luxury interior hero render",
        negative_prompt="muddy shadows",
        width=1024,
        height=1024,
        seed=15,
        model_id="realvis-xl",
    )

    assert result.provider == "openai"
    assert result.estimated_cost == 0.005
    assert submitted_payload["model"] == "gpt-image-1-mini"
    assert submitted_payload["quality"] == "low"
    assert provider.estimate_generation_cost(
        width=1024,
        height=1024,
        model_id="realvis-xl",
        workflow="text_to_image",
    ) == 0.005


@pytest.mark.asyncio
async def test_openai_image_provider_allows_explicit_premium_model_when_premium_qa_is_disabled() -> None:
    submitted_payload: dict[str, object] = {}
    png_bytes = image_bytes(width=1024, height=1024)

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal submitted_payload
        submitted_payload = json.loads(request.content.decode("utf-8"))
        assert request.url.path == "/v1/images/generations"
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "b64_json": base64.b64encode(png_bytes).decode("ascii"),
                    }
                ]
            },
        )

    provider = OpenAIImageProvider(
        "openai-key",
        draft_image_model="gpt-image-1-mini",
        image_model="gpt-image-1.5",
        premium_qa_enabled=False,
        transport=httpx.MockTransport(handler),
    )
    result = await provider.generate(
        prompt="explicit premium QA render",
        negative_prompt="",
        width=1024,
        height=1024,
        seed=16,
        model_id="gpt-image-1.5",
    )

    assert result.provider == "openai"
    assert result.estimated_cost == 0.034
    assert submitted_payload["model"] == "gpt-image-1.5"
    assert submitted_payload["quality"] == "medium"


@pytest.mark.asyncio
async def test_openai_image_provider_does_not_retry_billable_requests_in_development() -> None:
    settings = provider_module.get_settings()
    original_environment = settings.environment
    settings.environment = provider_module.Environment.DEVELOPMENT
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(500, text="temporary overload")

    try:
        provider = OpenAIImageProvider(
            "openai-key",
            draft_image_model="gpt-image-1-mini",
            image_model="gpt-image-1.5",
            transport=httpx.MockTransport(handler),
        )

        with pytest.raises(provider_module.ProviderTemporaryError):
            await provider.generate(
                prompt="editorial portrait",
                negative_prompt="",
                width=1024,
                height=1024,
                seed=22,
                model_id="flux-schnell",
            )

        assert call_count == 1
    finally:
        settings.environment = original_environment


def test_fal_provider_estimates_cost_from_selected_model_path() -> None:
    provider = FalProvider("fal-key")

    assert provider.estimate_generation_cost(
        width=1024,
        height=1024,
        model_id="flux-schnell",
        workflow="text_to_image",
    ) == 0.003
    assert provider.estimate_generation_cost(
        width=1024,
        height=1024,
        model_id="realvis-xl",
        workflow="text_to_image",
    ) == 0.04


@pytest.mark.asyncio
async def test_fal_provider_retries_temporary_submit_failures_with_exponential_backoff(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = provider_module.get_settings()
    original_environment = settings.environment
    settings.environment = provider_module.Environment.PRODUCTION
    delays: list[float] = []
    submit_attempts = {"count": 0}

    async def fake_sleep(delay: float) -> None:
        delays.append(delay)

    monkeypatch.setattr(provider_module.asyncio, "sleep", fake_sleep)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            submit_attempts["count"] += 1
            if submit_attempts["count"] < 3:
                raise httpx.ConnectTimeout("submit timed out", request=request)
            return httpx.Response(
                200,
                json={
                    "request_id": "req-retry",
                    "status_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/req-retry/status",
                    "response_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/req-retry",
                },
            )
        if request.url.path.endswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        if request.url.path.endswith("/req-retry"):
            return httpx.Response(
                200,
                json={
                    "images": [
                        {
                            "url": "https://cdn.fal.ai/generated/retry.png",
                            "content_type": "image/png",
                            "width": 1024,
                            "height": 1024,
                        }
                    ]
                },
            )
        if str(request.url) == "https://cdn.fal.ai/generated/retry.png":
            return httpx.Response(200, content=b"retry-bytes", headers={"content-type": "image/png"})
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    try:
        provider = FalProvider("test-key", transport=httpx.MockTransport(handler))
        result = await provider.generate(
            prompt="cinematic portrait",
            negative_prompt="",
            width=1024,
            height=1024,
            seed=77,
            model_id="flux-schnell",
        )
    finally:
        settings.environment = original_environment

    assert result.provider == "fal"
    assert submit_attempts["count"] == 3
    assert delays == [1.0, 2.0]


@pytest.mark.asyncio
async def test_runware_provider_retries_temporary_request_failures_with_exponential_backoff(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = provider_module.get_settings()
    original_environment = settings.environment
    settings.environment = provider_module.Environment.PRODUCTION
    delays: list[float] = []
    request_attempts = {"count": 0}

    async def fake_sleep(delay: float) -> None:
        delays.append(delay)

    monkeypatch.setattr(provider_module.asyncio, "sleep", fake_sleep)

    def handler(request: httpx.Request) -> httpx.Response:
        request_attempts["count"] += 1
        if request_attempts["count"] < 3:
            raise httpx.ReadTimeout("runware timeout", request=request)
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "taskType": "imageInference",
                        "imageDataURI": f"data:image/png;base64,{base64_png('retry')}",
                        "cost": 0.02,
                        "NSFWContent": False,
                    }
                ]
            },
        )

    try:
        provider = RunwareProvider("runware-key", transport=httpx.MockTransport(handler))
        result = await provider.generate(
            prompt="editorial portrait",
            negative_prompt="",
            width=768,
            height=1024,
            seed=88,
            model_id="flux-schnell",
        )
    finally:
        settings.environment = original_environment

    assert result.provider == "runware"
    assert request_attempts["count"] == 3
    assert delays == [1.0, 2.0]


@pytest.mark.asyncio
async def test_pollinations_provider_selects_higher_quality_model_for_realistic_prompts() -> None:
    captured_url = ""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal captured_url
        captured_url = str(request.url)
        return httpx.Response(200, content=b"pollinations-image", headers={"content-type": "image/jpeg"})

    provider = PollinationsProvider(enabled=True, transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="luxury beauty portrait of a woman",
        negative_prompt="blurry",
        width=1024,
        height=1024,
        seed=5,
        model_id="realvis-xl",
    )

    assert result.provider == "pollinations"
    assert "model=gptimage" in captured_url
    assert "quality=high" in captured_url
    assert "negative=blurry" in captured_url


@pytest.mark.asyncio
async def test_huggingface_provider_falls_back_to_next_candidate_model_when_first_is_unavailable() -> None:
    requested_urls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested_urls.append(str(request.url))
        if "FLUX.1-Krea-dev" in str(request.url):
            return httpx.Response(410, text="model retired")
        return httpx.Response(200, content=b"hf-image", headers={"content-type": "image/png"})

    provider = HuggingFaceImageProvider("hf-token", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="editorial beauty portrait",
        negative_prompt="blurry",
        width=1024,
        height=1024,
        seed=3,
        model_id="realvis-xl",
    )

    assert result.provider == "huggingface"
    assert any("FLUX.1-Krea-dev" in url for url in requested_urls)
    assert any("playground-v2.5-1024px-aesthetic" in url for url in requested_urls)
    assert result.mime_type == "image/png"


@pytest.mark.asyncio
async def test_pollinations_health_marks_auth_rejection_unavailable() -> None:
    def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(401, text="unauthorized")

    provider = PollinationsProvider(enabled=True, transport=httpx.MockTransport(handler))
    health = await provider.health()

    assert health["status"] == "unavailable"
    assert "401" in str(health["detail"])


@pytest.mark.asyncio
async def test_huggingface_health_marks_rejected_token_unavailable() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        if str(request.url) == "https://huggingface.co/api/whoami-v2":
            return httpx.Response(401, text="expired token")
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    provider = HuggingFaceImageProvider("hf-token", transport=httpx.MockTransport(handler))
    health = await provider.health()

    assert health["status"] == "unavailable"
    assert "token rejected" in str(health["detail"])


def base64_png(text: str) -> str:
    return __import__("base64").b64encode(text.encode("utf-8")).decode("ascii")


def image_bytes(*, width: int, height: int) -> bytes:
    buffer = __import__("io").BytesIO()
    image = Image.new("RGB", (width, height), color=(24, 32, 48))
    image.save(buffer, format="PNG")
    return buffer.getvalue()
