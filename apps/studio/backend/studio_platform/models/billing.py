from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from .common import utc_now
from .identity import IdentityPlan


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


class CreditLedgerEntry(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    identity_id: str
    amount: int
    entry_type: CreditEntryType
    description: str
    created_at: datetime = Field(default_factory=utc_now)
    job_id: Optional[str] = None
    checkout_kind: Optional[CheckoutKind] = None


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
