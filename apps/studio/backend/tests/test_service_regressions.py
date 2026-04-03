from pathlib import Path

import pytest

from config.env import get_settings
from studio_platform.models import (
    ChatConversation,
    ChatMessage,
    ChatRole,
    CheckoutKind,
    CreditEntryType,
    CreditLedgerEntry,
    MediaAsset,
    OmniaIdentity,
    Project,
    PublicPost,
    ShareLink,
    StudioWorkspace,
)
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
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
    finally:
        settings.lemonsqueezy_store_id = original_store_id
