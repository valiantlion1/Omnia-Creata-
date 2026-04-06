from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI, Request

import studio_platform.router as router_module
from security.auth import User, UserRole
from security.rate_limit import InMemoryRateLimiter, RateLimitDecision
from studio_platform.asset_storage import ResolvedAssetDelivery
from studio_platform.models import ShareLink
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

    async def _current_user(request: Request) -> User:
        user_id = request.headers.get("X-Test-User", "user-1")
        email = request.headers.get("X-Test-Email", f"{user_id}@example.com")
        return User(
            id=user_id,
            email=email,
            username=user_id,
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
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
