from __future__ import annotations

from pathlib import Path
import hashlib
import hmac
import json

import httpx
import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.security.http import HTTPAuthorizationCredentials
from pydantic import SecretStr
from starlette.requests import Request as StarletteRequest

from config.env import Environment, get_settings
from observability.context import current_identity_id
import security.auth as auth_module
import studio_platform.router as router_module
from security.auth import (
    User,
    UserRole,
    create_user_tokens,
    extract_unverified_session_context,
    get_current_user,
    get_jwt_manager,
    refresh_access_token,
    setup_auth,
)
from security.rate_limit import InMemoryRateLimiter, RateLimitDecision
from security.supabase_auth import SupabaseAuthError, SupabaseAuthUnavailableError
from studio_platform.asset_storage import AssetStorageError, ResolvedAssetDelivery
from studio_platform.models import (
    IdentityPlan,
    MediaAsset,
    ModerationCase,
    ModerationCaseSource,
    ModerationCaseStatus,
    OmniaIdentity,
    Project,
    PublicPost,
    ShareLink,
    StudioWorkspace,
    SubscriptionStatus,
    Visibility,
    utc_now,
)
from studio_platform.models.identity import MARKETING_CONSENT_VERSION, PRIVACY_VERSION, TERMS_VERSION, USAGE_POLICY_VERSION
from studio_platform.providers import ProviderRegistry
from studio_platform.router import create_router
from studio_platform.service import StudioService
from studio_platform.store import SqliteStudioStateStore, StudioStateStore


async def _build_test_app(tmp_path: Path) -> tuple[FastAPI, StudioService, InMemoryRateLimiter]:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    rate_limiter = InMemoryRateLimiter()
    await rate_limiter.initialize()
    await service.initialize()

    app = FastAPI()
    app.state.studio_service = service
    app.state.rate_limiter = rate_limiter

    async def _current_user(request: Request) -> User | None:
        if request.headers.get("X-Test-Guest", "").strip().lower() in {"1", "true", "yes"}:
            return None
        user_id = request.headers.get("X-Test-User", "user-1")
        email = request.headers.get("X-Test-Email", f"{user_id}@example.com")
        username = request.headers.get("X-Test-Username", user_id)
        session_id = request.headers.get("X-Test-Session-Id", "session-current")
        auth_provider = request.headers.get("X-Test-Auth-Provider", "email")
        role_raw = request.headers.get("X-Test-Role", "user").strip().lower()
        role = UserRole.ADMIN if role_raw == "admin" else UserRole.USER
        return User(
            id=user_id,
            email=email,
            username=username,
            role=role,
            is_active=True,
            is_verified=True,
            metadata={
                "owner_mode": request.headers.get("X-Test-Owner-Mode", "").strip().lower() in {"1", "true", "yes"},
                "root_admin": request.headers.get("X-Test-Root-Admin", "").strip().lower() in {"1", "true", "yes"},
                "local_access": request.headers.get("X-Test-Local-Access", "").strip().lower() in {"1", "true", "yes"},
                "accepted_terms": True,
                "accepted_privacy": True,
                "accepted_usage_policy": True,
                "marketing_opt_in": False,
                "session_id": session_id,
                "auth_provider": auth_provider,
                "auth_providers": [auth_provider],
            },
        )

    app.dependency_overrides[router_module.get_current_user] = _current_user
    app.include_router(create_router(service, rate_limiter))
    return app, service, rate_limiter


