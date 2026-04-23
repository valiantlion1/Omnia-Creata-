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
from studio_platform.owner_health_ops import build_runtime_topology_summary
from studio_platform.providers import ProviderCapabilities, ProviderRegistry, StudioImageProvider
from studio_platform.service import StudioService
from studio_platform.studio_model_contract import (
    STUDIO_FAST_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID,
    STUDIO_STANDARD_MODEL_ID,
    normalize_studio_model_id,
    resolve_runware_model_air_id,
)
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
    model = get_model_catalog_entry_or_raise(STUDIO_FAST_MODEL_ID)

    serialized = serialize_model_catalog_for_identity(
        identity=identity,
        model=model,
        providers=ProviderRegistry(),
    )

    assert serialized["id"] == STUDIO_FAST_MODEL_ID
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
    model = get_model_catalog_entry_or_raise(STUDIO_FAST_MODEL_ID)
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
    model = get_model_catalog_entry_or_raise(STUDIO_SIGNATURE_MODEL_ID)
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


def test_standard_model_contract_normalizes_legacy_aliases_to_qwen() -> None:
    model = get_model_catalog_entry_or_raise("flux-2-dev")

    assert model.id == STUDIO_STANDARD_MODEL_ID
    assert model.estimated_cost == pytest.approx(0.0051)
    assert normalize_studio_model_id("sdxl-base") == STUDIO_STANDARD_MODEL_ID
    assert normalize_studio_model_id("alibaba:qwen-image@2512") == STUDIO_STANDARD_MODEL_ID
    assert resolve_runware_model_air_id("flux-2-dev") == "alibaba:qwen-image@2512"


def test_premium_model_contract_normalizes_legacy_aliases_to_flux_max() -> None:
    model = get_model_catalog_entry_or_raise("flux-2-pro")

    assert model.id != "flux-2-pro"
    assert model.estimated_cost == pytest.approx(0.07)
    assert normalize_studio_model_id("flux-2-pro") == model.id
    assert normalize_studio_model_id("bfl:5@1") == model.id
    assert resolve_runware_model_air_id("flux-2-pro") == "bfl:7@1"


def test_build_owner_health_payload_promotes_launch_truth_keys() -> None:
    launch_readiness = {
        "launch_gate": {"status": "ready"},
        "provider_truth": {"selected_chat_provider": "openai"},
        "platform_readiness": {"status": "ready"},
        "truth_sync": {"all_current_build": True},
    }
    runtime_topology = {
        "status": "warning",
        "mode": "all",
        "topology_class": "all_in_one",
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
        runtime_topology=runtime_topology,
        launch_readiness=launch_readiness,
    )

    assert payload["launch_readiness"] == launch_readiness
    assert payload["runtime_topology"] == runtime_topology
    assert payload["launch_gate"] == launch_readiness["launch_gate"]
    assert payload["provider_truth"] == launch_readiness["provider_truth"]
    assert payload["platform_readiness"] == launch_readiness["platform_readiness"]
    assert payload["truth_sync"] == launch_readiness["truth_sync"]
    assert payload["provider_economics_dossier"]["report_kind"] == "provider_economics_dossier"


def test_build_owner_health_payload_keeps_moderation_summary() -> None:
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
        moderation_summary={
            "open_case_count": 2,
            "open_report_count": 1,
            "open_appeal_count": 1,
            "actioned_case_count": 0,
            "hidden_pending_review_post_count": 1,
            "private_only_post_count": 3,
        },
    )

    assert payload["moderation_summary"]["open_case_count"] == 2
    assert payload["moderation_summary"]["hidden_pending_review_post_count"] == 1


