from typing import TYPE_CHECKING, Optional, List, Dict, Any
from uuid import uuid4
from dataclasses import replace
from datetime import datetime, timedelta
from fastapi import Request
import asyncio
import json
import time
import logging
import math
import re
from ..models import (
    GenerationJob,
    IdentityPlan,
    JobStatus,
    MediaAsset,
    OmniaIdentity,
    PlanCatalogEntry,
    PromptSnapshot,
    StudioState,
    utc_now,
)
from ..generation_ops import (
    apply_completed_generation_to_state,
    apply_generation_status_update,
    build_generated_asset_metadata,
    build_generation_title,
    build_prompt_snapshot,
    claim_generation_job_locked,
    count_incomplete_generations,
    create_generation_job_record,
    infer_style_tags,
    refresh_generation_claim_locked,
    requeue_generation_job_locked,
)
from ..generation_pricing_ops import build_generation_pricing_quote
from ..generation_credit_forecast_ops import calculate_generation_final_charge
from ..generation_admission_ops import (
    count_incomplete_generations_for_identity,
    count_recent_generation_requests_for_identity,
    has_duplicate_incomplete_generation,
)
from ..providers import (
    Environment,
    GenerationRoutingDecision,
    ProviderFatalError,
    ProviderReferenceImage,
    ProviderTemporaryError,
    is_provider_auth_failure,
)
from ..asset_import_ops import parse_data_url_image
from ..prompt_engineering import CompiledPrompt, compile_generation_request, improve_prompt_candidate
from ..prompt_memory_ops import build_prompt_memory_context, derive_display_title, derive_prompt_tags
from .generation_runtime import initial_generation_provider_label
import io
import mimetypes
import hashlib
from PIL import Image
from PIL import ImageDraw

logger = logging.getLogger(__name__)
_GENERATION_TEXT_CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

if TYPE_CHECKING:
    from ..service import StudioService

