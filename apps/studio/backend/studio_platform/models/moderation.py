from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .common import utc_now


class ModerationCaseSubject(str, Enum):
    ACCOUNT = "account"
    GENERATION = "generation"
    POST = "post"
    ASSET = "asset"


class ModerationCaseSource(str, Enum):
    GENERATION_INTAKE = "generation_intake"
    PUBLIC_REPORT = "public_report"
    APPEAL = "appeal"


class ModerationVisibilityEffect(str, Enum):
    NONE = "none"
    PRIVATE_ONLY = "private_only"
    HIDDEN_PENDING_REVIEW = "hidden_pending_review"


class ModerationCaseStatus(str, Enum):
    OPEN = "open"
    UNDER_REVIEW = "under_review"
    ACTIONED = "actioned"
    DISMISSED = "dismissed"
    RESOLVED = "resolved"


class ModerationResolution(BaseModel):
    status: ModerationCaseStatus
    note: str = ""
    resolved_by: str
    visibility_effect: ModerationVisibilityEffect = ModerationVisibilityEffect.NONE
    resolved_at: datetime = Field(default_factory=utc_now)


class ModerationCase(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    subject: ModerationCaseSubject
    source: ModerationCaseSource
    decision_tier: str = "review"
    reason_code: str
    visibility_effect: ModerationVisibilityEffect = ModerationVisibilityEffect.NONE
    status: ModerationCaseStatus = ModerationCaseStatus.OPEN
    actor_or_reporter: Optional[str] = None
    target_identity_id: Optional[str] = None
    target_generation_id: Optional[str] = None
    target_post_id: Optional[str] = None
    target_asset_id: Optional[str] = None
    linked_case_id: Optional[str] = None
    description: str = ""
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    resolution: Optional[ModerationResolution] = None


class ModerationAuditRecord(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    surface: str = "generation_prompt"
    identity_id: Optional[str] = None
    original_text: str = ""
    final_text: str = ""
    action: str = "allow"
    legacy_result: str = "safe"
    risk_level: str = "low"
    risk_score: int = 0
    reason_code: Optional[str] = None
    age_ambiguity: str = "unknown"
    sexual_intent: str = "none"
    context_type: str = "general"
    provider_moderation: str = "auto"
    rewrite_applied: bool = False
    llm_used: bool = False
    llm_model: Optional[str] = None
    explanation: str = ""
    signals: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