def test_build_runtime_topology_summary_marks_local_all_in_one_as_alpha_ready_but_not_launch_ready() -> None:
    settings = get_settings()
    launch_readiness = {
        "checks": [
            {
                "key": "runtime_topology",
                "status": "warning",
                "summary": "Generation still runs in all-in-one local convenience mode.",
                "detail": "Launch readiness is stronger with explicit web/worker topology.",
            }
        ],
        "launch_gate": {"ready_for_protected_launch": False},
        "platform_readiness": {"current_stage": "local_alpha", "next_stage": "protected_beta"},
    }

    summary = build_runtime_topology_summary(
        settings=settings,
        generation_runtime_mode="all",
        generation_broker_payload={"enabled": False, "configured": False, "advisory": False, "degraded": False},
        launch_readiness=launch_readiness,
    )

    assert summary["status"] == "warning"
    assert summary["mode"] == "all"
    assert summary["topology_class"] == "all_in_one"
    assert summary["generation_delivery_mode"] == "local_all_in_one"
    assert summary["operator_posture"] == "local_alpha_safe"
    assert "same local process" in summary["generation_delivery_summary"].lower()
    assert summary["local_processing_enabled"] is True
    assert summary["local_alpha_ready"] is True
    assert summary["topology_ready_for_protected_launch"] is False
    assert summary["launch_gate_ready"] is False
    assert any("split web/worker" in item.lower() for item in summary["action_items"])


def test_build_runtime_topology_summary_marks_non_dev_all_in_one_as_launch_blocked() -> None:
    settings = get_settings()
    original_environment = settings.environment
    settings.environment = owner_health_ops.Environment.STAGING
    launch_readiness = {
        "checks": [
            {
                "key": "runtime_topology",
                "status": "blocked",
                "summary": "Generation runtime is still configured as all-in-one outside local development.",
                "detail": "All-in-one mode is development-only; staging and production must run split web/worker topology with a shared broker.",
            }
        ],
        "launch_gate": {"ready_for_protected_launch": False},
        "platform_readiness": {"current_stage": "protected_beta", "next_stage": "public_paid_platform"},
    }

    try:
        summary = build_runtime_topology_summary(
            settings=settings,
            generation_runtime_mode="all",
            generation_broker_payload={"enabled": False, "configured": False, "advisory": False, "degraded": False},
            launch_readiness=launch_readiness,
        )
    finally:
        settings.environment = original_environment

    assert summary["status"] == "blocked"
    assert summary["mode"] == "all"
    assert summary["topology_class"] == "all_in_one"
    assert summary["generation_delivery_mode"] == "local_all_in_one"
    assert summary["operator_posture"] == "launch_blocked"
    assert summary["shared_broker_required"] is True
    assert summary["topology_ready_for_protected_launch"] is False
    assert any("staging or production startup" in item.lower() for item in summary["action_items"])


def test_build_runtime_topology_summary_marks_split_broker_as_launch_shaped() -> None:
    settings = get_settings()
    launch_readiness = {
        "checks": [
            {
                "key": "runtime_topology",
                "status": "pass",
                "summary": "Generation runtime topology is coherent.",
                "detail": "Runtime mode is web.",
            }
        ],
        "launch_gate": {"ready_for_protected_launch": True},
        "platform_readiness": {"current_stage": "protected_beta", "next_stage": "public_paid_platform"},
    }

    summary = build_runtime_topology_summary(
        settings=settings,
        generation_runtime_mode="web",
        generation_broker_payload={"enabled": True, "configured": True, "advisory": False, "degraded": False},
        launch_readiness=launch_readiness,
    )

    assert summary["status"] == "pass"
    assert summary["mode"] == "web"
    assert summary["topology_class"] == "split_shared_broker"
    assert summary["generation_delivery_mode"] == "web_enqueue_shared_worker"
    assert summary["operator_posture"] == "split_submission_surface"
    assert summary["shared_broker_active"] is True
    assert summary["local_processing_enabled"] is False
    assert summary["local_alpha_ready"] is True
    assert summary["topology_ready_for_protected_launch"] is True
    assert summary["launch_gate_ready"] is True
    assert any("worker runtime" in item.lower() for item in summary["action_items"])


