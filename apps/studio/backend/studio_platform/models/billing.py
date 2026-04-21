from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .common import utc_now
from .identity import IdentityPlan


class CreditEntryType(str, Enum):
    MONTHLY_GRANT = "monthly_grant"
    GENERATION_RESERVE = "generation_reserve"
    GENERATION_SPEND = "generation_spend"
    GENERATION_RELEASE = "generation_release"
    TOP_UP = "top_up"
    SUBSCRIPTION = "subscription"
    REFUND = "refund"


class CheckoutKind(str, Enum):
    CREATOR_MONTHLY = "creator_monthly"
    PRO_MONTHLY = "pro_monthly"
    CREDIT_PACK_SMALL = "credit_pack_small"
    CREDIT_PACK_LARGE = "credit_pack_large"

    @classmethod
    def _missing_(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            legacy_map = {
                "starter_monthly": cls.CREATOR_MONTHLY,
                "top_up_small": cls.CREDIT_PACK_SMALL,
                "top_up_large": cls.CREDIT_PACK_LARGE,
            }
            return legacy_map.get(normalized)
        return None


class CreditLedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    identity_id: str
    amount: int
    entry_type: CreditEntryType
    description: str
    created_at: datetime = Field(default_factory=utc_now)
    job_id: Optional[str] = None
    checkout_kind: Optional[CheckoutKind] = None
    hold_amount: Optional[int] = None
    final_credit_cost: Optional[int] = None
    job_credit_status: Optional[str] = None
    provider_name: Optional[str] = None
    provider_cost_usd: Optional[float] = None
    credit_charge_policy: Optional[str] = None


class BillingWebhookReceipt(BaseModel):
    id: str
    provider: str = "paddle"
    event_name: str
    resource_type: str
    resource_id: str
    identity_id: Optional[str] = None
    checkout_kind: Optional[CheckoutKind] = None
    processed_at: datetime = Field(default_factory=utc_now)


class CreativeProfileEntry(BaseModel):
    id: str
    label: str
    badge: str
    description: str
    default_lane: str


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
    creative_profile: Optional[CreativeProfileEntry] = None
    source_id: Optional[str] = None
    source_path: Optional[str] = Field(default=None, exclude=True, repr=False)
    license_reference: Optional[str] = None


class PlanCatalogEntry(BaseModel):
    id: IdentityPlan
    label: str
    monthly_credits: int
    queue_priority: str
    max_incomplete_generations: int = 0
    generation_submit_window_seconds: int = 60
    generation_submit_limit: int = 0
    can_access_chat: bool = False
    premium_chat: bool = False
    chat_modes: list[str] = Field(default_factory=list)
    chat_message_limit: int = 0
    max_chat_attachments: int = 0
    clean_exports: bool = False
    share_links: bool
    can_generate: bool
