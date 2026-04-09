from __future__ import annotations

from pathlib import Path

import pytest

import studio_platform.providers as provider_module
from config.env import get_settings
from studio_platform.billing_ops import calculate_generation_final_charge, resolve_billing_state
from studio_platform.models import (
    CheckoutKind,
    CreditEntryType,
    GenerationJob,
    GenerationOutput,
    IdentityPlan,
    JobStatus,
    MediaAsset,
    OmniaIdentity,
    Project,
    PromptSnapshot,
    StudioWorkspace,
    SubscriptionStatus,
)
from studio_platform.providers import (
    ProviderCapabilities,
    ProviderRegistry,
    ProviderTemporaryError,
    StudioImageProvider,
)
from studio_platform.service import PLAN_CATALOG, StudioService
from studio_platform.services.generation_broker import InMemoryGenerationBroker
from studio_platform.services.generation_runtime import ExecutedGenerationBatch
from studio_platform.store import StudioStateStore


class _FakeProvider(StudioImageProvider):
    def __init__(
        self,
        *,
        name: str,
        rollout_tier: str,
        billable: bool,
        workflows: tuple[str, ...] = ("text_to_image",),
        supports_reference_image: bool = False,
        configured: bool = True,
    ) -> None:
        self.name = name
        self.rollout_tier = rollout_tier
        self.billable = billable
        self.capabilities = ProviderCapabilities(
            workflows=workflows,
            supports_reference_image=supports_reference_image,
        )
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


def _prompt_snapshot(prompt: str = "editorial portrait") -> PromptSnapshot:
    return PromptSnapshot(
        prompt=prompt,
        negative_prompt="",
        model="flux-schnell",
        width=1024,
        height=1024,
        steps=28,
        cfg_scale=6.5,
        seed=7,
        aspect_ratio="1:1",
    )


def _executed_batch(job: GenerationJob, *, provider_name: str, provider_billable: bool) -> ExecutedGenerationBatch:
    asset = MediaAsset(
        id=f"asset-{job.id}",
        workspace_id=job.workspace_id,
        project_id=job.project_id,
        identity_id=job.identity_id,
        title=job.title,
        prompt=job.prompt_snapshot.prompt,
        url=f"/media/{job.id}.png",
        thumbnail_url=f"/media/{job.id}-thumb.jpg",
        metadata={"provider": provider_name},
    )
    return ExecutedGenerationBatch(
        provider_name=provider_name,
        provider_rollout_tier="primary" if provider_billable else "standard",
        provider_billable=provider_billable,
        actual_cost_usd=0.01 if provider_billable else 0.0,
        generated_outputs=[
            GenerationOutput(
                asset_id=asset.id,
                url=asset.url,
                thumbnail_url=asset.thumbnail_url,
                mime_type="image/png",
                width=job.prompt_snapshot.width,
                height=job.prompt_snapshot.height,
                variation_index=0,
            )
        ],
        created_assets=[asset],
    )


async def _build_service(
    tmp_path: Path,
    *,
    providers: ProviderRegistry,
) -> tuple[StudioService, StudioStateStore, InMemoryGenerationBroker]:
    store = StudioStateStore(tmp_path / "state.json")
    broker = InMemoryGenerationBroker()
    service = StudioService(store, providers, tmp_path / "media", generation_broker=broker)
    await service.initialize()
    return service, store, broker


async def _seed_identity_project(
    store: StudioStateStore,
    *,
    plan: IdentityPlan = IdentityPlan.FREE,
    monthly_remaining: int = 60,
    monthly_allowance: int | None = None,
    extra_credits: int = 0,
    subscription_status: SubscriptionStatus = SubscriptionStatus.NONE,
    owner_mode: bool = False,
    root_admin: bool = False,
    local_access: bool = False,
) -> tuple[OmniaIdentity, Project]:
    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=plan,
        monthly_credits_remaining=monthly_remaining,
        monthly_credit_allowance=monthly_allowance if monthly_allowance is not None else PLAN_CATALOG[plan].monthly_credits,
        extra_credits=extra_credits,
        subscription_status=subscription_status,
        owner_mode=owner_mode,
        root_admin=root_admin,
        local_access=local_access,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
        )
    )
    return identity, project


