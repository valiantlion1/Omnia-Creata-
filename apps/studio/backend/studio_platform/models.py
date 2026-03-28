from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class IdentityPlan(str, Enum):
    GUEST = "guest"
    FREE = "free"
    PRO = "pro"


class Visibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


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


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class OmniaIdentity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    email: str
    display_name: str = "Creator"
    username: Optional[str] = None
    plan: IdentityPlan = IdentityPlan.FREE
    guest: bool = False
    owner_mode: bool = False
    root_admin: bool = False
    local_access: bool = False
    accepted_terms: bool = False
    accepted_privacy: bool = False
    accepted_usage_policy: bool = False
    marketing_opt_in: bool = False
    bio: str = ""
    avatar_url: Optional[str] = None
    default_visibility: Visibility = Visibility.PUBLIC
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


class ChatAttachment(BaseModel):
    kind: str = "image"
    url: str
    asset_id: Optional[str] = None
    label: str = Field(default="", max_length=120)

    @field_validator("kind")
    @classmethod
    def validate_kind(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"image", "file"}:
            raise ValueError("Unsupported attachment kind")
        return normalized

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        url = value.strip()
        allowed_prefixes = ("data:", "https://", "http://", "/v1/assets/")
        if not url.startswith(allowed_prefixes):
            raise ValueError("Unsupported attachment URL")
        if len(url) > 5_000_000:
            raise ValueError("Attachment payload is too large")
        return url


class ChatSuggestedAction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    label: str
    action: str
    value: Optional[str] = None


class ChatConversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    identity_id: str
    title: str = "New chat"
    model: str = "studio-assist"
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    identity_id: str
    role: ChatRole
    content: str
    attachments: List[ChatAttachment] = Field(default_factory=list)
    suggested_actions: List[ChatSuggestedAction] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


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
    id: str = Field(default_factory=lambda: str(uuid4()))
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


class MediaAsset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    workspace_id: str
    project_id: str
    identity_id: str
    title: str
    prompt: str
    url: str
    thumbnail_url: Optional[str] = None
    local_path: str = Field(default="", repr=False)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)
    deleted_at: Optional[datetime] = None


class PublicPost(BaseModel):
    id: str
    workspace_id: str
    project_id: str
    identity_id: str
    owner_username: str
    owner_display_name: str
    title: str
    prompt: str
    cover_asset_id: Optional[str] = None
    asset_ids: List[str] = Field(default_factory=list)
    visibility: Visibility = Visibility.PUBLIC
    style_tags: List[str] = Field(default_factory=list)
    liked_by: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


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
    runtime: str = "cloud"
    owner_only: bool = False
    provider_hint: Optional[str] = None
    source_id: Optional[str] = None
    source_path: Optional[str] = Field(default=None, exclude=True, repr=False)
    license_reference: Optional[str] = None


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
    conversations: Dict[str, ChatConversation] = Field(default_factory=dict)
    chat_messages: Dict[str, ChatMessage] = Field(default_factory=dict)
    generations: Dict[str, GenerationJob] = Field(default_factory=dict)
    assets: Dict[str, MediaAsset] = Field(default_factory=dict)
    posts: Dict[str, PublicPost] = Field(default_factory=dict)
    shares: Dict[str, ShareLink] = Field(default_factory=dict)
    credit_ledger: Dict[str, CreditLedgerEntry] = Field(default_factory=dict)
