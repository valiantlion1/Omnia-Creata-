from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any, Dict, Optional

from ..entitlement_ops import resolve_entitlements
from ..generation_ops import infer_style_tags
from ..models import GenerationJob, JobStatus, ManualReviewState, MediaAsset, OmniaIdentity, Project, PublicPost, ShareLink, StudioState, Visibility, utc_now
from ..share_ops import build_public_share_payload, build_share_token_preview, create_share_record

if TYPE_CHECKING:
    from ..service import StudioService

logger = logging.getLogger(__name__)


class PublicService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    def serialize_public_project(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        project = Project.model_validate(payload)
        return {
            "title": project.title,
            "description": project.description,
            "surface": project.surface,
            "created_at": project.created_at.isoformat(),
            "updated_at": project.updated_at.isoformat(),
        }

    def backfill_posts_locked(self, state: StudioState) -> None:
        for generation in state.generations.values():
            if generation.status != JobStatus.SUCCEEDED:
                continue
            if generation.id in state.posts:
                continue

            identity = state.identities.get(generation.identity_id)
            if identity is None:
                continue

            asset_ids = [
                output.asset_id
                for output in generation.outputs
                if output.asset_id in state.assets and state.assets[output.asset_id].deleted_at is None
            ]
            if not asset_ids:
                asset_ids = [
                    asset.id
                    for asset in state.assets.values()
                    if asset.identity_id == generation.identity_id
                    and asset.project_id == generation.project_id
                    and asset.deleted_at is None
                    and str(asset.metadata.get("generation_id") or "") == generation.id
                ]
            if not asset_ids:
                continue

            state.posts[generation.id] = PublicPost(
                id=generation.id,
                workspace_id=generation.workspace_id,
                project_id=generation.project_id,
                identity_id=generation.identity_id,
                owner_username=identity.username or identity.email.split("@")[0],
                owner_display_name=identity.display_name,
                title=generation.title,
                prompt=generation.prompt_snapshot.prompt,
                cover_asset_id=asset_ids[0],
                asset_ids=asset_ids,
                visibility=identity.default_visibility,
                style_tags=infer_style_tags(generation),
                liked_by=[],
                created_at=generation.created_at,
                updated_at=generation.updated_at,
            )

    def normalize_public_posts_locked(self, state: StudioState) -> None:
        now = utc_now()
        generations_by_id = state.generations
        assets_by_id = state.assets
        for post in state.posts.values():
            identity = state.identities.get(post.identity_id)
            changed = False
            next_username = self.identity_public_username(identity, fallback=post.owner_username)
            next_display_name = self.identity_public_display_name(identity, fallback=post.owner_display_name)
            if post.owner_username != next_username:
                post.owner_username = next_username
                changed = True
            if post.owner_display_name != next_display_name:
                post.owner_display_name = next_display_name
                changed = True
            if post.visibility == Visibility.PUBLIC:
                if self.should_hide_post_from_public(
                    post,
                    identity=identity,
                    generations_by_id=generations_by_id,
                ) or not self.is_publicly_showcase_ready_post(post):
                    post.visibility = Visibility.PRIVATE
                    changed = True
                elif not self.visible_post_assets(
                    assets_by_id,
                    post,
                    public_preview=True,
                ):
                    post.visibility = Visibility.PRIVATE
                    changed = True
            if changed:
                post.updated_at = now

    def visible_post_assets(
        self,
        assets_by_id: Dict[str, MediaAsset],
        post: PublicPost,
        *,
        public_preview: bool = False,
    ) -> list[MediaAsset]:
        ordered_asset_ids: list[str] = []
        if post.cover_asset_id:
            ordered_asset_ids.append(post.cover_asset_id)
        ordered_asset_ids.extend(post.asset_ids)
        visible_assets: list[MediaAsset] = []
        seen_asset_ids: set[str] = set()
        for asset_id in ordered_asset_ids:
            if asset_id in seen_asset_ids or asset_id not in assets_by_id:
                continue
            seen_asset_ids.add(asset_id)
            asset = assets_by_id[asset_id]
            if public_preview:
                if self.service.library.is_public_share_eligible_asset(asset):
                    visible_assets.append(asset)
                continue
            if asset.deleted_at is None and self.service.library.is_truthful_surface_asset(asset):
                visible_assets.append(asset)
        return visible_assets

    def post_preview_assets(
        self,
        assets_by_id: Dict[str, MediaAsset],
        post: PublicPost,
        *,
        identity_id: str | None = None,
        public_preview: bool = False,
    ) -> list[Dict[str, Any]]:
        visible_assets = self.visible_post_assets(
            assets_by_id,
            post,
            public_preview=public_preview,
        )
        return self.service.library.serialize_assets(
            visible_assets[:4],
            identity_id=identity_id,
            public_preview=public_preview,
        )

    def serialize_post(
        self,
        post: PublicPost,
        *,
        assets_by_id: Dict[str, MediaAsset],
        identities_by_id: Dict[str, OmniaIdentity] | None = None,
        viewer_identity_id: str | None = None,
        public_preview: bool = False,
    ) -> Dict[str, Any]:
        visible_assets = self.visible_post_assets(
            assets_by_id,
            post,
            public_preview=public_preview,
        )
        cover_asset = assets_by_id.get(post.cover_asset_id or "")
        if public_preview:
            if cover_asset is None or not self.service.library.is_public_share_eligible_asset(cover_asset):
                cover_asset = visible_assets[0] if visible_assets else None
        elif cover_asset is None or cover_asset.deleted_at is not None or not self.service.library.is_truthful_surface_asset(cover_asset):
            cover_asset = visible_assets[0] if visible_assets else None
        identity = identities_by_id.get(post.identity_id) if identities_by_id else None
        return {
            "id": post.id,
            "owner_username": self.identity_public_username(identity, fallback=post.owner_username),
            "owner_display_name": self.identity_public_display_name(identity, fallback=post.owner_display_name),
            "title": post.title,
            "prompt": post.prompt,
            "cover_asset": self.service.library.serialize_asset(
                cover_asset,
                identity_id=viewer_identity_id,
                public_preview=public_preview,
            )
            if cover_asset and cover_asset.deleted_at is None and self.service.library.is_truthful_surface_asset(cover_asset)
            else None,
            "preview_assets": self.post_preview_assets(
                assets_by_id,
                post,
                identity_id=viewer_identity_id,
                public_preview=public_preview,
            ),
            "visibility": post.visibility.value,
            "like_count": len(post.liked_by),
            "viewer_has_liked": bool(viewer_identity_id and viewer_identity_id in post.liked_by),
            "created_at": post.created_at.isoformat(),
            "project_id": None if public_preview else post.project_id,
            "style_tags": post.style_tags,
        }

    async def get_post(self, post_id: str) -> PublicPost:
        post = await self.service.store.get_model("posts", post_id, PublicPost)
        if post is None:
            raise KeyError("Post not found")
        return post

    async def owned_post(self, identity_id: str, post_id: str) -> PublicPost:
        post = await self.get_post(post_id)
        if post.identity_id != identity_id:
            raise KeyError("Post not found")
        return post

    async def list_public_posts(
        self,
        *,
        sort: str = "trending",
        viewer_identity_id: str | None = None,
    ) -> list[Dict[str, Any]]:
        posts = await self.service.store.list_posts()
        assets = await self.service.store.list_assets()
        identities = await self.service.store.list_identities()
        generations = await self.service.store.list_generations()
        assets_by_id = {asset.id: asset for asset in assets}
        identities_by_id = {identity.id: identity for identity in identities}
        generations_by_id = {generation.id: generation for generation in generations}

        public_posts: list[PublicPost] = []
        for post in posts:
            if post.visibility != Visibility.PUBLIC:
                continue
            if self.should_hide_post_from_public(
                post,
                identity=identities_by_id.get(post.identity_id),
                generations_by_id=generations_by_id,
            ):
                continue
            if not self.is_publicly_showcase_ready_post(post):
                continue
            preview_assets = self.visible_post_assets(
                assets_by_id,
                post,
                public_preview=True,
            )
            if not preview_assets:
                continue
            public_posts.append(post)

        if sort == "newest":
            public_posts.sort(key=lambda item: item.created_at, reverse=True)
        elif sort == "top":
            public_posts.sort(key=lambda item: (len(item.liked_by), item.created_at), reverse=True)
        elif sort == "styles":
            public_posts.sort(key=lambda item: (len(item.style_tags), len(item.liked_by), item.created_at), reverse=True)
        else:
            public_posts.sort(
                key=lambda item: (len(item.liked_by) * 5 + len(item.style_tags) * 2, item.created_at),
                reverse=True,
            )

        deduped_posts: list[PublicPost] = []
        seen_keys: set[str] = set()
        for post in public_posts:
            dedupe_key = self.public_feed_dedupe_key(post)
            if dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)
            deduped_posts.append(post)

        return [
            self.serialize_post(
                post,
                assets_by_id=assets_by_id,
                identities_by_id=identities_by_id,
                viewer_identity_id=viewer_identity_id,
                public_preview=True,
            )
            for post in deduped_posts
        ]

    async def list_liked_posts(self, identity_id: str) -> list[Dict[str, Any]]:
        await self.service.get_identity(identity_id)
        posts = await self.service.store.list_posts()
        assets = await self.service.store.list_assets()
        identities = await self.service.store.list_identities()
        generations = await self.service.store.list_generations()
        assets_by_id = {asset.id: asset for asset in assets}
        identities_by_id = {identity.id: identity for identity in identities}
        generations_by_id = {generation.id: generation for generation in generations}

        liked_posts: list[PublicPost] = []
        for post in posts:
            if identity_id not in post.liked_by:
                continue
            if post.visibility != Visibility.PUBLIC:
                continue
            if self.should_hide_post_from_public(
                post,
                identity=identities_by_id.get(post.identity_id),
                generations_by_id=generations_by_id,
            ):
                continue
            if not self.is_publicly_showcase_ready_post(post):
                continue
            if not self.visible_post_assets(
                assets_by_id,
                post,
                public_preview=True,
            ):
                continue
            liked_posts.append(post)

        liked_posts.sort(
            key=lambda item: (item.updated_at, item.created_at),
            reverse=True,
        )

        return [
            self.serialize_post(
                post,
                assets_by_id=assets_by_id,
                identities_by_id=identities_by_id,
                viewer_identity_id=identity_id,
                public_preview=True,
            )
            for post in liked_posts
        ]

    async def get_profile_payload(
        self,
        *,
        username: str | None = None,
        identity_id: str | None = None,
        viewer_identity_id: str | None = None,
    ) -> Dict[str, Any]:
        return await self.service.identity.get_profile_payload(
            username=username,
            identity_id=identity_id,
            viewer_identity_id=viewer_identity_id,
        )

    async def update_profile(
        self,
        identity_id: str,
        *,
        display_name: str | None = None,
        bio: str | None = None,
        default_visibility: Visibility | None = None,
        featured_asset_id: str | None = None,
        featured_asset_id_provided: bool = False,
    ) -> OmniaIdentity:
        return await self.service.identity.update_profile(
            identity_id=identity_id,
            display_name=display_name,
            bio=bio,
            default_visibility=default_visibility,
            featured_asset_id=featured_asset_id,
            featured_asset_id_provided=featured_asset_id_provided,
        )

    async def get_post_payload(
        self,
        post_id: str,
        *,
        viewer_identity_id: str | None = None,
    ) -> Dict[str, Any]:
        post = await self.get_post(post_id)
        assets = await self.service.store.list_assets()
        identities = await self.service.store.list_identities()
        generations = await self.service.store.list_generations()
        assets_by_id = {asset.id: asset for asset in assets}
        identities_by_id = {identity.id: identity for identity in identities}
        generations_by_id = {generation.id: generation for generation in generations}
        if post.visibility != Visibility.PUBLIC and viewer_identity_id != post.identity_id:
            raise PermissionError("Post is private")
        if (
            viewer_identity_id != post.identity_id
            and self.should_hide_post_from_public(
                post,
                identity=identities_by_id.get(post.identity_id),
                generations_by_id=generations_by_id,
            )
        ):
            raise PermissionError("Post is private")
        if viewer_identity_id != post.identity_id and not self.is_publicly_showcase_ready_post(post):
            raise PermissionError("Post is private")
        if (
            viewer_identity_id != post.identity_id
            and not self.visible_post_assets(
                assets_by_id,
                post,
                public_preview=True,
            )
        ):
            raise PermissionError("Post is private")
        return self.serialize_post(
            post,
            assets_by_id=assets_by_id,
            identities_by_id=identities_by_id,
            viewer_identity_id=viewer_identity_id,
            public_preview=viewer_identity_id != post.identity_id,
        )

    async def update_post(
        self,
        identity_id: str,
        post_id: str,
        *,
        title: str | None = None,
        visibility: Visibility | None = None,
    ) -> PublicPost:
        post = await self.owned_post(identity_id, post_id)
        if visibility == Visibility.PUBLIC and post.visibility != Visibility.PUBLIC:
            identity = await self.service.get_identity(identity_id)
            self.service._assert_identity_action_allowed(
                identity,
                action_code="public_post",
                action_label="making posts public",
            )
            assets = await self.service.store.list_assets()
            generations = await self.service.store.list_generations()
            assets_by_id = {asset.id: asset for asset in assets}
            generations_by_id = {generation.id: generation for generation in generations}
            if self.should_hide_post_from_public(
                post,
                identity=identity,
                generations_by_id=generations_by_id,
            ) or not self.is_publicly_showcase_ready_post(post):
                raise PermissionError("Only showcase-ready posts can be made public")
            if not self.visible_post_assets(
                assets_by_id,
                post,
                public_preview=True,
            ):
                raise PermissionError("Only ready, truthful results can be made public")

        def mutation(state: StudioState) -> None:
            current = state.posts[post.id]
            if title is not None:
                cleaned = title.strip()[:72]
                if cleaned:
                    current.title = cleaned
            if visibility is not None:
                current.visibility = visibility
            current.updated_at = utc_now()
            state.posts[current.id] = current

            if title is not None:
                cleaned = title.strip()[:72]
                if cleaned:
                    for asset_id in current.asset_ids:
                        asset = state.assets.get(asset_id)
                        if asset:
                            asset.title = cleaned
                            state.assets[asset.id] = asset

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def like_post(self, identity_id: str, post_id: str) -> PublicPost:
        await self.service.get_identity(identity_id)
        post = await self._require_publicly_interactable_post(post_id)

        def mutation(state: StudioState) -> None:
            current = state.posts[post.id]
            if identity_id not in current.liked_by:
                current.liked_by.append(identity_id)
            current.updated_at = utc_now()
            state.posts[current.id] = current

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def unlike_post(self, identity_id: str, post_id: str) -> PublicPost:
        await self.service.get_identity(identity_id)
        post = await self._require_publicly_interactable_post(post_id)

        def mutation(state: StudioState) -> None:
            current = state.posts[post.id]
            current.liked_by = [liked for liked in current.liked_by if liked != identity_id]
            current.updated_at = utc_now()
            state.posts[current.id] = current

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def _require_publicly_interactable_post(self, post_id: str) -> PublicPost:
        def query(state: StudioState) -> PublicPost:
            post = state.posts.get(post_id)
            if post is None:
                raise KeyError("Post not found")
            if post.visibility != Visibility.PUBLIC:
                raise PermissionError("Only public showcase-ready posts can be interacted with")

            identity = state.identities.get(post.identity_id)
            if self.should_hide_post_from_public(
                post,
                identity=identity,
                generations_by_id=state.generations,
            ):
                raise PermissionError("Only public showcase-ready posts can be interacted with")
            if not self.is_publicly_showcase_ready_post(post):
                raise PermissionError("Only public showcase-ready posts can be interacted with")
            if not self.visible_post_assets(
                state.assets,
                post,
                public_preview=True,
            ):
                raise PermissionError("Only public showcase-ready posts can be interacted with")
            return post

        return await self.service.store.read(query)

    async def move_post(self, identity_id: str, post_id: str, project_id: str) -> PublicPost:
        post = await self.owned_post(identity_id, post_id)
        project = await self.service.require_owned_model("projects", project_id, Project, identity_id)

        def mutation(state: StudioState) -> None:
            current = state.posts[post.id]
            now = utc_now()
            current.project_id = project.id
            current.updated_at = now
            state.posts[current.id] = current
            for asset_id in current.asset_ids:
                asset = state.assets.get(asset_id)
                if asset:
                    asset.project_id = project.id
                    state.assets[asset.id] = asset
            generation = state.generations.get(current.id)
            if generation:
                generation.project_id = project.id
                generation.updated_at = now
                state.generations[generation.id] = generation
            project_record = state.projects.get(project.id)
            if project_record:
                project_record.updated_at = now
                state.projects[project.id] = project_record

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def trash_post(self, identity_id: str, post_id: str) -> Dict[str, Any]:
        post = await self.owned_post(identity_id, post_id)

        def mutation(state: StudioState) -> None:
            now = utc_now()
            for asset_id in post.asset_ids:
                asset = state.assets.get(asset_id)
                if asset and asset.deleted_at is None:
                    asset.deleted_at = now
                    state.assets[asset.id] = asset
            current_post = state.posts.get(post.id)
            if current_post:
                current_post.updated_at = now
                state.posts[current_post.id] = current_post

        await self.service.store.mutate(mutation)
        return {"post_id": post.id, "trashed_count": len(post.asset_ids)}

    def serialize_share_record(self, share: ShareLink) -> Dict[str, Any]:
        preview = share.token_preview
        if not preview and share.token:
            preview = build_share_token_preview(share.token)
        return {
            "id": share.id,
            "project_id": share.project_id,
            "asset_id": share.asset_id,
            "token_preview": preview,
            "created_at": share.created_at.isoformat(),
            "expires_at": share.expires_at.isoformat() if share.expires_at else None,
            "revoked_at": share.revoked_at.isoformat() if share.revoked_at else None,
        }

    def serialize_public_share_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        share = ShareLink.model_validate(payload["share"])
        serialized: Dict[str, Any] = {"share": self.serialize_share_record(share)}
        if "project" in payload:
            serialized["project"] = self.serialize_public_project(payload["project"])
        if "assets" in payload:
            serialized["assets"] = self.service.library.serialize_assets(
                [MediaAsset.model_validate(asset) for asset in payload["assets"]],
                share_id=share.id,
            )
        if "asset" in payload and payload["asset"] is not None:
            serialized["asset"] = self.service.library.serialize_asset(
                MediaAsset.model_validate(payload["asset"]),
                share_id=share.id,
            )
        return serialized

    async def create_share(
        self,
        identity_id: str,
        project_id: str | None,
        asset_id: str | None,
    ) -> tuple[ShareLink, str]:
        identity = await self.service.get_identity(identity_id)
        self.service._assert_identity_action_allowed(
            identity,
            action_code="share_create",
            action_label="creating share links",
        )
        billing_state = await self.service._resolve_billing_state_for_identity(identity)
        entitlements = resolve_entitlements(
            identity=identity,
            plan_catalog=self.service.plan_catalog,
            billing_state=billing_state,
        )
        if not entitlements.can_share_links:
            raise PermissionError("Share links require Pro")
        if bool(project_id) == bool(asset_id):
            raise ValueError("Provide exactly one of project_id or asset_id")
        if project_id:
            project = await self.service.require_owned_model("projects", project_id, Project, identity_id)
            assets = await self.service.list_assets(identity_id, project_id=project.id)
            eligible_assets = [
                asset
                for asset in assets
                if self.service.library.is_project_share_eligible_asset(asset)
            ]
            if not eligible_assets:
                raise PermissionError("Only projects with ready, truthful assets can be shared publicly")
        if asset_id:
            asset = await self.service.require_owned_model("assets", asset_id, MediaAsset, identity_id)
            if not self.service.library.is_public_share_eligible_asset(asset):
                raise PermissionError("Only ready, truthful assets can be shared publicly")

        public_token = self.service._generate_share_public_token()
        share = create_share_record(
            identity_id=identity_id,
            project_id=project_id,
            asset_id=asset_id,
            token_hash=self.service._hash_share_public_token(public_token),
            token_preview=build_share_token_preview(public_token),
        )
        await self.service.store.save_model("shares", share)
        self.service._log_security_event(
            "share_created",
            identity_id=identity_id,
            share_id=share.id,
            project_id=project_id,
            asset_id=asset_id,
            token_preview=share.token_preview,
        )
        return share, public_token

    async def list_shares(self, identity_id: str) -> list[Dict[str, Any]]:
        await self.service.get_identity(identity_id)
        shares = await self.service.store.list_shares_for_identity(identity_id)
        shares.sort(key=lambda item: item.created_at, reverse=True)
        return [self.serialize_share_record(share) for share in shares]

    async def revoke_share(self, identity_id: str, share_id: str) -> Dict[str, Any]:
        share = await self.service.store.get_share(share_id)
        if share is None:
            raise KeyError("Share not found")
        if share.identity_id != identity_id:
            raise PermissionError("Share access denied")

        def mutation(state: StudioState) -> None:
            current = state.shares.get(share_id)
            if current is None:
                raise KeyError("Share not found")
            if current.revoked_at is None:
                current.revoked_at = utc_now()
                state.shares[current.id] = current

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_share(share_id)
        if updated is None:
            raise KeyError("Share not found")
        self.service._log_security_event(
            "share_revoked",
            identity_id=identity_id,
            share_id=share_id,
            project_id=updated.project_id,
            asset_id=updated.asset_id,
        )
        return self.serialize_share_record(updated)

    async def get_public_share(self, token: str) -> Dict[str, Any]:
        share = await self.service._get_share_by_public_token(token)
        if share is None:
            raise KeyError("Share not found")
        if share.revoked_at is not None:
            raise KeyError("Share not found")
        if share.expires_at and share.expires_at < utc_now():
            raise KeyError("Share not found")
        try:
            await self.service.library.assert_share_owner_public_access(share)
        except PermissionError as exc:
            raise KeyError("Share not found") from exc

        if share.project_id:
            project = await self.service.store.get_project(share.project_id)
            if project is None or project.identity_id != share.identity_id:
                raise KeyError("Share not found")
            assets = await self.service.list_assets(share.identity_id, project_id=share.project_id)
            eligible_assets = [
                asset
                for asset in assets
                if self.service.library.is_project_share_eligible_asset(asset)
            ]
            if not eligible_assets:
                raise KeyError("Share not found")
            return build_public_share_payload(share=share, project=project, assets=eligible_assets)
        if share.asset_id:
            asset = await self.service.store.get_asset(share.asset_id)
            if (
                asset is None
                or asset.identity_id != share.identity_id
                or not self.service.library.is_public_share_eligible_asset(asset)
            ):
                raise KeyError("Share not found")
            return build_public_share_payload(share=share, asset=asset)
        return build_public_share_payload(share=share)

    def normalize_public_post_text(self, value: str) -> str:
        normalized = re.sub(r"[^a-z0-9\s]+", " ", value.lower())
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.strip()

    def looks_like_public_feed_gibberish(self, value: str) -> bool:
        normalized = self.normalize_public_post_text(value)
        compact = normalized.replace(" ", "")
        if not compact:
            return True
        if re.fullmatch(r"(asd|qwe|zxc|abc|test|demo|tmp|lol|xxx|123)+", compact):
            return True
        if len(normalized.split()) <= 1 and len(compact) >= 8 and len(set(compact)) <= 4:
            return True
        return False

    def identity_public_username(self, identity: OmniaIdentity | None, *, fallback: str = "creator") -> str:
        if identity is None:
            return fallback
        return (identity.username or identity.email.split("@")[0] or fallback).strip().lower()

    def identity_public_display_name(self, identity: OmniaIdentity | None, *, fallback: str = "Creator") -> str:
        if identity is None:
            return fallback
        return (identity.display_name or fallback).strip() or fallback

    def is_publicly_visible_identity(self, identity: OmniaIdentity | None) -> bool:
        if identity is None:
            return False
        if self.is_internal_identity(identity):
            return False
        if identity.manual_review_state == ManualReviewState.REQUIRED:
            return False
        if identity.temp_block_until and identity.temp_block_until > utc_now():
            return False
        return True

    def is_internal_identity(self, identity: OmniaIdentity | None) -> bool:
        if identity is None:
            return True
        email = (identity.email or "").strip().lower()
        username = (identity.username or "").strip().lower()
        return (
            any(email.endswith(suffix) for suffix in self.service._internal_public_email_suffixes)
            or any(email.startswith(prefix) for prefix in self.service._internal_public_email_prefixes)
            or username.startswith("codex")
            or username == "security-check"
        )

    def generation_provider_for_post(
        self,
        post: PublicPost,
        generations_by_id: Dict[str, GenerationJob],
    ) -> str:
        generation = generations_by_id.get(post.id)
        if generation is None:
            return ""
        return str(generation.provider or "").strip().lower()

    def should_hide_post_from_public(
        self,
        post: PublicPost,
        *,
        identity: OmniaIdentity | None,
        generations_by_id: Dict[str, GenerationJob],
    ) -> bool:
        if not self.is_publicly_visible_identity(identity):
            return True
        return self.generation_provider_for_post(post, generations_by_id) == "demo"

    def is_publicly_safe_post(self, post: PublicPost) -> bool:
        prompt = (post.prompt or "").lower()
        title = (post.title or "").lower()
        combined = f"{title}\n{prompt}"
        return not any(term in combined for term in self.service._public_safety_blocklist)

    def is_publicly_presentable_post(self, post: PublicPost) -> bool:
        title = self.normalize_public_post_text(post.title or "")
        prompt = self.normalize_public_post_text(post.prompt or "")
        combined = f"{title}\n{prompt}"

        if any(term in combined for term in self.service._public_low_signal_blocklist):
            return False
        if self.looks_like_public_feed_gibberish(title):
            return False
        if self.looks_like_public_feed_gibberish(prompt):
            return False

        prompt_words = re.findall(r"[a-z0-9]+", prompt)
        title_words = re.findall(r"[a-z0-9]+", title)
        if len(prompt_words) < 3 and len(title_words) < 2:
            return False
        return True

    def is_publicly_showcase_ready_post(self, post: PublicPost) -> bool:
        return self.is_publicly_safe_post(post) and self.is_publicly_presentable_post(post)

    def public_feed_dedupe_key(self, post: PublicPost) -> str:
        title = self.normalize_public_post_text(post.title or "")[:80]
        prompt = self.normalize_public_post_text(post.prompt or "")[:140]
        return f"{post.owner_username}|{title}|{prompt}"
