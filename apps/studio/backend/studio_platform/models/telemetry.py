from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field, field_validator

from .common import utc_now


class CostTelemetryEvent(BaseModel):
    id: str = Field(default_factory=lambda: __import__("uuid").uuid4().__str__())
    source_kind: str
    source_id: Optional[str] = None
    identity_id: Optional[str] = None
    provider: str
    surface: str
    amount_usd: float
    provider_model: Optional[str] = None
    studio_model: Optional[str] = None
    billable: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=utc_now)

    @field_validator("source_kind", "provider", "surface")
    @classmethod
    def validate_required_strings(cls, value: str) -> str:
        normalized = str(value or "").strip().lower()
        if not normalized:
            raise ValueError("Telemetry string fields cannot be empty")
        return normalized

    @field_validator("provider_model", "studio_model", "identity_id", "source_id")
    @classmethod
    def normalize_optional_strings(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("amount_usd")
    @classmethod
    def validate_amount(cls, value: float) -> float:
        normalized = round(float(value or 0.0), 6)
        if normalized < 0:
            raise ValueError("Telemetry amount cannot be negative")
        return normalized