@pytest.fixture
def _web_runtime_mode() -> None:
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    settings.generation_runtime_mode = "web"
    try:
        yield
    finally:
        settings.generation_runtime_mode = original_mode


def test_calculate_generation_final_charge_policies() -> None:
    assert calculate_generation_final_charge(
        base_credit_cost=12,
        provider_name="fal",
        provider_billable=True,
        degraded=False,
    ) == ("managed_full", 12)
    assert calculate_generation_final_charge(
        base_credit_cost=7,
        provider_name="pollinations",
        provider_billable=False,
        degraded=False,
    ) == ("standard_discount", 4)
    assert calculate_generation_final_charge(
        base_credit_cost=8,
        provider_name="demo",
        provider_billable=False,
        degraded=True,
    ) == ("degraded_free", 0)


def test_resolve_billing_state_accounts_for_reserved_jobs() -> None:
    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=30,
        monthly_credit_allowance=60,
        extra_credits=15,
    )
    jobs = [
        GenerationJob(
            id="job-1",
            workspace_id="ws-user-1",
            project_id="project-1",
            identity_id=identity.id,
            title="Queued",
            provider="pollinations",
            model="flux-schnell",
            prompt_snapshot=_prompt_snapshot(),
            estimated_cost=0.0,
            credit_cost=6,
            reserved_credit_cost=3,
            credit_status="reserved",
            status=JobStatus.QUEUED,
        ),
        GenerationJob(
            id="job-2",
            workspace_id="ws-user-1",
            project_id="project-1",
            identity_id=identity.id,
            title="Settled",
            provider="pollinations",
            model="flux-schnell",
            prompt_snapshot=_prompt_snapshot(),
            estimated_cost=0.0,
            credit_cost=6,
            reserved_credit_cost=3,
            credit_status="settled",
            status=JobStatus.SUCCEEDED,
        ),
    ]

    billing_state = resolve_billing_state(
        identity=identity,
        generation_jobs=jobs,
        plan_catalog=PLAN_CATALOG,
    )

    assert billing_state.gross_remaining == 45
    assert billing_state.reserved_total == 3
    assert billing_state.available_to_spend == 42


