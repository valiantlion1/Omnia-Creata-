from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class IdentityPlan(str, Enum):
    GUEST = "guest"
    FREE = "free"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
    NONE = "none"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYABLE_FAILED = "retryable_failed"


class CreditEntryType(str, Enum):
    MONTHLY_GRANT = "monthly_grant"
    GENERATION_SPEND = "generation_spend"
    TOP_UP = "top_up"
    SUBSCRIPTION = "subscription"
    REFUND = "refund"


class CheckoutKind(str, Enum):
    PRO_MONTHLY = "pro_monthly"
    TOP_UP_SMALL = "top_up_small"
    TOP_UP_LARGE = "top_up_large"


class OmniaIdentity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: str
    display_name: str = "Creator"
    plan: IdentityPlan = IdentityPlan.FREE
    guest: bool = False
    workspace_id: str = Field(default_factory=lambda: str(uuid4()))
    subscription_status: SubscriptionStatus = SubscriptionStatus.NONE
    monthly_credits_remaining: int = 60
    monthly_credit_allowance: int = 60
    extra_credits: int = 0
    last_credit_refresh_at: datetime = Field(default_factory=utc_now)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class StudioWorkspace(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    identity_id: str
    name: str = "My Studio"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    identity_id: str
    title: str
    description: str = ""
    cover_asset_id: Optional[str] = None
    last_generation_id: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


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


class GenerationJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    project_id: str
    identity_id: str
    status: JobStatus = JobStatus.PENDING
    provider: str = "pending"
    model: str
    prompt_snapshot: PromptSnapshot
    estimated_cost: float
    credit_cost: int
    outputs: List[GenerationOutput] = Field(default_factory=list)
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    completed_at: Optional[datetime] = None


class MediaAsset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    project_id: str
    identity_id: str
    title: str
    prompt: str
    url: str
    thumbnail_url: Optional[str] = None
    local_path: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)


class CreditLedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    identity_id: str
    amount: int
    entry_type: CreditEntryType
    description: str
    created_at: datetime = Field(default_factory=utc_now)
    job_id: Optional[str] = None
    checkout_kind: Optional[CheckoutKind] = None


class ShareLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    token: str = Field(default_factory=lambda: uuid4().hex)
    identity_id: str
    project_id: Optional[str] = None
    asset_id: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    expires_at: Optional[datetime] = None


class ModelCatalogEntry(BaseModel):
    id: str
    label: str
    description: str
    min_plan: IdentityPlan
    credit_cost: int
    estimated_cost: float
    max_width: int
    max_height: int
    featured: bool = False


class PlanCatalogEntry(BaseModel):
    id: IdentityPlan
    label: str
    monthly_credits: int
    queue_priority: str
    max_resolution: str
    share_links: bool
    can_generate: bool


class StudioState(BaseModel):
    identities: Dict[str, OmniaIdentity] = Field(default_factory=dict)
    workspaces: Dict[str, StudioWorkspace] = Field(default_factory=dict)
    projects: Dict[str, Project] = Field(default_factory=dict)
    generations: Dict[str, GenerationJob] = Field(default_factory=dict)
    assets: Dict[str, MediaAsset] = Field(default_factory=dict)
    shares: Dict[str, ShareLink] = Field(default_factory=dict)
    credit_ledger: Dict[str, CreditLedgerEntry] = Field(default_factory=dict)
