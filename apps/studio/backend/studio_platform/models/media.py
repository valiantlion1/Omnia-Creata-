from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from .common import utc_now
from .identity import Visibility
from .moderation import ModerationVisibilityEffect


class MediaAsset(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
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
    moderation_tier: str = "auto"
    moderation_reason: Optional[str] = None
    visibility_effect: ModerationVisibilityEffect = ModerationVisibilityEffect.NONE
    moderation_case_ids: List[str] = Field(default_factory=list)
    style_tags: List[str] = Field(default_factory=list)
    liked_by: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ShareLink(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    token: str = Field(default_factory=lambda: __import__("uuid").uuid4().hex)
    identity_id: str
    project_id: Optional[str] = None
    asset_id: Optional[str] = None
    token_hash: Optional[str] = None
    token_preview: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
