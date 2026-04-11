from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class StudioPersona(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    identity_id: str
    name: str
    description: str = ""
    system_prompt: str
    avatar_url: Optional[str] = None
    is_default: bool = False
    created_at: datetime
    updated_at: datetime
