from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI, Request

from config.env import Environment, get_settings
import studio_platform.router as router_module
from security.auth import User, UserRole
from security.rate_limit import InMemoryRateLimiter, RateLimitDecision
from studio_platform.asset_storage import AssetStorageError, ResolvedAssetDelivery
from studio_platform.models import IdentityPlan, MediaAsset, OmniaIdentity, Project, PublicPost, ShareLink, StudioWorkspace, Visibility, utc_now
from studio_platform.providers import ProviderRegistry
from studio_platform.router import create_router
from studio_platform.service import StudioService
from studio_platform.store import StudioStateStore


async def _build_test_app(tmp_path: Path) -> tuple[FastAPI, StudioService, InMemoryRateLimiter]:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    rate_limiter = InMemoryRateLimiter()
    await rate_limiter.initialize()
    await service.initialize()

    app = FastAPI()

    async def _current_user(request: Request) -> User | None:
        if request.headers.get("X-Test-Guest", "").strip().lower() in {"1", "true", "yes"}:
            return None
        user_id = request.headers.get("X-Test-User", "user-1")
        email = request.headers.get("X-Test-Email", f"{user_id}@example.com")
        username = request.headers.get("X-Test-Username", user_id)
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
async def test_public_share_route_returns_not_found_for_trashed_asset_share(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
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
    _, public_token = await service.create_share(identity.id, project.id, None)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"/v1/shares/public/{public_token}")

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
        assert payload == {"assets": []}
        identity = await service.get_identity("fresh-user")
        assert identity.email == "fresh-user@example.com"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_health_detail_allows_owner_email_after_identity_bootstrap(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/healthz/detail",
            headers={
                "X-Test-User": "founder@omniacreata.com",
                "X-Test-Email": "founder@omniacreata.com",
                "X-Test-Username": "founder",
            },
        )

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] in {"healthy", "degraded", "blocked"}
    finally:
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
        response = await client.get("/v1/settings/bootstrap", headers={"X-Test-User": "bootstrap-user"})

    try:
        assert response.status_code == 200
        payload = response.json()
        assert set(payload.keys()) >= {"identity", "entitlements", "plans", "models", "presets", "draft_projects", "styles", "prompt_memory"}
        assert set(payload["draft_projects"].keys()) == {"compose", "chat"}
        assert set(payload["styles"].keys()) == {"catalog", "my_styles", "favorites"}
        assert payload["prompt_memory"]["identity_id"] == "bootstrap-user"
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
        identity = await service.get_identity("user-1")
        assert identity.username == "user-1"
    finally:
        await service.shutdown()


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
async def test_healthz_detail_route_requires_owner_mode_and_returns_truth_payload(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        denied = await client.get("/v1/healthz/detail", headers={"X-Test-User": "user-1"})
        allowed = await client.get(
            "/v1/healthz/detail",
            headers={"X-Test-User": "owner-1", "X-Test-Owner-Mode": "true"},
        )

    try:
        assert denied.status_code == 403
        assert allowed.status_code == 200
        payload = allowed.json()
        assert "launch_gate" in payload
        assert "provider_truth" in payload
        assert "truth_sync" in payload
        assert "ai_control_plane" in payload
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
        response = await client.get(
            "/v1/healthz/detail",
            headers={"X-Test-User": "owner-1", "X-Test-Owner-Mode": "true"},
        )

    try:
        assert response.status_code == 401
        assert response.json() == {"detail": "This session belongs to an account that has been permanently deleted."}
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

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        denied = await client.get(
            "/v1/admin/telemetry",
            headers={"X-Test-User": "owner-1", "X-Test-Owner-Mode": "true"},
        )
        allowed = await client.get(
            "/v1/admin/telemetry",
            headers={
                "X-Test-User": "root-1",
                "X-Test-Owner-Mode": "true",
                "X-Test-Root-Admin": "true",
            },
        )

    try:
        assert denied.status_code == 403
        assert denied.json() == {"detail": "Root Administrator Required"}
        assert allowed.status_code == 200
        payload = allowed.json()
        assert payload["status"] == "OK"
        assert "telemetry" in payload
        assert "event_count" in payload["telemetry"]
        assert payload["total_identities"] >= 1
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_billing_checkout_route_refuses_demo_activation_outside_development(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    settings = get_settings()
    original_environment = settings.environment
    original_store_id = settings.lemonsqueezy_store_id
    settings.environment = Environment.STAGING
    settings.lemonsqueezy_store_id = None

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
        settings.lemonsqueezy_store_id = original_store_id
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
        assert response.json() == {"detail": "Demo Pro login is only available in local development."}
    finally:
        settings.environment = original_environment
        settings.enable_demo_auth = original_enable_demo_auth
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