class GenerationService:
    def __init__(self, service: 'StudioService'):
        self.service = service

    def _generation_capacity_error(
        self,
        message: str,
        *,
        queue_full: bool = False,
        estimated_wait_seconds: int | None = None,
    ):
        from ..service import GenerationCapacityError

        return GenerationCapacityError(
            message,
            queue_full=queue_full,
            estimated_wait_seconds=estimated_wait_seconds,
        )

    def _provider_spend_guardrail_message(self) -> str:
        from ..service import _PROVIDER_SPEND_GUARDRAIL_USER_MESSAGE

        return _PROVIDER_SPEND_GUARDRAIL_USER_MESSAGE

    def _can_process_generations(self) -> bool:
        return self.service._generation_runtime_mode in {"all", "worker"} or self._uses_local_generation_fallback()


    def _uses_shared_generation_broker(self) -> bool:
        return self.service.generation_broker is not None


    def _uses_local_generation_fallback(self) -> bool:
        return self.service._generation_runtime_mode == "web" and self.service.generation_broker is None


    def _ensure_generation_maintenance_task(self) -> None:
        if not self._can_process_generations():
            return
        if self.service._generation_maintenance_task is None or self.service._generation_maintenance_task.done():
            self.service._generation_maintenance_task = asyncio.create_task(
                self._generation_maintenance_loop()
            )


    def _ensure_orphan_cleanup_task(self) -> None:
        if not self._can_process_generations():
            return
        if self.service._orphan_cleanup_task is None or self.service._orphan_cleanup_task.done():
            self.service._orphan_cleanup_task = asyncio.create_task(
                self._orphan_cleanup_loop()
            )

    async def recover_startup_stale_broker_claims(self) -> list[tuple[str, str]]:
        if self.service.generation_broker is None:
            return []
        return await self.service.generation_broker.requeue_stale_claims(
            stale_after_seconds=max(1, int(self.service.settings.studio_job_stale_seconds)),
        )

    async def graceful_shutdown(self) -> None:
        self.service.generation_dispatcher.stop_accepting()
        drained = await self.service.generation_dispatcher.wait_for_idle(
            timeout_seconds=max(0.0, float(self.service.settings.studio_shutdown_drain_seconds)),
        )
        pending_jobs = self.service.generation_dispatcher.snapshot_pending_jobs()
        if not drained and (pending_jobs["queued"] or pending_jobs["running"]):
            logger.warning(
                "Graceful shutdown drained incompletely; recovering %s queued and %s running generation jobs",
                len(pending_jobs["queued"]),
                len(pending_jobs["running"]),
            )

        await self.service.generation_dispatcher.stop()

        shutdown_job_ids = set(pending_jobs["queued"].keys())
        shutdown_job_ids.update(pending_jobs["running"])
        shutdown_job_ids.update(self.service._active_generation_claims.keys())
        for job_id in shutdown_job_ids:
            priority = pending_jobs["queued"].get(job_id)
            await self._recover_shutdown_generation(job_id, priority=priority)
        self.service._active_generation_claims.clear()

    async def _recover_shutdown_generation(self, job_id: str, *, priority: str | None) -> None:
        job = await self.service.store.get_generation(job_id)
        if job is None:
            if self.service.generation_broker is not None:
                await self.service.generation_broker.complete(job_id)
            return
        if job.status not in {JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.RETRYABLE_FAILED}:
            if self.service.generation_broker is not None:
                await self.service.generation_broker.complete(job_id)
            return
        if job.status != JobStatus.QUEUED:
            await self.service.store.mutate(
                lambda state: requeue_generation_job_locked(
                    state=state,
                    job_id=job_id,
                    now=utc_now(),
                )
            )
        if self.service.generation_broker is not None:
            await self.service.generation_broker.complete(job_id)
            await self.service.generation_broker.enqueue(
                job_id,
                priority=(job.queue_priority or priority or "standard"),
            )


    async def _generation_maintenance_loop(self) -> None:
        interval_seconds = max(1, self.service.settings.generation_maintenance_interval_seconds)
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
        retry_cutoff = now - timedelta(seconds=self.service.settings.generation_retry_delay_seconds)
        stale_cutoff = now - timedelta(seconds=self.service.settings.generation_stale_running_seconds)
        retry_limit = self.service.settings.generation_retry_attempt_limit
        claimed_jobs = 0
        broker_metrics = {"priority": 0, "standard": 0, "browse-only": 0}
        if self._can_process_generations() and self.service.generation_broker is not None:
            await self._reconcile_generation_broker_state()
            recovered_claims = await self.service.generation_broker.requeue_stale_claims(
                stale_after_seconds=self.service.settings.generation_stale_running_seconds,
            )
            claimed_jobs = await self._drain_generation_broker_into_dispatcher()
            broker_metrics = await self.service.generation_broker.metrics()
            if recovered_claims:
                claimed_jobs += len(recovered_claims)
        tracked_jobs = await self.service.store.list_generations_with_statuses(
            {JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.RETRYABLE_FAILED}
        )
        tracked_job_map = {job.id: job for job in tracked_jobs}
        metrics = self.service.generation_dispatcher.metrics()
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
            retry_limit = self._generation_retry_limit_for_job(job)
            if job.status == JobStatus.QUEUED:
                if not self.service.generation_dispatcher.is_tracked(job.id):
                    queue_entries.append((job.id, job.queue_priority))
                continue

            if job.status == JobStatus.RUNNING:
                if self.service.generation_dispatcher.is_running(job.id):
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
                if job.updated_at <= retry_cutoff and not self.service.generation_dispatcher.is_tracked(job.id):
                    retry_job_ids.append(job.id)

        if heartbeat_job_ids:
            def heartbeat_mutation(state: StudioState) -> None:
                for job_id in heartbeat_job_ids:
                    claim_token = self.service._active_generation_claims.get(job_id)
                    if claim_token:
                        refreshed = refresh_generation_claim_locked(
                            state=state,
                            job_id=job_id,
                            claim_token=claim_token,
                            lease_seconds=self.service._generation_claim_lease_seconds,
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

            await self.service.store.mutate(heartbeat_mutation)
            if self.service.generation_broker is not None:
                for job_id in heartbeat_job_ids:
                    await self.service.generation_broker.heartbeat_claim(job_id)

        if retry_job_ids:
            retry_job_id_set = set(retry_job_ids)

            def retry_mutation(state: StudioState) -> None:
                for job_id in retry_job_ids:
                    requeue_generation_job_locked(
                        state=state,
                        job_id=job_id,
                        now=now,
                    )

            await self.service.store.mutate(retry_mutation)
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

            await self.service.store.mutate(timeout_mutation)
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

            await self.service.store.mutate(failed_mutation)
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
        if self.service.generation_broker is not None:
            return await self.service.generation_broker.enqueue(job_id, priority=priority)
        return await self.service.generation_dispatcher.enqueue(job_id, priority=priority)


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
                worker_id=self.service._worker_id,
                claim_token=token,
                lease_seconds=self.service._generation_claim_lease_seconds,
                now=now,
                provider=provider,
            )

        await self.service.store.mutate(mutation)
        if not claimed_holder["claimed"]:
            self.service._active_generation_claims.pop(job_id, None)
            return None
        self.service._active_generation_claims[job_id] = token
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
                lease_seconds=self.service._generation_claim_lease_seconds,
                now=now,
                provider=provider,
            )

        await self.service.store.mutate(mutation)
        if not refreshed_holder["refreshed"]:
            self.service._active_generation_claims.pop(job_id, None)
        return bool(refreshed_holder["refreshed"])


    async def _drain_generation_broker_into_dispatcher(self) -> int:
        if self.service.generation_broker is None:
            return 0

        claimed = 0
        while self.service.generation_dispatcher.available_capacity() > 0:
            job_id, queue_priority, next_streak = await self.service.generation_broker.dequeue_next(
                priority_streak=self.service._broker_priority_streak,
                priority_burst_limit=self.service.generation_dispatcher._PRIORITY_BURST_LIMIT,
                priority_order=self.service.generation_dispatcher._PRIORITY_ORDER,
            )
            self.service._broker_priority_streak = next_streak
            if job_id is None:
                break
            if self.service.generation_dispatcher.is_tracked(job_id):
                await self.service.generation_broker.complete(job_id)
                continue
            claim_token = await self._claim_generation_job(job_id)
            if claim_token is None:
                await self.service.generation_broker.complete(job_id)
                continue
            enqueued = await self.service.generation_dispatcher.enqueue(job_id, priority=queue_priority or "standard")
            if not enqueued:
                self.service._active_generation_claims.pop(job_id, None)

                def mutation(state: StudioState) -> None:
                    requeue_generation_job_locked(
                        state=state,
                        job_id=job_id,
                        now=utc_now(),
                    )

                await self.service.store.mutate(mutation)
                await self.service.generation_broker.complete(job_id)
                await self._enqueue_generation_job(job_id, priority=queue_priority or "standard")
                continue
            claimed += 1
        return claimed


    async def _reconcile_generation_broker_state(self) -> int:
        if self.service.generation_broker is None:
            return 0

        snapshot = await self.service.generation_broker.inspect()
        queued = snapshot.get("queued", {})
        claimed = snapshot.get("claimed", {})
        discarded = 0

        for priority, job_ids in dict(queued).items():
            for job_id in list(job_ids):
                job = await self.service.store.get_generation(str(job_id))
                if job is None:
                    await self.service.generation_broker.discard(str(job_id))
                    discarded += 1
                    continue
                if job.status in JobStatus.terminal_statuses() or job.status == JobStatus.RUNNING:
                    await self.service.generation_broker.discard(str(job_id))
                    discarded += 1
                    continue
                if job.status == JobStatus.RETRYABLE_FAILED:
                    await self.service.generation_broker.discard(str(job_id))
                    discarded += 1

        for job_id, priority in dict(claimed).items():
            job = await self.service.store.get_generation(str(job_id))
            if job is None or job.status in JobStatus.terminal_statuses():
                await self.service.generation_broker.discard(str(job_id))
                discarded += 1
                continue
            if job.status == JobStatus.QUEUED:
                await self.service.generation_broker.discard(str(job_id))
                discarded += 1
                await self._enqueue_generation_job(
                    str(job_id),
                    priority=job.queue_priority or str(priority) or "standard",
                )
                continue
            if job.status == JobStatus.RETRYABLE_FAILED:
                await self.service.generation_broker.discard(str(job_id))
                discarded += 1

        return discarded


    async def _run_scheduled_orphan_cleanup_if_due(self) -> None:
        now_local = datetime.now().astimezone()
        if now_local.hour < 3:
            return

        local_day = now_local.date().isoformat()
        if self.service._last_orphan_cleanup_local_day == local_day:
            return

        await self._run_orphan_cleanup_pass(now=utc_now())
        self.service._last_orphan_cleanup_local_day = local_day


    async def _run_orphan_cleanup_pass(self, *, now: datetime) -> int:
        orphanable_statuses = {JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.RETRYABLE_FAILED}
        cutoff = now - timedelta(hours=24)
        tracked_jobs = await self.service.store.list_generations_with_statuses(orphanable_statuses)
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

        await self.service.store.mutate(mutation)
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



    async def list_generations(self, identity_id: str, project_id: Optional[str] = None) -> List[GenerationJob]:
        return await self.service.store.list_generations_for_identity(identity_id, project_id=project_id)


    async def get_generation(self, identity_id: str, generation_id: str) -> GenerationJob:
        return await self.service.require_owned_model("generations", generation_id, GenerationJob, identity_id)


    async def delete_generation(self, identity_id: str, generation_id: str) -> dict[str, str]:
        job = await self.get_generation(identity_id, generation_id)
        normalized_status = JobStatus.coerce(job.status)
        if normalized_status in {JobStatus.QUEUED, JobStatus.RUNNING, JobStatus.SUCCEEDED}:
            raise ValueError("Only failed or cancelled processing jobs can be removed from here.")
        if job.outputs:
            raise ValueError("Generations with saved outputs cannot be removed from Processing.")

        def mutation(state: StudioState) -> None:
            state.generations.pop(generation_id, None)

        await self.service.store.mutate(mutation)
        return {"generation_id": generation_id, "status": "deleted"}


    async def _filter_blocked_fallback_provider_candidates(
        self,
        *,
        provider_candidates: tuple[str, ...] | list[str],
        width: int,
        height: int,
        model_id: str,
        workflow: str,
        has_reference_image: bool,
        keep_primary: bool = True,
    ) -> tuple[str, ...]:
        normalized_candidates = tuple(
            str(provider_name or "").strip().lower()
            for provider_name in provider_candidates
            if str(provider_name or "").strip()
        )
        if len(normalized_candidates) <= 1 and keep_primary:
            return normalized_candidates

        # ── Monthly stop-loss guardrail (doctrine rules 1-5) ──
        monthly_guardrail = await self.service._evaluate_monthly_spend_guardrail()
        monthly_blocked_providers: set[str] = set()
        if monthly_guardrail.status == "blocked":
            logger.warning("generation_monthly_spend_hard_cap_blocked %s", monthly_guardrail.serialize())
            return ()
        if monthly_guardrail.status == "warning":
            logger.warning("generation_monthly_spend_guardrail_warning %s", monthly_guardrail.serialize())
        if monthly_guardrail.blocked_providers:
            monthly_blocked_providers = set(monthly_guardrail.blocked_providers)
            logger.warning(
                "generation_monthly_guardrail_provider_block providers=%s reason=%s",
                monthly_guardrail.blocked_providers, monthly_guardrail.reason,
            )

        allowed_candidates: list[str] = []
        for index, provider_name in enumerate(normalized_candidates):
            # Skip providers blocked by monthly guardrails (OpenAI share/cap)
            if provider_name in monthly_blocked_providers:
                logger.warning(
                    "generation_monthly_guardrail_skip_provider provider=%s reason=%s",
                    provider_name, monthly_guardrail.reason,
                )
                if index == 0 and keep_primary and len(normalized_candidates) > 1:
                    continue
                elif index == 0 and keep_primary:
                    allowed_candidates.append(provider_name)
                    continue
                continue
            if index == 0 and keep_primary:
                allowed_candidates.append(provider_name)
                continue
            provider_billable = self.service.providers.provider_billable(provider_name)
            projected_cost_usd = self.service.providers.estimate_generation_cost(
                provider_name=provider_name,
                width=width,
                height=height,
                model_id=model_id,
                workflow=workflow,
                has_reference_image=has_reference_image,
            )
            spend_guardrail = await self.service._provider_spend_guardrail_for_provider(
                provider_name=provider_name,
                provider_billable=provider_billable,
                projected_cost_usd=projected_cost_usd or 0.0,
            )
            if spend_guardrail is not None and spend_guardrail.status == "blocked":
                logger.warning(
                    "generation_provider_spend_guardrail_skip_fallback %s",
                    spend_guardrail.serialize(),
                )
                continue
            if spend_guardrail is not None and spend_guardrail.status == "warning":
                logger.warning("generation_provider_spend_guardrail_warning %s", spend_guardrail.serialize())
            allowed_candidates.append(provider_name)

        return tuple(allowed_candidates)


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
        identity = await self.service.get_identity(identity_id)
        self.service._assert_identity_action_allowed(
            identity,
            action_code="generation",
            action_label="creating generations",
        )
        reference_asset = None
        if reference_asset_id:
            reference_asset = await self.service.require_owned_model("assets", reference_asset_id, MediaAsset, identity_id)
        project = await self.service._resolve_generation_project(
            identity=identity,
            requested_project_id=project_id,
            reference_asset=reference_asset,
        )
        model = await self.service.get_model(model_id)
        plan_config = self.service.plan_catalog[identity.plan]
        if not plan_config.can_generate:
            raise PermissionError("Guests cannot generate images")
        billing_state = await self.service.billing._resolve_billing_state_for_identity(identity)

        self.service._validate_model_for_identity(identity, model, billing_state=billing_state)
        resolved_aspect_ratio = self.service._normalize_generation_aspect_ratio(aspect_ratio)
        resolved_width, resolved_height = self.service._resolve_generation_dimensions_for_model(
            model=model,
            aspect_ratio=resolved_aspect_ratio,
        )
        prompt_memory = await self.service.store.get_prompt_memory_for_identity(identity.id)
        prompt_memory_context = build_prompt_memory_context(prompt_memory)

        cleaned_prompt = self._sanitize_generation_text(
            prompt,
            field_name="prompt",
            max_length=2000,
        )
        if not cleaned_prompt:
            raise ValueError("Prompt cannot be empty")
        cleaned_source_prompt = self._sanitize_generation_text(
            source_prompt or prompt,
            field_name="source_prompt",
            max_length=2000,
        ) or cleaned_prompt
        cleaned_negative_prompt = self._sanitize_generation_text(
            negative_prompt,
            field_name="negative_prompt",
            max_length=500,
        )
        admission_prompt_snapshot = build_prompt_snapshot(
            prompt=cleaned_prompt,
            negative_prompt=cleaned_negative_prompt,
            source_prompt=cleaned_source_prompt,
            source_negative_prompt=cleaned_negative_prompt,
            model_id=model.id,
            reference_asset_id=reference_asset.id if reference_asset else None,
            width=resolved_width,
            height=resolved_height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            aspect_ratio=resolved_aspect_ratio,
        )
        routing_decision = self.service.providers.plan_generation_route(
            plan=identity.plan,
            prompt=cleaned_prompt,
            model_id=model.id,
            workflow=admission_prompt_snapshot.workflow,
            has_reference_image=reference_asset is not None,
            wallet_backed=identity.plan == IdentityPlan.FREE and billing_state.extra_credits > 0,
        )
        compiled_request = compile_generation_request(
            prompt=cleaned_prompt,
            negative_prompt=cleaned_negative_prompt,
            provider_name=routing_decision.selected_provider or "cloud",
            model_id=model.id,
            workflow=admission_prompt_snapshot.workflow,
            prompt_profile=routing_decision.prompt_profile,
        )
        if prompt_memory_context:
            compiled_request = CompiledPrompt(
                prompt=" ".join(
                    [
                        compiled_request.prompt,
                        f"Creative direction: {prompt_memory_context}",
                    ]
                ).strip(),
                negative_prompt=compiled_request.negative_prompt,
            )
        prompt_snapshot = build_prompt_snapshot(
            prompt=compiled_request.prompt,
            negative_prompt=compiled_request.negative_prompt,
            source_prompt=cleaned_source_prompt,
            source_negative_prompt=cleaned_negative_prompt,
            model_id=model.id,
            reference_asset_id=reference_asset.id if reference_asset else None,
            width=resolved_width,
            height=resolved_height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            aspect_ratio=resolved_aspect_ratio,
        )
        if not routing_decision.provider_candidates:
            raise ValueError(
                "No real image provider is available for this workflow right now. "
                "Studio will not replace it with a fake demo render."
            )
        filtered_provider_candidates = await self._filter_blocked_fallback_provider_candidates(
            provider_candidates=routing_decision.provider_candidates,
            width=resolved_width,
            height=resolved_height,
            model_id=model.id,
            workflow=routing_decision.workflow,
            has_reference_image=reference_asset is not None,
            keep_primary=False,
        )
        if not filtered_provider_candidates:
            raise RuntimeError(self._provider_spend_guardrail_message())
        effective_provider = filtered_provider_candidates[0]
        effective_routing_decision = self.service.providers.finalize_generation_route(
            routing_decision,
            provider_name=effective_provider,
        )
        provider_estimated_cost = self.service.providers.estimate_generation_cost(
            provider_name=effective_provider,
            width=resolved_width,
            height=resolved_height,
            model_id=model.id,
            workflow=effective_routing_decision.workflow,
            has_reference_image=reference_asset is not None,
        )
        provider_billable = self.service.providers.provider_billable(effective_provider)
        pricing_quote = build_generation_pricing_quote(
            selected_provider=effective_routing_decision.selected_provider,
            routing_decision=replace(
                effective_routing_decision,
                provider_candidates=filtered_provider_candidates,
            ),
            requested_model_id=model.id,
            workflow=effective_routing_decision.workflow,
            width=resolved_width,
            height=resolved_height,
            output_count=output_count,
            provider_estimated_cost=provider_estimated_cost,
            legacy_model=model,
            unlimited_generation_access=self.service._has_unlimited_generation_access(identity),
        )
        job = create_generation_job_record(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            title=build_generation_title(cleaned_prompt),
            model_id=model.id,
            prompt_snapshot=prompt_snapshot,
            estimated_cost=pricing_quote.estimated_cost,
            estimated_cost_source=pricing_quote.estimated_cost_source,
            pricing_lane=pricing_quote.pricing_lane,
            credit_cost=pricing_quote.credit_cost,
            output_count=output_count,
            queue_priority=plan_config.queue_priority,
            provider=effective_provider,
            provider_rollout_tier=self.service.providers.provider_rollout_tier(effective_provider),
            provider_billable=provider_billable,
            requested_quality_tier=effective_routing_decision.requested_quality_tier,
            selected_quality_tier=effective_routing_decision.selected_quality_tier,
            degraded=effective_routing_decision.degraded,
            routing_strategy=effective_routing_decision.routing_strategy,
            routing_reason=effective_routing_decision.routing_reason,
            prompt_profile=effective_routing_decision.prompt_profile,
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
            provider_candidates=list(filtered_provider_candidates),
            reserved_credit_cost=pricing_quote.reserved_credit_cost,
            credit_status="reserved" if pricing_quote.reserved_credit_cost > 0 else "none",
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
        await self.service._record_prompt_memory_signal(
            identity_id=identity.id,
            prompt=cleaned_prompt,
            negative_prompt=cleaned_negative_prompt,
            model_id=model.id,
            aspect_ratio=aspect_ratio,
            improved=False,
            flagged=False,
        )
        return job


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

            self.service._refresh_monthly_credits_locked(state, current_identity)
            unlimited_access = self.service._has_unlimited_generation_access(current_identity)
            if unlimited_access:
                self.service._apply_privileged_identity_overrides(current_identity)

            if not unlimited_access:
                queued_jobs = sum(1 for current_job in state.generations.values() if current_job.status == JobStatus.QUEUED)
                queue_limit = min(self.service.settings.max_queue_size, 50)
                if queued_jobs >= queue_limit:
                    raise self._generation_capacity_error(
                        "Generation queue is currently full. Please try again shortly.",
                        queue_full=True,
                        estimated_wait_seconds=self._estimate_queue_wait_seconds(queued_jobs),
                    )

                incomplete_jobs = count_incomplete_generations(state)
                if incomplete_jobs >= self.service.settings.max_queue_size:
                    raise self._generation_capacity_error(
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

                billing_state = self.service._resolve_billing_state_locked(state, current_identity)
                if billing_state.available_to_spend < job.reserved_credit_cost:
                    raise ValueError("Not enough credits to run this generation")

            state.identities[current_identity.id] = current_identity
            state.generations[job.id] = job
            holder["job"] = job.model_copy(deep=True)

        await self.service.store.mutate(mutation)
        return holder["job"]


    async def improve_generation_prompt(self, prompt: str, *, identity_id: str | None = None) -> Dict[str, Any]:
        cleaned = " ".join(prompt.strip().split())
        if not cleaned:
            raise ValueError("Prompt cannot be empty")

        memory_context = ""
        if identity_id:
            profile = await self.service.store.get_prompt_memory_for_identity(identity_id)
            memory_context = build_prompt_memory_context(profile)

        llm_result = await self.service.llm_gateway.improve_prompt(cleaned, memory_context=memory_context)
        if llm_result:
            improved_prompt = improve_prompt_candidate(llm_result.text)
            await self.service._record_cost_telemetry_event(
                source_kind="prompt_improve",
                surface="prompt_improve",
                source_id=None,
                identity_id=identity_id,
                provider=llm_result.provider,
                provider_model=llm_result.model,
                amount_usd=llm_result.estimated_cost_usd,
                billable=bool((llm_result.estimated_cost_usd or 0.0) > 0),
                metadata={
                    "used_llm": True,
                    "used_fallback": llm_result.used_fallback,
                },
            )
            if identity_id:
                await self.service._record_prompt_memory_signal(
                    identity_id=identity_id,
                    prompt=improved_prompt,
                    improved=True,
                    flagged=False,
                )
            return {
                "prompt": improved_prompt,
                "provider": llm_result.provider,
                "used_llm": True,
            }

        fallback_prompt = self._fallback_enhanced_prompt(cleaned)
        if identity_id:
            await self.service._record_prompt_memory_signal(
                identity_id=identity_id,
                prompt=fallback_prompt,
                improved=True,
                flagged=False,
            )
        return {
            "prompt": fallback_prompt,
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


    async def _process_generation(self, job_id: str) -> None:
        job = await self.service.store.get_model("generations", job_id, GenerationJob)
        if job is None:
            if self.service.generation_broker is not None:
                await self.service.generation_broker.complete(job_id)
            self.service._active_generation_claims.pop(job_id, None)
            return
        provider_label = (
            job.provider_candidates[0]
            if job.provider_candidates
            else initial_generation_provider_label(
                self.service.providers,
                model_id=job.model,
                workflow=job.prompt_snapshot.workflow,
                has_reference_image=job.prompt_snapshot.reference_asset_id is not None,
            )
        )
        started_at = utc_now()
        claim_token = self.service._active_generation_claims.get(job_id)
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
            if self.service.generation_broker is not None:
                await self.service.generation_broker.complete(job_id)
            self.service._active_generation_claims.pop(job_id, None)
            return
        claimed_job = await self._get_generation_job_snapshot(job_id)
        if claimed_job is not None:
            job = claimed_job

        release_broker_claim = True
        try:
            execution_provider_candidates = await self._filter_blocked_fallback_provider_candidates(
                provider_candidates=tuple(job.provider_candidates or [provider_label]),
                width=job.prompt_snapshot.width,
                height=job.prompt_snapshot.height,
                model_id=job.model,
                workflow=job.prompt_snapshot.workflow,
                has_reference_image=job.prompt_snapshot.reference_asset_id is not None,
                keep_primary=False,
            )
            if execution_provider_candidates:
                provider_label = execution_provider_candidates[0]
            else:
                preflight_guardrail = await self.service._provider_spend_guardrail_for_provider(
                    provider_name=provider_label,
                    provider_billable=self.service.providers.provider_billable(provider_label),
                    projected_cost_usd=job.estimated_cost or 0.0,
                )
                if preflight_guardrail is not None and preflight_guardrail.status == "blocked":
                    updated_job = await self._update_job_status(
                        job_id,
                        JobStatus.FAILED,
                        provider=provider_label,
                        provider_billable=self.service.providers.provider_billable(provider_label),
                        error=self._provider_spend_guardrail_message(),
                        error_code="provider_spend_guardrail",
                    )
                    self._log_generation_event(
                        "generation_spend_guardrail_blocked",
                        job=updated_job or job,
                        status=JobStatus.FAILED,
                        provider=provider_label,
                        error=self._provider_spend_guardrail_message(),
                        error_code="provider_spend_guardrail",
                        started_at=started_at,
                        finished_at=utc_now(),
                        level=logging.WARNING,
                    )
                    return
                if preflight_guardrail is not None and preflight_guardrail.status == "warning":
                    logger.warning("generation_provider_spend_guardrail_warning %s", preflight_guardrail.serialize())
            execution_job = job
            if execution_provider_candidates and tuple(job.provider_candidates) != execution_provider_candidates:
                execution_job = job.model_copy(
                    update={"provider_candidates": list(execution_provider_candidates), "provider": provider_label}
                )
            execution = await self.service.generation_runtime.execute_job(execution_job)
            finished_at = utc_now()
            identity = await self.service.store.get_identity(job.identity_id)
            unlimited_access = bool(identity and self.service._has_unlimited_generation_access(identity))
            finalized_route = self.service.providers.finalize_generation_route(
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

            await self.service.store.mutate(mutation)
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
            failure_provider_billable = self.service.providers.provider_billable(failure_provider)
            retry_limit = self._generation_retry_limit_for_job(
                job,
                provider_billable=failure_provider_billable,
            )
            current_attempt_count = max(int(job.attempt_count or 0), 1)
            should_retry = error_code != "provider_auth" and current_attempt_count < retry_limit
            updated_job = await self._update_job_status(
                job_id,
                JobStatus.RETRYABLE_FAILED if should_retry else JobStatus.FAILED,
                provider=failure_provider,
                provider_billable=failure_provider_billable,
                error=error_message,
                error_code=error_code,
            )
            self._log_generation_event(
                "generation_retryable_failure" if should_retry else "generation_retry_suppressed",
                job=updated_job or job,
                status=JobStatus.RETRYABLE_FAILED if should_retry else JobStatus.FAILED,
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
            if self.service.generation_broker is not None and release_broker_claim:
                await self.service.generation_broker.complete(job_id)
            self.service._active_generation_claims.pop(job_id, None)


    async def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        provider: Optional[str] = None,
        provider_billable: Optional[bool] = None,
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
                provider_billable=provider_billable,
                error=error,
                error_code=error_code,
                now=utc_now(),
            )
            updated_job = state.generations.get(job_id)
            if updated_job is not None:
                holder["job"] = updated_job.model_copy(deep=True)

        await self.service.store.mutate(mutation)
        return holder.get("job")


    async def _get_generation_job_snapshot(self, job_id: str) -> Optional[GenerationJob]:
        return await self.service.store.get_model("generations", job_id, GenerationJob)


    def _normalize_generation_error_message(self, exc: Exception) -> str:
        message = " ".join(str(exc).split())
        return message[:500] if message else exc.__class__.__name__


    def _classify_generation_error_code(self, exc: Exception) -> str:
        if isinstance(exc, (ProviderTemporaryError, ProviderFatalError)):
            message = str(exc).lower()
            if is_provider_auth_failure(exc):
                return "provider_auth"
            if any(
                marker in message
                for marker in (
                    "potentially sensitive",
                    "safety",
                    "unsafe",
                    "policy",
                    "moderation",
                    "nsfw",
                    "blocked content",
                )
            ):
                return "safety_block"
            if "not configured" in message:
                return "provider_not_configured"
            if "timed out" in message or "timeout" in message:
                return "provider_timeout"
            if "network" in message or "connectivity" in message:
                return "provider_network"
            if isinstance(exc, ProviderFatalError):
                return "provider_rejected"
            return "provider_temporary"
        return "generation_failed"


    def _generation_retry_limit_for_job(
        self,
        job: GenerationJob,
        *,
        provider_billable: Optional[bool] = None,
    ) -> int:
        retry_limit = max(int(self.service.settings.generation_retry_attempt_limit or 0), 1)
        effective_provider_billable = job.provider_billable if provider_billable is None else provider_billable
        if self.service.settings.environment == Environment.DEVELOPMENT and bool(effective_provider_billable):
            return 1
        return retry_limit


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
        if self.service._has_unlimited_generation_access(identity):
            return
        queued_jobs = len(await self.service.store.list_generations_with_statuses({JobStatus.QUEUED}))
        queue_limit = min(self.service.settings.max_queue_size, 50)
        if queued_jobs >= queue_limit:
            raise self._generation_capacity_error(
                "Generation queue is currently full. Please try again shortly.",
                queue_full=True,
                estimated_wait_seconds=self._estimate_queue_wait_seconds(queued_jobs),
            )
        incomplete_jobs = await self.service.store.count_incomplete_generations()
        if incomplete_jobs >= self.service.settings.max_queue_size:
            raise self._generation_capacity_error(
                "Generation queue is currently full. Please try again shortly.",
                queue_full=True,
                estimated_wait_seconds=self._estimate_queue_wait_seconds(incomplete_jobs),
            )
        if (
            plan_config.max_incomplete_generations > 0
            and await self.service.store.count_incomplete_generations_for_identity(identity.id) >= plan_config.max_incomplete_generations
        ):
            raise ValueError(
                f"{plan_config.label} plan has reached its active generation limit. Please wait for current jobs to finish."
            )
        if plan_config.generation_submit_limit > 0:
            window_start = utc_now() - timedelta(seconds=plan_config.generation_submit_window_seconds)
            recent_requests = await self.service.store.count_recent_generation_requests_for_identity(
                identity.id,
                since=window_start,
            )
            if recent_requests >= plan_config.generation_submit_limit:
                raise ValueError(
                    f"{plan_config.label} plan has reached its recent generation burst limit. Please wait a moment and try again."
                )
        if await self.service.store.has_duplicate_incomplete_generation(
            identity_id=identity.id,
            project_id=project_id,
            model_id=model_id,
            prompt_snapshot=prompt_snapshot,
        ):
            raise ValueError("An identical generation is already queued or running for this project.")


    def _estimate_queue_wait_seconds(self, queued_jobs: int) -> int:
        slots = max(1, self.service.settings.max_concurrent_generations)
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
        identity = await self.service.store.get_identity(job.identity_id)
        protected_payload = await asyncio.to_thread(
            self.service.asset_protection.protect,
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
        asset.metadata["display_title"] = derive_display_title(job.prompt_snapshot.source_prompt or job.prompt_snapshot.prompt, fallback=job.title or "Untitled image set")
        asset.metadata["derived_tags"] = derive_prompt_tags(
            job.prompt_snapshot.source_prompt or job.prompt_snapshot.prompt,
            job.prompt_snapshot.source_negative_prompt or job.prompt_snapshot.negative_prompt,
        )
        asset.metadata["protection_state"] = "protected"
        asset.metadata["library_state"] = "ready"
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
        return await self.service.generation_runtime.load_reference_image(job)


    async def _read_asset_bytes(self, asset: MediaAsset, *, variant: str) -> tuple[bytes, str]:
        storage_key = self.service._resolve_asset_variant_storage_key(asset, variant)
        storage_kind = str(asset.metadata.get("storage_backend") or "").strip().lower()
        if storage_key and storage_kind:
            backend = self.service.asset_storage.get(storage_kind)
            content = await backend.fetch_bytes(storage_key)
            mime_type = self.service._resolve_asset_variant_mime_type(asset, variant, storage_key)
            return content, mime_type

        path = self.service._resolve_asset_variant_path(asset, variant)
        if path and path.exists():
            content = await asyncio.to_thread(path.read_bytes)
            mime_type = self.service._resolve_asset_variant_mime_type(asset, variant, path.name)
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
        storage_backend = self.service.asset_storage.default_kind
        main_key = f"{storage_prefix}/{asset.id}{main_extension}"
        clean_key: Optional[str] = None
        if clean_image_bytes is not None:
            clean_extension = self._extension_for_mime_type(clean_mime_type or mime_type)
            clean_key = f"{storage_prefix}/{asset.id}_clean{clean_extension}"
        thumbnail_key = f"{storage_prefix}/{asset.id}_thumb.jpg"

        backend = self.service.asset_storage.get(storage_backend)
        await backend.store_bytes(main_key, image_bytes, content_type=mime_type)
        asset.metadata["storage_backend"] = storage_backend
        asset.metadata["storage_key"] = main_key

        if storage_backend == "local":
            asset.local_path = str(self.service.asset_storage.local_backend.resolve_path(main_key))

        if clean_key and clean_image_bytes is not None:
            await backend.store_bytes(clean_key, clean_image_bytes, content_type=clean_mime_type or mime_type)
            asset.metadata["clean_storage_key"] = clean_key
            asset.metadata["clean_mime_type"] = clean_mime_type or mime_type
            if storage_backend == "local":
                asset.metadata["clean_path"] = str(self.service.asset_storage.local_backend.resolve_path(clean_key))

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
                asset.metadata["thumbnail_path"] = str(self.service.asset_storage.local_backend.resolve_path(thumbnail_key))
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

