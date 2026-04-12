from __future__ import annotations

import asyncio
import io
import logging
import mimetypes
import re
import zipfile
from datetime import timedelta
from pathlib import Path
from typing import TYPE_CHECKING, Any, Dict, Optional
from urllib.parse import urlparse

import jwt
from PIL import Image, ImageDraw, ImageFilter

from ..asset_ops import (
    empty_trash_in_state,
    permanently_remove_asset_from_state,
    rename_asset_in_state,
    restore_asset_in_state,
    trash_asset_in_state,
)
from ..asset_storage import ResolvedAssetDelivery
from ..entitlement_ops import ensure_clean_export_allowed, resolve_entitlements
from ..models import GenerationJob, JobStatus, MediaAsset, Project, PromptMemoryProfile, ShareLink, StudioStyle, Visibility, utc_now
from ..prompt_memory_ops import (
    build_prompt_memory_context,
    derive_display_title,
    derive_prompt_tags,
    update_prompt_memory_profile,
)
from ..style_library import STYLE_CATALOG, serialize_style_catalog_entry

if TYPE_CHECKING:
    from ..service import StudioService

logger = logging.getLogger(__name__)


class LibraryService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    def serialize_asset(
        self,
        asset: MediaAsset,
        *,
        identity_id: str | None = None,
        share_id: str | None = None,
        share_token: str | None = None,
        public_preview: bool = False,
        allow_clean_export: bool = False,
    ) -> Dict[str, Any]:
        protection_state = self.asset_protection_state(asset)
        library_state = self.asset_library_state(asset)
        preview_url = self.service.build_asset_delivery_url(
            asset.id,
            variant="preview",
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        )
        payload = asset.model_dump(
            mode="json",
            exclude={"local_path"},
        )
        payload["metadata"] = {
            key: value
            for key, value in asset.metadata.items()
            if key not in {
                "storage_backend",
                "storage_key",
                "thumbnail_storage_key",
                "thumbnail_path",
                "clean_storage_key",
                "clean_path",
                "clean_mime_type",
                "blocked_preview_storage_key",
                "blocked_preview_path",
                "protection_signature",
            }
        }
        payload["url"] = self.service.build_asset_delivery_url(
            asset.id,
            variant="content",
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        )
        payload["thumbnail_url"] = (
            self.service.build_asset_delivery_url(
                asset.id,
                variant="thumbnail",
                identity_id=identity_id,
                share_id=share_id,
                share_token=share_token,
                public_preview=public_preview,
            )
            if self.asset_variant_exists(asset, "thumbnail")
            else None
        )
        payload["preview_url"] = preview_url
        payload["blocked_preview_url"] = (
            self.service.build_asset_delivery_url(
                asset.id,
                variant="blocked",
                identity_id=identity_id,
                share_id=share_id,
                share_token=share_token,
                public_preview=public_preview,
            )
            if protection_state == "blocked"
            else None
        )
        payload["display_title"] = self.asset_display_title(asset)
        payload["derived_tags"] = self.asset_derived_tags(asset)
        payload["library_state"] = library_state
        payload["protection_state"] = protection_state
        payload["can_open"] = library_state != "blocked" and self.asset_has_renderable_variant(asset)
        payload["can_export_clean"] = bool(
            allow_clean_export
            and identity_id == asset.identity_id
            and protection_state != "blocked"
            and self.asset_variant_exists(asset, "clean")
        )
        return payload

    def serialize_assets(
        self,
        assets: list[MediaAsset],
        *,
        identity_id: str | None = None,
        share_id: str | None = None,
        share_token: str | None = None,
        public_preview: bool = False,
        allow_clean_export: bool = False,
    ) -> list[Dict[str, Any]]:
        return [
            self.serialize_asset(
                asset,
                identity_id=identity_id,
                share_id=share_id,
                share_token=share_token,
                public_preview=public_preview,
                allow_clean_export=allow_clean_export,
            )
            for asset in assets
        ]

    def build_asset_delivery_url(
        self,
        asset_id: str,
        *,
        variant: str,
        identity_id: str | None = None,
        share_id: str | None = None,
        share_token: str | None = None,
        public_preview: bool = False,
    ) -> str:
        token = self.create_asset_delivery_token(
            asset_id=asset_id,
            variant=variant,
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        )
        if variant == "thumbnail":
            endpoint = "thumbnail"
        elif variant == "preview":
            endpoint = "preview"
        elif variant == "blocked":
            endpoint = "blocked-preview"
        else:
            endpoint = "content"
        return f"/v1/assets/{asset_id}/{endpoint}?token={token}"

    def create_asset_delivery_token(
        self,
        *,
        asset_id: str,
        variant: str,
        identity_id: str | None,
        share_id: str | None = None,
        share_token: str | None = None,
        public_preview: bool = False,
    ) -> str:
        expires_at = utc_now() + timedelta(seconds=self.service._asset_token_ttl_seconds)
        payload = {
            "sub": "asset-delivery",
            "asset_id": asset_id,
            "variant": variant,
            "identity_id": identity_id,
            "share_id": share_id,
            "share_token": share_token,
            "public_preview": public_preview,
            "exp": expires_at,
            "iat": utc_now(),
        }
        return jwt.encode(payload, self.service._asset_token_secret, algorithm="HS256")

    def verify_asset_delivery_token(self, token: str, *, asset_id: str, variant: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(token, self.service._asset_token_secret, algorithms=["HS256"])
        except jwt.InvalidTokenError as exc:
            raise PermissionError("Invalid asset token") from exc

        if payload.get("sub") != "asset-delivery":
            raise PermissionError("Invalid asset token")
        if payload.get("asset_id") != asset_id:
            raise PermissionError("Asset token mismatch")
        if payload.get("variant") != variant:
            raise PermissionError("Asset variant mismatch")
        if (
            not payload.get("identity_id")
            and not payload.get("share_id")
            and not payload.get("share_token")
            and not payload.get("public_preview")
        ):
            raise PermissionError("Asset token missing scope")
        return payload

    def resolve_asset_variant_path(self, asset: MediaAsset, variant: str) -> Path | None:
        if variant == "content":
            if not asset.local_path:
                return None
            return Path(asset.local_path)
        if variant == "clean":
            clean_path = asset.metadata.get("clean_path")
            if clean_path:
                return Path(str(clean_path))
            return None
        if variant == "blocked":
            blocked_path = asset.metadata.get("blocked_preview_path")
            if blocked_path:
                return Path(str(blocked_path))
            return None

        thumb_path = asset.metadata.get("thumbnail_path")
        if thumb_path:
            return Path(str(thumb_path))

        if asset.thumbnail_url:
            parsed = urlparse(asset.thumbnail_url)
            name = Path(parsed.path).name
            if name:
                return self.service.media_dir / name
        return None

    def resolve_asset_variant_storage_key(self, asset: MediaAsset, variant: str) -> str | None:
        if variant == "content":
            return asset.metadata.get("storage_key")
        if variant == "clean":
            return asset.metadata.get("clean_storage_key")
        if variant == "blocked":
            return asset.metadata.get("blocked_preview_storage_key")
        return asset.metadata.get("thumbnail_storage_key")

    def resolve_asset_variant_mime_type(self, asset: MediaAsset, variant: str, name: str) -> str:
        if variant == "blocked":
            return "image/jpeg"
        if variant == "clean":
            explicit_clean = asset.metadata.get("clean_mime_type")
            if explicit_clean:
                return str(explicit_clean)
        if variant == "content":
            explicit = asset.metadata.get("mime_type")
            if explicit:
                return str(explicit)
        guessed, _ = mimetypes.guess_type(name)
        if guessed:
            return guessed
        if variant == "thumbnail":
            return "image/jpeg"
        return "image/png"

    def asset_display_title(self, asset: MediaAsset) -> str:
        stored = asset.metadata.get("display_title")
        if isinstance(stored, str) and stored.strip():
            return stored.strip()[:72]
        generated = asset.metadata.get("generation_title")
        if isinstance(generated, str) and generated.strip():
            return generated.strip()[:72]
        return derive_display_title(asset.prompt, fallback=asset.title or "Untitled image set")

    def asset_derived_tags(self, asset: MediaAsset) -> list[str]:
        stored = asset.metadata.get("derived_tags")
        if isinstance(stored, list):
            return [str(tag).strip() for tag in stored if str(tag).strip()][:8]
        negative_prompt = str(asset.metadata.get("negative_prompt") or "")
        return derive_prompt_tags(asset.prompt, negative_prompt)

    def asset_protection_state(self, asset: MediaAsset) -> str:
        raw = str(asset.metadata.get("protection_state") or "").strip().lower()
        if raw in {"protected", "blocked"}:
            return raw
        return "protected"

    def asset_library_state(self, asset: MediaAsset) -> str:
        raw = str(asset.metadata.get("library_state") or "").strip().lower()
        if raw in {"ready", "blocked", "failed", "generating"}:
            return raw
        if self.asset_protection_state(asset) == "blocked":
            return "blocked"
        return "ready"

    def generation_library_state(self, job: GenerationJob) -> str:
        normalized = JobStatus.coerce(job.status)
        if normalized in {JobStatus.QUEUED, JobStatus.RUNNING}:
            return "generating"
        if normalized == JobStatus.SUCCEEDED:
            return "ready"
        if (job.error_code or "").strip().lower() in {"policy_blocked", "safety_block", "policy_review"}:
            return "blocked"
        return "failed"

    def is_demo_placeholder_asset(self, asset: MediaAsset) -> bool:
        provider = str(asset.metadata.get("provider") or "").strip().lower()
        return provider == "demo"

    def is_truthful_surface_asset(self, asset: MediaAsset) -> bool:
        return not self.is_demo_placeholder_asset(asset) and self.asset_has_renderable_variant(asset)

    def is_public_share_eligible_asset(self, asset: MediaAsset) -> bool:
        return (
            asset.deleted_at is None
            and self.is_truthful_surface_asset(asset)
            and self.asset_protection_state(asset) != "blocked"
            and self.asset_library_state(asset) != "blocked"
        )

    def is_project_share_eligible_asset(self, asset: MediaAsset) -> bool:
        return self.is_public_share_eligible_asset(asset)

    def asset_has_renderable_variant(self, asset: MediaAsset) -> bool:
        return self.asset_variant_exists(asset, "thumbnail") or self.asset_variant_exists(asset, "content")

    def asset_variant_exists(self, asset: MediaAsset, variant: str) -> bool:
        if variant in {"preview", "blocked"}:
            return self.asset_has_renderable_variant(asset)
        if self.resolve_asset_variant_storage_key(asset, variant):
            return True
        path = self.resolve_asset_variant_path(asset, variant)
        return path is not None and path.exists()

    async def delete_asset_variant(self, asset: MediaAsset, variant: str) -> None:
        storage_key = self.resolve_asset_variant_storage_key(asset, variant)
        storage_kind = str(asset.metadata.get("storage_backend") or "").strip().lower()
        if storage_key and storage_kind:
            backend = self.service.asset_storage.get(storage_kind)
            await backend.delete_bytes(storage_key)
            return

        path = self.resolve_asset_variant_path(asset, variant)
        if path and path.exists():
            await asyncio.to_thread(path.unlink)

    async def purge_asset_storage(self, asset: MediaAsset) -> None:
        if self.asset_variant_exists(asset, "content"):
            await self.delete_asset_variant(asset, "content")
        if self.asset_variant_exists(asset, "thumbnail"):
            await self.delete_asset_variant(asset, "thumbnail")

    async def resolve_asset_delivery(self, asset_id: str, token: str, variant: str) -> ResolvedAssetDelivery:
        try:
            claims = self.verify_asset_delivery_token(token, asset_id=asset_id, variant=variant)
        except PermissionError as exc:
            self.service._log_security_event(
                "asset_access_denied",
                level=logging.WARNING,
                asset_id=asset_id,
                scope="token",
                reason_code=self.service._normalize_reason_code(str(exc), fallback="invalid_asset_token"),
            )
            raise
        asset = await self.service.store.get_model("assets", asset_id, MediaAsset)
        if asset is None:
            raise KeyError("Asset not found")
        if asset.deleted_at is not None:
            self.service._log_security_event(
                "asset_access_denied",
                level=logging.WARNING,
                asset_id=asset.id,
                scope="deleted_asset",
                reason_code="asset_deleted",
            )
            raise PermissionError("Asset is no longer available")

        try:
            if claims.get("share_id"):
                await self.assert_share_access_by_id(asset, str(claims["share_id"]))
            elif claims.get("share_token"):
                await self.assert_share_access_by_public_token(asset, str(claims["share_token"]))
            elif claims.get("public_preview"):
                await self.assert_public_asset_preview_access(asset.id)
            elif claims.get("identity_id") != asset.identity_id:
                raise PermissionError("Asset access denied")
        except PermissionError as exc:
            scope = "owner"
            if claims.get("share_id"):
                scope = "share"
            elif claims.get("share_token"):
                scope = "share_legacy"
            elif claims.get("public_preview"):
                scope = "public_preview"
            self.service._log_security_event(
                "asset_access_denied",
                level=logging.WARNING,
                asset_id=asset.id,
                identity_id=claims.get("identity_id"),
                share_id=claims.get("share_id"),
                scope=scope,
                reason_code=self.service._normalize_reason_code(str(exc), fallback="asset_access_denied"),
            )
            raise

        return await self.resolve_asset_variant_delivery(asset, variant)

    async def resolve_clean_asset_export(self, asset_id: str, identity_id: str) -> ResolvedAssetDelivery:
        asset = await self.service.store.get_model("assets", asset_id, MediaAsset)
        if asset is None:
            raise KeyError("Asset not found")
        if asset.deleted_at is not None:
            raise PermissionError("Asset is no longer available")
        if asset.identity_id != identity_id:
            raise PermissionError("Clean export is only available to the asset owner")
        if self.asset_protection_state(asset) == "blocked" or self.asset_library_state(asset) == "blocked":
            raise PermissionError("Clean export is not available for blocked assets")

        identity = await self.service.get_identity(identity_id)
        billing_state = await self.service._resolve_billing_state_for_identity(identity)
        ensure_clean_export_allowed(
            identity=identity,
            plan_catalog=self.service.plan_catalog,
            billing_state=billing_state,
        )
        if not self.asset_variant_exists(asset, "clean"):
            raise FileNotFoundError("Clean export is not available for this asset")

        return await self.resolve_stored_asset_variant_delivery(asset, "clean")

    async def resolve_asset_variant_delivery(self, asset: MediaAsset, variant: str) -> ResolvedAssetDelivery:
        if variant == "preview":
            if self.asset_library_state(asset) == "blocked":
                return await self.resolve_blocked_asset_preview_delivery(asset)
            fallback_variant = "thumbnail" if self.asset_variant_exists(asset, "thumbnail") else "content"
            return await self.resolve_stored_asset_variant_delivery(asset, fallback_variant)
        if variant == "blocked":
            return await self.resolve_blocked_asset_preview_delivery(asset)
        if self.asset_library_state(asset) == "blocked":
            raise PermissionError("Blocked assets can only be viewed through protected preview")
        return await self.resolve_stored_asset_variant_delivery(asset, variant)

    async def resolve_stored_asset_variant_delivery(self, asset: MediaAsset, variant: str) -> ResolvedAssetDelivery:
        storage_key = self.resolve_asset_variant_storage_key(asset, variant)
        storage_kind = str(asset.metadata.get("storage_backend") or "").strip().lower()
        if storage_key and storage_kind:
            backend = self.service.asset_storage.get(storage_kind)
            content = await backend.fetch_bytes(storage_key)
            return ResolvedAssetDelivery(
                filename=Path(storage_key).name,
                media_type=self.resolve_asset_variant_mime_type(asset, variant, storage_key),
                content=content,
            )

        path = self.resolve_asset_variant_path(asset, variant)
        if path is None or not path.exists():
            raise FileNotFoundError("Asset file not found")

        return ResolvedAssetDelivery(
            filename=path.name,
            media_type=self.resolve_asset_variant_mime_type(asset, variant, path.name),
            local_path=path,
        )

    async def resolve_blocked_asset_preview_delivery(self, asset: MediaAsset) -> ResolvedAssetDelivery:
        if not self.asset_has_renderable_variant(asset):
            raise FileNotFoundError("Blocked preview is not available for this asset")

        source_variant = "thumbnail" if self.asset_variant_exists(asset, "thumbnail") else "content"
        source_delivery = await self.resolve_stored_asset_variant_delivery(asset, source_variant)
        if source_delivery.local_path is not None:
            source_bytes = await asyncio.to_thread(source_delivery.local_path.read_bytes)
        else:
            source_bytes = source_delivery.content or b""
        if not source_bytes:
            raise FileNotFoundError("Blocked preview is not available for this asset")

        blocked_bytes = await asyncio.to_thread(self.build_blocked_preview_bytes, source_bytes)
        return ResolvedAssetDelivery(
            filename=f"{asset.id}_blocked_preview.jpg",
            media_type="image/jpeg",
            content=blocked_bytes,
        )

    def build_blocked_preview_bytes(self, source_bytes: bytes) -> bytes:
        with Image.open(io.BytesIO(source_bytes)) as image:
            preview = image.convert("RGB")
            preview = preview.filter(ImageFilter.GaussianBlur(radius=18))
            overlay = Image.new("RGBA", preview.size, (9, 10, 16, 0))
            draw = ImageDraw.Draw(overlay)
            width, height = preview.size
            panel_height = max(58, int(height * 0.18))
            draw.rectangle((0, height - panel_height, width, height), fill=(6, 7, 11, 170))
            text = "BLOCKED PREVIEW"
            font_size = max(20, min(38, int(min(width, height) * 0.05)))
            try:
                from PIL import ImageFont

                font = ImageFont.truetype("DejaVuSans.ttf", font_size)
            except Exception:
                from PIL import ImageFont

                font = ImageFont.load_default()
            draw.text((24, height - panel_height + 16), text, fill=(255, 255, 255, 220), font=font)
            composed = Image.alpha_composite(preview.convert("RGBA"), overlay).convert("RGB")
            buffer = io.BytesIO()
            composed.save(buffer, format="JPEG", quality=88)
            return buffer.getvalue()

    def assert_share_record_matches_asset(self, asset: MediaAsset, share: ShareLink) -> None:
        if share.revoked_at is not None:
            raise PermissionError("Share access denied")
        if share.expires_at and share.expires_at < utc_now():
            raise PermissionError("Share link expired")
        if share.asset_id:
            if share.asset_id != asset.id or share.identity_id != asset.identity_id:
                raise PermissionError("Share access denied")
            if not self.is_public_share_eligible_asset(asset):
                raise PermissionError("Share access denied")
            return
        if share.project_id:
            if share.project_id != asset.project_id or share.identity_id != asset.identity_id:
                raise PermissionError("Share access denied")
            if not self.is_project_share_eligible_asset(asset):
                raise PermissionError("Share access denied")

    async def assert_share_access_by_id(self, asset: MediaAsset, share_id: str) -> None:
        share = await self.service.store.get_share(share_id)
        if share is None:
            raise PermissionError("Share access denied")
        if share.project_id and not share.asset_id:
            project = await self.service.store.get_project(share.project_id)
            if project is None or project.identity_id != share.identity_id:
                raise PermissionError("Share access denied")
        self.assert_share_record_matches_asset(asset, share)

    async def assert_share_access_by_public_token(self, asset: MediaAsset, share_token: str) -> None:
        share = await self.service.store.get_share_by_public_token(
            share_token,
            secret=self.service._asset_token_secret,
        )
        if share is None:
            raise PermissionError("Share access denied")
        if share.project_id and not share.asset_id:
            project = await self.service.store.get_project(share.project_id)
            if project is None or project.identity_id != share.identity_id:
                raise PermissionError("Share access denied")
        self.assert_share_record_matches_asset(asset, share)

    async def assert_public_asset_preview_access(self, asset_id: str) -> None:
        posts = await self.service.store.list_posts()
        identities = await self.service.store.list_identities()
        generations = await self.service.store.list_generations()
        identities_by_id = {identity.id: identity for identity in identities}
        generations_by_id = {generation.id: generation for generation in generations}
        for post in posts:
            if post.visibility != Visibility.PUBLIC:
                continue
            if self.service.public.should_hide_post_from_public(
                post,
                identity=identities_by_id.get(post.identity_id),
                generations_by_id=generations_by_id,
            ):
                continue
            if not self.service.public.is_publicly_showcase_ready_post(post):
                continue
            if asset_id in post.asset_ids or asset_id == post.cover_asset_id:
                return
        raise PermissionError("Public preview access denied")

    async def list_assets(
        self,
        identity_id: str,
        project_id: str | None = None,
        include_deleted: bool = False,
    ) -> list[MediaAsset]:
        assets = await self.service.store.list_assets()
        filtered = [
            asset
            for asset in assets
            if asset.identity_id == identity_id and (include_deleted or asset.deleted_at is None)
        ]
        if project_id:
            filtered = [asset for asset in filtered if asset.project_id == project_id]
        return sorted(filtered, key=lambda item: item.created_at, reverse=True)

    async def can_identity_clean_export(self, identity_id: str) -> bool:
        identity = await self.service.get_identity(identity_id)
        billing_state = await self.service._resolve_billing_state_for_identity(identity)
        entitlements = resolve_entitlements(
            identity=identity,
            plan_catalog=self.service.plan_catalog,
            billing_state=billing_state,
        )
        return bool(entitlements.can_clean_export)

    async def list_styles(self, identity_id: str) -> Dict[str, Any]:
        await self.service.get_identity(identity_id)
        saved_styles = await self.service.store.list_styles_for_identity(identity_id)
        saved_by_source = {
            style.source_style_id: style
            for style in saved_styles
            if style.source_style_id
        }
        catalog = [
            serialize_style_catalog_entry(entry, saved_style=saved_by_source.get(str(entry["id"])))
            for entry in STYLE_CATALOG
        ]
        my_styles = [self.serialize_style(style) for style in saved_styles]
        return {
            "catalog": catalog,
            "my_styles": my_styles,
            "favorites": [style["id"] for style in my_styles if style["favorite"]],
        }

    async def save_style(
        self,
        identity_id: str,
        *,
        title: str,
        prompt_modifier: str,
        description: str = "",
        category: str = "custom",
        preview_image_url: str | None = None,
        source_kind: str = "saved",
        source_style_id: str | None = None,
        favorite: bool = False,
    ) -> StudioStyle:
        await self.service.get_identity(identity_id)
        normalized_title = title.strip()[:72]
        normalized_modifier = " ".join(prompt_modifier.strip().split())
        if not normalized_title:
            raise ValueError("Style title is required")
        if not normalized_modifier:
            raise ValueError("Style modifier is required")

        existing_styles = await self.service.store.list_styles_for_identity(identity_id)
        for existing in existing_styles:
            if existing.source_style_id and source_style_id and existing.source_style_id == source_style_id:
                if favorite != existing.favorite:
                    existing.favorite = favorite
                    existing.updated_at = utc_now()
                    await self.service.store.save_model("styles", existing)
                return existing

        style = StudioStyle(
            identity_id=identity_id,
            title=normalized_title,
            prompt_modifier=normalized_modifier,
            description=description.strip(),
            category=category.strip() or "custom",
            preview_image_url=preview_image_url,
            source_kind=source_kind if source_kind in {"catalog", "saved", "prompt"} else "saved",
            source_style_id=source_style_id,
            favorite=favorite,
        )
        await self.service.store.save_model("styles", style)
        return style

    async def update_style(
        self,
        identity_id: str,
        style_id: str,
        *,
        favorite: bool | None = None,
    ) -> StudioStyle:
        style = await self.service.store.get_style(style_id)
        if style is None or style.identity_id != identity_id:
            raise KeyError("Style not found")
        if favorite is not None:
            style.favorite = favorite
        style.updated_at = utc_now()
        await self.service.store.save_model("styles", style)
        return style

    async def save_style_from_prompt(
        self,
        identity_id: str,
        *,
        prompt: str,
        title: str | None = None,
        category: str = "custom",
    ) -> StudioStyle:
        return await self.save_style(
            identity_id,
            title=title or derive_display_title(prompt, fallback="Saved Style"),
            prompt_modifier=prompt,
            description="Saved from Studio prompt",
            category=category,
            source_kind="prompt",
            favorite=False,
        )

    def serialize_style(self, style: StudioStyle) -> Dict[str, Any]:
        return style.model_dump(mode="json")

    async def get_prompt_memory_profile_payload(self, identity_id: str) -> Dict[str, Any]:
        await self.service.get_identity(identity_id)
        profile = await self.service.store.get_prompt_memory_for_identity(identity_id)
        if profile is None:
            profile = PromptMemoryProfile(identity_id=identity_id)
        payload = profile.model_dump(mode="json")
        payload["context_summary"] = build_prompt_memory_context(profile)
        return payload

    async def record_prompt_memory_signal(
        self,
        *,
        identity_id: str,
        prompt: str,
        negative_prompt: str = "",
        model_id: str | None = None,
        aspect_ratio: str | None = None,
        improved: bool = False,
        flagged: bool = False,
    ) -> PromptMemoryProfile:
        now = utc_now()
        existing = await self.service.store.get_prompt_memory_for_identity(identity_id)
        recent_hourly_generation_count = 0
        if not improved:
            recent_hourly_generation_count = (
                await self.service.store.count_recent_generation_requests_for_identity(
                    identity_id,
                    since=now - timedelta(hours=1),
                )
            ) + 1
        profile = update_prompt_memory_profile(
            existing,
            identity_id=identity_id,
            prompt=prompt,
            negative_prompt=negative_prompt,
            model_id=model_id,
            aspect_ratio=aspect_ratio,
            improved=improved,
            flagged=flagged,
            recent_hourly_generation_count=recent_hourly_generation_count,
            now=now,
        )
        await self.service.store.save_model("prompt_memories", profile)
        return profile

    async def export_project(self, identity_id: str, project_id: str) -> ResolvedAssetDelivery:
        project = await self.service.require_owned_model("projects", project_id, Project, identity_id)
        assets = [
            asset
            for asset in await self.service.list_assets(identity_id, project_id=project_id, include_deleted=False)
            if self.asset_library_state(asset) == "ready"
        ]
        if not assets:
            raise ValueError("Project has no exportable images yet")

        identity = await self.service.get_identity(identity_id)
        billing_state = await self.service._resolve_billing_state_for_identity(identity)
        ensure_clean_export_allowed(
            identity=identity,
            plan_catalog=self.service.plan_catalog,
            billing_state=billing_state,
        )

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for index, asset in enumerate(assets, start=1):
                if not self.asset_variant_exists(asset, "clean"):
                    continue
                delivery = await self.service.resolve_clean_asset_export(asset.id, identity_id)
                if delivery.local_path is not None:
                    content = await asyncio.to_thread(delivery.local_path.read_bytes)
                else:
                    content = delivery.content or b""
                extension = Path(delivery.filename).suffix or ".png"
                safe_name = re.sub(
                    r"[^a-zA-Z0-9._-]+",
                    "-",
                    self.asset_display_title(asset).strip().lower(),
                ).strip("-")
                archive.writestr(f"{index:02d}-{safe_name or asset.id}{extension}", content)

        return ResolvedAssetDelivery(
            filename=f"{re.sub(r'[^a-zA-Z0-9._-]+', '-', project.title.strip().lower()).strip('-') or project.id}.zip",
            media_type="application/zip",
            content=buffer.getvalue(),
        )

    async def rename_asset(self, identity_id: str, asset_id: str, title: str) -> MediaAsset:
        asset = await self.service.require_owned_model("assets", asset_id, MediaAsset, identity_id)
        next_title = title.strip()[:72]
        if not next_title:
            raise ValueError("Title is required")

        def mutation(state) -> None:
            rename_asset_in_state(state=state, asset_id=asset.id, title=next_title)

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def trash_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        asset = await self.service.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        def mutation(state) -> None:
            trash_asset_in_state(state=state, asset_id=asset.id, now=utc_now())

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def restore_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        asset = await self.service.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        def mutation(state) -> None:
            restore_asset_in_state(state=state, asset_id=asset.id)

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def permanently_delete_asset(self, identity_id: str, asset_id: str) -> Dict[str, Any]:
        asset = await self.service.require_owned_model("assets", asset_id, MediaAsset, identity_id)
        await self.purge_asset_storage(asset)

        def mutation(state) -> None:
            permanently_remove_asset_from_state(state=state, asset=asset, now=utc_now())

        await self.service.store.mutate(mutation)
        return {"asset_id": asset.id, "status": "deleted"}

    async def empty_trash(self, identity_id: str) -> Dict[str, Any]:
        trashed_assets = [
            asset
            for asset in await self.service.list_assets(identity_id, include_deleted=True)
            if asset.deleted_at is not None
        ]

        for asset in trashed_assets:
            await self.purge_asset_storage(asset)

        def mutation(state) -> None:
            empty_trash_in_state(state=state, trashed_assets=trashed_assets, now=utc_now())

        await self.service.store.mutate(mutation)
        return {"status": "deleted", "deleted_count": len(trashed_assets)}
