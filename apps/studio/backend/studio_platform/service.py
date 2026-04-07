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

from PIL import Image
import jwt

from config.env import get_settings

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
from .entitlement_ops import (
    ensure_chat_request_allowed,
    ensure_clean_export_allowed,
    resolve_entitlements,
    resolve_guest_entitlements,
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
    PublicPost,
    Project,
    ShareLink,
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
from .prompt_engineering import compile_generation_request, improve_prompt_candidate
from .providers import (
    GenerationRoutingDecision,
    ProviderReferenceImage,
    ProviderRegistry,
    ProviderTemporaryError,
)
from .repository import StudioPersistence, StudioRepository
from .share_ops import (
    build_public_share_payload,
    build_share_token_preview,
    create_share_record,
)
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
from .services.generation_dispatcher import GenerationDispatcher
from security.moderation import ModerationResult

logger = logging.getLogger(__name__)
_GENERATION_TEXT_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_FOUNDER_EMAILS = frozenset({"founder@omniacreata.com", "help@omniacreata.com"})
_MODERATION_RESET_WINDOW = timedelta(hours=24)
_TEMP_BLOCK_AFTER_THREE_STRIKES = timedelta(minutes=15)
_TEMP_BLOCK_AFTER_FIVE_STRIKES = timedelta(hours=24)


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
        self._generation_runtime_mode = settings.generation_runtime_mode
        minimum_claim_lease = max(30, settings.generation_maintenance_interval_seconds * 3)
        self._generation_claim_lease_seconds = min(
            settings.generation_stale_running_seconds,
            max(settings.generation_claim_lease_seconds, minimum_claim_lease),
        )
        self._worker_id = (
            f"{socket.gethostname()}:{os.getpid()}:{self._generation_runtime_mode}:{uuid4().hex[:8]}"
        )
        self._asset_token_secret = settings.jwt_secret or "dev-asset-secret"
        self._asset_token_ttl_seconds = 60 * 20
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

    def _can_process_generations(self) -> bool:
        return self._generation_runtime_mode in {"all", "worker"} or self._uses_local_generation_fallback()

    def _uses_shared_generation_broker(self) -> bool:
        return self.generation_broker is not None

    def _uses_local_generation_fallback(self) -> bool:
        return self._generation_runtime_mode == "web" and self.generation_broker is None

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
        if not self._can_process_generations():
            return
        if self._generation_maintenance_task is None or self._generation_maintenance_task.done():
            self._generation_maintenance_task = asyncio.create_task(
                self._generation_maintenance_loop()
            )

    def _ensure_orphan_cleanup_task(self) -> None:
        if not self._can_process_generations():
            return
        if self._orphan_cleanup_task is None or self._orphan_cleanup_task.done():
            self._orphan_cleanup_task = asyncio.create_task(
                self._orphan_cleanup_loop()
            )

    async def _generation_maintenance_loop(self) -> None:
        interval_seconds = max(1, self.settings.generation_maintenance_interval_seconds)
        while True:
            try:
                keep_running = await self._run_generation_maintenance_pass()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Generation maintenance pass failed")
                keep_running = True

            if not keep_running:
                break

            await asyncio.sleep(interval_seconds)

    async def _orphan_cleanup_loop(self) -> None:
        while True:
            try:
                await self._run_scheduled_orphan_cleanup_if_due()
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception("Scheduled orphan generation cleanup failed")

            await asyncio.sleep(60)

    async def _run_generation_maintenance_pass(self) -> bool:
        now = utc_now()
        retry_cutoff = now - timedelta(seconds=self.settings.generation_retry_delay_seconds)
        stale_cutoff = now - timedelta(seconds=self.settings.generation_stale_running_seconds)
        retry_limit = self.settings.generation_retry_attempt_limit
        claimed_jobs = 0
        broker_metrics = {"priority": 0, "standard": 0, "browse-only": 0}
        if self._can_process_generations() and self.generation_broker is not None:
            await self._reconcile_generation_broker_state()
            recovered_claims = await self.generation_broker.requeue_stale_claims(
                stale_after_seconds=self.settings.generation_stale_running_seconds,
            )
            claimed_jobs = await self._drain_generation_broker_into_dispatcher()
            broker_metrics = await self.generation_broker.metrics()
            if recovered_claims:
                claimed_jobs += len(recovered_claims)
        tracked_jobs = await self.store.list_generations_with_statuses(
            {JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.RETRYABLE_FAILED}
        )
        tracked_job_map = {job.id: job for job in tracked_jobs}
        metrics = self.generation_dispatcher.metrics()
        keep_running = (
            bool(tracked_jobs)
            or bool(metrics["queued"])
            or bool(metrics["running"])
            or bool(claimed_jobs)
            or any(count > 0 for count in broker_metrics.values())
        )

        heartbeat_job_ids: list[str] = []
        queue_entries: list[tuple[str, str]] = []
        retry_job_ids: list[str] = []
        failed_job_ids: list[str] = []
        timed_out_job_ids: list[str] = []

        for job in tracked_jobs:
            if job.status == JobStatus.QUEUED:
                if not self.generation_dispatcher.is_tracked(job.id):
                    queue_entries.append((job.id, job.queue_priority))
                continue

            if job.status == JobStatus.RUNNING:
                if self.generation_dispatcher.is_running(job.id):
                    heartbeat_job_ids.append(job.id)
                    continue

                if job.claim_token:
                    claim_still_fresh = (
                        job.claim_expires_at is not None and job.claim_expires_at > now
                    )
                    if claim_still_fresh:
                        keep_running = True
                        continue

                    claim_heartbeat_at = (
                        job.last_claim_heartbeat_at
                        or job.last_heartbeat_at
                        or job.updated_at
                        or job.started_at
                        or job.created_at
                    )
                    if job.claim_expires_at is None and claim_heartbeat_at > stale_cutoff:
                        keep_running = True
                        continue

                    if job.attempt_count < retry_limit:
                        retry_job_ids.append(job.id)
                    else:
                        timed_out_job_ids.append(job.id)
                    continue

                heartbeat_at = (
                    job.last_heartbeat_at
                    or job.updated_at
                    or job.started_at
                    or job.created_at
                )
                if heartbeat_at <= stale_cutoff:
                    if job.attempt_count < retry_limit:
                        retry_job_ids.append(job.id)
                    else:
                        timed_out_job_ids.append(job.id)
                continue

            if job.status == JobStatus.RETRYABLE_FAILED:
                if job.attempt_count >= retry_limit:
                    failed_job_ids.append(job.id)
                    continue
                if job.updated_at <= retry_cutoff and not self.generation_dispatcher.is_tracked(job.id):
                    retry_job_ids.append(job.id)

        if heartbeat_job_ids:
            def heartbeat_mutation(state: StudioState) -> None:
                for job_id in heartbeat_job_ids:
                    claim_token = self._active_generation_claims.get(job_id)
                    if claim_token:
                        refreshed = refresh_generation_claim_locked(
                            state=state,
                            job_id=job_id,
                            claim_token=claim_token,
                            lease_seconds=self._generation_claim_lease_seconds,
                            now=now,
                        )
                        if refreshed:
                            continue
                    apply_generation_status_update(
                        state=state,
                        job_id=job_id,
                        status=JobStatus.RUNNING,
                        now=now,
                    )

            await self.store.mutate(heartbeat_mutation)
            if self.generation_broker is not None:
                for job_id in heartbeat_job_ids:
                    await self.generation_broker.heartbeat_claim(job_id)

        if retry_job_ids:
            retry_job_id_set = set(retry_job_ids)

            def retry_mutation(state: StudioState) -> None:
                for job_id in retry_job_ids:
                    requeue_generation_job_locked(
                        state=state,
                        job_id=job_id,
                        now=now,
                    )

            await self.store.mutate(retry_mutation)
            for job in tracked_jobs:
                if job.id in retry_job_id_set:
                    queue_entries.append((job.id, job.queue_priority))

        if timed_out_job_ids:
            def timeout_mutation(state: StudioState) -> None:
                for job_id in timed_out_job_ids:
                    apply_generation_status_update(
                        state=state,
                        job_id=job_id,
                        status=JobStatus.TIMED_OUT,
                        now=now,
                        error="Generation timed out after losing its worker and exhausting retry budget.",
                        error_code="generation_timed_out",
                    )

            await self.store.mutate(timeout_mutation)
            for job_id in timed_out_job_ids:
                job = await self._get_generation_job_snapshot(job_id)
                if job is None:
                    job = tracked_job_map.get(job_id)
                if job is not None:
                    self._log_generation_event(
                        "generation_maintenance_timeout",
                        job=job,
                        status=JobStatus.TIMED_OUT,
                        provider=job.provider,
                        error="Generation timed out after losing its worker and exhausting retry budget.",
                        error_code="generation_timed_out",
                        started_at=job.started_at or job.created_at,
                        finished_at=now,
                        level=logging.WARNING,
                    )

        if failed_job_ids:
            def failed_mutation(state: StudioState) -> None:
                for job_id in failed_job_ids:
                    apply_generation_status_update(
                        state=state,
                        job_id=job_id,
                        status=JobStatus.FAILED,
                        now=now,
                        error="Generation retry budget exhausted after repeated temporary failures.",
                        error_code="retry_budget_exhausted",
                    )

            await self.store.mutate(failed_mutation)
            for job_id in failed_job_ids:
                job = await self._get_generation_job_snapshot(job_id)
                if job is None:
                    job = tracked_job_map.get(job_id)
                if job is not None:
                    self._log_generation_event(
                        "generation_retry_exhausted",
                        job=job,
                        status=JobStatus.FAILED,
                        provider=job.provider,
                        error="Generation retry budget exhausted after repeated temporary failures.",
                        error_code="retry_budget_exhausted",
                        started_at=job.started_at or job.created_at,
                        finished_at=now,
                        level=logging.ERROR,
                    )

        queued_once: set[str] = set()
        for job_id, queue_priority in queue_entries:
            if job_id in queued_once:
                continue
            queued_once.add(job_id)
            await self._enqueue_generation_job(job_id, priority=queue_priority)
            keep_running = True

        return keep_running

    async def _enqueue_generation_job(self, job_id: str, *, priority: str) -> bool:
        if self.generation_broker is not None:
            return await self.generation_broker.enqueue(job_id, priority=priority)
        return await self.generation_dispatcher.enqueue(job_id, priority=priority)

    async def _claim_generation_job(
        self,
        job_id: str,
        *,
        provider: str | None = None,
        claim_token: str | None = None,
    ) -> str | None:
        token = claim_token or uuid4().hex
        claimed_holder = {"claimed": False}
        now = utc_now()

        def mutation(state: StudioState) -> None:
            claimed_holder["claimed"] = claim_generation_job_locked(
                state=state,
                job_id=job_id,
                worker_id=self._worker_id,
                claim_token=token,
                lease_seconds=self._generation_claim_lease_seconds,
                now=now,
                provider=provider,
            )

        await self.store.mutate(mutation)
        if not claimed_holder["claimed"]:
            self._active_generation_claims.pop(job_id, None)
            return None
        self._active_generation_claims[job_id] = token
        return token

    async def _refresh_generation_claim(
        self,
        job_id: str,
        *,
        claim_token: str,
        provider: str | None = None,
    ) -> bool:
        refreshed_holder = {"refreshed": False}
        now = utc_now()

        def mutation(state: StudioState) -> None:
            refreshed_holder["refreshed"] = refresh_generation_claim_locked(
                state=state,
                job_id=job_id,
                claim_token=claim_token,
                lease_seconds=self._generation_claim_lease_seconds,
                now=now,
                provider=provider,
            )

        await self.store.mutate(mutation)
        if not refreshed_holder["refreshed"]:
            self._active_generation_claims.pop(job_id, None)
        return bool(refreshed_holder["refreshed"])

    async def _drain_generation_broker_into_dispatcher(self) -> int:
        if self.generation_broker is None:
            return 0

        claimed = 0
        while self.generation_dispatcher.available_capacity() > 0:
            job_id, queue_priority, next_streak = await self.generation_broker.dequeue_next(
                priority_streak=self._broker_priority_streak,
                priority_burst_limit=self.generation_dispatcher._PRIORITY_BURST_LIMIT,
                priority_order=self.generation_dispatcher._PRIORITY_ORDER,
            )
            self._broker_priority_streak = next_streak
            if job_id is None:
                break
            if self.generation_dispatcher.is_tracked(job_id):
                await self.generation_broker.complete(job_id)
                continue
            claim_token = await self._claim_generation_job(job_id)
            if claim_token is None:
                await self.generation_broker.complete(job_id)
                continue
            enqueued = await self.generation_dispatcher.enqueue(job_id, priority=queue_priority or "standard")
            if not enqueued:
                self._active_generation_claims.pop(job_id, None)

                def mutation(state: StudioState) -> None:
                    requeue_generation_job_locked(
                        state=state,
                        job_id=job_id,
                        now=utc_now(),
                    )

                await self.store.mutate(mutation)
                await self.generation_broker.complete(job_id)
                await self._enqueue_generation_job(job_id, priority=queue_priority or "standard")
                continue
            claimed += 1
        return claimed

    async def _reconcile_generation_broker_state(self) -> int:
        if self.generation_broker is None:
            return 0

        snapshot = await self.generation_broker.inspect()
        queued = snapshot.get("queued", {})
        claimed = snapshot.get("claimed", {})
        discarded = 0

        for priority, job_ids in dict(queued).items():
            for job_id in list(job_ids):
                job = await self.store.get_generation(str(job_id))
                if job is None:
                    await self.generation_broker.discard(str(job_id))
                    discarded += 1
                    continue
                if job.status in JobStatus.terminal_statuses() or job.status == JobStatus.RUNNING:
                    await self.generation_broker.discard(str(job_id))
                    discarded += 1
                    continue
                if job.status == JobStatus.RETRYABLE_FAILED:
                    await self.generation_broker.discard(str(job_id))
                    discarded += 1

        for job_id, priority in dict(claimed).items():
            job = await self.store.get_generation(str(job_id))
            if job is None or job.status in JobStatus.terminal_statuses():
                await self.generation_broker.discard(str(job_id))
                discarded += 1
                continue
            if job.status == JobStatus.QUEUED:
                await self.generation_broker.discard(str(job_id))
                discarded += 1
                await self._enqueue_generation_job(
                    str(job_id),
                    priority=job.queue_priority or str(priority) or "standard",
                )
                continue
            if job.status == JobStatus.RETRYABLE_FAILED:
                await self.generation_broker.discard(str(job_id))
                discarded += 1

        return discarded

    async def _run_scheduled_orphan_cleanup_if_due(self) -> None:
        now_local = datetime.now().astimezone()
        if now_local.hour < 3:
            return

        local_day = now_local.date().isoformat()
        if self._last_orphan_cleanup_local_day == local_day:
            return

        await self._run_orphan_cleanup_pass(now=utc_now())
        self._last_orphan_cleanup_local_day = local_day

    async def _run_orphan_cleanup_pass(self, *, now: datetime) -> int:
        orphanable_statuses = {JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.RETRYABLE_FAILED}
        cutoff = now - timedelta(hours=24)
        tracked_jobs = await self.store.list_generations_with_statuses(orphanable_statuses)
        orphaned_jobs = [job for job in tracked_jobs if job.created_at <= cutoff]
        if not orphaned_jobs:
            logger.info(
                "generation_orphan_cleanup %s",
                json.dumps(
                    {
                        "event": "generation_orphan_cleanup",
                        "orphaned_jobs": 0,
                        "cutoff": cutoff.isoformat(),
                    },
                    ensure_ascii=True,
                    sort_keys=True,
                ),
            )
            return 0

        orphaned_job_ids = [job.id for job in orphaned_jobs]

        def mutation(state: StudioState) -> None:
            for job_id in orphaned_job_ids:
                apply_generation_status_update(
                    state=state,
                    job_id=job_id,
                    status=JobStatus.TIMED_OUT,
                    now=now,
                    error="Generation timed out during nightly orphan cleanup after exceeding the 24 hour safety window.",
                    error_code="orphaned_job_timeout",
                )

        await self.store.mutate(mutation)
        for job in orphaned_jobs:
            updated_job = await self._get_generation_job_snapshot(job.id)
            self._log_generation_event(
                "generation_orphan_cleanup",
                job=updated_job or job,
                status=JobStatus.TIMED_OUT,
                provider=(updated_job or job).provider,
                error="Generation timed out during nightly orphan cleanup after exceeding the 24 hour safety window.",
                error_code="orphaned_job_timeout",
                started_at=(updated_job or job).started_at or (updated_job or job).created_at,
                finished_at=now,
                level=logging.WARNING,
            )

        logger.warning(
            "generation_orphan_cleanup %s",
            json.dumps(
                {
                    "event": "generation_orphan_cleanup_summary",
                    "orphaned_jobs": len(orphaned_jobs),
                    "cutoff": cutoff.isoformat(),
                },
                ensure_ascii=True,
                sort_keys=True,
            ),
        )
        return len(orphaned_jobs)

    async def get_public_identity(self, auth_user: Any | None) -> Dict[str, Any]:
        if auth_user is None:
            return {
                "guest": True,
                "identity": self._serialize_guest_identity_payload(),
                "credits": {"remaining": 0, "monthly_remaining": 0, "extra_credits": 0},
                "plan": PLAN_CATALOG[IdentityPlan.GUEST].model_dump(mode="json"),
                "entitlements": resolve_guest_entitlements(plan_catalog=PLAN_CATALOG),
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
        billing_state = await self._resolve_billing_state_for_identity(identity)
        return self.serialize_identity(identity, billing_state=billing_state)

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

            normalized_email = (email or "").strip().lower()
            privileged_flags = self._resolve_privileged_email_flags(normalized_email)
            if privileged_flags["is_owner"]:
                nonlocal desired_plan, owner_mode, root_admin, local_access
                desired_plan = IdentityPlan.PRO
                owner_mode = True
                local_access = True
                if privileged_flags["is_root_admin"]:
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
                if privileged_flags["is_owner"]:
                    self._apply_privileged_identity_overrides(identity)
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

                if privileged_flags["is_owner"]:
                    self._apply_privileged_identity_overrides(identity)

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

    def _resolve_privileged_email_flags(self, email: str) -> Dict[str, bool]:
        normalized_email = (email or "").strip().lower()
        owner_emails = set(self.settings.owner_emails_list) | _FOUNDER_EMAILS
        root_admin_emails = set(self.settings.root_admin_emails_list) | _FOUNDER_EMAILS
        is_root_admin = normalized_email in root_admin_emails or normalized_email in owner_emails
        is_owner = normalized_email in owner_emails or is_root_admin
        return {
            "is_owner": is_owner,
            "is_root_admin": is_root_admin,
        }

    def _apply_privileged_identity_overrides(self, identity: OmniaIdentity) -> None:
        identity.plan = IdentityPlan.PRO
        identity.owner_mode = True
        identity.root_admin = True
        identity.local_access = True
        identity.subscription_status = SubscriptionStatus.ACTIVE
        identity.monthly_credits_remaining = 999999999
        identity.monthly_credit_allowance = 999999999
        identity.extra_credits = 999999999

    def _has_unlimited_generation_access(self, identity: OmniaIdentity) -> bool:
        return identity.owner_mode or identity.root_admin or identity.local_access

    async def _resolve_billing_state_for_identity(self, identity: OmniaIdentity) -> BillingStateSnapshot:
        def query(state: StudioState) -> BillingStateSnapshot:
            return self._resolve_billing_state_locked(state, identity)

        return await self.store.read(query)

    def _resolve_billing_state_locked(self, state: StudioState, identity: OmniaIdentity) -> BillingStateSnapshot:
        jobs = [
            job
            for job in state.generations.values()
            if job.identity_id == identity.id
        ]
        return resolve_billing_state(
            identity=identity,
            generation_jobs=jobs,
            plan_catalog=PLAN_CATALOG,
        )

    def _serialize_credit_snapshot(self, billing_state: BillingStateSnapshot) -> Dict[str, Any]:
        return billing_state.credits_dict()

    def _serialize_identity_payload(self, identity: OmniaIdentity) -> Dict[str, Any]:
        payload = identity.model_dump(
            mode="json",
            exclude={"flag_count", "last_flagged_at", "last_flagged_reason"},
        )
        payload["manual_review_state"] = identity.manual_review_state.value
        return payload

    def _serialize_guest_identity_payload(self) -> Dict[str, Any]:
        return {
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
            "temp_block_until": None,
            "manual_review_state": ManualReviewState.NONE.value,
        }

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
        payload = {"event": event, **fields}
        logger.log(level, "security_event %s", json.dumps(payload, ensure_ascii=True, sort_keys=True))

    def _apply_identity_moderation_flag_locked(
        self,
        identity: OmniaIdentity,
        *,
        moderation_result: ModerationResult,
        reason_code: str,
    ) -> Dict[str, Any]:
        now = utc_now()
        strike_delta = 2 if moderation_result == ModerationResult.HARD_BLOCK else 1
        if identity.last_flagged_at is None or (now - identity.last_flagged_at) > _MODERATION_RESET_WINDOW:
            next_count = strike_delta
        else:
            next_count = max(identity.flag_count, 0) + strike_delta

        identity.flag_count = next_count
        identity.last_flagged_at = now
        identity.last_flagged_reason = reason_code

        temp_block_applied = False
        manual_review_applied = False
        block_until: datetime | None = None

        if next_count >= 5:
            block_until = now + _TEMP_BLOCK_AFTER_FIVE_STRIKES
            manual_review_applied = identity.manual_review_state != ManualReviewState.REQUIRED
            identity.manual_review_state = ManualReviewState.REQUIRED
        elif next_count >= 3:
            block_until = now + _TEMP_BLOCK_AFTER_THREE_STRIKES

        if block_until is not None and (
            identity.temp_block_until is None or identity.temp_block_until < block_until
        ):
            identity.temp_block_until = block_until
            temp_block_applied = True

        return {
            "strike_delta": strike_delta,
            "flag_count": next_count,
            "reason_code": reason_code,
            "temp_block_until": identity.temp_block_until,
            "temp_block_applied": temp_block_applied,
            "manual_review_applied": manual_review_applied,
            "manual_review_state": identity.manual_review_state.value,
        }

    async def record_generation_moderation_block(
        self,
        identity_id: str,
        moderation_result: ModerationResult,
        reason: str | None,
    ) -> None:
        reason_code = self._normalize_moderation_reason(reason, moderation_result)
        holder: Dict[str, Any] = {}

        def mutation(state: StudioState) -> None:
            identity = state.identities.get(identity_id)
            if identity is None:
                return
            result = self._apply_identity_moderation_flag_locked(
                identity,
                moderation_result=moderation_result,
                reason_code=reason_code,
            )
            state.identities[identity.id] = identity
            holder.update(result)

        await self.store.mutate(mutation)
        self._log_security_event(
            "generation_moderation_block",
            level=logging.WARNING,
            identity_id=identity_id,
            moderation_result=moderation_result.value,
            reason_code=reason_code,
            strike_delta=holder.get("strike_delta", 0),
            flag_count=holder.get("flag_count", 0),
        )
        if holder.get("temp_block_applied"):
            self._log_security_event(
                "identity_temp_blocked",
                level=logging.WARNING,
                identity_id=identity_id,
                reason_code=reason_code,
                temp_block_until=holder["temp_block_until"].isoformat() if holder.get("temp_block_until") else None,
            )
        if holder.get("manual_review_applied"):
            self._log_security_event(
                "identity_manual_review_required",
                level=logging.WARNING,
                identity_id=identity_id,
                reason_code=reason_code,
            )

    def _assert_identity_action_allowed(
        self,
        identity: OmniaIdentity,
        *,
        action_code: str,
        action_label: str,
    ) -> None:
        if identity.manual_review_state == ManualReviewState.REQUIRED:
            self._log_security_event(
                "identity_manual_review_required",
                level=logging.WARNING,
                identity_id=identity.id,
                action=action_code,
            )
            raise PermissionError(f"Account is pending manual review before {action_label}.")
        if identity.temp_block_until and identity.temp_block_until > utc_now():
            self._log_security_event(
                "identity_temp_blocked",
                level=logging.WARNING,
                identity_id=identity.id,
                action=action_code,
                temp_block_until=identity.temp_block_until.isoformat(),
            )
            raise PermissionError(f"Account is temporarily blocked from {action_label}.")

    def serialize_identity(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        resolved_billing_state = billing_state or resolve_billing_state(
            identity=identity,
            generation_jobs=(),
            plan_catalog=PLAN_CATALOG,
        )
        return {
            "guest": False,
            "identity": self._serialize_identity_payload(identity),
            "credits": self._serialize_credit_snapshot(resolved_billing_state),
            "plan": PLAN_CATALOG[resolved_billing_state.effective_plan].model_dump(mode="json"),
            "entitlements": self.serialize_entitlements(identity, billing_state=resolved_billing_state),
        }

    def serialize_entitlements(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        return resolve_entitlements(
            identity=identity,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        ).to_dict()

    def serialize_usage_summary(
        self,
        identity: OmniaIdentity,
        *,
        billing_state: BillingStateSnapshot | None = None,
    ) -> Dict[str, Any]:
        resolved_billing_state = billing_state or resolve_billing_state(
            identity=identity,
            generation_jobs=(),
            plan_catalog=PLAN_CATALOG,
        )
        allowance = max(resolved_billing_state.monthly_allowance, 1)
        remaining = resolved_billing_state.gross_remaining
        consumed = max(allowance - resolved_billing_state.monthly_remaining, 0)
        progress = max(0, min(100, round((consumed / allowance) * 100)))
        next_reset = (
            identity.last_credit_refresh_at.astimezone(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            + timedelta(days=32)
        ).replace(day=1)
        return {
            "plan_label": PLAN_CATALOG[resolved_billing_state.effective_plan].label,
            "credits_remaining": remaining,
            "allowance": allowance,
            "reset_at": next_reset.isoformat(),
            "progress_percent": progress,
            "gross_remaining": resolved_billing_state.gross_remaining,
            "reserved_total": resolved_billing_state.reserved_total,
            "available_to_spend": resolved_billing_state.available_to_spend,
            "monthly_remaining": resolved_billing_state.monthly_remaining,
            "extra_credits": resolved_billing_state.extra_credits,
            "spend_order": resolved_billing_state.spend_order,
            "unlimited": resolved_billing_state.unlimited,
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
        share_id: Optional[str] = None,
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
            if key not in {
                "storage_backend",
                "storage_key",
                "thumbnail_storage_key",
                "thumbnail_path",
                "clean_storage_key",
                "clean_path",
                "clean_mime_type",
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
        return payload

    def serialize_assets(
        self,
        assets: List[MediaAsset],
        *,
        identity_id: Optional[str] = None,
        share_id: Optional[str] = None,
        share_token: Optional[str] = None,
        public_preview: bool = False,
    ) -> List[Dict[str, Any]]:
        return [
            self.serialize_asset(
                asset,
                identity_id=identity_id,
                share_id=share_id,
                share_token=share_token,
                public_preview=public_preview,
            )
            for asset in assets
        ]

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
            "prompt_snapshot": job.prompt_snapshot.model_dump(mode="json"),
            "estimated_cost": job.estimated_cost,
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

        return await self._resolve_asset_variant_delivery(asset, "clean")

    async def _resolve_asset_variant_delivery(self, asset: MediaAsset, variant: str) -> ResolvedAssetDelivery:
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
        return asset.metadata.get("thumbnail_storage_key")

    def _resolve_asset_variant_mime_type(self, asset: MediaAsset, variant: str, name: str) -> str:
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

    async def list_projects(self, identity_id: str, surface: Optional[Literal["compose", "chat"]] = None) -> List[Project]:
        return await self.store.list_projects_for_identity(identity_id, surface=surface)

    async def create_project(
        self,
        identity_id: str,
        title: str,
        description: str = "",
        surface: str = "compose",
    ) -> Project:
        identity = await self.get_identity(identity_id)
        project = create_project_record(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title,
            description=description,
            surface=surface,
        )
        await self.store.save_model("projects", project)
        return project

    async def get_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        generations = await self.list_generations(identity_id, project_id=project_id)
        assets = await self.list_assets(identity_id, project_id=project_id)
        return build_project_detail_payload(
            project=project,
            generations=generations,
            assets=assets,
            identity_id=identity_id,
            serialize_generation=self.serialize_generation_for_identity,
            serialize_assets=self.serialize_assets,
        )

    async def list_conversations(self, identity_id: str) -> List[ChatConversation]:
        return await self.store.list_conversations_for_identity(identity_id)

    async def create_conversation(self, identity_id: str, title: str = "", model: str = "studio-assist") -> ChatConversation:
        identity = await self.get_identity(identity_id)
        conversation = create_conversation_record(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title,
            model=model,
        )
        await self.store.save_model("conversations", conversation)
        return conversation

    async def get_conversation(self, identity_id: str, conversation_id: str) -> Dict[str, Any]:
        conversation = await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.list_conversation_messages(identity_id, conversation_id)
        return build_conversation_detail_payload(conversation=conversation, messages=messages)

    async def list_conversation_messages(self, identity_id: str, conversation_id: str) -> List[ChatMessage]:
        await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        return await self.store.list_chat_messages_for_conversation(
            identity_id=identity_id,
            conversation_id=conversation_id,
        )

    async def delete_conversation(self, identity_id: str, conversation_id: str) -> None:
        conversation = await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)

        def mutation(state: StudioState) -> None:
            remove_conversation_from_state(state=state, conversation_id=conversation.id)

        await self.store.mutate(mutation)

    async def set_chat_message_feedback(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
        feedback: ChatFeedback | None,
    ) -> ChatMessage:
        await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        message = await self.require_owned_model("chat_messages", message_id, ChatMessage, identity_id)
        if message.conversation_id != conversation_id:
            raise KeyError("Message not found")
        if message.role != ChatRole.ASSISTANT:
            raise ValueError("Feedback can only be applied to assistant messages")

        def mutation(state: StudioState) -> None:
            apply_message_feedback_to_state(
                state=state,
                message_id=message.id,
                feedback=feedback,
            )

        await self.store.mutate(mutation)
        updated = await self.store.get_model("chat_messages", message.id, ChatMessage)
        if updated is None:
            raise KeyError("Message not found")
        return updated

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
        conversation, messages, user_message, assistant_message = await self._resolve_latest_editable_turn(
            identity_id=identity_id,
            conversation_id=conversation_id,
            user_message_id=message_id,
        )
        identity = await self.get_identity(identity_id)
        attachment_models = [ChatAttachment.model_validate(item) for item in (attachments or [])]
        resolved_mode = resolve_chat_mode(model or conversation.model)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        entitlements = ensure_chat_request_allowed(
            identity=identity,
            mode=resolved_mode,
            attachments=attachment_models,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        )
        sanitized_content = content.strip()
        if not sanitized_content and not attachment_models:
            raise ValueError("Message content or an attachment is required")

        history = self._messages_before_turn(messages, user_message.id)
        rebuilt_assistant = await self._build_assistant_message(
            identity=identity,
            conversation=conversation,
            history=history,
            content=sanitized_content,
            attachments=attachment_models,
            requested_model=model,
            parent_message_id=user_message.id,
            premium_chat=entitlements.premium_chat,
        )

        def mutation(state: StudioState) -> None:
            now = utc_now()
            current_user = state.chat_messages[user_message.id]
            current_assistant = state.chat_messages[assistant_message.id]
            push_message_revision(message=current_user, now=now)
            push_message_revision(message=current_assistant, now=now)
            current_user.content = sanitized_content
            current_user.attachments = attachment_models
            current_assistant.content = rebuilt_assistant.content
            current_assistant.attachments = rebuilt_assistant.attachments
            current_assistant.suggested_actions = rebuilt_assistant.suggested_actions
            current_assistant.metadata = {
                **rebuilt_assistant.metadata,
                "revision_history": current_assistant.metadata.get("revision_history", []),
            }
            current_assistant.parent_message_id = user_message.id
            apply_message_pair_edit_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=current_user,
                assistant_message=current_assistant,
                now=now,
                model=model,
            )

        await self.store.mutate(mutation)
        updated_conversation = await self.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        updated_user = await self.require_owned_model("chat_messages", user_message.id, ChatMessage, identity_id)
        updated_assistant = await self.require_owned_model("chat_messages", assistant_message.id, ChatMessage, identity_id)
        return build_message_action_payload(
            conversation=updated_conversation,
            user_message=updated_user,
            assistant_message=updated_assistant,
        )

    async def regenerate_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        conversation, messages, user_message, assistant_message = await self._resolve_latest_editable_turn(
            identity_id=identity_id,
            conversation_id=conversation_id,
            assistant_message_id=message_id,
        )
        identity = await self.get_identity(identity_id)
        resolved_mode = resolve_chat_mode(conversation.model)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        entitlements = ensure_chat_request_allowed(
            identity=identity,
            mode=resolved_mode,
            attachments=user_message.attachments,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        )
        history = self._messages_before_turn(messages, user_message.id)
        rebuilt_assistant = await self._build_assistant_message(
            identity=identity,
            conversation=conversation,
            history=history,
            content=user_message.content,
            attachments=user_message.attachments,
            requested_model=conversation.model,
            parent_message_id=user_message.id,
            premium_chat=entitlements.premium_chat,
        )

        def mutation(state: StudioState) -> None:
            now = utc_now()
            current_user = state.chat_messages[user_message.id]
            current_assistant = state.chat_messages[assistant_message.id]
            push_message_revision(message=current_assistant, now=now)
            current_assistant.content = rebuilt_assistant.content
            current_assistant.attachments = rebuilt_assistant.attachments
            current_assistant.suggested_actions = rebuilt_assistant.suggested_actions
            current_assistant.metadata = {
                **rebuilt_assistant.metadata,
                "revision_history": current_assistant.metadata.get("revision_history", []),
            }
            current_assistant.parent_message_id = user_message.id
            apply_message_pair_edit_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=current_user,
                assistant_message=current_assistant,
                now=now,
            )

        await self.store.mutate(mutation)
        updated_conversation = await self.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        updated_user = await self.require_owned_model("chat_messages", user_message.id, ChatMessage, identity_id)
        updated_assistant = await self.require_owned_model("chat_messages", assistant_message.id, ChatMessage, identity_id)
        return build_message_action_payload(
            conversation=updated_conversation,
            user_message=updated_user,
            assistant_message=updated_assistant,
        )

    async def revert_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        conversation, _, user_message, assistant_message = await self._resolve_latest_editable_turn(
            identity_id=identity_id,
            conversation_id=conversation_id,
            user_message_id=message_id,
        )

        def mutation(state: StudioState) -> None:
            now = utc_now()
            current_user = state.chat_messages[user_message.id]
            current_assistant = state.chat_messages[assistant_message.id]
            user_revision = pop_message_revision(message=current_user)
            if user_revision is None:
                raise ValueError("No previous revision is available for this turn")
            assistant_revision = pop_message_revision(message=current_assistant)
            if assistant_revision is None:
                raise ValueError("No previous revision is available for this turn")
            target_history_depth = len(current_user.metadata.get("revision_history", []))
            while len(current_assistant.metadata.get("revision_history", [])) > target_history_depth:
                if pop_message_revision(message=current_assistant) is None:
                    break
            apply_message_pair_edit_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=current_user,
                assistant_message=current_assistant,
                now=now,
            )

        await self.store.mutate(mutation)
        updated_conversation = await self.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        updated_user = await self.require_owned_model("chat_messages", user_message.id, ChatMessage, identity_id)
        updated_assistant = await self.require_owned_model("chat_messages", assistant_message.id, ChatMessage, identity_id)
        return build_message_action_payload(
            conversation=updated_conversation,
            user_message=updated_user,
            assistant_message=updated_assistant,
        )

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
        attachment_models = [ChatAttachment.model_validate(item) for item in (attachments or [])]
        resolved_mode = resolve_chat_mode(model or conversation.model)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        entitlements = ensure_chat_request_allowed(
            identity=identity,
            mode=resolved_mode,
            attachments=attachment_models,
            plan_catalog=PLAN_CATALOG,
            billing_state=billing_state,
        )
        user_turn_count = count_user_turns(messages)
        message_limit = entitlements.chat_message_limit
        if message_limit and user_turn_count >= message_limit:
            raise PermissionError(f"{PLAN_CATALOG[identity.plan].label} plan chat limit reached")
        sanitized_content = content.strip()
        if not sanitized_content and not attachment_models:
            raise ValueError("Message content or an attachment is required")

        user_message = ChatMessage(
            conversation_id=conversation.id,
            identity_id=identity.id,
            role=ChatRole.USER,
            content=sanitized_content,
            attachments=attachment_models,
        )
        assistant_message = await self._build_assistant_message(
            identity=identity,
            conversation=conversation,
            history=messages,
            content=sanitized_content,
            attachments=attachment_models,
            requested_model=model,
            parent_message_id=user_message.id,
            premium_chat=entitlements.premium_chat,
        )

        def mutation(state: StudioState) -> None:
            title = title_from_message(sanitized_content or conversation_seed_from_attachments(attachment_models))
            apply_chat_exchange_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=user_message,
                assistant_message=assistant_message,
                now=utc_now(),
                title=title,
                model=model,
            )

        await self.store.mutate(mutation)

        updated_conversation = await self.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        return build_chat_exchange_payload(
            conversation=updated_conversation,
            user_message=user_message,
            assistant_message=assistant_message,
        )

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
        resolved_mode = resolve_chat_mode(requested_model or conversation.model)
        llm_input_content = content.strip() or build_attachment_only_request(attachments, mode=resolved_mode)
        context = build_chat_context(
            history=history,
            content=llm_input_content,
            attachments=attachments,
        )
        intent = detect_chat_intent(
            content=llm_input_content,
            attachments=attachments,
            mode=resolved_mode,
            context=context,
        )
        generation_bridge = build_chat_generation_bridge(
            intent=intent,
            content=llm_input_content,
            attachments=attachments,
            premium_chat=premium_chat,
            context=context,
        )
        continuity_summary = build_chat_continuity_summary(
            intent=intent,
            context=context,
            generation_bridge=generation_bridge,
        )
        llm_reply = await self.llm_gateway.generate_chat_reply(
            requested_model=requested_model or conversation.model,
            mode=resolved_mode,
            history=history,
            content=llm_input_content,
            attachments=attachments,
            premium_chat=premium_chat,
            intent_kind=intent.kind,
            prompt_profile=intent.prompt_profile,
            detail_score=intent.detail_score,
            premium_intent=intent.premium_intent,
            recommended_workflow=intent.recommended_workflow,
            continuity_summary=continuity_summary,
        )
        if llm_reply:
            response_body = llm_reply.text
            suggested_actions = build_chat_suggested_actions(
                content=llm_input_content,
                attachments=attachments,
                mode=resolved_mode,
                premium_chat=premium_chat,
                context=context,
            )
            metadata = {
                "provider": llm_reply.provider,
                "model": llm_reply.model,
                "mode": resolved_mode,
                "prompt_tokens": llm_reply.prompt_tokens,
                "completion_tokens": llm_reply.completion_tokens,
                "estimated_cost_usd": llm_reply.estimated_cost_usd,
                "used_fallback": llm_reply.used_fallback,
                "premium_chat": premium_chat,
                "requested_quality_tier": llm_reply.requested_quality_tier,
                "selected_quality_tier": llm_reply.selected_quality_tier,
                "degraded": llm_reply.degraded,
                "routing_strategy": llm_reply.routing_strategy,
                "routing_reason": llm_reply.routing_reason,
                "generation_bridge": generation_bridge,
                **build_chat_metadata(intent, context=context),
            }
        else:
            response_body, suggested_actions = build_chat_reply(
                intent=intent,
                content=llm_input_content,
                attachments=attachments,
                provider_unavailable=True,
                premium_chat=premium_chat,
                context=context,
            )
            suggested_actions = build_chat_suggested_actions(
                content=llm_input_content,
                attachments=attachments,
                mode=resolved_mode,
                premium_chat=premium_chat,
                context=context,
            )
            logger.warning(
                "chat_heuristic_fallback %s",
                {
                    "event": "chat_heuristic_fallback",
                    "conversation_id": conversation.id,
                    "identity_id": identity.id,
                    "mode": resolved_mode,
                    "intent_kind": intent.kind,
                    "prompt_profile": intent.prompt_profile,
                    "premium_chat": premium_chat,
                    "routing_reason": "provider_unavailable_or_empty",
                },
            )
            metadata = {
                "provider": "heuristic",
                "model": "studio-assist",
                "mode": resolved_mode,
                "estimated_cost_usd": 0.0,
                "used_fallback": True,
                "premium_chat": premium_chat,
                "requested_quality_tier": "premium" if premium_chat else "standard",
                "selected_quality_tier": "degraded",
                "degraded": True,
                "routing_strategy": "heuristic-fallback",
                "routing_reason": "provider_unavailable_or_empty",
                "provider_status": "degraded",
                "fallback_reason": "all_provider_candidates_failed",
                "generation_bridge": generation_bridge,
                **build_chat_metadata(intent, context=context),
            }
        return ChatMessage(
            conversation_id=conversation.id,
            identity_id=identity.id,
            role=ChatRole.ASSISTANT,
            content=response_body,
            parent_message_id=parent_message_id,
            suggested_actions=suggested_actions,
            metadata=metadata,
        )

    def _messages_before_turn(self, messages: List[ChatMessage], user_message_id: str) -> List[ChatMessage]:
        ordered = sorted(messages, key=lambda item: item.created_at)
        for index, message in enumerate(ordered):
            if message.id == user_message_id:
                return ordered[:index]
        raise KeyError("Message not found")

    def _find_assistant_reply_for_user(self, messages: List[ChatMessage], user_message_id: str) -> ChatMessage | None:
        ordered = sorted(messages, key=lambda item: item.created_at)
        for message in ordered:
            if message.role == ChatRole.ASSISTANT and message.parent_message_id == user_message_id:
                return message
        for index, message in enumerate(ordered):
            if message.id != user_message_id:
                continue
            for candidate in ordered[index + 1:]:
                if candidate.role == ChatRole.ASSISTANT:
                    return candidate
            return None
        return None

    async def _resolve_latest_editable_turn(
        self,
        *,
        identity_id: str,
        conversation_id: str,
        user_message_id: str | None = None,
        assistant_message_id: str | None = None,
    ) -> tuple[ChatConversation, List[ChatMessage], ChatMessage, ChatMessage]:
        conversation = await self.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.list_conversation_messages(identity_id, conversation_id)
        latest_user = next((message for message in reversed(messages) if message.role == ChatRole.USER), None)
        if latest_user is None:
            raise KeyError("Conversation has no user turns")

        if user_message_id is not None:
            user_message = next((message for message in messages if message.id == user_message_id), None)
            if user_message is None or user_message.role != ChatRole.USER:
                raise KeyError("Message not found")
            if user_message.id != latest_user.id:
                raise ValueError("Only the latest user message can be edited or reverted right now")
            assistant_message = self._find_assistant_reply_for_user(messages, user_message.id)
            if assistant_message is None:
                raise KeyError("Assistant reply not found")
            return conversation, messages, user_message, assistant_message

        assistant_message = next((message for message in messages if message.id == assistant_message_id), None)
        if assistant_message is None or assistant_message.role != ChatRole.ASSISTANT:
            raise KeyError("Message not found")
        paired_assistant = self._find_assistant_reply_for_user(messages, latest_user.id)
        if paired_assistant is None or paired_assistant.id != assistant_message.id:
            raise ValueError("Only the latest assistant reply can be regenerated right now")
        return conversation, messages, latest_user, assistant_message

    async def list_generations(self, identity_id: str, project_id: Optional[str] = None) -> List[GenerationJob]:
        return await self.store.list_generations_for_identity(identity_id, project_id=project_id)

    async def get_generation(self, identity_id: str, generation_id: str) -> GenerationJob:
        return await self.require_owned_model("generations", generation_id, GenerationJob, identity_id)

    async def list_assets(self, identity_id: str, project_id: Optional[str] = None, include_deleted: bool = False) -> List[MediaAsset]:
        assets = await self.store.list_assets()
        filtered = [
            asset
            for asset in assets
            if asset.identity_id == identity_id and (include_deleted or asset.deleted_at is None)
        ]
        if project_id:
            filtered = [asset for asset in filtered if asset.project_id == project_id]
        return sorted(filtered, key=lambda item: item.created_at, reverse=True)

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

        posts = await self.store.list_posts()
        assets = await self.store.list_assets()
        generations = await self.store.list_generations()
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

        billing_state = await self._resolve_billing_state_for_identity(identity) if own_profile else None

        return {
            "profile": {
                "display_name": identity.display_name,
                "username": identity.username or identity.email.split("@")[0],
                "avatar_url": identity.avatar_url,
                "bio": identity.bio,
                "plan": identity.plan.value,
                "default_visibility": identity.default_visibility.value,
                "usage_summary": self.serialize_usage_summary(identity, billing_state=billing_state) if own_profile else None,
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
        identities = await self.store.list_identities()
        for identity in identities:
            if (identity.username or "").strip().lower() == normalized:
                return identity
        posts = await self.store.list_posts()
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
        identity = await self.get_identity(identity_id)
        self._assert_identity_action_allowed(
            identity,
            action_code="generation",
            action_label="creating generations",
        )
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        reference_asset = None
        if reference_asset_id:
            reference_asset = await self.require_owned_model("assets", reference_asset_id, MediaAsset, identity_id)
        model = await self.get_model(model_id)
        plan_config = PLAN_CATALOG[identity.plan]
        if not plan_config.can_generate:
            raise PermissionError("Guests cannot generate images")

        self._validate_model_for_identity(identity, model)
        self._validate_dimensions_for_model(width, height, model)

        total_credit_cost = model.credit_cost * output_count

        cleaned_prompt = self._sanitize_generation_text(
            prompt,
            field_name="prompt",
            max_length=2000,
        )
        if not cleaned_prompt:
            raise ValueError("Prompt cannot be empty")
        cleaned_negative_prompt = self._sanitize_generation_text(
            negative_prompt,
            field_name="negative_prompt",
            max_length=500,
        )
        admission_prompt_snapshot = build_prompt_snapshot(
            prompt=cleaned_prompt,
            negative_prompt=cleaned_negative_prompt,
            source_prompt=cleaned_prompt,
            source_negative_prompt=cleaned_negative_prompt,
            model_id=model.id,
            reference_asset_id=reference_asset.id if reference_asset else None,
            width=width,
            height=height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            aspect_ratio=aspect_ratio,
        )
        routing_decision = self.providers.plan_generation_route(
            plan=identity.plan,
            prompt=cleaned_prompt,
            model_id=model.id,
            workflow=admission_prompt_snapshot.workflow,
            has_reference_image=reference_asset is not None,
        )
        compiled_request = compile_generation_request(
            prompt=cleaned_prompt,
            negative_prompt=cleaned_negative_prompt,
            provider_name=routing_decision.selected_provider or "cloud",
            model_id=model.id,
            workflow=admission_prompt_snapshot.workflow,
            prompt_profile=routing_decision.prompt_profile,
        )
        prompt_snapshot = build_prompt_snapshot(
            prompt=compiled_request.prompt,
            negative_prompt=compiled_request.negative_prompt,
            source_prompt=cleaned_prompt,
            source_negative_prompt=cleaned_negative_prompt,
            model_id=model.id,
            reference_asset_id=reference_asset.id if reference_asset else None,
            width=width,
            height=height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            aspect_ratio=aspect_ratio,
        )
        if not routing_decision.provider_candidates:
            raise ValueError(
                "No real image provider is available for this workflow right now. "
                "Studio will not replace it with a fake demo render."
            )
        reserved_credit_cost = (
            0
            if self._has_unlimited_generation_access(identity)
            else self._estimate_generation_reservation_cost(
                base_credit_cost=total_credit_cost,
                provider_candidates=list(routing_decision.provider_candidates),
            )
        )
        job = create_generation_job_record(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title=build_generation_title(cleaned_prompt),
            model_id=model.id,
            prompt_snapshot=prompt_snapshot,
            estimated_cost=model.estimated_cost * output_count,
            credit_cost=total_credit_cost,
            output_count=output_count,
            queue_priority=plan_config.queue_priority,
            provider=routing_decision.selected_provider or "pending",
            provider_rollout_tier=self.providers.provider_rollout_tier(routing_decision.selected_provider),
            provider_billable=self.providers.provider_billable(routing_decision.selected_provider),
            requested_quality_tier=routing_decision.requested_quality_tier,
            selected_quality_tier=routing_decision.selected_quality_tier,
            degraded=routing_decision.degraded,
            routing_strategy=routing_decision.routing_strategy,
            routing_reason=routing_decision.routing_reason,
            prompt_profile=routing_decision.prompt_profile,
            provider_candidates=list(routing_decision.provider_candidates),
            reserved_credit_cost=reserved_credit_cost,
            credit_status="reserved" if reserved_credit_cost > 0 else "none",
        )
        job = await self._persist_generation_job_with_reservation(
            identity=identity,
            job=job,
            project_id=project.id,
            model_id=model.id,
            prompt_snapshot=admission_prompt_snapshot,
            plan_config=plan_config,
        )
        if self._can_process_generations() or self._uses_shared_generation_broker():
            await self._enqueue_generation_job(job.id, priority=job.queue_priority)
        if self._can_process_generations():
            self._ensure_generation_maintenance_task()
        return job

    def _estimate_generation_reservation_cost(
        self,
        *,
        base_credit_cost: int,
        provider_candidates: List[str],
    ) -> int:
        normalized_cost = max(int(base_credit_cost or 0), 0)
        if normalized_cost <= 0:
            return 0
        has_managed_candidate = any(
            bool(self.providers.provider_billable(provider_name))
            for provider_name in provider_candidates
        )
        if has_managed_candidate:
            return normalized_cost
        has_standard_candidate = any(
            self.providers.provider_quality_tier(provider_name) == "standard"
            for provider_name in provider_candidates
        )
        if has_standard_candidate:
            return max(1, int(math.ceil(normalized_cost * 0.5)))
        return 0

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
        holder: Dict[str, GenerationJob] = {}

        def mutation(state: StudioState) -> None:
            current_identity = state.identities.get(identity.id)
            if current_identity is None:
                raise KeyError("Identity not found")

            self._refresh_monthly_credits_locked(state, current_identity)
            unlimited_access = self._has_unlimited_generation_access(current_identity)
            if unlimited_access:
                self._apply_privileged_identity_overrides(current_identity)

            if not unlimited_access:
                queued_jobs = sum(1 for current_job in state.generations.values() if current_job.status == JobStatus.QUEUED)
                queue_limit = min(self.settings.max_queue_size, 50)
                if queued_jobs >= queue_limit:
                    raise GenerationCapacityError(
                        "Generation queue is currently full. Please try again shortly.",
                        queue_full=True,
                        estimated_wait_seconds=self._estimate_queue_wait_seconds(queued_jobs),
                    )

                incomplete_jobs = count_incomplete_generations(state)
                if incomplete_jobs >= self.settings.max_queue_size:
                    raise GenerationCapacityError(
                        "Generation queue is currently full. Please try again shortly.",
                        queue_full=True,
                        estimated_wait_seconds=self._estimate_queue_wait_seconds(incomplete_jobs),
                    )

                if (
                    plan_config.max_incomplete_generations > 0
                    and count_incomplete_generations_for_identity(state, identity.id) >= plan_config.max_incomplete_generations
                ):
                    raise ValueError(
                        f"{plan_config.label} plan has reached its active generation limit. Please wait for current jobs to finish."
                    )

                if plan_config.generation_submit_limit > 0:
                    window_start = utc_now() - timedelta(seconds=plan_config.generation_submit_window_seconds)
                    recent_requests = count_recent_generation_requests_for_identity(
                        state=state,
                        identity_id=identity.id,
                        since=window_start,
                    )
                    if recent_requests >= plan_config.generation_submit_limit:
                        raise ValueError(
                            f"{plan_config.label} plan has reached its recent generation burst limit. Please wait a moment and try again."
                        )

                if has_duplicate_incomplete_generation(
                    state=state,
                    identity_id=identity.id,
                    project_id=project_id,
                    model_id=model_id,
                    prompt_snapshot=prompt_snapshot,
                ):
                    raise ValueError("An identical generation is already queued or running for this project.")

                billing_state = self._resolve_billing_state_locked(state, current_identity)
                if billing_state.available_to_spend < job.reserved_credit_cost:
                    raise ValueError("Not enough credits to run this generation")

            state.identities[current_identity.id] = current_identity
            state.generations[job.id] = job
            holder["job"] = job.model_copy(deep=True)

        await self.store.mutate(mutation)
        return holder["job"]

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
            return build_public_share_payload(share=share, project=project, assets=assets)
        elif share.asset_id:
            asset = await self.store.get_asset(share.asset_id)
            return build_public_share_payload(share=share, asset=asset)
        return build_public_share_payload(share=share)

    async def billing_summary(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        ledger = await self.store.list_credit_entries_for_identity(identity_id)
        return build_billing_summary(
            identity=identity,
            identity_id=identity_id,
            billing_state=billing_state,
            ledger_entries=ledger,
            plan_catalog=PLAN_CATALOG,
            checkout_catalog=CHECKOUT_CATALOG,
            entitlements=self.serialize_entitlements(identity, billing_state=billing_state),
        )

    async def checkout(self, identity_id: str, kind: CheckoutKind) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        config = CHECKOUT_CATALOG[kind]
        settings = get_settings()

        if settings.lemonsqueezy_store_id:
            return {
                "status": "redirect",
                "provider": "lemonsqueezy",
                "kind": kind.value,
                "checkout_url": build_lemonsqueezy_checkout_url(
                    store_id=settings.lemonsqueezy_store_id,
                    identity_id=identity_id,
                    email=identity.email,
                    kind=kind,
                ),
            }

        # Fallback to demo local mutation if no Lemonsqueezy configured
        updated_holder: Dict[str, OmniaIdentity] = {}

        def mutation(state: StudioState) -> None:
            now = utc_now()
            updated_holder["identity"] = apply_demo_checkout(
                state=state,
                identity_id=identity.id,
                kind=kind,
                config=config,
                plan_catalog=PLAN_CATALOG,
                now=now,
            )

        await self.store.mutate(mutation)
        updated = updated_holder["identity"]
        billing_state = await self._resolve_billing_state_for_identity(updated)
        return {
            "status": "demo_activated",
            "provider": "demo",
            "kind": kind.value,
            "identity": self.serialize_identity(updated, billing_state=billing_state),
        }

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
        if launch_readiness is not None:
            payload["launch_readiness"] = launch_readiness
        return payload

    async def get_settings_payload(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        billing_state = await self._resolve_billing_state_for_identity(identity)
        return {
            "identity": self.serialize_identity(identity, billing_state=billing_state),
            "entitlements": self.serialize_entitlements(identity, billing_state=billing_state),
            "plans": [plan.model_dump(mode="json") for plan in PLAN_CATALOG.values()],
            "models": [
                model.model_dump(mode="json")
                for model in await self.list_models_for_identity(identity)
            ],
            "presets": PRESET_CATALOG,
        }

    async def list_models_for_identity(
        self,
        identity: OmniaIdentity | None = None,
    ) -> List[ModelCatalogEntry]:
        return [model.model_copy(deep=True) for model in MODEL_CATALOG.values()]

    async def get_model(self, model_id: str) -> ModelCatalogEntry:
        if model_id in MODEL_CATALOG:
            return MODEL_CATALOG[model_id]
        raise KeyError("Model not found")

    def _validate_model_for_identity(self, identity: OmniaIdentity, model: ModelCatalogEntry) -> None:
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

    async def improve_generation_prompt(self, prompt: str) -> Dict[str, Any]:
        cleaned = " ".join(prompt.strip().split())
        if not cleaned:
            raise ValueError("Prompt cannot be empty")

        llm_result = await self.llm_gateway.improve_prompt(cleaned)
        if llm_result:
            return {
                "prompt": improve_prompt_candidate(llm_result.text),
                "provider": llm_result.provider,
                "used_llm": True,
            }

        return {
            "prompt": self._fallback_enhanced_prompt(cleaned),
            "provider": "heuristic",
            "used_llm": False,
        }

    def _fallback_enhanced_prompt(self, prompt: str) -> str:
        return improve_prompt_candidate(prompt.strip().strip(",."))

    def _sanitize_generation_text(
        self,
        value: str,
        *,
        field_name: str,
        max_length: int,
    ) -> str:
        sanitized = _GENERATION_TEXT_CONTROL_RE.sub(" ", value or "")
        sanitized = re.sub(r"[ \t]+", " ", sanitized)
        sanitized = re.sub(r"\n{3,}", "\n\n", sanitized)
        sanitized = sanitized.strip()
        if len(sanitized) > max_length:
            raise ValueError(f"{field_name} exceeds {max_length} characters")
        return sanitized

    async def require_owned_model(self, collection: str, model_id: str, model_type, identity_id: str):
        model = await self.store.get_model(collection, model_id, model_type)
        if model is None or model.identity_id != identity_id:
            raise KeyError(f"{model_type.__name__} not found")
        return model

    async def _process_generation(self, job_id: str) -> None:
        job = await self.store.get_model("generations", job_id, GenerationJob)
        if job is None:
            if self.generation_broker is not None:
                await self.generation_broker.complete(job_id)
            self._active_generation_claims.pop(job_id, None)
            return
        provider_label = (
            job.provider_candidates[0]
            if job.provider_candidates
            else initial_generation_provider_label(
                self.providers,
                model_id=job.model,
                workflow=job.prompt_snapshot.workflow,
                has_reference_image=job.prompt_snapshot.reference_asset_id is not None,
            )
        )
        started_at = utc_now()
        claim_token = self._active_generation_claims.get(job_id)
        if claim_token is None:
            claim_token = await self._claim_generation_job(
                job_id,
                provider=provider_label,
            )
        else:
            refreshed = await self._refresh_generation_claim(
                job_id,
                claim_token=claim_token,
                provider=provider_label,
            )
            if not refreshed:
                claim_token = await self._claim_generation_job(
                    job_id,
                    provider=provider_label,
                )
        if claim_token is None:
            if self.generation_broker is not None:
                await self.generation_broker.complete(job_id)
            self._active_generation_claims.pop(job_id, None)
            return

        release_broker_claim = True
        try:
            execution = await self.generation_runtime.execute_job(job)
            finished_at = utc_now()
            identity = await self.store.get_identity(job.identity_id)
            unlimited_access = bool(identity and self._has_unlimited_generation_access(identity))
            finalized_route = self.providers.finalize_generation_route(
                GenerationRoutingDecision(
                    workflow=job.prompt_snapshot.workflow,
                    requested_quality_tier=job.requested_quality_tier,
                    selected_quality_tier=job.selected_quality_tier,
                    degraded=job.degraded,
                    routing_strategy=job.routing_strategy,
                    routing_reason=job.routing_reason,
                    prompt_profile=job.prompt_profile,
                    provider_candidates=tuple(job.provider_candidates),
                    selected_provider=job.provider,
                ),
                provider_name=execution.provider_name or provider_label,
            )
            if unlimited_access:
                credit_charge_policy = "none"
                final_credit_cost = 0
            else:
                credit_charge_policy, final_credit_cost = calculate_generation_final_charge(
                    base_credit_cost=job.credit_cost,
                    provider_name=execution.provider_name or provider_label,
                    provider_billable=execution.provider_billable,
                    degraded=finalized_route.degraded,
                )

            def mutation(state: StudioState) -> None:
                apply_completed_generation_to_state(
                    state=state,
                    job_id=job.id,
                    provider_name=execution.provider_name,
                    provider_rollout_tier=execution.provider_rollout_tier,
                    provider_billable=execution.provider_billable,
                    actual_cost_usd=execution.actual_cost_usd,
                    final_credit_cost=final_credit_cost,
                    credit_charge_policy=credit_charge_policy,
                    selected_quality_tier=finalized_route.selected_quality_tier,
                    degraded=finalized_route.degraded,
                    routing_reason=finalized_route.routing_reason,
                    generated_outputs=execution.generated_outputs,
                    created_assets=execution.created_assets,
                    style_tags=infer_style_tags(job),
                    now=utc_now(),
                )

            await self.store.mutate(mutation)
            completed_log_job = job.model_copy(
                update={
                    "provider": execution.provider_name or provider_label,
                    "provider_rollout_tier": execution.provider_rollout_tier,
                    "provider_billable": execution.provider_billable,
                    "selected_quality_tier": finalized_route.selected_quality_tier,
                    "degraded": finalized_route.degraded,
                    "routing_reason": finalized_route.routing_reason,
                    "final_credit_cost": final_credit_cost,
                    "credit_charge_policy": credit_charge_policy,
                    "credit_status": "settled" if final_credit_cost > 0 else "released",
                }
            )
            self._log_generation_event(
                "generation_completed",
                job=completed_log_job,
                status=JobStatus.SUCCEEDED,
                provider=execution.provider_name or provider_label,
                started_at=started_at,
                finished_at=finished_at,
            )
        except ProviderTemporaryError as exc:
            finished_at = utc_now()
            error_code = self._classify_generation_error_code(exc)
            error_message = self._normalize_generation_error_message(exc)
            failure_provider = getattr(exc, "provider_name", None) or provider_label
            updated_job = await self._update_job_status(
                job_id,
                JobStatus.RETRYABLE_FAILED,
                provider=failure_provider,
                error=error_message,
                error_code=error_code,
            )
            self._log_generation_event(
                "generation_retryable_failure",
                job=updated_job or job,
                status=JobStatus.RETRYABLE_FAILED,
                provider=failure_provider,
                error=error_message,
                error_code=error_code,
                started_at=started_at,
                finished_at=finished_at,
                level=logging.WARNING,
            )
        except asyncio.CancelledError:
            release_broker_claim = False
            self._log_generation_event(
                "generation_worker_cancelled",
                job=job,
                status=JobStatus.RUNNING,
                provider=provider_label,
                error="Generation worker stopped before completion; broker claim left active for recovery.",
                error_code="generation_worker_cancelled",
                started_at=started_at,
                finished_at=utc_now(),
                level=logging.WARNING,
            )
            raise
        except Exception as exc:
            finished_at = utc_now()
            error_code = self._classify_generation_error_code(exc)
            error_message = self._normalize_generation_error_message(exc)
            failure_provider = getattr(exc, "provider_name", None) or provider_label
            updated_job = await self._update_job_status(
                job_id,
                JobStatus.FAILED,
                provider=failure_provider,
                error=error_message,
                error_code=error_code,
            )
            self._log_generation_event(
                "generation_failed",
                job=updated_job or job,
                status=JobStatus.FAILED,
                provider=failure_provider,
                error=error_message,
                error_code=error_code,
                started_at=started_at,
                finished_at=finished_at,
                level=logging.ERROR,
            )
        finally:
            if self.generation_broker is not None and release_broker_claim:
                await self.generation_broker.complete(job_id)
            self._active_generation_claims.pop(job_id, None)

    async def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        provider: Optional[str] = None,
        error: Optional[str] = None,
        error_code: Optional[str] = None,
    ) -> Optional[GenerationJob]:
        holder: Dict[str, GenerationJob] = {}

        def mutation(state: StudioState) -> None:
            apply_generation_status_update(
                state=state,
                job_id=job_id,
                status=status,
                provider=provider,
                error=error,
                error_code=error_code,
                now=utc_now(),
            )
            updated_job = state.generations.get(job_id)
            if updated_job is not None:
                holder["job"] = updated_job.model_copy(deep=True)

        await self.store.mutate(mutation)
        return holder.get("job")

    async def _get_generation_job_snapshot(self, job_id: str) -> Optional[GenerationJob]:
        return await self.store.get_model("generations", job_id, GenerationJob)

    def _normalize_generation_error_message(self, exc: Exception) -> str:
        message = " ".join(str(exc).split())
        return message[:500] if message else exc.__class__.__name__

    def _classify_generation_error_code(self, exc: Exception) -> str:
        if isinstance(exc, ProviderTemporaryError):
            message = str(exc).lower()
            if "not configured" in message:
                return "provider_not_configured"
            if "timed out" in message or "timeout" in message:
                return "provider_timeout"
            if "network" in message or "connectivity" in message:
                return "provider_network"
            return "provider_temporary"
        return "generation_failed"

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
        start = started_at or job.started_at or job.created_at
        end = finished_at or utc_now()
        duration_ms = max(0, int((end - start).total_seconds() * 1000))
        payload = {
            "event": event,
            "generation_id": job.id,
            "project_id": job.project_id,
            "identity_id": job.identity_id,
            "provider": provider or job.provider,
            "model": job.model,
            "workflow": job.prompt_snapshot.workflow,
            "requested_quality_tier": job.requested_quality_tier,
            "selected_quality_tier": job.selected_quality_tier,
            "degraded": job.degraded,
            "routing_strategy": job.routing_strategy,
            "routing_reason": job.routing_reason,
            "prompt_profile": job.prompt_profile,
            "queue_priority": job.queue_priority,
            "reserved_credit_cost": job.reserved_credit_cost,
            "final_credit_cost": job.final_credit_cost,
            "credit_charge_policy": job.credit_charge_policy,
            "credit_status": job.credit_status,
            "started_at": start.isoformat(),
            "finished_at": end.isoformat(),
            "duration_ms": duration_ms,
            "status": JobStatus.coerce(status).value,
            "error_code": error_code,
        }
        if error:
            payload["error"] = error
        logger.log(level, "generation_event %s", json.dumps(payload, ensure_ascii=True, sort_keys=True))

    async def _ensure_generation_capacity(
        self,
        *,
        identity: OmniaIdentity,
        project_id: str,
        model_id: str,
        prompt_snapshot: PromptSnapshot,
        plan_config: PlanCatalogEntry,
    ) -> None:
        if self._has_unlimited_generation_access(identity):
            return
        queued_jobs = len(await self.store.list_generations_with_statuses({JobStatus.QUEUED}))
        queue_limit = min(self.settings.max_queue_size, 50)
        if queued_jobs >= queue_limit:
            raise GenerationCapacityError(
                "Generation queue is currently full. Please try again shortly.",
                queue_full=True,
                estimated_wait_seconds=self._estimate_queue_wait_seconds(queued_jobs),
            )
        incomplete_jobs = await self.store.count_incomplete_generations()
        if incomplete_jobs >= self.settings.max_queue_size:
            raise GenerationCapacityError(
                "Generation queue is currently full. Please try again shortly.",
                queue_full=True,
                estimated_wait_seconds=self._estimate_queue_wait_seconds(incomplete_jobs),
            )
        if (
            plan_config.max_incomplete_generations > 0
            and await self.store.count_incomplete_generations_for_identity(identity.id) >= plan_config.max_incomplete_generations
        ):
            raise ValueError(
                f"{plan_config.label} plan has reached its active generation limit. Please wait for current jobs to finish."
            )
        if plan_config.generation_submit_limit > 0:
            window_start = utc_now() - timedelta(seconds=plan_config.generation_submit_window_seconds)
            recent_requests = await self.store.count_recent_generation_requests_for_identity(
                identity.id,
                since=window_start,
            )
            if recent_requests >= plan_config.generation_submit_limit:
                raise ValueError(
                    f"{plan_config.label} plan has reached its recent generation burst limit. Please wait a moment and try again."
                )
        if await self.store.has_duplicate_incomplete_generation(
            identity_id=identity.id,
            project_id=project_id,
            model_id=model_id,
            prompt_snapshot=prompt_snapshot,
        ):
            raise ValueError("An identical generation is already queued or running for this project.")

    def _estimate_queue_wait_seconds(self, queued_jobs: int) -> int:
        slots = max(1, self.settings.max_concurrent_generations)
        batches = max(1, math.ceil(queued_jobs / slots))
        return max(30, batches * 30)

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
            metadata=build_generated_asset_metadata(
                job=job,
                provider=provider,
                mime_type=mime_type,
                variation_index=variation_index,
                variation_count=variation_count,
                seed=seed,
            ),
        )
        identity = await self.store.get_identity(job.identity_id)
        protected_payload = await asyncio.to_thread(
            self.asset_protection.protect,
            image_bytes,
            mime_type=mime_type,
            asset_id=asset.id,
            job_id=job.id,
            user_id=job.identity_id,
            username=identity.username if identity else None,
        )
        asset.metadata["mime_type"] = protected_payload.mime_type
        asset.metadata["clean_mime_type"] = protected_payload.mime_type
        asset.metadata["protection_version"] = "oc-proof-v1"
        asset.metadata["visible_watermark"] = True
        asset.metadata["clean_export_available"] = True
        asset.metadata["protection_signature"] = protected_payload.proof_signature
        await self._store_asset_payload(
            asset=asset,
            image_bytes=protected_payload.delivery_bytes,
            mime_type=protected_payload.mime_type,
            clean_image_bytes=protected_payload.clean_bytes,
            clean_mime_type=protected_payload.mime_type,
            storage_prefix=f"generated/{job.workspace_id}/{job.project_id}/{job.id}",
        )
        return asset

    async def _load_generation_reference_image(self, job: GenerationJob) -> Optional[ProviderReferenceImage]:
        return await self.generation_runtime.load_reference_image(job)

    async def _read_asset_bytes(self, asset: MediaAsset, *, variant: str) -> tuple[bytes, str]:
        storage_key = self._resolve_asset_variant_storage_key(asset, variant)
        storage_kind = str(asset.metadata.get("storage_backend") or "").strip().lower()
        if storage_key and storage_kind:
            backend = self.asset_storage.get(storage_kind)
            content = await backend.fetch_bytes(storage_key)
            mime_type = self._resolve_asset_variant_mime_type(asset, variant, storage_key)
            return content, mime_type

        path = self._resolve_asset_variant_path(asset, variant)
        if path and path.exists():
            content = await asyncio.to_thread(path.read_bytes)
            mime_type = self._resolve_asset_variant_mime_type(asset, variant, path.name)
            return content, mime_type

        raise ProviderTemporaryError("Asset bytes are not available")

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
        main_extension = self._extension_for_mime_type(mime_type)
        storage_backend = self.asset_storage.default_kind
        main_key = f"{storage_prefix}/{asset.id}{main_extension}"
        clean_key: Optional[str] = None
        if clean_image_bytes is not None:
            clean_extension = self._extension_for_mime_type(clean_mime_type or mime_type)
            clean_key = f"{storage_prefix}/{asset.id}_clean{clean_extension}"
        thumbnail_key = f"{storage_prefix}/{asset.id}_thumb.jpg"

        backend = self.asset_storage.get(storage_backend)
        await backend.store_bytes(main_key, image_bytes, content_type=mime_type)
        asset.metadata["storage_backend"] = storage_backend
        asset.metadata["storage_key"] = main_key

        if storage_backend == "local":
            asset.local_path = str(self.asset_storage.local_backend.resolve_path(main_key))

        if clean_key and clean_image_bytes is not None:
            await backend.store_bytes(clean_key, clean_image_bytes, content_type=clean_mime_type or mime_type)
            asset.metadata["clean_storage_key"] = clean_key
            asset.metadata["clean_mime_type"] = clean_mime_type or mime_type
            if storage_backend == "local":
                asset.metadata["clean_path"] = str(self.asset_storage.local_backend.resolve_path(clean_key))

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

    async def export_identity_data(self, identity_id: str) -> Dict[str, Any]:
        """GDPR compliant export of all user data in JSON structure."""
        identity = await self.get_identity(identity_id)
        assets = await self.store.list_assets_for_identity(identity_id)
        posts = await self.store.list_posts_for_identity(identity_id)
        assets_by_id = await self.store.get_asset_map()
        identities_by_id = await self.store.get_identity_map()
        return build_identity_export(
            identity=identity,
            identity_id=identity_id,
            assets=assets,
            posts=posts,
            assets_by_id=assets_by_id,
            identities_by_id=identities_by_id,
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
        assets_to_delete = await self.store.list_assets_for_identity(identity_id)
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
        checkout_kind_raw = custom_data.get("checkout_kind")
        checkout_kind = None
        if isinstance(checkout_kind_raw, str):
            try:
                checkout_kind = CheckoutKind(checkout_kind_raw)
            except ValueError:
                checkout_kind = None
        
        if not identity_id:
            # Maybe the user didn't have an account or it was a test hook
            return

        if not is_supported_lemonsqueezy_event(event_name):
            return
            
        now = utc_now()
        receipt = build_lemonsqueezy_webhook_receipt(
            payload=payload,
            identity_id=identity_id,
            checkout_kind=checkout_kind,
            now=now,
        )
        from .mailer import mailer
        
        if event_name in ("order_created", "subscription_created", "subscription_payment_success"):
            upgraded_email = None
            already_processed = False

            def mutation(state: StudioState) -> None:
                nonlocal already_processed, upgraded_email
                if receipt.id in state.billing_webhook_receipts:
                    already_processed = True
                    return
                result = apply_lemonsqueezy_webhook_event(
                    state=state,
                    identity_id=identity_id,
                    event_name=event_name,
                    now=now,
                    plan_catalog=PLAN_CATALOG,
                    checkout_catalog=CHECKOUT_CATALOG,
                    checkout_kind=checkout_kind,
                    receipt_id=receipt.id,
                )
                state.billing_webhook_receipts[receipt.id] = receipt
                upgraded_email = result.upgraded_email

            await self.store.mutate(mutation)
            if upgraded_email and not already_processed:
                await mailer.send_subscription_update(upgraded_email, "Pro")

        elif event_name in ("subscription_cancelled", "subscription_expired"):
            already_processed = False

            def mutation(state: StudioState) -> None:
                nonlocal already_processed
                if receipt.id in state.billing_webhook_receipts:
                    already_processed = True
                    return
                apply_lemonsqueezy_webhook_event(
                    state=state,
                    identity_id=identity_id,
                    event_name=event_name,
                    now=now,
                    plan_catalog=PLAN_CATALOG,
                    checkout_catalog=CHECKOUT_CATALOG,
                    checkout_kind=checkout_kind,
                    receipt_id=receipt.id,
                )
                state.billing_webhook_receipts[receipt.id] = receipt

            await self.store.mutate(mutation)
