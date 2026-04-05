import asyncio
from datetime import timedelta
from pathlib import Path

import pytest

from config.env import get_settings
import studio_platform.providers as provider_module
from studio_platform.models import (
    BillingWebhookReceipt,
    ChatConversation,
    ChatFeedback,
    ChatMessage,
    ChatRole,
    CheckoutKind,
    CreditEntryType,
    CreditLedgerEntry,
    GenerationJob,
    GenerationOutput,
    IdentityPlan,
    JobStatus,
    MediaAsset,
    OmniaIdentity,
    PromptSnapshot,
    Project,
    PublicPost,
    ShareLink,
    StudioWorkspace,
    SubscriptionStatus,
    utc_now,
)
from studio_platform.providers import ProviderCapabilities, ProviderRegistry, ProviderResult
from studio_platform.service import StudioService
from studio_platform.llm import LLMResult
from studio_platform.services.generation_broker import InMemoryGenerationBroker
from studio_platform.services.generation_runtime import ExecutedGenerationBatch
from studio_platform.store import StudioStateStore


@pytest.mark.asyncio
async def test_export_identity_data_uses_store_snapshot(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Render One",
        prompt="cinematic portrait",
        url="stored",
        metadata={},
    )
    post = PublicPost(
        id="post-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        owner_username="userone",
        owner_display_name="User One",
        title="Render One",
        prompt="cinematic portrait",
        cover_asset_id=asset.id,
        asset_ids=[asset.id],
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
            state.posts.__setitem__(post.id, post),
        )
    )

    exported = await service.export_identity_data(identity.id)

    assert exported["identity"]["id"] == identity.id
    assert [item["id"] for item in exported["assets"]] == [asset.id]
    assert [item["id"] for item in exported["posts"]] == [post.id]


@pytest.mark.asyncio
async def test_permanently_delete_identity_cleans_related_state(tmp_path: Path):
    settings = get_settings()
    original_supabase_url = settings.supabase_url
    original_service_role_key = settings.supabase_service_role_key
    settings.supabase_url = None
    settings.supabase_service_role_key = None

    try:
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        await service.initialize()

        identity = OmniaIdentity(
            id="user-1",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-1",
        )
        other_identity = OmniaIdentity(
            id="user-2",
            email="other@example.com",
            display_name="User Two",
            username="usertwo",
            workspace_id="ws-user-2",
        )
        workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
        other_workspace = StudioWorkspace(id="ws-user-2", identity_id=other_identity.id, name="User Two Studio")
        project = Project(
            id="project-1",
            workspace_id=workspace.id,
            identity_id=identity.id,
            title="Project One",
        )
        asset = MediaAsset(
            id="asset-1",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            title="Render One",
            prompt="cinematic portrait",
            url="stored",
            metadata={},
        )
        conversation = ChatConversation(
            id="conversation-1",
            workspace_id=workspace.id,
            identity_id=identity.id,
            title="Chat One",
        )
        message = ChatMessage(
            id="message-1",
            conversation_id=conversation.id,
            identity_id=identity.id,
            role=ChatRole.USER,
            content="hello",
        )
        share = ShareLink(id="share-1", token="sharetoken123456", identity_id=identity.id, asset_id=asset.id)
        owned_post = PublicPost(
            id="post-owned",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            owner_username="userone",
            owner_display_name="User One",
            title="Owned Post",
            prompt="cinematic portrait",
            cover_asset_id=asset.id,
            asset_ids=[asset.id],
            liked_by=[other_identity.id],
        )
        surviving_post = PublicPost(
            id="post-surviving",
            workspace_id=other_workspace.id,
            project_id="project-2",
            identity_id=other_identity.id,
            owner_username="usertwo",
            owner_display_name="User Two",
            title="Surviving Post",
            prompt="editorial photo",
            liked_by=[identity.id],
        )
        ledger_entry = CreditLedgerEntry(
            id="ledger-1",
            identity_id=identity.id,
            amount=200,
            entry_type=CreditEntryType.TOP_UP,
            description="Top-up",
            checkout_kind=CheckoutKind.TOP_UP_SMALL,
        )
        webhook_receipt = BillingWebhookReceipt(
            id="receipt-1",
            event_name="order_created",
            resource_type="orders",
            resource_id="order-1",
            identity_id=identity.id,
            checkout_kind=CheckoutKind.TOP_UP_SMALL,
        )

        await store.mutate(
            lambda state: (
                state.identities.__setitem__(identity.id, identity),
                state.identities.__setitem__(other_identity.id, other_identity),
                state.workspaces.__setitem__(workspace.id, workspace),
                state.workspaces.__setitem__(other_workspace.id, other_workspace),
                state.projects.__setitem__(project.id, project),
                state.assets.__setitem__(asset.id, asset),
                state.conversations.__setitem__(conversation.id, conversation),
                state.chat_messages.__setitem__(message.id, message),
                state.shares.__setitem__(share.id, share),
                state.posts.__setitem__(owned_post.id, owned_post),
                state.posts.__setitem__(surviving_post.id, surviving_post),
                state.credit_ledger.__setitem__(ledger_entry.id, ledger_entry),
                state.billing_webhook_receipts.__setitem__(webhook_receipt.id, webhook_receipt),
            )
        )

        deleted = await service.permanently_delete_identity(identity.id)
        snapshot = await store.snapshot()

        assert deleted is True
        assert identity.id not in snapshot.identities
        assert conversation.id not in snapshot.conversations
        assert message.id not in snapshot.chat_messages
        assert share.id not in snapshot.shares
        assert ledger_entry.id not in snapshot.credit_ledger
        assert webhook_receipt.id not in snapshot.billing_webhook_receipts
        assert owned_post.id not in snapshot.posts
        assert surviving_post.liked_by == []
    finally:
        settings.supabase_url = original_supabase_url
        settings.supabase_service_role_key = original_service_role_key


@pytest.mark.asyncio
async def test_checkout_uses_subscription_variant_for_pro_plan(tmp_path: Path):
    settings = get_settings()
    original_store_id = settings.lemonsqueezy_store_id
    settings.lemonsqueezy_store_id = "demo-store"

    try:
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        await service.initialize()

        identity = OmniaIdentity(
            id="user-1",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-1",
        )
        await store.mutate(
            lambda state: (
                state.identities.__setitem__(identity.id, identity),
                state.workspaces.__setitem__(
                    identity.workspace_id,
                    StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio"),
                ),
            )
        )

        payload = await service.checkout(identity.id, CheckoutKind.PRO_MONTHLY)

        assert payload["provider"] == "lemonsqueezy"
        assert "/checkout/buy/pro_subscription" in payload["checkout_url"]
        assert "checkout%5Bcustom%5D%5Bcheckout_kind%5D=pro_monthly" in payload["checkout_url"]
    finally:
        settings.lemonsqueezy_store_id = original_store_id


@pytest.mark.asyncio
async def test_create_project_preserves_surface_scope(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )

    compose_project = await service.create_project(identity.id, "Compose Project", "Created from Studio Create")
    chat_project = await service.create_project(identity.id, "Chat Project", "Created from Studio Chat", "chat")

    assert compose_project.surface == "compose"
    assert chat_project.surface == "chat"


@pytest.mark.asyncio
async def test_list_projects_can_filter_by_surface(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )

    compose_project = await service.create_project(identity.id, "Compose Project", "Created from Studio Create", "compose")
    chat_project = await service.create_project(identity.id, "Chat Project", "Created from Studio Chat", "chat")

    compose_projects = await service.list_projects(identity.id, surface="compose")
    chat_projects = await service.list_projects(identity.id, surface="chat")
    all_projects = await service.list_projects(identity.id)

    assert [project.id for project in compose_projects] == [compose_project.id]
    assert [project.id for project in chat_projects] == [chat_project.id]
    assert {project.id for project in all_projects} == {compose_project.id, chat_project.id}


@pytest.mark.asyncio
async def test_delete_conversation_removes_related_messages(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    conversation = ChatConversation(
        id="conversation-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Chat One",
    )
    message_a = ChatMessage(
        id="message-a",
        conversation_id=conversation.id,
        identity_id=identity.id,
        role=ChatRole.USER,
        content="hello",
    )
    message_b = ChatMessage(
        id="message-b",
        conversation_id=conversation.id,
        identity_id=identity.id,
        role=ChatRole.ASSISTANT,
        content="hi",
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.conversations.__setitem__(conversation.id, conversation),
            state.chat_messages.__setitem__(message_a.id, message_a),
            state.chat_messages.__setitem__(message_b.id, message_b),
        )
    )

    await service.delete_conversation(identity.id, conversation.id)
    snapshot = await store.snapshot()

    assert conversation.id not in snapshot.conversations
    assert message_a.id not in snapshot.chat_messages
    assert message_b.id not in snapshot.chat_messages


