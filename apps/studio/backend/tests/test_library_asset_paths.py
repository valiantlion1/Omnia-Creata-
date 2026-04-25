from __future__ import annotations

from pathlib import Path

import pytest

from studio_platform.models import MediaAsset
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
from studio_platform.store import StudioStateStore


@pytest.mark.asyncio
async def test_inaccessible_local_asset_path_is_treated_as_missing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()
    blocked_path = tmp_path / "blocked-local-asset.png"
    original_exists = Path.exists

    def fake_exists(path: Path) -> bool:
        if path == blocked_path:
            raise PermissionError("local asset path is not readable")
        return original_exists(path)

    monkeypatch.setattr(Path, "exists", fake_exists)
    asset = MediaAsset(
        id="asset-blocked-path",
        workspace_id="ws-1",
        project_id="project-1",
        identity_id="user-1",
        title="Blocked local path",
        prompt="",
        url="stored",
        local_path=str(blocked_path),
        metadata={},
    )

    try:
        assert service.library.asset_variant_exists(asset, "content") is False
        await service.library.delete_asset_variant(asset, "content")

        with pytest.raises(FileNotFoundError, match="Asset file not found"):
            await service.library.resolve_stored_asset_variant_delivery(asset, "content")
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_inaccessible_local_storage_key_is_treated_as_missing(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()
    storage_key = "generated/ws-1/project-1/asset-storage-key.png"
    blocked_path = service.asset_storage.local_backend.resolve_path(storage_key)
    original_exists = Path.exists

    def fake_exists(path: Path) -> bool:
        if path == blocked_path:
            raise PermissionError("local storage key is not readable")
        return original_exists(path)

    monkeypatch.setattr(Path, "exists", fake_exists)
    asset = MediaAsset(
        id="asset-blocked-storage-key",
        workspace_id="ws-1",
        project_id="project-1",
        identity_id="user-1",
        title="Blocked local storage key",
        prompt="",
        url="stored",
        local_path="",
        metadata={
            "storage_backend": "local",
            "storage_key": storage_key,
            "mime_type": "image/png",
        },
    )

    try:
        assert service.library.asset_variant_exists(asset, "content") is False
        await service.library.delete_asset_variant(asset, "content")

        with pytest.raises(FileNotFoundError, match="Local asset not found"):
            await service.library.resolve_stored_asset_variant_delivery(asset, "content")
    finally:
        await service.shutdown()
