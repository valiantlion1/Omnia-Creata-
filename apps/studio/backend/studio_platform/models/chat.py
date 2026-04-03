from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from .common import utc_now


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


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
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    label: str
    action: str
    value: Optional[str] = None


class ChatConversation(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    workspace_id: str
    identity_id: str
    title: str = "New chat"
    model: str = "studio-assist"
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class ChatMessage(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    conversation_id: str
    identity_id: str
    role: ChatRole
    content: str
    attachments: List[ChatAttachment] = Field(default_factory=list)
    suggested_actions: List[ChatSuggestedAction] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)