@pytest.mark.asyncio
async def test_permanently_delete_asset_removes_share_and_post_references(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
        cover_asset_id="asset-1",
    )
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Render One",
        prompt="cinematic portrait",
        url="stored",
        local_path=str((tmp_path / "media" / "asset-1.png").resolve()),
        metadata={"generation_id": "post-1"},
    )
    Path(asset.local_path).parent.mkdir(parents=True, exist_ok=True)
    Path(asset.local_path).write_bytes(b"fake image bytes")
    share = ShareLink(id="share-1", token="sharetoken123456", identity_id=identity.id, asset_id=asset.id)
    post = PublicPost(
        id="post-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        owner_username="userone",
        owner_display_name="User One",
        title="Owned Post",
        prompt="cinematic portrait",
        cover_asset_id=asset.id,
        asset_ids=[asset.id],
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
            state.shares.__setitem__(share.id, share),
            state.posts.__setitem__(post.id, post),
        )
    )

    deleted = await service.permanently_delete_asset(identity.id, asset.id)
    snapshot = await store.snapshot()

    assert deleted == {"asset_id": asset.id, "status": "deleted"}
    assert asset.id not in snapshot.assets
    assert share.id not in snapshot.shares
    assert post.id not in snapshot.posts
    assert snapshot.projects[project.id].cover_asset_id is None


@pytest.mark.asyncio
async def test_get_public_share_returns_project_payload(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Render One",
        prompt="cinematic portrait",
        url="stored",
        metadata={},
    )
    share = ShareLink(id="share-1", token="sharetoken123456", identity_id=identity.id, project_id=project.id)

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
            state.shares.__setitem__(share.id, share),
        )
    )

    payload = await service.get_public_share(share.token)

    assert payload["share"]["id"] == share.id
    assert payload["project"]["id"] == project.id
    assert [item["id"] for item in payload["assets"]] == [asset.id]


@pytest.mark.asyncio
async def test_lemonsqueezy_subscription_webhook_activates_pro_plan(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(
                identity.workspace_id,
                StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio"),
            ),
        )
    )

    await service.process_lemonsqueezy_webhook(
        {
            "meta": {
                "event_name": "subscription_created",
                "custom_data": {"identity_id": identity.id, "checkout_kind": CheckoutKind.PRO_MONTHLY.value},
            }
        }
    )
    snapshot = await store.snapshot()
    updated = snapshot.identities[identity.id]

    assert updated.plan.value == "pro"
    assert updated.subscription_status == SubscriptionStatus.ACTIVE
    assert updated.monthly_credit_allowance == 1200
    assert updated.monthly_credits_remaining == 1200


@pytest.mark.asyncio
async def test_lemonsqueezy_topup_webhook_uses_checkout_kind_credit_amount(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=60,
        monthly_credit_allowance=60,
        extra_credits=0,
    )
    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(
                identity.workspace_id,
                StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio"),
            ),
        )
    )

    await service.process_lemonsqueezy_webhook(
        {
            "meta": {
                "event_name": "order_created",
                "custom_data": {"identity_id": identity.id, "checkout_kind": CheckoutKind.TOP_UP_LARGE.value},
            }
        }
    )

    snapshot = await store.snapshot()
    updated = snapshot.identities[identity.id]

    assert updated.plan == IdentityPlan.FREE
    assert updated.extra_credits == 800
    assert any(
        entry.checkout_kind == CheckoutKind.TOP_UP_LARGE and entry.amount == 800
        for entry in snapshot.credit_ledger.values()
    )


@pytest.mark.asyncio
async def test_lemonsqueezy_duplicate_topup_webhook_is_idempotent(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=60,
        monthly_credit_allowance=60,
        extra_credits=0,
    )
    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(
                identity.workspace_id,
                StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio"),
            ),
        )
    )

    payload = {
        "data": {"id": "order-1", "type": "orders"},
        "meta": {
            "event_name": "order_created",
            "custom_data": {"identity_id": identity.id, "checkout_kind": CheckoutKind.TOP_UP_SMALL.value},
        },
    }

    await service.process_lemonsqueezy_webhook(payload)
    await service.process_lemonsqueezy_webhook(payload)

    snapshot = await store.snapshot()
    updated = snapshot.identities[identity.id]

    assert updated.extra_credits == 200
    assert len(snapshot.billing_webhook_receipts) == 1
    assert sum(1 for entry in snapshot.credit_ledger.values() if entry.checkout_kind == CheckoutKind.TOP_UP_SMALL) == 1


@pytest.mark.asyncio
async def test_lemonsqueezy_pro_checkout_order_waits_for_subscription_event(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=60,
        monthly_credit_allowance=60,
        extra_credits=0,
    )
    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(
                identity.workspace_id,
                StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio"),
            ),
        )
    )

    await service.process_lemonsqueezy_webhook(
        {
            "data": {"id": "order-1", "type": "orders"},
            "meta": {
                "event_name": "order_created",
                "custom_data": {"identity_id": identity.id, "checkout_kind": CheckoutKind.PRO_MONTHLY.value},
            },
        }
    )

    order_snapshot = await store.snapshot()
    order_identity = order_snapshot.identities[identity.id]

    assert order_identity.plan == IdentityPlan.FREE
    assert order_identity.extra_credits == 0
    assert len(order_snapshot.billing_webhook_receipts) == 1
    assert not any(entry.entry_type == CreditEntryType.TOP_UP for entry in order_snapshot.credit_ledger.values())

    payload = {
        "data": {"id": "sub-1", "type": "subscriptions"},
        "meta": {
            "event_name": "subscription_created",
            "custom_data": {"identity_id": identity.id, "checkout_kind": CheckoutKind.PRO_MONTHLY.value},
        },
    }

    await service.process_lemonsqueezy_webhook(payload)
    await service.process_lemonsqueezy_webhook(payload)

    snapshot = await store.snapshot()
    updated = snapshot.identities[identity.id]

    assert updated.plan == IdentityPlan.PRO
    assert updated.subscription_status == SubscriptionStatus.ACTIVE
    assert updated.monthly_credit_allowance == 1200
    assert updated.monthly_credits_remaining == 1200
    assert len(snapshot.billing_webhook_receipts) == 2
    assert sum(1 for entry in snapshot.credit_ledger.values() if entry.entry_type == CreditEntryType.SUBSCRIPTION) == 1


@pytest.mark.asyncio
async def test_create_generation_enforces_recent_submit_burst_limit(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=60,
        monthly_credit_allowance=60,
        extra_credits=0,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    recent_now = utc_now()
    recent_jobs = [
        GenerationJob(
            id=f"job-{index}",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            title=f"Job {index}",
            status=JobStatus.COMPLETED,
            queue_priority="standard",
            model="flux-schnell",
            prompt_snapshot=PromptSnapshot(
                prompt=f"prompt {index}",
                negative_prompt="",
                model="flux-schnell",
                workflow="text_to_image",
                width=1024,
                height=1024,
                steps=24,
                cfg_scale=6.5,
                seed=index,
                aspect_ratio="1:1",
            ),
            estimated_cost=0.003,
            credit_cost=6,
            created_at=recent_now - timedelta(seconds=index),
            updated_at=recent_now - timedelta(seconds=index),
            completed_at=recent_now - timedelta(seconds=index),
        )
        for index in range(4)
    ]

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            *[state.generations.__setitem__(job.id, job) for job in recent_jobs],
        )
    )

    with pytest.raises(ValueError, match="recent generation burst limit"):
        await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="cinematic portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.5,
            seed=42,
            aspect_ratio="1:1",
        )


