from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .common import utc_now


AccessDisplayMode = Literal["browser", "standalone", "minimal-ui", "fullscreen", "unknown"]


class StudioAccessSession(BaseModel):
    id: str
    identity_id: str
    session_id: str
    auth_provider: Optional[str] = None
    device_label: str = "Unknown device"
    browser_label: str = "Browser"
    os_label: str = "Unknown OS"
    display_mode: AccessDisplayMode = "browser"
    surface_label: str = "Browser"
    network_label: Optional[str] = None
    ip_label: Optional[str] = None
    ip_hash: Optional[str] = None
    host_label: Optional[str] = None
    user_agent_hash: Optional[str] = None
    first_seen_at: datetime = Field(default_factory=utc_now)
    last_seen_at: datetime = Field(default_factory=utc_now)
    token_issued_at: Optional[datetime] = None
    token_expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    revoked_reason: Optional[str] = None
