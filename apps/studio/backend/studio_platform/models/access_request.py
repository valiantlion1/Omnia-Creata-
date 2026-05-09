from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .common import utc_now


AccessRequestStatus = Literal["pending", "approved", "rejected"]


class StudioAccessRequest(BaseModel):
    id: str
    email: str
    display_name: Optional[str] = None
    username: Optional[str] = None
    auth_provider: Optional[str] = None
    auth_providers: list[str] = Field(default_factory=list)
    status: AccessRequestStatus = "pending"
    source: str = "unknown"
    request_count: int = 1
    country_code: Optional[str] = None
    referrer: Optional[str] = None
    host_label: Optional[str] = None
    ip_label: Optional[str] = None
    ip_hash: Optional[str] = None
    user_agent_hash: Optional[str] = None
    first_seen_at: datetime = Field(default_factory=utc_now)
    last_seen_at: datetime = Field(default_factory=utc_now)
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[str] = None
    operator_note: Optional[str] = None