@pytest.mark.asyncio
async def test_create_generation_persists_reference_asset_in_prompt_snapshot(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    
    class _ReferenceProvider:
        name = "fal"
        rollout_tier = "primary"
        billable = True
        capabilities = ProviderCapabilities(
            workflows=("text_to_image", "image_to_image", "edit"),
            supports_reference_image=True,
        )

        async def is_available(self) -> bool:
            return True

        def is_configured(self) -> bool:
            return True

        async def health(self, probe: bool = True) -> dict[str, object]:
            return {"name": self.name, "status": "healthy", "detail": "reference-test"}

        async def health_snapshot(self, probe: bool = True, *, priority: int) -> dict[str, object]:
            payload = await self.health(probe=probe)
            payload["priority"] = priority
            payload["billable"] = self.billable
            payload["rollout_tier"] = self.rollout_tier
            payload["capabilities"] = {"workflows": ["text_to_image", "image_to_image", "edit"]}
            return payload

        def supports_generation(self, workflow: str, *, has_reference_image: bool) -> bool:
            return workflow in {"image_to_image", "edit", "text_to_image"}

    providers = ProviderRegistry()
    reference_provider = _ReferenceProvider()
    providers.providers = [reference_provider]
    providers._providers_by_name = {reference_provider.name: reference_provider}
    providers._provider_circuits = {reference_provider.name: provider_module.ProviderCircuitState()}

    service = StudioService(store, providers, tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Reference",
        prompt="reference image",
        url="stored",
        metadata={},
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
        )
    )

    job = await service.create_generation(
        identity_id=identity.id,
        project_id=project.id,
        prompt="Turn this into a cinematic poster",
        negative_prompt="",
        reference_asset_id=asset.id,
        model_id="flux-schnell",
        width=1024,
        height=1024,
        steps=24,
        cfg_scale=6.0,
        seed=42,
        aspect_ratio="1:1",
        output_count=1,
    )

    assert job.prompt_snapshot.workflow == "image_to_image"
    assert job.prompt_snapshot.reference_asset_id == asset.id
    assert job.queue_priority == "standard"

    pending_tasks = list(service._tasks)
    for task in pending_tasks:
        task.cancel()
    await asyncio.gather(*pending_tasks, return_exceptions=True)


@pytest.mark.asyncio
async def test_load_generation_reference_image_reads_local_asset_bytes(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    image_path = tmp_path / "reference.png"
    image_bytes = b"fake-png-bytes"
    image_path.write_bytes(image_bytes)
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Reference",
        prompt="reference image",
        url="stored",
        local_path=str(image_path),
        metadata={"mime_type": "image/png"},
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
        )
    )

    reference = await service._load_generation_reference_image(
        GenerationJob(
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            model="flux-schnell",
            estimated_cost=0.0,
            credit_cost=0,
            prompt_snapshot=PromptSnapshot(
                prompt="Use this reference",
                negative_prompt="",
                model="flux-schnell",
                workflow="image_to_image",
                reference_asset_id=asset.id,
                width=1024,
                height=1024,
                steps=24,
                cfg_scale=6.0,
                seed=42,
                aspect_ratio="1:1",
            ),
        )
    )

    assert reference is not None
    assert reference.asset_id == asset.id
    assert reference.mime_type == "image/png"
    assert reference.image_bytes == image_bytes