@pytest.mark.asyncio
async def test_billing_summary_reports_reserved_and_available_credits(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="pollinations", rollout_tier="standard", billable=False),
        _FakeProvider(name="huggingface", rollout_tier="standard", billable=False),
        _FakeProvider(name="demo", rollout_tier="degraded", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="luxury campaign portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=11,
            aspect_ratio="1:1",
            output_count=1,
        )

        summary = await service.billing_summary(identity.id)
        serialized = service.serialize_generation_for_identity(job, identity.id)

        assert summary["credits"]["gross_remaining"] == 60
        assert summary["credits"]["reserved_total"] == 3
        assert summary["credits"]["available_to_spend"] == 57
        assert summary["credits"]["spend_order"] == "monthly_then_extra"
        assert summary["credits"]["unlimited"] is False
        draft_guide = next(
            entry
            for entry in summary["generation_credit_guide"]["lane_highlights"]
            if entry["pricing_lane"] == "fallback"
        )
        assert job.estimated_cost == 0.003
        assert job.pricing_lane == "fallback"
        assert job.estimated_cost_source == "catalog_fallback"
        assert serialized["reserved_credit_cost"] == 3
        assert serialized["final_credit_cost"] is None
        assert serialized["credit_charge_policy"] == "none"
        assert serialized["credit_status"] == "reserved"
        assert serialized["pricing_lane"] == "fallback"
        assert serialized["estimated_cost_source"] == "catalog_fallback"
        assert draft_guide["quoted_credit_cost"] == 6
        assert draft_guide["reserved_credit_cost"] == 3
        assert draft_guide["settlement_credit_cost"] == 3
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_standard_lane_generation_reserves_and_settles_discounted_credits(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="pollinations", rollout_tier="standard", billable=False),
        _FakeProvider(name="huggingface", rollout_tier="standard", billable=False),
        _FakeProvider(name="demo", rollout_tier="degraded", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="minimal geometric poster composition",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=17,
            aspect_ratio="1:1",
            output_count=1,
        )
        async def execute_job(queued_job: GenerationJob) -> ExecutedGenerationBatch:
            return _executed_batch(
                queued_job,
                provider_name="pollinations",
                provider_billable=False,
            )

        service.generation_runtime.execute_job = execute_job  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        settled = snapshot.generations[job.id]
        updated_identity = snapshot.identities[identity.id]

        assert settled.status == JobStatus.SUCCEEDED
        assert settled.reserved_credit_cost == 3
        assert settled.final_credit_cost == 3
        assert settled.credit_charge_policy == "standard_discount"
        assert settled.credit_status == "settled"
        assert updated_identity.monthly_credits_remaining == 57
        assert not any(entry.entry_type == CreditEntryType.TOP_UP for entry in snapshot.credit_ledger.values())
        assert any(
            entry.entry_type == CreditEntryType.GENERATION_SPEND and entry.amount == -3
            for entry in snapshot.credit_ledger.values()
        )
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_managed_generation_consumes_monthly_then_extra_credits(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(
            name="fal",
            rollout_tier="primary",
            billable=True,
            workflows=("text_to_image", "image_to_image", "edit"),
            supports_reference_image=True,
        )
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=2,
            monthly_allowance=1200,
            extra_credits=10,
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="luxury fashion campaign portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="realvis-xl",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=23,
            aspect_ratio="1:1",
            output_count=1,
        )
        async def execute_job(queued_job: GenerationJob) -> ExecutedGenerationBatch:
            return _executed_batch(
                queued_job,
                provider_name="fal",
                provider_billable=True,
            )

        service.generation_runtime.execute_job = execute_job  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        settled = snapshot.generations[job.id]
        updated_identity = snapshot.identities[identity.id]

        assert job.reserved_credit_cost == 12
        assert settled.final_credit_cost == 12
        assert settled.credit_charge_policy == "managed_full"
        assert updated_identity.monthly_credits_remaining == 0
        assert updated_identity.extra_credits == 0
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_openai_routed_generation_uses_provider_estimated_cost_for_job_truth(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        provider_module.OpenAIImageProvider(
            "openai-key",
            draft_image_model="gpt-image-1-mini",
            image_model="gpt-image-1.5",
        )
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=1200,
            monthly_allowance=1200,
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=41,
            aspect_ratio="1:1",
            output_count=2,
        )

        assert job.provider == "openai"
        assert job.provider_billable is True
        assert job.pricing_lane == "draft"
        assert job.estimated_cost_source == "provider_quote"
        assert job.estimated_cost == 0.018
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_demo_generation_is_free_and_releases_credit_hold(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="demo", rollout_tier="degraded", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="simple moodboard sketch",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=31,
            aspect_ratio="1:1",
            output_count=1,
        )
        async def execute_job(queued_job: GenerationJob) -> ExecutedGenerationBatch:
            return _executed_batch(
                queued_job,
                provider_name="demo",
                provider_billable=False,
            )

        service.generation_runtime.execute_job = execute_job  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        settled = snapshot.generations[job.id]
        updated_identity = snapshot.identities[identity.id]

        assert job.reserved_credit_cost == 0
        assert settled.final_credit_cost == 0
        assert settled.credit_charge_policy == "degraded_free"
        assert settled.credit_status == "released"
        assert updated_identity.monthly_credits_remaining == 60
        assert not any(entry.entry_type == CreditEntryType.GENERATION_SPEND for entry in snapshot.credit_ledger.values())
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_failed_generation_releases_reservation_without_spend(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="pollinations", rollout_tier="standard", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=37,
            aspect_ratio="1:1",
            output_count=1,
        )

        async def fail_execute_job(_: GenerationJob) -> ExecutedGenerationBatch:
            raise RuntimeError("provider exploded")

        service.generation_runtime.execute_job = fail_execute_job  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        failed = snapshot.generations[job.id]
        updated_identity = snapshot.identities[identity.id]

        assert failed.status == JobStatus.FAILED
        assert failed.credit_status == "released"
        assert failed.final_credit_cost == 0
        assert updated_identity.monthly_credits_remaining == 60
        assert not any(entry.entry_type == CreditEntryType.GENERATION_SPEND for entry in snapshot.credit_ledger.values())
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_retryable_failure_keeps_existing_reservation(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="pollinations", rollout_tier="standard", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=41,
            aspect_ratio="1:1",
            output_count=1,
        )

        async def temporary_fail(_: GenerationJob) -> ExecutedGenerationBatch:
            raise ProviderTemporaryError("temporary capacity issue")

        service.generation_runtime.execute_job = temporary_fail  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        retryable = snapshot.generations[job.id]

        assert retryable.status == JobStatus.RETRYABLE_FAILED
        assert retryable.reserved_credit_cost == 3
        assert retryable.credit_status == "reserved"
        assert retryable.final_credit_cost is None
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_retryable_failure_updates_job_provider_to_last_actual_attempt(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="pollinations", rollout_tier="standard", billable=False),
        _FakeProvider(name="huggingface", rollout_tier="standard", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=43,
            aspect_ratio="1:1",
            output_count=1,
        )

        async def temporary_fail(_: GenerationJob) -> ExecutedGenerationBatch:
            exc = ProviderTemporaryError("huggingface expired token")
            setattr(exc, "provider_name", "huggingface")
            raise exc

        service.generation_runtime.execute_job = temporary_fail  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        retryable = snapshot.generations[job.id]

        assert retryable.status == JobStatus.RETRYABLE_FAILED
        assert retryable.provider == "huggingface"
        assert retryable.error == "huggingface expired token"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_active_reservation_blocks_over_admission(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="pollinations", rollout_tier="standard", billable=False),
        _FakeProvider(name="demo", rollout_tier="degraded", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(
            store,
            plan=IdentityPlan.FREE,
            monthly_remaining=5,
            monthly_allowance=60,
        )
        first_job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait one",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=51,
            aspect_ratio="1:1",
            output_count=1,
        )

        assert first_job.reserved_credit_cost == 3
        with pytest.raises(ValueError, match="Not enough credits"):
            await service.create_generation(
                identity_id=identity.id,
                project_id=project.id,
                prompt="editorial portrait two",
                negative_prompt="",
                reference_asset_id=None,
                model_id="flux-schnell",
                width=1024,
                height=1024,
                steps=28,
                cfg_scale=6.5,
                seed=52,
                aspect_ratio="1:1",
                output_count=1,
            )
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_subscription_cancelled_keeps_pro_entitlements_until_expired(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    service, store, _ = await _build_service(tmp_path, providers=_registry_with())
    try:
        identity, _ = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=700,
            monthly_allowance=1200,
            extra_credits=150,
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        await service.process_lemonsqueezy_webhook(
            {
                "data": {"id": "sub-1", "type": "subscriptions", "attributes": {"status": "cancelled"}},
                "meta": {
                    "event_name": "subscription_cancelled",
                    "custom_data": {
                        "identity_id": identity.id,
                        "checkout_kind": CheckoutKind.PRO_MONTHLY.value,
                    },
                },
            }
        )

        summary = await service.billing_summary(identity.id)
        snapshot = await store.snapshot()
        updated_identity = snapshot.identities[identity.id]

        assert updated_identity.plan == IdentityPlan.PRO
        assert updated_identity.subscription_status == SubscriptionStatus.CANCELED
        assert summary["entitlements"]["premium_chat"] is True
        assert summary["credits"]["monthly_remaining"] == 700
        assert summary["credits"]["extra_credits"] == 150
        assert summary["generation_credit_guide"]["available_to_spend"] == summary["credits"]["available_to_spend"]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_subscription_expired_clamps_to_free_without_granting_new_monthly_credits(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    service, store, _ = await _build_service(tmp_path, providers=_registry_with())
    try:
        identity, _ = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=700,
            monthly_allowance=1200,
            extra_credits=150,
            subscription_status=SubscriptionStatus.CANCELED,
        )
        await service.process_lemonsqueezy_webhook(
            {
                "data": {"id": "sub-1", "type": "subscriptions", "attributes": {"status": "expired"}},
                "meta": {
                    "event_name": "subscription_expired",
                    "custom_data": {
                        "identity_id": identity.id,
                        "checkout_kind": CheckoutKind.PRO_MONTHLY.value,
                    },
                },
            }
        )

        summary = await service.billing_summary(identity.id)
        snapshot = await store.snapshot()
        updated_identity = snapshot.identities[identity.id]

        assert updated_identity.plan == IdentityPlan.FREE
        assert updated_identity.subscription_status == SubscriptionStatus.CANCELED
        assert summary["entitlements"]["premium_chat"] is False
        assert summary["credits"]["monthly_remaining"] == 60
        assert summary["credits"]["extra_credits"] == 150
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_subscription_renewal_resets_allowance_and_is_idempotent(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    service, store, _ = await _build_service(tmp_path, providers=_registry_with())
    try:
        identity, _ = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=42,
            monthly_allowance=1200,
            extra_credits=80,
            subscription_status=SubscriptionStatus.CANCELED,
        )
        payload = {
            "data": {
                "id": "sub-1",
                "type": "subscriptions",
                "attributes": {"status": "active", "renewal": "2026-04-06"},
            },
            "meta": {
                "event_name": "subscription_payment_success",
                "custom_data": {
                    "identity_id": identity.id,
                    "checkout_kind": CheckoutKind.PRO_MONTHLY.value,
                },
            },
        }

        await service.process_lemonsqueezy_webhook(payload)
        await service.process_lemonsqueezy_webhook(payload)

        snapshot = await store.snapshot()
        updated_identity = snapshot.identities[identity.id]
        renewal_entries = [
            entry for entry in snapshot.credit_ledger.values() if entry.entry_type == CreditEntryType.SUBSCRIPTION
        ]

        assert updated_identity.plan == IdentityPlan.PRO
        assert updated_identity.subscription_status == SubscriptionStatus.ACTIVE
        assert updated_identity.monthly_credits_remaining == 1200
        assert updated_identity.extra_credits == 80
        assert len(snapshot.billing_webhook_receipts) == 1
        assert len(renewal_entries) == 1
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_owner_unlimited_accounts_skip_reservation_and_spend(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(
            name="fal",
            rollout_tier="primary",
            billable=True,
            workflows=("text_to_image", "image_to_image", "edit"),
            supports_reference_image=True,
        )
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=1200,
            monthly_allowance=1200,
            owner_mode=True,
            root_admin=True,
            local_access=True,
            subscription_status=SubscriptionStatus.ACTIVE,
        )
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="luxury campaign portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="realvis-xl",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=61,
            aspect_ratio="1:1",
            output_count=1,
        )
        async def execute_job(queued_job: GenerationJob) -> ExecutedGenerationBatch:
            return _executed_batch(
                queued_job,
                provider_name="fal",
                provider_billable=True,
            )

        service.generation_runtime.execute_job = execute_job  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        settled = snapshot.generations[job.id]
        updated_identity = snapshot.identities[identity.id]

        assert job.reserved_credit_cost == 0
        assert settled.final_credit_cost == 0
        assert settled.credit_charge_policy == "none"
        assert settled.credit_status == "released"
        assert updated_identity.monthly_credits_remaining == 999999999
        assert not any(entry.entry_type == CreditEntryType.GENERATION_SPEND for entry in snapshot.credit_ledger.values())
    finally:
        await service.shutdown()
