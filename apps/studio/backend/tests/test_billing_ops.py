from __future__ import annotations

from pathlib import Path

import pytest

import studio_platform.providers as provider_module
from config.env import get_settings
from studio_platform.billing_ops import (
    build_paddle_webhook_receipt,
    calculate_generation_final_charge,
    checkout_catalog_kind_to_plan,
    resolve_billing_state,
)
from studio_platform.generation_ops import (
    apply_completed_generation_to_state,
    consume_credits_locked,
)
from studio_platform.models import (
    CheckoutKind,
    CreditLedgerEntry,
    CreditEntryType,
    GenerationJob,
    GenerationOutput,
    IdentityPlan,
    JobStatus,
    MediaAsset,
    OmniaIdentity,
    Project,
    PromptSnapshot,
    StudioState,
    StudioWorkspace,
    SubscriptionStatus,
    utc_now,
)
from studio_platform.providers import (
    ProviderCapabilities,
    ProviderFatalError,
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
    monthly_remaining: int | None = None,
    monthly_allowance: int | None = None,
    extra_credits: int | None = None,
    subscription_status: SubscriptionStatus = SubscriptionStatus.NONE,
    owner_mode: bool = False,
    root_admin: bool = False,
    local_access: bool = False,
) -> tuple[OmniaIdentity, Project]:
    if monthly_remaining is None:
        monthly_remaining = 0 if plan == IdentityPlan.FREE else PLAN_CATALOG[plan].monthly_credits
    if extra_credits is None:
        extra_credits = 60 if plan == IdentityPlan.FREE else 0
    if subscription_status == SubscriptionStatus.NONE and plan in {IdentityPlan.CREATOR, IdentityPlan.PRO}:
        subscription_status = SubscriptionStatus.ACTIVE
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
        assert job.estimated_cost == 0.001
        assert job.pricing_lane == "fallback"
        assert job.estimated_cost_source == "catalog_fallback"
        assert serialized["reserved_credit_cost"] == 3
        assert serialized["final_credit_cost"] is None
        assert serialized["credit_charge_policy"] == "none"
        assert serialized["credit_status"] == "reserved"
        assert serialized["pricing_lane"] == "fallback"
        assert serialized["estimated_cost_source"] == "catalog_fallback"
        assert serialized["creative_profile"]["id"] == "fast"
        assert serialized["creative_profile"]["label"] == "Fast"
        assert serialized["render_experience"]["state"] == "fallback"
        assert draft_guide["quoted_credit_cost"] == 6
        assert draft_guide["reserved_credit_cost"] == 3
        assert draft_guide["settlement_credit_cost"] == 3
        assert draft_guide["creative_profile"]["id"] == "fast"
        assert draft_guide["creative_profile"]["badge"] == "Quick starts"
        assert draft_guide["render_experience"]["state"] == "fallback"
        assert summary["refund_policy"]["request_window_days"] == 14
        assert summary["refund_policy"]["automatic_credit_reversal_supported"] is True
        assert summary["refund_policy"]["recent_cases"] == []
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_plan_payload_exposes_launch_catalog_truth(tmp_path: Path) -> None:
    service, _, _ = await _build_service(tmp_path, providers=_registry_with())
    try:
        payload = service.get_public_plan_payload()

        assert payload["operating_mode"] == "controlled_public_paid_launch"
        assert payload["featured_subscription"] == "pro"

        free_account = payload["free_account"]
        creator = next(entry for entry in payload["subscriptions"] if entry["id"] == "creator")
        pro = next(entry for entry in payload["subscriptions"] if entry["id"] == "pro")

        assert free_account["entitlement_plan"] == "free"
        assert free_account["label"] == "Free Account"
        assert free_account["price_usd"] == 0
        assert free_account["checkout_kind"] is None
        assert free_account["availability"] == "included"
        assert free_account["can_access_chat"] is False
        assert free_account["can_generate"] is True
        assert "max_resolution" not in free_account

        assert creator["entitlement_plan"] == "creator"
        assert creator["label"] == "Creator"
        assert creator["price_usd"] == 12
        assert creator["checkout_kind"] == CheckoutKind.CREATOR_MONTHLY.value
        assert creator["availability"] == "self_serve"
        assert "max_resolution" not in creator

        assert pro["entitlement_plan"] == "pro"
        assert pro["label"] == "Pro"
        assert pro["price_usd"] == 24
        assert pro["checkout_kind"] == CheckoutKind.PRO_MONTHLY.value
        assert pro["availability"] == "self_serve"
        assert "max_resolution" not in pro

        assert payload["wallet"]["free_account_can_buy_credit_packs"] is True
        assert payload["wallet"]["free_image_generation_included"] is False
        assert payload["usage_caps"]["free_ai_chat_limited"] is False
        assert "max_resolution" not in payload["entitlements"]["free"]
        assert len(payload["credit_packs"]) == 2
        assert {option["kind"] for option in payload["credit_packs"]} == {
            CheckoutKind.CREDIT_PACK_SMALL.value,
            CheckoutKind.CREDIT_PACK_LARGE.value,
        }
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
        assert updated_identity.monthly_credits_remaining == 0
        assert updated_identity.extra_credits == 57
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
async def test_wallet_backed_free_generation_prefers_runware_launch_lane_when_available(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(
            name="runware",
            rollout_tier="primary",
            billable=True,
            workflows=("text_to_image",),
        ),
        _FakeProvider(name="huggingface", rollout_tier="standard", billable=False),
        _FakeProvider(name="pollinations", rollout_tier="standard", billable=False),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(
            store,
            plan=IdentityPlan.FREE,
            monthly_remaining=0,
            monthly_allowance=0,
            extra_credits=60,
        )
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait with luxury fashion lighting",
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

        assert job.provider == "runware"
        assert job.provider_candidates[0] == "runware"
        assert job.routing_strategy == "wallet-managed"
        assert job.routing_reason == "premium_intent_managed_preferred"
        assert job.selected_quality_tier == "premium"
        assert job.degraded is False
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
        assert job.estimated_cost == 0.01
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
        assert updated_identity.monthly_credits_remaining == 0
        assert updated_identity.extra_credits == 60
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
        assert updated_identity.monthly_credits_remaining == 0
        assert updated_identity.extra_credits == 60
        assert not any(entry.entry_type == CreditEntryType.GENERATION_SPEND for entry in snapshot.credit_ledger.values())
        release_entries = [
            entry
            for entry in snapshot.credit_ledger.values()
            if entry.entry_type == CreditEntryType.GENERATION_RELEASE
        ]
        assert len(release_entries) == 1
        assert release_entries[0].amount == 0
        assert release_entries[0].hold_amount == failed.reserved_credit_cost == 3
        assert release_entries[0].job_id == failed.id
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_billing_summary_surfaces_recent_automatic_credit_reversal_case(
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

        summary = await service.billing_summary(identity.id)
        refund_policy = summary["refund_policy"]

        assert refund_policy["automatic_resolution_count"] == 1
        assert refund_policy["manual_review_count"] == 0
        recent_case = refund_policy["recent_cases"][0]
        assert recent_case["kind"] == "generation_credit_reversal"
        assert recent_case["status"] == "automatic_resolved"
        assert recent_case["job_id"] == job.id
        assert recent_case["hold_amount"] == 3
    finally:
        await service.shutdown()


def test_apply_completed_generation_is_idempotent_for_duplicate_success_callbacks() -> None:
    now = utc_now()
    identity = OmniaIdentity(
        id="user-idempotent",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=12,
        monthly_credit_allowance=1200,
        extra_credits=8,
        subscription_status=SubscriptionStatus.ACTIVE,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    job = GenerationJob(
        id="job-idempotent",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Managed run",
        status=JobStatus.RUNNING,
        provider="fal",
        model="realvis-xl",
        prompt_snapshot=_prompt_snapshot("luxury portrait"),
        estimated_cost=0.04,
        credit_cost=12,
        reserved_credit_cost=12,
        credit_status="reserved",
        started_at=now,
    )
    asset = MediaAsset(
        id="asset-job-idempotent",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title=job.title,
        prompt=job.prompt_snapshot.prompt,
        url="/media/job-idempotent.png",
        thumbnail_url="/media/job-idempotent-thumb.jpg",
        metadata={"provider": "fal"},
    )
    output = GenerationOutput(
        asset_id=asset.id,
        url=asset.url,
        thumbnail_url=asset.thumbnail_url,
        mime_type="image/png",
        width=job.prompt_snapshot.width,
        height=job.prompt_snapshot.height,
        variation_index=0,
    )
    state = StudioState(
        identities={identity.id: identity},
        workspaces={workspace.id: workspace},
        projects={project.id: project},
        generations={job.id: job},
    )

    apply_completed_generation_to_state(
        state=state,
        job_id=job.id,
        provider_name="fal",
        provider_rollout_tier="primary",
        provider_billable=True,
        actual_cost_usd=1.0,
        final_credit_cost=12,
        credit_charge_policy="managed_full",
        selected_quality_tier="premium",
        degraded=False,
        routing_reason="premium_intent_managed_preferred",
        generated_outputs=[output],
        created_assets=[asset],
        style_tags=["luxury"],
        now=now,
    )
    apply_completed_generation_to_state(
        state=state,
        job_id=job.id,
        provider_name="fal",
        provider_rollout_tier="primary",
        provider_billable=True,
        actual_cost_usd=1.0,
        final_credit_cost=12,
        credit_charge_policy="managed_full",
        selected_quality_tier="premium",
        degraded=False,
        routing_reason="premium_intent_managed_preferred",
        generated_outputs=[output],
        created_assets=[asset],
        style_tags=["luxury"],
        now=now,
    )

    settled_identity = state.identities[identity.id]
    spend_entries = [
        entry
        for entry in state.credit_ledger.values()
        if entry.entry_type == CreditEntryType.GENERATION_SPEND
    ]

    assert settled_identity.monthly_credits_remaining == 0
    assert settled_identity.extra_credits == 8
    assert len(spend_entries) == 1
    assert spend_entries[0].amount == -12
    assert spend_entries[0].job_id == job.id


def test_apply_completed_generation_records_release_when_final_charge_drops_to_zero() -> None:
    now = utc_now()
    identity = OmniaIdentity(
        id="user-release",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.CREATOR,
        monthly_credits_remaining=0,
        monthly_credit_allowance=400,
        extra_credits=20,
        subscription_status=SubscriptionStatus.ACTIVE,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    job = GenerationJob(
        id="job-release",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Fallback run",
        status=JobStatus.RUNNING,
        provider="runware",
        model="flux-schnell",
        prompt_snapshot=_prompt_snapshot("editorial portrait"),
        estimated_cost=0.04,
        credit_cost=12,
        reserved_credit_cost=12,
        credit_status="reserved",
        started_at=now,
    )
    asset = MediaAsset(
        id="asset-job-release",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title=job.title,
        prompt=job.prompt_snapshot.prompt,
        url="/media/job-release.png",
        thumbnail_url="/media/job-release-thumb.jpg",
        metadata={"provider": "demo"},
    )
    output = GenerationOutput(
        asset_id=asset.id,
        url=asset.url,
        thumbnail_url=asset.thumbnail_url,
        mime_type="image/png",
        width=job.prompt_snapshot.width,
        height=job.prompt_snapshot.height,
        variation_index=0,
    )
    state = StudioState(
        identities={identity.id: identity},
        workspaces={workspace.id: workspace},
        projects={project.id: project},
        generations={job.id: job},
    )

    apply_completed_generation_to_state(
        state=state,
        job_id=job.id,
        provider_name="demo",
        provider_rollout_tier="degraded",
        provider_billable=False,
        actual_cost_usd=0.0,
        final_credit_cost=0,
        credit_charge_policy="degraded_free",
        selected_quality_tier="standard",
        degraded=True,
        routing_reason="degraded_demo_fallback",
        generated_outputs=[output],
        created_assets=[asset],
        style_tags=["editorial"],
        now=now,
    )

    settled_identity = state.identities[identity.id]
    release_entries = [
        entry
        for entry in state.credit_ledger.values()
        if entry.entry_type == CreditEntryType.GENERATION_RELEASE
    ]

    assert settled_identity.monthly_credits_remaining == 0
    assert settled_identity.extra_credits == 20
    assert not any(entry.entry_type == CreditEntryType.GENERATION_SPEND for entry in state.credit_ledger.values())
    assert len(release_entries) == 1
    assert release_entries[0].amount == 0
    assert release_entries[0].hold_amount == 12
    assert release_entries[0].job_id == job.id


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
async def test_auth_failure_does_not_retry_and_updates_job_provider_to_last_actual_attempt(
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
        failed = snapshot.generations[job.id]

        assert failed.status == JobStatus.FAILED
        assert failed.provider == "huggingface"
        assert failed.error == "This render lane is temporarily unavailable."
        assert failed.error_code == "provider_auth"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_billable_temporary_failure_in_development_does_not_auto_retry(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    settings = get_settings()
    original_environment = settings.environment
    settings.environment = provider_module.Environment.DEVELOPMENT
    providers = _registry_with(
        _FakeProvider(name="openai", rollout_tier="primary", billable=True),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store, plan=IdentityPlan.PRO, monthly_remaining=1200)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="premium campaign portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="realvis-xl",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=44,
            aspect_ratio="1:1",
            output_count=1,
        )

        async def temporary_fail(_: GenerationJob) -> ExecutedGenerationBatch:
            exc = ProviderTemporaryError("openai temporary capacity issue")
            setattr(exc, "provider_name", "openai")
            raise exc

        service.generation_runtime.execute_job = temporary_fail  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        failed = snapshot.generations[job.id]

        assert failed.status == JobStatus.FAILED
        assert failed.provider == "openai"
        assert failed.provider_billable is True
        assert failed.credit_status == "released"
        assert failed.final_credit_cost == 0
    finally:
        settings.environment = original_environment


@pytest.mark.asyncio
async def test_sensitive_provider_failure_releases_credits_and_marks_job_as_safety_block(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    providers = _registry_with(
        _FakeProvider(name="runware", rollout_tier="primary", billable=True),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=1200,
        )
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="premium editorial portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="realvis-xl",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=45,
            aspect_ratio="1:1",
            output_count=1,
        )

        async def sensitive_fail(_: GenerationJob) -> ExecutedGenerationBatch:
            raise ProviderFatalError("Runware flagged the output as potentially sensitive")

        service.generation_runtime.execute_job = sensitive_fail  # type: ignore[method-assign]
        await service._process_generation(job.id)

        snapshot = await store.snapshot()
        failed = snapshot.generations[job.id]

        assert failed.status == JobStatus.FAILED
        assert failed.error_code == "safety_block"
        assert failed.credit_status == "released"
        assert failed.final_credit_cost == 0
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_delete_generation_removes_failed_unrendered_job_from_processing(
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
            seed=46,
            aspect_ratio="1:1",
            output_count=1,
        )

        await service._update_job_status(
            job.id,
            JobStatus.FAILED,
            provider="pollinations",
            provider_billable=False,
            error="provider request failed",
            error_code="generation_failed",
        )

        result = await service.delete_generation(identity.id, job.id)
        snapshot = await store.snapshot()

        assert result == {"generation_id": job.id, "status": "deleted"}
        assert job.id not in snapshot.generations
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_blocks_when_billable_provider_daily_hard_cap_is_reached(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.provider_spend_guardrails_enabled
    original_soft = settings.development_billable_provider_daily_soft_cap_usd
    original_hard = settings.development_billable_provider_daily_hard_cap_usd
    original_emergency = settings.provider_spend_emergency_disabled
    settings.environment = provider_module.Environment.DEVELOPMENT
    settings.provider_spend_guardrails_enabled = True
    settings.development_billable_provider_daily_soft_cap_usd = 0.5
    settings.development_billable_provider_daily_hard_cap_usd = 1.0
    settings.provider_spend_emergency_disabled = ""
    providers = _registry_with(
        _FakeProvider(name="openai", rollout_tier="primary", billable=True),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store, plan=IdentityPlan.PRO, monthly_remaining=1200)
        spent_job = GenerationJob(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title="Earlier OpenAI run",
            status=JobStatus.SUCCEEDED,
            provider="openai",
            model="realvis-xl",
            prompt_snapshot=_prompt_snapshot("previous premium run"),
            estimated_cost=0.04,
            actual_cost_usd=1.0,
            credit_cost=12,
            completed_at=utc_now(),
        )
        await store.mutate(lambda state: state.generations.__setitem__(spent_job.id, spent_job))

        with pytest.raises(RuntimeError, match="temporarily unavailable"):
            await service.create_generation(
                identity_id=identity.id,
                project_id=project.id,
                prompt="new campaign portrait",
                negative_prompt="",
                reference_asset_id=None,
                model_id="realvis-xl",
                width=1024,
                height=1024,
                steps=28,
                cfg_scale=6.5,
                seed=52,
                aspect_ratio="1:1",
                output_count=1,
            )
    finally:
        settings.environment = original_environment
        settings.provider_spend_guardrails_enabled = original_enabled
        settings.development_billable_provider_daily_soft_cap_usd = original_soft
        settings.development_billable_provider_daily_hard_cap_usd = original_hard
        settings.provider_spend_emergency_disabled = original_emergency
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_blocks_when_selected_billable_route_is_guardrail_blocked(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.provider_spend_guardrails_enabled
    original_soft = settings.development_billable_provider_daily_soft_cap_usd
    original_hard = settings.development_billable_provider_daily_hard_cap_usd
    original_emergency = settings.provider_spend_emergency_disabled
    settings.environment = provider_module.Environment.DEVELOPMENT
    settings.provider_spend_guardrails_enabled = True
    settings.development_billable_provider_daily_soft_cap_usd = 0.5
    settings.development_billable_provider_daily_hard_cap_usd = 1.0
    settings.provider_spend_emergency_disabled = ""
    providers = _registry_with(
        _FakeProvider(name="openai", rollout_tier="primary", billable=True),
        _FakeProvider(name="fal", rollout_tier="primary", billable=True),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    try:
        identity, project = await _seed_identity_project(store, plan=IdentityPlan.PRO, monthly_remaining=1200)
        spent_job = GenerationJob(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title="Earlier FAL run",
            status=JobStatus.SUCCEEDED,
            provider="fal",
            model="realvis-xl",
            prompt_snapshot=_prompt_snapshot("previous fal run"),
            estimated_cost=0.04,
            actual_cost_usd=1.0,
            credit_cost=12,
            completed_at=utc_now(),
        )
        await store.mutate(lambda state: state.generations.__setitem__(spent_job.id, spent_job))

        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="new campaign portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="realvis-xl",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=52,
            aspect_ratio="1:1",
            output_count=1,
        )
        assert job.provider == "openai"
        assert job.provider_candidates == ["openai"]
        assert job.routing_reason == "premium_intent_managed_preferred"
    finally:
        settings.environment = original_environment
        settings.provider_spend_guardrails_enabled = original_enabled
        settings.development_billable_provider_daily_soft_cap_usd = original_soft
        settings.development_billable_provider_daily_hard_cap_usd = original_hard
        settings.provider_spend_emergency_disabled = original_emergency
        await service.shutdown()


@pytest.mark.asyncio
async def test_process_generation_blocks_when_billable_provider_hits_spend_cap_after_admission(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.provider_spend_guardrails_enabled
    original_soft = settings.development_billable_provider_daily_soft_cap_usd
    original_hard = settings.development_billable_provider_daily_hard_cap_usd
    original_emergency = settings.provider_spend_emergency_disabled
    settings.environment = provider_module.Environment.DEVELOPMENT
    settings.provider_spend_guardrails_enabled = True
    settings.development_billable_provider_daily_soft_cap_usd = 0.5
    settings.development_billable_provider_daily_hard_cap_usd = 1.0
    settings.provider_spend_emergency_disabled = ""
    providers = _registry_with(
        _FakeProvider(name="openai", rollout_tier="primary", billable=True),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    execute_calls = {"count": 0}
    try:
        identity, project = await _seed_identity_project(store, plan=IdentityPlan.PRO, monthly_remaining=1200)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="premium portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="realvis-xl",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=53,
            aspect_ratio="1:1",
            output_count=1,
        )
        spent_job = GenerationJob(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title="Earlier OpenAI run",
            status=JobStatus.SUCCEEDED,
            provider="openai",
            model="realvis-xl",
            prompt_snapshot=_prompt_snapshot("previous premium run"),
            estimated_cost=0.04,
            actual_cost_usd=1.0,
            credit_cost=12,
            completed_at=utc_now(),
        )
        await store.mutate(lambda state: state.generations.__setitem__(spent_job.id, spent_job))

        async def should_not_execute(_: GenerationJob) -> ExecutedGenerationBatch:
            execute_calls["count"] += 1
            return _executed_batch(job, provider_name="openai", provider_billable=True)

        service.generation_runtime.execute_job = should_not_execute  # type: ignore[method-assign]
        await service._process_generation(job.id)

        failed = await store.get_model("generations", job.id, GenerationJob)
        assert failed is not None
        assert execute_calls["count"] == 0
        assert failed.status == JobStatus.FAILED
        assert failed.error_code == "provider_spend_guardrail"
        assert failed.credit_status == "released"
        assert failed.final_credit_cost == 0
    finally:
        settings.environment = original_environment
        settings.provider_spend_guardrails_enabled = original_enabled
        settings.development_billable_provider_daily_soft_cap_usd = original_soft
        settings.development_billable_provider_daily_hard_cap_usd = original_hard
        settings.provider_spend_emergency_disabled = original_emergency
        await service.shutdown()


@pytest.mark.asyncio
async def test_process_generation_filters_blocked_billable_fallback_candidates_before_execution(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.provider_spend_guardrails_enabled
    original_soft = settings.development_billable_provider_daily_soft_cap_usd
    original_hard = settings.development_billable_provider_daily_hard_cap_usd
    original_emergency = settings.provider_spend_emergency_disabled
    settings.environment = provider_module.Environment.DEVELOPMENT
    settings.provider_spend_guardrails_enabled = True
    settings.development_billable_provider_daily_soft_cap_usd = 0.5
    settings.development_billable_provider_daily_hard_cap_usd = 1.0
    settings.provider_spend_emergency_disabled = ""
    providers = _registry_with(
        _FakeProvider(name="openai", rollout_tier="primary", billable=True),
        _FakeProvider(name="fal", rollout_tier="primary", billable=True),
    )
    service, store, _ = await _build_service(tmp_path, providers=providers)
    captured_candidates: dict[str, list[str]] = {}
    try:
        identity, project = await _seed_identity_project(store, plan=IdentityPlan.PRO, monthly_remaining=1200)
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="premium portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="realvis-xl",
            width=1024,
            height=1024,
            steps=28,
            cfg_scale=6.5,
            seed=53,
            aspect_ratio="1:1",
            output_count=1,
        )
        assert job.provider_candidates[:2] == ["fal", "openai"]

        spent_job = GenerationJob(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title="Earlier FAL run",
            status=JobStatus.SUCCEEDED,
            provider="fal",
            model="realvis-xl",
            prompt_snapshot=_prompt_snapshot("previous fal run"),
            estimated_cost=0.04,
            actual_cost_usd=1.0,
            credit_cost=12,
            completed_at=utc_now(),
        )
        await store.mutate(lambda state: state.generations.__setitem__(spent_job.id, spent_job))

        async def execute_job(queued_job: GenerationJob) -> ExecutedGenerationBatch:
            captured_candidates["value"] = list(queued_job.provider_candidates)
            return _executed_batch(
                queued_job,
                provider_name="openai",
                provider_billable=True,
            )

        service.generation_runtime.execute_job = execute_job  # type: ignore[method-assign]
        await service._process_generation(job.id)

        settled = await store.get_model("generations", job.id, GenerationJob)
        assert settled is not None
        assert settled.status == JobStatus.SUCCEEDED
        assert captured_candidates["value"] == ["openai"]
    finally:
        settings.environment = original_environment
        settings.provider_spend_guardrails_enabled = original_enabled
        settings.development_billable_provider_daily_soft_cap_usd = original_soft
        settings.development_billable_provider_daily_hard_cap_usd = original_hard
        settings.provider_spend_emergency_disabled = original_emergency
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
            plan=IdentityPlan.CREATOR,
            monthly_remaining=0,
            monthly_allowance=0,
            extra_credits=5,
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
async def test_generation_creation_records_reserve_audit_entry(
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

        snapshot = await store.snapshot()
        reserve_entries = [
            entry
            for entry in snapshot.credit_ledger.values()
            if entry.entry_type == CreditEntryType.GENERATION_RESERVE
        ]

        assert len(reserve_entries) == 1
        reserve_entry = reserve_entries[0]
        assert reserve_entry.amount == 0
        assert reserve_entry.job_id == job.id
        assert reserve_entry.hold_amount == job.reserved_credit_cost == 3
        assert reserve_entry.job_credit_status == "reserved"
        assert reserve_entry.provider_name == job.provider
        assert reserve_entry.final_credit_cost is None
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_subscription_cancelled_fails_closed_to_free_entitlements_but_preserves_wallet_balance(
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
        await service.process_paddle_webhook(
            {
                "event_type": "subscription.canceled",
                "data": {
                    "id": "sub-1",
                    "type": "subscription",
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
        assert summary["plan"]["id"] == IdentityPlan.FREE.value
        assert summary["account_tier"] == IdentityPlan.FREE.value
        assert summary["subscription_tier"] is None
        assert summary["entitlements"]["premium_chat"] is False
        assert summary["credits"]["monthly_remaining"] == 0
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
        await service.process_paddle_webhook(
            {
                "event_type": "subscription.updated",
                "data": {
                    "id": "sub-1",
                    "type": "subscription",
                    "status": "expired",
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
        assert summary["credits"]["monthly_remaining"] == 0
        assert summary["credits"]["extra_credits"] == 150
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_subscription_past_due_fails_closed_to_free_entitlements_but_preserves_wallet_balance(
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
        await service.process_paddle_webhook(
            {
                "event_type": "subscription.updated",
                "data": {
                    "id": "sub-1",
                    "type": "subscription",
                    "status": "past_due",
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
        assert updated_identity.subscription_status == SubscriptionStatus.PAST_DUE
        assert summary["plan"]["id"] == IdentityPlan.FREE.value
        assert summary["account_tier"] == IdentityPlan.FREE.value
        assert summary["subscription_tier"] is None
        assert summary["entitlements"]["premium_chat"] is False
        assert summary["credits"]["monthly_remaining"] == 0
        assert summary["credits"]["extra_credits"] == 150
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_subscription_paused_fails_closed_to_free_entitlements_but_preserves_wallet_balance(
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
        await service.process_paddle_webhook(
            {
                "event_type": "subscription.updated",
                "data": {
                    "id": "sub-1",
                    "type": "subscription",
                    "status": "paused",
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
        assert updated_identity.subscription_status == SubscriptionStatus.PAUSED
        assert summary["plan"]["id"] == IdentityPlan.FREE.value
        assert summary["account_tier"] == IdentityPlan.FREE.value
        assert summary["subscription_tier"] is None
        assert summary["entitlements"]["premium_chat"] is False
        assert summary["credits"]["monthly_remaining"] == 0
        assert summary["credits"]["extra_credits"] == 150
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_inactive_paid_subscription_cannot_start_pro_only_generation_lane(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    service, store, _ = await _build_service(tmp_path, providers=_registry_with())
    try:
        identity, project = await _seed_identity_project(
            store,
            plan=IdentityPlan.PRO,
            monthly_remaining=700,
            monthly_allowance=1200,
            extra_credits=150,
            subscription_status=SubscriptionStatus.CANCELED,
        )

        with pytest.raises(PermissionError, match="This model requires Pro"):
            await service.create_generation(
                identity_id=identity.id,
                project_id=project.id,
                prompt="hero poster with dramatic lighting",
                negative_prompt="",
                reference_asset_id=None,
                model_id="juggernaut-xl",
                width=1024,
                height=1024,
                steps=28,
                cfg_scale=6.5,
                seed=91,
                aspect_ratio="1:1",
                output_count=1,
            )
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
            "event_type": "subscription.updated",
            "data": {
                "id": "sub-1",
                "type": "subscription",
                "status": "active",
                "custom_data": {
                    "identity_id": identity.id,
                    "checkout_kind": CheckoutKind.PRO_MONTHLY.value,
                },
            },
        }

        await service.process_paddle_webhook(payload)
        await service.process_paddle_webhook(payload)

        snapshot = await store.snapshot()
        updated_identity = snapshot.identities[identity.id]
        renewal_entries = [
            entry for entry in snapshot.credit_ledger.values() if entry.entry_type == CreditEntryType.SUBSCRIPTION
        ]

        assert updated_identity.plan == IdentityPlan.PRO
        assert updated_identity.subscription_status == SubscriptionStatus.ACTIVE
        assert updated_identity.monthly_credits_remaining == 42
        assert updated_identity.extra_credits == 80
        assert len(snapshot.billing_webhook_receipts) == 1
        assert len(renewal_entries) == 0
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_billing_summary_surfaces_recent_manual_refund_review_case_for_subscription_charge(
    tmp_path: Path,
    _web_runtime_mode: None,
) -> None:
    service, store, _ = await _build_service(tmp_path, providers=_registry_with())
    try:
        identity, _ = await _seed_identity_project(
            store,
            plan=IdentityPlan.FREE,
            monthly_remaining=0,
            monthly_allowance=0,
            extra_credits=0,
            subscription_status=SubscriptionStatus.NONE,
        )
        await service.process_paddle_webhook(
            {
                "event_type": "transaction.completed",
                "data": {
                    "id": "txn-sub-1",
                    "type": "transaction",
                    "custom_data": {
                        "identity_id": identity.id,
                        "checkout_kind": CheckoutKind.PRO_MONTHLY.value,
                    },
                },
            }
        )

        summary = await service.billing_summary(identity.id)
        refund_policy = summary["refund_policy"]

        assert refund_policy["automatic_resolution_count"] == 0
        assert refund_policy["manual_review_count"] == 1
        recent_case = refund_policy["recent_cases"][0]
        assert recent_case["kind"] == "subscription_charge"
        assert recent_case["status"] == "manual_review_possible"
        assert recent_case["request_window_open"] is True
        assert recent_case["checkout_kind"] == CheckoutKind.PRO_MONTHLY.value
        assert recent_case["merchant_of_record"] == "paddle"
    finally:
        await service.shutdown()


def test_credit_pack_checkout_kind_is_not_treated_as_subscription_plan() -> None:
    with pytest.raises(ValueError):
        checkout_catalog_kind_to_plan(CheckoutKind.CREDIT_PACK_SMALL)


def test_consume_credits_locked_raises_on_credit_underflow() -> None:
    identity = OmniaIdentity(
        id="user-underflow",
        email="underflow@example.com",
        display_name="Underflow",
        username="underflow",
        workspace_id="ws-underflow",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=10,
        monthly_credit_allowance=10,
        extra_credits=5,
    )

    with pytest.raises(ValueError):
        consume_credits_locked(identity, 20)


def test_paddle_webhook_receipt_fingerprint_includes_event_id() -> None:
    now = utc_now()
    receipt_a = build_paddle_webhook_receipt(
        payload={
            "event_id": "evt_1",
            "event_type": "transaction.completed",
            "data": {"id": "txn-1", "type": "transaction", "attributes": {}},
        },
        identity_id="user-1",
        checkout_kind=CheckoutKind.CREDIT_PACK_SMALL,
        now=now,
    )
    receipt_b = build_paddle_webhook_receipt(
        payload={
            "event_id": "evt_2",
            "event_type": "transaction.completed",
            "data": {"id": "txn-1", "type": "transaction", "attributes": {}},
        },
        identity_id="user-1",
        checkout_kind=CheckoutKind.CREDIT_PACK_SMALL,
        now=now,
    )

    assert receipt_a.id != receipt_b.id


def test_legacy_checkout_kind_aliases_still_parse() -> None:
    entry = CreditLedgerEntry(
        identity_id="user-1",
        amount=200,
        entry_type=CreditEntryType.TOP_UP,
        description="Legacy top-up",
        checkout_kind="top_up_small",
    )

    assert entry.checkout_kind == CheckoutKind.CREDIT_PACK_SMALL


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


# ────────────────────────────────────────────────────────────────────────
# Monthly spend guardrail tests (stop-loss doctrine)
# ────────────────────────────────────────────────────────────────────────

from studio_platform.provider_spend_guardrails import (
    MonthlySpendSummary,
    evaluate_monthly_spend_guardrail,
    summarize_monthly_spend,
)


def _make_monthly_summary(**overrides) -> MonthlySpendSummary:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    defaults = {
        "window_start": now,
        "window_end": now,
        "total_spend_usd": 0.0,
        "image_spend_usd": 0.0,
        "chat_spend_usd": 0.0,
        "prompt_improve_spend_usd": 0.0,
        "openai_image_spend_usd": 0.0,
        "openai_total_spend_usd": 0.0,
        "provider_image_spend": {},
    }
    defaults.update(overrides)
    return MonthlySpendSummary(**defaults)


def test_monthly_guardrail_passes_when_within_caps() -> None:
    settings = get_settings()
    summary = _make_monthly_summary(total_spend_usd=10.0)
    result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary)
    assert result.status == "pass"
    assert result.reason == "within_caps"
    assert not result.blocked_providers


def test_monthly_guardrail_warns_on_soft_cap() -> None:
    settings = get_settings()
    summary = _make_monthly_summary(total_spend_usd=26.0)
    result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary)
    assert result.status == "warning"
    assert result.reason == "monthly_soft_cap_exceeded"


def test_monthly_guardrail_blocks_on_hard_cap() -> None:
    settings = get_settings()
    summary = _make_monthly_summary(total_spend_usd=61.0)
    result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary)
    assert result.status == "blocked"
    assert result.reason == "monthly_hard_cap_exceeded"


def test_monthly_guardrail_blocks_openai_on_image_cap() -> None:
    settings = get_settings()
    summary = _make_monthly_summary(
        total_spend_usd=20.0,
        image_spend_usd=18.0,
        openai_image_spend_usd=16.0,
    )
    result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary)
    assert "openai" in result.blocked_providers


def test_monthly_guardrail_blocks_openai_on_share_percentage() -> None:
    settings = get_settings()
    summary = _make_monthly_summary(
        total_spend_usd=10.0,
        image_spend_usd=10.0,
        openai_image_spend_usd=5.0,
    )
    assert summary.openai_image_share_pct == 50.0
    result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary)
    assert "openai" in result.blocked_providers


def test_monthly_guardrail_caution_on_openai_share_25pct() -> None:
    settings = get_settings()
    summary = _make_monthly_summary(
        total_spend_usd=10.0,
        image_spend_usd=10.0,
        openai_image_spend_usd=3.0,
    )
    assert summary.openai_image_share_pct == 30.0
    result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary)
    assert result.status == "warning"
    assert "openai" not in result.blocked_providers


def test_monthly_guardrail_disabled_always_passes() -> None:
    settings = get_settings()
    original = settings.provider_spend_guardrails_enabled
    try:
        settings.provider_spend_guardrails_enabled = False
        summary = _make_monthly_summary(total_spend_usd=999.0, openai_image_spend_usd=999.0)
        result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary)
        assert result.status == "pass"
        assert result.reason == "guardrails_disabled"
    finally:
        settings.provider_spend_guardrails_enabled = original


def test_monthly_guardrail_projected_cost_pushes_over_hard_cap() -> None:
    settings = get_settings()
    summary = _make_monthly_summary(total_spend_usd=59.5)
    result = evaluate_monthly_spend_guardrail(settings, monthly_summary=summary, projected_cost_usd=1.0)
    assert result.status == "blocked"
    assert result.reason == "monthly_hard_cap_exceeded"