@pytest.mark.asyncio
async def test_import_asset_from_data_url_creates_reference_asset(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
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

    asset = await service.import_asset_from_data_url(
        identity_id=identity.id,
        project_id=project.id,
        data_url="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2Z0uoAAAAASUVORK5CYII=",
        title="Reference upload",
    )

    snapshot = await store.snapshot()

    assert asset.id in snapshot.assets
    assert asset.metadata["source"] == "upload"
    assert asset.metadata["mime_type"] == "image/png"
    assert asset.metadata["storage_key"].startswith(f"uploads/{workspace.id}/{project.id}/")


@pytest.mark.asyncio
async def test_send_chat_message_allows_attachment_without_text(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )

    conversation = await service.create_conversation(identity.id, title="Attachment only", model="vision")
    result = await service.send_chat_message(
        identity.id,
        conversation.id,
        "",
        model="vision",
        attachments=[
            {
                "kind": "image",
                "url": "data:image/png;base64,aGVsbG8=",
                "asset_id": None,
                "label": "reference.png",
            }
        ],
    )

    assert result["user_message"]["content"] == ""
    assert result["user_message"]["attachments"][0]["label"] == "reference.png"
    assert result["assistant_message"]["metadata"]["has_image_attachment"] is True


@pytest.mark.asyncio
async def test_send_chat_message_titles_new_conversation_from_attachment_seed(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )

    conversation = await service.create_conversation(identity.id, title="", model="vision")
    result = await service.send_chat_message(
        identity.id,
        conversation.id,
        "",
        model="vision",
        attachments=[
            {
                "kind": "image",
                "url": "data:image/png;base64,aGVsbG8=",
                "asset_id": None,
                "label": "brand-board.png",
            }
        ],
    )

    assert result["conversation"]["title"] == "brand-board.png"
    assert result["conversation"]["message_count"] == 2


@pytest.mark.asyncio
async def test_free_plan_chat_rejects_premium_modes_and_attachments(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=60,
        monthly_credit_allowance=60,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )

    conversation = await service.create_conversation(identity.id, title="Premium attempt", model="vision")

    with pytest.raises(PermissionError, match="require Pro"):
        await service.send_chat_message(
            identity.id,
            conversation.id,
            "buna bakip duzeltme oner",
            model="vision",
            attachments=[
                {
                    "kind": "image",
                    "url": "data:image/png;base64,aGVsbG8=",
                    "asset_id": None,
                    "label": "reference.png",
                }
            ],
        )


@pytest.mark.asyncio
async def test_settings_and_billing_summary_include_resolved_entitlements(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=60,
        monthly_credit_allowance=60,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )

    settings_payload = await service.get_settings_payload(identity.id)
    billing_summary = await service.billing_summary(identity.id)

    assert settings_payload["entitlements"]["allowed_chat_modes"] == ["think"]
    assert settings_payload["entitlements"]["premium_chat"] is False
    assert settings_payload["identity"]["entitlements"]["max_chat_attachments"] == 0
    assert billing_summary["entitlements"]["can_access_chat"] is True
    assert billing_summary["entitlements"]["credits_remaining"] == 60


@pytest.mark.asyncio
async def test_chat_message_feedback_edit_regenerate_and_revert_flow(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )

    call_count = {"value": 0}

    async def fake_generate_chat_reply(*, content: str, **_: object) -> LLMResult:
        call_count["value"] += 1
        return LLMResult(
            text=f"reply-{call_count['value']}: {content}",
            provider="stub",
            model="stub-model",
            prompt_tokens=10,
            completion_tokens=20,
            estimated_cost_usd=0.001,
            used_fallback=False,
        )

    service.llm_gateway.generate_chat_reply = fake_generate_chat_reply  # type: ignore[method-assign]

    conversation = await service.create_conversation(identity.id, title="Lifecycle", model="vision")
    first_turn = await service.send_chat_message(
        identity.id,
        conversation.id,
        "ilk prompt",
        model="vision",
    )

    user_message = ChatMessage.model_validate(first_turn["user_message"])
    assistant_message = ChatMessage.model_validate(first_turn["assistant_message"])

    feedback_message = await service.set_chat_message_feedback(
        identity.id,
        conversation.id,
        assistant_message.id,
        ChatFeedback.LIKE,
    )
    assert feedback_message.feedback == ChatFeedback.LIKE

    edited_turn = await service.edit_chat_message(
        identity.id,
        conversation.id,
        user_message.id,
        "duzenlenmis prompt",
        model="vision",
    )
    edited_user = ChatMessage.model_validate(edited_turn["user_message"])
    edited_assistant = ChatMessage.model_validate(edited_turn["assistant_message"])

    assert edited_user.content == "duzenlenmis prompt"
    assert edited_user.version == 2
    assert edited_assistant.content.startswith("reply-2:")
    assert edited_assistant.version == 2
    assert len(edited_user.metadata.get("revision_history", [])) == 1
    assert len(edited_assistant.metadata.get("revision_history", [])) == 1

    regenerated_turn = await service.regenerate_chat_message(
        identity.id,
        conversation.id,
        assistant_message.id,
    )
    regenerated_assistant = ChatMessage.model_validate(regenerated_turn["assistant_message"])
    assert regenerated_assistant.content.startswith("reply-3:")
    assert regenerated_assistant.version == 3
    assert len(regenerated_assistant.metadata.get("revision_history", [])) == 2

    reverted_turn = await service.revert_chat_message(
        identity.id,
        conversation.id,
        user_message.id,
    )
    reverted_user = ChatMessage.model_validate(reverted_turn["user_message"])
    reverted_assistant = ChatMessage.model_validate(reverted_turn["assistant_message"])

    assert reverted_user.content == "ilk prompt"
    assert reverted_user.version == 1
    assert reverted_assistant.content.startswith("reply-1:")
    assert reverted_assistant.version == 1


@pytest.mark.asyncio
async def test_create_generation_rejects_when_queue_is_full(tmp_path: Path):
    settings = get_settings()
    original_queue_size = settings.max_queue_size
    settings.max_queue_size = 1
    service: StudioService | None = None

    try:
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        await service.initialize()

        identity = OmniaIdentity(
            id="user-1",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-1",
            plan=IdentityPlan.FREE,
            monthly_credits_remaining=120,
            monthly_credit_allowance=120,
        )
        workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
        project = Project(
            id="project-1",
            workspace_id=workspace.id,
            identity_id=identity.id,
            title="Project One",
        )
        pending_job = GenerationJob(
            id="job-pending",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            title="Pending Job",
            model="flux-schnell",
            status=JobStatus.PENDING,
            estimated_cost=0.0,
            credit_cost=6,
            output_count=1,
            prompt_snapshot=PromptSnapshot(
                prompt="existing pending job",
                negative_prompt="",
                model="flux-schnell",
                width=1024,
                height=1024,
                steps=20,
                cfg_scale=6.0,
                seed=42,
                aspect_ratio="1:1",
            ),
        )

        await store.mutate(
            lambda state: (
                state.identities.__setitem__(identity.id, identity),
                state.workspaces.__setitem__(workspace.id, workspace),
                state.projects.__setitem__(project.id, project),
                state.generations.__setitem__(pending_job.id, pending_job),
            )
        )

        with pytest.raises(ValueError, match="queue is currently full"):
            await service.create_generation(
                identity_id=identity.id,
                project_id=project.id,
                prompt="new image",
                negative_prompt="",
                reference_asset_id=None,
                model_id="flux-schnell",
                width=1024,
                height=1024,
                steps=20,
                cfg_scale=6.0,
                seed=123,
                aspect_ratio="1:1",
                output_count=1,
            )
    finally:
        settings.max_queue_size = original_queue_size
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_deleted_asset_cannot_be_resolved_or_clean_exported(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    media_dir = tmp_path / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    content_path = media_dir / "asset-1.png"
    clean_path = media_dir / "asset-1-clean.png"
    content_path.write_bytes(b"content")
    clean_path.write_bytes(b"clean")

    service = StudioService(store, ProviderRegistry(), media_dir)
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Render One",
        prompt="cinematic portrait",
        url="stored",
        local_path=str(content_path),
        metadata={
            "mime_type": "image/png",
            "clean_path": str(clean_path),
            "clean_mime_type": "image/png",
        },
        deleted_at=utc_now(),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
        )
    )

    token = service.build_asset_delivery_url(asset.id, variant="content", identity_id=identity.id).split("token=", 1)[1]

    with pytest.raises(PermissionError, match="no longer available"):
        await service.resolve_asset_delivery(asset.id, token, "content")

    with pytest.raises(PermissionError, match="no longer available"):
        await service.resolve_clean_asset_export(asset.id, identity.id)

    await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_rejects_when_plan_active_limit_is_reached(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=120,
        monthly_credit_allowance=120,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    pending_a = GenerationJob(
        id="job-pending-a",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Pending A",
        model="flux-schnell",
        queue_priority="standard",
        status=JobStatus.PENDING,
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        prompt_snapshot=PromptSnapshot(
            prompt="existing pending job a",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=1,
            aspect_ratio="1:1",
        ),
    )
    pending_b = GenerationJob(
        id="job-pending-b",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Pending B",
        model="flux-schnell",
        queue_priority="standard",
        status=JobStatus.PENDING,
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        prompt_snapshot=PromptSnapshot(
            prompt="existing pending job b",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=2,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(pending_a.id, pending_a),
            state.generations.__setitem__(pending_b.id, pending_b),
        )
    )

    with pytest.raises(ValueError, match="active generation limit"):
        await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="new image",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=3,
            aspect_ratio="1:1",
            output_count=1,
        )

    await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_rejects_duplicate_incomplete_request(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    pending_job = GenerationJob(
        id="job-pending",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Pending Prompt",
        model="flux-schnell",
        queue_priority="priority",
        status=JobStatus.PENDING,
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        prompt_snapshot=PromptSnapshot(
            prompt="  Luxury campaign portrait  ",
            negative_prompt="low quality",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.0,
            seed=42,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(pending_job.id, pending_job),
        )
    )

    with pytest.raises(ValueError, match="identical generation is already queued or running"):
        await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="luxury   campaign portrait",
            negative_prompt=" low quality ",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.0,
            seed=999,
            aspect_ratio="1:1",
            output_count=1,
        )

    await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_persists_routing_metadata_and_health_summary(tmp_path: Path):
    class _RoutingProvider:
        def __init__(self, *, name: str, rollout_tier: str, billable: bool = False) -> None:
            self.name = name
            self.rollout_tier = rollout_tier
            self.billable = billable
            self.capabilities = ProviderCapabilities(workflows=("text_to_image",))

        async def is_available(self) -> bool:
            return True

        def is_configured(self) -> bool:
            return True

        async def health(self, probe: bool = True) -> dict[str, object]:
            return {"name": self.name, "status": "healthy", "detail": "routing-test"}

        async def health_snapshot(self, probe: bool = True, *, priority: int) -> dict[str, object]:
            payload = await self.health(probe=probe)
            payload["priority"] = priority
            payload["billable"] = self.billable
            payload["rollout_tier"] = self.rollout_tier
            payload["capabilities"] = {"workflows": ["text_to_image"]}
            return payload

        def supports_generation(self, workflow: str, *, has_reference_image: bool) -> bool:
            return workflow == "text_to_image" and not has_reference_image

    pollinations = _RoutingProvider(name="pollinations", rollout_tier="standard")
    huggingface = _RoutingProvider(name="huggingface", rollout_tier="standard")
    demo = _RoutingProvider(name="demo", rollout_tier="degraded")

    providers = ProviderRegistry()
    providers.providers = [pollinations, huggingface, demo]
    providers._providers_by_name = {provider.name: provider for provider in providers.providers}
    providers._provider_circuits = {
        provider.name: provider_module.ProviderCircuitState() for provider in providers.providers
    }

    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, providers, tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.FREE,
        monthly_credits_remaining=60,
        monthly_credit_allowance=60,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
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

    job = await service.create_generation(
        identity_id=identity.id,
        project_id=project.id,
        prompt="anime warrior illustration with glowing armor",
        negative_prompt="",
        reference_asset_id=None,
        model_id="flux-schnell",
        width=1024,
        height=1024,
        steps=24,
        cfg_scale=6.0,
        seed=42,
        aspect_ratio="1:1",
        output_count=1,
    )
    health = await service.health()

    try:
        assert job.provider == "huggingface"
        assert job.requested_quality_tier == "standard"
        assert job.selected_quality_tier == "standard"
        assert job.degraded is False
        assert job.routing_strategy == "free-first"
        assert job.routing_reason == "free_standard_default"
        assert job.prompt_profile == "stylized_illustration"
        assert job.provider_candidates[:2] == ["huggingface", "pollinations"]
        assert health["generation_routing"]["plan_defaults"]["free"] == "free-first"
        assert health["generation_routing"]["plan_defaults"]["pro"] == "balanced"
        assert health["generation_routing"]["demo_policy"] == "degraded_only_last_resort"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_web_runtime_mode_without_broker_falls_back_to_local_processing(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    original_redis_url = settings.redis_url
    settings.generation_runtime_mode = "web"
    settings.redis_url = ""
    service: StudioService | None = None
    try:
        from io import BytesIO

        from PIL import Image

        class _TestProvider:
            name = "test-provider"
            rollout_tier = "fallback"
            billable = False
            capabilities = ProviderCapabilities(workflows=("text_to_image",))

            async def is_available(self) -> bool:
                return True

            def is_configured(self) -> bool:
                return True

            async def health(self, probe: bool = True) -> dict[str, object]:
                return {"name": self.name, "status": "healthy", "detail": "test"}

            async def health_snapshot(self, probe: bool = True, *, priority: int) -> dict[str, object]:
                payload = await self.health(probe=probe)
                payload["priority"] = priority
                payload["billable"] = self.billable
                payload["rollout_tier"] = self.rollout_tier
                return payload

            def supports_generation(self, workflow: str, *, has_reference_image: bool) -> bool:
                return workflow == "text_to_image" and not has_reference_image

            async def generate(self, **kwargs):
                image = Image.new("RGBA", (512, 512), (255, 0, 0, 255))
                buffer = BytesIO()
                image.save(buffer, format="PNG")
                return ProviderResult(
                    provider=self.name,
                    image_bytes=buffer.getvalue(),
                    mime_type="image/png",
                    width=512,
                    height=512,
                    estimated_cost=0.0,
                )

        providers = ProviderRegistry()
        providers.providers = [_TestProvider()]
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, providers, tmp_path / "media")
        await service.initialize()

        identity = OmniaIdentity(
            id="user-1",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-1",
            plan=IdentityPlan.PRO,
            monthly_credits_remaining=1200,
            monthly_credit_allowance=1200,
        )
        workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
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

        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="luxury campaign portrait",
            negative_prompt="low quality",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.0,
            seed=42,
            aspect_ratio="1:1",
            output_count=1,
        )

        await asyncio.sleep(0.05)
        snapshot = await store.snapshot()
        health = await service.health()
        assert snapshot.generations[job.id].status in {JobStatus.RUNNING, JobStatus.SUCCEEDED}
        assert service._generation_maintenance_task is not None
        assert health["status"] == "degraded"
        assert health["generation_broker"]["enabled"] is False
        assert (
            health["generation_broker"]["detail"]
            == "web_runtime_local_fallback_no_shared_broker"
        )
        assert health["generation_worker"]["processing_active"] is True
    finally:
        settings.generation_runtime_mode = original_mode
        settings.redis_url = original_redis_url
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_worker_runtime_mode_starts_maintenance_without_recovered_jobs(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    settings.generation_runtime_mode = "worker"
    service: StudioService | None = None
    try:
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        await service.initialize()

        assert service._generation_maintenance_task is not None
        assert not service._generation_maintenance_task.done()
    finally:
        settings.generation_runtime_mode = original_mode
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_service_health_reports_degraded_runtime_when_redis_broker_is_unavailable(tmp_path: Path):
    settings = get_settings()
    original_redis_url = settings.redis_url
    service: StudioService | None = None

    try:
        settings.redis_url = "redis://127.0.0.1:6399/0"
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        await service.initialize()

        health = await service.health()

        assert health["status"] == "degraded"
        assert health["generation_broker"]["configured"] is True
        assert health["generation_broker"]["enabled"] is False
        assert health["generation_broker"]["degraded"] is True
        assert health["generation_broker"]["detail"] == "redis_unavailable_fallback_local_queue"
    finally:
        settings.redis_url = original_redis_url
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_worker_runtime_mode_picks_up_new_queued_jobs_after_startup(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    original_interval = settings.generation_maintenance_interval_seconds
    settings.generation_runtime_mode = "worker"
    settings.generation_maintenance_interval_seconds = 1
    service: StudioService | None = None
    try:
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        await service.initialize()

        identity = OmniaIdentity(
            id="user-1",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-1",
            plan=IdentityPlan.PRO,
            monthly_credits_remaining=1200,
            monthly_credit_allowance=1200,
        )
        workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
        project = Project(
            id="project-1",
            workspace_id=workspace.id,
            identity_id=identity.id,
            title="Project One",
        )
        queued_job = GenerationJob(
            id="job-worker-pickup",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            title="Queued Later",
            model="flux-schnell",
            queue_priority="priority",
            status=JobStatus.QUEUED,
            estimated_cost=0.0,
            credit_cost=6,
            output_count=1,
            prompt_snapshot=PromptSnapshot(
                prompt="editorial campaign portrait",
                negative_prompt="",
                model="flux-schnell",
                width=1024,
                height=1024,
                steps=24,
                cfg_scale=6.0,
                seed=55,
                aspect_ratio="1:1",
            ),
        )

        async def fake_execute_job(job: GenerationJob) -> ExecutedGenerationBatch:
            asset = MediaAsset(
                id="asset-worker-pickup",
                workspace_id=job.workspace_id,
                project_id=job.project_id,
                identity_id=job.identity_id,
                title=job.title,
                prompt=job.prompt_snapshot.prompt,
                url="/media/worker-pickup.png",
                thumbnail_url="/media/worker-pickup-thumb.jpg",
                metadata={"provider": "worker-provider"},
            )
            return ExecutedGenerationBatch(
                provider_name="worker-provider",
                provider_rollout_tier="secondary",
                provider_billable=True,
                actual_cost_usd=0.01,
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

        service.generation_runtime.execute_job = fake_execute_job  # type: ignore[method-assign]

        await store.mutate(
            lambda state: (
                state.identities.__setitem__(identity.id, identity),
                state.workspaces.__setitem__(workspace.id, workspace),
                state.projects.__setitem__(project.id, project),
                state.generations.__setitem__(queued_job.id, queued_job),
            )
        )

        for _ in range(200):
            snapshot = await store.snapshot()
            if snapshot.generations[queued_job.id].status == JobStatus.SUCCEEDED:
                break
            await asyncio.sleep(0.02)
        else:
            raise AssertionError("Worker runtime did not pick up a queued job created after startup")

        snapshot = await store.snapshot()
        assert snapshot.generations[queued_job.id].provider == "worker-provider"
        assert "asset-worker-pickup" in snapshot.assets
    finally:
        settings.generation_runtime_mode = original_mode
        settings.generation_maintenance_interval_seconds = original_interval
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_web_runtime_mode_with_shared_broker_enqueues_generation_for_external_worker(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    broker = InMemoryGenerationBroker()
    service: StudioService | None = None

    try:
        settings.generation_runtime_mode = "web"
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(
            store,
            ProviderRegistry(),
            tmp_path / "media",
            generation_broker=broker,
        )
        await service.initialize()

        identity = OmniaIdentity(
            id="user-web-broker",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-web-broker",
            plan=IdentityPlan.PRO,
            monthly_credits_remaining=1200,
            monthly_credit_allowance=1200,
        )
        workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
        project = Project(
            id="project-web-broker",
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

        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.0,
            seed=42,
            aspect_ratio="1:1",
            output_count=1,
        )

        snapshot = await store.snapshot()
        broker_metrics = await broker.metrics()
        health = await service.health()

        assert snapshot.generations[job.id].status == JobStatus.QUEUED
        assert broker_metrics["priority"] == 1
        assert service.generation_dispatcher.metrics()["queued"] == 0
        assert service._generation_maintenance_task is None
        assert health["generation_broker"]["enabled"] is True
        assert health["generation_broker"]["claimed"] == 0
        assert health["generation_worker"]["processing_active"] is False
        assert health["generation_broker"]["queued_by_priority"]["priority"] == 1
    finally:
        settings.generation_runtime_mode = original_mode
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_worker_runtime_mode_processes_jobs_claimed_from_shared_broker(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    original_interval = settings.generation_maintenance_interval_seconds
    broker = InMemoryGenerationBroker()
    web_service: StudioService | None = None
    worker_service: StudioService | None = None

    try:
        store = StudioStateStore(tmp_path / "state.json")

        settings.generation_runtime_mode = "web"
        web_service = StudioService(
            store,
            ProviderRegistry(),
            tmp_path / "media-web",
            generation_broker=broker,
        )
        await web_service.initialize()

        identity = OmniaIdentity(
            id="user-shared-broker",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-shared-broker",
            plan=IdentityPlan.PRO,
            monthly_credits_remaining=1200,
            monthly_credit_allowance=1200,
        )
        workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
        project = Project(
            id="project-shared-broker",
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

        job = await web_service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="cinematic fashion portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.0,
            seed=88,
            aspect_ratio="1:1",
            output_count=1,
        )

        settings.generation_runtime_mode = "worker"
        settings.generation_maintenance_interval_seconds = 1
        worker_service = StudioService(
            store,
            ProviderRegistry(),
            tmp_path / "media-worker",
            generation_broker=broker,
        )

        async def fake_execute_job(queued_job: GenerationJob) -> ExecutedGenerationBatch:
            asset = MediaAsset(
                id="asset-shared-broker",
                workspace_id=queued_job.workspace_id,
                project_id=queued_job.project_id,
                identity_id=queued_job.identity_id,
                title=queued_job.title,
                prompt=queued_job.prompt_snapshot.prompt,
                url="/media/shared-broker.png",
                thumbnail_url="/media/shared-broker-thumb.jpg",
                metadata={"provider": "shared-broker-worker"},
            )
            return ExecutedGenerationBatch(
                provider_name="shared-broker-worker",
                provider_rollout_tier="primary",
                provider_billable=False,
                actual_cost_usd=0.0,
                generated_outputs=[
                    GenerationOutput(
                        asset_id=asset.id,
                        url=asset.url,
                        thumbnail_url=asset.thumbnail_url,
                        mime_type="image/png",
                        width=queued_job.prompt_snapshot.width,
                        height=queued_job.prompt_snapshot.height,
                        variation_index=0,
                    )
                ],
                created_assets=[asset],
            )

        worker_service.generation_runtime.execute_job = fake_execute_job  # type: ignore[method-assign]
        await worker_service.initialize()

        for _ in range(200):
            snapshot = await store.snapshot()
            if snapshot.generations[job.id].status == JobStatus.SUCCEEDED:
                break
            await asyncio.sleep(0.02)
        else:
            raise AssertionError("Worker runtime did not process the shared-broker job in time")

        snapshot = await store.snapshot()
        broker_metrics = await broker.metrics()

        assert snapshot.generations[job.id].provider == "shared-broker-worker"
        assert snapshot.generations[job.id].status == JobStatus.SUCCEEDED
        assert snapshot.generations[job.id].claim_token is None
        assert snapshot.generations[job.id].claimed_by is None
        assert broker_metrics == {"priority": 0, "standard": 0, "browse-only": 0}
    finally:
        settings.generation_runtime_mode = original_mode
        settings.generation_maintenance_interval_seconds = original_interval
        if worker_service is not None:
            await worker_service.shutdown()
        if web_service is not None:
            await web_service.shutdown()


@pytest.mark.asyncio
async def test_cancelled_worker_keeps_shared_broker_claim_for_recovery(tmp_path: Path):
    class _SlowProvider:
        name = "slow-provider"
        rollout_tier = "fallback"
        billable = False
        capabilities = ProviderCapabilities(workflows=("text_to_image",))

        async def is_available(self) -> bool:
            return True

        def is_configured(self) -> bool:
            return True

        async def health(self, probe: bool = True) -> dict[str, object]:
            return {"name": self.name, "status": "healthy", "detail": "slow"}

        async def health_snapshot(self, probe: bool = True, *, priority: int) -> dict[str, object]:
            payload = await self.health(probe=probe)
            payload["priority"] = priority
            payload["billable"] = self.billable
            payload["rollout_tier"] = self.rollout_tier
            return payload

        def supports_generation(self, workflow: str, *, has_reference_image: bool) -> bool:
            return workflow == "text_to_image" and not has_reference_image

        async def generate(self, **kwargs):
            await asyncio.sleep(60)
            raise RuntimeError("unreachable")

    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    broker = InMemoryGenerationBroker()
    service: StudioService | None = None

    try:
        settings.generation_runtime_mode = "worker"
        providers = ProviderRegistry()
        providers.providers = [_SlowProvider()]
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(
            store,
            providers,
            tmp_path / "media",
            generation_broker=broker,
        )
        await service.initialize()

        identity = OmniaIdentity(
            id="user-cancelled-worker",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-cancelled-worker",
            plan=IdentityPlan.PRO,
            monthly_credits_remaining=1200,
            monthly_credit_allowance=1200,
        )
        workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
        project = Project(
            id="project-cancelled-worker",
            workspace_id=workspace.id,
            identity_id=identity.id,
            title="Project One",
        )
        job = GenerationJob(
            id="job-cancelled-worker",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            title="Slow Job",
            model="flux-schnell",
            queue_priority="priority",
            status=JobStatus.QUEUED,
            provider="pending",
            estimated_cost=0.0,
            credit_cost=6,
            output_count=1,
            prompt_snapshot=PromptSnapshot(
                prompt="slow job",
                negative_prompt="",
                model="flux-schnell",
                width=1024,
                height=1024,
                steps=20,
                cfg_scale=6.0,
                seed=307,
                aspect_ratio="1:1",
            ),
        )

        await store.mutate(
            lambda state: (
                state.identities.__setitem__(identity.id, identity),
                state.workspaces.__setitem__(workspace.id, workspace),
                state.projects.__setitem__(project.id, project),
                state.generations.__setitem__(job.id, job),
            )
        )
        await broker.initialize()
        await broker.enqueue(job.id, priority="priority")
        broker_job_id, _, _ = await broker.dequeue_next(
            priority_streak=0,
            priority_burst_limit=3,
            priority_order=("priority", "standard", "browse-only"),
        )
        assert broker_job_id == job.id

        task = asyncio.create_task(service._process_generation(job.id))
        await asyncio.sleep(0.05)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task

        snapshot = await store.snapshot()
        claimed_job = snapshot.generations[job.id]
        assert claimed_job.status == JobStatus.RUNNING
        assert claimed_job.claim_token is not None
        assert claimed_job.claimed_by is not None
        assert await broker.claimed_count() == 1
    finally:
        settings.generation_runtime_mode = original_mode
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_generation_maintenance_leaves_fresh_claimed_running_job_untouched(tmp_path: Path):
    settings = get_settings()
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-claim-fresh",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-claim-fresh",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-claim-fresh",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    now = utc_now()
    running_job = GenerationJob(
        id="job-claim-fresh",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Claimed Job",
        model="flux-schnell",
        status=JobStatus.RUNNING,
        provider="worker-provider",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        attempt_count=1,
        claimed_by="worker-a",
        claim_token="claim-fresh",
        claim_expires_at=now + timedelta(seconds=settings.generation_stale_running_seconds),
        last_claim_heartbeat_at=now,
        started_at=now - timedelta(seconds=5),
        last_heartbeat_at=now,
        updated_at=now,
        prompt_snapshot=PromptSnapshot(
            prompt="fresh claimed job",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=303,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(running_job.id, running_job),
        )
    )

    try:
        await service._run_generation_maintenance_pass()
        snapshot = await store.snapshot()
        job = snapshot.generations[running_job.id]
        assert job.status == JobStatus.RUNNING
        assert job.claim_token == "claim-fresh"
        assert job.claimed_by == "worker-a"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_maintenance_requeues_expired_claimed_running_job_with_retry_budget(tmp_path: Path):
    settings = get_settings()
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-claim-expired",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-claim-expired",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-claim-expired",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    expired_at = utc_now() - timedelta(seconds=5)
    running_job = GenerationJob(
        id="job-claim-expired",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Expired Claim Job",
        model="flux-schnell",
        queue_priority="priority",
        status=JobStatus.RUNNING,
        provider="worker-provider",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        attempt_count=1,
        claimed_by="worker-a",
        claim_token="claim-expired",
        claim_expires_at=expired_at,
        last_claim_heartbeat_at=expired_at,
        started_at=expired_at,
        last_heartbeat_at=expired_at,
        updated_at=expired_at,
        prompt_snapshot=PromptSnapshot(
            prompt="expired claimed job",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=304,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(running_job.id, running_job),
        )
    )

    try:
        await service._run_generation_maintenance_pass()
        snapshot = await store.snapshot()
        job = snapshot.generations[running_job.id]
        assert job.status == JobStatus.QUEUED
        assert job.claim_token is None
        assert job.claimed_by is None
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_maintenance_times_out_expired_claimed_running_job_after_retry_budget(tmp_path: Path):
    settings = get_settings()
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-claim-timeout",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-claim-timeout",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-claim-timeout",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    expired_at = utc_now() - timedelta(seconds=5)
    running_job = GenerationJob(
        id="job-claim-timeout",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Expired Claim Job",
        model="flux-schnell",
        queue_priority="priority",
        status=JobStatus.RUNNING,
        provider="worker-provider",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        attempt_count=settings.generation_retry_attempt_limit,
        claimed_by="worker-a",
        claim_token="claim-timeout",
        claim_expires_at=expired_at,
        last_claim_heartbeat_at=expired_at,
        started_at=expired_at,
        last_heartbeat_at=expired_at,
        updated_at=expired_at,
        prompt_snapshot=PromptSnapshot(
            prompt="expired claimed job timed out",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=305,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(running_job.id, running_job),
        )
    )

    try:
        await service._run_generation_maintenance_pass()
        snapshot = await store.snapshot()
        job = snapshot.generations[running_job.id]
        assert job.status == JobStatus.TIMED_OUT
        assert job.claim_token is None
        assert job.claimed_by is None
        assert job.error_code == "generation_timed_out"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_worker_runtime_mode_drops_terminal_job_reappearing_in_shared_broker(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    original_interval = settings.generation_maintenance_interval_seconds
    broker = InMemoryGenerationBroker()
    service: StudioService | None = None

    try:
        settings.generation_runtime_mode = "worker"
        settings.generation_maintenance_interval_seconds = 1
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(
            store,
            ProviderRegistry(),
            tmp_path / "media",
            generation_broker=broker,
        )

        identity = OmniaIdentity(
            id="user-terminal-broker",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-terminal-broker",
            plan=IdentityPlan.PRO,
            monthly_credits_remaining=1200,
            monthly_credit_allowance=1200,
        )
        workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
        project = Project(
            id="project-terminal-broker",
            workspace_id=workspace.id,
            identity_id=identity.id,
            title="Project One",
        )
        completed_job = GenerationJob(
            id="job-terminal-broker",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            title="Already Done",
            model="flux-schnell",
            status=JobStatus.SUCCEEDED,
            provider="completed-provider",
            estimated_cost=0.0,
            credit_cost=6,
            output_count=1,
            completed_at=utc_now(),
            prompt_snapshot=PromptSnapshot(
                prompt="already finished",
                negative_prompt="",
                model="flux-schnell",
                width=1024,
                height=1024,
                steps=20,
                cfg_scale=6.0,
                seed=305,
                aspect_ratio="1:1",
            ),
        )

        await store.mutate(
            lambda state: (
                state.identities.__setitem__(identity.id, identity),
                state.workspaces.__setitem__(workspace.id, workspace),
                state.projects.__setitem__(project.id, project),
                state.generations.__setitem__(completed_job.id, completed_job),
            )
        )
        await broker.initialize()
        await broker.enqueue(completed_job.id, priority="priority")

        await service.initialize()
        await service._run_generation_maintenance_pass()

        snapshot = await store.snapshot()
        health = await service.health()

        assert snapshot.generations[completed_job.id].status == JobStatus.SUCCEEDED
        assert await broker.metrics() == {"priority": 0, "standard": 0, "browse-only": 0}
        assert health["generation_broker"]["claimed"] == 0
    finally:
        settings.generation_runtime_mode = original_mode
        settings.generation_maintenance_interval_seconds = original_interval
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_worker_runtime_mode_discards_missing_job_reappearing_in_shared_broker(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    original_interval = settings.generation_maintenance_interval_seconds
    broker = InMemoryGenerationBroker()
    service: StudioService | None = None

    try:
        settings.generation_runtime_mode = "worker"
        settings.generation_maintenance_interval_seconds = 1
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(
            store,
            ProviderRegistry(),
            tmp_path / "media",
            generation_broker=broker,
        )

        await service.initialize()
        await broker.enqueue("missing-broker-job", priority="standard")

        await service._run_generation_maintenance_pass()
        health = await service.health()

        assert await broker.metrics() == {"priority": 0, "standard": 0, "browse-only": 0}
        assert health["generation_broker"]["claimed"] == 0
    finally:
        settings.generation_runtime_mode = original_mode
        settings.generation_maintenance_interval_seconds = original_interval
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_worker_runtime_mode_discards_running_job_duplicate_left_in_shared_broker(tmp_path: Path):
    settings = get_settings()
    original_mode = settings.generation_runtime_mode
    original_interval = settings.generation_maintenance_interval_seconds
    broker = InMemoryGenerationBroker()
    service: StudioService | None = None

    try:
        settings.generation_runtime_mode = "worker"
        settings.generation_maintenance_interval_seconds = 1
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(
            store,
            ProviderRegistry(),
            tmp_path / "media",
            generation_broker=broker,
        )
        await service.initialize()

        identity = OmniaIdentity(
            id="user-running-broker-dup",
            email="user@example.com",
            display_name="User One",
            username="userone",
            workspace_id="ws-user-running-broker-dup",
            plan=IdentityPlan.PRO,
            monthly_credits_remaining=1200,
            monthly_credit_allowance=1200,
        )
        workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="User One Studio")
        project = Project(
            id="project-running-broker-dup",
            workspace_id=workspace.id,
            identity_id=identity.id,
            title="Project One",
        )
        now = utc_now()
        running_job = GenerationJob(
            id="job-running-broker-dup",
            workspace_id=workspace.id,
            project_id=project.id,
            identity_id=identity.id,
            title="Already Running",
            model="flux-schnell",
            queue_priority="priority",
            status=JobStatus.RUNNING,
            provider="worker-provider",
            estimated_cost=0.0,
            credit_cost=6,
            output_count=1,
            attempt_count=1,
            claimed_by="worker-a",
            claim_token="claim-running-broker-dup",
            claim_expires_at=now + timedelta(seconds=120),
            last_claim_heartbeat_at=now,
            started_at=now,
            last_heartbeat_at=now,
            updated_at=now,
            prompt_snapshot=PromptSnapshot(
                prompt="already running duplicate",
                negative_prompt="",
                model="flux-schnell",
                width=1024,
                height=1024,
                steps=20,
                cfg_scale=6.0,
                seed=306,
                aspect_ratio="1:1",
            ),
        )

        await store.mutate(
            lambda state: (
                state.identities.__setitem__(identity.id, identity),
                state.workspaces.__setitem__(workspace.id, workspace),
                state.projects.__setitem__(project.id, project),
                state.generations.__setitem__(running_job.id, running_job),
            )
        )
        await broker.enqueue(running_job.id, priority="priority")

        await service._run_generation_maintenance_pass()
        snapshot = await store.snapshot()
        job = snapshot.generations[running_job.id]

        assert job.status == JobStatus.RUNNING
        assert job.claim_token == "claim-running-broker-dup"
        assert await broker.metrics() == {"priority": 0, "standard": 0, "browse-only": 0}
    finally:
        settings.generation_runtime_mode = original_mode
        settings.generation_maintenance_interval_seconds = original_interval
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_service_normalizes_generation_claim_lease_above_maintenance_interval(tmp_path: Path):
    settings = get_settings()
    original_claim_lease = settings.generation_claim_lease_seconds
    original_interval = settings.generation_maintenance_interval_seconds
    original_stale = settings.generation_stale_running_seconds
    service: StudioService | None = None

    try:
        settings.generation_claim_lease_seconds = 5
        settings.generation_maintenance_interval_seconds = 12
        settings.generation_stale_running_seconds = 180
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")

        assert service._generation_claim_lease_seconds == 36
    finally:
        settings.generation_claim_lease_seconds = original_claim_lease
        settings.generation_maintenance_interval_seconds = original_interval
        settings.generation_stale_running_seconds = original_stale
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_initialize_recovers_incomplete_generation_jobs(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    recovering_job = GenerationJob(
        id="job-recovering",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Recover Me",
        model="flux-schnell",
        status=JobStatus.PROCESSING,
        provider="cloud",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        prompt_snapshot=PromptSnapshot(
            prompt="recover this job",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=77,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(recovering_job.id, recovering_job),
        )
    )

    service = StudioService(store, ProviderRegistry(), tmp_path / "media")

    async def fake_execute_job(job: GenerationJob) -> ExecutedGenerationBatch:
        asset = MediaAsset(
            id="asset-recovered",
            workspace_id=job.workspace_id,
            project_id=job.project_id,
            identity_id=job.identity_id,
            title=job.title,
            prompt=job.prompt_snapshot.prompt,
            url="/media/recovered.png",
            thumbnail_url="/media/recovered-thumb.jpg",
            metadata={"provider": "recovery-provider"},
        )
        return ExecutedGenerationBatch(
            provider_name="recovery-provider",
            provider_rollout_tier="secondary",
            provider_billable=True,
            actual_cost_usd=0.012,
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

    service.generation_runtime.execute_job = fake_execute_job  # type: ignore[method-assign]

    try:
        await service.initialize()

        for _ in range(100):
            snapshot = await store.snapshot()
            if snapshot.generations[recovering_job.id].status == JobStatus.COMPLETED:
                break
            await asyncio.sleep(0.01)
        else:
            raise AssertionError("Recovered job did not complete in time")

        snapshot = await store.snapshot()
        assert snapshot.generations[recovering_job.id].status == JobStatus.COMPLETED
        assert snapshot.generations[recovering_job.id].provider == "recovery-provider"
        assert snapshot.generations[recovering_job.id].provider_rollout_tier == "secondary"
        assert snapshot.generations[recovering_job.id].provider_billable is True
        assert snapshot.generations[recovering_job.id].actual_cost_usd == 0.012
        assert "asset-recovered" in snapshot.assets
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_maintenance_requeues_retryable_failed_job(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    retryable_job = GenerationJob(
        id="job-retryable",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Retry Me",
        model="flux-schnell",
        queue_priority="priority",
        status=JobStatus.RETRYABLE_FAILED,
        provider="temporary-provider",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        error="Temporary upstream outage",
        attempt_count=1,
        updated_at=utc_now() - timedelta(seconds=get_settings().generation_retry_delay_seconds + 5),
        prompt_snapshot=PromptSnapshot(
            prompt="retry this render",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=55,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(retryable_job.id, retryable_job),
        )
    )

    async def fake_execute_job(job: GenerationJob) -> ExecutedGenerationBatch:
        asset = MediaAsset(
            id="asset-retryable",
            workspace_id=job.workspace_id,
            project_id=job.project_id,
            identity_id=job.identity_id,
            title=job.title,
            prompt=job.prompt_snapshot.prompt,
            url="/media/retryable.png",
            thumbnail_url="/media/retryable-thumb.jpg",
            metadata={"provider": "recovery-provider"},
        )
        return ExecutedGenerationBatch(
            provider_name="recovery-provider",
            provider_rollout_tier="secondary",
            provider_billable=True,
            actual_cost_usd=0.02,
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

    service.generation_runtime.execute_job = fake_execute_job  # type: ignore[method-assign]

    try:
        await service._run_generation_maintenance_pass()

        for _ in range(100):
            snapshot = await store.snapshot()
            if snapshot.generations[retryable_job.id].status == JobStatus.SUCCEEDED:
                break
            await asyncio.sleep(0.01)
        else:
            raise AssertionError("Retryable generation did not complete in time")

        snapshot = await store.snapshot()
        recovered = snapshot.generations[retryable_job.id]
        assert recovered.status == JobStatus.SUCCEEDED
        assert recovered.attempt_count == 2
        assert recovered.provider == "recovery-provider"
        assert recovered.error is None
        assert "asset-retryable" in snapshot.assets
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_maintenance_times_out_stale_running_job_after_retry_budget(tmp_path: Path):
    settings = get_settings()
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    stale_running_job = GenerationJob(
        id="job-stale",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Stale Job",
        model="flux-schnell",
        status=JobStatus.RUNNING,
        provider="lost-worker",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        attempt_count=settings.generation_retry_attempt_limit,
        started_at=utc_now() - timedelta(seconds=settings.generation_stale_running_seconds + 30),
        last_heartbeat_at=utc_now() - timedelta(seconds=settings.generation_stale_running_seconds + 30),
        updated_at=utc_now() - timedelta(seconds=settings.generation_stale_running_seconds + 30),
        prompt_snapshot=PromptSnapshot(
            prompt="stale job",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=99,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(stale_running_job.id, stale_running_job),
        )
    )

    try:
        await service._run_generation_maintenance_pass()
        snapshot = await store.snapshot()
        job = snapshot.generations[stale_running_job.id]
        assert job.status == JobStatus.TIMED_OUT
        assert "timed out" in (job.error or "").lower()
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_maintenance_fails_retryable_job_after_retry_budget(tmp_path: Path):
    settings = get_settings()
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    exhausted_job = GenerationJob(
        id="job-exhausted",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Exhausted Job",
        model="flux-schnell",
        queue_priority="standard",
        status=JobStatus.RETRYABLE_FAILED,
        provider="temporary-provider",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        error="Temporary upstream outage",
        attempt_count=settings.generation_retry_attempt_limit,
        updated_at=utc_now() - timedelta(seconds=settings.generation_retry_delay_seconds + 5),
        prompt_snapshot=PromptSnapshot(
            prompt="do not retry this anymore",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=101,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(exhausted_job.id, exhausted_job),
        )
    )

    try:
        await service._run_generation_maintenance_pass()
        snapshot = await store.snapshot()
        job = snapshot.generations[exhausted_job.id]
        assert job.status == JobStatus.FAILED
        assert "retry budget exhausted" in (job.error or "").lower()
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_orphan_cleanup_times_out_jobs_older_than_24_hours(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project One",
    )
    old_job = GenerationJob(
        id="job-orphaned",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Old Job",
        model="flux-schnell",
        queue_priority="standard",
        status=JobStatus.QUEUED,
        provider="pending",
        estimated_cost=0.0,
        credit_cost=6,
        output_count=1,
        created_at=utc_now() - timedelta(hours=25),
        updated_at=utc_now() - timedelta(hours=25),
        prompt_snapshot=PromptSnapshot(
            prompt="stale orphan",
            negative_prompt="",
            model="flux-schnell",
            width=1024,
            height=1024,
            steps=20,
            cfg_scale=6.0,
            seed=202,
            aspect_ratio="1:1",
        ),
    )

    await store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.generations.__setitem__(old_job.id, old_job),
        )
    )

    try:
        cleaned = await service._run_orphan_cleanup_pass(now=utc_now())
        snapshot = await store.snapshot()
        job = snapshot.generations[old_job.id]

        assert cleaned == 1
        assert job.status == JobStatus.TIMED_OUT
        assert job.error_code == "orphaned_job_timeout"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_rejects_when_no_configured_provider_supports_workflow(tmp_path: Path):
    class _DisabledProvider:
        name = "disabled"

        def is_configured(self) -> bool:
            return False

        def supports_generation(self, workflow: str, *, has_reference_image: bool) -> bool:
            return True

    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    disabled_provider = _DisabledProvider()
    service.providers.providers = [disabled_provider]
    service.providers._providers_by_name = {disabled_provider.name: disabled_provider}
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
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

    try:
        with pytest.raises(ValueError, match="No generation provider is currently configured"):
            await service.create_generation(
                identity_id=identity.id,
                project_id=project.id,
                prompt="test prompt",
                negative_prompt="",
                reference_asset_id=None,
                model_id="flux-schnell",
                width=1024,
                height=1024,
                steps=24,
                cfg_scale=6.0,
                seed=42,
                aspect_ratio="1:1",
                output_count=1,
            )
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_ensure_identity_applies_privileged_overrides_for_configured_owner_email(tmp_path: Path):
    settings = get_settings()
    original_owner_emails = settings.studio_owner_emails
    original_root_admin_emails = settings.studio_root_admin_emails
    settings.studio_owner_emails = "alierdincyigitaslan@gmail.com,ghostsofter12@gmail.com"
    settings.studio_root_admin_emails = "alierdincyigitaslan@gmail.com,ghostsofter12@gmail.com"
    service = None

    try:
        store = StudioStateStore(tmp_path / "state.json")
        service = StudioService(store, ProviderRegistry(), tmp_path / "media")
        await service.initialize()

        identity = await service.ensure_identity(
            user_id="owner-1",
            email="ghostsofter12@gmail.com",
            display_name="Owner",
            username="owner",
        )

        assert identity.plan == IdentityPlan.PRO
        assert identity.owner_mode is True
        assert identity.root_admin is True
        assert identity.local_access is True
        assert identity.monthly_credits_remaining >= 999999999
        assert identity.extra_credits >= 999999999
    finally:
        settings.studio_owner_emails = original_owner_emails
        settings.studio_root_admin_emails = original_root_admin_emails
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_privileged_identity_bypasses_credit_and_capacity_limits(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="owner-1",
        email="ghostsofter12@gmail.com",
        display_name="Owner",
        username="owner",
        workspace_id="ws-owner-1",
        plan=IdentityPlan.PRO,
        owner_mode=True,
        root_admin=True,
        local_access=True,
        monthly_credits_remaining=0,
        monthly_credit_allowance=0,
        extra_credits=0,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="Owner Studio")
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

    for index in range(60):
        await store.save_model(
            "generations",
            GenerationJob(
                id=f"job-{index}",
                workspace_id=workspace.id,
                project_id=project.id,
                identity_id=identity.id,
                title="Queued job",
                model="flux-schnell",
                status=JobStatus.QUEUED,
                estimated_cost=0.0,
                credit_cost=6,
                output_count=1,
                prompt_snapshot=PromptSnapshot(
                    prompt=f"queued {index}",
                    negative_prompt="",
                    model="flux-schnell",
                    width=1024,
                    height=1024,
                    steps=20,
                    cfg_scale=6.0,
                    seed=index,
                    aspect_ratio="1:1",
                ),
            ),
        )

    try:
        created = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="owner render",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.0,
            seed=777,
            aspect_ratio="1:1",
            output_count=1,
        )

        assert created.id
        assert created.identity_id == identity.id
    finally:
        await service.shutdown()
