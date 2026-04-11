from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from urllib.parse import quote

import httpx

from config.env import Environment, Settings, reveal_secret


logger = logging.getLogger(__name__)


class AssetStorageError(RuntimeError):
    """Raised when asset storage operations fail."""


class AssetNotFoundError(FileNotFoundError):
    """Raised when a stored asset cannot be found."""


@dataclass(slots=True)
class ResolvedAssetDelivery:
    filename: str
    media_type: str
    local_path: Optional[Path] = None
    content: Optional[bytes] = None


class AssetStorageBackend(ABC):
    kind: str

    @abstractmethod
    async def store_bytes(self, key: str, content: bytes, *, content_type: str) -> None:
        raise NotImplementedError

    @abstractmethod
    async def fetch_bytes(self, key: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    async def delete_bytes(self, key: str) -> None:
        raise NotImplementedError


class LocalAssetStorageBackend(AssetStorageBackend):
    kind = "local"

    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def resolve_path(self, key: str) -> Path:
        normalized = key.replace("\\", "/").lstrip("/")
        path = (self.base_dir / normalized).resolve()
        if self.base_dir.resolve() not in path.parents and path != self.base_dir.resolve():
            raise AssetStorageError("Unsafe local storage path")
        return path

    async def store_bytes(self, key: str, content: bytes, *, content_type: str) -> None:
        path = self.resolve_path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        await asyncio.to_thread(path.write_bytes, content)

    async def fetch_bytes(self, key: str) -> bytes:
        path = self.resolve_path(key)
        if not path.exists():
            raise AssetNotFoundError(f"Local asset not found: {key}")
        return await asyncio.to_thread(path.read_bytes)

    async def delete_bytes(self, key: str) -> None:
        path = self.resolve_path(key)
        if path.exists():
            await asyncio.to_thread(path.unlink)


class SupabaseAssetStorageBackend(AssetStorageBackend):
    kind = "supabase"

    def __init__(
        self,
        *,
        base_url: str,
        service_role_key: str,
        bucket: str,
        timeout_seconds: int = 120,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.service_role_key = service_role_key
        self.bucket = bucket
        self.timeout_seconds = timeout_seconds

    def _headers(self, content_type: Optional[str] = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.service_role_key}",
            "apikey": self.service_role_key,
        }
        if content_type:
            headers["Content-Type"] = content_type
        return headers

    def _upload_url(self, key: str) -> str:
        safe_key = quote(key.lstrip("/"), safe="/")
        return f"{self.base_url}/storage/v1/object/{self.bucket}/{safe_key}"

    def _download_url(self, key: str) -> str:
        safe_key = quote(key.lstrip("/"), safe="/")
        return f"{self.base_url}/storage/v1/object/authenticated/{self.bucket}/{safe_key}"

    def _delete_url(self, key: str) -> str:
        safe_key = quote(key.lstrip("/"), safe="/")
        return f"{self.base_url}/storage/v1/object/{self.bucket}/{safe_key}"

    async def store_bytes(self, key: str, content: bytes, *, content_type: str) -> None:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(
                self._upload_url(key),
                content=content,
                headers={
                    **self._headers(content_type),
                    "x-upsert": "true",
                },
            )

        if response.status_code not in {200, 201}:
            raise AssetStorageError(
                f"Supabase storage upload failed ({response.status_code}): {response.text}"
            )

    async def fetch_bytes(self, key: str) -> bytes:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get(
                self._download_url(key),
                headers=self._headers(),
            )

        if response.status_code == 404:
            raise AssetNotFoundError(f"Supabase asset not found: {key}")
        if response.status_code != 200:
            raise AssetStorageError(
                f"Supabase storage download failed ({response.status_code}): {response.text}"
            )
        return response.content

    async def delete_bytes(self, key: str) -> None:
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.delete(
                self._delete_url(key),
                headers=self._headers(),
            )

        if response.status_code not in {200, 204, 404}:
            raise AssetStorageError(
                f"Supabase storage delete failed ({response.status_code}): {response.text}"
            )


class AssetStorageRegistry:
    def __init__(
        self,
        *,
        default_kind: str,
        local_backend: LocalAssetStorageBackend,
        supabase_backend: Optional[SupabaseAssetStorageBackend] = None,
    ) -> None:
        self.default_kind = default_kind
        self.local_backend = local_backend
        self.supabase_backend = supabase_backend

    def get(self, kind: str) -> AssetStorageBackend:
        if kind == "local":
            return self.local_backend
        if kind == "supabase":
            if self.supabase_backend is None:
                raise AssetStorageError("Supabase asset storage is not configured")
            return self.supabase_backend
        raise AssetStorageError(f"Unsupported asset storage backend: {kind}")


def build_asset_storage_registry(settings: Settings, media_dir: Path) -> AssetStorageRegistry:
    requested_kind = (settings.asset_storage_backend or "local").strip().lower()
    local_backend = LocalAssetStorageBackend(media_dir)

    supabase_backend: Optional[SupabaseAssetStorageBackend] = None
    if settings.supabase_url and settings.supabase_service_role_key:
        supabase_backend = SupabaseAssetStorageBackend(
            base_url=settings.supabase_url,
            service_role_key=reveal_secret(settings.supabase_service_role_key),
            bucket=settings.supabase_storage_bucket,
            timeout_seconds=max(settings.default_timeout_seconds, 120),
        )

    prefers_local_non_postgres_storage = (
        settings.state_store_backend != "postgres"
        and not settings.development_remote_asset_storage_enabled
    )

    if prefers_local_non_postgres_storage:
        if requested_kind == "supabase":
            logger.info(
                "Non-Postgres state store is using local asset storage by default; skipping remote Supabase asset storage"
            )
        requested_kind = "local"
    elif requested_kind == "supabase":
        if supabase_backend is None:
            if settings.environment == Environment.DEVELOPMENT:
                logger.warning("Supabase storage requested but not fully configured; falling back to local asset storage")
                requested_kind = "local"
            else:
                raise AssetStorageError("Supabase storage backend requested but not configured")
    else:
        requested_kind = "local"

    return AssetStorageRegistry(
        default_kind=requested_kind,
        local_backend=local_backend,
        supabase_backend=supabase_backend,
    )
