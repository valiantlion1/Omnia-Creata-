from __future__ import annotations

from pathlib import Path

import pytest

import studio_platform.providers as provider_module
from config.env import get_settings
from studio_platform.billing_ops import BillingStateSnapshot
from studio_platform.bootstrap_contract_ops import build_settings_bootstrap_payload
from studio_platform import owner_health_ops
from studio_platform.contract_catalog import BOOTSTRAP_FIELDS, build_contract_freeze_summary
from studio_platform.llm import StudioLLMGateway
from studio_platform.model_catalog_ops import (
    get_model_catalog_entry_or_raise,
    serialize_model_catalog_for_identity,
    validate_model_for_identity,
)
from studio_platform.models import IdentityPlan, OmniaIdentity
from studio_platform.operator_control_plane_ops import build_owner_ai_control_plane
from studio_platform.owner_health_ops import build_owner_health_payload
from studio_platform.providers import ProviderCapabilities, ProviderRegistry, StudioImageProvider
from studio_platform.service import StudioService
from studio_platform.store import StudioStateStore


class _FakeProvider(StudioImageProvider):
    def __init__(self, *, name: str, rollout_tier: str, billable: bool) -> None:
        self.name = name
        self.rollout_tier = rollout_tier
        self.billable = billable
        self.capabilities = ProviderCapabilities(workflows=("text_to_image",))

    async def is_available(self) -> bool:
        return True

    def is_configured(self) -> bool:
        return True

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {"name": self.name, "status": "healthy", "detail": "fake"}

    async def generate(self, **kwargs):
        raise NotImplementedError


def test_serialize_model_catalog_for_identity_preserves_contract_fields() -> None:
    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
    )
    model = get_model_catalog_entry_or_raise("flux-schnell")

    serialized = serialize_model_catalog_for_identity(
        identity=identity,
        model=model,
        providers=ProviderRegistry(),
    )

    assert serialized["id"] == "flux-schnell"
    assert serialized["label"] == serialized["creative_profile"]["label"]
    assert serialized["display_label"] == serialized["creative_profile"]["label"]
    assert serialized["display_badge"] == serialized["creative_profile"]["badge"]
    assert serialized["display_description"] == serialized["creative_profile"]["description"]
    assert serialized["route_preview"]["render_experience"]["state"] == serialized["render_experience"]["state"]
    assert serialized["route_preview"]["pricing_lane"] in {"draft", "fallback"}


def test_serialize_model_catalog_for_identity_uses_wallet_backed_route_preview() -> None:
    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        extra_credits=60,
    )
    model = get_model_catalog_entry_or_raise("flux-schnell")
    providers = ProviderRegistry()
    runware = _FakeProvider(name="runware", rollout_tier="primary", billable=True)
    pollinations = _FakeProvider(name="pollinations", rollout_tier="fallback", billable=False)
    providers.providers = [runware, pollinations]
    providers._providers_by_name = {provider.name: provider for provider in providers.providers}
    providers._provider_circuits = {
        provider.name: provider_module.ProviderCircuitState() for provider in providers.providers
    }

    serialized = serialize_model_catalog_for_identity(
        identity=identity,
        model=model,
        providers=providers,
    )

    assert serialized["route_preview"]["planned_provider"] == "runware"
    assert serialized["render_experience"]["state"] == "ready"


def test_validate_model_for_identity_honors_effective_free_plan_when_subscription_is_inactive() -> None:
    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        extra_credits=60,
    )
    model = get_model_catalog_entry_or_raise("juggernaut-xl")
    billing_state = BillingStateSnapshot(
        gross_remaining=60,
        reserved_total=0,
        available_to_spend=60,
        monthly_remaining=0,
        monthly_allowance=0,
        extra_credits=60,
        unlimited=False,
        effective_plan=IdentityPlan.FREE,
        subscription_active=False,
    )

    with pytest.raises(PermissionError, match="requires Pro"):
        validate_model_for_identity(identity=identity, model=model, billing_state=billing_state)


def test_build_owner_health_payload_promotes_launch_truth_keys() -> None:
    launch_readiness = {
        "launch_gate": {"status": "ready"},
        "provider_truth": {"selected_chat_provider": "openai"},
        "platform_readiness": {"status": "ready"},
        "truth_sync": {"all_current_build": True},
    }

    payload = build_owner_health_payload(
        overall_status="healthy",
        provider_status=[{"name": "openai", "status": "healthy"}],
        counts={"identities": 1},
        generation_runtime_mode="all",
        generation_queue={"queued": 0},
        generation_broker_payload={"enabled": False, "detail": "local_queue_only"},
        worker_id="worker-1",
        worker_processing_active=True,
        generation_routing={"default_strategy": "free-first"},
        chat_routing={"primary_provider": "openai"},
        data_authority={"mode": "sqlite"},
        provider_economics_dossier={"report_kind": "provider_economics_dossier", "build": "2026.04.14.99"},
        ai_control_plane={"surface_matrix": [], "contract_freeze": {}},
        launch_readiness=launch_readiness,
    )

    assert payload["launch_readiness"] == launch_readiness
    assert payload["launch_gate"] == launch_readiness["launch_gate"]
    assert payload["provider_truth"] == launch_readiness["provider_truth"]
    assert payload["platform_readiness"] == launch_readiness["platform_readiness"]
    assert payload["truth_sync"] == launch_readiness["truth_sync"]
    assert payload["provider_economics_dossier"]["report_kind"] == "provider_economics_dossier"


