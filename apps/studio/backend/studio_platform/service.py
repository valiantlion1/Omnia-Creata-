from __future__ import annotations

import asyncio
import io
import mimetypes
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from PIL import Image
import jwt

from config.env import get_settings

from .asset_storage import (
    ResolvedAssetDelivery,
    build_asset_storage_registry,
)
from .llm import StudioLLMGateway
from .models import (
    ChatAttachment,
    ChatConversation,
    ChatMessage,
    ChatRole,
    ChatSuggestedAction,
    CheckoutKind,
    CreditEntryType,
    CreditLedgerEntry,
    GenerationJob,
    GenerationOutput,
    IdentityPlan,
    JobStatus,
    MediaAsset,
    ModelCatalogEntry,
    OmniaIdentity,
    PlanCatalogEntry,
    PublicPost,
    Project,
    PromptSnapshot,
    ShareLink,
    StudioState,
    StudioWorkspace,
    SubscriptionStatus,
    Visibility,
    utc_now,
)
from .profile_ops import build_identity_export, purge_identity_state
from .providers import LocalModelDescriptor, ProviderRegistry, ProviderTemporaryError
from .store import StudioStateStore


PLAN_CATALOG: Dict[IdentityPlan, PlanCatalogEntry] = {
    IdentityPlan.GUEST: PlanCatalogEntry(
        id=IdentityPlan.GUEST,
        label="Guest",
        monthly_credits=0,
        queue_priority="browse-only",
        max_resolution="preview only",
        share_links=False,
        can_generate=False,
    ),
    IdentityPlan.FREE: PlanCatalogEntry(
        id=IdentityPlan.FREE,
        label="Free",
        monthly_credits=60,
        queue_priority="standard",
        max_resolution="1024x1024",
        share_links=False,
        can_generate=True,
    ),
    IdentityPlan.PRO: PlanCatalogEntry(
        id=IdentityPlan.PRO,
        label="Pro",
        monthly_credits=1200,
        queue_priority="priority",
        max_resolution="1536x1536",
        share_links=True,
        can_generate=True,
    ),
}

MODEL_CATALOG: Dict[str, ModelCatalogEntry] = {
    "flux-schnell": ModelCatalogEntry(
        id="flux-schnell",
        label="Flux Schnell",
        description="Fast ideation model for everyday concept work.",
        min_plan=IdentityPlan.FREE,
        credit_cost=6,
        estimated_cost=0.003,
        max_width=1024,
        max_height=1024,
        featured=True,
        runtime="cloud",
        provider_hint="managed",
    ),
    "sdxl-base": ModelCatalogEntry(
        id="sdxl-base",
        label="SDXL Base",
        description="Balanced baseline image model for clean compositions.",
        min_plan=IdentityPlan.FREE,
        credit_cost=8,
        estimated_cost=0.008,
        max_width=1024,
        max_height=1024,
        runtime="cloud",
        provider_hint="managed",
    ),
    "realvis-xl": ModelCatalogEntry(
        id="realvis-xl",
        label="RealVis XL",
        description="Cinematic realism tuned for polished renders.",
        min_plan=IdentityPlan.PRO,
        credit_cost=12,
        estimated_cost=0.015,
        max_width=1536,
        max_height=1536,
        featured=True,
        runtime="cloud",
        provider_hint="managed",
    ),
    "juggernaut-xl": ModelCatalogEntry(
        id="juggernaut-xl",
        label="Juggernaut XL",
        description="Sharper detail and stylized realism for hero shots.",
        min_plan=IdentityPlan.PRO,
        credit_cost=14,
        estimated_cost=0.02,
        max_width=1536,
        max_height=1536,
        runtime="cloud",
        provider_hint="managed",
    ),
}

PRESET_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "cinematic",
        "label": "Cinematic",
        "description": "Moody contrast, richer highlights, stronger composition.",
        "defaults": {"steps": 30, "cfg_scale": 6.5, "aspect_ratio": "16:9"},
    },
    {
        "id": "portrait",
        "label": "Portrait",
        "description": "Sharper faces and centered subject framing.",
        "defaults": {"steps": 28, "cfg_scale": 7.0, "aspect_ratio": "3:4"},
    },
    {
        "id": "editorial",
        "label": "Editorial",
        "description": "Premium product and campaign visuals with clean light.",
        "defaults": {"steps": 32, "cfg_scale": 6.0, "aspect_ratio": "4:5"},
    },
]

CHECKOUT_CATALOG: Dict[CheckoutKind, Dict[str, Any]] = {
    CheckoutKind.PRO_MONTHLY: {
        "label": "Pro monthly",
        "credits": 1200,
        "price_usd": 18,
        "plan": IdentityPlan.PRO,
    },
    CheckoutKind.TOP_UP_SMALL: {
        "label": "Top-up 200",
        "credits": 200,
        "price_usd": 8,
        "plan": None,
    },
    CheckoutKind.TOP_UP_LARGE: {
        "label": "Top-up 800",
        "credits": 800,
        "price_usd": 24,
        "plan": None,
    },
}

CHAT_MESSAGE_LIMITS: Dict[IdentityPlan, int] = {
    IdentityPlan.FREE: 25,
    IdentityPlan.PRO: 200,
}


