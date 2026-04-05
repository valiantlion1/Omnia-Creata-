from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from .models import (
    CreditEntryType,
    CreditLedgerEntry,
    GenerationJob,
    GenerationOutput,
    JobStatus,
    MediaAsset,
    OmniaIdentity,
    PromptSnapshot,
    PublicPost,
    StudioState,
)


RECOVERABLE_GENERATION_STATUSES = {
    JobStatus.QUEUED,
    JobStatus.RUNNING,
    JobStatus.RETRYABLE_FAILED,
}


def build_generation_title(prompt: str) -> str:
    cleaned = " ".join(prompt.strip().split())
    if not cleaned:
        return "Untitled set"

    lead = re.split(r"[.!?,:;\n]", cleaned, maxsplit=1)[0]
    words = lead.split()
    trimmed = " ".join(words[:8]).strip()
    return trimmed[:72] or "Untitled set"


def build_prompt_snapshot(
    *,
    prompt: str,
    negative_prompt: str,
    model_id: str,
    reference_asset_id: Optional[str],
    width: int,
    height: int,
    steps: int,
    cfg_scale: float,
    seed: int,
    aspect_ratio: str,
) -> PromptSnapshot:
    return PromptSnapshot(
        prompt=prompt,
        negative_prompt=negative_prompt.strip(),
        model=model_id,
        workflow="image_to_image" if reference_asset_id else "text_to_image",
        reference_asset_id=reference_asset_id,
        width=width,
        height=height,
        steps=steps,
        cfg_scale=cfg_scale,
        seed=seed,
        aspect_ratio=aspect_ratio,
    )


def create_generation_job_record(
    *,
    workspace_id: str,
    project_id: str,
    identity_id: str,
    title: str,
    model_id: str,
    prompt_snapshot: PromptSnapshot,
    estimated_cost: float,
    credit_cost: int,
    output_count: int,
    queue_priority: str,
) -> GenerationJob:
    return GenerationJob(
        workspace_id=workspace_id,
        project_id=project_id,
        identity_id=identity_id,
        title=title,
        queue_priority=queue_priority,
        model=model_id,
        prompt_snapshot=prompt_snapshot,
        estimated_cost=estimated_cost,
        credit_cost=credit_cost,
        output_count=output_count,
    )


def count_incomplete_generations(state: StudioState) -> int:
    return sum(
        1
        for job in state.generations.values()
        if job.status in RECOVERABLE_GENERATION_STATUSES
    )


def requeue_incomplete_generations_locked(
    *,
    state: StudioState,
    now: datetime,
) -> list[tuple[str, str]]:
    recoverable_jobs = [
        job
        for job in state.generations.values()
        if job.status in RECOVERABLE_GENERATION_STATUSES
    ]
    recoverable_jobs.sort(key=lambda item: item.created_at)

    job_entries: list[tuple[str, str]] = []
    for job in recoverable_jobs:
        job.status = JobStatus.QUEUED
        job.provider = "pending"
        job.error = None
        job.started_at = None
        job.last_heartbeat_at = None
        job.completed_at = None
        job.updated_at = now
        state.generations[job.id] = job
        job_entries.append((job.id, job.queue_priority))
    return job_entries


def infer_style_tags(job: GenerationJob) -> List[str]:
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


def build_generated_asset_metadata(
    *,
    job: GenerationJob,
    provider: str,
    mime_type: str,
    variation_index: int,
    variation_count: int,
    seed: Optional[int],
) -> Dict[str, Any]:
    return {
        "generation_id": job.id,
        "generation_title": job.title,
        "workflow": job.prompt_snapshot.workflow,
        "reference_asset_id": job.prompt_snapshot.reference_asset_id,
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
    }


def consume_credits_locked(identity: OmniaIdentity, amount: int) -> None:
    if identity.monthly_credits_remaining >= amount:
        identity.monthly_credits_remaining -= amount
        return
    remainder = amount - identity.monthly_credits_remaining
    identity.monthly_credits_remaining = 0
    identity.extra_credits = max(identity.extra_credits - remainder, 0)


def apply_generation_status_update(
    *,
    state: StudioState,
    job_id: str,
    status: JobStatus,
    now: datetime,
    provider: Optional[str] = None,
    error: Optional[str] = None,
) -> None:
    job = state.generations.get(job_id)
    if job is None:
        return
    normalized_status = JobStatus.coerce(status)
    previous_status = job.status
    job.status = normalized_status
    job.updated_at = now
    if provider is not None:
        job.provider = provider
    if error is not None:
        job.error = error
    if normalized_status == JobStatus.QUEUED:
        job.started_at = None
        job.last_heartbeat_at = None
        job.completed_at = None
    elif normalized_status == JobStatus.RUNNING:
        if previous_status != JobStatus.RUNNING:
            job.attempt_count += 1
            if job.started_at is None:
                job.started_at = now
        job.last_heartbeat_at = now
        job.completed_at = None
    elif normalized_status in JobStatus.terminal_statuses():
        if previous_status == JobStatus.RUNNING:
            job.last_heartbeat_at = now
        job.completed_at = now
    state.generations[job.id] = job


def apply_completed_generation_to_state(
    *,
    state: StudioState,
    job_id: str,
    provider_name: Optional[str],
    generated_outputs: list[GenerationOutput],
    created_assets: list[MediaAsset],
    style_tags: list[str],
    now: datetime,
) -> None:
    current_job = state.generations[job_id]
    current_job.status = JobStatus.SUCCEEDED
    current_job.provider = provider_name or current_job.provider
    current_job.outputs = generated_outputs
    current_job.attempt_count = max(current_job.attempt_count, 1)
    if current_job.started_at is None:
        current_job.started_at = now
    current_job.last_heartbeat_at = now
    current_job.completed_at = now
    current_job.updated_at = now
    state.generations[current_job.id] = current_job

    for asset in created_assets:
        state.assets[asset.id] = asset

    project = state.projects[current_job.project_id]
    project.last_generation_id = current_job.id
    project.cover_asset_id = created_assets[0].id if created_assets else project.cover_asset_id
    project.updated_at = now
    state.projects[project.id] = project

    identity = state.identities[current_job.identity_id]
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
        style_tags=style_tags,
        liked_by=[],
        created_at=current_job.created_at,
        updated_at=now,
    )
    consume_credits_locked(identity, current_job.credit_cost)
    identity.updated_at = now
    state.identities[identity.id] = identity
    state.credit_ledger[f"spend_{current_job.id}"] = CreditLedgerEntry(
        identity_id=identity.id,
        amount=-current_job.credit_cost,
        entry_type=CreditEntryType.GENERATION_SPEND,
        description=f"{current_job.model} image generation",
        job_id=current_job.id,
    )
