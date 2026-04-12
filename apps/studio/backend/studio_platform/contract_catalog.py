from __future__ import annotations

from typing import Any

from .models import JobStatus

PRODUCT_GENERATION_STATUSES: tuple[str, ...] = (
    "queued",
    "running",
    "ready",
    "failed",
    "blocked",
)

INTERNAL_GENERATION_JOB_STATUSES: tuple[str, ...] = tuple(status.value for status in JobStatus)

ASSET_TRUTH_FIELDS: tuple[str, ...] = (
    "library_state",
    "protection_state",
    "preview_url",
    "blocked_preview_url",
    "display_title",
    "derived_tags",
    "can_open",
    "can_export_clean",
)

BOOTSTRAP_FIELDS: tuple[str, ...] = (
    "draft_projects",
    "styles",
    "prompt_memory",
    "entitlements",
)


def build_contract_freeze_summary() -> dict[str, Any]:
    return {
        "generation_statuses": list(PRODUCT_GENERATION_STATUSES),
        "product_generation_statuses": list(PRODUCT_GENERATION_STATUSES),
        "internal_job_statuses": list(INTERNAL_GENERATION_JOB_STATUSES),
        "asset_truth_fields": list(ASSET_TRUTH_FIELDS),
        "bootstrap_fields": list(BOOTSTRAP_FIELDS),
        "state_vocabularies": [
            {
                "layer": "product_surface",
                "description": "Stable signed-in and library-facing state language.",
                "statuses": list(PRODUCT_GENERATION_STATUSES),
            },
            {
                "layer": "worker_runtime",
                "description": "Richer internal generation-worker lifecycle for queue, retries, and recovery.",
                "statuses": list(INTERNAL_GENERATION_JOB_STATUSES),
            },
        ],
    }
