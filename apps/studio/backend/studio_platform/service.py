from __future__ import annotations

import asyncio
import io
import hashlib
import hmac
import json
import logging
import math
import os
import mimetypes
import re
import socket
from contextlib import suppress
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from urllib.parse import urlparse
from uuid import uuid4

from PIL import Image, ImageDraw, ImageFilter
import jwt
import zipfile

from config.env import Environment, get_settings

from .asset_import_ops import parse_data_url_image
from .asset_ops import (
    empty_trash_in_state,
    permanently_remove_asset_from_state,
    rename_asset_in_state,
    restore_asset_in_state,
    trash_asset_in_state,
)
from .asset_storage import (
    ResolvedAssetDelivery,
    build_asset_storage_registry,
)
from .billing_ops import (
    BillingStateSnapshot,
    apply_demo_checkout,
    apply_lemonsqueezy_webhook_event,
    build_billing_summary,
    build_lemonsqueezy_webhook_receipt,
    build_lemonsqueezy_checkout_url,
    calculate_generation_final_charge,
    is_supported_lemonsqueezy_event,
    resolve_billing_state,
)
from .chat_ops import (
    build_attachment_only_request,
    build_chat_continuity_summary,
    build_chat_context,
    build_chat_generation_bridge,
    build_chat_metadata,
    build_chat_reply,
    build_chat_suggested_actions,
    conversation_seed_from_attachments,
    count_user_turns,
    detect_chat_intent,
    resolve_chat_mode,
    title_from_message,
)
from .conversation_ops import (
    apply_chat_exchange_to_state,
    apply_message_feedback_to_state,
    apply_message_pair_edit_to_state,
    build_chat_exchange_payload,
    build_conversation_detail_payload,
    build_message_action_payload,
    create_conversation_record,
    pop_message_revision,
    push_message_revision,
    remove_conversation_from_state,
)
from .cost_telemetry_ops import build_cost_telemetry_summary
from .creative_profile_ops import attach_creative_profile, resolve_creative_profile
from .entitlement_ops import (
    ensure_chat_request_allowed,
    ensure_clean_export_allowed,
    resolve_entitlements,
    resolve_guest_entitlements,
)
from .experience_contract_ops import (
    attach_chat_experience,
    build_model_route_preview,
    build_render_experience,
)
from .generation_ops import (
    apply_completed_generation_to_state,
    apply_generation_status_update,
    build_generated_asset_metadata,
    build_generation_title,
    build_prompt_snapshot,
    claim_generation_job_locked,
    count_incomplete_generations,
    create_generation_job_record,
    refresh_generation_claim_locked,
    infer_style_tags,
    requeue_generation_job_locked,
    requeue_incomplete_generations_locked,
)
from .generation_credit_forecast_ops import build_generation_credit_forecasts
from .generation_pricing_ops import (
    build_generation_pricing_quote,
    resolve_generation_pricing_lane,
)
from .llm import StudioLLMGateway
from .generation_admission_ops import (
    count_incomplete_generations_for_identity,
    count_recent_generation_requests_for_identity,
    has_duplicate_incomplete_generation,
)
from .models import (
    ChatAttachment,
    ChatConversation,
    ChatFeedback,
    ChatMessage,
    ChatRole,
    CheckoutKind,
    CostTelemetryEvent,
    CreditEntryType,
    CreditLedgerEntry,
    GenerationJob,
    GenerationOutput,
    IdentityPlan,
    JobStatus,
    ManualReviewState,
    MediaAsset,
    ModelCatalogEntry,
    OmniaIdentity,
    PlanCatalogEntry,
    PromptMemoryProfile,
    PublicPost,
    Project,
    ShareLink,
    StudioStyle,
    StudioState,
    StudioWorkspace,
    SubscriptionStatus,
    Visibility,
    utc_now,
)
from .project_ops import (
    build_project_detail_payload,
    create_project_record,
    apply_project_update,
    remove_project_from_state,
)
from .profile_ops import build_identity_export, purge_identity_state
from .provider_spend_guardrails import (
    ProviderSpendGuardrailStatus,
    evaluate_provider_spend_guardrail,
    summarize_provider_daily_spend,
)
from .prompt_engineering import compile_generation_request, improve_prompt_candidate
from .prompt_memory_ops import (
    build_prompt_memory_context,
    derive_display_title,
    derive_prompt_tags,
    update_prompt_memory_profile,
)
from .providers import (
    GenerationRoutingDecision,
    ProviderFatalError,
    ProviderReferenceImage,
    ProviderRegistry,
    ProviderTemporaryError,
    is_provider_auth_failure,
)
from .repository import StudioPersistence, StudioRepository
from .share_ops import (
    build_public_share_payload,
    build_share_token_preview,
    create_share_record,
)
from .services.billing_service import BillingService
from .services.chat_service import ChatService
from .services.generation_service import GenerationService
from .services.identity_service import IdentityService
from .services.asset_protection import GeneratedAssetProtectionPipeline
from .services.generation_broker import GenerationBroker, build_generation_broker
from .services.generation_runtime import GenerationRuntime, initial_generation_provider_label
from .services.deployment_verification import load_deployment_verification_report
from .services.launch_readiness import (
    build_launch_readiness_report,
    build_runtime_log_snapshot,
    load_provider_smoke_report,
    load_startup_verification_report,
)
from .style_library import STYLE_CATALOG, get_style_catalog_entry, serialize_style_catalog_entry
from .services.generation_dispatcher import GenerationDispatcher
from security.moderation import ModerationResult

logger = logging.getLogger(__name__)
_GENERATION_TEXT_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_FOUNDER_EMAILS = frozenset({"founder@omniacreata.com", "valiantlion@omniacreata.com", "ghostsofter12@gmail.com", "alierdincyigitaslan@gmail.com"})
_MODERATION_RESET_WINDOW = timedelta(hours=24)
_TEMP_BLOCK_AFTER_THREE_STRIKES = timedelta(minutes=15)
_TEMP_BLOCK_AFTER_FIVE_STRIKES = timedelta(hours=24)
_PROVIDER_SPEND_GUARDRAIL_USER_MESSAGE = (
    "Image generation is temporarily unavailable right now. Please try again later."
)


class GenerationCapacityError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        queue_full: bool = False,
        estimated_wait_seconds: int | None = None,
    ) -> None:
        super().__init__(message)
        self.queue_full = queue_full
        self.estimated_wait_seconds = estimated_wait_seconds


PLAN_CATALOG: Dict[IdentityPlan, PlanCatalogEntry] = {
    IdentityPlan.GUEST: PlanCatalogEntry(
        id=IdentityPlan.GUEST,
        label="Guest",
        monthly_credits=0,
        queue_priority="browse-only",
        max_incomplete_generations=0,
        generation_submit_window_seconds=60,
        generation_submit_limit=0,
        max_resolution="preview only",
        can_access_chat=False,
        premium_chat=False,
        chat_modes=[],
        chat_message_limit=0,
        max_chat_attachments=0,
        clean_exports=False,
        share_links=False,
        can_generate=False,
    ),
    IdentityPlan.FREE: PlanCatalogEntry(
        id=IdentityPlan.FREE,
        label="Free",
        monthly_credits=60,
        queue_priority="standard",
        max_incomplete_generations=2,
        generation_submit_window_seconds=60,
        generation_submit_limit=4,
        max_resolution="1024x1024",
        can_access_chat=True,
        premium_chat=False,
        chat_modes=["think"],
        chat_message_limit=25,
        max_chat_attachments=0,
        clean_exports=False,
        share_links=False,
        can_generate=True,
    ),
    IdentityPlan.PRO: PlanCatalogEntry(
        id=IdentityPlan.PRO,
        label="Pro",
        monthly_credits=1200,
        queue_priority="priority",
        max_incomplete_generations=6,
        generation_submit_window_seconds=60,
        generation_submit_limit=12,
        max_resolution="1536x1536",
        can_access_chat=True,
        premium_chat=True,
        chat_modes=["think", "vision", "edit"],
        chat_message_limit=200,
        max_chat_attachments=4,
        clean_exports=True,
        share_links=True,
        can_generate=True,
    ),
}

