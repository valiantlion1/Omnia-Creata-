from __future__ import annotations

from datetime import timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import jwt
import pytest

from config.env import Environment, Settings, reveal_secret
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
    SubscriptionStatus,
    Visibility,
    utc_now,
)
from studio_platform.providers import ProviderRegistry
from studio_platform.share_ops import hash_share_token
from studio_platform.service import StudioService
from studio_platform.store import StudioStateStore


async def _build_service(tmp_path: Path) -> tuple[StudioService, StudioStateStore]:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()
    return service, store


@pytest.mark.asyncio
async def test_development_asset_delivery_secret_is_persisted_and_not_default(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    import studio_platform.service as service_module

    runtime_root = tmp_path / "runtime-root"
    custom_settings = Settings(
        _env_file=None,
        environment=Environment.DEVELOPMENT,
        studio_runtime_root=str(runtime_root),
    )
    monkeypatch.setattr(service_module, "get_settings", lambda: custom_settings)

    first_store = StudioStateStore(tmp_path / "first-state.json")
    second_store = StudioStateStore(tmp_path / "second-state.json")
    first_service = StudioService(first_store, ProviderRegistry(), tmp_path / "media-first")
    second_service = StudioService(second_store, ProviderRegistry(), tmp_path / "media-second")
    await first_service.initialize()
    await second_service.initialize()

    try:
        assert first_service._asset_token_secret == second_service._asset_token_secret
        assert first_service._asset_token_secret != reveal_secret(custom_settings.jwt_secret)
        assert (runtime_root / "config" / "asset-delivery-secret.txt").exists()
    finally:
        await first_service.shutdown()
        await second_service.shutdown()


async def _seed_identity_project_asset(
    store: StudioStateStore,
    *,
    identity_id: str = "user-1",
    plan: IdentityPlan = IdentityPlan.PRO,
    subscription_status: SubscriptionStatus | None = None,
    monthly_credits_remaining: int | None = None,
    monthly_credit_allowance: int | None = None,
    extra_credits: int = 0,
    temp_block_until=None,
    manual_review_state: ManualReviewState = ManualReviewState.NONE,
    owner_mode: bool = False,
    root_admin: bool = False,
    local_access: bool = False,
) -> tuple[OmniaIdentity, StudioWorkspace, Project, MediaAsset]:
    resolved_subscription_status = subscription_status
    if resolved_subscription_status is None:
        resolved_subscription_status = (
            SubscriptionStatus.NONE if plan == IdentityPlan.FREE else SubscriptionStatus.ACTIVE
        )
    identity = OmniaIdentity(
        id=identity_id,
        email=f"{identity_id}@example.com",
        display_name="Creator",
        username=identity_id,
        workspace_id=f"ws-{identity_id}",
        plan=plan,
        subscription_status=resolved_subscription_status,
        monthly_credits_remaining=60 if monthly_credits_remaining is None else monthly_credits_remaining,
        monthly_credit_allowance=60 if monthly_credit_allowance is None else monthly_credit_allowance,
        extra_credits=extra_credits,
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
async def test_create_generation_uses_server_authoritative_dimensions(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, project, _ = await _seed_identity_project_asset(
        store,
        plan=IdentityPlan.FREE,
        subscription_status=SubscriptionStatus.NONE,
        monthly_credits_remaining=0,
        monthly_credit_allowance=0,
        extra_credits=12,
    )

    try:
        job = await service.create_generation(
            identity_id=identity.id,
            project_id=project.id,
            prompt="editorial portrait",
            negative_prompt="",
            reference_asset_id=None,
            model_id="flux-schnell",
            width=1536,
            height=1536,
            steps=28,
            cfg_scale=6.5,
            seed=1,
            aspect_ratio="9:16",
            output_count=1,
        )

        assert job.prompt_snapshot.aspect_ratio == "9:16"
        assert job.prompt_snapshot.width == 576
        assert job.prompt_snapshot.height == 1024
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_generation_rejects_unsupported_aspect_ratio(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, project, _ = await _seed_identity_project_asset(store)

    try:
        with pytest.raises(ValueError, match="Unsupported aspect ratio"):
            await service.create_generation(
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
                seed=1,
                aspect_ratio="21:9",
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
    render_path = tmp_path / "asset-share.png"
    render_path.write_bytes(b"asset-share")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

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
    render_path = tmp_path / "legacy-asset-share.png"
    render_path.write_bytes(b"legacy-asset-share")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )
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
    render_path = tmp_path / "revoked-share-asset.png"
    render_path.write_bytes(b"revoked-share-asset")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

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
    render_path = tmp_path / "revoked-share-delivery.png"
    render_path.write_bytes(b"revoked-share-delivery")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

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
async def test_asset_delivery_token_hashes_legacy_public_share_scope(tmp_path: Path) -> None:
    service, _ = await _build_service(tmp_path)

    try:
        raw_share_token = "legacy-share-token-123456"
        token = service._create_asset_delivery_token(
            asset_id="asset-1",
            variant="content",
            identity_id=None,
            share_token=raw_share_token,
        )
        claims = jwt.decode(token, options={"verify_signature": False})

        assert claims.get("share_token") is None
        assert claims["share_token_hash"] == service._hash_share_public_token(raw_share_token)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_legacy_secret_signed_asset_token_still_resolves_delivery(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)
    render_path = tmp_path / "legacy-secret-signed-delivery.png"
    render_path.write_bytes(b"legacy-secret-signed-delivery")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

    try:
        token = jwt.encode(
            {
                "sub": "asset-delivery",
                "asset_id": asset.id,
                "variant": "content",
                "identity_id": identity.id,
                "share_id": None,
                "public_preview": False,
                "exp": utc_now() + timedelta(minutes=5),
                "iat": utc_now(),
            },
            service._legacy_asset_token_secret,
            algorithm="HS256",
        )

        delivery = await service.resolve_asset_delivery(asset.id, token, "content")

        assert delivery.local_path == render_path
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_hashed_legacy_share_scope_still_resolves_asset_delivery(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)
    render_path = tmp_path / "hashed-legacy-share-delivery.png"
    render_path.write_bytes(b"hashed-legacy-share-delivery")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

    try:
        raw_share_token = "legacy-share-token-123456"
        share = ShareLink(
            id="share-hashed-legacy",
            token="",
            token_hash=service._hash_share_public_token(raw_share_token),
            token_preview="legacy...3456",
            identity_id=identity.id,
            asset_id=asset.id,
        )
        await store.mutate(lambda state: state.shares.__setitem__(share.id, share))
        token = service._create_asset_delivery_token(
            asset_id=asset.id,
            variant="content",
            identity_id=None,
            share_token=raw_share_token,
        )

        delivery = await service.resolve_asset_delivery(asset.id, token, "content")

        assert delivery.local_path == render_path
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_legacy_secret_share_hash_still_resolves_asset_delivery(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)
    render_path = tmp_path / "legacy-secret-share-hash-delivery.png"
    render_path.write_bytes(b"legacy-secret-share-hash-delivery")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

    try:
        share, public_token = await service.create_share(identity.id, None, asset.id)
        legacy_hash = hash_share_token(public_token, secret=service._legacy_asset_token_secret)
        await store.mutate(
            lambda state: (
                setattr(state.shares[share.id], "token", ""),
                setattr(state.shares[share.id], "token_hash", legacy_hash),
            )
        )
        token = service._create_asset_delivery_token(
            asset_id=asset.id,
            variant="content",
            identity_id=None,
            share_token=public_token,
        )

        delivery = await service.resolve_asset_delivery(asset.id, token, "content")

        assert delivery.local_path == render_path
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_raw_legacy_share_scope_in_existing_asset_token_still_resolves_asset_delivery(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)
    render_path = tmp_path / "raw-legacy-share-delivery.png"
    render_path.write_bytes(b"raw-legacy-share-delivery")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

    try:
        raw_share_token = "legacy-share-token-abcdef"
        share = ShareLink(
            id="share-raw-legacy",
            token=raw_share_token,
            identity_id=identity.id,
            asset_id=asset.id,
        )
        await store.mutate(lambda state: state.shares.__setitem__(share.id, share))
        token = jwt.encode(
            {
                "sub": "asset-delivery",
                "asset_id": asset.id,
                "variant": "content",
                "identity_id": None,
                "share_id": None,
                "share_token": raw_share_token,
                "public_preview": False,
                "exp": utc_now() + timedelta(minutes=5),
                "iat": utc_now(),
            },
            service._asset_token_secret,
            algorithm="HS256",
        )

        with pytest.raises(PermissionError, match="missing scope"):
            await service.resolve_asset_delivery(asset.id, token, "content")
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_project_share_asset_token_fails_when_asset_becomes_blocked(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, project, asset = await _seed_identity_project_asset(store)
    render_path = tmp_path / "project-share-asset.png"
    render_path.write_bytes(b"project-share-asset")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

    try:
        share, _ = await service.create_share(identity.id, project.id, None)
        url = service.build_asset_delivery_url(asset.id, variant="content", share_id=share.id)
        token = parse_qs(urlparse(url).query)["token"][0]
        await store.mutate(
            lambda state: (
                state.assets[asset.id].metadata.__setitem__("protection_state", "blocked"),
                state.assets[asset.id].metadata.__setitem__("library_state", "blocked"),
            )
        )

        with pytest.raises(PermissionError):
            await service.resolve_asset_delivery(asset.id, token, "content")
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_share_rejects_ambiguous_target_selection(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, project, asset = await _seed_identity_project_asset(store)

    try:
        with pytest.raises(ValueError, match="exactly one"):
            await service.create_share(identity.id, project.id, asset.id)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_create_share_rejects_blocked_asset_target(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)
    await store.mutate(
        lambda state: (
            state.assets[asset.id].metadata.__setitem__("protection_state", "blocked"),
            state.assets[asset.id].metadata.__setitem__("library_state", "blocked"),
        )
    )

    try:
        with pytest.raises(PermissionError, match="ready, truthful assets"):
            await service.create_share(identity.id, None, asset.id)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_blocked_asset_share_public_lookup_returns_not_found(tmp_path: Path) -> None:
    service, store = await _build_service(tmp_path)
    identity, _, _, asset = await _seed_identity_project_asset(store)
    render_path = tmp_path / "blocked-asset-share.png"
    render_path.write_bytes(b"blocked-asset-share")
    await store.mutate(
        lambda state: (
            setattr(state.assets[asset.id], "local_path", str(render_path)),
            state.assets[asset.id].metadata.__setitem__("thumbnail_path", str(render_path)),
        )
    )

    try:
        share, raw_token = await service.create_share(identity.id, None, asset.id)
        await store.mutate(
            lambda state: (
                state.shares.__setitem__(share.id, share),
                state.assets[asset.id].metadata.__setitem__("protection_state", "blocked"),
                state.assets[asset.id].metadata.__setitem__("library_state", "blocked"),
            )
        )

        with pytest.raises(KeyError):
            await service.get_public_share(raw_token)
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
            "deleted_identity_tombstones": 0,
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
