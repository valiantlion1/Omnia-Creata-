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
