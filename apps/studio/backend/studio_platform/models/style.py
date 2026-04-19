from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from .common import utc_now


class StudioStyle(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    identity_id: str
    title: str
    prompt_modifier: str
    text_mode: Literal["modifier", "prompt"] = "modifier"
    description: str = ""
    category: str = "custom"
    preview_image_url: Optional[str] = None
    negative_prompt: str = ""
    preferred_model_id: Optional[str] = None
    preferred_aspect_ratio: Optional[str] = None
    preferred_steps: Optional[int] = None
    preferred_cfg_scale: Optional[float] = None
    preferred_output_count: Optional[int] = None
    source_kind: Literal["catalog", "saved", "prompt"] = "saved"
    source_style_id: Optional[str] = None
    favorite: bool = False
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
