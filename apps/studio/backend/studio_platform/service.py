"""StudioService orchestrates the Studio backend.

Route handlers delegate here for lifecycle, generation, billing, moderation,
asset delivery, and public/share flows. Subdomain logic should stay in
:mod:`studio_platform.services`; this module remains the bootstrap and
cross-service coordination layer.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import logging
import os
import re
import socket
from contextlib import suppress
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional
from uuid import uuid4

from config.env import Environment, get_settings, reveal_secret_with_audit

from .asset_import_ops import parse_data_url_image
from .asset_delivery_auth import (
    DEVELOPMENT_LEGACY_ASSET_SECRET,
    resolve_asset_delivery_secrets,
)
from .asset_storage import ResolvedAssetDelivery, build_asset_storage_registry
from .billing_ops import BillingStateSnapshot
from .creative_profile_ops import resolve_creative_profile
from .experience_contract_ops import build_render_experience
from .generation_errors import GenerationCapacityError
from .generation_ops import requeue_incomplete_generations_locked
from .generation_pricing_ops import resolve_generation_pricing_lane
from .llm import StudioLLMGateway
from .models import (
    ChatAttachment,
    ChatConversation,
    ChatFeedback,
    ChatMessage,
    CheckoutKind,
    CostTelemetryEvent,
    GenerationJob,
    IdentityPlan,
    JobStatus,
    MediaAsset,
    ModelCatalogEntry,
    ModerationCase,
    ModerationCaseSource,
    ModerationCaseStatus,
    ModerationCaseSubject,
    ModerationVisibilityEffect,
    OmniaIdentity,
    DeletedIdentityTombstone,
    PlanCatalogEntry,
    PromptMemoryProfile,
    PublicPost,
    Project,
    ShareLink,
    StudioStyle,
    StudioState,
    Visibility,
    utc_now,
)
from .model_catalog_ops import MODEL_CATALOG
from .provider_spend_guardrails import ProviderSpendGuardrailStatus
from .prompt_memory_ops import derive_display_title
from .providers import ProviderReferenceImage, ProviderRegistry
from .repository import StudioPersistence, StudioRepository
from .service_catalog import (
    CHECKOUT_CATALOG,
    PLAN_CATALOG,
    PRESET_CATALOG,
    PUBLIC_PLAN_CATALOG,
    PUBLIC_TOP_UP_GROUP,
    build_checkout_catalog,
    build_plan_catalog,
    build_public_credit_pack_group,
    build_public_plan_catalog,
)
from .services.billing_service import BillingService
from .services.chat_service import ChatService
from .services.generation_service import GenerationService
from .services.health_service import HealthService
from .services.identity_service import DeletedIdentityError, IdentityService
from .services.library_service import LibraryService
from .services.moderation_audit_service import ModerationAuditService
from .services.moderation_case_service import ModerationCaseService
from .services.project_service import ProjectService
from .services.public_service import PublicService
from .services.shell_service import ShellService
from .services.access_session_service import AccessSessionService
from .services.asset_protection import GeneratedAssetProtectionPipeline
from .services.generation_broker import GenerationBroker, build_generation_broker
from .services.generation_runtime import GenerationRuntime
from .services.generation_dispatcher import GenerationDispatcher
from security.moderation import ModerationResult

logger = logging.getLogger(__name__)

# Strips ASCII control chars from generation prompts (except tab/newline/CR)
# so provider APIs that tokenise by byte can't be confused by stray bytes.
_GENERATION_TEXT_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Moderation strike bookkeeping. Strikes decay after this window so a user
# whose policy violation was a one-off isn't permanently flagged.
_MODERATION_RESET_WINDOW = timedelta(hours=24)
# After the 3rd strike, pause generation for a cool-down. After the 5th, a
# longer block. Values chosen empirically to match Trust & Safety playbook
# (see apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md).
_TEMP_BLOCK_AFTER_THREE_STRIKES = timedelta(minutes=15)
_TEMP_BLOCK_AFTER_FIVE_STRIKES = timedelta(hours=24)

# Shown to end users when provider spend guardrails trip. Kept vague on
# purpose: don't leak cost/quota details to the public surface.
_PROVIDER_SPEND_GUARDRAIL_USER_MESSAGE = (
    "Image generation is temporarily unavailable right now. Please try again later."
)

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
        self.plan_catalog = build_plan_catalog(settings)
        self.preset_catalog = PRESET_CATALOG
        self.checkout_catalog = build_checkout_catalog(settings)
        self.public_plan_catalog = build_public_plan_catalog(
            settings,
            checkout_catalog=self.checkout_catalog,
        )
        self.public_credit_pack_group = build_public_credit_pack_group(settings)
        self._generation_runtime_mode = settings.generation_runtime_mode
        minimum_claim_lease = max(30, settings.generation_maintenance_interval_seconds * 3)
        self._generation_claim_lease_seconds = min(
            settings.generation_stale_running_seconds,
            max(settings.generation_claim_lease_seconds, minimum_claim_lease),
        )
        self._worker_id = (
            f"{socket.gethostname()}:{os.getpid()}:{self._generation_runtime_mode}:{uuid4().hex[:8]}"
        )
        configured_asset_secret = reveal_secret_with_audit("JWT_SECRET", settings.jwt_secret).strip()
        if not configured_asset_secret and settings.environment != Environment.DEVELOPMENT:
            raise RuntimeError("JWT secret must be configured outside local development.")
        self._asset_token_secret, self._legacy_asset_token_secret = resolve_asset_delivery_secrets(
            settings=settings,
            configured_jwt_secret=configured_asset_secret,
        )
        self._secondary_asset_token_secret = reveal_secret_with_audit(
            "STUDIO_ASSET_TOKEN_SECONDARY_SECRET",
            settings.studio_asset_token_secondary_secret,
        ).strip()
        self._asset_token_ttl_seconds = 3600
        self.asset_protection = GeneratedAssetProtectionPipeline(
            secret=configured_asset_secret or _DEVELOPMENT_LEGACY_ASSET_SECRET
        )
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
        self._initialized = False
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
        self.health_service = HealthService(self)
        self.identity = IdentityService(self)
        self.library = LibraryService(self)
        self.projects = ProjectService(self)
        self.public = PublicService(self)
        self.shell = ShellService(self)
        self.access_sessions = AccessSessionService(self)
        self.moderation_audits = ModerationAuditService(self)
        self.moderation_cases = ModerationCaseService(self)

    def _can_process_generations(self) -> bool:
        return self.generation._can_process_generations()

    def _uses_shared_generation_broker(self) -> bool:
        return self.generation._uses_shared_generation_broker()

    def _uses_local_generation_fallback(self) -> bool:
        return self.generation._uses_local_generation_fallback()

    def _requires_strict_shared_generation_broker(self) -> bool:
        return self.settings.environment in {Environment.STAGING, Environment.PRODUCTION} and (
            self._generation_runtime_mode in {"web", "worker"}
        )

    async def initialize(self) -> None:
        self._initialized = False
        await self.store.load()
        strict_shared_broker_required = self._requires_strict_shared_generation_broker()
        if self.generation_broker is None and strict_shared_broker_required:
            raise RuntimeError(
                "Shared generation broker is required for split runtime outside local development."
            )
        if self.generation_broker is not None:
            try:
                await self.generation_broker.initialize()
                self._generation_broker_degraded_reason = None
            except Exception as exc:
                if strict_shared_broker_required:
                    raise RuntimeError(
                        "Shared generation broker is unavailable for split runtime outside local development."
                    ) from exc
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
            if strict_shared_broker_required:
                raise RuntimeError(
                    "Local generation fallback is not allowed for split runtime outside local development."
                )
            self._generation_broker_degraded_reason = "web_runtime_local_fallback_no_shared_broker"
            logger.warning(
                "Generation broker is not configured for web runtime; falling back to local processing in degraded mode"
            )
        if self.generation_broker is not None:
            recovered_claims = await self.generation.recover_startup_stale_broker_claims()
            if recovered_claims:
                logger.warning("Recovered %s stale generation broker claims during startup", len(recovered_claims))
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
        self._initialized = True

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
        await self.generation.graceful_shutdown()
        self._active_generation_claims.clear()
        if self.generation_broker is not None and self._owns_generation_broker:
            await self.generation_broker.shutdown()
        await self.store.shutdown()
        self._initialized = False

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
        accepted_terms_at: datetime | str | None = None,
        terms_version: str | None = None,
        accepted_privacy: bool = False,
        accepted_privacy_at: datetime | str | None = None,
        privacy_version: str | None = None,
        accepted_usage_policy: bool = False,
        accepted_usage_policy_at: datetime | str | None = None,
        usage_policy_version: str | None = None,
        marketing_opt_in: bool = False,
        marketing_opt_in_at: datetime | str | None = None,
        marketing_consent_version: str | None = None,
        bio: str = "",
        avatar_url: str | None = None,
        featured_asset_id: str | None = None,
        default_visibility: Optional[Visibility] = None,
    ) -> OmniaIdentity:
        return await self.identity.ensure_identity(
            user_id=user_id,
            email=email,
            display_name=display_name,
            username=username,
            desired_plan=desired_plan,
            owner_mode=owner_mode,
            root_admin=root_admin,
            local_access=local_access,
            accepted_terms=accepted_terms,
            accepted_terms_at=accepted_terms_at,
            terms_version=terms_version,
            accepted_privacy=accepted_privacy,
            accepted_privacy_at=accepted_privacy_at,
            privacy_version=privacy_version,
            accepted_usage_policy=accepted_usage_policy,
            accepted_usage_policy_at=accepted_usage_policy_at,
            usage_policy_version=usage_policy_version,
            marketing_opt_in=marketing_opt_in,
            marketing_opt_in_at=marketing_opt_in_at,
            marketing_consent_version=marketing_consent_version,
            bio=bio,
            avatar_url=avatar_url,
            featured_asset_id=featured_asset_id,
            default_visibility=default_visibility,
        )

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
        return self.identity._log_security_event(event=event, level=level, **fields)
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
    async def record_prompt_moderation_audit(
        self,
        *,
        surface: str,
        identity_id: str | None,
        original_text: str,
        final_text: str,
        decision,
    ):
        return await self.moderation_audits.record_prompt_decision(
            surface=surface,
            identity_id=identity_id,
            original_text=original_text,
            final_text=final_text,
            decision=decision,
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
        return self.public.backfill_posts_locked(state)
    def _normalize_public_posts_locked(self, state: StudioState) -> None:
        return self.public.normalize_public_posts_locked(state)
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
        return self.public.post_preview_assets(
            assets_by_id,
            asset_ids,
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
        return self.public.serialize_post(
            post,
            assets_by_id=assets_by_id,
            identities_by_id=identities_by_id,
            viewer_identity_id=viewer_identity_id,
            public_preview=public_preview,
        )
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
        return self.library.serialize_asset(
            asset,
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
            allow_clean_export=allow_clean_export,
        )
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
        return self.library.serialize_assets(
            assets,
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
            allow_clean_export=allow_clean_export,
        )
    def _asset_display_title(self, asset: MediaAsset) -> str:
        return self.library.asset_display_title(asset)
    def _asset_derived_tags(self, asset: MediaAsset) -> list[str]:
        return self.library.asset_derived_tags(asset)
    def _asset_protection_state(self, asset: MediaAsset) -> str:
        return self.library.asset_protection_state(asset)
    def _asset_library_state(self, asset: MediaAsset) -> str:
        return self.library.asset_library_state(asset)
    def _generation_library_state(self, job: GenerationJob) -> str:
        return self.library.generation_library_state(job)
    def serialize_health_payload(self, payload: Dict[str, Any], detail: bool) -> Dict[str, Any]:
        return self.health_service.serialize_health_payload(payload, detail)
    def _generate_share_public_token(self) -> str:
        return f"{uuid4().hex}{uuid4().hex}"
    def _hash_share_public_token(self, raw_token: str) -> str:
        return hmac.new(
            self._asset_token_secret.encode("utf-8"),
            raw_token.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    @property
    def _asset_token_secrets(self) -> tuple[str, ...]:
        secrets: list[str] = [self._asset_token_secret]
        for candidate in (self._secondary_asset_token_secret, self._legacy_asset_token_secret):
            normalized = str(candidate or "").strip()
            if normalized and normalized not in secrets:
                secrets.append(normalized)
        return tuple(secrets)
    async def _get_share_by_public_token(self, raw_token: str) -> ShareLink | None:
        for secret in self._asset_token_secrets:
            share = await self.store.get_share_by_public_token(raw_token, secret=secret)
            if share is not None:
                return share
        return None
    async def _get_share_by_public_token_hash(self, token_hash: str) -> ShareLink | None:
        for secret in self._asset_token_secrets:
            share = await self.store.get_share_by_public_token_hash(token_hash, secret=secret)
            if share is not None:
                return share
        return None
    def _serialize_share_record(self, share: ShareLink) -> Dict[str, Any]:
        return self.public.serialize_share_record(share)
    def serialize_public_share_payload(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        return self.public.serialize_public_share_payload(payload)

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
        return self.library.build_asset_delivery_url(
            asset_id,
            variant=variant,
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        )

    def serialize_generation_for_identity(
        self,
        job: GenerationJob,
        identity_id: str,
        *,
        project: Project | None = None,
    ) -> Dict[str, Any]:
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

        normalized_status = JobStatus.coerce(job.status)
        moderation_outcome = "allowed"
        if job.moderation_action == "review":
            moderation_outcome = "reviewed"
        elif job.moderation_action == "hard_block" or self._generation_library_state(job) == "blocked":
            moderation_outcome = "blocked"
        elif job.moderation_rewrite_applied:
            moderation_outcome = "adapted"

        if job.credit_status == "settled":
            default_refund_state = "committed"
        elif job.credit_status == "released":
            default_refund_state = "refunded"
        elif job.reserved_credit_cost > 0:
            default_refund_state = "reserved"
        else:
            default_refund_state = "pending"

        slot_status_lookup = {
            JobStatus.QUEUED: "queued",
            JobStatus.RUNNING: "running" if job.claim_token else "claimed",
            JobStatus.SUCCEEDED: "succeeded",
            JobStatus.FAILED: "failed",
            JobStatus.RETRYABLE_FAILED: "failed",
            JobStatus.CANCELLED: "cancelled",
            JobStatus.TIMED_OUT: "timed_out",
        }

        output_by_index = {output["variation_index"]: output for output in outputs}
        slots: list[Dict[str, Any]] = []
        for slot_index in range(max(int(job.output_count or 0), 1)):
            slot_output = output_by_index.get(slot_index)
            slot_status = slot_status_lookup.get(normalized_status, "queued")
            refund_state = default_refund_state
            if slot_output is not None:
                slot_status = "succeeded"
                refund_state = "committed" if (job.final_credit_cost or 0) > 0 else "refunded"
            elif normalized_status == JobStatus.SUCCEEDED:
                slot_status = "failed"
            elif self._generation_library_state(job) == "blocked":
                slot_status = "blocked"
                refund_state = "refunded"
            elif normalized_status in {JobStatus.FAILED, JobStatus.RETRYABLE_FAILED, JobStatus.CANCELLED, JobStatus.TIMED_OUT}:
                refund_state = "refunded"

            slots.append(
                {
                    "slot_index": slot_index,
                    "slot_status": slot_status,
                    "moderation_outcome": "allowed" if slot_output is not None else moderation_outcome,
                    "error_code": None if slot_output is not None else job.error_code,
                    "refund_state": refund_state,
                    "output": slot_output,
                }
            )

        committed_slots = sum(1 for slot in slots if slot["refund_state"] == "committed")
        refunded_slots = sum(1 for slot in slots if slot["refund_state"] == "refunded")
        blocked_slots = sum(1 for slot in slots if slot["slot_status"] == "blocked")
        failed_slots = sum(
            1 for slot in slots if slot["slot_status"] in {"failed", "cancelled", "timed_out"}
        )
        session_status = (
            "blocked"
            if blocked_slots and committed_slots == 0
            else "completed"
            if committed_slots == len(slots)
            else normalized_status.value
        )
        project_assignment_state = {
            "project_id": job.project_id,
            "system_managed": project.system_managed if project is not None else None,
            "surface": project.surface if project is not None else None,
            "assignment_mode": (
                "system_draft"
                if project is not None and project.system_managed
                else "user_project"
                if project is not None
                else "unknown"
            ),
        }

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
            "moderation": {
                "tier": (job.moderation_tier or "auto"),
                "reason": job.moderation_reason,
                "review_routed": str(job.moderation_tier or "").strip().lower() not in {"", "auto"},
                "decision": job.moderation_action,
                "risk_level": job.moderation_risk_level,
                "risk_score": job.moderation_risk_score,
                "age_ambiguity": job.moderation_age_ambiguity,
                "sexual_intent": job.moderation_sexual_intent,
                "context_type": job.moderation_context_type,
                "audit_id": job.moderation_audit_id,
                "rewrite_applied": job.moderation_rewrite_applied,
                "rewritten_prompt": job.moderation_rewritten_prompt,
                "llm_used": job.moderation_llm_used,
            },
            "actual_cost_usd": job.actual_cost_usd,
            "credit_cost": job.credit_cost,
            "reserved_credit_cost": job.reserved_credit_cost,
            "final_credit_cost": job.final_credit_cost,
            "credit_charge_policy": job.credit_charge_policy,
            "credit_status": job.credit_status,
            "output_count": job.output_count,
            "outputs": outputs,
            "slots": slots,
            "session_status": session_status,
            "settlement_summary": {
                "requested_slots": len(slots),
                "produced_slots": len(outputs),
                "committed_slots": committed_slots,
                "refunded_slots": refunded_slots,
                "blocked_slots": blocked_slots,
                "failed_slots": failed_slots,
                "reserved_credits": job.reserved_credit_cost,
                "committed_credits": max(int(job.final_credit_cost or 0), 0),
                "refunded_credits": max(int(job.reserved_credit_cost or 0) - max(int(job.final_credit_cost or 0), 0), 0),
                "charge_state": job.credit_status,
            },
            "moderation_summary": {
                "outcome": moderation_outcome,
                "decision": job.moderation_action,
                "rewrite_applied": job.moderation_rewrite_applied,
                "review_routed": str(job.moderation_tier or "").strip().lower() not in {"", "auto"},
                "allowed_slots": len(slots) - blocked_slots,
                "blocked_slots": blocked_slots,
                "adapted_slots": len(slots) if moderation_outcome == "adapted" else 0,
            },
            "project_assignment_state": project_assignment_state,
            "error": job.error,
            "error_code": job.error_code,
            "attempt_count": job.attempt_count,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "last_heartbeat_at": job.last_heartbeat_at.isoformat() if job.last_heartbeat_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    async def resolve_asset_delivery(self, asset_id: str, token: str, variant: str) -> ResolvedAssetDelivery:
        return await self.library.resolve_asset_delivery(asset_id, token, variant)

    async def resolve_clean_asset_export(self, asset_id: str, identity_id: str) -> ResolvedAssetDelivery:
        return await self.library.resolve_clean_asset_export(asset_id, identity_id)

    async def _resolve_asset_variant_delivery(self, asset: MediaAsset, variant: str) -> ResolvedAssetDelivery:
        return await self.library.resolve_asset_variant_delivery(asset, variant)

    async def _resolve_stored_asset_variant_delivery(self, asset: MediaAsset, variant: str) -> ResolvedAssetDelivery:
        return await self.library.resolve_stored_asset_variant_delivery(asset, variant)

    async def _resolve_blocked_asset_preview_delivery(self, asset: MediaAsset) -> ResolvedAssetDelivery:
        return await self.library.resolve_blocked_asset_preview_delivery(asset)

    def _build_blocked_preview_bytes(self, source_bytes: bytes) -> bytes:
        return self.library.build_blocked_preview_bytes(source_bytes)

    def _assert_share_record_matches_asset(self, asset: MediaAsset, share: ShareLink) -> None:
        return self.library.assert_share_record_matches_asset(asset, share)

    async def _assert_share_access_by_id(self, asset: MediaAsset, share_id: str) -> None:
        await self.library.assert_share_access_by_id(asset, share_id)

    async def _assert_share_access_by_public_token(self, asset: MediaAsset, share_token: str) -> None:
        await self.library.assert_share_access_by_public_token(asset, share_token)

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
        return self.library.create_asset_delivery_token(
            asset_id=asset_id,
            variant=variant,
            identity_id=identity_id,
            share_id=share_id,
            share_token=share_token,
            public_preview=public_preview,
        )

    def _verify_asset_delivery_token(self, token: str, *, asset_id: str, variant: str) -> Dict[str, Any]:
        return self.library.verify_asset_delivery_token(token, asset_id=asset_id, variant=variant)

    def _resolve_asset_variant_path(self, asset: MediaAsset, variant: str) -> Optional[Path]:
        return self.library.resolve_asset_variant_path(asset, variant)

    def _resolve_asset_variant_storage_key(self, asset: MediaAsset, variant: str) -> Optional[str]:
        return self.library.resolve_asset_variant_storage_key(asset, variant)

    def _resolve_asset_variant_mime_type(self, asset: MediaAsset, variant: str, name: str) -> str:
        return self.library.resolve_asset_variant_mime_type(asset, variant, name)

    def _asset_variant_exists(self, asset: MediaAsset, variant: str) -> bool:
        return self.library.asset_variant_exists(asset, variant)

    def _is_demo_placeholder_asset(self, asset: MediaAsset) -> bool:
        return self.library.is_demo_placeholder_asset(asset)

    def _is_truthful_surface_asset(self, asset: MediaAsset) -> bool:
        return self.library.is_truthful_surface_asset(asset)

    def _asset_has_renderable_variant(self, asset: MediaAsset) -> bool:
        return self.library.asset_has_renderable_variant(asset)

    def _normalize_public_post_text(self, value: str) -> str:
        return self.public.normalize_public_post_text(value)

    def _looks_like_public_feed_gibberish(self, value: str) -> bool:
        return self.public.looks_like_public_feed_gibberish(value)

    def _identity_public_username(self, identity: Optional[OmniaIdentity], *, fallback: str = "creator") -> str:
        return self.public.identity_public_username(identity, fallback=fallback)

    def _identity_public_display_name(self, identity: Optional[OmniaIdentity], *, fallback: str = "Creator") -> str:
        return self.public.identity_public_display_name(identity, fallback=fallback)

    def _is_internal_identity(self, identity: Optional[OmniaIdentity]) -> bool:
        return self.public.is_internal_identity(identity)

    def _generation_provider_for_post(
        self,
        post: PublicPost,
        generations_by_id: Dict[str, GenerationJob],
    ) -> str:
        return self.public.generation_provider_for_post(post, generations_by_id)

    def _should_hide_post_from_public(
        self,
        post: PublicPost,
        *,
        identity: Optional[OmniaIdentity],
        generations_by_id: Dict[str, GenerationJob],
    ) -> bool:
        return self.public.should_hide_post_from_public(
            post,
            identity=identity,
            generations_by_id=generations_by_id,
        )

    def _is_publicly_safe_post(self, post: PublicPost) -> bool:
        return self.public.is_publicly_safe_post(post)

    def _is_publicly_presentable_post(self, post: PublicPost) -> bool:
        return self.public.is_publicly_presentable_post(post)

    def _is_publicly_showcase_ready_post(self, post: PublicPost) -> bool:
        return self.public.is_publicly_showcase_ready_post(post)

    def _public_feed_dedupe_key(self, post: PublicPost) -> str:
        return self.public.public_feed_dedupe_key(post)

    async def _assert_public_asset_preview_access(self, asset_id: str) -> None:
        await self.library.assert_public_asset_preview_access(asset_id)

    async def _delete_asset_variant(self, asset: MediaAsset, variant: str) -> None:
        await self.library.delete_asset_variant(asset, variant)

    async def _purge_asset_storage(self, asset: MediaAsset) -> None:
        await self.library.purge_asset_storage(asset)
    async def list_projects(
        self,
        identity_id: str,
        surface: Optional[Literal["compose", "chat"]] = None,
        *,
        include_system_managed: bool = False,
        limit: int | None = None,
        offset: int = 0,
        sort: str = "updated",
    ) -> List[Project]:
        return await self.projects.list_projects(
            identity_id,
            surface=surface,
            include_system_managed=include_system_managed,
            limit=limit,
            offset=offset,
            sort=sort,
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
        return await self.projects.create_project(
            identity_id,
            title,
            description,
            surface,
            system_managed=system_managed,
        )
    async def _get_or_create_draft_project(self, identity_id: str, *, surface: str = "compose") -> Project:
        return await self.projects.get_or_create_draft_project(identity_id, surface=surface)
    async def _resolve_generation_project(
        self,
        *,
        identity: OmniaIdentity,
        requested_project_id: str,
        reference_asset: MediaAsset | None,
    ) -> Project:
        return await self.projects.resolve_generation_project(
            identity=identity,
            requested_project_id=requested_project_id,
            reference_asset=reference_asset,
        )
    async def get_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        return await self.projects.get_project(identity_id, project_id)
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
        return await self.chat._build_assistant_message(
            identity=identity,
            conversation=conversation,
            history=history,
            content=content,
            attachments=attachments,
            requested_model=requested_model,
            parent_message_id=parent_message_id,
            premium_chat=premium_chat,
        )
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
        return await self.chat._resolve_latest_editable_turn(
            identity_id=identity_id,
            conversation_id=conversation_id,
            user_message_id=user_message_id,
            assistant_message_id=assistant_message_id,
        )

    async def list_generations(
        self,
        identity_id: str,
        project_id: Optional[str] = None,
        *,
        limit: int | None = None,
        offset: int = 0,
        sort: str = "newest",
    ) -> List[GenerationJob]:
        return await self.generation.list_generations(
            identity_id=identity_id,
            project_id=project_id,
            limit=limit,
            offset=offset,
            sort=sort,
        )

    async def get_generation(self, identity_id: str, generation_id: str) -> GenerationJob:
        return await self.generation.get_generation(identity_id=identity_id, generation_id=generation_id)

    async def delete_generation(self, identity_id: str, generation_id: str) -> dict[str, str]:
        return await self.generation.delete_generation(identity_id=identity_id, generation_id=generation_id)

    async def list_assets(
        self,
        identity_id: str,
        project_id: Optional[str] = None,
        include_deleted: bool = False,
        *,
        limit: int | None = None,
        offset: int = 0,
        sort: str = "newest",
    ) -> List[MediaAsset]:
        return await self.library.list_assets(
            identity_id,
            project_id=project_id,
            include_deleted=include_deleted,
            limit=limit,
            offset=offset,
            sort=sort,
        )

    async def can_identity_clean_export(self, identity_id: str) -> bool:
        return await self.library.can_identity_clean_export(identity_id)

    async def list_styles(self, identity_id: str) -> Dict[str, Any]:
        return await self.library.list_styles(identity_id)

    async def save_style(
        self,
        identity_id: str,
        *,
        title: str,
        prompt_modifier: str,
        text_mode: str = "modifier",
        description: str = "",
        category: str = "custom",
        preview_image_url: str | None = None,
        negative_prompt: str = "",
        preferred_model_id: str | None = None,
        preferred_aspect_ratio: str | None = None,
        preferred_steps: int | None = None,
        preferred_cfg_scale: float | None = None,
        preferred_output_count: int | None = None,
        source_kind: str = "saved",
        source_style_id: str | None = None,
        favorite: bool = False,
    ) -> StudioStyle:
        return await self.library.save_style(
            identity_id,
            title=title,
            prompt_modifier=prompt_modifier,
            text_mode=text_mode,
            description=description,
            category=category,
            preview_image_url=preview_image_url,
            negative_prompt=negative_prompt,
            preferred_model_id=preferred_model_id,
            preferred_aspect_ratio=preferred_aspect_ratio,
            preferred_steps=preferred_steps,
            preferred_cfg_scale=preferred_cfg_scale,
            preferred_output_count=preferred_output_count,
            source_kind=source_kind,
            source_style_id=source_style_id,
            favorite=favorite,
        )

    async def update_style(
        self,
        identity_id: str,
        style_id: str,
        *,
        updates: Dict[str, Any],
    ) -> StudioStyle:
        return await self.library.update_style(identity_id, style_id, updates=updates)

    async def delete_style(self, identity_id: str, style_id: str) -> None:
        await self.library.delete_style(identity_id, style_id)

    async def save_style_from_prompt(
        self,
        identity_id: str,
        *,
        prompt: str,
        title: str | None = None,
        category: str = "custom",
        negative_prompt: str = "",
        preferred_model_id: str | None = None,
        preferred_aspect_ratio: str | None = None,
        preferred_steps: int | None = None,
        preferred_cfg_scale: float | None = None,
        preferred_output_count: int | None = None,
        preview_image_url: str | None = None,
    ) -> StudioStyle:
        return await self.library.save_style_from_prompt(
            identity_id,
            prompt=prompt,
            title=title,
            category=category,
            negative_prompt=negative_prompt,
            preferred_model_id=preferred_model_id,
            preferred_aspect_ratio=preferred_aspect_ratio,
            preferred_steps=preferred_steps,
            preferred_cfg_scale=preferred_cfg_scale,
            preferred_output_count=preferred_output_count,
            preview_image_url=preview_image_url,
        )

    def _serialize_style(self, style: StudioStyle) -> Dict[str, Any]:
        return self.library.serialize_style(style)

    async def get_prompt_memory_profile_payload(self, identity_id: str) -> Dict[str, Any]:
        return await self.library.get_prompt_memory_profile_payload(identity_id)

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
        return await self.library.record_prompt_memory_signal(
            identity_id=identity_id,
            prompt=prompt,
            negative_prompt=negative_prompt,
            model_id=model_id,
            aspect_ratio=aspect_ratio,
            improved=improved,
            flagged=flagged,
        )

    async def export_project(self, identity_id: str, project_id: str) -> ResolvedAssetDelivery:
        return await self.library.export_project(identity_id, project_id)

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
        return await self.library.rename_asset(identity_id, asset_id, title)

    async def _get_post(self, post_id: str) -> PublicPost:
        return await self.public.get_post(post_id)

    async def _owned_post(self, identity_id: str, post_id: str) -> PublicPost:
        return await self.public.owned_post(identity_id, post_id)

    async def list_public_posts(self, *, sort: str = "trending", viewer_identity_id: Optional[str] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return await self.public.list_public_posts(sort=sort, viewer_identity_id=viewer_identity_id, limit=limit)

    async def list_liked_posts(self, identity_id: str, *, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        return await self.public.list_liked_posts(identity_id, limit=limit)

    async def get_profile_payload(self, *, username: Optional[str] = None, identity_id: Optional[str] = None, viewer_identity_id: Optional[str] = None, limit: Optional[int] = None) -> Dict[str, Any]:
        return await self.public.get_profile_payload(username=username, identity_id=identity_id, viewer_identity_id=viewer_identity_id, limit=limit)

    async def update_profile(self, identity_id: str, *, display_name: Optional[str] = None, bio: Optional[str] = None, default_visibility: Optional[Visibility] = None, featured_asset_id: Optional[str] = None, featured_asset_id_provided: bool = False) -> OmniaIdentity:
        return await self.public.update_profile(identity_id, display_name=display_name, bio=bio, default_visibility=default_visibility, featured_asset_id=featured_asset_id, featured_asset_id_provided=featured_asset_id_provided)

    async def get_post_payload(self, post_id: str, *, viewer_identity_id: Optional[str] = None) -> Dict[str, Any]:
        return await self.public.get_post_payload(post_id, viewer_identity_id=viewer_identity_id)

    async def update_post(self, identity_id: str, post_id: str, *, title: Optional[str] = None, visibility: Optional[Visibility] = None) -> PublicPost:
        return await self.public.update_post(identity_id, post_id, title=title, visibility=visibility)

    async def like_post(self, identity_id: str, post_id: str) -> PublicPost:
        return await self.public.like_post(identity_id, post_id)

    async def unlike_post(self, identity_id: str, post_id: str) -> PublicPost:
        return await self.public.unlike_post(identity_id, post_id)

    async def move_post(self, identity_id: str, post_id: str, project_id: str) -> PublicPost:
        return await self.public.move_post(identity_id, post_id, project_id)

    async def trash_post(self, identity_id: str, post_id: str) -> Dict[str, Any]:
        return await self.public.trash_post(identity_id, post_id)

    async def update_project(self, identity_id: str, project_id: str, *, title: str, description: str = "") -> Project:
        return await self.projects.update_project(identity_id, project_id, title=title, description=description)

    async def delete_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        return await self.projects.delete_project(identity_id, project_id)

    async def trash_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        return await self.library.trash_asset(identity_id, asset_id)

    async def restore_asset(self, identity_id: str, asset_id: str) -> MediaAsset:
        return await self.library.restore_asset(identity_id, asset_id)

    async def permanently_delete_asset(self, identity_id: str, asset_id: str) -> Dict[str, Any]:
        return await self.library.permanently_delete_asset(identity_id, asset_id)

    async def empty_trash(self, identity_id: str) -> Dict[str, Any]:
        return await self.library.empty_trash(identity_id)

    async def get_identity(self, identity_id: str) -> OmniaIdentity:
        return await self.identity.get_identity(identity_id=identity_id)

    async def get_deleted_identity_tombstone(self, identity_id: str) -> DeletedIdentityTombstone | None:
        return await self.identity.get_deleted_identity_tombstone(identity_id)

    async def is_identity_deleted(self, identity_id: str) -> bool:
        return await self.identity.is_identity_deleted(identity_id)

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
        width: int | None,
        height: int | None,
        steps: int,
        cfg_scale: float,
        seed: int,
        aspect_ratio: str,
        output_count: int = 1,
        source_prompt: str | None = None,
        moderation_tier: str = "auto",
        moderation_reason: str | None = None,
        moderation_action: str = "allow",
        moderation_risk_level: str = "low",
        moderation_risk_score: int = 0,
        moderation_age_ambiguity: str = "unknown",
        moderation_sexual_intent: str = "none",
        moderation_context_type: str = "general",
        moderation_audit_id: str | None = None,
        moderation_rewrite_applied: bool = False,
        moderation_rewritten_prompt: str | None = None,
        moderation_llm_used: bool = False,
    ) -> GenerationJob:
        return await self.generation.create_generation(
            identity_id=identity_id,
            project_id=project_id,
            prompt=prompt,
            negative_prompt=negative_prompt,
            reference_asset_id=reference_asset_id,
            model_id=model_id,
            width=width,
            height=height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            aspect_ratio=aspect_ratio,
            output_count=output_count,
            source_prompt=source_prompt,
            moderation_tier=moderation_tier,
            moderation_reason=moderation_reason,
            moderation_action=moderation_action,
            moderation_risk_level=moderation_risk_level,
            moderation_risk_score=moderation_risk_score,
            moderation_age_ambiguity=moderation_age_ambiguity,
            moderation_sexual_intent=moderation_sexual_intent,
            moderation_context_type=moderation_context_type,
            moderation_audit_id=moderation_audit_id,
            moderation_rewrite_applied=moderation_rewrite_applied,
            moderation_rewritten_prompt=moderation_rewritten_prompt,
            moderation_llm_used=moderation_llm_used,
        )

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
        return await self.public.create_share(identity_id, project_id, asset_id)

    async def list_shares(self, identity_id: str) -> List[Dict[str, Any]]:
        return await self.public.list_shares(identity_id)

    async def revoke_share(self, identity_id: str, share_id: str) -> Dict[str, Any]:
        return await self.public.revoke_share(identity_id, share_id)

    async def get_public_share(self, token: str) -> Dict[str, Any]:
        return await self.public.get_public_share(token)

    async def report_public_post(self, reporter_identity_id: str, post_id: str, *, reason_code: str, detail: str) -> ModerationCase:
        return await self.moderation_cases.report_public_post(reporter_identity_id=reporter_identity_id, post_id=post_id, reason_code=reason_code, detail=detail)

    async def submit_moderation_appeal(self, identity_id: str, *, linked_case_id: str | None, subject: ModerationCaseSubject | None, subject_id: str | None, reason_code: str, detail: str) -> ModerationCase:
        return await self.moderation_cases.submit_appeal(identity_id=identity_id, linked_case_id=linked_case_id, subject=subject, subject_id=subject_id, reason_code=reason_code, detail=detail)

    async def list_moderation_cases(self, *, status: ModerationCaseStatus | None = None, source: ModerationCaseSource | None = None, limit: int = 200) -> list[dict[str, Any]]:
        return await self.moderation_cases.list_cases(status=status, source=source, limit=limit)

    async def resolve_moderation_case(self, resolver_identity_id: str, case_id: str, *, status: ModerationCaseStatus, resolution_note: str, visibility_effect: ModerationVisibilityEffect | None) -> ModerationCase:
        return await self.moderation_cases.resolve_case(resolver_identity_id=resolver_identity_id, case_id=case_id, status=status, resolution_note=resolution_note, visibility_effect=visibility_effect)

    async def billing_summary(self, identity_id: str) -> Dict[str, Any]:
        return await self.billing.billing_summary(identity_id=identity_id)

    async def checkout(self, identity_id: str, kind: CheckoutKind) -> Dict[str, Any]:
        return await self.billing.checkout(identity_id=identity_id, kind=kind)

    async def health(self, detail: bool = False) -> Dict[str, Any]:
        return await self.health_service.health(detail)

    async def _provider_spend_guardrail_for_provider(self, *, provider_name: str | None, provider_billable: bool | None, projected_cost_usd: float = 0.0) -> ProviderSpendGuardrailStatus | None:
        return await self.billing._provider_spend_guardrail_for_provider(provider_name=provider_name, provider_billable=provider_billable, projected_cost_usd=projected_cost_usd)

    async def _evaluate_monthly_spend_guardrail(self, *, projected_cost_usd: float = 0.0):
        return await self.billing._evaluate_monthly_spend_guardrail(projected_cost_usd=projected_cost_usd)

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

    async def get_settings_payload(self, identity_id: str, *, current_session_id: str | None = None) -> Dict[str, Any]:
        return await self.shell.get_settings_payload(identity_id, current_session_id=current_session_id)

    async def record_access_session(self, *, identity_id: str, session_id: str | None, auth_provider: str | None, user_agent: str | None, client_ip: str | None, host_label: str | None, display_mode: str | None, token_issued_at: Any = None, token_expires_at: Any = None) -> None:
        await self.access_sessions.touch_session(identity_id=identity_id, session_id=session_id, auth_provider=auth_provider, user_agent=user_agent, client_ip=client_ip, host_label=host_label, display_mode=display_mode, token_issued_at=token_issued_at, token_expires_at=token_expires_at)

    async def get_access_sessions_payload(self, *, identity_id: str, current_session_id: str | None) -> Dict[str, Any]:
        return await self.access_sessions.build_payload(identity_id=identity_id, current_session_id=current_session_id)

    async def revoke_other_access_sessions(self, *, identity_id: str, current_session_id: str | None, reason: str = "signed_out_elsewhere") -> Dict[str, Any]:
        return await self.access_sessions.revoke_other_sessions(identity_id=identity_id, current_session_id=current_session_id, reason=reason)

    async def is_access_session_active(self, *, identity_id: str, session_id: str | None) -> bool:
        return await self.access_sessions.is_session_active(identity_id=identity_id, session_id=session_id)

    async def get_login_lockout_status(self, *, identifier: str | None, max_attempts: int, lockout_window: timedelta) -> Dict[str, Any] | None:
        return await self.access_sessions.get_login_lockout_status(identifier=identifier, max_attempts=max_attempts, lockout_window=lockout_window)

    async def record_login_result(self, *, identifier: str | None, success: bool, lockout_window: timedelta) -> None:
        await self.access_sessions.record_login_result(identifier=identifier, success=success, lockout_window=lockout_window)

    def get_access_session_context_from_token(self, access_token: str | None) -> Dict[str, Any]:
        return self.access_sessions.session_context_from_token(access_token)

    async def list_models_for_identity(self, identity: OmniaIdentity | None = None) -> List[ModelCatalogEntry]:
        return await self.shell.list_models_for_identity(identity)

    async def get_model(self, model_id: str) -> ModelCatalogEntry:
        return await self.shell.get_model(model_id)

    def _serialize_model_catalog_for_identity(self, *, identity: OmniaIdentity, model: ModelCatalogEntry, billing_state: BillingStateSnapshot | None = None) -> Dict[str, Any]:
        return self.shell.serialize_model_catalog_for_identity(identity=identity, model=model, billing_state=billing_state)

    def _validate_model_for_identity(self, identity: OmniaIdentity, model: ModelCatalogEntry, *, billing_state: BillingStateSnapshot | None = None) -> None:
        self.shell.validate_model_for_identity(identity, model, billing_state=billing_state)

    def _validate_dimensions_for_model(self, width: int, height: int, model: ModelCatalogEntry) -> None:
        self.shell.validate_dimensions_for_model(width, height, model)

    def _normalize_generation_aspect_ratio(self, aspect_ratio: str | None) -> str:
        return self.shell.normalize_generation_aspect_ratio(aspect_ratio)

    def _resolve_generation_dimensions_for_model(self, *, model: ModelCatalogEntry, aspect_ratio: str) -> tuple[int, int]:
        return self.shell.resolve_generation_dimensions_for_model(model=model, aspect_ratio=aspect_ratio)

    def _refresh_monthly_credits_locked(self, state: StudioState, identity: OmniaIdentity) -> None:
        return self.billing._refresh_monthly_credits_locked(state=state, identity=identity)

    async def improve_generation_prompt(self, prompt: str, *, identity_id: str | None = None) -> Dict[str, Any]:
        return await self.generation.improve_generation_prompt(prompt=prompt, identity_id=identity_id)

    def _fallback_enhanced_prompt(self, prompt: str) -> str:
        return self.generation._fallback_enhanced_prompt(prompt=prompt)

    def _sanitize_generation_text(self, value: str, *, field_name: str, max_length: int) -> str:
        return self.generation._sanitize_generation_text(value=value, field_name=field_name, max_length=max_length)

    async def require_owned_model(self, collection: str, model_id: str, model_type, identity_id: str):
        model = await self.store.get_model(collection, model_id, model_type)
        if model is None or model.identity_id != identity_id:
            raise KeyError(f"{model_type.__name__} not found")
        return model

    async def _process_generation(self, job_id: str) -> None:
        return await self.generation._process_generation(job_id=job_id)

    async def _update_job_status(self, job_id: str, status: JobStatus, provider: Optional[str] = None, provider_billable: Optional[bool] = None, error: Optional[str] = None, error_code: Optional[str] = None) -> Optional[GenerationJob]:
        return await self.generation._update_job_status(job_id=job_id, status=status, provider=provider, provider_billable=provider_billable, error=error, error_code=error_code)

    async def _get_generation_job_snapshot(self, job_id: str) -> Optional[GenerationJob]:
        return await self.generation._get_generation_job_snapshot(job_id=job_id)

    def _normalize_generation_error_message(self, exc: Exception) -> str:
        return self.generation._normalize_generation_error_message(exc=exc)

    def _classify_generation_error_code(self, exc: Exception) -> str:
        return self.generation._classify_generation_error_code(exc=exc)

    def _generation_retry_limit_for_job(self, job: GenerationJob, *, provider_billable: Optional[bool] = None) -> int:
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

    async def _ensure_generation_capacity(self, *, identity: OmniaIdentity, project_id: str, model_id: str, prompt_snapshot: PromptSnapshot, plan_config: PlanCatalogEntry) -> None:
        return await self.generation._ensure_generation_capacity(identity=identity, project_id=project_id, model_id=model_id, prompt_snapshot=prompt_snapshot, plan_config=plan_config)

    def _estimate_queue_wait_seconds(self, queued_jobs: int) -> int:
        return self.generation._estimate_queue_wait_seconds(queued_jobs=queued_jobs)

    async def _create_asset_from_result(self, job: GenerationJob, provider: str, image_bytes: bytes, mime_type: str, variation_index: int = 0, variation_count: int = 1, seed: Optional[int] = None) -> MediaAsset:
        return await self.generation._create_asset_from_result(job=job, provider=provider, image_bytes=image_bytes, mime_type=mime_type, variation_index=variation_index, variation_count=variation_count, seed=seed)

    async def _load_generation_reference_image(self, job: GenerationJob) -> Optional[ProviderReferenceImage]:
        return await self.generation._load_generation_reference_image(job=job)

    async def _read_asset_bytes(self, asset: MediaAsset, *, variant: str) -> tuple[bytes, str]:
        return await self.generation._read_asset_bytes(asset=asset, variant=variant)

    async def _store_asset_payload(self, *, asset: MediaAsset, image_bytes: bytes, mime_type: str, clean_image_bytes: Optional[bytes] = None, clean_mime_type: Optional[str] = None, storage_prefix: str) -> None:
        return await self.generation._store_asset_payload(asset=asset, image_bytes=image_bytes, mime_type=mime_type, clean_image_bytes=clean_image_bytes, clean_mime_type=clean_mime_type, storage_prefix=storage_prefix)

    def _extension_for_mime_type(self, mime_type: str) -> str:
        return self.generation._extension_for_mime_type(mime_type=mime_type)

    async def export_identity_data(self, identity_id: str) -> Dict[str, Any]:
        return await self.identity.export_identity_data(identity_id=identity_id)

    async def permanently_delete_identity(self, identity_id: str) -> bool:
        return await self.identity.permanently_delete_identity(identity_id=identity_id)

    async def process_paddle_webhook(self, payload: Dict[str, Any]) -> None:
        return await self.billing.process_paddle_webhook(payload=payload)

    async def process_lemonsqueezy_webhook(self, payload: Dict[str, Any]) -> None:
        raise RuntimeError("LemonSqueezy webhooks have been retired. Use Paddle webhook processing instead.")
