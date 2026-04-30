from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from .common import utc_now


class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    RETRYABLE_FAILED = "retryable_failed"
    CANCELLED = "cancelled"
    TIMED_OUT = "timed_out"

    # Legacy aliases kept during the transition to the durable lifecycle names.
    PENDING = "queued"
    PROCESSING = "running"
    COMPLETED = "succeeded"

    @classmethod
    def coerce(cls, value: object) -> "JobStatus":
        if isinstance(value, cls):
            return value

        normalized = str(value or "").strip().lower()
        mapping = {
            "pending": cls.QUEUED,
            "queued": cls.QUEUED,
            "processing": cls.RUNNING,
            "running": cls.RUNNING,
            "completed": cls.SUCCEEDED,
            "succeeded": cls.SUCCEEDED,
            "failed": cls.FAILED,
            "retryable_failed": cls.RETRYABLE_FAILED,
            "cancelled": cls.CANCELLED,
            "timed_out": cls.TIMED_OUT,
        }
        if normalized not in mapping:
            raise ValueError(f"Unsupported job status: {value}")
        return mapping[normalized]

    @classmethod
    def terminal_statuses(cls) -> set["JobStatus"]:
        return {
            cls.SUCCEEDED,
            cls.FAILED,
            cls.RETRYABLE_FAILED,
            cls.CANCELLED,
            cls.TIMED_OUT,
        }


class PromptSnapshot(BaseModel):
    prompt: str
    negative_prompt: str = ""
    source_prompt: Optional[str] = None
    source_negative_prompt: Optional[str] = None
    model: str
    workflow: str = "text_to_image"
    reference_asset_id: Optional[str] = None
    width: int
    height: int
    steps: int
    cfg_scale: float
    seed: int
    aspect_ratio: str


class GenerationOutput(BaseModel):
    asset_id: str
    url: str
    thumbnail_url: Optional[str] = None
    mime_type: str = "image/png"
    width: int
    height: int
    variation_index: int = 0


class GenerationJob(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    workspace_id: str
    project_id: str
    identity_id: str
    title: str = "Untitled set"
    status: JobStatus = JobStatus.QUEUED
    provider: str = "pending"
    queue_priority: str = "standard"
    model: str
    prompt_snapshot: PromptSnapshot
    estimated_cost: float
    estimated_cost_source: str = "catalog_fallback"
    pricing_lane: Optional[str] = None
    actual_cost_usd: Optional[float] = None
    credit_cost: int
    reserved_credit_cost: int = 0
    final_credit_cost: Optional[int] = None
    credit_charge_policy: str = "none"
    credit_status: str = "none"
    provider_rollout_tier: Optional[str] = None
    provider_billable: Optional[bool] = None
    requested_quality_tier: str = "standard"
    selected_quality_tier: str = "standard"
    degraded: bool = False
    routing_strategy: str = "free-first"
    routing_reason: str = "free_standard_default"
    prompt_profile: str = "generic"
    moderation_tier: str = "auto"
    moderation_reason: Optional[str] = None
    moderation_action: str = "allow"
    moderation_risk_level: str = "low"
    moderation_risk_score: int = 0
    moderation_age_ambiguity: str = "unknown"
    moderation_sexual_intent: str = "none"
    moderation_context_type: str = "general"
    moderation_audit_id: Optional[str] = None
    moderation_rewrite_applied: bool = False
    moderation_rewritten_prompt: Optional[str] = None
    moderation_llm_used: bool = False
    provider_candidates: List[str] = Field(default_factory=list)
    output_count: int = 1
    outputs: List[GenerationOutput] = Field(default_factory=list)
    # Origin chat context — set when this generation was kicked off from a
    # chat assistant message (the user said "create me X" inside a chat
    # thread). After the job completes, the chat message's attachments are
    # updated in place so the conversation shows the rendered image inline.
    # When the generation comes from the standalone Create surface, both
    # fields stay None.
    origin_chat_message_id: Optional[str] = None
    origin_conversation_id: Optional[str] = None
    error: Optional[str] = None
    error_code: Optional[str] = None
    attempt_count: int = 0
    claimed_by: Optional[str] = None
    claim_token: Optional[str] = None
    claim_expires_at: Optional[datetime] = None
    last_claim_heartbeat_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    started_at: Optional[datetime] = None
    last_heartbeat_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, value: object) -> JobStatus:
        return JobStatus.coerce(value)
