from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from config.env import Environment, Settings

from .cost_telemetry_ops import (
    SURFACE_CHAT_REPLY,
    SURFACE_IMAGE_GENERATION,
    SURFACE_PROMPT_IMPROVE,
    list_cost_telemetry_records,
)
from .models import StudioState


def _utc_day_bounds(now: datetime) -> tuple[datetime, datetime]:
    current = now.astimezone(timezone.utc)
    start = current.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def _coerce_cost(value: Any) -> float:
    try:
        normalized = float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0
    return normalized if normalized > 0 else 0.0


@dataclass(slots=True)
class ProviderDailySpendSummary:
    provider: str
    window_start: datetime
    window_end: datetime
    generation_spend_usd: float
    chat_spend_usd: float
    prompt_improve_spend_usd: float
    generation_count: int
    chat_count: int
    prompt_improve_count: int

    @property
    def total_spend_usd(self) -> float:
        return self.generation_spend_usd + self.chat_spend_usd + self.prompt_improve_spend_usd

    def serialize(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "window_start": self.window_start.isoformat(),
            "window_end": self.window_end.isoformat(),
            "generation_spend_usd": round(self.generation_spend_usd, 6),
            "chat_spend_usd": round(self.chat_spend_usd, 6),
            "prompt_improve_spend_usd": round(self.prompt_improve_spend_usd, 6),
            "total_spend_usd": round(self.total_spend_usd, 6),
            "generation_count": self.generation_count,
            "chat_count": self.chat_count,
            "prompt_improve_count": self.prompt_improve_count,
        }


@dataclass(slots=True)
class ProviderSpendGuardrailStatus:
    provider: str
    billable: bool
    enabled: bool
    status: str
    reason: str
    summary: str
    current_daily_spend_usd: float
    projected_daily_spend_usd: float
    projected_increment_usd: float
    soft_cap_usd: float | None
    hard_cap_usd: float | None
    emergency_disabled: bool
    window_start: datetime
    window_end: datetime
    generation_spend_usd: float
    chat_spend_usd: float
    prompt_improve_spend_usd: float
    generation_count: int
    chat_count: int
    prompt_improve_count: int

    def serialize(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "billable": self.billable,
            "enabled": self.enabled,
            "status": self.status,
            "reason": self.reason,
            "summary": self.summary,
            "current_daily_spend_usd": round(self.current_daily_spend_usd, 6),
            "projected_daily_spend_usd": round(self.projected_daily_spend_usd, 6),
            "projected_increment_usd": round(self.projected_increment_usd, 6),
            "daily_soft_cap_usd": self.soft_cap_usd,
            "daily_hard_cap_usd": self.hard_cap_usd,
            "emergency_disabled": self.emergency_disabled,
            "window_start": self.window_start.isoformat(),
            "window_end": self.window_end.isoformat(),
            "generation_spend_usd": round(self.generation_spend_usd, 6),
            "chat_spend_usd": round(self.chat_spend_usd, 6),
            "prompt_improve_spend_usd": round(self.prompt_improve_spend_usd, 6),
            "generation_count": self.generation_count,
            "chat_count": self.chat_count,
            "prompt_improve_count": self.prompt_improve_count,
        }


def summarize_provider_daily_spend(
    state: StudioState,
    *,
    provider_name: str,
    now: datetime | None = None,
) -> ProviderDailySpendSummary:
    normalized_provider = str(provider_name or "").strip().lower()
    current = now or datetime.now(timezone.utc)
    window_start, window_end = _utc_day_bounds(current)
    generation_spend_usd = 0.0
    chat_spend_usd = 0.0
    prompt_improve_spend_usd = 0.0
    generation_count = 0
    chat_count = 0
    prompt_improve_count = 0

    records = list_cost_telemetry_records(state, now=current, window_days=1)
    for record in records:
        if record.provider != normalized_provider:
            continue
        recorded_at = record.created_at.astimezone(timezone.utc)
        if not (window_start <= recorded_at <= window_end):
            continue
        if record.surface == SURFACE_IMAGE_GENERATION:
            generation_spend_usd += record.amount_usd
            generation_count += 1
        elif record.surface == SURFACE_CHAT_REPLY:
            chat_spend_usd += record.amount_usd
            chat_count += 1
        elif record.surface == SURFACE_PROMPT_IMPROVE:
            prompt_improve_spend_usd += record.amount_usd
            prompt_improve_count += 1

    return ProviderDailySpendSummary(
        provider=normalized_provider,
        window_start=window_start,
        window_end=window_end,
        generation_spend_usd=generation_spend_usd,
        chat_spend_usd=chat_spend_usd,
        prompt_improve_spend_usd=prompt_improve_spend_usd,
        generation_count=generation_count,
        chat_count=chat_count,
        prompt_improve_count=prompt_improve_count,
    )


