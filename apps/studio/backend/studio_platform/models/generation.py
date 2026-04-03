from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .common import utc_now


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYABLE_FAILED = "retryable_failed"


class PromptSnapshot(BaseModel):
    prompt: str
    negative_prompt: str = ""
    model: str
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
    status: JobStatus = JobStatus.PENDING
    provider: str = "pending"
    model: str
    prompt_snapshot: PromptSnapshot
    estimated_cost: float
    credit_cost: int
    output_count: int = 1
    outputs: List[GenerationOutput] = Field(default_factory=list)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: Optional[datetime] = None
