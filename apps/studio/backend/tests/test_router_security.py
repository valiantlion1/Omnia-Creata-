from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI, Request

import studio_platform.router as router_module
from security.auth import User, UserRole
from security.rate_limit import InMemoryRateLimiter, RateLimitDecision
from studio_platform.asset_storage import AssetStorageError, ResolvedAssetDelivery
from studio_platform.models import IdentityPlan, MediaAsset, OmniaIdentity, ShareLink, StudioWorkspace
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