def resolve_provider_daily_caps(
    settings: Settings,
    *,
    provider_name: str,
    provider_billable: bool,
) -> tuple[float | None, float | None]:
    if not provider_billable:
        return None, None

    normalized_provider = str(provider_name or "").strip().lower()

    generic_soft = settings.billable_provider_daily_soft_cap_usd
    generic_hard = settings.billable_provider_daily_hard_cap_usd
    if settings.environment == Environment.DEVELOPMENT:
        generic_soft = (
            generic_soft
            if generic_soft is not None
            else settings.development_billable_provider_daily_soft_cap_usd
        )
        generic_hard = (
            generic_hard
            if generic_hard is not None
            else settings.development_billable_provider_daily_hard_cap_usd
        )

    provider_soft = getattr(settings, f"{normalized_provider}_daily_soft_cap_usd", None)
    provider_hard = getattr(settings, f"{normalized_provider}_daily_hard_cap_usd", None)

    soft_cap = provider_soft if provider_soft is not None else generic_soft
    hard_cap = provider_hard if provider_hard is not None else generic_hard
    if soft_cap is not None:
        soft_cap = float(soft_cap)
    if hard_cap is not None:
        hard_cap = float(hard_cap)
    if soft_cap is not None and hard_cap is not None and hard_cap < soft_cap:
        hard_cap = soft_cap
    return soft_cap, hard_cap


def evaluate_provider_spend_guardrail(
    settings: Settings,
    *,
    provider_name: str,
    provider_billable: bool,
    spend_summary: ProviderDailySpendSummary,
    projected_cost_usd: float = 0.0,
) -> ProviderSpendGuardrailStatus:
    normalized_provider = str(provider_name or "").strip().lower()
    projected_increment_usd = _coerce_cost(projected_cost_usd)
    current_daily_spend_usd = round(spend_summary.total_spend_usd, 6)
    projected_daily_spend_usd = round(current_daily_spend_usd + projected_increment_usd, 6)
    emergency_disabled = normalized_provider in settings.provider_spend_emergency_disabled_list
    soft_cap, hard_cap = resolve_provider_daily_caps(
        settings,
        provider_name=normalized_provider,
        provider_billable=provider_billable,
    )

    if not settings.provider_spend_guardrails_enabled:
        status = "pass"
        reason = "guardrails_disabled"
        summary = f"Provider spend guardrails are disabled for {normalized_provider}."
    elif not provider_billable:
        status = "pass"
        reason = "not_billable"
        summary = f"{normalized_provider} is not a billable provider, so spend caps do not apply."
    elif emergency_disabled:
        status = "blocked"
        reason = "emergency_disabled"
        summary = f"{normalized_provider} is emergency-disabled for billable traffic."
    elif hard_cap is not None and (
        current_daily_spend_usd >= hard_cap or projected_daily_spend_usd > hard_cap
    ):
        status = "blocked"
        reason = "hard_cap_exceeded"
        summary = (
            f"{normalized_provider} daily projected spend ${projected_daily_spend_usd:.4f} "
            f"would exceed the hard cap of ${hard_cap:.4f}."
        )
    elif soft_cap is not None and (
        current_daily_spend_usd >= soft_cap or projected_daily_spend_usd > soft_cap
    ):
        status = "warning"
        reason = "soft_cap_exceeded"
        summary = (
            f"{normalized_provider} daily projected spend ${projected_daily_spend_usd:.4f} "
            f"is above the soft cap of ${soft_cap:.4f}."
        )
    else:
        status = "pass"
        reason = "within_cap"
        if hard_cap is not None:
            summary = (
                f"{normalized_provider} daily projected spend ${projected_daily_spend_usd:.4f} "
                f"remains under the hard cap of ${hard_cap:.4f}."
            )
        else:
            summary = f"{normalized_provider} has no active hard cap block."

    return ProviderSpendGuardrailStatus(
        provider=normalized_provider,
        billable=bool(provider_billable),
        enabled=bool(settings.provider_spend_guardrails_enabled),
        status=status,
        reason=reason,
        summary=summary,
        current_daily_spend_usd=current_daily_spend_usd,
        projected_daily_spend_usd=projected_daily_spend_usd,
        projected_increment_usd=projected_increment_usd,
        soft_cap_usd=soft_cap,
        hard_cap_usd=hard_cap,
        emergency_disabled=emergency_disabled,
        window_start=spend_summary.window_start,
        window_end=spend_summary.window_end,
        generation_spend_usd=spend_summary.generation_spend_usd,
        chat_spend_usd=spend_summary.chat_spend_usd,
        prompt_improve_spend_usd=spend_summary.prompt_improve_spend_usd,
        generation_count=spend_summary.generation_count,
        chat_count=spend_summary.chat_count,
        prompt_improve_count=spend_summary.prompt_improve_count,
    )
