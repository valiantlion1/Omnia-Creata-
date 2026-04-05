from __future__ import annotations

from datetime import datetime

from .models import GenerationJob, JobStatus, PromptSnapshot, StudioState


INCOMPLETE_GENERATION_STATUSES = {
    JobStatus.QUEUED,
    JobStatus.RUNNING,
    JobStatus.RETRYABLE_FAILED,
}


def count_incomplete_generations_for_identity(state: StudioState, identity_id: str) -> int:
    return sum(
        1
        for job in state.generations.values()
        if job.identity_id == identity_id and job.status in INCOMPLETE_GENERATION_STATUSES
    )


def count_recent_generation_requests_for_identity(
    *,
    state: StudioState,
    identity_id: str,
    since: datetime,
) -> int:
    return sum(
        1
        for job in state.generations.values()
        if job.identity_id == identity_id and job.created_at >= since
    )


def has_duplicate_incomplete_generation(
    *,
    state: StudioState,
    identity_id: str,
    project_id: str,
    model_id: str,
    prompt_snapshot: PromptSnapshot,
) -> bool:
    normalized_prompt = _normalize_prompt(prompt_snapshot.prompt)
    normalized_negative = _normalize_prompt(prompt_snapshot.negative_prompt)

    for job in state.generations.values():
        if job.identity_id != identity_id or job.project_id != project_id:
            continue
        if job.status not in INCOMPLETE_GENERATION_STATUSES:
            continue
        if job.model != model_id:
            continue

        current_snapshot = job.prompt_snapshot
        if (
            current_snapshot.workflow == prompt_snapshot.workflow
            and current_snapshot.width == prompt_snapshot.width
            and current_snapshot.height == prompt_snapshot.height
            and current_snapshot.reference_asset_id == prompt_snapshot.reference_asset_id
            and _normalize_prompt(current_snapshot.prompt) == normalized_prompt
            and _normalize_prompt(current_snapshot.negative_prompt) == normalized_negative
        ):
            return True

    return False


def _normalize_prompt(value: str) -> str:
    return " ".join(value.strip().lower().split())
