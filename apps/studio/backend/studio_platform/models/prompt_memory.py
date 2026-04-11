from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from .common import utc_now


class PromptMemoryProfile(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    identity_id: str
    topic_tags: List[str] = Field(default_factory=list)
    aesthetic_tags: List[str] = Field(default_factory=list)
    repeated_phrases: List[str] = Field(default_factory=list)
    preferred_model_ids: List[str] = Field(default_factory=list)
    preferred_aspect_ratios: List[str] = Field(default_factory=list)
    negative_prompt_terms: List[str] = Field(default_factory=list)
    tone: str = "neutral"
    generation_count: int = 0
    improve_count: int = 0
    flagged_generation_count: int = 0
    hourly_burst_peak: int = 0
    governance_hints: List[str] = Field(default_factory=list)
    recent_prompt_examples: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