MODEL_CATALOG: Dict[str, ModelCatalogEntry] = {
    "flux-schnell": ModelCatalogEntry(
        id="flux-schnell",
        label="Fast",
        description="High-speed model for rapid ideation and layout testing.",
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
        label="Standard",
        description="Balanced generation engine for standard high-quality compositions.",
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
        label="Premium",
        description="Advanced engine tuned for photorealism and cinematic renders.",
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
        label="Pro",
        description="Powerful engine delivering extreme detail for stylized hero shots.",
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

class StudioService:
    def __init__(
        self,
        store: StudioPersistence,
        providers: ProviderRegistry,
        media_dir: Path,
        media_url_prefix: str = "/media",
        generation_broker: GenerationBroker | None = None,
    ) -> None:
        self.store = StudioRepository(store)
        self.providers = providers
        self.media_dir = media_dir
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.media_url_prefix = media_url_prefix.rstrip("/")
        settings = get_settings()
        self.settings = settings
        self.plan_catalog = PLAN_CATALOG
        self.checkout_catalog = CHECKOUT_CATALOG
        self._generation_runtime_mode = settings.generation_runtime_mode
        minimum_claim_lease = max(30, settings.generation_maintenance_interval_seconds * 3)
        self._generation_claim_lease_seconds = min(
            settings.generation_stale_running_seconds,
            max(settings.generation_claim_lease_seconds, minimum_claim_lease),
        )
        self._worker_id = (
            f"{socket.gethostname()}:{os.getpid()}:{self._generation_runtime_mode}:{uuid4().hex[:8]}"
        )
        self._asset_token_secret = settings.jwt_secret.get_secret_value() if settings.jwt_secret else "omnia-creata-local-dev-secret-2026"
        self._asset_token_ttl_seconds = 3600
        self.asset_protection = GeneratedAssetProtectionPipeline(secret=self._asset_token_secret)
        self.asset_storage = build_asset_storage_registry(settings, media_dir)
        self.llm_gateway = StudioLLMGateway()
        self.generation_runtime = GenerationRuntime(
            store=self.store,
            providers=providers,
            read_asset_bytes=self._read_asset_bytes,
            create_asset_from_result=self._create_asset_from_result,
        )
        self.generation_dispatcher = GenerationDispatcher(
            process_job=self._process_generation,
            max_concurrent_jobs=settings.max_concurrent_generations,
        )
        owned_broker = generation_broker is None
        self.generation_broker = generation_broker or build_generation_broker(redis_url=settings.redis_url)
        self._owns_generation_broker = owned_broker and self.generation_broker is not None
        self._broker_priority_streak = 0
        self._active_generation_claims: dict[str, str] = {}
        self._generation_broker_degraded_reason: str | None = None
        self._generation_maintenance_task: asyncio.Task[None] | None = None
        self._orphan_cleanup_task: asyncio.Task[None] | None = None
        self._last_orphan_cleanup_local_day: str | None = None
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
        self.billing = BillingService(self)
        self.chat = ChatService(self)
        self.generation = GenerationService(self)
        self.identity = IdentityService(self)

    def _can_process_generations(self) -> bool:
        return self.generation._can_process_generations()


    def _uses_shared_generation_broker(self) -> bool:
        return self.generation._uses_shared_generation_broker()


    def _uses_local_generation_fallback(self) -> bool:
        return self.generation._uses_local_generation_fallback()


    async def initialize(self) -> None:
        await self.store.load()
        if self.generation_broker is not None:
            try:
                await self.generation_broker.initialize()
                self._generation_broker_degraded_reason = None
            except Exception as exc:
                if not self._owns_generation_broker:
                    raise
                logger.warning(
                    "Generation broker unavailable; falling back to local queue behavior: %s",
                    exc,
                )
                self._generation_broker_degraded_reason = (
                    "redis_unavailable_fallback_local_queue"
                )
                self.generation_broker = None
                self._owns_generation_broker = False
        if self._uses_local_generation_fallback() and self._generation_broker_degraded_reason is None:
            self._generation_broker_degraded_reason = "web_runtime_local_fallback_no_shared_broker"
            logger.warning(
                "Generation broker is not configured for web runtime; falling back to local processing in degraded mode"
            )
        recovered_jobs: list[tuple[str, str]] = []

        def mutation(state: StudioState) -> None:
            self._initialize_state_locked(state)
            recovered_jobs.extend(
                requeue_incomplete_generations_locked(
                    state=state,
                    now=utc_now(),
                )
            )

        await self.store.mutate(mutation)
        if self._can_process_generations():
            for job_id, queue_priority in recovered_jobs:
                await self._enqueue_generation_job(job_id, priority=queue_priority)
            if recovered_jobs or self._generation_runtime_mode == "worker" or self._uses_shared_generation_broker():
                self._ensure_generation_maintenance_task()
        if self._can_process_generations() and os.getenv("PYTEST_CURRENT_TEST") is None:
            self._ensure_orphan_cleanup_task()

    async def shutdown(self) -> None:
        maintenance_task = self._generation_maintenance_task
        if maintenance_task and not maintenance_task.done():
            maintenance_task.cancel()
            with suppress(asyncio.CancelledError):
                await maintenance_task
        self._generation_maintenance_task = None
        orphan_cleanup_task = self._orphan_cleanup_task
        if orphan_cleanup_task and not orphan_cleanup_task.done():
            orphan_cleanup_task.cancel()
            with suppress(asyncio.CancelledError):
                await orphan_cleanup_task
        self._orphan_cleanup_task = None
        await self.generation_dispatcher.stop()
        self._active_generation_claims.clear()
        if self.generation_broker is not None and self._owns_generation_broker:
            await self.generation_broker.shutdown()

    @property
    def _tasks(self):
        tasks = self.generation_dispatcher.tracked_tasks()
        if self._generation_maintenance_task is not None and not self._generation_maintenance_task.done():
            tasks.add(self._generation_maintenance_task)
        if self._orphan_cleanup_task is not None and not self._orphan_cleanup_task.done():
            tasks.add(self._orphan_cleanup_task)
        return tasks

    def _ensure_generation_maintenance_task(self) -> None:
        return self.generation._ensure_generation_maintenance_task()


    def _ensure_orphan_cleanup_task(self) -> None:
        return self.generation._ensure_orphan_cleanup_task()


    async def _generation_maintenance_loop(self) -> None:
        return await self.generation._generation_maintenance_loop()


    async def _orphan_cleanup_loop(self) -> None:
        return await self.generation._orphan_cleanup_loop()


    async def _run_generation_maintenance_pass(self) -> bool:
        return await self.generation._run_generation_maintenance_pass()


    async def _enqueue_generation_job(self, job_id: str, *, priority: str) -> bool:
        return await self.generation._enqueue_generation_job(job_id=job_id, priority=priority)


    async def _claim_generation_job(
        self,
        job_id: str,
        *,
        provider: str | None = None,
        claim_token: str | None = None,
    ) -> str | None:
        return await self.generation._claim_generation_job(job_id=job_id, provider=provider, claim_token=claim_token)


    async def _refresh_generation_claim(
        self,
        job_id: str,
        *,
        claim_token: str,
        provider: str | None = None,
    ) -> bool:
        return await self.generation._refresh_generation_claim(job_id=job_id, claim_token=claim_token, provider=provider)


    async def _drain_generation_broker_into_dispatcher(self) -> int:
        return await self.generation._drain_generation_broker_into_dispatcher()


    async def _reconcile_generation_broker_state(self) -> int:
        return await self.generation._reconcile_generation_broker_state()


    async def _run_scheduled_orphan_cleanup_if_due(self) -> None:
        return await self.generation._run_scheduled_orphan_cleanup_if_due()


    async def _run_orphan_cleanup_pass(self, *, now: datetime) -> int:
        return await self.generation._run_orphan_cleanup_pass(now=now)


    async def get_public_identity(self, auth_user: Any | None) -> Dict[str, Any]:
        return await self.identity.get_public_identity(auth_user=auth_user)


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
        return await self.identity.ensure_identity(user_id=user_id, email=email, display_name=display_name, username=username, desired_plan=desired_plan, owner_mode=owner_mode, root_admin=root_admin, local_access=local_access, accepted_terms=accepted_terms, accepted_privacy=accepted_privacy, accepted_usage_policy=accepted_usage_policy, marketing_opt_in=marketing_opt_in, bio=bio, avatar_url=avatar_url, default_visibility=default_visibility)


    def _resolve_privileged_email_flags(self, email: str) -> Dict[str, bool]:
        return self.identity._resolve_privileged_email_flags(email=email)


    def _apply_privileged_identity_overrides(self, identity: OmniaIdentity) -> None:
        return self.identity._apply_privileged_identity_overrides(identity=identity)


    def _has_unlimited_generation_access(self, identity: OmniaIdentity) -> bool:
        return identity.owner_mode or identity.root_admin or identity.local_access

    async def _resolve_billing_state_for_identity(self, identity: OmniaIdentity) -> BillingStateSnapshot:
        return await self.billing._resolve_billing_state_for_identity(identity=identity)


    def _resolve_billing_state_locked(self, state: StudioState, identity: OmniaIdentity) -> BillingStateSnapshot:
        return self.billing._resolve_billing_state_locked(state=state, identity=identity)


    def _serialize_credit_snapshot(self, billing_state: BillingStateSnapshot) -> Dict[str, Any]:
        return self.billing._serialize_credit_snapshot(billing_state=billing_state)


    def _serialize_identity_payload(self, identity: OmniaIdentity) -> Dict[str, Any]:
        return self.identity._serialize_identity_payload(identity=identity)


    def _serialize_guest_identity_payload(self) -> Dict[str, Any]:
        return self.identity._serialize_guest_identity_payload()


    def _normalize_reason_code(self, value: str | None, *, fallback: str) -> str:
        normalized = re.sub(r"[^a-z0-9]+", "_", (value or "").strip().lower()).strip("_")
        return (normalized or fallback)[:64]

    def _normalize_moderation_reason(
        self,
        reason: str | None,
        moderation_result: ModerationResult,
    ) -> str:
        return self._normalize_reason_code(reason, fallback=moderation_result.value)

    def _log_security_event(
        self,
        event: str,
        *,
        level: int = logging.INFO,
        **fields: Any,
    ) -> None:
        return self.identity._log_security_event(event=event, level=level)


    def _apply_identity_moderation_flag_locked(
        self,
        identity: OmniaIdentity,
        *,
        moderation_result: ModerationResult,
        reason_code: str,
    ) -> Dict[str, Any]:
        return self.identity._apply_identity_moderation_flag_locked(identity=identity, moderation_result=moderation_result, reason_code=reason_code)


    async def record_generation_moderation_block(
        self,
        identity_id: str,
        moderation_result: ModerationResult,
        reason: str | None,
        *,
        prompt: str | None = None,
    ) -> None:
        await self.identity.record_generation_moderation_block(identity_id=identity_id, moderation_result=moderation_result, reason=reason)
        await self._record_prompt_memory_signal(
            identity_id=identity_id,
            prompt=(prompt or reason or moderation_result.value),
            improved=False,
            flagged=True,
        )


    def _assert_identity_action_allowed(
        self,
        identity: OmniaIdentity,
        *,
        action_code: str,
        action_label: str,
    ) -> None:
        return self.identity._assert_identity_action_allowed(identity=identity, action_code=action_code, action_label=action_label)


    def serialize_identity(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        return self.identity.serialize_identity(identity=identity, billing_state=billing_state)


    def serialize_entitlements(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        return self.identity.serialize_entitlements(identity=identity, billing_state=billing_state)


    def serialize_usage_summary(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        return self.identity.serialize_usage_summary(identity=identity, billing_state=billing_state)


    def _initialize_state_locked(self, state: StudioState) -> None:
        return self.identity._initialize_state_locked(state=state)


    def _migrate_identity_visibility_defaults_locked(self, state: StudioState) -> None:
        return self.identity._migrate_identity_visibility_defaults_locked(state=state)


    def _backfill_posts_locked(self, state: StudioState) -> None:
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
        return self.identity.get_public_plan_payload()


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
            and self._is_truthful_surface_asset(assets_by_id[asset_id])
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
            if cover_asset and cover_asset.deleted_at is None and self._is_truthful_surface_asset(cover_asset)
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
        share_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
        allow_clean_export: bool = False,
    ) -> Dict[str, Any]:
        protection_state = self._asset_protection_state(asset)
        library_state = self._asset_library_state(asset)
        preview_url = self.build_asset_delivery_url(
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
        payload["url"] = self.build_asset_delivery_url(
            asset.id,
            variant="content",
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        )
        payload["thumbnail_url"] = self.build_asset_delivery_url(
            asset.id,
            variant="thumbnail",
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        ) if self._asset_variant_exists(asset, "thumbnail") else None
        payload["preview_url"] = preview_url
        payload["blocked_preview_url"] = self.build_asset_delivery_url(
            asset.id,
            variant="blocked",
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        ) if protection_state == "blocked" else None
        payload["display_title"] = self._asset_display_title(asset)
        payload["derived_tags"] = self._asset_derived_tags(asset)
        payload["library_state"] = library_state
        payload["protection_state"] = protection_state
        payload["can_open"] = library_state != "blocked" and self._asset_has_renderable_variant(asset)
        payload["can_export_clean"] = bool(
            allow_clean_export
            and identity_id == asset.identity_id
            and protection_state != "blocked"
            and self._asset_variant_exists(asset, "clean")
        )
        return payload

    def serialize_assets(
        self,
        assets: List[MediaAsset],
        *,
        identity_id: Optional[str] = None,
        share_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
        allow_clean_export: bool = False,
    ) -> List[Dict[str, Any]]:
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

    def _asset_display_title(self, asset: MediaAsset) -> str:
        stored = asset.metadata.get("display_title")
        if isinstance(stored, str) and stored.strip():
            return stored.strip()[:72]
        generated = asset.metadata.get("generation_title")
        if isinstance(generated, str) and generated.strip():
            return generated.strip()[:72]
        return derive_display_title(asset.prompt, fallback=asset.title or "Untitled image set")

    def _asset_derived_tags(self, asset: MediaAsset) -> list[str]:
        stored = asset.metadata.get("derived_tags")
        if isinstance(stored, list):
            return [str(tag).strip() for tag in stored if str(tag).strip()][:8]
        negative_prompt = str(asset.metadata.get("negative_prompt") or "")
        return derive_prompt_tags(asset.prompt, negative_prompt)

    def _asset_protection_state(self, asset: MediaAsset) -> str:
        raw = str(asset.metadata.get("protection_state") or "").strip().lower()
        if raw in {"protected", "blocked"}:
            return raw
        return "protected"

    def _asset_library_state(self, asset: MediaAsset) -> str:
        raw = str(asset.metadata.get("library_state") or "").strip().lower()
        if raw in {"ready", "blocked", "failed", "generating"}:
            return raw
        if self._asset_protection_state(asset) == "blocked":
            return "blocked"
        return "ready"

    def _generation_library_state(self, job: GenerationJob) -> str:
        normalized = JobStatus.coerce(job.status)
        if normalized in {JobStatus.QUEUED, JobStatus.RUNNING}:
            return "generating"
        if normalized == JobStatus.SUCCEEDED:
            return "ready"
        if (job.error_code or "").strip().lower() in {"policy_blocked", "safety_block", "policy_review"}:
            return "blocked"
        return "failed"

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
                    "success_rate_last_5m": provider.get("success_rate_last_5m"),
                    "avg_latency_ms_last_5m": provider.get("avg_latency_ms_last_5m"),
                }
                for provider in providers
            ],
        }

    def _generate_share_public_token(self) -> str:
        return f"{uuid4().hex}{uuid4().hex}"

    def _hash_share_public_token(self, raw_token: str) -> str:
        return hmac.new(
            self._asset_token_secret.encode("utf-8"),
            raw_token.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def _serialize_share_record(self, share: ShareLink) -> Dict[str, Any]:
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
        serialized: Dict[str, Any] = {"share": self._serialize_share_record(share)}
        if "project" in payload:
            serialized["project"] = payload["project"]
        if "assets" in payload:
            serialized["assets"] = self.serialize_assets(
                [MediaAsset.model_validate(asset) for asset in payload["assets"]],
                share_id=share.id,
            )
        if "asset" in payload and payload["asset"] is not None:
            serialized["asset"] = self.serialize_asset(
                MediaAsset.model_validate(payload["asset"]),
                share_id=share.id,
            )
        return serialized

    def build_asset_delivery_url(
        self,
        asset_id: str,
        *,
        variant: str,
        identity_id: Optional[str] = None,
        share_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
    ) -> str:
        token = self._create_asset_delivery_token(
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

        pricing_lane = job.pricing_lane or resolve_generation_pricing_lane(
            provider_name=job.provider,
            requested_model_id=job.model,
            workflow=job.prompt_snapshot.workflow,
            degraded=job.degraded,
        )
        creative_profile = resolve_creative_profile(
            model_id=job.model,
            pricing_lane=pricing_lane,
            existing_profile=MODEL_CATALOG.get(job.model).creative_profile if job.model in MODEL_CATALOG else None,
        )
        render_experience = build_render_experience(
            provider_name=job.provider,
            pricing_lane=pricing_lane,
            degraded=job.degraded,
            provider_billable=job.provider_billable,
        )

        return {
            "job_id": job.id,
            "title": job.title,
            "display_title": derive_display_title(job.prompt_snapshot.prompt, fallback=job.title),
            "status": job.status.value,
            "library_state": self._generation_library_state(job),
            "project_id": job.project_id,
            "provider": job.provider,
            "provider_rollout_tier": job.provider_rollout_tier,
            "provider_billable": job.provider_billable,
            "requested_quality_tier": job.requested_quality_tier,
            "selected_quality_tier": job.selected_quality_tier,
            "degraded": job.degraded,
            "routing_strategy": job.routing_strategy,
            "routing_reason": job.routing_reason,
            "prompt_profile": job.prompt_profile,
            "queue_priority": job.queue_priority,
            "model": job.model,
            "display_model_label": creative_profile.label,
            "creative_profile": creative_profile.model_dump(mode="json"),
            "render_experience": render_experience,
            "prompt_snapshot": job.prompt_snapshot.model_dump(mode="json"),
            "pricing_lane": pricing_lane,
            "estimated_cost": job.estimated_cost,
            "estimated_cost_source": job.estimated_cost_source or "catalog_fallback",
            "actual_cost_usd": job.actual_cost_usd,
            "credit_cost": job.credit_cost,
            "reserved_credit_cost": job.reserved_credit_cost,
            "final_credit_cost": job.final_credit_cost,
            "credit_charge_policy": job.credit_charge_policy,
            "credit_status": job.credit_status,
            "output_count": job.output_count,
            "outputs": outputs,
            "error": job.error,
            "attempt_count": job.attempt_count,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "last_heartbeat_at": job.last_heartbeat_at.isoformat() if job.last_heartbeat_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    async def resolve_asset_delivery(self, asset_id: str, token: str, variant: str) -> ResolvedAssetDelivery:
        try:
            claims = self._verify_asset_delivery_token(token, asset_id=asset_id, variant=variant)
        except PermissionError as exc:
            self._log_security_event(
                "asset_access_denied",
                level=logging.WARNING,
                asset_id=asset_id,
                scope="token",
                reason_code=self._normalize_reason_code(str(exc), fallback="invalid_asset_token"),
            )
            raise
        asset = await self.store.get_model("assets", asset_id, MediaAsset)
        if asset is None:
            raise KeyError("Asset not found")
        if asset.deleted_at is not None:
            self._log_security_event(
                "asset_access_denied",
                level=logging.WARNING,
                asset_id=asset.id,
                scope="deleted_asset",
                reason_code="asset_deleted",
            )
            raise PermissionError("Asset is no longer available")

        try:
            if claims.get("share_id"):
                await self._assert_share_access_by_id(asset, str(claims["share_id"]))
            elif claims.get("share_token"):
                await self._assert_share_access_by_public_token(asset, str(claims["share_token"]))
            elif claims.get("public_preview"):
                await self._assert_public_asset_preview_access(asset.id)
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
            self._log_security_event(
                "asset_access_denied",
                level=logging.WARNING,
                asset_id=asset.id,
                identity_id=claims.get("identity_id"),
                share_id=claims.get("share_id"),
                scope=scope,
                reason_code=self._normalize_reason_code(str(exc), fallback="asset_access_denied"),
            )
            raise

        return await self._resolve_asset_variant_delivery(asset, variant)

    async def resolve_clean_asset_export(self, asset_id: str, identity_id: str) -> ResolvedAssetDelivery:
        asset = await self.store.get_model("assets", asset_id, MediaAsset)
        if asset is None:
            raise KeyError("Asset not found")
        if asset.deleted_at is not None:
            raise PermissionError("Asset is no longer available")
        if asset.identity_id != identity_id:
            raise PermissionError("Clean export is only available to the asset owner")

        identity = await self.get_identity(identity_id)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        ensure_clean_export_allowed(
            identity=identity,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        )
        if not self._asset_variant_exists(asset, "clean"):
            raise FileNotFoundError("Clean export is not available for this asset")

        return await self._resolve_stored_asset_variant_delivery(asset, "clean")

    async def _resolve_asset_variant_delivery(self, asset: MediaAsset, variant: str) -> ResolvedAssetDelivery:
        if variant == "preview":
            if self._asset_library_state(asset) == "blocked":
                return await self._resolve_blocked_asset_preview_delivery(asset)
            fallback_variant = "thumbnail" if self._asset_variant_exists(asset, "thumbnail") else "content"
            return await self._resolve_stored_asset_variant_delivery(asset, fallback_variant)
        if variant == "blocked":
            return await self._resolve_blocked_asset_preview_delivery(asset)
        if self._asset_library_state(asset) == "blocked":
            raise PermissionError("Blocked assets can only be viewed through protected preview")
        return await self._resolve_stored_asset_variant_delivery(asset, variant)

    async def _resolve_stored_asset_variant_delivery(self, asset: MediaAsset, variant: str) -> ResolvedAssetDelivery:
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

    async def _resolve_blocked_asset_preview_delivery(self, asset: MediaAsset) -> ResolvedAssetDelivery:
        if not self._asset_has_renderable_variant(asset):
            raise FileNotFoundError("Blocked preview is not available for this asset")

        source_variant = "thumbnail" if self._asset_variant_exists(asset, "thumbnail") else "content"
        source_delivery = await self._resolve_stored_asset_variant_delivery(asset, source_variant)
        if source_delivery.local_path is not None:
            source_bytes = await asyncio.to_thread(source_delivery.local_path.read_bytes)
        else:
            source_bytes = source_delivery.content or b""
        if not source_bytes:
            raise FileNotFoundError("Blocked preview is not available for this asset")

        blocked_bytes = await asyncio.to_thread(self._build_blocked_preview_bytes, source_bytes)
        return ResolvedAssetDelivery(
            filename=f"{asset.id}_blocked_preview.jpg",
            media_type="image/jpeg",
            content=blocked_bytes,
        )

    def _build_blocked_preview_bytes(self, source_bytes: bytes) -> bytes:
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

    def _assert_share_record_matches_asset(self, asset: MediaAsset, share: ShareLink) -> None:
        if share.revoked_at is not None:
            raise PermissionError("Share access denied")
        if share.expires_at and share.expires_at < utc_now():
            raise PermissionError("Share link expired")
        if share.asset_id:
            if share.asset_id != asset.id:
                raise PermissionError("Share access denied")
            return
        if share.project_id and share.project_id != asset.project_id:
            raise PermissionError("Share access denied")

    async def _assert_share_access_by_id(self, asset: MediaAsset, share_id: str) -> None:
        share = await self.store.get_share(share_id)
        if share is None:
            raise PermissionError("Share access denied")
        self._assert_share_record_matches_asset(asset, share)

    async def _assert_share_access_by_public_token(self, asset: MediaAsset, share_token: str) -> None:
        share = await self.store.get_share_by_public_token(share_token, secret=self._asset_token_secret)
        if share is None:
            raise PermissionError("Share access denied")
        self._assert_share_record_matches_asset(asset, share)

    def _create_asset_delivery_token(
        self,
        *,
        asset_id: str,
        variant: str,
        identity_id: Optional[str],
        share_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
    ) -> str:
        expires_at = utc_now() + timedelta(seconds=self._asset_token_ttl_seconds)
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
        if (
            not payload.get("identity_id")
            and not payload.get("share_id")
            and not payload.get("share_token")
            and not payload.get("public_preview")
        ):
            raise PermissionError("Asset token missing scope")
        return payload

    def _resolve_asset_variant_path(self, asset: MediaAsset, variant: str) -> Optional[Path]:
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
                return self.media_dir / name
        return None

    def _resolve_asset_variant_storage_key(self, asset: MediaAsset, variant: str) -> Optional[str]:
        if variant == "content":
            return asset.metadata.get("storage_key")
        if variant == "clean":
            return asset.metadata.get("clean_storage_key")
        if variant == "blocked":
            return asset.metadata.get("blocked_preview_storage_key")
        return asset.metadata.get("thumbnail_storage_key")

    def _resolve_asset_variant_mime_type(self, asset: MediaAsset, variant: str, name: str) -> str:
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

    def _asset_variant_exists(self, asset: MediaAsset, variant: str) -> bool:
        if variant == "preview":
            return self._asset_has_renderable_variant(asset)
        if variant == "blocked":
            return self._asset_has_renderable_variant(asset)
        if self._resolve_asset_variant_storage_key(asset, variant):
            return True
        path = self._resolve_asset_variant_path(asset, variant)
        return path is not None and path.exists()

    def _is_demo_placeholder_asset(self, asset: MediaAsset) -> bool:
        provider = str(asset.metadata.get("provider") or "").strip().lower()
        return provider == "demo"

    def _is_truthful_surface_asset(self, asset: MediaAsset) -> bool:
        return not self._is_demo_placeholder_asset(asset) and self._asset_has_renderable_variant(asset)

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
        posts = await self.store.list_posts()
        identities = await self.store.list_identities()
        generations = await self.store.list_generations()
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

    async def list_projects(
        self,
        identity_id: str,
        surface: Optional[Literal["compose", "chat"]] = None,
        *,
        include_system_managed: bool = False,
    ) -> List[Project]:
        return await self.store.list_projects_for_identity(
            identity_id,
            surface=surface,
            include_system_managed=include_system_managed,
        )

    async def create_project(
        self,
        identity_id: str,
        title: str,
        description: str = "",
        surface: str = "compose",
        *,
        system_managed: bool = False,
    ) -> Project:
        identity = await self.get_identity(identity_id)
        project = create_project_record(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title,
            description=description,
            surface=surface,
            system_managed=system_managed,
        )
        await self.store.save_model("projects", project)
        return project

    async def _get_or_create_draft_project(self, identity_id: str, *, surface: str = "compose") -> Project:
        projects = await self.list_projects(
            identity_id,
            surface=surface,
            include_system_managed=True,
        )
        for project in projects:
            if project.system_managed and project.surface == surface:
                return project
        return await self.create_project(
            identity_id,
            title="Draft project",
            description="System-managed draft project",
            surface=surface,
            system_managed=True,
        )

    async def _resolve_generation_project(
        self,
        *,
        identity: OmniaIdentity,
        requested_project_id: str,
        reference_asset: MediaAsset | None,
    ) -> Project:
        try:
            return await self.require_owned_model("projects", requested_project_id, Project, identity.id)
        except KeyError:
            if reference_asset is not None:
                fallback_project = await self.store.get_project(reference_asset.project_id)
                if fallback_project is not None and fallback_project.identity_id == identity.id:
                    logger.warning(
                        "Recovered missing generation project %s for identity %s using reference asset project %s",
                        requested_project_id,
                        identity.id,
                        fallback_project.id,
                    )
                    return fallback_project

            compose_projects = await self.list_projects(identity.id, surface="compose")
            if compose_projects:
                fallback_project = compose_projects[0]
                logger.warning(
                    "Recovered missing generation project %s for identity %s using latest compose project %s",
                    requested_project_id,
                    identity.id,
                    fallback_project.id,
                )
                return fallback_project

            fallback_project = await self._get_or_create_draft_project(identity.id, surface="compose")
            logger.warning(
                "Recovered missing generation project %s for identity %s using draft compose project %s",
                requested_project_id,
                identity.id,
                fallback_project.id,
            )
            return fallback_project

    async def get_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        generations = await self.list_generations(identity_id, project_id=project_id)
        assets = await self.list_assets(identity_id, project_id=project_id)
        allow_clean_export = await self.can_identity_clean_export(identity_id)
        return build_project_detail_payload(
            project=project,
            generations=generations,
            assets=assets,
            identity_id=identity_id,
            serialize_generation=self.serialize_generation_for_identity,
            serialize_assets=lambda values, **kwargs: self.serialize_assets(
                values,
                allow_clean_export=allow_clean_export,
                **kwargs,
            ),
        )

    async def list_conversations(self, identity_id: str) -> List[ChatConversation]:
        return await self.chat.list_conversations(identity_id=identity_id)

    async def create_conversation(self, identity_id: str, title: str = "", model: str = "studio-assist") -> ChatConversation:
        return await self.chat.create_conversation(identity_id=identity_id, title=title, model=model)

    async def get_conversation(self, identity_id: str, conversation_id: str) -> Dict[str, Any]:
        return await self.chat.get_conversation(identity_id=identity_id, conversation_id=conversation_id)

    async def list_conversation_messages(self, identity_id: str, conversation_id: str) -> List[ChatMessage]:
        return await self.chat.list_conversation_messages(identity_id=identity_id, conversation_id=conversation_id)

    async def delete_conversation(self, identity_id: str, conversation_id: str) -> None:
        return await self.chat.delete_conversation(identity_id=identity_id, conversation_id=conversation_id)

    async def set_chat_message_feedback(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
        feedback: ChatFeedback | None,
    ) -> ChatMessage:
        return await self.chat.set_chat_message_feedback(identity_id=identity_id, conversation_id=conversation_id, message_id=message_id, feedback=feedback)

    async def edit_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
        content: str,
        *,
        model: str | None = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        return await self.chat.edit_chat_message(identity_id=identity_id, conversation_id=conversation_id, message_id=message_id, content=content)

    async def regenerate_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        return await self.chat.regenerate_chat_message(identity_id=identity_id, conversation_id=conversation_id, message_id=message_id)

    async def revert_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        return await self.chat.revert_chat_message(identity_id=identity_id, conversation_id=conversation_id, message_id=message_id)

    async def send_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        content: str,
        model: str | None = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        return await self.chat.send_chat_message(identity_id=identity_id, conversation_id=conversation_id, content=content, model=model, attachments=attachments)

    async def _build_assistant_message(
        self,
        *,
        identity: OmniaIdentity,
        conversation: ChatConversation,
        history: List[ChatMessage],
        content: str,
        attachments: List[ChatAttachment],
        requested_model: str | None,
        parent_message_id: str,
        premium_chat: bool,
    ) -> ChatMessage:
        return await self.chat._build_assistant_message()

    def _messages_before_turn(self, messages: List[ChatMessage], user_message_id: str) -> List[ChatMessage]:
        return self.chat._messages_before_turn(messages=messages, user_message_id=user_message_id)

    def _find_assistant_reply_for_user(self, messages: List[ChatMessage], user_message_id: str) -> ChatMessage | None:
        return self.chat._find_assistant_reply_for_user(messages=messages, user_message_id=user_message_id)

    async def _resolve_latest_editable_turn(
        self,
        *,
        identity_id: str,
        conversation_id: str,
        user_message_id: str | None = None,
        assistant_message_id: str | None = None,
    ) -> tuple[ChatConversation, List[ChatMessage], ChatMessage, ChatMessage]:
        return await self.chat._resolve_latest_editable_turn()


    async def list_generations(self, identity_id: str, project_id: Optional[str] = None) -> List[GenerationJob]:
        return await self.generation.list_generations(identity_id=identity_id, project_id=project_id)


    async def get_generation(self, identity_id: str, generation_id: str) -> GenerationJob:
        return await self.generation.get_generation(identity_id=identity_id, generation_id=generation_id)


    async def list_assets(self, identity_id: str, project_id: Optional[str] = None, include_deleted: bool = False) -> List[MediaAsset]:
        assets = await self.store.list_assets()
        filtered = [
            asset
            for asset in assets
            if asset.identity_id == identity_id
            and (include_deleted or asset.deleted_at is None)
        ]
        if project_id:
            filtered = [asset for asset in filtered if asset.project_id == project_id]
        return sorted(filtered, key=lambda item: item.created_at, reverse=True)

    async def can_identity_clean_export(self, identity_id: str) -> bool:
        identity = await self.get_identity(identity_id)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        entitlements = resolve_entitlements(
            identity=identity,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        )
        return bool(entitlements.can_clean_exports)

    async def list_styles(self, identity_id: str) -> Dict[str, Any]:
        await self.get_identity(identity_id)
        saved_styles = await self.store.list_styles_for_identity(identity_id)
        saved_by_source = {
            style.source_style_id: style
            for style in saved_styles
            if style.source_style_id
        }
        catalog = [
            serialize_style_catalog_entry(entry, saved_style=saved_by_source.get(str(entry["id"])))
            for entry in STYLE_CATALOG
        ]
        my_styles = [self._serialize_style(style) for style in saved_styles]
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
        await self.get_identity(identity_id)
        normalized_title = title.strip()[:72]
        normalized_modifier = " ".join(prompt_modifier.strip().split())
        if not normalized_title:
            raise ValueError("Style title is required")
        if not normalized_modifier:
            raise ValueError("Style modifier is required")

        existing_styles = await self.store.list_styles_for_identity(identity_id)
        for existing in existing_styles:
            if existing.source_style_id and source_style_id and existing.source_style_id == source_style_id:
                if favorite != existing.favorite:
                    existing.favorite = favorite
                    existing.updated_at = utc_now()
                    await self.store.save_model("styles", existing)
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
        await self.store.save_model("styles", style)
        return style

    async def update_style(
        self,
        identity_id: str,
        style_id: str,
        *,
        favorite: bool | None = None,
    ) -> StudioStyle:
        style = await self.store.get_style(style_id)
        if style is None or style.identity_id != identity_id:
            raise KeyError("Style not found")
        if favorite is not None:
            style.favorite = favorite
        style.updated_at = utc_now()
        await self.store.save_model("styles", style)
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

    def _serialize_style(self, style: StudioStyle) -> Dict[str, Any]:
        return style.model_dump(mode="json")

    async def get_prompt_memory_profile_payload(self, identity_id: str) -> Dict[str, Any]:
        await self.get_identity(identity_id)
        profile = await self.store.get_prompt_memory_for_identity(identity_id)
        if profile is None:
            profile = PromptMemoryProfile(identity_id=identity_id)
        payload = profile.model_dump(mode="json")
        payload["context_summary"] = build_prompt_memory_context(profile)
        return payload

    async def _record_prompt_memory_signal(
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
        existing = await self.store.get_prompt_memory_for_identity(identity_id)
        recent_hourly_generation_count = 0
        if not improved:
            recent_hourly_generation_count = (
                await self.store.count_recent_generation_requests_for_identity(
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
        await self.store.save_model("prompt_memories", profile)
        return profile

    async def export_project(self, identity_id: str, project_id: str) -> ResolvedAssetDelivery:
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        assets = [
            asset
            for asset in await self.list_assets(identity_id, project_id=project_id, include_deleted=False)
            if self._asset_library_state(asset) == "ready"
        ]
        if not assets:
            raise ValueError("Project has no exportable images yet")

        identity = await self.get_identity(identity_id)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        ensure_clean_export_allowed(
            identity=identity,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        )

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
            for index, asset in enumerate(assets, start=1):
                if not self._asset_variant_exists(asset, "clean"):
                    continue
                delivery = await self.resolve_clean_asset_export(asset.id, identity_id)
                if delivery.local_path is not None:
                    content = await asyncio.to_thread(delivery.local_path.read_bytes)
                else:
                    content = delivery.content or b""
                extension = Path(delivery.filename).suffix or ".png"
                safe_name = re.sub(r"[^a-zA-Z0-9._-]+", "-", self._asset_display_title(asset).strip().lower()).strip("-")
                archive.writestr(f"{index:02d}-{safe_name or asset.id}{extension}", content)

        return ResolvedAssetDelivery(
            filename=f"{re.sub(r'[^a-zA-Z0-9._-]+', '-', project.title.strip().lower()).strip('-') or project.id}.zip",
            media_type="application/zip",
            content=buffer.getvalue(),
        )

    async def import_asset_from_data_url(
        self,
        identity_id: str,
        project_id: str,
        data_url: str,
        title: str,
    ) -> MediaAsset:
        identity = await self.get_identity(identity_id)
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        mime_type, image_bytes = parse_data_url_image(data_url)
        asset = MediaAsset(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title=title.strip()[:72] or "Reference upload",
            prompt="",
            url="",
            local_path="",
            metadata={
                "source": "upload",
                "mime_type": mime_type,
            },
        )
        await self._store_asset_payload(
            asset=asset,
            image_bytes=image_bytes,
            mime_type=mime_type,
            storage_prefix=f"uploads/{project.workspace_id}/{project.id}",
        )
        await self.store.save_model("assets", asset)
        return asset

    async def rename_asset(self, identity_id: str, asset_id: str, title: str) -> MediaAsset:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)
        next_title = title.strip()[:72]
        if not next_title:
            raise ValueError("Title is required")

        def mutation(state: StudioState) -> None:
            rename_asset_in_state(state=state, asset_id=asset.id, title=next_title)

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
        posts = await self.store.list_posts()
        assets = await self.store.list_assets()
        identities = await self.store.list_identities()
        generations = await self.store.list_generations()
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
                and self._is_truthful_surface_asset(assets_by_id[asset_id])
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
        return await self.identity.get_profile_payload(username=username, identity_id=identity_id, viewer_identity_id=viewer_identity_id)


    async def update_profile(
        self,
        identity_id: str,
        *,
        display_name: Optional[str] = None,
        bio: Optional[str] = None,
        default_visibility: Optional[Visibility] = None,
    ) -> OmniaIdentity:
        return await self.identity.update_profile(identity_id=identity_id, display_name=display_name, bio=bio, default_visibility=default_visibility)


    async def get_post_payload(self, post_id: str, *, viewer_identity_id: Optional[str] = None) -> Dict[str, Any]:
        post = await self._get_post(post_id)
        assets = await self.store.list_assets()
        identities = await self.store.list_identities()
        generations = await self.store.list_generations()
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
        if visibility == Visibility.PUBLIC and post.visibility != Visibility.PUBLIC:
            identity = await self.get_identity(identity_id)
            self._assert_identity_action_allowed(
                identity,
                action_code="public_post",
                action_label="making posts public",
            )

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
            apply_project_update(
                state=state,
                project_id=project.id,
                title=next_title,
                description=description,
                now=utc_now(),
            )

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
            remove_project_from_state(state=state, project_id=project.id)

        await self.store.mutate(mutation)
        return {"project_id": project.id, "status": "deleted"}

    async def trash_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        def mutation(state: StudioState) -> None:
            trash_asset_in_state(state=state, asset_id=asset.id, now=utc_now())

        await self.store.mutate(mutation)
        updated = await self.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def restore_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        def mutation(state: StudioState) -> None:
            restore_asset_in_state(state=state, asset_id=asset.id)

        await self.store.mutate(mutation)
        updated = await self.store.get_model("assets", asset.id, MediaAsset)
        if updated is None:
            raise KeyError("Asset not found")
        return updated

    async def permanently_delete_asset(self, identity_id: str, asset_id: str) -> Dict[str, Any]:
        asset = await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)
        await self._purge_asset_storage(asset)

        def mutation(state: StudioState) -> None:
            permanently_remove_asset_from_state(state=state, asset=asset, now=utc_now())

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

        def mutation(state: StudioState) -> None:
            empty_trash_in_state(state=state, trashed_assets=trashed_assets, now=utc_now())

        await self.store.mutate(mutation)
        return {"status": "deleted", "deleted_count": len(trashed_assets)}

    async def get_identity(self, identity_id: str) -> OmniaIdentity:
        return await self.identity.get_identity(identity_id=identity_id)


    async def get_identity_by_username(self, username: str) -> OmniaIdentity:
        return await self.identity.get_identity_by_username(username=username)


    async def create_generation(
        self,
        identity_id: str,
        project_id: str,
        prompt: str,
        negative_prompt: str,
        reference_asset_id: Optional[str],
        model_id: str,
        width: int,
        height: int,
        steps: int,
        cfg_scale: float,
        seed: int,
        aspect_ratio: str,
        output_count: int = 1,
    ) -> GenerationJob:
        return await self.generation.create_generation(identity_id=identity_id, project_id=project_id, prompt=prompt, negative_prompt=negative_prompt, reference_asset_id=reference_asset_id, model_id=model_id, width=width, height=height, steps=steps, cfg_scale=cfg_scale, seed=seed, aspect_ratio=aspect_ratio, output_count=output_count)


    async def _persist_generation_job_with_reservation(
        self,
        *,
        identity: OmniaIdentity,
        job: GenerationJob,
        project_id: str,
        model_id: str,
        prompt_snapshot: PromptSnapshot,
        plan_config: PlanCatalogEntry,
    ) -> GenerationJob:
        return await self.generation._persist_generation_job_with_reservation(identity=identity, job=job, project_id=project_id, model_id=model_id, prompt_snapshot=prompt_snapshot, plan_config=plan_config)


    async def create_share(self, identity_id: str, project_id: Optional[str], asset_id: Optional[str]) -> tuple[ShareLink, str]:
        identity = await self.get_identity(identity_id)
        self._assert_identity_action_allowed(
            identity,
            action_code="share_create",
            action_label="creating share links",
        )
        billing_state = await self._resolve_billing_state_for_identity(identity)
        entitlements = resolve_entitlements(
            identity=identity,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        )
        if not entitlements.can_share_links:
            raise PermissionError("Share links require Pro")
        if not project_id and not asset_id:
            raise ValueError("Provide a project_id or asset_id")
        if project_id:
            await self.require_owned_model("projects", project_id, Project, identity_id)
        if asset_id:
            await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        public_token = self._generate_share_public_token()
        share = create_share_record(
            identity_id=identity_id,
            project_id=project_id,
            asset_id=asset_id,
            token_hash=self._hash_share_public_token(public_token),
            token_preview=build_share_token_preview(public_token),
        )
        await self.store.save_model("shares", share)
        self._log_security_event(
            "share_created",
            identity_id=identity_id,
            share_id=share.id,
            project_id=project_id,
            asset_id=asset_id,
            token_preview=share.token_preview,
        )
        return share, public_token

    async def list_shares(self, identity_id: str) -> List[Dict[str, Any]]:
        await self.get_identity(identity_id)
        shares = await self.store.list_shares_for_identity(identity_id)
        shares.sort(key=lambda item: item.created_at, reverse=True)
        return [self._serialize_share_record(share) for share in shares]

    async def revoke_share(self, identity_id: str, share_id: str) -> Dict[str, Any]:
        share = await self.store.get_share(share_id)
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

        await self.store.mutate(mutation)
        updated = await self.store.get_share(share_id)
        if updated is None:
            raise KeyError("Share not found")
        self._log_security_event(
            "share_revoked",
            identity_id=identity_id,
            share_id=share_id,
            project_id=updated.project_id,
            asset_id=updated.asset_id,
        )
        return self._serialize_share_record(updated)

    async def get_public_share(self, token: str) -> Dict[str, Any]:
        share = await self.store.get_share_by_public_token(token, secret=self._asset_token_secret)
        if share is None:
            raise KeyError("Share not found")
        if share.revoked_at is not None:
            raise KeyError("Share not found")
        if share.expires_at and share.expires_at < utc_now():
            raise KeyError("Share not found")

        if share.project_id:
            project = await self.store.get_project(share.project_id)
            assets = await self.list_assets(share.identity_id, project_id=share.project_id)
            assets = [asset for asset in assets if not self._is_demo_placeholder_asset(asset)]
            return build_public_share_payload(share=share, project=project, assets=assets)
        elif share.asset_id:
            asset = await self.store.get_asset(share.asset_id)
            if asset is None or self._is_demo_placeholder_asset(asset):
                raise KeyError("Share not found")
            return build_public_share_payload(share=share, asset=asset)
        return build_public_share_payload(share=share)

    async def billing_summary(self, identity_id: str) -> Dict[str, Any]:
        return await self.billing.billing_summary(identity_id=identity_id)


    async def checkout(self, identity_id: str, kind: CheckoutKind) -> Dict[str, Any]:
        return await self.billing.checkout(identity_id=identity_id, kind=kind)


    async def health(self, detail: bool = False) -> Dict[str, Any]:
        counts = await self.store.get_counts_summary()
        data_authority = await self.store.describe_persistence()
        provider_status = await self.providers.health_snapshot(probe=detail)
        degraded_states = {"degraded", "unavailable", "error"}
        overall_status = "degraded" if any(provider.get("status") in degraded_states for provider in provider_status) else "healthy"
        broker_metrics = await self.generation_broker.metrics() if self.generation_broker is not None else None
        claimed_count = await self.generation_broker.claimed_count() if self.generation_broker is not None else 0
        worker_processing_active = bool(
            self._generation_maintenance_task is not None
            and not self._generation_maintenance_task.done()
        )
        shared_queue_configured = bool((self.settings.redis_url or "").strip())
        security_summary: Dict[str, int] | None = None
        provider_smoke_report: Dict[str, Any] | None = None
        startup_verification_report: Dict[str, Any] | None = None
        deployment_verification_report: Dict[str, Any] | None = None
        runtime_logs: Dict[str, Any] | None = None
        launch_readiness: Dict[str, Any] | None = None
        provider_spend_guardrails: Dict[str, Any] | None = None
        cost_telemetry: Dict[str, Any] | None = None
        if detail:
            def query(state: StudioState) -> Dict[str, int]:
                now = utc_now()
                temp_blocked = sum(
                    1
                    for identity in state.identities.values()
                    if identity.temp_block_until is not None and identity.temp_block_until > now
                )
                manual_review_required = sum(
                    1
                    for identity in state.identities.values()
                    if identity.manual_review_state == ManualReviewState.REQUIRED
                )
                active_shares = sum(1 for share in state.shares.values() if share.revoked_at is None)
                revoked_shares = sum(1 for share in state.shares.values() if share.revoked_at is not None)
                return {
                    "temp_blocked_identities": temp_blocked,
                    "manual_review_required_identities": manual_review_required,
                    "active_shares": active_shares,
                    "revoked_shares": revoked_shares,
                }

            security_summary = await self.store.read(query)
            provider_smoke_report = load_provider_smoke_report(self.settings)
            startup_verification_report = load_startup_verification_report(self.settings)
            deployment_verification_report = load_deployment_verification_report(self.settings)
            runtime_logs = build_runtime_log_snapshot(self.settings)
            provider_spend_guardrails = await self._build_provider_spend_guardrails_summary()
            cost_telemetry = await self._build_cost_telemetry_summary()
        if self._generation_broker_degraded_reason is not None:
            overall_status = "degraded"
        generation_broker_payload = {
            "enabled": self.generation_broker is not None,
            "configured": shared_queue_configured,
            "degraded": self._generation_broker_degraded_reason is not None,
            "detail": self._generation_broker_degraded_reason
            or ("shared_queue_active" if self.generation_broker is not None else "local_queue_only"),
            "kind": self.generation_broker.__class__.__name__ if self.generation_broker is not None else None,
            "queued_by_priority": broker_metrics,
            "claimed": claimed_count,
        }
        if detail:
            launch_readiness = build_launch_readiness_report(
                settings=self.settings,
                provider_status=provider_status,
                data_authority=data_authority,
                generation_runtime_mode=self._generation_runtime_mode,
                generation_broker=generation_broker_payload,
                chat_routing=self.llm_gateway.routing_summary(),
                provider_smoke_report=provider_smoke_report,
                startup_verification_report=startup_verification_report,
                deployment_verification_report=deployment_verification_report,
                runtime_logs=runtime_logs,
            )
        payload = {
            "status": overall_status,
            "providers": provider_status,
            "counts": counts,
            "generation_runtime_mode": self._generation_runtime_mode,
            "generation_queue": self.generation_dispatcher.metrics(),
            "generation_broker": generation_broker_payload,
            "generation_worker": {
                "id": self._worker_id,
                "processing_active": worker_processing_active,
            },
            "generation_routing": self.providers.routing_summary(),
            "chat_routing": self.llm_gateway.routing_summary(),
            "data_authority": data_authority,
        }
        if security_summary is not None:
            payload["security_summary"] = security_summary
        if provider_smoke_report is not None:
            payload["provider_smoke"] = provider_smoke_report
        if startup_verification_report is not None:
            payload["startup_verification"] = startup_verification_report
        if deployment_verification_report is not None:
            payload["deployment_verification"] = deployment_verification_report
        if runtime_logs is not None:
            payload["runtime_logs"] = runtime_logs
        if provider_spend_guardrails is not None:
            payload["provider_spend_guardrails"] = provider_spend_guardrails
        if cost_telemetry is not None:
            payload["cost_telemetry"] = cost_telemetry
        if launch_readiness is not None:
            payload["launch_readiness"] = launch_readiness
            launch_gate = launch_readiness.get("launch_gate")
            if isinstance(launch_gate, dict):
                payload["launch_gate"] = launch_gate
            provider_truth = launch_readiness.get("provider_truth")
            if isinstance(provider_truth, dict):
                payload["provider_truth"] = provider_truth
            platform_readiness = launch_readiness.get("platform_readiness")
            if isinstance(platform_readiness, dict):
                payload["platform_readiness"] = platform_readiness
            truth_sync = launch_readiness.get("truth_sync")
            if isinstance(truth_sync, dict):
                payload["truth_sync"] = truth_sync
        return payload

    async def _provider_spend_guardrail_for_provider(
        self,
        *,
        provider_name: str | None,
        provider_billable: bool | None,
        projected_cost_usd: float = 0.0,
    ) -> ProviderSpendGuardrailStatus | None:
        return await self.billing._provider_spend_guardrail_for_provider(provider_name=provider_name, provider_billable=provider_billable, projected_cost_usd=projected_cost_usd)


    async def _build_provider_spend_guardrails_summary(self) -> Dict[str, Any]:
        return await self.billing._build_provider_spend_guardrails_summary()


    async def _build_cost_telemetry_summary(self) -> Dict[str, Any]:
        return await self.billing._build_cost_telemetry_summary()


    async def _record_cost_telemetry_event(
        self,
        *,
        source_kind: str,
        surface: str,
        provider: str | None,
        amount_usd: float | None,
        identity_id: str | None = None,
        source_id: str | None = None,
        provider_model: str | None = None,
        studio_model: str | None = None,
        billable: bool | None = None,
        metadata: Dict[str, Any] | None = None,
    ) -> CostTelemetryEvent | None:
        return await self.billing._record_cost_telemetry_event(source_kind=source_kind, surface=surface, provider=provider, amount_usd=amount_usd, identity_id=identity_id, source_id=source_id, provider_model=provider_model, studio_model=studio_model, billable=billable, metadata=metadata)


    async def get_settings_payload(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        compose_draft = await self._get_or_create_draft_project(identity.id, surface="compose")
        chat_draft = await self._get_or_create_draft_project(identity.id, surface="chat")
        return {
            "identity": self.serialize_identity(identity, billing_state=billing_state),
            "entitlements": self.serialize_entitlements(identity, billing_state=billing_state),
            "plans": [plan.model_dump(mode="json") for plan in PLAN_CATALOG.values()],
            "models": [
                self._serialize_model_catalog_for_identity(identity=identity, model=model)
                for model in await self.list_models_for_identity(identity)
            ],
            "presets": PRESET_CATALOG,
            "draft_projects": {
                "compose": compose_draft.id,
                "chat": chat_draft.id,
            },
            "styles": await self.list_styles(identity.id),
            "prompt_memory": await self.get_prompt_memory_profile_payload(identity.id),
        }

    async def list_models_for_identity(
        self,
        identity: OmniaIdentity | None = None,
    ) -> List[ModelCatalogEntry]:
        return [attach_creative_profile(model) for model in MODEL_CATALOG.values()]

    async def get_model(self, model_id: str) -> ModelCatalogEntry:
        if model_id in MODEL_CATALOG:
            return attach_creative_profile(MODEL_CATALOG[model_id])
        raise KeyError("Model not found")

    def _serialize_model_catalog_for_identity(
        self,
        *,
        identity: OmniaIdentity,
        model: ModelCatalogEntry,
    ) -> Dict[str, Any]:
        creative_profile = resolve_creative_profile(
            model_id=model.id,
            pricing_lane=None,
            existing_profile=model.creative_profile,
        )
        route_preview = build_model_route_preview(
            model=model,
            identity_plan=identity.plan,
            providers=self.providers,
        )
        serialized = model.model_dump(mode="json")
        serialized["label"] = creative_profile.label
        serialized["description"] = creative_profile.description
        serialized["creative_profile"] = creative_profile.model_dump(mode="json")
        serialized["display_label"] = creative_profile.label
        serialized["display_badge"] = creative_profile.badge
        serialized["display_description"] = creative_profile.description
        serialized["render_experience"] = dict(route_preview["render_experience"])
        serialized["route_preview"] = route_preview
        return serialized

    def _validate_model_for_identity(self, identity: OmniaIdentity, model: ModelCatalogEntry) -> None:
        if identity.plan == IdentityPlan.FREE and model.min_plan == IdentityPlan.PRO:
            raise PermissionError("This model requires Pro")
        if identity.plan == IdentityPlan.GUEST:
            raise PermissionError("Guests cannot generate images")

    def _validate_dimensions_for_model(self, width: int, height: int, model: ModelCatalogEntry) -> None:
        if width > model.max_width or height > model.max_height:
            creative_profile = resolve_creative_profile(
                model_id=model.id,
                pricing_lane=None,
                existing_profile=model.creative_profile,
            )
            raise ValueError(
                f"{creative_profile.label} supports up to {model.max_width}x{model.max_height}"
            )

    def _refresh_monthly_credits_locked(self, state: StudioState, identity: OmniaIdentity) -> None:
        return self.billing._refresh_monthly_credits_locked(state=state, identity=identity)


    async def improve_generation_prompt(self, prompt: str, *, identity_id: str | None = None) -> Dict[str, Any]:
        return await self.generation.improve_generation_prompt(prompt=prompt, identity_id=identity_id)


    def _fallback_enhanced_prompt(self, prompt: str) -> str:
        return self.generation._fallback_enhanced_prompt(prompt=prompt)


    def _sanitize_generation_text(
        self,
        value: str,
        *,
        field_name: str,
        max_length: int,
    ) -> str:
        return self.generation._sanitize_generation_text(value=value, field_name=field_name, max_length=max_length)


    async def require_owned_model(self, collection: str, model_id: str, model_type, identity_id: str):
        model = await self.store.get_model(collection, model_id, model_type)
        if model is None or model.identity_id != identity_id:
            raise KeyError(f"{model_type.__name__} not found")
        return model

    async def _process_generation(self, job_id: str) -> None:
        return await self.generation._process_generation(job_id=job_id)


    async def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        provider: Optional[str] = None,
        provider_billable: Optional[bool] = None,
        error: Optional[str] = None,
        error_code: Optional[str] = None,
    ) -> Optional[GenerationJob]:
        return await self.generation._update_job_status(job_id=job_id, status=status, provider=provider, provider_billable=provider_billable, error=error, error_code=error_code)


    async def _get_generation_job_snapshot(self, job_id: str) -> Optional[GenerationJob]:
        return await self.generation._get_generation_job_snapshot(job_id=job_id)


    def _normalize_generation_error_message(self, exc: Exception) -> str:
        return self.generation._normalize_generation_error_message(exc=exc)


    def _classify_generation_error_code(self, exc: Exception) -> str:
        return self.generation._classify_generation_error_code(exc=exc)


    def _generation_retry_limit_for_job(
        self,
        job: GenerationJob,
        *,
        provider_billable: Optional[bool] = None,
    ) -> int:
        return self.generation._generation_retry_limit_for_job(job=job, provider_billable=provider_billable)


    def _log_generation_event(
        self,
        event: str,
        *,
        job: GenerationJob,
        status: JobStatus,
        provider: str | None = None,
        error: str | None = None,
        error_code: str | None = None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        level: int = logging.INFO,
    ) -> None:
        return self.generation._log_generation_event(event=event, job=job, status=status, provider=provider, error=error, error_code=error_code, started_at=started_at, finished_at=finished_at, level=level)


    async def _ensure_generation_capacity(
        self,
        *,
        identity: OmniaIdentity,
        project_id: str,
        model_id: str,
        prompt_snapshot: PromptSnapshot,
        plan_config: PlanCatalogEntry,
    ) -> None:
        return await self.generation._ensure_generation_capacity(identity=identity, project_id=project_id, model_id=model_id, prompt_snapshot=prompt_snapshot, plan_config=plan_config)


    def _estimate_queue_wait_seconds(self, queued_jobs: int) -> int:
        return self.generation._estimate_queue_wait_seconds(queued_jobs=queued_jobs)


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
        return await self.generation._create_asset_from_result(job=job, provider=provider, image_bytes=image_bytes, mime_type=mime_type, variation_index=variation_index, variation_count=variation_count, seed=seed)


    async def _load_generation_reference_image(self, job: GenerationJob) -> Optional[ProviderReferenceImage]:
        return await self.generation._load_generation_reference_image(job=job)


    async def _read_asset_bytes(self, asset: MediaAsset, *, variant: str) -> tuple[bytes, str]:
        return await self.generation._read_asset_bytes(asset=asset, variant=variant)


    async def _store_asset_payload(
        self,
        *,
        asset: MediaAsset,
        image_bytes: bytes,
        mime_type: str,
        clean_image_bytes: Optional[bytes] = None,
        clean_mime_type: Optional[str] = None,
        storage_prefix: str,
    ) -> None:
        return await self.generation._store_asset_payload(asset=asset, image_bytes=image_bytes, mime_type=mime_type, clean_image_bytes=clean_image_bytes, clean_mime_type=clean_mime_type, storage_prefix=storage_prefix)


    def _extension_for_mime_type(self, mime_type: str) -> str:
        return self.generation._extension_for_mime_type(mime_type=mime_type)


    async def export_identity_data(self, identity_id: str) -> Dict[str, Any]:
        return await self.identity.export_identity_data(identity_id=identity_id)


    async def permanently_delete_identity(self, identity_id: str) -> bool:
        return await self.identity.permanently_delete_identity(identity_id=identity_id)


    async def process_lemonsqueezy_webhook(self, payload: Dict[str, Any]) -> None:
        return await self.billing.process_lemonsqueezy_webhook(payload=payload)