def test_build_runtime_topology_summary_marks_dev_web_fallback_as_local_alpha_only() -> None:
    settings = get_settings()
    original_environment = settings.environment
    settings.environment = owner_health_ops.Environment.DEVELOPMENT
    launch_readiness = {
        "checks": [
            {
                "key": "runtime_topology",
                "status": "warning",
                "summary": "Generation broker is not configured for web runtime; falling back to local processing in degraded mode.",
                "detail": "Local alpha can keep working, but protected launch wants a real shared broker.",
            }
        ],
        "launch_gate": {"ready_for_protected_launch": False},
        "platform_readiness": {"current_stage": "local_alpha", "next_stage": "protected_beta"},
    }

    try:
        summary = build_runtime_topology_summary(
            settings=settings,
            generation_runtime_mode="web",
            generation_broker_payload={
                "enabled": False,
                "configured": True,
                "advisory": True,
                "degraded": False,
                "detail": "redis_unavailable_fallback_local_queue",
            },
            launch_readiness=launch_readiness,
        )
    finally:
        settings.environment = original_environment

    assert summary["status"] == "warning"
    assert summary["topology_class"] == "split_advisory_fallback"
    assert summary["generation_delivery_mode"] == "local_web_fallback"
    assert summary["operator_posture"] == "local_alpha_only"
    assert "processing jobs locally" in summary["generation_delivery_summary"].lower()
    assert any("local alpha only" in item.lower() for item in summary["action_items"])


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
    assert any(item["id"] == f"create:{STUDIO_FAST_MODEL_ID}" for item in control_plane["surface_matrix"])
    assert any(item["id"] == "chat:standard-assist" for item in control_plane["surface_matrix"])


def test_build_settings_bootstrap_payload_keeps_signed_in_shell_contract() -> None:
    payload = build_settings_bootstrap_payload(
        identity={"id": "user-1"},
        entitlements={"premium_chat": False},
        plans=[{"id": "free"}],
        models=[{"id": STUDIO_FAST_MODEL_ID}],
        presets={"default": {"id": "default"}},
        compose_draft_id="draft-compose",
        chat_draft_id="draft-chat",
        styles={"catalog": [], "my_styles": [], "favorites": []},
        prompt_memory={"identity_id": "user-1"},
        active_sessions={
            "current_session_id": "session-current",
            "sessions": [],
            "session_count": 0,
            "other_session_count": 0,
            "can_sign_out_others": False,
        },
    )

    for field in BOOTSTRAP_FIELDS:
        assert field in payload
    assert payload["draft_projects"] == {"compose": "draft-compose", "chat": "draft-chat"}
    assert payload["styles"]["favorites"] == []
    assert payload["prompt_memory"]["identity_id"] == "user-1"
    assert payload["active_sessions"]["session_count"] == 0


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
        "active_sessions",
    ]

    assert list(BOOTSTRAP_FIELDS) == expected
    assert build_contract_freeze_summary()["bootstrap_fields"] == expected


def test_studio_service_remains_under_backend_spine_size_target() -> None:
    service_path = Path(__file__).resolve().parents[1] / "studio_platform" / "service.py"
    line_count = len(service_path.read_text(encoding="utf-8").splitlines())

    assert line_count <= 1600


def test_studio_service_delegates_shell_bootstrap_and_model_catalog() -> None:
    service_path = Path(__file__).resolve().parents[1] / "studio_platform" / "service.py"
    delegates_path = Path(__file__).resolve().parents[1] / "studio_platform" / "service_delegates.py"
    source = service_path.read_text(encoding="utf-8") + delegates_path.read_text(encoding="utf-8")

    assert "return await self.shell.get_settings_payload(identity_id, current_session_id=current_session_id)" in source
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
        assert "telemetry unavailable" not in payload["cost_telemetry"]["detail"]
        assert "RuntimeError" in payload["cost_telemetry"]["detail"]
        assert "runtime logs" in payload["cost_telemetry"]["detail"].lower()
        assert payload["runtime_topology"]["mode"] == "all"
        assert payload["runtime_topology"]["topology_class"] == "all_in_one"
        assert payload["runtime_topology"]["generation_delivery_mode"] == "local_all_in_one"
        assert payload["runtime_topology"]["operator_posture"] == "local_alpha_safe"
        assert payload["runtime_topology"]["action_items"]
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
        assert "readiness unavailable" not in payload["launch_readiness"]["checks"][0]["detail"]
        assert "RuntimeError" in payload["launch_readiness"]["checks"][0]["detail"]
    finally:
        await service.shutdown()
