from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .common import utc_now

TERMS_VERSION = "2026-04"
PRIVACY_VERSION = "2026-04"
USAGE_POLICY_VERSION = "2026-04"
MARKETING_CONSENT_VERSION = "2026-04"


class IdentityPlan(str, Enum):
    GUEST = "guest"
    FREE = "free"
    CREATOR = "creator"
    PRO = "pro"


class Visibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class SubscriptionStatus(str, Enum):
    NONE = "none"
    ACTIVE = "active"
    PAUSED = "paused"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class ManualReviewState(str, Enum):
    NONE = "none"
    REQUIRED = "required"
    APPROVED = "approved"


class OmniaIdentity(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    email: str
    display_name: str = "Creator"
    username: Optional[str] = None
    plan: IdentityPlan = IdentityPlan.FREE
    guest: bool = False
    owner_mode: bool = False
    root_admin: bool = False
    local_access: bool = False
    accepted_terms: bool = False
    accepted_terms_at: Optional[datetime] = None
    terms_version: Optional[str] = None
    accepted_privacy: bool = False
    accepted_privacy_at: Optional[datetime] = None
    privacy_version: Optional[str] = None
    accepted_usage_policy: bool = False
    accepted_usage_policy_at: Optional[datetime] = None
    usage_policy_version: Optional[str] = None
    marketing_opt_in: bool = False
    marketing_opt_in_at: Optional[datetime] = None
    marketing_consent_version: Optional[str] = None
    bio: str = ""
    avatar_url: Optional[str] = None
    profile_featured_asset_id: Optional[str] = None
    profile_featured_asset_position: str = "center"
    default_visibility: Visibility = Visibility.PRIVATE
    workspace_id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    subscription_status: SubscriptionStatus = SubscriptionStatus.NONE
    monthly_credits_remaining: int = 60
    monthly_credit_allowance: int = 60
    extra_credits: int = 0
    flag_count: int = 0
    last_flagged_at: Optional[datetime] = None
    last_flagged_reason: Optional[str] = None
    temp_block_until: Optional[datetime] = None
    manual_review_state: ManualReviewState = ManualReviewState.NONE
    last_credit_refresh_at: datetime = Field(default_factory=utc_now)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class DeletedIdentityTombstone(BaseModel):
    id: str
    identity_id: str
    email: Optional[str] = None
    deleted_at: datetime = Field(default_factory=utc_now)
