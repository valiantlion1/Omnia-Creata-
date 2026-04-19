from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .common import utc_now


class StudioLoginAttemptRecord(BaseModel):
    id: str
    failed_attempts: list[datetime] = Field(default_factory=list)
    last_failure_at: Optional[datetime] = Field(default_factory=utc_now)