class StudioService:
    def __init__(
        self,
        store: StudioStateStore,
        providers: ProviderRegistry,
        media_dir: Path,
        media_url_prefix: str = "/media",
    ) -> None:
        self.store = store
        self.providers = providers
        self.media_dir = media_dir
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.media_url_prefix = media_url_prefix.rstrip("/")
        self._tasks: set[asyncio.Task] = set()
        settings = get_settings()
        self._asset_token_secret = settings.jwt_secret or "dev-asset-secret"
        self._asset_token_ttl_seconds = 60 * 20
        self.asset_storage = build_asset_storage_registry(settings, media_dir)
        self.llm_gateway = StudioLLMGateway()
        self._public_safety_blocklist = (
            "nsfw",
            "nude",
            "nudes",
            "naked",
            "nipple",
            "nipples",
            "breast",
            "breasts",
            "boobs",
            "pussy",
            "vagina",
            "penis",
            "dick",
            "cock",
            "blowjob",
            "porn",
            "porno",
            "explicit",
            "hentai",
            "sex",
            "sexual",
            "fetish",
            "bdsm",
            "cum",
            "anal",
            "gangbang",
            "lingerie",
            "boudoir",
            "erotic",
            "seductive",
            "intimate",
            "bedroom",
        )
        self._public_low_signal_blocklist = (
            "placeholder",
            "lorem ipsum",
            "debug",
            "temp",
            "tmp",
            "dummy",
            "test prompt",
            "test render",
            "security check",
        )
        self._internal_public_email_suffixes = ("@omnia.local",)
        self._internal_public_email_prefixes = ("codex.", "security-check")

    async def initialize(self) -> None:
        await self.store.load()
        await self.store.mutate(self._initialize_state_locked)

    async def get_public_identity(self, auth_user: Any | None) -> Dict[str, Any]:
        if auth_user is None:
            return {
                "guest": True,
                "identity": {
                    "id": "guest",
                    "email": "",
                    "display_name": "Guest",
                    "username": None,
                "plan": IdentityPlan.GUEST.value,
                "owner_mode": False,
                "root_admin": False,
                "local_access": False,
                "accepted_terms": False,
                    "accepted_privacy": False,
                    "accepted_usage_policy": False,
                    "marketing_opt_in": False,
                    "workspace_id": None,
                },
                "credits": {"remaining": 0, "monthly_remaining": 0, "extra_credits": 0},
                "plan": PLAN_CATALOG[IdentityPlan.GUEST].model_dump(mode="json"),
            }

        identity = await self.ensure_identity(
            user_id=auth_user.id,
            email=auth_user.email or f"{auth_user.id}@omnia.local",
            display_name=getattr(auth_user, "username", None) or "Creator",
            username=(getattr(auth_user, "metadata", {}) or {}).get("username")
            or getattr(auth_user, "email", "").split("@")[0]
            or "creator",
            owner_mode=bool(getattr(auth_user, "metadata", {}).get("owner_mode")),
            root_admin=bool(getattr(auth_user, "metadata", {}).get("root_admin")),
            local_access=bool(getattr(auth_user, "metadata", {}).get("local_access")),
            accepted_terms=bool(getattr(auth_user, "metadata", {}).get("accepted_terms")),
            accepted_privacy=bool(getattr(auth_user, "metadata", {}).get("accepted_privacy")),
            accepted_usage_policy=bool(getattr(auth_user, "metadata", {}).get("accepted_usage_policy")),
            marketing_opt_in=bool(getattr(auth_user, "metadata", {}).get("marketing_opt_in")),
        )
        return self.serialize_identity(identity)

    async def ensure_identity(
        self,
        user_id: str,
        email: str,
        display_name: str,
        username: str | None = None,
        desired_plan: IdentityPlan | None = None,
        owner_mode: bool = False,
        root_admin: bool = False,
        local_access: bool = False,
        accepted_terms: bool = False,
        accepted_privacy: bool = False,
        accepted_usage_policy: bool = False,
        marketing_opt_in: bool = False,
        bio: str = "",
        avatar_url: str | None = None,
        default_visibility: Optional[Visibility] = None,
    ) -> OmniaIdentity:
        holder: Dict[str, OmniaIdentity] = {}

        def mutation(state: StudioState) -> None:
            identity = state.identities.get(user_id)
            now = utc_now()

            is_founder = email.lower() in ("founder@omniacreata.com", "help@omniacreata.com")
            if is_founder:
                nonlocal desired_plan, root_admin
                desired_plan = IdentityPlan.PRO
                root_admin = True

            if identity is None:
                plan = desired_plan or IdentityPlan.FREE
                plan_config = PLAN_CATALOG[plan]
                identity = OmniaIdentity(
                    id=user_id,
                    email=email,
                    display_name=display_name or "Creator",
                    username=(username or email.split("@")[0] or "creator").strip().lower(),
                    plan=plan,
                    workspace_id=f"ws_{user_id}",
                    guest=False,
                    owner_mode=owner_mode,
                    root_admin=root_admin,
                    local_access=local_access,
                    accepted_terms=accepted_terms,
                    accepted_privacy=accepted_privacy,
                    accepted_usage_policy=accepted_usage_policy,
                    marketing_opt_in=marketing_opt_in,
                    bio=bio.strip(),
                    avatar_url=avatar_url,
                    default_visibility=default_visibility or Visibility.PRIVATE,
                    subscription_status=SubscriptionStatus.ACTIVE if plan == IdentityPlan.PRO else SubscriptionStatus.NONE,
                    monthly_credits_remaining=plan_config.monthly_credits,
                    monthly_credit_allowance=plan_config.monthly_credits,
                    extra_credits=0,
                    last_credit_refresh_at=now,
                    created_at=now,
                    updated_at=now,
                )
                state.identities[identity.id] = identity
                state.workspaces[identity.workspace_id] = StudioWorkspace(
                    id=identity.workspace_id,
                    identity_id=identity.id,
                    name=f"{identity.display_name}'s Studio",
                )
                state.credit_ledger[f"grant_{identity.id}_{int(now.timestamp())}"] = CreditLedgerEntry(
                    identity_id=identity.id,
                    amount=plan_config.monthly_credits,
                    entry_type=CreditEntryType.MONTHLY_GRANT,
                    description=f"{plan_config.label} welcome credits",
                )
            else:
                if desired_plan and desired_plan != identity.plan:
                    identity.plan = desired_plan
                    identity.subscription_status = SubscriptionStatus.ACTIVE if desired_plan == IdentityPlan.PRO else SubscriptionStatus.NONE
                    upgraded_plan = PLAN_CATALOG[desired_plan]
                    identity.monthly_credit_allowance = upgraded_plan.monthly_credits
                    identity.monthly_credits_remaining = max(identity.monthly_credits_remaining, upgraded_plan.monthly_credits)
                identity.email = email or identity.email
                identity.display_name = display_name or identity.display_name
                identity.username = (username or identity.username or identity.email.split("@")[0] or "creator").strip().lower()
                identity.owner_mode = identity.owner_mode or owner_mode
                identity.root_admin = identity.root_admin or root_admin
                identity.local_access = identity.local_access or local_access
                identity.accepted_terms = identity.accepted_terms or accepted_terms
                identity.accepted_privacy = identity.accepted_privacy or accepted_privacy
                identity.accepted_usage_policy = identity.accepted_usage_policy or accepted_usage_policy
                identity.marketing_opt_in = identity.marketing_opt_in or marketing_opt_in
                identity.bio = bio or identity.bio
                identity.avatar_url = avatar_url or identity.avatar_url
                if default_visibility is not None:
                    identity.default_visibility = default_visibility
                self._refresh_monthly_credits_locked(state, identity)

                if is_founder:
                    identity.monthly_credits_remaining = 999999
                    identity.monthly_credit_allowance = 999999
                    identity.extra_credits = 999999

                identity.updated_at = now
                state.identities[identity.id] = identity

                if identity.workspace_id not in state.workspaces:
                    state.workspaces[identity.workspace_id] = StudioWorkspace(
                        id=identity.workspace_id,
                        identity_id=identity.id,
                        name=f"{identity.display_name}'s Studio",
                    )

            holder["identity"] = identity.model_copy(deep=True)

        await self.store.mutate(mutation)
        return holder["identity"]

    def serialize_identity(self, identity: OmniaIdentity) -> Dict[str, Any]:
        return {
            "guest": False,
            "identity": identity.model_dump(mode="json"),
            "credits": {
                "remaining": identity.monthly_credits_remaining + identity.extra_credits,
                "monthly_remaining": identity.monthly_credits_remaining,
                "extra_credits": identity.extra_credits,
            },
            "plan": PLAN_CATALOG[identity.plan].model_dump(mode="json"),
        }

    def serialize_usage_summary(self, identity: OmniaIdentity) -> Dict[str, Any]:
        allowance = max(identity.monthly_credit_allowance, 1)
        remaining = identity.monthly_credits_remaining + identity.extra_credits
        consumed = max(allowance - identity.monthly_credits_remaining, 0)
        progress = max(0, min(100, round((consumed / allowance) * 100)))
        next_reset = (
            identity.last_credit_refresh_at.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            + timedelta(days=32)
        ).replace(day=1)
        return {
            "plan_label": PLAN_CATALOG[identity.plan].label,
            "credits_remaining": remaining,
            "allowance": allowance,
            "reset_at": next_reset.isoformat(),
            "progress_percent": progress,
        }

    def _initialize_state_locked(self, state: StudioState) -> None:
        self._migrate_identity_visibility_defaults_locked(state)
        self._backfill_posts_locked(state)
        self._normalize_public_posts_locked(state)

    def _migrate_identity_visibility_defaults_locked(self, state: StudioState) -> None:
        now = utc_now()
        for identity in state.identities.values():
            if identity.default_visibility == Visibility.PUBLIC:
                identity.default_visibility = Visibility.PRIVATE
                identity.updated_at = now

    def _backfill_posts_locked(self, state: StudioState) -> None:
        for generation in state.generations.values():
            if generation.status != JobStatus.COMPLETED:
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
                style_tags=self._infer_style_tags(generation),
                liked_by=[],
                created_at=generation.created_at,
                updated_at=generation.updated_at,
            )

    def _normalize_public_posts_locked(self, state: StudioState) -> None:
        now = utc_now()
        generations_by_id = state.generations
        for post in state.posts.values():
            identity = state.identities.get(post.identity_id)
            changed = False
            next_username = self._identity_public_username(identity, fallback=post.owner_username)
            next_display_name = self._identity_public_display_name(identity, fallback=post.owner_display_name)
            if post.owner_username != next_username:
                post.owner_username = next_username
                changed = True
            if post.owner_display_name != next_display_name:
                post.owner_display_name = next_display_name
                changed = True
            if (
                post.visibility == Visibility.PUBLIC
                and self._should_hide_post_from_public(
                    post,
                    identity=identity,
                    generations_by_id=generations_by_id,
                )
            ):
                post.visibility = Visibility.PRIVATE
                changed = True
            if changed:
                post.updated_at = now

    def get_public_plan_payload(self) -> Dict[str, Any]:
        return {
            "plans": [plan.model_dump(mode="json") for plan in PLAN_CATALOG.values() if plan.id != IdentityPlan.GUEST],
            "top_ups": [
                {"kind": kind.value, **meta}
                for kind, meta in CHECKOUT_CATALOG.items()
                if meta["plan"] is None
            ],
            "featured_plan": IdentityPlan.PRO.value,
        }

    def _post_preview_assets(
        self,
        assets_by_id: Dict[str, MediaAsset],
        asset_ids: List[str],
        *,
        identity_id: Optional[str] = None,
        public_preview: bool = False,
    ) -> List[Dict[str, Any]]:
        visible_assets = [
            assets_by_id[asset_id]
            for asset_id in asset_ids
            if asset_id in assets_by_id
            and assets_by_id[asset_id].deleted_at is None
            and self._asset_has_renderable_variant(assets_by_id[asset_id])
        ]
        return self.serialize_assets(
            visible_assets[:4],
            identity_id=identity_id,
            public_preview=public_preview,
        )

    def serialize_post(
        self,
        post: PublicPost,
        *,
        assets_by_id: Dict[str, MediaAsset],
        identities_by_id: Optional[Dict[str, OmniaIdentity]] = None,
        viewer_identity_id: Optional[str] = None,
        public_preview: bool = False,
    ) -> Dict[str, Any]:
        cover_asset = assets_by_id.get(post.cover_asset_id or "")
        identity = identities_by_id.get(post.identity_id) if identities_by_id else None
        return {
            "id": post.id,
            "owner_username": self._identity_public_username(identity, fallback=post.owner_username),
            "owner_display_name": self._identity_public_display_name(identity, fallback=post.owner_display_name),
            "title": post.title,
            "prompt": post.prompt,
            "cover_asset": self.serialize_asset(
                cover_asset,
                identity_id=viewer_identity_id,
                public_preview=public_preview,
            )
            if cover_asset and cover_asset.deleted_at is None and self._asset_has_renderable_variant(cover_asset)
            else None,
            "preview_assets": self._post_preview_assets(
                assets_by_id,
                post.asset_ids,
                identity_id=viewer_identity_id,
                public_preview=public_preview,
            ),
            "visibility": post.visibility.value,
            "like_count": len(post.liked_by),
            "viewer_has_liked": bool(viewer_identity_id and viewer_identity_id in post.liked_by),
            "created_at": post.created_at.isoformat(),
            "project_id": post.project_id,
            "style_tags": post.style_tags,
        }

    def serialize_asset(
        self,
        asset: MediaAsset,
        *,
        identity_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
    ) -> Dict[str, Any]:
        payload = asset.model_dump(
            mode="json",
            exclude={"local_path"},
        )
        payload["metadata"] = {
            key: value
            for key, value in asset.metadata.items()
            if key not in {"storage_backend", "storage_key", "thumbnail_storage_key", "thumbnail_path"}
        }
        payload["url"] = self.build_asset_delivery_url(
            asset.id,
            variant="content",
            identity_id=identity_id,
            share_token=share_token,
            public_preview=public_preview,
        )
        payload["thumbnail_url"] = self.build_asset_delivery_url(
            asset.id,
            variant="thumbnail",
            identity_id=identity_id,
            share_token=share_token,
            public_preview=public_preview,
        ) if self._asset_variant_exists(asset, "thumbnail") else None
        return payload

    def serialize_assets(
        self,
        assets: List[MediaAsset],
        *,
        identity_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
    ) -> List[Dict[str, Any]]:
        return [
            self.serialize_asset(
                asset,
                identity_id=identity_id,
                share_token=share_token,
                public_preview=public_preview,
            )
            for asset in assets
        ]

    def serialize_local_runtime_payload(
        self,
        snapshot: Dict[str, Any],
        *,
        include_models: bool = False,
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "enabled": bool(snapshot.get("enabled", False)),
            "available": bool(snapshot.get("available", False)),
            "status": snapshot.get("status", "unknown"),
            "detail": snapshot.get("detail"),
            "discovered_models": int(snapshot.get("discovered_models", 0)),
        }
        if include_models:
            payload["models"] = list(snapshot.get("models", []))
        return payload

    def serialize_owner_local_runtime_payload(self, snapshot: Dict[str, Any]) -> Dict[str, Any]:
        payload = self.serialize_local_runtime_payload(snapshot, include_models=True)
        payload["url"] = snapshot.get("url")
        payload["model_directory"] = snapshot.get("model_directory")
        return payload

    def serialize_health_payload(self, payload: Dict[str, Any], detail: bool) -> Dict[str, Any]:
        if detail:
            return payload

        providers = payload.get("providers", [])
        return {
            "status": payload.get("status", "unknown"),
            "providers": [
                {
                    "name": provider.get("name"),
                    "status": provider.get("status"),
                }
                for provider in providers
            ],
        }

    def serialize_public_share_payload(self, payload: Dict[str, Any], share_token: str) -> Dict[str, Any]:
        serialized: Dict[str, Any] = {"share": payload["share"]}
        if "project" in payload:
            serialized["project"] = payload["project"]
        if "assets" in payload:
            serialized["assets"] = self.serialize_assets(
                [MediaAsset.model_validate(asset) for asset in payload["assets"]],
                share_token=share_token,
            )
        if "asset" in payload and payload["asset"] is not None:
            serialized["asset"] = self.serialize_asset(
                MediaAsset.model_validate(payload["asset"]),
                share_token=share_token,
            )
        return serialized

    def build_asset_delivery_url(
        self,
        asset_id: str,
        *,
        variant: str,
        identity_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
    ) -> str:
        token = self._create_asset_delivery_token(
            asset_id=asset_id,
            variant=variant,
            identity_id=identity_id,
            share_token=share_token,
            public_preview=public_preview,
        )
        endpoint = "thumbnail" if variant == "thumbnail" else "content"
        return f"/v1/assets/{asset_id}/{endpoint}?token={token}"

    def serialize_generation_for_identity(self, job: GenerationJob, identity_id: str) -> Dict[str, Any]:
        outputs: List[Dict[str, Any]] = []
        for output in job.outputs:
            outputs.append(
                {
                    "asset_id": output.asset_id,
                    "url": self.build_asset_delivery_url(
                        output.asset_id,
                        variant="content",
                        identity_id=identity_id,
                    ),
                    "thumbnail_url": self.build_asset_delivery_url(
                        output.asset_id,
                        variant="thumbnail",
                        identity_id=identity_id,
                    ) if output.thumbnail_url else None,
                    "mime_type": output.mime_type,
                    "width": output.width,
                    "height": output.height,
                    "variation_index": output.variation_index,
                }
            )

        return {
            "job_id": job.id,
            "title": job.title,
            "status": job.status.value,
            "project_id": job.project_id,
            "provider": job.provider,
            "model": job.model,
            "prompt_snapshot": job.prompt_snapshot.model_dump(mode="json"),
            "estimated_cost": job.estimated_cost,
            "credit_cost": job.credit_cost,
            "output_count": job.output_count,
            "outputs": outputs,
            "error": job.error,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    async def resolve_asset_delivery(self, asset_id: str, token: str, variant: str) -> ResolvedAssetDelivery:
        claims = self._verify_asset_delivery_token(token, asset_id=asset_id, variant=variant)
        asset = await self.store.get_model("assets", asset_id, MediaAsset)
        if asset is None:
            raise KeyError("Asset not found")

        if claims.get("share_token"):
            await self._assert_share_access(asset, str(claims["share_token"]))
        elif claims.get("public_preview"):
            await self._assert_public_asset_preview_access(asset.id)
        elif claims.get("identity_id") != asset.identity_id:
            raise PermissionError("Asset access denied")

        storage_key = self._resolve_asset_variant_storage_key(asset, variant)
        storage_kind = str(asset.metadata.get("storage_backend") or "").strip().lower()
        if storage_key and storage_kind:
            backend = self.asset_storage.get(storage_kind)
            content = await backend.fetch_bytes(storage_key)
            return ResolvedAssetDelivery(
                filename=Path(storage_key).name,
                media_type=self._resolve_asset_variant_mime_type(asset, variant, storage_key),
                content=content,
            )

        path = self._resolve_asset_variant_path(asset, variant)
        if path is None or not path.exists():
            raise FileNotFoundError("Asset file not found")

        return ResolvedAssetDelivery(
            filename=path.name,
            media_type=self._resolve_asset_variant_mime_type(asset, variant, path.name),
            local_path=path,
        )

    async def _assert_share_access(self, asset: MediaAsset, share_token: str) -> None:
        shares = await self.store.list_models("shares", ShareLink)
        share = next((item for item in shares if item.token == share_token), None)
        if share is None:
            raise PermissionError("Share access denied")
        if share.expires_at and share.expires_at < utc_now():
            raise PermissionError("Share link expired")
        if share.asset_id:
            if share.asset_id != asset.id:
                raise PermissionError("Share access denied")
            return
        if share.project_id and share.project_id != asset.project_id:
            raise PermissionError("Share access denied")

    def _create_asset_delivery_token(
        self,
        *,
        asset_id: str,
        variant: str,
        identity_id: Optional[str],
        share_token: Optional[str],
        public_preview: bool = False,
    ) -> str:
        expires_at = utc_now() + timedelta(seconds=self._asset_token_ttl_seconds)
        payload = {
            "sub": "asset-delivery",
            "asset_id": asset_id,
            "variant": variant,
            "identity_id": identity_id,
            "share_token": share_token,
            "public_preview": public_preview,
            "exp": expires_at,
            "iat": utc_now(),
        }
        return jwt.encode(payload, self._asset_token_secret, algorithm="HS256")

    def _verify_asset_delivery_token(self, token: str, *, asset_id: str, variant: str) -> Dict[str, Any]:
        try:
            payload = jwt.decode(token, self._asset_token_secret, algorithms=["HS256"])
        except jwt.InvalidTokenError as exc:
            raise PermissionError("Invalid asset token") from exc

        if payload.get("sub") != "asset-delivery":
            raise PermissionError("Invalid asset token")
        if payload.get("asset_id") != asset_id:
            raise PermissionError("Asset token mismatch")
        if payload.get("variant") != variant:
            raise PermissionError("Asset variant mismatch")
        if not payload.get("identity_id") and not payload.get("share_token") and not payload.get("public_preview"):
            raise PermissionError("Asset token missing scope")
        return payload

    def _resolve_asset_variant_path(self, asset: MediaAsset, variant: str) -> Optional[Path]:
        if variant == "content":
            if not asset.local_path:
                return None
            return Path(asset.local_path)

        thumb_path = asset.metadata.get("thumbnail_path")
        if thumb_path:
            return Path(str(thumb_path))

        if asset.thumbnail_url:
            parsed = urlparse(asset.thumbnail_url)
            name = Path(parsed.path).name
            if name:
                return self.media_dir / name
        return None

    def _resolve_asset_variant_storage_key(self, asset: MediaAsset, variant: str) -> Optional[str]:
        if variant == "content":
            return asset.metadata.get("storage_key")
        return asset.metadata.get("thumbnail_storage_key")

    def _resolve_asset_variant_mime_type(self, asset: MediaAsset, variant: str, name: str) -> str:
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

    def _asset_variant_exists(self, asset: MediaAsset, variant: str) -> bool:
        if self._resolve_asset_variant_storage_key(asset, variant):
            return True
        path = self._resolve_asset_variant_path(asset, variant)
        return path is not None and path.exists()

    def _asset_has_renderable_variant(self, asset: MediaAsset) -> bool:
        return self._asset_variant_exists(asset, "thumbnail") or self._asset_variant_exists(asset, "content")

    def _normalize_public_post_text(self, value: str) -> str:
        normalized = re.sub(r"[^a-z0-9\s]+", " ", value.lower())
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.strip()

    def _looks_like_public_feed_gibberish(self, value: str) -> bool:
        normalized = self._normalize_public_post_text(value)
        compact = normalized.replace(" ", "")
        if not compact:
            return True
        if re.fullmatch(r"(asd|qwe|zxc|abc|test|demo|tmp|lol|xxx|123)+", compact):
            return True
        if len(normalized.split()) <= 1 and len(compact) >= 8 and len(set(compact)) <= 4:
            return True
        return False

    def _identity_public_username(self, identity: Optional[OmniaIdentity], *, fallback: str = "creator") -> str:
        if identity is None:
            return fallback
        return (identity.username or identity.email.split("@")[0] or fallback).strip().lower()

    def _identity_public_display_name(self, identity: Optional[OmniaIdentity], *, fallback: str = "Creator") -> str:
        if identity is None:
            return fallback
        return (identity.display_name or fallback).strip() or fallback

    def _is_internal_identity(self, identity: Optional[OmniaIdentity]) -> bool:
        if identity is None:
            return True
        email = (identity.email or "").strip().lower()
        username = (identity.username or "").strip().lower()
        return (
            any(email.endswith(suffix) for suffix in self._internal_public_email_suffixes)
            or any(email.startswith(prefix) for prefix in self._internal_public_email_prefixes)
            or username.startswith("codex")
            or username == "security-check"
        )

    def _generation_provider_for_post(
        self,
        post: PublicPost,
        generations_by_id: Dict[str, GenerationJob],
    ) -> str:
        generation = generations_by_id.get(post.id)
        if generation is None:
            return ""
        return str(generation.provider or "").strip().lower()

    def _should_hide_post_from_public(
        self,
        post: PublicPost,
        *,
        identity: Optional[OmniaIdentity],
        generations_by_id: Dict[str, GenerationJob],
    ) -> bool:
        if self._is_internal_identity(identity):
            return True
        return self._generation_provider_for_post(post, generations_by_id) == "demo"

    def _is_publicly_safe_post(self, post: PublicPost) -> bool:
        prompt = (post.prompt or "").lower()
        title = (post.title or "").lower()
        combined = f"{title}\n{prompt}"
        return not any(term in combined for term in self._public_safety_blocklist)

    def _is_publicly_presentable_post(self, post: PublicPost) -> bool:
        title = self._normalize_public_post_text(post.title or "")
        prompt = self._normalize_public_post_text(post.prompt or "")
        combined = f"{title}\n{prompt}"

        if any(term in combined for term in self._public_low_signal_blocklist):
            return False
        if self._looks_like_public_feed_gibberish(title):
            return False
        if self._looks_like_public_feed_gibberish(prompt):
            return False

        prompt_words = re.findall(r"[a-z0-9]+", prompt)
        title_words = re.findall(r"[a-z0-9]+", title)
        if len(prompt_words) < 3 and len(title_words) < 2:
            return False
        return True

    def _is_publicly_showcase_ready_post(self, post: PublicPost) -> bool:
        return self._is_publicly_safe_post(post) and self._is_publicly_presentable_post(post)

    def _public_feed_dedupe_key(self, post: PublicPost) -> str:
        title = self._normalize_public_post_text(post.title or "")[:80]
        prompt = self._normalize_public_post_text(post.prompt or "")[:140]
        return f"{post.owner_username}|{title}|{prompt}"

    async def _assert_public_asset_preview_access(self, asset_id: str) -> None:
        posts = await self.store.list_models("posts", PublicPost)
        identities = await self.store.list_models("identities", OmniaIdentity)
        generations = await self.store.list_models("generations", GenerationJob)
        identities_by_id = {identity.id: identity for identity in identities}
        generations_by_id = {generation.id: generation for generation in generations}
        for post in posts:
            if post.visibility != Visibility.PUBLIC:
                continue
            if self._should_hide_post_from_public(
                post,
                identity=identities_by_id.get(post.identity_id),
                generations_by_id=generations_by_id,
            ):
                continue
            if not self._is_publicly_showcase_ready_post(post):
                continue
            if asset_id in post.asset_ids or asset_id == post.cover_asset_id:
                return
        raise PermissionError("Public preview access denied")

    async def _delete_asset_variant(self, asset: MediaAsset, variant: str) -> None:
        storage_key = self._resolve_asset_variant_storage_key(asset, variant)
        storage_kind = str(asset.metadata.get("storage_backend") or "").strip().lower()
        if storage_key and storage_kind:
            backend = self.asset_storage.get(storage_kind)
            await backend.delete_bytes(storage_key)
            return

        path = self._resolve_asset_variant_path(asset, variant)
        if path and path.exists():
            await asyncio.to_thread(path.unlink)

    async def _purge_asset_storage(self, asset: MediaAsset) -> None:
        if self._asset_variant_exists(asset, "content"):
            await self._delete_asset_variant(asset, "content")
        if self._asset_variant_exists(asset, "thumbnail"):
            await self._delete_asset_variant(asset, "thumbnail")

    async def list_projects(self, identity_id: str) -> List[Project]:
        projects = await self.store.list_models("projects", Project)
        return sorted(
            [project for project in projects if project.identity_id == identity_id],
            key=lambda item: item.updated_at,
            reverse=True,
        )

    async def create_project(self, identity_id: str, title: str, description: str = "") -> Project:
        identity = await self.get_identity(identity_id)
        project = Project(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title.strip() or "Untitled Project",
            description=description.strip(),
        )
        await self.store.save_model("projects", project)
        return project

    async def get_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        generations = await self.list_generations(identity_id, project_id=project_id)
        assets = await self.list_assets(identity_id, project_id=project_id)
        return {
            "project": project.model_dump(mode="json"),
            "recent_generations": [self.serialize_generation_for_identity(job, identity_id) for job in generations[:10]],
            "recent_assets": self.serialize_assets(assets[:16], identity_id=identity_id),
        }

    async def list_conversations(self, identity_id: str) -> List[ChatConversation]:
        conversations = await self.store.list_models("conversations", ChatConversation)
        return sorted(
            [conversation for conversation in conversations if conversation.identity_id == identity_id],
            key=lambda item: item.updated_at,
            reverse=True,
        )

    async def create_conversation(self, identity_id: str, title: str = "", model: str = "studio-assist") -> ChatConversation:
        identity = await self.get_identity(identity_id)
        conversation = ChatConversation(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title.strip() or "New chat",
            model=model.strip() or "studio-assist",
        )
        await self.store.save_model("conversations", conversation)
        return conversation

    async def get_conversation(self, identity_id: str, conversation_id: str) -> Dict[str, Any]:
        conversation = await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.list_conversation_messages(identity_id, conversation_id)
        return {
            "conversation": conversation.model_dump(mode="json"),
            "messages": [message.model_dump(mode="json") for message in messages],
        }

    async def list_conversation_messages(self, identity_id: str, conversation_id: str) -> List[ChatMessage]:
        await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.store.list_models("chat_messages", ChatMessage)
        filtered = [message for message in messages if message.identity_id == identity_id and message.conversation_id == conversation_id]
        return sorted(filtered, key=lambda item: item.created_at)

    async def delete_conversation(self, identity_id: str, conversation_id: str) -> None:
        conversation = await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)

        def mutation(state: StudioState) -> None:
            state.conversations.pop(conversation.id, None)
            stale_ids = [message.id for message in state.chat_messages.values() if message.conversation_id == conversation.id]
            for message_id in stale_ids:
                state.chat_messages.pop(message_id, None)

        await self.store.mutate(mutation)

    async def send_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        content: str,
        model: str | None = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        conversation = await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.list_conversation_messages(identity_id, conversation_id)
        user_turn_count = sum(1 for message in messages if message.role == ChatRole.USER)
        message_limit = CHAT_MESSAGE_LIMITS.get(identity.plan, 0)
        if message_limit and user_turn_count >= message_limit:
            raise PermissionError(f"{PLAN_CATALOG[identity.plan].label} plan chat limit reached")

        sanitized_content = content.strip()
        if not sanitized_content:
            raise ValueError("Message content is required")

        attachment_models = [ChatAttachment.model_validate(item) for item in (attachments or [])]
        user_message = ChatMessage(
            conversation_id=conversation.id,
            identity_id=identity.id,
            role=ChatRole.USER,
            content=sanitized_content,
            attachments=attachment_models,
        )
        resolved_mode = self._resolve_chat_mode(model or conversation.model)
        llm_reply = await self.llm_gateway.generate_chat_reply(
            requested_model=model or conversation.model,
            mode=resolved_mode,
            history=messages,
            content=sanitized_content,
            attachments=attachment_models,
        )
        if llm_reply:
            response_body = llm_reply.text
            suggested_actions = self._build_chat_suggested_actions(sanitized_content, attachment_models)
            metadata = {
                "provider": llm_reply.provider,
                "model": llm_reply.model,
                "mode": resolved_mode,
                "prompt_tokens": llm_reply.prompt_tokens,
                "completion_tokens": llm_reply.completion_tokens,
                "estimated_cost_usd": llm_reply.estimated_cost_usd,
                "used_fallback": llm_reply.used_fallback,
            }
        else:
            response_body, suggested_actions = self._build_chat_reply(sanitized_content, attachment_models)
            metadata = {
                "provider": "heuristic",
                "model": "studio-assist",
                "mode": resolved_mode,
                "estimated_cost_usd": 0.0,
                "used_fallback": True,
            }
        assistant_message = ChatMessage(
            conversation_id=conversation.id,
            identity_id=identity.id,
            role=ChatRole.ASSISTANT,
            content=response_body,
            suggested_actions=suggested_actions,
            metadata=metadata,
        )

        def mutation(state: StudioState) -> None:
            current_conversation = state.conversations[conversation.id]
            now = utc_now()
            if model:
                current_conversation.model = model.strip() or current_conversation.model
            if current_conversation.message_count == 0:
                current_conversation.title = self._title_from_message(sanitized_content)
            current_conversation.message_count += 2
            current_conversation.last_message_at = now
            current_conversation.updated_at = now
            state.conversations[current_conversation.id] = current_conversation
            state.chat_messages[user_message.id] = user_message
            state.chat_messages[assistant_message.id] = assistant_message

        await self.store.mutate(mutation)

        updated_conversation = await self.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        return {
            "conversation": updated_conversation.model_dump(mode="json"),
            "user_message": user_message.model_dump(mode="json"),
            "assistant_message": assistant_message.model_dump(mode="json"),
        }

    async def list_generations(self, identity_id: str, project_id: Optional[str] = None) -> List[GenerationJob]:
        generations = await self.store.list_models("generations", GenerationJob)
        filtered = [job for job in generations if job.identity_id == identity_id]
        if project_id:
            filtered = [job for job in filtered if job.project_id == project_id]
        return sorted(filtered, key=lambda item: item.created_at, reverse=True)

    async def get_generation(self, identity_id: str, generation_id: str) -> GenerationJob:
        return await self.require_owned_model("generations", generation_id, GenerationJob, identity_id)

    async def list_assets(self, identity_id: str, project_id: Optional[str] = None, include_deleted: bool = False) -> List[MediaAsset]:
        assets = await self.store.list_models("assets", MediaAsset)
        filtered = [
            asset
            for asset in assets
            if asset.identity_id == identity_id and (include_deleted or asset.deleted_at is None)
        ]
        if project_id:
            filtered = [asset for asset in filtered if asset.project_id == project_id]
        return sorted(filtered, key=lambda item: item.created_at, reverse=True)

    async def rename_asset(self, identity_id: str, asset_id: str, title: str) -> MediaAsset:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)
        next_title = title.strip()[:72]
        if not next_title:
            raise ValueError("Title is required")

        def mutation(state: StudioState) -> None:
            current = state.assets[asset.id]
            current.title = next_title
            state.assets[current.id] = current

        await self.store.mutate(mutation)
        updated = await self.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def _get_post(self, post_id: str) -> PublicPost:
        post = await self.store.get_model("posts", post_id, PublicPost)
        if post is None:
            raise KeyError("Post not found")
        return post

    async def _owned_post(self, identity_id: str, post_id: str) -> PublicPost:
        post = await self._get_post(post_id)
        if post.identity_id != identity_id:
            raise KeyError("Post not found")
        return post

    async def list_public_posts(
        self,
        *,
        sort: str = "trending",
        viewer_identity_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        posts = await self.store.list_models("posts", PublicPost)
        assets = await self.store.list_models("assets", MediaAsset)
        identities = await self.store.list_models("identities", OmniaIdentity)
        generations = await self.store.list_models("generations", GenerationJob)
        assets_by_id = {asset.id: asset for asset in assets}
        identities_by_id = {identity.id: identity for identity in identities}
        generations_by_id = {generation.id: generation for generation in generations}

        public_posts = []
        for post in posts:
            if post.visibility != Visibility.PUBLIC:
                continue
            if self._should_hide_post_from_public(
                post,
                identity=identities_by_id.get(post.identity_id),
                generations_by_id=generations_by_id,
            ):
                continue
            if not self._is_publicly_showcase_ready_post(post):
                continue
            preview_assets = [
                assets_by_id[asset_id]
                for asset_id in post.asset_ids
                if asset_id in assets_by_id
                and assets_by_id[asset_id].deleted_at is None
                and self._asset_has_renderable_variant(assets_by_id[asset_id])
            ]
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
                key=lambda item: (
                    len(item.liked_by) * 5
                    + len(item.style_tags) * 2,
                    item.created_at,
                ),
                reverse=True,
            )

        deduped_posts: List[PublicPost] = []
        seen_keys: set[str] = set()
        for post in public_posts:
            dedupe_key = self._public_feed_dedupe_key(post)
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

    async def get_profile_payload(
        self,
        *,
        username: Optional[str] = None,
        identity_id: Optional[str] = None,
        viewer_identity_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        if username:
            identity = await self.get_identity_by_username(username)
        elif identity_id:
            identity = await self.get_identity(identity_id)
        else:
            raise KeyError("Profile not found")

        posts = await self.store.list_models("posts", PublicPost)
        assets = await self.store.list_models("assets", MediaAsset)
        generations = await self.store.list_models("generations", GenerationJob)
        assets_by_id = {asset.id: asset for asset in assets}
        generations_by_id = {generation.id: generation for generation in generations}
        own_profile = bool(viewer_identity_id and viewer_identity_id == identity.id)

        visible_posts = []
        for post in posts:
            if post.identity_id != identity.id:
                continue
            if not own_profile and post.visibility != Visibility.PUBLIC:
                continue
            if (
                not own_profile
                and self._should_hide_post_from_public(
                    post,
                    identity=identity,
                    generations_by_id=generations_by_id,
                )
            ):
                continue
            if not own_profile and not self._is_publicly_showcase_ready_post(post):
                continue
            if not any(
                asset_id in assets_by_id
                and assets_by_id[asset_id].deleted_at is None
                and self._asset_has_renderable_variant(assets_by_id[asset_id])
                for asset_id in post.asset_ids
            ):
                continue
            visible_posts.append(post)

        visible_posts.sort(key=lambda item: item.created_at, reverse=True)
        public_post_count = len(
            [
                post
                for post in posts
                if post.identity_id == identity.id
                and post.visibility == Visibility.PUBLIC
                and not self._should_hide_post_from_public(
                    post,
                    identity=identity,
                    generations_by_id=generations_by_id,
                )
                and self._is_publicly_showcase_ready_post(post)
            ]
        )

        return {
            "profile": {
                "display_name": identity.display_name,
                "username": identity.username or identity.email.split("@")[0],
                "avatar_url": identity.avatar_url,
                "bio": identity.bio,
                "plan": identity.plan.value,
                "default_visibility": identity.default_visibility.value,
                "usage_summary": self.serialize_usage_summary(identity) if own_profile else None,
                "public_post_count": public_post_count,
            },
            "posts": [
                self.serialize_post(
                    post,
                    assets_by_id=assets_by_id,
                    identities_by_id={identity.id: identity},
                    viewer_identity_id=viewer_identity_id,
                    public_preview=not own_profile,
                )
                for post in visible_posts
            ],
            "own_profile": own_profile,
            "can_edit": own_profile,
        }

    async def update_profile(
        self,
        identity_id: str,
        *,
        display_name: Optional[str] = None,
        bio: Optional[str] = None,
        default_visibility: Optional[Visibility] = None,
    ) -> OmniaIdentity:
        identity = await self.get_identity(identity_id)

        def mutation(state: StudioState) -> None:
            current = state.identities[identity.id]
            if display_name is not None:
                cleaned_name = display_name.strip()[:120]
                if cleaned_name:
                    current.display_name = cleaned_name
            if bio is not None:
                current.bio = bio.strip()[:220]
            if default_visibility is not None:
                current.default_visibility = default_visibility
            current.updated_at = utc_now()
            state.identities[current.id] = current

            for post in state.posts.values():
                if post.identity_id != current.id:
                    continue
                post.owner_display_name = current.display_name
                post.owner_username = current.username or current.email.split("@")[0]
                post.updated_at = utc_now()

        await self.store.mutate(mutation)
        refreshed = await self.store.get_model("identities", identity.id, OmniaIdentity)
        if refreshed is None:
            raise KeyError("Identity not found")
        return refreshed

    async def get_post_payload(self, post_id: str, *, viewer_identity_id: Optional[str] = None) -> Dict[str, Any]:
        post = await self._get_post(post_id)
        assets = await self.store.list_models("assets", MediaAsset)
        identities = await self.store.list_models("identities", OmniaIdentity)
        generations = await self.store.list_models("generations", GenerationJob)
        assets_by_id = {asset.id: asset for asset in assets}
        identities_by_id = {identity.id: identity for identity in identities}
        generations_by_id = {generation.id: generation for generation in generations}
        if post.visibility != Visibility.PUBLIC and viewer_identity_id != post.identity_id:
            raise PermissionError("Post is private")
        if (
            viewer_identity_id != post.identity_id
            and self._should_hide_post_from_public(
                post,
                identity=identities_by_id.get(post.identity_id),
                generations_by_id=generations_by_id,
            )
        ):
            raise PermissionError("Post is private")
        return self.serialize_post(
            post,
            assets_by_id=assets_by_id,
            identities_by_id=identities_by_id,
            viewer_identity_id=viewer_identity_id,
        )

    async def update_post(
        self,
        identity_id: str,
        post_id: str,
        *,
        title: Optional[str] = None,
        visibility: Optional[Visibility] = None,
    ) -> PublicPost:
        post = await self._owned_post(identity_id, post_id)

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

        await self.store.mutate(mutation)
        updated = await self.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def like_post(self, identity_id: str, post_id: str) -> PublicPost:
        await self.get_identity(identity_id)
        post = await self._get_post(post_id)
        if post.visibility != Visibility.PUBLIC:
            raise PermissionError("Only public posts can be liked")

        def mutation(state: StudioState) -> None:
            current = state.posts[post.id]
            if identity_id not in current.liked_by:
                current.liked_by.append(identity_id)
            current.updated_at = utc_now()
            state.posts[current.id] = current

        await self.store.mutate(mutation)
        updated = await self.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def unlike_post(self, identity_id: str, post_id: str) -> PublicPost:
        post = await self._get_post(post_id)

        def mutation(state: StudioState) -> None:
            current = state.posts[post.id]
            current.liked_by = [liked for liked in current.liked_by if liked != identity_id]
            current.updated_at = utc_now()
            state.posts[current.id] = current

        await self.store.mutate(mutation)
        updated = await self.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def move_post(self, identity_id: str, post_id: str, project_id: str) -> PublicPost:
        post = await self._owned_post(identity_id, post_id)
        project = await self.require_owned_model("projects", project_id, Project, identity_id)

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

        await self.store.mutate(mutation)
        updated = await self.store.get_model("posts", post.id, PublicPost)
        if updated is None:
            raise KeyError("Post not found")
        return updated

    async def trash_post(self, identity_id: str, post_id: str) -> Dict[str, Any]:
        post = await self._owned_post(identity_id, post_id)

        def mutation(state: StudioState) -> None:
            now = utc_now()
            count = 0
            for asset_id in post.asset_ids:
                asset = state.assets.get(asset_id)
                if asset and asset.deleted_at is None:
                    asset.deleted_at = now
                    state.assets[asset.id] = asset
                    count += 1
            current_post = state.posts.get(post.id)
            if current_post:
                current_post.updated_at = now
                state.posts[current_post.id] = current_post

        await self.store.mutate(mutation)
        return {"post_id": post.id, "trashed_count": len(post.asset_ids)}

    async def update_project(self, identity_id: str, project_id: str, *, title: str, description: str = "") -> Project:
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        next_title = title.strip()[:72]
        if not next_title:
            raise ValueError("Collection name is required")

        def mutation(state: StudioState) -> None:
            current = state.projects[project.id]
            current.title = next_title
            current.description = description.strip()
            current.updated_at = utc_now()
            state.projects[current.id] = current

        await self.store.mutate(mutation)
        updated = await self.store.get_model("projects", project.id, Project)
        if updated is None:
            raise KeyError("Project not found")
        return updated

    async def delete_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        assets = await self.list_assets(identity_id, project_id=project_id, include_deleted=True)
        if assets:
            raise ValueError("Move or remove items before deleting this collection")

        def mutation(state: StudioState) -> None:
            state.projects.pop(project.id, None)
            stale_posts = [post_id for post_id, post in state.posts.items() if post.project_id == project.id]
            for post_id in stale_posts:
                state.posts.pop(post_id, None)

        await self.store.mutate(mutation)
        return {"project_id": project.id, "status": "deleted"}

    async def trash_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        def mutation(state: StudioState) -> None:
            current = state.assets[asset.id]
            current.deleted_at = utc_now()
            state.assets[current.id] = current
            project = state.projects.get(current.project_id)
            if project and project.cover_asset_id == current.id:
                project.cover_asset_id = None
                project.updated_at = utc_now()
                state.projects[project.id] = project

        await self.store.mutate(mutation)
        updated = await self.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def restore_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        def mutation(state: StudioState) -> None:
            current = state.assets[asset.id]
            current.deleted_at = None
            state.assets[current.id] = current

        await self.store.mutate(mutation)
        updated = await self.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def permanently_delete_asset(self, identity_id: str, asset_id: str) -> Dict[str, Any]:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)
        await self._purge_asset_storage(asset)

        def mutation(state: StudioState) -> None:
            state.assets.pop(asset.id, None)

            project = state.projects.get(asset.project_id)
            if project and project.cover_asset_id == asset.id:
                project.cover_asset_id = None
                project.updated_at = utc_now()
                state.projects[project.id] = project

            stale_share_ids = [
                share_id
                for share_id, share in state.shares.items()
                if share.asset_id == asset.id
            ]
            for share_id in stale_share_ids:
                state.shares.pop(share_id, None)

            generation_id = str(asset.metadata.get("generation_id") or "")
            post = state.posts.get(generation_id)
            if post:
                post.asset_ids = [value for value in post.asset_ids if value != asset.id]
                if post.cover_asset_id == asset.id:
                    post.cover_asset_id = post.asset_ids[0] if post.asset_ids else None
                post.updated_at = utc_now()
                if post.asset_ids:
                    state.posts[post.id] = post
                else:
                    state.posts.pop(post.id, None)

        await self.store.mutate(mutation)
        return {"asset_id": asset.id, "status": "deleted"}

    async def empty_trash(self, identity_id: str) -> Dict[str, Any]:
        trashed_assets = [
            asset
            for asset in await self.list_assets(identity_id, include_deleted=True)
            if asset.deleted_at is not None
        ]

        for asset in trashed_assets:
            await self._purge_asset_storage(asset)

        trashed_asset_ids = {asset.id for asset in trashed_assets}
        trashed_project_ids = {asset.project_id for asset in trashed_assets}

        def mutation(state: StudioState) -> None:
            for asset_id in trashed_asset_ids:
                state.assets.pop(asset_id, None)

            stale_share_ids = [
                share_id
                for share_id, share in state.shares.items()
                if share.asset_id in trashed_asset_ids
            ]
            for share_id in stale_share_ids:
                state.shares.pop(share_id, None)

            now = utc_now()
            for project_id in trashed_project_ids:
                project = state.projects.get(project_id)
                if project and project.cover_asset_id in trashed_asset_ids:
                    project.cover_asset_id = None
                    project.updated_at = now
                    state.projects[project.id] = project

            for post_id, post in list(state.posts.items()):
                remaining_asset_ids = [asset_id for asset_id in post.asset_ids if asset_id not in trashed_asset_ids]
                if len(remaining_asset_ids) == len(post.asset_ids):
                    continue
                post.asset_ids = remaining_asset_ids
                if post.cover_asset_id in trashed_asset_ids:
                    post.cover_asset_id = remaining_asset_ids[0] if remaining_asset_ids else None
                post.updated_at = now
                if post.asset_ids:
                    state.posts[post_id] = post
                else:
                    state.posts.pop(post_id, None)

        await self.store.mutate(mutation)
        return {"status": "deleted", "deleted_count": len(trashed_assets)}

    async def get_identity(self, identity_id: str) -> OmniaIdentity:
        identity = await self.store.get_model("identities", identity_id, OmniaIdentity)
        if identity is None:
            raise KeyError("Identity not found")
        await self.ensure_identity(
            user_id=identity.id,
            email=identity.email,
            display_name=identity.display_name,
            username=identity.username,
            desired_plan=identity.plan,
            owner_mode=identity.owner_mode,
            root_admin=identity.root_admin,
            local_access=identity.local_access,
            accepted_terms=identity.accepted_terms,
            accepted_privacy=identity.accepted_privacy,
            accepted_usage_policy=identity.accepted_usage_policy,
            marketing_opt_in=identity.marketing_opt_in,
            bio=identity.bio,
            avatar_url=identity.avatar_url,
            default_visibility=identity.default_visibility,
        )
        refreshed = await self.store.get_model("identities", identity_id, OmniaIdentity)
        if refreshed is None:
            raise KeyError("Identity not found after refresh")
        return refreshed

    async def get_identity_by_username(self, username: str) -> OmniaIdentity:
        normalized = username.strip().lower()
        identities = await self.store.list_models("identities", OmniaIdentity)
        for identity in identities:
            if (identity.username or "").strip().lower() == normalized:
                return identity
        posts = await self.store.list_models("posts", PublicPost)
        for post in posts:
            if post.owner_username.strip().lower() != normalized:
                continue
            for identity in identities:
                if identity.id == post.identity_id:
                    return identity
        raise KeyError("Identity not found")

    async def create_generation(
        self,
        identity_id: str,
        project_id: str,
        prompt: str,
        negative_prompt: str,
        model_id: str,
        width: int,
        height: int,
        steps: int,
        cfg_scale: float,
        seed: int,
        aspect_ratio: str,
        output_count: int = 1,
    ) -> GenerationJob:
        identity = await self.get_identity(identity_id)
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        model = await self.get_model(
            model_id,
            include_local_owner=bool(identity.owner_mode and identity.local_access),
        )
        plan_config = PLAN_CATALOG[identity.plan]
        local_admin_bypass = self._can_bypass_local_generation_limits(identity, model)
        if not plan_config.can_generate and not local_admin_bypass:
            raise PermissionError("Guests cannot generate images")

        self._validate_model_for_identity(identity, model)
        self._validate_dimensions_for_model(width, height, model)

        total_credit_cost = 0 if local_admin_bypass else model.credit_cost * output_count
        available_credits = identity.monthly_credits_remaining + identity.extra_credits
        if not local_admin_bypass and available_credits < total_credit_cost:
            raise ValueError("Not enough credits to run this generation")

        cleaned_prompt = prompt.strip()
        prompt_snapshot = PromptSnapshot(
            prompt=cleaned_prompt,
            negative_prompt=negative_prompt.strip(),
            model=model.id,
            width=width,
            height=height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            aspect_ratio=aspect_ratio,
        )
        job = GenerationJob(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title=self._build_generation_title(cleaned_prompt),
            model=model.id,
            prompt_snapshot=prompt_snapshot,
            estimated_cost=0.0 if local_admin_bypass else model.estimated_cost * output_count,
            credit_cost=total_credit_cost,
            output_count=output_count,
        )

        await self.store.save_model("generations", job)
        task = asyncio.create_task(self._process_generation(job.id))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job

    async def create_share(self, identity_id: str, project_id: Optional[str], asset_id: Optional[str]) -> ShareLink:
        identity = await self.get_identity(identity_id)
        if not PLAN_CATALOG[identity.plan].share_links:
            raise PermissionError("Share links require Pro")
        if not project_id and not asset_id:
            raise ValueError("Provide a project_id or asset_id")
        if project_id:
            await self.require_owned_model("projects", project_id, Project, identity_id)
        if asset_id:
            await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        share = ShareLink(identity_id=identity_id, project_id=project_id, asset_id=asset_id)
        await self.store.save_model("shares", share)
        return share

    async def get_public_share(self, token: str) -> Dict[str, Any]:
        shares = await self.store.list_models("shares", ShareLink)
        share = next((item for item in shares if item.token == token), None)
        if share is None:
            raise KeyError("Share not found")

        payload: Dict[str, Any] = {"share": share.model_dump(mode="json")}
        if share.project_id:
            project = await self.store.get_model("projects", share.project_id, Project)
            assets = await self.list_assets(share.identity_id, project_id=share.project_id)
            payload["project"] = project.model_dump(mode="json") if project else None
            payload["assets"] = [asset.model_dump(mode="json") for asset in assets]
        elif share.asset_id:
            asset = await self.store.get_model("assets", share.asset_id, MediaAsset)
            payload["asset"] = asset.model_dump(mode="json") if asset else None
        return payload

    async def billing_summary(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        ledger = await self.store.list_models("credit_ledger", CreditLedgerEntry)
        recent_entries = [
            entry for entry in sorted(ledger, key=lambda item: item.created_at, reverse=True)
            if entry.identity_id == identity_id
        ][:12]
        return {
            "plan": PLAN_CATALOG[identity.plan].model_dump(mode="json"),
            "subscription_status": identity.subscription_status.value,
            "credits": {
                "remaining": identity.monthly_credits_remaining + identity.extra_credits,
                "monthly_remaining": identity.monthly_credits_remaining,
                "monthly_allowance": identity.monthly_credit_allowance,
                "extra_credits": identity.extra_credits,
            },
            "checkout_options": [
                {"kind": kind.value, **meta}
                for kind, meta in CHECKOUT_CATALOG.items()
            ],
            "recent_activity": [entry.model_dump(mode="json") for entry in recent_entries],
        }

    async def checkout(self, identity_id: str, kind: CheckoutKind) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        config = CHECKOUT_CATALOG[kind]
        settings = get_settings()

        if settings.lemonsqueezy_store_id:
            from urllib.parse import urlencode
            params = {
                "checkout[custom][identity_id]": identity_id,
                "checkout[email]": identity.email,
            }
            # For demonstration, map kind to a generic external variant.
            # In production, look up the variant_id from a mapping.
            variant_id = "pro_subscription" if kind == CheckoutKind.PRO_MONTHLY else "credit_pack"
            url = f"https://{settings.lemonsqueezy_store_id}.lemonsqueezy.com/checkout/buy/{variant_id}?{urlencode(params)}"
            return {
                "status": "redirect",
                "provider": "lemonsqueezy",
                "kind": kind.value,
                "checkout_url": url,
            }

        # Fallback to demo local mutation if no Lemonsqueezy configured
        updated_holder: Dict[str, OmniaIdentity] = {}

        def mutation(state: StudioState) -> None:
            current = state.identities[identity.id]
            now = utc_now()
            if config["plan"] == IdentityPlan.PRO:
                current.plan = IdentityPlan.PRO
                current.subscription_status = SubscriptionStatus.ACTIVE
                current.monthly_credit_allowance = PLAN_CATALOG[IdentityPlan.PRO].monthly_credits
                current.monthly_credits_remaining = max(
                    current.monthly_credits_remaining,
                    PLAN_CATALOG[IdentityPlan.PRO].monthly_credits,
                )
            else:
                current.extra_credits += config["credits"]

            current.updated_at = now
            state.identities[current.id] = current
            state.credit_ledger[f"checkout_{kind.value}_{int(now.timestamp())}"] = CreditLedgerEntry(
                identity_id=current.id,
                amount=config["credits"],
                entry_type=CreditEntryType.SUBSCRIPTION if config["plan"] else CreditEntryType.TOP_UP,
                description=config["label"],
                checkout_kind=kind,
            )
            updated_holder["identity"] = current.model_copy(deep=True)

        await self.store.mutate(mutation)
        updated = updated_holder["identity"]
        return {
            "status": "demo_activated",
            "provider": "demo",
            "kind": kind.value,
            "identity": self.serialize_identity(updated),
        }

    async def health(self, detail: bool = False) -> Dict[str, Any]:
        state = await self.store.snapshot()
        provider_status = await self.providers.health_snapshot(probe=detail)
        local_runtime = await self.providers.local_runtime_snapshot(probe=detail)
        degraded_states = {"degraded", "unavailable", "error"}
        overall_status = "degraded" if any(provider.get("status") in degraded_states for provider in provider_status) else "healthy"
        return {
            "status": overall_status,
            "providers": provider_status,
            "local_runtime": local_runtime,
            "counts": {
                "identities": len(state.identities),
                "projects": len(state.projects),
                "conversations": len(state.conversations),
                "chat_messages": len(state.chat_messages),
                "generations": len(state.generations),
                "assets": len(state.assets),
                "shares": len(state.shares),
            },
        }

    async def get_settings_payload(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        local_runtime = await self.providers.local_runtime_snapshot(probe=False)
        return {
            "identity": self.serialize_identity(identity),
            "plans": [plan.model_dump(mode="json") for plan in PLAN_CATALOG.values()],
            "models": [
                model.model_dump(mode="json")
                for model in await self.list_models_for_identity(
                    identity,
                    include_local_owner=bool(identity.owner_mode and identity.local_access),
                )
            ],
            "presets": PRESET_CATALOG,
            "local_runtime": self.serialize_local_runtime_payload(
                local_runtime,
                include_models=False,
            ),
        }

    async def get_owner_local_lab_payload(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        if not (identity.owner_mode and identity.local_access):
            raise PermissionError("Local lab requires owner access")

        local_runtime = await self.providers.local_runtime_snapshot(probe=True)
        models = await self._build_local_model_catalog()
        return {
            "runtime": self.serialize_owner_local_runtime_payload(local_runtime),
            "models": [model.model_dump(mode="json") for model in models],
        }

    async def list_models_for_identity(
        self,
        identity: OmniaIdentity | None = None,
        *,
        include_local_owner: bool = False,
    ) -> List[ModelCatalogEntry]:
        models = [model.model_copy(deep=True) for model in MODEL_CATALOG.values()]
        if include_local_owner and identity and identity.owner_mode and identity.local_access:
            models.extend(await self._build_local_model_catalog())
        return models

    async def get_model(self, model_id: str, *, include_local_owner: bool = False) -> ModelCatalogEntry:
        if model_id in MODEL_CATALOG:
            return MODEL_CATALOG[model_id]

        if include_local_owner:
            for model in await self._build_local_model_catalog():
                if model.id == model_id:
                    return model
        raise KeyError("Model not found")

    async def _build_local_model_catalog(self) -> List[ModelCatalogEntry]:
        local_models: List[LocalModelDescriptor] = await self.providers.list_local_models()
        catalog: List[ModelCatalogEntry] = []
        for index, model in enumerate(local_models):
            catalog.append(
                ModelCatalogEntry(
                    id=model.id,
                    label=self._build_local_model_alias(model, index),
                    description="Your local checkpoint available through this machine.",
                    min_plan=IdentityPlan.PRO,
                    credit_cost=0,
                    estimated_cost=0.0,
                    max_width=1536,
                    max_height=1536,
                    featured=False,
                    runtime="local",
                    owner_only=True,
                    provider_hint="comfyui-local",
                    source_id=model.filename,
                    license_reference="Local checkpoint on this machine. Confirm the original upstream license before public or commercial use.",
                )
            )
        return catalog

    def _build_local_model_alias(self, model: LocalModelDescriptor, index: int) -> str:
        stem = Path(model.filename).stem
        raw_tokens = [token for token in stem.replace("_", " ").replace("-", " ").replace(".", " ").split() if token]
        tokens: List[str] = []
        for token in raw_tokens[:4]:
            lower = token.lower()
            if lower in {"xl", "sdxl", "sd", "vae", "flux", "fp8", "fp16"}:
                tokens.append(token.upper())
            elif token.isdigit():
                tokens.append(token)
            else:
                tokens.append(token.capitalize())

        humanized = " ".join(tokens).strip() or f"Local {index + 1}"
        return f"Omnia {humanized}"

    def _can_bypass_local_generation_limits(self, identity: OmniaIdentity, model: ModelCatalogEntry) -> bool:
        return bool(model.runtime == "local" and identity.owner_mode and identity.local_access)

    def _validate_model_for_identity(self, identity: OmniaIdentity, model: ModelCatalogEntry) -> None:
        if model.owner_only and not (identity.owner_mode and identity.local_access):
            raise PermissionError("This model requires local owner access")
        if self._can_bypass_local_generation_limits(identity, model):
            return
        if identity.plan == IdentityPlan.FREE and model.min_plan == IdentityPlan.PRO:
            raise PermissionError("This model requires Pro")
        if identity.plan == IdentityPlan.GUEST:
            raise PermissionError("Guests cannot generate images")

    def _validate_dimensions_for_model(self, width: int, height: int, model: ModelCatalogEntry) -> None:
        if width > model.max_width or height > model.max_height:
            raise ValueError(f"{model.label} supports up to {model.max_width}x{model.max_height}")

    def _refresh_monthly_credits_locked(self, state: StudioState, identity: OmniaIdentity) -> None:
        plan_config = PLAN_CATALOG[identity.plan]
        identity.monthly_credit_allowance = plan_config.monthly_credits
        if identity.plan == IdentityPlan.GUEST:
            identity.monthly_credits_remaining = 0
            identity.last_credit_refresh_at = utc_now()
            return

        last = identity.last_credit_refresh_at.astimezone(timezone.utc)
        now = utc_now()
        if (last.year, last.month) != (now.year, now.month):
            identity.monthly_credits_remaining = plan_config.monthly_credits
            identity.last_credit_refresh_at = now
            state.credit_ledger[f"refresh_{identity.id}_{int(now.timestamp())}"] = CreditLedgerEntry(
                identity_id=identity.id,
                amount=plan_config.monthly_credits,
                entry_type=CreditEntryType.MONTHLY_GRANT,
                description=f"{plan_config.label} monthly refresh",
            )

    def _title_from_message(self, content: str) -> str:
        words = content.strip().split()
        return " ".join(words[:6]).strip()[:72] or "New chat"

    def _resolve_chat_mode(self, requested_model: str | None) -> str:
        normalized = (requested_model or "think").strip().lower()
        if normalized in {"think", "vision", "edit"}:
            return normalized
        return "think"

    def _build_chat_reply(
        self,
        content: str,
        attachments: List[ChatAttachment],
    ) -> tuple[str, List[ChatSuggestedAction]]:
        lower = content.lower()
        has_image_reference = bool(attachments) or any(keyword in lower for keyword in ("image", "photo", "upload", "reference"))
        asks_for_inpaint = any(keyword in lower for keyword in ("inpaint", "mask", "remove", "replace background", "clean the background"))
        asks_for_prompt = any(keyword in lower for keyword in ("prompt", "rewrite", "stronger prompt", "better prompt"))
        asks_for_generation = any(keyword in lower for keyword in ("generate", "create", "render", "make", "turn this into"))

        if asks_for_inpaint:
            prompt = self._compact_prompt(content)
            return (
                "This reads like an inpaint pass. Keep the untouched subject fixed, define only the area that changes, then move the final prompt into Create.",
                [
                    ChatSuggestedAction(label="Draft inpaint prompt", action="draft_prompt", value=prompt),
                    ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
                ],
            )

        if asks_for_prompt:
            prompt = self._compact_prompt(content)
            return (
                "I would tighten this into one clearer render prompt, then keep the rest as negative or edit notes.",
                [
                    ChatSuggestedAction(label="Use stronger prompt", action="draft_prompt", value=prompt),
                    ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
                ],
            )

        if has_image_reference:
            return (
                "Good starting point. Tell me what must stay, what can change, and what should feel stronger, and I can turn that into a clean prompt or edit plan.",
                [
                    ChatSuggestedAction(label="Write stronger prompt", action="draft_prompt", value=self._compact_prompt(content)),
                    ChatSuggestedAction(label="Plan edit pass", action="plan_edit"),
                ],
            )

        if asks_for_generation:
            return (
                "This already sounds close to render-ready. I would lock the subject, medium, lighting, and framing, then send it straight into Create.",
                [
                    ChatSuggestedAction(label="Draft render prompt", action="draft_prompt", value=self._compact_prompt(content)),
                    ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
                ],
            )

        return (
            "I can help turn this into a sharper prompt, an edit plan, or an inpaint request. Pick the direction and I will structure the next pass.",
            [
                ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=self._compact_prompt(content)),
                ChatSuggestedAction(label="Plan edit", action="plan_edit"),
                ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
            ],
        )

    def _build_chat_suggested_actions(
        self,
        content: str,
        attachments: List[ChatAttachment],
    ) -> List[ChatSuggestedAction]:
        _, actions = self._build_chat_reply(content, attachments)
        return actions

    def _compact_prompt(self, content: str) -> str:
        cleaned = " ".join(content.strip().split())
        if not cleaned:
            return ""
        lowered = cleaned.lower()
        if not any(keyword in lowered for keyword in ("lighting", "composition", "background", "style", "color")):
            cleaned = f"{cleaned}, clean composition, controlled lighting, high detail"
        return cleaned[:320]

    async def improve_generation_prompt(self, prompt: str) -> Dict[str, Any]:
        cleaned = " ".join(prompt.strip().split())
        if not cleaned:
            raise ValueError("Prompt cannot be empty")

        llm_result = await self.llm_gateway.improve_prompt(cleaned)
        if llm_result:
            return {
                "prompt": llm_result.text,
                "provider": llm_result.provider,
                "used_llm": True,
            }

        return {
            "prompt": self._fallback_enhanced_prompt(cleaned),
            "provider": "heuristic",
            "used_llm": False,
        }

    def _fallback_enhanced_prompt(self, prompt: str) -> str:
        cleaned = prompt.strip().strip(",.")
        lowered = cleaned.lower()
        enhancements: List[str] = []

        if not any(keyword in lowered for keyword in ("cinematic", "editorial", "studio", "photography", "illustration", "render")):
            enhancements.append("cinematic image")
        if not any(keyword in lowered for keyword in ("lighting", "light", "sunset", "shadow", "soft light")):
            enhancements.append("soft controlled lighting")
        if not any(keyword in lowered for keyword in ("composition", "framing", "close-up", "wide shot", "portrait")):
            enhancements.append("clear subject focus")
        if not any(keyword in lowered for keyword in ("detail", "texture", "sharp", "high resolution")):
            enhancements.append("high detail")
        if not any(keyword in lowered for keyword in ("background", "environment", "setting")):
            enhancements.append("clean background separation")

        if enhancements:
            cleaned = f"{cleaned}, {', '.join(enhancements)}"

        return cleaned[:420]

    async def require_owned_model(self, collection: str, model_id: str, model_type, identity_id: str):
        model = await self.store.get_model(collection, model_id, model_type)
        if model is None or model.identity_id != identity_id:
            raise KeyError(f"{model_type.__name__} not found")
        return model

    async def _process_generation(self, job_id: str) -> None:
        job = await self.store.get_model("generations", job_id, GenerationJob)
        if job is None:
            return
        provider_label = "local" if self.providers.is_local_model(job.model) else "cloud"
        await self._update_job_status(job_id, JobStatus.PROCESSING, provider=provider_label)

        try:
            generated_outputs: List[GenerationOutput] = []
            created_assets: List[MediaAsset] = []
            provider_name: Optional[str] = None

            for variation_index in range(job.output_count):
                variation_seed = job.prompt_snapshot.seed + variation_index
                result = await self.providers.generate(
                    prompt=job.prompt_snapshot.prompt,
                    negative_prompt=job.prompt_snapshot.negative_prompt,
                    width=job.prompt_snapshot.width,
                    height=job.prompt_snapshot.height,
                    seed=variation_seed,
                    model_id=job.model,
                    steps=job.prompt_snapshot.steps,
                    cfg_scale=job.prompt_snapshot.cfg_scale,
                )
                provider_name = result.provider
                asset = await self._create_asset_from_result(
                    job,
                    result.provider,
                    result.image_bytes,
                    result.mime_type,
                    variation_index=variation_index,
                    variation_count=job.output_count,
                    seed=variation_seed,
                )
                created_assets.append(asset)
                generated_outputs.append(
                    GenerationOutput(
                        asset_id=asset.id,
                        url=asset.url,
                        thumbnail_url=asset.thumbnail_url,
                        mime_type=result.mime_type,
                        width=job.prompt_snapshot.width,
                        height=job.prompt_snapshot.height,
                        variation_index=variation_index,
                    )
                )

            def mutation(state: StudioState) -> None:
                current_job = state.generations[job.id]
                current_job.status = JobStatus.COMPLETED
                current_job.provider = provider_name or current_job.provider
                current_job.outputs = generated_outputs
                current_job.completed_at = utc_now()
                current_job.updated_at = utc_now()
                state.generations[current_job.id] = current_job

                for asset in created_assets:
                    state.assets[asset.id] = asset
                project = state.projects[job.project_id]
                project.last_generation_id = current_job.id
                project.cover_asset_id = created_assets[0].id if created_assets else project.cover_asset_id
                project.updated_at = utc_now()
                state.projects[project.id] = project

                identity = state.identities[job.identity_id]
                visibility = identity.default_visibility
                state.posts[current_job.id] = PublicPost(
                    id=current_job.id,
                    workspace_id=current_job.workspace_id,
                    project_id=current_job.project_id,
                    identity_id=current_job.identity_id,
                    owner_username=identity.username or identity.email.split("@")[0],
                    owner_display_name=identity.display_name,
                    title=current_job.title,
                    prompt=current_job.prompt_snapshot.prompt,
                    cover_asset_id=created_assets[0].id if created_assets else None,
                    asset_ids=[asset.id for asset in created_assets],
                    visibility=visibility,
                    style_tags=self._infer_style_tags(current_job),
                    liked_by=[],
                    created_at=current_job.created_at,
                    updated_at=utc_now(),
                )
                self._consume_credits_locked(identity, job.credit_cost)
                identity.updated_at = utc_now()
                state.identities[identity.id] = identity
                state.credit_ledger[f"spend_{current_job.id}"] = CreditLedgerEntry(
                    identity_id=identity.id,
                    amount=-job.credit_cost,
                    entry_type=CreditEntryType.GENERATION_SPEND,
                    description=f"{job.model} image generation",
                    job_id=current_job.id,
                )

            await self.store.mutate(mutation)
        except ProviderTemporaryError as exc:
            await self._update_job_status(job_id, JobStatus.RETRYABLE_FAILED, error=str(exc))
        except Exception as exc:
            await self._update_job_status(job_id, JobStatus.FAILED, error=str(exc))

    def _consume_credits_locked(self, identity: OmniaIdentity, amount: int) -> None:
        if identity.monthly_credits_remaining >= amount:
            identity.monthly_credits_remaining -= amount
            return
        remainder = amount - identity.monthly_credits_remaining
        identity.monthly_credits_remaining = 0
        identity.extra_credits = max(identity.extra_credits - remainder, 0)

    async def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        provider: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        def mutation(state: StudioState) -> None:
            job = state.generations.get(job_id)
            if job is None:
                return
            job.status = status
            job.updated_at = utc_now()
            if provider is not None:
                job.provider = provider
            if error is not None:
                job.error = error
            if status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.RETRYABLE_FAILED):
                job.completed_at = utc_now()
            state.generations[job.id] = job

        await self.store.mutate(mutation)

    async def _create_asset_from_result(
        self,
        job: GenerationJob,
        provider: str,
        image_bytes: bytes,
        mime_type: str,
        variation_index: int = 0,
        variation_count: int = 1,
        seed: Optional[int] = None,
    ) -> MediaAsset:
        asset = MediaAsset(
            workspace_id=job.workspace_id,
            project_id=job.project_id,
            identity_id=job.identity_id,
            title=job.title or "Untitled asset",
            prompt=job.prompt_snapshot.prompt,
            url="",
            local_path="",
            metadata={
                "generation_id": job.id,
                "generation_title": job.title,
                "variation_index": variation_index,
                "variation_count": variation_count,
                "provider": provider,
                "model": job.model,
                "seed": seed if seed is not None else job.prompt_snapshot.seed,
                "steps": job.prompt_snapshot.steps,
                "cfg_scale": job.prompt_snapshot.cfg_scale,
                "width": job.prompt_snapshot.width,
                "height": job.prompt_snapshot.height,
                "negative_prompt": job.prompt_snapshot.negative_prompt,
                "mime_type": mime_type,
            },
        )
        main_extension = self._extension_for_mime_type(mime_type)
        storage_backend = self.asset_storage.default_kind
        main_key = f"generated/{job.workspace_id}/{job.project_id}/{job.id}/{asset.id}{main_extension}"
        thumbnail_key = f"generated/{job.workspace_id}/{job.project_id}/{job.id}/{asset.id}_thumb.jpg"

        backend = self.asset_storage.get(storage_backend)
        await backend.store_bytes(main_key, image_bytes, content_type=mime_type)
        asset.metadata["storage_backend"] = storage_backend
        asset.metadata["storage_key"] = main_key

        if storage_backend == "local":
            asset.local_path = str(self.asset_storage.local_backend.resolve_path(main_key))

        thumbnail_url = None
        try:
            image = await asyncio.to_thread(Image.open, io.BytesIO(image_bytes))
            thumb = image.copy()
            thumb.thumbnail((480, 480))
            thumb_buffer = io.BytesIO()
            await asyncio.to_thread(thumb.save, thumb_buffer, format="JPEG", quality=88)
            thumb_bytes = thumb_buffer.getvalue()
            await backend.store_bytes(thumbnail_key, thumb_bytes, content_type="image/jpeg")
            asset.metadata["thumbnail_storage_key"] = thumbnail_key
            if storage_backend == "local":
                asset.metadata["thumbnail_path"] = str(self.asset_storage.local_backend.resolve_path(thumbnail_key))
            thumbnail_url = "stored"
        except Exception:
            thumbnail_url = None

        asset.url = "stored"
        asset.thumbnail_url = thumbnail_url
        return asset

    def _infer_style_tags(self, job: GenerationJob) -> List[str]:
        prompt = job.prompt_snapshot.prompt.lower()
        tags: List[str] = []
        keyword_map = {
            "portrait": ["portrait", "face", "editorial"],
            "product": ["product", "packshot", "commercial", "catalog"],
            "anime": ["anime", "manga", "illustration"],
            "surreal": ["surreal", "dream", "abstract"],
            "fantasy": ["fantasy", "mythic", "wizard", "dragon"],
            "cyberpunk": ["cyberpunk", "neon", "future", "dystopian"],
            "animal": ["animal", "wildlife", "cat", "dog", "bird"],
            "cinematic": ["cinematic", "film", "moody", "dramatic"],
        }
        for tag, keywords in keyword_map.items():
            if any(keyword in prompt for keyword in keywords):
                tags.append(tag)
        if not tags:
            tags.append("featured")
        return tags[:3]

    def _extension_for_mime_type(self, mime_type: str) -> str:
        explicit_map = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
        }
        if mime_type in explicit_map:
            return explicit_map[mime_type]

        guessed = mimetypes.guess_extension(mime_type) or ""
        if guessed == ".jpe":
            return ".jpg"
        return guessed or ".bin"

    def _build_generation_title(self, prompt: str) -> str:
        cleaned = " ".join(prompt.strip().split())
        if not cleaned:
            return "Untitled set"

        lead = re.split(r"[.!?,:;\n]", cleaned, maxsplit=1)[0]
        words = lead.split()
        title = " ".join(words[:6]).strip()
        if len(words) > 6:
            title = f"{title}..."
        title = title.strip(" -_,.;:")
        if not title:
            return "Untitled set"
        return title[:72]

    async def export_identity_data(self, identity_id: str) -> Dict[str, Any]:
        """GDPR compliant export of all user data in JSON structure."""
        identity = await self.get_identity(identity_id)
        state = await self.store.snapshot()
        return build_identity_export(
            identity=identity,
            state=state,
            identity_id=identity_id,
            serialize_asset=lambda asset, viewer_identity_id: self.serialize_asset(asset, identity_id=viewer_identity_id),
            serialize_post=lambda post, assets_by_id, identities_by_id, viewer_identity_id: self.serialize_post(
                post,
                assets_by_id=assets_by_id,
                identities_by_id=identities_by_id,
                viewer_identity_id=viewer_identity_id,
            ),
        )

    async def permanently_delete_identity(self, identity_id: str) -> bool:
        """Deep purge an identity and all belonging assets from DB and Supabase Auth."""
        await self.get_identity(identity_id)
        state = await self.store.snapshot()

        assets_to_delete = [asset for asset in state.assets.values() if asset.identity_id == identity_id]
        for asset in assets_to_delete:
            await self._purge_asset_storage(asset)

        def mutation(state: StudioState) -> None:
            purge_identity_state(state, identity_id, assets_to_delete)

        await self.store.mutate(mutation)

        settings = get_settings()
        if settings.supabase_url and settings.supabase_service_role_key:
            try:
                import httpx
                # Make admin delete request to auth db
                url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{identity_id}"
                headers = {
                    "apikey": settings.supabase_service_role_key,
                    "Authorization": f"Bearer {settings.supabase_service_role_key}"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.delete(url, headers=headers)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning("Failed to delete user from Supabase auth: %s", e)
                
        return True

    async def process_lemonsqueezy_webhook(self, payload: Dict[str, Any]) -> None:
        """Handle LemonSqueezy webhook events to update user subscription and credits."""
        event_name = payload.get("meta", {}).get("event_name", "")
        custom_data = payload.get("meta", {}).get("custom_data", {})
        identity_id = custom_data.get("identity_id")
        
        if not identity_id:
            # Maybe the user didn't have an account or it was a test hook
            return
            
        now = utc_now()
        from .mailer import mailer
        
        if event_name in ("order_created", "subscription_created"):
            upgraded_email = None
            def mutation(state: StudioState) -> None:
                nonlocal upgraded_email
                current = state.identities.get(identity_id)
                if not current:
                    return
                upgraded_email = current.email
                # Assume Pro plan purchased
                if current.plan != IdentityPlan.PRO:
                    current.plan = IdentityPlan.PRO
                    current.monthly_credits_remaining = PLAN_CATALOG[IdentityPlan.PRO].monthly_credits
                    current.last_credit_refresh_at = now
                    state.credit_ledger[f"webhook_upgrade_{int(now.timestamp())}"] = CreditLedgerEntry(
                        identity_id=current.id,
                        amount=current.monthly_credits_remaining,
                        entry_type=CreditEntryType.SUBSCRIPTION,
                        description="Pro Upgrade (LemonSqueezy)",
                    )
                else:
                    # Top-up via standalone order
                    amount = 500
                    current.extra_credits += amount
                    state.credit_ledger[f"webhook_topup_{int(now.timestamp())}"] = CreditLedgerEntry(
                        identity_id=current.id,
                        amount=amount,
                        entry_type=CreditEntryType.TOP_UP,
                        description="Credit Top-up (LemonSqueezy)",
                    )
                current.updated_at = now
                state.identities[current.id] = current

            await self.store.mutate(mutation)
            if upgraded_email:
                await mailer.send_subscription_update(upgraded_email, "Pro")

        elif event_name in ("subscription_cancelled", "subscription_expired"):
            def mutation(state: StudioState) -> None:
                current = state.identities.get(identity_id)
                if not current:
                    return
                if current.plan == IdentityPlan.PRO:
                    current.plan = IdentityPlan.FREE
                    current.monthly_credits_remaining = PLAN_CATALOG[IdentityPlan.FREE].monthly_credits
                    current.last_credit_refresh_at = now
                current.updated_at = now
                state.identities[current.id] = current

            await self.store.mutate(mutation)