@pytest.mark.asyncio
async def test_share_create_route_uses_hourly_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_create_share(identity_id: str, project_id: str | None, asset_id: str | None):
        return (
            ShareLink(id="share-1", token="", identity_id=identity_id, asset_id=asset_id, token_preview="abcd1234...ef90"),
            "rawsharetoken123",
        )

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.create_share = fake_create_share  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/shares",
            headers={"X-Test-User": "user-1"},
            json={"asset_id": "asset-1"},
        )

    try:
        assert response.status_code == 201
        assert any("shares:create" in key and limit == 12 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_share_route_uses_ip_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_get_public_share(token: str):
        return {"share": ShareLink(id="share-1", token="", identity_id="user-1", asset_id="asset-1", token_preview="abcd...1234").model_dump(mode="json")}

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.get_public_share = fake_get_public_share  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/shares/public/sharetoken")

    try:
        assert response.status_code == 200
        assert any("shares:public:ip" in key and limit == 60 for key, limit, _ in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_share_route_redacts_internal_project_and_asset_ids(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    render_path = tmp_path / "public-share-safe.png"
    render_path.write_bytes(b"public-share-safe")
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Editorial Share",
        description="Launch-safe shared project",
    )
    asset = MediaAsset(
        id="asset-share-safe",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Shared asset",
        prompt="cinematic editorial portrait with dramatic rim light",
        url="stored",
        local_path=str(render_path),
        metadata={"thumbnail_path": str(render_path)},
    )
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
        )
    )
    _, public_token = await service.create_share(identity.id, project.id, None)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/v1/shares/public/{public_token}")

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["project"]["title"] == "Editorial Share"
        assert "identity_id" not in payload["project"]
        assert "workspace_id" not in payload["project"]
        assert "system_managed" not in payload["project"]
        assert "last_generation_id" not in payload["project"]
        assert payload["assets"]
        asset_payload = payload["assets"][0]
        assert "identity_id" not in asset_payload
        assert "workspace_id" not in asset_payload
        assert "project_id" not in asset_payload
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_share_route_returns_not_found_for_trashed_asset_share(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Editorial",
    )
    asset = MediaAsset(
        id="asset-trashed",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Trashed asset",
        prompt="cinematic portrait",
        url="stored",
        metadata={},
        deleted_at=utc_now(),
    )
    share = ShareLink(id="share-trashed", token="sharetoken123456", identity_id=identity.id, asset_id=asset.id)
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
            state.shares.__setitem__(share.id, share),
        )
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/v1/shares/public/{share.token}")

    try:
        assert response.status_code == 404
        assert response.json() == {"detail": "Share not found"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_share_route_returns_not_found_for_deleted_project_share(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    render_path = tmp_path / "project-share.png"
    render_path.write_bytes(b"project-share")
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Editorial",
    )
    asset = MediaAsset(
        id="asset-project",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Project asset",
        prompt="cinematic portrait",
        url="stored",
        local_path=str(render_path),
        metadata={},
    )
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
        )
    )
    share, public_token = await service.create_share(identity.id, project.id, None)
    await service.store.mutate(
        lambda state: (
            state.projects.pop(project.id, None),
            state.shares.__setitem__(share.id, share),
        )
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/v1/shares/public/{public_token}")

    try:
        assert response.status_code == 404
        assert response.json() == {"detail": "Share not found"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_share_route_returns_not_found_when_project_assets_are_ineligible(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    render_path = tmp_path / "blocked-project-share.png"
    render_path.write_bytes(b"blocked-project-share")
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Editorial",
    )
    blocked_asset = MediaAsset(
        id="asset-blocked",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Blocked asset",
        prompt="cinematic portrait",
        url="stored",
        local_path=str(render_path),
        metadata={"protection_state": "blocked", "library_state": "blocked"},
    )
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(blocked_asset.id, blocked_asset),
        )
    )
    share = ShareLink(id="share-blocked-project", token="shareblockedproject123", identity_id=identity.id, project_id=project.id)
    await service.store.mutate(lambda state: state.shares.__setitem__(share.id, share))

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/v1/shares/public/{share.token}")

    try:
        assert response.status_code == 404
        assert response.json() == {"detail": "Share not found"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_share_route_returns_not_found_when_owner_loses_share_entitlement(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    render_path = tmp_path / "downgraded-project-share.png"
    render_path.write_bytes(b"downgraded-project-share")
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.CANCELED,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Editorial",
    )
    asset = MediaAsset(
        id="asset-project",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Project asset",
        prompt="cinematic portrait",
        url="stored",
        local_path=str(render_path),
        metadata={},
    )
    share = ShareLink(id="share-downgraded", token="sharedowngraded123456", identity_id=identity.id, asset_id=asset.id)
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
            state.shares.__setitem__(share.id, share),
        )
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/v1/shares/public/{share.token}")

    try:
        assert response.status_code == 404
        assert response.json() == {"detail": "Share not found"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_asset_content_route_rejects_revoked_public_share_token(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    render_path = tmp_path / "revoked-share-asset.png"
    render_path.write_bytes(b"revoked-share-asset")
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Editorial",
    )
    asset = MediaAsset(
        id="asset-share",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Shared asset",
        prompt="cinematic portrait",
        url="stored",
        local_path=str(render_path),
        metadata={},
    )
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
        )
    )
    share, public_token = await service.create_share(identity.id, None, asset.id)
    await service.store.mutate(lambda state: setattr(state.shares[share.id], "revoked_at", utc_now()))
    delivery_token = service._create_asset_delivery_token(
        asset_id=asset.id,
        variant="content",
        identity_id=None,
        share_token=public_token,
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/v1/assets/{asset.id}/content?token={delivery_token}")

    try:
        assert response.status_code == 403
        assert response.json() == {"detail": "Share access denied"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_like_routes_reject_hidden_public_posts_without_mutating_likes(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    hidden_identity = OmniaIdentity(
        id="hidden-owner",
        email="hidden-owner@example.com",
        display_name="Hidden Owner",
        username="codex-hidden",
        plan=IdentityPlan.PRO,
        workspace_id="ws-hidden",
    )
    viewer_identity = OmniaIdentity(
        id="viewer-1",
        email="viewer-1@example.com",
        display_name="Viewer One",
        username="viewer1",
        plan=IdentityPlan.PRO,
        workspace_id="ws-viewer",
    )
    post = PublicPost(
        id="post-hidden",
        workspace_id=hidden_identity.workspace_id,
        project_id="project-hidden",
        identity_id=hidden_identity.id,
        owner_username=hidden_identity.username,
        owner_display_name=hidden_identity.display_name,
        title="Hidden Editorial",
        prompt="cinematic portrait lighting",
        cover_asset_id="asset-hidden",
        asset_ids=["asset-hidden"],
        visibility=Visibility.PUBLIC,
        liked_by=["seed-like"],
    )
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(hidden_identity.id, hidden_identity),
            state.identities.__setitem__(viewer_identity.id, viewer_identity),
            state.posts.__setitem__(post.id, post),
        )
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        like_response = await client.post("/v1/posts/post-hidden/like", headers={"X-Test-User": viewer_identity.id})
        unlike_response = await client.delete("/v1/posts/post-hidden/like", headers={"X-Test-User": viewer_identity.id})

    try:
        assert like_response.status_code == 403
        assert unlike_response.status_code == 403
        persisted_post = await service.store.get_model("posts", "post-hidden", PublicPost)
        assert persisted_post is not None
        assert persisted_post.liked_by == ["seed-like"]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_posts_route_redacts_internal_project_and_asset_ids(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    render_path = tmp_path / "public-post-safe.png"
    render_path.write_bytes(b"public-post-safe")
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    project = Project(
        id="project-1",
        workspace_id=workspace.id,
        identity_id=identity.id,
        title="Editorial Project",
    )
    asset = MediaAsset(
        id="asset-public-safe",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Editorial Portrait",
        prompt="cinematic editorial portrait with warm key light",
        url="stored",
        local_path=str(render_path),
        metadata={"thumbnail_path": str(render_path)},
    )
    post = PublicPost(
        id="post-public-safe",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        owner_username=identity.username or "userone",
        owner_display_name=identity.display_name,
        title="Editorial Portrait",
        prompt="cinematic editorial portrait with warm key light",
        cover_asset_id=asset.id,
        asset_ids=[asset.id],
        visibility=Visibility.PUBLIC,
    )
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(asset.id, asset),
            state.posts.__setitem__(post.id, post),
        )
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/public/posts")

    try:
        assert response.status_code == 200
        payload = response.json()["posts"][0]
        assert payload["project_id"] is None
        assert payload["cover_asset"] is not None
        assert "identity_id" not in payload["cover_asset"]
        assert "workspace_id" not in payload["cover_asset"]
        assert "project_id" not in payload["cover_asset"]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_asset_content_route_uses_ip_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_resolve_asset_delivery(asset_id: str, token: str, variant: str) -> ResolvedAssetDelivery:
        return ResolvedAssetDelivery(filename="asset.png", media_type="image/png", content=b"png")

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.resolve_asset_delivery = fake_resolve_asset_delivery  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/assets/asset-1/content?token=abcdefghijklmnop")

    try:
        assert response.status_code == 200
        assert any("assets:content:ip" in key and limit == 120 for key, limit, _ in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_asset_content_route_uses_forwarded_ip_for_trusted_proxy_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_resolve_asset_delivery(asset_id: str, token: str, variant: str) -> ResolvedAssetDelivery:
        return ResolvedAssetDelivery(filename="asset.png", media_type="image/png", content=b"png")

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.resolve_asset_delivery = fake_resolve_asset_delivery  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app, client=("127.0.0.1", 40123))
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/assets/asset-1/content?token=abcdefghijklmnop",
            headers={"x-forwarded-for": "198.51.100.44, 10.0.0.2"},
        )

    try:
        assert response.status_code == 200
        assert any(key == "assets:content:ip:198.51.100.44" and limit == 120 for key, limit, _ in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_asset_content_route_surfaces_storage_unavailable_without_crashing(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def fake_resolve_asset_delivery(asset_id: str, token: str, variant: str):
        raise AssetStorageError("remote storage auth failed")

    service.resolve_asset_delivery = fake_resolve_asset_delivery  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/assets/asset-1/content?token=abcdefghijklmnop")

    try:
        assert response.status_code == 503
        assert response.json() == {"detail": "Asset storage unavailable"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_permanent_delete_asset_surfaces_storage_unavailable_without_crashing(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def fake_permanently_delete_asset(identity_id: str, asset_id: str):
        raise AssetStorageError("remote storage auth failed")

    service.permanently_delete_asset = fake_permanently_delete_asset  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.delete("/v1/assets/asset-1/permanent", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 503
        assert response.json() == {"detail": "Asset storage unavailable"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_assets_route_lists_ready_assets_without_clean_export_crash(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    identity = OmniaIdentity(
        id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
        plan=IdentityPlan.PRO,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )
    project = await service.create_project(identity.id, "Editorial", "Editorial project")
    asset = MediaAsset(
        id="asset-1",
        workspace_id=workspace.id,
        project_id=project.id,
        identity_id=identity.id,
        title="Ready asset",
        prompt="cinematic portrait",
        url="stored",
        metadata={"library_state": "ready", "display_title": "Ready asset"},
    )
    await service.store.save_model("assets", asset)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/assets", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 200
        payload = response.json()["assets"][0]
        assert payload["id"] == "asset-1"
        assert payload["library_state"] == "ready"
        assert "can_export_clean" in payload
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_assets_route_bootstraps_identity_and_returns_empty_payload(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/assets", headers={"X-Test-User": "fresh-user"})

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload == {"assets": [], "total": 0, "offset": 0, "limit": 80}
        identity = await service.get_identity("fresh-user")
        assert identity.email == "fresh-user@example.com"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_health_detail_allows_configured_owner_email_after_identity_bootstrap(tmp_path: Path) -> None:
    settings = get_settings()
    original_owner_email = settings.studio_owner_email
    original_owner_emails = settings.studio_owner_emails
    original_root_admin_emails = settings.studio_root_admin_emails
    settings.studio_owner_email = ""
    settings.studio_owner_emails = "owner@example.com"
    settings.studio_root_admin_emails = "owner@example.com"
    app = None
    service = None

    try:
        app, service, _ = await _build_test_app(tmp_path)

        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get(
                "/v1/healthz/detail",
                headers={
                    "X-Test-User": "owner-1",
                    "X-Test-Email": "owner@example.com",
                    "X-Test-Username": "owner",
                },
            )

        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] in {"healthy", "degraded", "blocked"}
    finally:
        settings.studio_owner_email = original_owner_email
        settings.studio_owner_emails = original_owner_emails
        settings.studio_root_admin_emails = original_root_admin_emails
        if service is not None:
            await service.shutdown()


@pytest.mark.asyncio
async def test_projects_route_hides_system_managed_drafts(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    visible_project = await service.create_project("user-1", "Campaign", "Visible project")
    await service.create_project(
        "user-1",
        "Draft project",
        "Hidden draft",
        surface="compose",
        system_managed=True,
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/projects", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 200
        projects = response.json()["projects"]
        assert [project["id"] for project in projects] == [visible_project.id]
        assert all(project.get("system_managed") is False for project in projects)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_settings_bootstrap_route_returns_signed_in_shell_payload(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/settings/bootstrap",
            headers={
                "X-Test-User": "bootstrap-user",
                "X-Test-Session-Id": "session-bootstrap",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36",
                "X-Omnia-Client-Display-Mode": "browser",
            },
        )

    try:
        assert response.status_code == 200
        payload = response.json()
        assert set(payload.keys()) >= {"identity", "entitlements", "plans", "models", "presets", "draft_projects", "styles", "prompt_memory", "active_sessions"}
        assert set(payload["draft_projects"].keys()) == {"compose", "chat"}
        assert set(payload["styles"].keys()) == {"catalog", "my_styles", "favorites"}
        assert payload["prompt_memory"]["identity_id"] == "bootstrap-user"
        assert payload["active_sessions"]["current_session_id"] == "session-bootstrap"
        assert payload["active_sessions"]["session_count"] == 1
        assert payload["active_sessions"]["sessions"][0]["device_label"] == "Chrome on Windows"
        assert payload["active_sessions"]["sessions"][0]["current"] is True
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_end_other_settings_sessions_keeps_current_device_and_revokes_the_rest(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.record_access_session(
        identity_id="user-1",
        session_id="session-current",
        auth_provider="email",
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36",
        client_ip="127.0.0.1",
        host_label="127.0.0.1:5173",
        display_mode="browser",
    )
    await service.record_access_session(
        identity_id="user-1",
        session_id="session-other",
        auth_provider="google",
        user_agent="Mozilla/5.0 (Linux; Android 14) Chrome/123.0.0.0 Mobile Safari/537.36",
        client_ip="95.10.11.12",
        host_label="studio.omniacreata.com",
        display_mode="standalone",
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/settings/sessions/end-others",
            headers={
                "X-Test-User": "user-1",
                "X-Test-Session-Id": "session-current",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36",
                "X-Omnia-Client-Display-Mode": "browser",
            },
        )

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["current_session_id"] == "session-current"
        assert payload["session_count"] == 1
        assert payload["other_session_count"] == 0
        assert payload["can_sign_out_others"] is False
        assert [item["session_id"] for item in payload["sessions"]] == ["session-current"]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_auth_me_route_returns_guest_payload_without_session(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/auth/me", headers={"X-Test-Guest": "true"})

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["guest"] is True
        assert payload["identity"]["id"] == "guest"
        assert "entitlements" in payload
        assert "max_resolution" not in payload["plan"]
        assert "max_resolution" not in payload["usage_caps"]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_auth_me_route_rejects_invalid_or_expired_session_when_auth_header_present(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/auth/me",
            headers={
                "X-Test-Guest": "true",
                "Authorization": "Bearer expired-token",
            },
        )

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "Invalid or expired session"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_auth_me_route_bootstraps_identity_for_authenticated_user(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/auth/me", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["guest"] is False
        assert payload["identity"]["id"] == "user-1"
        assert "entitlements" in payload
        assert "max_resolution" not in payload["plan"]
        assert "max_resolution" not in payload["usage_caps"]
        identity = await service.get_identity("user-1")
        assert identity.username == "user-1"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_get_current_user_includes_session_context_for_local_jwt_tokens() -> None:
    setup_auth()
    token_payload = create_user_tokens(
        User(
            id="session-user",
            email="session-user@example.com",
            username="Session User",
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            metadata={"owner_mode": False},
        )
    )
    request = StarletteRequest(
        {
            "type": "http",
            "method": "GET",
            "path": "/v1/auth/me",
            "headers": [],
            "query_string": b"",
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
        }
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token_payload["access_token"])

    user = await get_current_user(request, credentials)

    assert user is not None
    assert user.metadata["session_id"]
    assert user.metadata["session_issued_at"] is not None
    assert user.metadata["session_expires_at"] is not None
    assert current_identity_id() == "session-user"
    assert request.state.identity_id == "session-user"


@pytest.mark.asyncio
async def test_get_current_user_logs_token_fingerprint_without_bearer_preview(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    setup_auth()
    captured: dict[str, object] = {}

    class _RejectingSupabaseClient:
        async def get_user(self, access_token: str) -> dict[str, str]:
            raise SupabaseAuthError("invalid token")

    def fake_debug(message: str, *args, **kwargs) -> None:
        captured["message"] = message
        captured["extra"] = kwargs.get("extra", {})

    secret_token = "sk-or-v1-secret-token-1234567890"
    monkeypatch.setattr(auth_module, "get_supabase_auth_client", lambda: _RejectingSupabaseClient())
    monkeypatch.setattr(auth_module.logger, "debug", fake_debug)
    request = StarletteRequest(
        {
            "type": "http",
            "method": "GET",
            "path": "/v1/auth/me",
            "headers": [],
            "query_string": b"",
            "client": ("127.0.0.1", 12345),
            "server": ("testserver", 80),
            "scheme": "http",
        }
    )
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=secret_token)

    user = await get_current_user(request, credentials)

    assert user is None
    assert captured["message"] == "auth_supabase_token_rejected"
    extra = captured["extra"]
    assert isinstance(extra, dict)
    assert "token_preview" not in extra
    assert extra["token_fingerprint"] == hashlib.sha256(secret_token.encode("utf-8")).hexdigest()[:16]
    assert secret_token not in repr(extra)


def test_create_user_tokens_share_one_session_family_across_access_and_refresh_tokens() -> None:
    setup_auth()
    token_payload = create_user_tokens(
        User(
            id="family-user",
            email="family-user@example.com",
            username="Family User",
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            metadata={"owner_mode": False},
        )
    )

    access_context = extract_unverified_session_context(token_payload["access_token"])
    refresh_context = extract_unverified_session_context(token_payload["refresh_token"])

    assert access_context["session_id"]
    assert access_context["session_id"] == refresh_context["session_id"]


def test_blacklisting_access_token_revokes_the_related_refresh_token_family() -> None:
    setup_auth()
    token_payload = create_user_tokens(
        User(
            id="family-revoked-user",
            email="family-revoked-user@example.com",
            username="Family Revoked User",
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            metadata={"owner_mode": False},
        )
    )
    get_jwt_manager().blacklist_token(token_payload["access_token"])

    with pytest.raises(HTTPException) as exc_info:
        refresh_access_token(token_payload["refresh_token"])

    assert exc_info.value.detail == "Token has been revoked"


def test_refresh_access_token_preserves_session_context() -> None:
    setup_auth()
    token_payload = create_user_tokens(
        User(
            id="refresh-user",
            email="refresh-user@example.com",
            username="Refresh User",
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            metadata={"owner_mode": False, "local_access": True},
        )
    )

    refreshed_access_token = refresh_access_token(token_payload["refresh_token"])
    refresh_context = extract_unverified_session_context(token_payload["refresh_token"])
    refreshed_context = extract_unverified_session_context(refreshed_access_token)

    assert refreshed_context["session_id"] == refresh_context["session_id"]


@pytest.mark.asyncio
async def test_get_current_user_rejects_persistently_revoked_session_from_shared_sqlite_store(
    tmp_path: Path,
) -> None:
    setup_auth()
    db_path = tmp_path / "studio-state.sqlite3"
    first_service = StudioService(SqliteStudioStateStore(db_path), ProviderRegistry(), tmp_path / "media-first")
    second_service = StudioService(SqliteStudioStateStore(db_path), ProviderRegistry(), tmp_path / "media-second")
    await first_service.initialize()
    await second_service.initialize()

    token_payload = create_user_tokens(
        User(
            id="revoked-user",
            email="revoked-user@example.com",
            username="Revoked User",
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            metadata={"owner_mode": False},
        )
    )
    session_context = first_service.get_access_session_context_from_token(token_payload["access_token"])

    try:
        await first_service.record_access_session(
            identity_id="revoked-user",
            session_id=session_context["session_id"],
            auth_provider="email",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/123.0.0.0 Safari/537.36",
            client_ip="127.0.0.1",
            host_label="127.0.0.1:5173",
            display_mode="browser",
            token_issued_at=session_context["issued_at"],
            token_expires_at=session_context["expires_at"],
        )
        await first_service.revoke_other_access_sessions(
            identity_id="revoked-user",
            current_session_id="different-session",
            reason="user_requested_sign_out_others",
        )

        app = FastAPI()
        app.state.studio_service = second_service
        request = StarletteRequest(
            {
                "type": "http",
                "method": "GET",
                "path": "/v1/auth/me",
                "headers": [],
                "query_string": b"",
                "client": ("127.0.0.1", 12345),
                "server": ("testserver", 80),
                "scheme": "http",
                "app": app,
            }
        )
        credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token_payload["access_token"])

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(request, credentials)
        assert exc_info.value.detail == "Session has been revoked"
    finally:
        await first_service.shutdown()
        await second_service.shutdown()


@pytest.mark.asyncio
async def test_auth_me_route_rejects_tombstoned_authenticated_session(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/auth/me", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_settings_bootstrap_route_rejects_tombstoned_authenticated_session(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/settings/bootstrap", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_projects_route_rejects_tombstoned_authenticated_session(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/projects", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_assets_route_rejects_tombstoned_authenticated_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("list_assets should not run for tombstoned sessions")

    monkeypatch.setattr(service, "list_assets", fail_if_called)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/assets", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_prompt_improve_route_rejects_tombstoned_authenticated_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("improve_generation_prompt should not run for tombstoned sessions")

    monkeypatch.setattr(service, "improve_generation_prompt", fail_if_called)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/prompts/improve",
            headers={"X-Test-User": "user-1"},
            json={"prompt": "cinematic portrait"},
        )

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generations_route_rejects_tombstoned_authenticated_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("list_generations should not run for tombstoned sessions")

    monkeypatch.setattr(service, "list_generations", fail_if_called)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/generations", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_share_create_route_rejects_tombstoned_authenticated_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("create_share should not run for tombstoned sessions")

    monkeypatch.setattr(service, "create_share", fail_if_called)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/shares",
            headers={"X-Test-User": "user-1"},
            json={"asset_id": "asset-1"},
        )

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_clean_export_route_rejects_tombstoned_authenticated_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user-1@example.com",
        display_name="User One",
        username="user-1",
    )
    await service.permanently_delete_identity("user-1")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("resolve_clean_asset_export should not run for tombstoned sessions")

    monkeypatch.setattr(service, "resolve_clean_asset_export", fail_if_called)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/assets/asset-1/clean-export",
            headers={"X-Test-User": "user-1"},
        )

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_profile_route_hides_private_usage_and_visibility_defaults(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/profiles/userone", headers={"X-Test-Guest": "true"})

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["own_profile"] is False
        assert payload["can_edit"] is False
        assert payload["profile"]["usage_summary"] is None
        assert payload["profile"]["default_visibility"] is None
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_profile_route_uses_explicit_rate_limits_and_limit_param(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []
    captured: dict[str, object] = {}

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_get_profile_payload(*, identity_id=None, username=None, viewer_identity_id=None, limit=None) -> dict:
        captured.update(
            {
                "identity_id": identity_id,
                "username": username,
                "viewer_identity_id": viewer_identity_id,
                "limit": limit,
            }
        )
        return {"profile": {"username": username}, "posts": [], "own_profile": False, "can_edit": False}

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.get_profile_payload = fake_get_profile_payload  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/profiles/userone?limit=15",
            headers={"X-Test-User": "user-1"},
        )

    try:
        assert response.status_code == 200
        assert captured == {
            "identity_id": None,
            "username": "userone",
            "viewer_identity_id": "user-1",
            "limit": 15,
        }
        assert any("profiles:public:ip" in key and limit == 90 and window == 60 for key, limit, window in calls)
        assert any("profiles:public:user" in key and limit == 240 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_posts_route_uses_explicit_rate_limits_and_limit_param(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []
    captured: dict[str, object] = {}

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_list_public_posts(*, sort: str, viewer_identity_id: str | None, limit: int | None = None):
        captured.update({"sort": sort, "viewer_identity_id": viewer_identity_id, "limit": limit})
        return []

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.list_public_posts = fake_list_public_posts  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/public/posts?sort=top&limit=12",
            headers={"X-Test-User": "user-1"},
        )

    try:
        assert response.status_code == 200
        assert captured == {"sort": "top", "viewer_identity_id": "user-1", "limit": 12}
        assert any("public:posts:ip" in key and limit == 90 and window == 60 for key, limit, window in calls)
        assert any("public:posts:user" in key and limit == 240 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_healthz_detail_route_requires_owner_mode_and_returns_truth_payload(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="owner-1",
        email="owner@example.com",
        display_name="Owner One",
        username="owner-1",
        owner_mode=True,
        local_access=True,
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        denied = await client.get("/v1/healthz/detail", headers={"X-Test-User": "user-1"})
        allowed = await client.get("/v1/healthz/detail", headers={"X-Test-User": "owner-1"})

    try:
        assert denied.status_code == 403
        assert allowed.status_code == 200
        payload = allowed.json()
        assert "launch_gate" in payload
        assert "provider_truth" in payload
        assert "truth_sync" in payload
        assert "runtime_topology" in payload
        assert "ai_control_plane" in payload
        assert "feature_flags" in payload
        assert "circuit_breakers" in payload
        assert "providers" in payload["circuit_breakers"]
        assert isinstance(payload["feature_flags"], dict)
        assert isinstance(payload["circuit_breakers"]["providers"], dict)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_healthz_ready_and_startup_routes_report_initialized_runtime(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        ready_response = await client.get("/v1/healthz/ready")
        startup_response = await client.get("/v1/healthz/startup")

    try:
        assert ready_response.status_code == 200
        assert ready_response.json()["ready"] is True
        assert startup_response.status_code == 200
        assert startup_response.json()["started"] is True
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_healthz_ready_and_startup_routes_fail_when_service_is_not_initialized(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    service._initialized = False

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        ready_response = await client.get("/v1/healthz/ready")
        startup_response = await client.get("/v1/healthz/startup")

    try:
        assert ready_response.status_code == 503
        assert ready_response.json()["ready"] is False
        assert startup_response.status_code == 503
        assert startup_response.json()["started"] is False
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_healthz_detail_route_rejects_tombstoned_owner_session(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="owner-1",
        email="owner@example.com",
        display_name="Owner One",
        username="owner-1",
        owner_mode=True,
        local_access=True,
    )
    await service.permanently_delete_identity("owner-1")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/healthz/detail", headers={"X-Test-User": "owner-1"})

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_healthz_detail_route_rejects_header_only_owner_claim_and_keeps_identity_unprivileged(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/healthz/detail",
            headers={"X-Test-User": "user-1", "X-Test-Owner-Mode": "true"},
        )

    try:
        assert response.status_code == 403
        identity = await service.get_identity("user-1")
        assert identity.owner_mode is False
        assert identity.root_admin is False
        assert identity.local_access is False
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_profiles_export_and_delete_routes_round_trip_safely(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        export_response = await client.get("/v1/profiles/me/export", headers={"X-Test-User": "user-1"})
        delete_response = await client.delete("/v1/profiles/me", headers={"X-Test-User": "user-1"})

    try:
        assert export_response.status_code == 200
        export_payload = export_response.json()
        assert export_payload["identity"]["id"] == "user-1"
        assert "assets" in export_payload
        assert delete_response.status_code == 200
        snapshot = await service.store.snapshot()
        assert "user-1" not in snapshot.identities
        assert "user-1" in snapshot.deleted_identity_tombstones
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_clean_export_route_uses_user_and_ip_rate_limits(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_resolve_clean_asset_export(asset_id: str, identity_id: str) -> ResolvedAssetDelivery:
        return ResolvedAssetDelivery(filename="asset.png", media_type="image/png", content=b"png")

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.resolve_clean_asset_export = fake_resolve_clean_asset_export  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/assets/asset-1/clean-export",
            headers={"X-Test-User": "user-1"},
        )

    try:
        assert response.status_code == 200
        limits = sorted(limit for _, limit, _ in calls)
        assert limits == [24, 30]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_admin_telemetry_route_requires_root_admin_and_returns_summary(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="owner-1",
        email="owner@example.com",
        display_name="Owner One",
        username="owner-1",
        owner_mode=True,
        local_access=True,
    )
    await service.ensure_identity(
        user_id="root-1",
        email="root@example.com",
        display_name="Root One",
        username="root-1",
        owner_mode=True,
        root_admin=True,
        local_access=True,
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        denied = await client.get("/v1/admin/telemetry", headers={"X-Test-User": "owner-1"})
        allowed = await client.get("/v1/admin/telemetry", headers={"X-Test-User": "root-1"})

    try:
        assert denied.status_code == 403
        assert denied.json() == {"detail": "Root Administrator Required"}
        assert allowed.status_code == 200
        payload = allowed.json()
        assert payload["status"] == "OK"
        assert "telemetry" in payload
        assert "event_count" in payload["telemetry"]
        assert payload["total_identities"] >= 1
        assert payload["blocked_injections"] is None
        assert payload["blocked_injections_status"] == "unavailable"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_admin_telemetry_route_rejects_header_only_root_admin_claim(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/admin/telemetry",
            headers={
                "X-Test-User": "root-1",
                "X-Test-Owner-Mode": "true",
                "X-Test-Root-Admin": "true",
            },
        )

    try:
        assert response.status_code == 403
        identity = await service.get_identity("root-1")
        assert identity.owner_mode is False
        assert identity.root_admin is False
        assert identity.local_access is False
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_billing_checkout_route_refuses_demo_activation_outside_development(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_checkout_url = settings.paddle_checkout_base_url
    settings.environment = Environment.STAGING
    settings.paddle_checkout_base_url = None

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/billing/checkout",
                headers={"X-Test-User": "checkout-user"},
                json={"kind": "pro_monthly"},
            )

        assert response.status_code == 503
        assert response.json() == {"detail": "Billing checkout is not configured for this environment"}
    finally:
        settings.environment = original_environment
        settings.paddle_checkout_base_url = original_checkout_url
        await service.shutdown()


@pytest.mark.asyncio
async def test_billing_summary_route_rejects_tombstoned_authenticated_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="billing-user",
        email="billing-user@example.com",
        display_name="Billing User",
        username="billing-user",
    )
    await service.permanently_delete_identity("billing-user")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("billing_summary should not run for tombstoned sessions")

    monkeypatch.setattr(service, "billing_summary", fail_if_called)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/billing/summary", headers={"X-Test-User": "billing-user"})

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_billing_checkout_route_rejects_tombstoned_authenticated_session(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    await service.ensure_identity(
        user_id="billing-user",
        email="billing-user@example.com",
        display_name="Billing User",
        username="billing-user",
    )
    await service.permanently_delete_identity("billing-user")

    async def fail_if_called(*args, **kwargs):
        raise AssertionError("checkout should not run for tombstoned sessions")

    monkeypatch.setattr(service, "checkout", fail_if_called)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/billing/checkout",
            headers={"X-Test-User": "billing-user"},
            json={"kind": "pro_monthly"},
        )

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_demo_login_refuses_pro_plan_outside_development(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enable_demo_auth = settings.enable_demo_auth
    settings.environment = Environment.STAGING
    settings.enable_demo_auth = True

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/demo-login",
                json={
                    "email": "demo@example.com",
                    "display_name": "Demo User",
                    "plan": "pro",
                },
            )

        assert response.status_code == 403
        assert response.json() == {"detail": "Demo login is only available in local development."}
    finally:
        settings.environment = original_environment
        settings.enable_demo_auth = original_enable_demo_auth
        await service.shutdown()


@pytest.mark.asyncio
async def test_demo_login_refuses_even_free_plan_outside_development(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enable_demo_auth = settings.enable_demo_auth
    settings.environment = Environment.STAGING
    settings.enable_demo_auth = True

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/demo-login",
                json={
                    "email": "demo@example.com",
                    "display_name": "Demo User",
                    "plan": "free",
                },
            )

        assert response.status_code == 403
        assert response.json() == {"detail": "Demo login is only available in local development."}
    finally:
        settings.environment = original_environment
        settings.enable_demo_auth = original_enable_demo_auth
        await service.shutdown()


@pytest.mark.asyncio
async def test_signup_requires_captcha_token_when_verification_is_enabled(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    signup_calls: list[str] = []

    class FakeSession:
        access_token = "access-token"
        refresh_token = "refresh-token"
        token_type = "bearer"

        def __init__(self, email: str):
            self.user = {
                "id": "user-signup",
                "email": email,
                "user_metadata": {
                    "display_name": "Signup User",
                    "username": "signup-user",
                    "accepted_terms": True,
                    "accepted_privacy": True,
                    "accepted_usage_policy": True,
                    "marketing_opt_in": False,
                },
            }

    class FakeSupabaseAuthClient:
        async def sign_up(self, **kwargs):
            signup_calls.append(str(kwargs.get("email") or ""))
            return FakeSession(str(kwargs.get("email") or "signup@example.com"))

    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/signup",
                json={
                    "email": "signup@example.com",
                    "password": "Password123!",
                    "display_name": "Signup User",
                    "username": "signup-user",
                    "accepted_terms": True,
                    "accepted_privacy": True,
                    "accepted_usage_policy": True,
                    "marketing_opt_in": False,
                },
            )

        assert response.status_code == 400
        assert response.json() == {"detail": "Complete CAPTCHA verification to continue."}
        assert signup_calls == []
    finally:
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        await service.shutdown()


@pytest.mark.asyncio
async def test_signup_fails_closed_when_launch_env_captcha_is_not_ready(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    signup_calls: list[str] = []

    class FakeSupabaseAuthClient:
        async def sign_up(self, **kwargs):
            signup_calls.append(str(kwargs.get("email") or ""))
            raise AssertionError("sign_up should not be called when CAPTCHA is not launch-ready")

    settings.environment = Environment.STAGING
    settings.captcha_verification_enabled = False
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = None
    settings.turnstile_secret_key = None
    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/signup",
                json={
                    "email": "signup@example.com",
                    "password": "Password123!",
                    "display_name": "Signup User",
                    "username": "signup-user",
                    "accepted_terms": True,
                    "accepted_privacy": True,
                    "accepted_usage_policy": True,
                    "marketing_opt_in": False,
                },
            )

        assert response.status_code == 503
        assert response.json() == {
            "detail": "CAPTCHA verification is required for this environment but is not configured correctly."
        }
        assert signup_calls == []
    finally:
        settings.environment = original_environment
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        await service.shutdown()


@pytest.mark.asyncio
async def test_login_accepts_verified_captcha_token_when_verification_is_enabled(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    login_calls: list[str] = []
    captcha_calls: list[dict[str, str | None]] = []

    class FakeSession:
        access_token = "access-token"
        refresh_token = "refresh-token"
        token_type = "bearer"

        def __init__(self, email: str):
            self.user = {
                "id": "user-login",
                "email": email,
                "user_metadata": {
                    "display_name": "Login User",
                    "username": "login-user",
                    "accepted_terms": True,
                    "accepted_privacy": True,
                    "accepted_usage_policy": True,
                    "marketing_opt_in": False,
                },
            }

    class FakeSupabaseAuthClient:
        async def sign_in(self, **kwargs):
            login_calls.append(str(kwargs.get("email") or ""))
            return FakeSession(str(kwargs.get("email") or "login@example.com"))

    async def fake_verify_captcha_token(token, *, remote_ip=None, action=None, settings=None, transport=None):
        captcha_calls.append(
            {
                "token": str(token or ""),
                "remote_ip": remote_ip,
                "action": action,
            }
        )
        return {"success": True, "action": action, "hostname": "127.0.0.1"}

    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())
    monkeypatch.setattr(router_module, "verify_captcha_token", fake_verify_captcha_token)

    transport = httpx.ASGITransport(app=app)
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/login",
                json={
                    "email": "login@example.com",
                    "password": "Password123!",
                    "captcha_token": "turnstile-token",
                },
            )

        assert response.status_code == 200
        assert login_calls == ["login@example.com"]
        assert captcha_calls == [
            {
                "token": "turnstile-token",
                "remote_ip": "127.0.0.1",
                "action": "login",
            }
        ]
    finally:
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        await service.shutdown()


@pytest.mark.asyncio
async def test_login_returns_503_when_supabase_auth_is_unavailable(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled

    class FakeSupabaseAuthClient:
        async def sign_in(self, **kwargs):
            raise SupabaseAuthUnavailableError("Supabase auth is temporarily unavailable right now.")

    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())

    transport = httpx.ASGITransport(app=app)
    try:
        settings.environment = Environment.DEVELOPMENT
        settings.captcha_verification_enabled = False
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/login",
                json={
                    "email": "login@example.com",
                    "password": "Password123!",
                },
            )

        assert response.status_code == 503
        assert response.json()["detail"] == "Supabase auth is temporarily unavailable right now."
    finally:
        settings.environment = original_environment
        settings.captcha_verification_enabled = original_enabled
        await service.shutdown()


@pytest.mark.asyncio
async def test_login_lockout_persists_across_shared_sqlite_app_instances(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = get_settings()
    original_enabled = settings.captcha_verification_enabled
    shared_db_path = tmp_path / "studio-state.sqlite3"

    store_one = SqliteStudioStateStore(shared_db_path)
    store_two = SqliteStudioStateStore(shared_db_path)
    service_one = StudioService(store_one, ProviderRegistry(), tmp_path / "media-one")
    service_two = StudioService(store_two, ProviderRegistry(), tmp_path / "media-two")
    rate_limiter_one = InMemoryRateLimiter()
    rate_limiter_two = InMemoryRateLimiter()
    await rate_limiter_one.initialize()
    await rate_limiter_two.initialize()
    await service_one.initialize()
    await service_two.initialize()

    app_one = FastAPI()
    app_one.state.studio_service = service_one
    app_one.state.rate_limiter = rate_limiter_one
    app_one.include_router(create_router(service_one, rate_limiter_one))

    app_two = FastAPI()
    app_two.state.studio_service = service_two
    app_two.state.rate_limiter = rate_limiter_two
    app_two.include_router(create_router(service_two, rate_limiter_two))

    sign_in_calls: list[str] = []

    class FakeSupabaseAuthClient:
        async def sign_in(self, **kwargs):
            sign_in_calls.append(str(kwargs.get("email") or ""))
            raise SupabaseAuthError("Invalid login credentials")

    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())
    settings.captcha_verification_enabled = False

    payload = {
        "email": "lockout@example.com",
        "password": "Password123!",
    }

    transport_one = httpx.ASGITransport(app=app_one)
    transport_two = httpx.ASGITransport(app=app_two)

    try:
        async with httpx.AsyncClient(transport=transport_one, base_url="http://testserver") as client_one:
            for _ in range(5):
                response = await client_one.post("/v1/auth/login", json=payload)
                assert response.status_code == 401

        async with httpx.AsyncClient(transport=transport_two, base_url="http://testserver") as client_two:
            blocked = await client_two.post("/v1/auth/login", json=payload)

        assert blocked.status_code == 429
        assert blocked.json() == {"detail": "Too many failed login attempts. Please wait and try again."}
        assert sign_in_calls == ["lockout@example.com"] * 5
    finally:
        settings.captcha_verification_enabled = original_enabled
        await service_one.shutdown()
        await service_two.shutdown()


@pytest.mark.asyncio
async def test_signup_returns_503_when_supabase_auth_is_unavailable(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled

    class FakeSupabaseAuthClient:
        async def sign_up(self, **kwargs):
            raise SupabaseAuthUnavailableError("Supabase auth is temporarily unavailable right now.")

    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())

    transport = httpx.ASGITransport(app=app)
    try:
        settings.environment = Environment.DEVELOPMENT
        settings.captcha_verification_enabled = False
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/signup",
                json={
                    "email": "signup@example.com",
                    "password": "Password123!",
                    "display_name": "Signup User",
                    "username": "signup-user",
                    "accepted_terms": True,
                    "accepted_privacy": True,
                    "accepted_usage_policy": True,
                    "marketing_opt_in": False,
                },
            )

        assert response.status_code == 503
        assert response.json()["detail"] == "Supabase auth is temporarily unavailable right now."
    finally:
        settings.environment = original_environment
        settings.captcha_verification_enabled = original_enabled
        await service.shutdown()


@pytest.mark.asyncio
async def test_signup_records_consent_audit_metadata_in_identity_and_supabase_payload(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled
    recorded_sign_up_payloads: list[dict[str, object]] = []

    class FakeSession:
        access_token = "access-token"
        refresh_token = "refresh-token"
        token_type = "bearer"
        user = {
            "id": "user-signup-audit",
            "email": "signup@example.com",
            "user_metadata": {
                "display_name": "Signup User",
                "username": "signup-user",
                "accepted_terms": True,
                "accepted_privacy": True,
                "accepted_usage_policy": True,
                "marketing_opt_in": True,
            },
        }

    class FakeSupabaseAuthClient:
        async def sign_up(self, **kwargs):
            recorded_sign_up_payloads.append(kwargs)
            return FakeSession()

    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())

    transport = httpx.ASGITransport(app=app)
    try:
        settings.environment = Environment.DEVELOPMENT
        settings.captcha_verification_enabled = False
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/signup",
                json={
                    "email": "signup@example.com",
                    "password": "Password123!",
                    "display_name": "Signup User",
                    "username": "signup-user",
                    "accepted_terms": True,
                    "accepted_privacy": True,
                    "accepted_usage_policy": True,
                    "marketing_opt_in": True,
                },
            )

        assert response.status_code == 201
        assert len(recorded_sign_up_payloads) == 1
        sign_up_payload = recorded_sign_up_payloads[0]
        assert sign_up_payload["terms_version"] == TERMS_VERSION
        assert sign_up_payload["privacy_version"] == PRIVACY_VERSION
        assert sign_up_payload["usage_policy_version"] == USAGE_POLICY_VERSION
        assert sign_up_payload["marketing_consent_version"] == MARKETING_CONSENT_VERSION
        assert isinstance(sign_up_payload["accepted_terms_at"], str)
        assert isinstance(sign_up_payload["accepted_privacy_at"], str)
        assert isinstance(sign_up_payload["accepted_usage_policy_at"], str)
        assert isinstance(sign_up_payload["marketing_opt_in_at"], str)

        identity = response.json()["identity"]["identity"]
        assert identity["terms_version"] == TERMS_VERSION
        assert identity["privacy_version"] == PRIVACY_VERSION
        assert identity["usage_policy_version"] == USAGE_POLICY_VERSION
        assert identity["marketing_consent_version"] == MARKETING_CONSENT_VERSION
        assert identity["accepted_terms_at"] is not None
        assert identity["accepted_privacy_at"] is not None
        assert identity["accepted_usage_policy_at"] is not None
        assert identity["marketing_opt_in_at"] is not None
    finally:
        settings.environment = original_environment
        settings.captcha_verification_enabled = original_enabled
        await service.shutdown()


@pytest.mark.asyncio
async def test_login_captcha_uses_forwarded_ip_only_for_trusted_proxy_client(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    remote_ips: list[str | None] = []

    class FakeSession:
        access_token = "access-token"
        refresh_token = "refresh-token"
        token_type = "bearer"
        user = {
            "id": "user-login",
            "email": "login@example.com",
            "user_metadata": {
                "display_name": "Login User",
                "username": "login-user",
                "accepted_terms": True,
                "accepted_privacy": True,
                "accepted_usage_policy": True,
                "marketing_opt_in": False,
            },
        }

    class FakeSupabaseAuthClient:
        async def sign_in(self, **kwargs):
            return FakeSession()

    async def fake_verify_captcha_token(token, *, remote_ip=None, action=None, settings=None, transport=None):
        remote_ips.append(remote_ip)
        return {"success": True, "action": action, "hostname": "127.0.0.1"}

    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())
    monkeypatch.setattr(router_module, "verify_captcha_token", fake_verify_captcha_token)

    transport = httpx.ASGITransport(app=app, client=("127.0.0.1", 40123))
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/login",
                headers={"x-forwarded-for": "198.51.100.44, 10.0.0.2"},
                json={
                    "email": "login@example.com",
                    "password": "Password123!",
                    "captcha_token": "turnstile-token",
                },
            )

        assert response.status_code == 200
        assert remote_ips == ["198.51.100.44"]
    finally:
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        await service.shutdown()


@pytest.mark.asyncio
async def test_login_captcha_ignores_forwarded_ip_for_untrusted_direct_client(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    remote_ips: list[str | None] = []

    class FakeSession:
        access_token = "access-token"
        refresh_token = "refresh-token"
        token_type = "bearer"
        user = {
            "id": "user-login",
            "email": "login@example.com",
            "user_metadata": {
                "display_name": "Login User",
                "username": "login-user",
                "accepted_terms": True,
                "accepted_privacy": True,
                "accepted_usage_policy": True,
                "marketing_opt_in": False,
            },
        }

    class FakeSupabaseAuthClient:
        async def sign_in(self, **kwargs):
            return FakeSession()

    async def fake_verify_captcha_token(token, *, remote_ip=None, action=None, settings=None, transport=None):
        remote_ips.append(remote_ip)
        return {"success": True, "action": action, "hostname": "127.0.0.1"}

    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())
    monkeypatch.setattr(router_module, "verify_captcha_token", fake_verify_captcha_token)

    transport = httpx.ASGITransport(app=app, client=("8.8.8.8", 40123))
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/login",
                headers={"x-forwarded-for": "203.0.113.9, 10.0.0.2"},
                json={
                    "email": "login@example.com",
                    "password": "Password123!",
                    "captcha_token": "turnstile-token",
                },
            )

        assert response.status_code == 200
        assert remote_ips == ["8.8.8.8"]
    finally:
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        await service.shutdown()


@pytest.mark.asyncio
async def test_login_captcha_ignores_invalid_forwarded_ip_from_trusted_proxy(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    remote_ips: list[str | None] = []

    class FakeSession:
        access_token = "access-token"
        refresh_token = "refresh-token"
        token_type = "bearer"
        user = {
            "id": "user-login",
            "email": "login@example.com",
            "user_metadata": {
                "display_name": "Login User",
                "username": "login-user",
                "accepted_terms": True,
                "accepted_privacy": True,
                "accepted_usage_policy": True,
                "marketing_opt_in": False,
            },
        }

    class FakeSupabaseAuthClient:
        async def sign_in(self, **kwargs):
            return FakeSession()

    async def fake_verify_captcha_token(token, *, remote_ip=None, action=None, settings=None, transport=None):
        remote_ips.append(remote_ip)
        return {"success": True, "action": action, "hostname": "127.0.0.1"}

    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    monkeypatch.setattr(router_module, "get_supabase_auth_client", lambda: FakeSupabaseAuthClient())
    monkeypatch.setattr(router_module, "verify_captcha_token", fake_verify_captcha_token)

    transport = httpx.ASGITransport(app=app, client=("127.0.0.1", 40123))
    try:
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/auth/login",
                headers={"x-forwarded-for": "definitely-not-an-ip, 10.0.0.2"},
                json={
                    "email": "login@example.com",
                    "password": "Password123!",
                    "captcha_token": "turnstile-token",
                },
            )

        assert response.status_code == 200
        assert remote_ips == ["127.0.0.1"]
    finally:
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        await service.shutdown()


@pytest.mark.asyncio
async def test_verify_captcha_token_rejects_missing_action_for_sensitive_flow() -> None:
    from security.captcha import CaptchaVerificationError, verify_captcha_token

    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    original_public_web_base_url = settings.public_web_base_url

    settings.environment = Environment.STAGING
    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    settings.public_web_base_url = "https://studio.omniacreata.com"

    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={"success": True, "hostname": "studio.omniacreata.com"},
        )
    )

    try:
        with pytest.raises(CaptchaVerificationError, match="did not match this action"):
            await verify_captcha_token(
                "turnstile-token",
                action="login",
                settings=settings,
                transport=transport,
            )
    finally:
        settings.environment = original_environment
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        settings.public_web_base_url = original_public_web_base_url


@pytest.mark.asyncio
async def test_verify_captcha_token_rejects_missing_hostname_in_staging() -> None:
    from security.captcha import CaptchaVerificationError, verify_captcha_token

    settings = get_settings()
    original_environment = settings.environment
    original_enabled = settings.captcha_verification_enabled
    original_provider = settings.captcha_provider
    original_site_key = settings.turnstile_site_key
    original_secret_key = settings.turnstile_secret_key
    original_public_web_base_url = settings.public_web_base_url

    settings.environment = Environment.STAGING
    settings.captcha_verification_enabled = True
    settings.captcha_provider = "turnstile"
    settings.turnstile_site_key = "turnstile-site-key"
    settings.turnstile_secret_key = "turnstile-secret-key"
    settings.public_web_base_url = "https://studio.omniacreata.com"

    transport = httpx.MockTransport(
        lambda request: httpx.Response(
            200,
            json={"success": True, "action": "login"},
        )
    )

    try:
        with pytest.raises(CaptchaVerificationError, match="did not return a hostname"):
            await verify_captcha_token(
                "turnstile-token",
                action="login",
                settings=settings,
                transport=transport,
            )
    finally:
        settings.environment = original_environment
        settings.captcha_verification_enabled = original_enabled
        settings.captcha_provider = original_provider
        settings.turnstile_site_key = original_site_key
        settings.turnstile_secret_key = original_secret_key
        settings.public_web_base_url = original_public_web_base_url


def test_share_routes_require_no_store_headers() -> None:
    from security.response_headers import requires_no_store_headers

    assert requires_no_store_headers("/v1/shares") is True
    assert requires_no_store_headers("/v1/shares/public/sharetoken") is True


@pytest.mark.asyncio
async def test_paddle_webhook_accepts_valid_signature_with_secretstr(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_secret = settings.paddle_webhook_secret
    settings.paddle_webhook_secret = SecretStr("whsec_test")
    received_payloads: list[dict] = []

    async def fake_process_paddle_webhook(payload: dict) -> None:
        received_payloads.append(payload)

    monkeypatch.setattr(service, "process_paddle_webhook", fake_process_paddle_webhook)

    payload = {"event_id": "evt_1", "event_type": "transaction.completed", "data": {"id": "txn-1", "type": "transaction"}}
    payload_bytes = json.dumps(payload).encode("utf-8")
    timestamp = "1713139200"
    signature = hmac.new(b"whsec_test", timestamp.encode("utf-8") + b":" + payload_bytes, hashlib.sha256).hexdigest()

    transport = httpx.ASGITransport(app=app)
    try:
        monkeypatch.setattr(router_module.time, "time", lambda: int(timestamp))
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.post(
                "/v1/webhooks/paddle",
                content=payload_bytes,
                headers={
                    "Content-Type": "application/json",
                    "Paddle-Signature": f"ts={timestamp};h1={signature}",
                },
            )

        assert response.status_code == 200
        assert received_payloads == [payload]
    finally:
        settings.paddle_webhook_secret = original_secret
        await service.shutdown()


@pytest.mark.asyncio
async def test_shares_route_lists_sanitized_records(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def fake_list_shares(identity_id: str):
        return [{"id": "share-1", "asset_id": "asset-1", "token_preview": "abcd...1234", "created_at": "2026-04-06T10:00:00+00:00", "expires_at": None, "revoked_at": None, "project_id": None}]

    service.list_shares = fake_list_shares  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/shares", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 200
        assert response.json()["shares"][0]["token_preview"] == "abcd...1234"
        assert "token" not in response.json()["shares"][0]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_login_rejects_malformed_email_payload_with_422(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/auth/login",
            json={
                "email": "x@y",
                "password": "Password123!",
            },
        )

    try:
        assert response.status_code == 422
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_revoke_share_route_returns_sanitized_record(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def fake_revoke_share(identity_id: str, share_id: str):
        return {
            "id": share_id,
            "asset_id": "asset-1",
            "project_id": None,
            "token_preview": "abcd...1234",
            "created_at": "2026-04-06T10:00:00+00:00",
            "expires_at": None,
            "revoked_at": "2026-04-06T10:05:00+00:00",
        }

    service.revoke_share = fake_revoke_share  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.delete("/v1/shares/share-1", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 200
        assert response.json()["share"]["id"] == "share-1"
        assert "token" not in response.json()["share"]
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_persona_create_route_uses_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    monkeypatch.setattr(rate_limiter, "check", fake_check)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/personas",
            headers={"X-Test-User": "user-1"},
            json={
                "name": "Studio Critic",
                "description": "Focused reviewer",
                "system_prompt": "Be sharp and useful.",
            },
        )

    try:
        assert response.status_code == 201
        assert any("personas:create" in key and limit == 12 for key, limit, _ in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_export_route_uses_ip_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_list_public_posts(*, sort: str, viewer_identity_id: str | None, limit: int | None = None):
        return [{"id": "post-1", "thumbnail_url": "https://example.com/image.png", "prompt": "sunset", "owner_display_name": "User", "like_count": 4}]

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.list_public_posts = fake_list_public_posts  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/public/export")

    try:
        assert response.status_code == 200
        assert any("public:export" in key and limit == 20 and window == 60 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_public_export_route_uses_nested_public_asset_urls_when_flat_fields_are_absent(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def fake_list_public_posts(*, sort: str, viewer_identity_id: str | None, limit: int | None = None):
        return [
            {
                "id": "post-1",
                "prompt": "sunset over the city skyline at golden hour",
                "owner_display_name": "User",
                "like_count": 4,
                "cover_asset": {
                    "preview_url": "/v1/assets/asset-1/preview?token=abc",
                    "thumbnail_url": "/v1/assets/asset-1/thumbnail?token=abc",
                },
                "preview_assets": [],
            }
        ]

    monkeypatch.setattr(service, "list_public_posts", fake_list_public_posts)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/public/export")

    try:
        assert response.status_code == 200
        payload = response.json()["trending_creations"][0]
        assert payload["image_url"] == "/v1/assets/asset-1/preview?token=abc"
        assert payload["prompt_snippet"] == "sunset over the city skyline at golden hour"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_project_mutation_routes_use_explicit_rate_limits(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_create_project(identity_id: str, title: str, description: str, surface: str = "compose") -> Project:
        return Project(id="project-create", workspace_id="ws-user-1", identity_id=identity_id, title=title, description=description, surface=surface)

    async def fake_update_project(identity_id: str, project_id: str, title: str, description: str) -> Project:
        return Project(id=project_id, workspace_id="ws-user-1", identity_id=identity_id, title=title, description=description)

    async def fake_delete_project(identity_id: str, project_id: str) -> dict:
        return {"status": "deleted", "project_id": project_id}

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.create_project = fake_create_project  # type: ignore[method-assign]
    service.update_project = fake_update_project  # type: ignore[method-assign]
    service.delete_project = fake_delete_project  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        create_response = await client.post(
            "/v1/projects",
            headers={"X-Test-User": "user-1"},
            json={"title": "Campaign", "description": "Spring launch", "surface": "compose"},
        )
        update_response = await client.patch(
            "/v1/projects/project-create",
            headers={"X-Test-User": "user-1"},
            json={"title": "Campaign v2", "description": "Updated"},
        )
        delete_response = await client.delete("/v1/projects/project-create", headers={"X-Test-User": "user-1"})

    try:
        assert create_response.status_code == 201
        assert update_response.status_code == 200
        assert delete_response.status_code == 200
        assert any("projects:create" in key and limit == 24 and window == 3600 for key, limit, window in calls)
        assert any("projects:update" in key and limit == 60 and window == 3600 for key, limit, window in calls)
        assert any("projects:delete" in key and limit == 12 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_profile_favorites_route_uses_explicit_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_list_liked_posts(identity_id: str, *, limit: int | None = None) -> list[dict[str, object]]:
        assert limit == 12
        return [
            {
                "id": "post-1",
                "title": "Saved post",
                "prompt": "misty mountains",
                "owner_display_name": "User",
                "owner_username": "user",
                "cover_asset": None,
                "preview_assets": [],
                "visibility": "public",
                "like_count": 4,
                "viewer_has_liked": True,
                "created_at": "2026-04-19T10:00:00Z",
                "project_id": None,
                "style_tags": ["cinematic"],
            }
        ]

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.list_liked_posts = fake_list_liked_posts  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/profiles/me/favorites?limit=12", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["posts"][0]["viewer_has_liked"] is True
        assert any("profiles:favorites" in key and limit == 120 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_profile_self_service_routes_use_explicit_rate_limits(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_export_identity_data(identity_id: str) -> dict:
        return {"identity": {"id": identity_id}, "assets": []}

    async def fake_delete_identity(identity_id: str) -> None:
        return None

    captured_updates: list[dict[str, object]] = []

    async def fake_update_profile(
        identity_id: str,
        display_name=None,
        bio=None,
        default_visibility=None,
        featured_asset_id=None,
        featured_asset_id_provided=False,
        featured_asset_position=None,
    ) -> None:
        captured_updates.append(
            {
                "identity_id": identity_id,
                "display_name": display_name,
                "bio": bio,
                "default_visibility": default_visibility,
                "featured_asset_id": featured_asset_id,
                "featured_asset_id_provided": featured_asset_id_provided,
                "featured_asset_position": featured_asset_position,
            }
        )
        return None

    async def fake_get_profile_payload(*, identity_id=None, username=None, viewer_identity_id=None, limit=None) -> dict:
        target_identity_id = identity_id or username or "user-1"
        return {"profile": {"id": target_identity_id}, "own_profile": True, "can_edit": True}

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.export_identity_data = fake_export_identity_data  # type: ignore[method-assign]
    service.permanently_delete_identity = fake_delete_identity  # type: ignore[method-assign]
    service.update_profile = fake_update_profile  # type: ignore[method-assign]
    service.get_profile_payload = fake_get_profile_payload  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        export_response = await client.get("/v1/profiles/me/export", headers={"X-Test-User": "user-1"})
        patch_response = await client.patch(
            "/v1/profiles/me",
            headers={"X-Test-User": "user-1"},
            json={"display_name": "User One", "featured_asset_id": "asset-hero-1"},
        )
        delete_response = await client.delete("/v1/profiles/me", headers={"X-Test-User": "user-1"})

    try:
        assert export_response.status_code == 200
        assert patch_response.status_code == 200
        assert delete_response.status_code == 200
        assert captured_updates == [
            {
                "identity_id": "user-1",
                "display_name": "User One",
                "bio": None,
                "default_visibility": None,
                "featured_asset_id": "asset-hero-1",
                "featured_asset_id_provided": True,
                "featured_asset_position": None,
            }
        ]
        assert any("profiles:export" in key and limit == 6 and window == 3600 for key, limit, window in calls)
        assert any("profiles:update" in key and limit == 24 and window == 3600 for key, limit, window in calls)
        assert any("profiles:delete" in key and limit == 3 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_asset_import_route_uses_user_and_ip_rate_limits(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_import_asset_from_data_url(identity_id: str, project_id: str, data_url: str, title: str) -> MediaAsset:
        return MediaAsset(
            id="asset-import",
            workspace_id="ws-user-1",
            project_id=project_id,
            identity_id=identity_id,
            title=title,
            prompt="imported",
            url="stored",
            metadata={},
        )

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.import_asset_from_data_url = fake_import_asset_from_data_url  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/assets/import",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "title": "Reference upload",
                "data_url": "data:image/png;base64," + ("a" * 64),
            },
        )

    try:
        assert response.status_code == 201
        assert any("assets:import:user-1" in key and limit == 24 and window == 3600 for key, limit, window in calls)
        assert any("assets:import:ip" in key and limit == 30 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_style_mutation_routes_use_explicit_rate_limits(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_save_style(*args, **kwargs):
        return object()

    async def fake_save_style_from_prompt(*args, **kwargs):
        return object()

    async def fake_update_style(*args, **kwargs):
        return object()

    async def fake_delete_style(*args, **kwargs):
        return None

    def fake_serialize_style(style) -> dict:
        return {"id": "style-1"}

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.save_style = fake_save_style  # type: ignore[method-assign]
    service.save_style_from_prompt = fake_save_style_from_prompt  # type: ignore[method-assign]
    service.update_style = fake_update_style  # type: ignore[method-assign]
    service.delete_style = fake_delete_style  # type: ignore[method-assign]
    service._serialize_style = fake_serialize_style  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        create_response = await client.post(
            "/v1/styles",
            headers={"X-Test-User": "user-1"},
            json={
                "title": "Noir",
                "prompt_modifier": "deep shadows",
                "description": "",
                "category": "custom",
                "favorite": False,
            },
        )
        prompt_response = await client.post(
            "/v1/styles/from-prompt",
            headers={"X-Test-User": "user-1"},
            json={"prompt": "noir portrait", "title": "Noir", "category": "custom"},
        )
        patch_response = await client.patch(
            "/v1/styles/style-1",
            headers={"X-Test-User": "user-1"},
            json={"favorite": True},
        )
        delete_response = await client.delete(
            "/v1/styles/style-1",
            headers={"X-Test-User": "user-1"},
        )

    try:
        assert create_response.status_code == 201
        assert prompt_response.status_code == 201
        assert patch_response.status_code == 200
        assert delete_response.status_code == 200
        assert sum(1 for key, limit, window in calls if "styles:mutate" in key and limit == 40 and window == 3600) == 4
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_auth_me_exposes_provider_context_from_current_user_metadata(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def _provider_user(_request: Request) -> User | None:
        return User(
            id="user-1",
            email="user-1@example.com",
            username="Google Display Name",
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            metadata={
                "username": "user-1",
                "accepted_terms": True,
                "accepted_privacy": True,
                "accepted_usage_policy": True,
                "marketing_opt_in": False,
                "auth_provider": "google",
                "auth_providers": ["google"],
            },
        )

    app.dependency_overrides[router_module.get_current_user] = _provider_user

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/auth/me")

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["identity"]["auth_provider"] == "google"
        assert payload["identity"]["auth_providers"] == ["google"]
        assert payload["identity"]["credentials_managed_by_provider"] is True
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_post_report_route_uses_user_and_ip_rate_limits(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, rate_limiter = await _build_test_app(tmp_path)
    calls: list[tuple[str, int, int]] = []

    async def fake_check(key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        calls.append((key, limit, window_seconds))
        return RateLimitDecision(allowed=True, limit=limit, remaining=limit - 1, retry_after=0)

    async def fake_report_public_post(identity_id: str, post_id: str, *, reason_code: str, detail: str):
        return ModerationCase(
            id="case-report-1",
            subject="post",
            source=ModerationCaseSource.PUBLIC_REPORT,
            decision_tier="review",
            reason_code=reason_code,
            visibility_effect="hidden_pending_review",
            status=ModerationCaseStatus.OPEN,
            actor_or_reporter=identity_id,
            target_identity_id="owner-1",
            target_post_id=post_id,
            description=detail,
        )

    monkeypatch.setattr(rate_limiter, "check", fake_check)
    service.report_public_post = fake_report_public_post  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/posts/post-1/report",
            headers={"X-Test-User": "viewer-1"},
            json={"reason_code": "unsafe_public", "detail": "Please review this post."},
        )

    try:
        assert response.status_code == 201
        payload = response.json()["case"]
        assert payload["id"] == "case-report-1"
        assert payload["source"] == "public_report"
        assert any("posts:report" in key and limit == 24 and window == 3600 for key, limit, window in calls)
        assert any("posts:report:ip" in key and limit == 40 and window == 3600 for key, limit, window in calls)
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_moderation_appeal_and_admin_case_routes_work_for_owner(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    owner_identity = OmniaIdentity(
        id="owner-1",
        email="owner-1@example.com",
        display_name="Owner",
        username="owner-1",
        workspace_id="ws-owner-1",
        owner_mode=True,
        root_admin=True,
        local_access=True,
    )

    async def fake_submit_moderation_appeal(
        identity_id: str,
        *,
        linked_case_id: str | None,
        subject,
        subject_id: str | None,
        reason_code: str,
        detail: str,
    ):
        return ModerationCase(
            id="case-appeal-1",
            subject="post",
            source=ModerationCaseSource.APPEAL,
            decision_tier="review",
            reason_code=reason_code,
            visibility_effect="none",
            status=ModerationCaseStatus.OPEN,
            actor_or_reporter=identity_id,
            target_identity_id=identity_id,
            target_post_id=subject_id,
            linked_case_id=linked_case_id,
            description=detail,
        )

    async def fake_list_moderation_cases(*, status=None, source=None, limit=200):
        return [
            {
                "id": "case-report-1",
                "source": "public_report",
                "status": "open",
                "reason_code": "unsafe_public",
            }
        ]

    async def fake_ensure_identity(*args, **kwargs):
        return owner_identity

    async def fake_get_identity(identity_id: str):
        return owner_identity

    monkeypatch.setattr(service, "submit_moderation_appeal", fake_submit_moderation_appeal)
    monkeypatch.setattr(service, "list_moderation_cases", fake_list_moderation_cases)
    monkeypatch.setattr(service, "ensure_identity", fake_ensure_identity)
    monkeypatch.setattr(service, "get_identity", fake_get_identity)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        appeal_response = await client.post(
            "/v1/moderation/appeals",
            headers={"X-Test-User": "owner-1"},
            json={"linked_case_id": "case-report-1", "subject": "post", "subject_id": "post-1", "detail": "Please review again."},
        )
        admin_response = await client.get(
            "/v1/admin/moderation/cases",
            headers={
                "X-Test-User": "owner-1",
                "X-Test-Owner-Mode": "true",
                "X-Test-Root-Admin": "true",
                "X-Test-Local-Access": "true",
            },
        )

    try:
        assert appeal_response.status_code == 201
        assert appeal_response.json()["case"]["source"] == "appeal"
        assert admin_response.status_code == 200
        assert admin_response.json()["cases"][0]["id"] == "case-report-1"
    finally:
        await service.shutdown()