def test_build_owner_ai_control_plane_keeps_surface_matrix_and_contract_freeze() -> None:
    settings = get_settings()
    providers = ProviderRegistry()
    llm_gateway = StudioLLMGateway()

    control_plane = build_owner_ai_control_plane(
        settings=settings,
        providers=providers,
        llm_gateway=llm_gateway,
        chat_routing=llm_gateway.routing_summary(),
        generation_routing=providers.routing_summary(),
    )

    assert control_plane["contract_freeze"]["product_generation_statuses"] == [
        "queued",
        "running",
        "ready",
        "failed",
        "blocked",
    ]
    assert any(item["id"] == "create:flux-schnell" for item in control_plane["surface_matrix"])
    assert any(item["id"] == "chat:standard-assist" for item in control_plane["surface_matrix"])


def test_build_settings_bootstrap_payload_keeps_signed_in_shell_contract() -> None:
    payload = build_settings_bootstrap_payload(
        identity={"id": "user-1"},
        entitlements={"premium_chat": False},
        plans=[{"id": "free"}],
        models=[{"id": "flux-schnell"}],
        presets={"default": {"id": "default"}},
        compose_draft_id="draft-compose",
        chat_draft_id="draft-chat",
        styles={"catalog": [], "my_styles": [], "favorites": []},
        prompt_memory={"identity_id": "user-1"},
    )

    for field in BOOTSTRAP_FIELDS:
        assert field in payload
    assert payload["draft_projects"] == {"compose": "draft-compose", "chat": "draft-chat"}
    assert payload["styles"]["favorites"] == []
    assert payload["prompt_memory"]["identity_id"] == "user-1"


def test_contract_catalog_keeps_full_signed_in_shell_field_list() -> None:
    expected = [
        "identity",
        "entitlements",
        "plans",
        "models",
        "presets",
        "draft_projects",
        "styles",
        "prompt_memory",
    ]

    assert list(BOOTSTRAP_FIELDS) == expected
    assert build_contract_freeze_summary()["bootstrap_fields"] == expected


def test_studio_service_remains_under_backend_spine_size_target() -> None:
    service_path = Path(__file__).resolve().parents[1] / "studio_platform" / "service.py"
    line_count = len(service_path.read_text(encoding="utf-8").splitlines())

    assert line_count <= 1600


def test_studio_service_delegates_shell_bootstrap_and_model_catalog() -> None:
    service_path = Path(__file__).resolve().parents[1] / "studio_platform" / "service.py"
    source = service_path.read_text(encoding="utf-8")

    assert "return await self.shell.get_settings_payload(identity_id)" in source
    assert "return await self.shell.list_models_for_identity(identity)" in source
    assert "return await self.shell.get_model(model_id)" in source


@pytest.mark.asyncio
async def test_health_detail_survives_cost_telemetry_failure(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    service = StudioService(StudioStateStore(tmp_path / "state.json"), ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    async def _explode() -> dict[str, object]:
        raise RuntimeError("telemetry unavailable")

    monkeypatch.setattr(service, "_build_cost_telemetry_summary", _explode)

    try:
        payload = await service.health(detail=True)
        assert payload["cost_telemetry"]["status"] == "error"
        assert payload["launch_gate"]["status"] in {"ready", "blocked", "needs_attention"}
        assert "truth_sync" in payload
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_health_detail_uses_launch_readiness_fallback_on_builder_failure(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = StudioService(StudioStateStore(tmp_path / "state.json"), ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    def _explode(**_: object) -> dict[str, object]:
        raise RuntimeError("readiness unavailable")

    monkeypatch.setattr(owner_health_ops, "build_launch_readiness_report", _explode)

    try:
        payload = await service.health(detail=True)
        assert payload["launch_readiness"]["status"] == "blocked"
        assert payload["launch_gate"]["status"] == "blocked"
        assert payload["launch_gate"]["ready_for_protected_launch"] is False
        assert payload["provider_truth"]["public_paid_usage_safe"] is False
        assert payload["launch_readiness"]["checks"][0]["key"] == "launch_readiness_runtime"
    finally:
        await service.shutdown()
