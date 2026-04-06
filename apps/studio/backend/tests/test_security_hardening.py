from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import pytest

from security.moderation import ModerationResult
from studio_platform.models import (
    IdentityPlan,
    ManualReviewState,
    MediaAsset,
    OmniaIdentity,
    Project,
    PublicPost,
    ShareLink,
    StudioWorkspace,
    Visibility,
    utc_now,
)
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
from studio_platform.store import StudioStateStore


async def _build_service(tmp_path: Path) -> tuple[StudioService, StudioStateStore]:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()
    return service, store


async def _seed_identity_project_asset(
    store: StudioStateStore,
    *,
    identity_id: str = "user-1",
    plan: IdentityPlan = IdentityPlan.PRO,
    temp_block_until=None,
    manual_review_state: ManualReviewState = ManualReviewState.NONE,
    owner_mode: bool = False,
    root_admin: bool = False,
    local_access: bool = False,
) -> tuple[OmniaIdentity, StudioWorkspace, Project, MediaAsset]:
    identity = OmniaIdentity(
        id=identity_id,
        email=f"{identity_id}@example.com",
        display_name="Creator",
        username=identity_id,
        workspace_id=f"ws-{identity_id}",
        plan=plan,
        temp_block_until=temp_block_until,
        manual_review_state=manual_review_state,
        owner_mode=owner_mode,
        root_admin=root_admin,
        local_access=local_access,
    )
    workspace = StudioWorkspace(id=identity.workspace_id, identity_id=identity.id, name="Studio")
    project = Project(
        id=f"project-{identity_id}",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Project",
    )
    asset = MediaAsset(
        id=f"asset-{identity_id}",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Render",
        prompt="editorial portrait",
        url="/media/render.png",
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
    return identity, workspace, project, asset


@pytest.mark.asyncio
async def test_record_generation_moderation_block_escalates_temp_block_and_manual_review(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    await _seed_identity_project_asset(store)

    try:
        await service.record_generation_moderation_block("user-1", ModerationResult.SOFT_BLOCK, "sexy")
        await service.record_generation_moderation_block("user-1", ModerationResult.SOFT_BLOCK, "sexy")
        await service.record_generation_moderation_block("user-1", ModerationResult.SOFT_BLOCK, "sexy")
        blocked = await service.get_identity("user-1")

        assert blocked.flag_count == 3
        assert blocked.temp_block_until is not None
        assert blocked.manual_review_state == ManualReviewState.NONE

        await service.record_generation_moderation_block("user-1", ModerationResult.HARD_BLOCK, "violence")
        escalated = await service.get_identity("user-1")

        assert escalated.flag_count == 5
        assert escalated.temp_block_until is not None
        assert escalated.temp_block_until > utc_now() + timedelta(hours=23)
        assert escalated.manual_review_state == ManualReviewState.REQUIRED
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_rejects_temp_blocked_identity(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    await _seed_identity_project_asset(
        store,
        temp_block_until=utc_now() + timedelta(minutes=10),
    )

    try:
        with pytest.raises(PermissionError, match="temporarily blocked"):
            await service.create_generation(
                identity_id="user-1",
                project_id="missing-project",
                prompt="editorial portrait",
                negative_prompt="",
                reference_asset_id=None,
                model_id="flux-schnell",
                width=1024,
                height=1024,
                steps=28,
                cfg_scale=6.5,
                seed=1,
                aspect_ratio="1:1",
                output_count=1,
            )
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_share_rejects_manual_review_identity(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    await _seed_identity_project_asset(
        store,
        manual_review_state=ManualReviewState.REQUIRED,
    )

    try:
        with pytest.raises(PermissionError, match="manual review"):
            await service.create_share("user-1", None, None)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_update_post_rejects_public_visibility_when_identity_blocked(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, workspace, project, asset = await _seed_identity_project_asset(
        store,
        temp_block_until=utc_now() + timedelta(minutes=5),
    )
    post = PublicPost(
        id="post-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        owner_username=identity.username or "creator",
        owner_display_name=identity.display_name,
        title="Private render",
        prompt="editorial portrait",
        cover_asset_id=asset.id,
        asset_ids=[asset.id],
        visibility=Visibility.PRIVATE,
    )
    await store.mutate(lambda state: state.posts.__setitem__(post.id, post))

    try:
        with pytest.raises(PermissionError, match="temporarily blocked"):
            await service.update_post(identity.id, post.id, visibility=Visibility.PUBLIC)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_new_share_is_hashed_and_raw_token_not_persisted(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)

    try:
        share, raw_token = await service.create_share(identity.id, None, asset.id)
        stored = await service.store.get_share(share.id)

        assert raw_token
        assert stored is not None
        assert stored.token == ""
        assert stored.token_hash
        assert stored.token_preview

        payload = await service.get_public_share(raw_token)
        assert payload["share"]["id"] == share.id
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_legacy_raw_token_share_still_resolves(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)
    legacy = ShareLink(
        id="share-legacy",
        token="legacytoken123456",
        identity_id=identity.id,
        asset_id=asset.id,
    )
    await store.mutate(lambda state: state.shares.__setitem__(legacy.id, legacy))

    try:
        payload = await service.get_public_share("legacytoken123456")
        assert payload["share"]["id"] == legacy.id
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_revoked_share_public_lookup_returns_not_found(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)

    try:
        share, raw_token = await service.create_share(identity.id, None, asset.id)
        await store.mutate(lambda state: setattr(state.shares[share.id], "revoked_at", utc_now()))

        with pytest.raises(KeyError):
            await service.get_public_share(raw_token)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_revoked_share_asset_token_fails_with_permission_error(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)

    try:
        share, _ = await service.create_share(identity.id, None, asset.id)
        url = service.build_asset_delivery_url(asset.id, variant="content", share_id=share.id)
        token = parse_qs(urlparse(url).query)["token"][0]
        await store.mutate(lambda state: setattr(state.shares[share.id], "revoked_at", utc_now()))

        with pytest.raises(PermissionError):
            await service.resolve_asset_delivery(asset.id, token, "content")
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_health_detail_includes_security_summary_counts(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity_one, _, _, asset_one = await _seed_identity_project_asset(
        store,
        identity_id="blocked-user",
        temp_block_until=utc_now() + timedelta(minutes=20),
    )
    identity_two, _, _, asset_two = await _seed_identity_project_asset(
        store,
        identity_id="review-user",
        manual_review_state=ManualReviewState.REQUIRED,
    )
    active_share = ShareLink(id="share-active", token="active1234567890", identity_id=identity_one.id, asset_id=asset_one.id)
    revoked_share = ShareLink(
        id="share-revoked",
        token="revoked1234567890",
        identity_id=identity_two.id,
        asset_id=asset_two.id,
        revoked_at=utc_now(),
    )
    await store.mutate(
        lambda state: (
            state.shares.__setitem__(active_share.id, active_share),
            state.shares.__setitem__(revoked_share.id, revoked_share),
        )
    )

    try:
        health = await service.health(detail=True)
        assert health["security_summary"] == {
            "temp_blocked_identities": 1,
            "manual_review_required_identities": 1,
            "active_shares": 1,
            "revoked_shares": 1,
        }
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_privileged_identity_still_respects_moderation_block_state(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    await _seed_identity_project_asset(
        store,
        identity_id="owner-1",
        temp_block_until=utc_now() + timedelta(minutes=30),
        owner_mode=True,
        root_admin=True,
        local_access=True,
    )

    try:
        with pytest.raises(PermissionError, match="temporarily blocked"):
            await service.create_generation(
                identity_id="owner-1",
                project_id="missing-project",
                prompt="editorial portrait",
                negative_prompt="",
                reference_asset_id=None,
                model_id="flux-schnell",
                width=1024,
                height=1024,
                steps=28,
                cfg_scale=6.5,
                seed=2,
                aspect_ratio="1:1",
                output_count=1,
            )
    finally:
        await service.shutdown()
