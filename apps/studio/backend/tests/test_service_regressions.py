import asyncio
from datetime import timedelta
from pathlib import Path

import pytest

from config.env import get_settings
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
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
from studio_platform.llm import LLMResult
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
        assert "asset-recovered" in snapshot.assets
    finally:
        await service.shutdown()
