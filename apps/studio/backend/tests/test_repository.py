from datetime import timedelta
from pathlib import Path

import pytest

from studio_platform.models import (
    BillingWebhookReceipt,
    ChatConversation,
    ChatMessage,
    ChatRole,
    CreditEntryType,
    CreditLedgerEntry,
    GenerationJob,
    JobStatus,
    MediaAsset,
    OmniaIdentity,
    PromptSnapshot,
    Project,
    ShareLink,
    StudioWorkspace,
)
from studio_platform.repository import StudioRepository
from studio_platform.store import StudioStateStore
from studio_platform.models import utc_now


@pytest.mark.asyncio
async def test_repository_exposes_typed_identity_and_asset_access(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    repository = StudioRepository(store)

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id="project-1",
        identity_id=identity.id,
        title="Render One",
        prompt="cinematic portrait",
        url="stored",
        metadata={"mime_type": "image/png"},
    )

    await repository.load()
    await repository.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.assets.__setitem__(asset.id, asset),
        )
    )

    loaded_identity = await repository.get_identity(identity.id)
    loaded_asset = await repository.get_asset(asset.id)
    listed_assets = await repository.list_assets()
    owned_assets = await repository.list_assets_for_identity(identity.id)
    asset_map = await repository.get_asset_map()
    identity_map = await repository.get_identity_map()
    counts = await repository.get_counts_summary()

    assert loaded_identity is not None
    assert loaded_identity.email == identity.email
    assert loaded_asset is not None
    assert loaded_asset.id == asset.id
    assert [item.id for item in listed_assets] == [asset.id]
    assert [item.id for item in owned_assets] == [asset.id]
    assert asset_map[asset.id].id == asset.id
    assert identity_map[identity.id].email == identity.email
    assert counts["identities"] == 1
    assert counts["assets"] == 1


@pytest.mark.asyncio
async def test_repository_exposes_generation_admission_and_receipt_queries(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    repository = StudioRepository(store)
    await repository.load()

    now = utc_now()
    prompt_snapshot = PromptSnapshot(
        prompt="cinematic portrait",
        negative_prompt="low quality",
        model="flux-schnell",
        workflow="text_to_image",
        width=1024,
        height=1024,
        steps=24,
        cfg_scale=6.5,
        seed=42,
        aspect_ratio="1:1",
    )
    job = GenerationJob(
        id="job-1",
        workspace_id="ws-user-1",
        project_id="project-1",
        identity_id="user-1",
        title="Job One",
        status=JobStatus.PENDING,
        model="flux-schnell",
        prompt_snapshot=prompt_snapshot,
        estimated_cost=0.003,
        credit_cost=6,
        created_at=now,
        updated_at=now,
    )
    receipt = BillingWebhookReceipt(
        id="receipt-1",
        event_name="order_created",
        resource_type="orders",
        resource_id="order-1",
        identity_id="user-1",
    )

    await repository.mutate(
        lambda state: (
            state.generations.__setitem__(job.id, job),
            state.billing_webhook_receipts.__setitem__(receipt.id, receipt),
        )
    )

    assert await repository.count_incomplete_generations() == 1
    assert await repository.count_incomplete_generations_for_identity("user-1") == 1
    assert await repository.count_recent_generation_requests_for_identity(
        "user-1",
        since=now - timedelta(minutes=1),
    ) == 1
    assert await repository.has_duplicate_incomplete_generation(
        identity_id="user-1",
        project_id="project-1",
        model_id="flux-schnell",
        prompt_snapshot=prompt_snapshot,
    )
    assert await repository.has_billing_webhook_receipt("receipt-1") is True
    assert await repository.list_posts_for_identity("user-1") == []


@pytest.mark.asyncio
async def test_repository_exposes_identity_scoped_project_chat_share_and_ledger_queries(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    repository = StudioRepository(store)
    await repository.load()

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
    project_chat = Project(
        id="project-chat",
        workspace_id=identity.workspace_id,
        identity_id=identity.id,
        title="Chat Project",
        surface="chat",
    )
    project_compose = Project(
        id="project-compose",
        workspace_id=identity.workspace_id,
        identity_id=identity.id,
        title="Compose Project",
        surface="compose",
    )
    other_project = Project(
        id="project-other",
        workspace_id=other_identity.workspace_id,
        identity_id=other_identity.id,
        title="Other Project",
        surface="compose",
    )
    conversation = ChatConversation(
        id="conv-1",
        workspace_id=identity.workspace_id,
        identity_id=identity.id,
        title="Conversation One",
        updated_at=utc_now(),
    )
    message = ChatMessage(
        id="msg-1",
        conversation_id=conversation.id,
        identity_id=identity.id,
        role=ChatRole.USER,
        content="hello",
    )
    share = ShareLink(
        id="share-1",
        identity_id=identity.id,
        token="token-1",
        project_id=project_compose.id,
    )
    ledger_entry = CreditLedgerEntry(
        id="ledger-1",
        identity_id=identity.id,
        amount=1200,
        entry_type=CreditEntryType.SUBSCRIPTION,
        description="Monthly grant",
    )

    await repository.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.identities.__setitem__(other_identity.id, other_identity),
            state.projects.__setitem__(project_chat.id, project_chat),
            state.projects.__setitem__(project_compose.id, project_compose),
            state.projects.__setitem__(other_project.id, other_project),
            state.conversations.__setitem__(conversation.id, conversation),
            state.chat_messages.__setitem__(message.id, message),
            state.shares.__setitem__(share.id, share),
            state.credit_ledger.__setitem__(ledger_entry.id, ledger_entry),
        )
    )

    compose_projects = await repository.list_projects_for_identity(identity.id, surface="compose")
    chat_projects = await repository.list_projects_for_identity(identity.id, surface="chat")
    conversations = await repository.list_conversations_for_identity(identity.id)
    messages = await repository.list_chat_messages_for_conversation(
        identity_id=identity.id,
        conversation_id=conversation.id,
    )
    share_by_token = await repository.get_share_by_token("token-1")
    shares = await repository.list_shares_for_identity(identity.id)
    ledger = await repository.list_credit_entries_for_identity(identity.id)

    assert [project.id for project in compose_projects] == [project_compose.id]
    assert [project.id for project in chat_projects] == [project_chat.id]
    assert [item.id for item in conversations] == [conversation.id]
    assert [item.id for item in messages] == [message.id]
    assert share_by_token is not None
    assert share_by_token.id == share.id
    assert [item.id for item in shares] == [share.id]
    assert [item.id for item in ledger] == [ledger_entry.id]
