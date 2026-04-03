from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .common import utc_now


class StudioWorkspace(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    identity_id: str
    name: str = "My Studio"
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Project(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    workspace_id: str
    identity_id: str
    title: str
    description: str = ""
    cover_asset_id: Optional[str] = None
    last_generation_id: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
