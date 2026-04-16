from __future__ import annotations

import logging
from dataclasses import dataclass, field
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

logger = logging.getLogger(__name__)


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


# ────────────────────────────────────────────────────────────────────────
# Monthly spend guardrails — stop-loss doctrine enforcement
# ────────────────────────────────────────────────────────────────────────


def _rolling_month_bounds(now: datetime) -> tuple[datetime, datetime]:
    current = now.astimezone(timezone.utc)
    start = (current - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
    return start, current


@dataclass(slots=True)
class MonthlySpendSummary:
    window_start: datetime
    window_end: datetime
    total_spend_usd: float
    image_spend_usd: float
    chat_spend_usd: float
    prompt_improve_spend_usd: float
    openai_image_spend_usd: float
    openai_total_spend_usd: float
    provider_image_spend: dict[str, float] = field(default_factory=dict)

    @property
    def openai_image_share_pct(self) -> float:
        if self.image_spend_usd <= 0:
            return 0.0
        return round((self.openai_image_spend_usd / self.image_spend_usd) * 100, 2)

    def serialize(self) -> dict[str, Any]:
        return {
            "window_start": self.window_start.isoformat(),
            "window_end": self.window_end.isoformat(),
            "total_spend_usd": round(self.total_spend_usd, 6),
            "image_spend_usd": round(self.image_spend_usd, 6),
            "chat_spend_usd": round(self.chat_spend_usd, 6),
            "openai_image_spend_usd": round(self.openai_image_spend_usd, 6),
            "openai_image_share_pct": self.openai_image_share_pct,
            "provider_image_spend": {
                k: round(v, 6) for k, v in sorted(self.provider_image_spend.items())
            },
        }


def summarize_monthly_spend(
    state: StudioState,
    *,
    now: datetime | None = None,
) -> MonthlySpendSummary:
    current = now or datetime.now(timezone.utc)
    window_start, window_end = _rolling_month_bounds(current)

    total_spend = 0.0
    image_spend = 0.0
    chat_spend = 0.0
    prompt_improve_spend = 0.0
    openai_image_spend = 0.0
    openai_total_spend = 0.0
    provider_image_spend: dict[str, float] = {}

    records = list_cost_telemetry_records(state, window_days=30, now=current)
    for record in records:
        total_spend += record.amount_usd
        if record.provider == "openai":
            openai_total_spend += record.amount_usd
        if record.surface == SURFACE_IMAGE_GENERATION:
            image_spend += record.amount_usd
            provider_image_spend[record.provider] = (
                provider_image_spend.get(record.provider, 0.0) + record.amount_usd
            )
            if record.provider == "openai":
                openai_image_spend += record.amount_usd
        elif record.surface == SURFACE_CHAT_REPLY:
            chat_spend += record.amount_usd
        elif record.surface == SURFACE_PROMPT_IMPROVE:
            prompt_improve_spend += record.amount_usd

    return MonthlySpendSummary(
        window_start=window_start,
        window_end=window_end,
        total_spend_usd=total_spend,
        image_spend_usd=image_spend,
        chat_spend_usd=chat_spend,
        prompt_improve_spend_usd=prompt_improve_spend,
        openai_image_spend_usd=openai_image_spend,
        openai_total_spend_usd=openai_total_spend,
        provider_image_spend=provider_image_spend,
    )


@dataclass(slots=True)
class MonthlyGuardrailResult:
    status: str  # "pass" | "warning" | "blocked"
    reason: str
    summary: str
    total_monthly_spend_usd: float
    monthly_soft_cap_usd: float
    monthly_hard_cap_usd: float
    openai_image_spend_usd: float
    openai_image_cap_usd: float
    openai_image_share_pct: float
    openai_share_caution_pct: float
    openai_share_block_pct: float
    blocked_providers: list[str] = field(default_factory=list)

    def serialize(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "reason": self.reason,
            "summary": self.summary,
            "total_monthly_spend_usd": round(self.total_monthly_spend_usd, 4),
            "monthly_soft_cap_usd": self.monthly_soft_cap_usd,
            "monthly_hard_cap_usd": self.monthly_hard_cap_usd,
            "openai_image_spend_usd": round(self.openai_image_spend_usd, 4),
            "openai_image_cap_usd": self.openai_image_cap_usd,
            "openai_image_share_pct": self.openai_image_share_pct,
            "blocked_providers": self.blocked_providers,
        }


def evaluate_monthly_spend_guardrail(
    settings: Settings,
    *,
    monthly_summary: MonthlySpendSummary,
    projected_cost_usd: float = 0.0,
) -> MonthlyGuardrailResult:
    if not settings.provider_spend_guardrails_enabled:
        return MonthlyGuardrailResult(
            status="pass",
            reason="guardrails_disabled",
            summary="Monthly spend guardrails are disabled.",
            total_monthly_spend_usd=monthly_summary.total_spend_usd,
            monthly_soft_cap_usd=settings.monthly_ai_spend_soft_cap_usd,
            monthly_hard_cap_usd=settings.monthly_ai_spend_hard_cap_usd,
            openai_image_spend_usd=monthly_summary.openai_image_spend_usd,
            openai_image_cap_usd=settings.openai_monthly_image_cap_usd,
            openai_image_share_pct=monthly_summary.openai_image_share_pct,
            openai_share_caution_pct=settings.openai_image_share_caution_pct,
            openai_share_block_pct=settings.openai_image_share_block_pct,
        )

    projected_total = monthly_summary.total_spend_usd + _coerce_cost(projected_cost_usd)
    blocked_providers: list[str] = []
    status = "pass"
    reason = "within_caps"
    summary = ""

    # Rule 1+2: Monthly total hard/soft cap
    hard_cap = settings.monthly_ai_spend_hard_cap_usd
    soft_cap = settings.monthly_ai_spend_soft_cap_usd
    if projected_total >= hard_cap:
        status = "blocked"
        reason = "monthly_hard_cap_exceeded"
        summary = (
            f"Monthly AI spend ${projected_total:.2f} has reached the hard cap of "
            f"${hard_cap:.2f}. All billable generation is blocked until the window resets."
        )
        logger.warning("monthly_spend_hard_cap_exceeded total=%.4f cap=%.2f", projected_total, hard_cap)
        return MonthlyGuardrailResult(
            status=status,
            reason=reason,
            summary=summary,
            total_monthly_spend_usd=projected_total,
            monthly_soft_cap_usd=soft_cap,
            monthly_hard_cap_usd=hard_cap,
            openai_image_spend_usd=monthly_summary.openai_image_spend_usd,
            openai_image_cap_usd=settings.openai_monthly_image_cap_usd,
            openai_image_share_pct=monthly_summary.openai_image_share_pct,
            openai_share_caution_pct=settings.openai_image_share_caution_pct,
            openai_share_block_pct=settings.openai_image_share_block_pct,
            blocked_providers=blocked_providers,
        )

    if projected_total >= soft_cap:
        status = "warning"
        reason = "monthly_soft_cap_exceeded"
        summary = (
            f"Monthly AI spend ${projected_total:.2f} has exceeded the soft cap of "
            f"${soft_cap:.2f}. Hard cap is ${hard_cap:.2f}."
        )
        logger.warning("monthly_spend_soft_cap_exceeded total=%.4f cap=%.2f", projected_total, soft_cap)

    # Rule 3: OpenAI monthly image sub-cap
    openai_image_cap = settings.openai_monthly_image_cap_usd
    if monthly_summary.openai_image_spend_usd >= openai_image_cap:
        blocked_providers.append("openai")
        if status != "blocked":
            status = "warning"
        reason = reason or "openai_image_cap_exceeded"
        cap_msg = (
            f"OpenAI image spend ${monthly_summary.openai_image_spend_usd:.2f} has "
            f"reached the monthly sub-cap of ${openai_image_cap:.2f}."
        )
        summary = f"{summary} {cap_msg}".strip() if summary else cap_msg
        logger.warning(
            "openai_monthly_image_cap_exceeded spend=%.4f cap=%.2f",
            monthly_summary.openai_image_spend_usd, openai_image_cap,
        )

    # Rules 4+5: OpenAI image share percentage
    share_pct = monthly_summary.openai_image_share_pct
    block_pct = settings.openai_image_share_block_pct
    caution_pct = settings.openai_image_share_caution_pct
    if share_pct >= block_pct and "openai" not in blocked_providers:
        blocked_providers.append("openai")
        if status != "blocked":
            status = "warning"
        share_msg = (
            f"OpenAI image share {share_pct:.1f}% exceeds block threshold of {block_pct:.0f}%. "
            f"OpenAI image routes are suspended."
        )
        summary = f"{summary} {share_msg}".strip() if summary else share_msg
        logger.warning("openai_image_share_block pct=%.1f threshold=%.0f", share_pct, block_pct)
    elif share_pct >= caution_pct:
        if status == "pass":
            status = "warning"
        share_msg = f"OpenAI image share {share_pct:.1f}% exceeds caution threshold of {caution_pct:.0f}%."
        summary = f"{summary} {share_msg}".strip() if summary else share_msg
        logger.warning("openai_image_share_caution pct=%.1f threshold=%.0f", share_pct, caution_pct)

    if not summary:
        summary = f"Monthly AI spend ${projected_total:.2f} is within caps."

    return MonthlyGuardrailResult(
        status=status,
        reason=reason,
        summary=summary,
        total_monthly_spend_usd=projected_total,
        monthly_soft_cap_usd=soft_cap,
        monthly_hard_cap_usd=hard_cap,
        openai_image_spend_usd=monthly_summary.openai_image_spend_usd,
        openai_image_cap_usd=openai_image_cap,
        openai_image_share_pct=share_pct,
        openai_share_caution_pct=caution_pct,
        openai_share_block_pct=block_pct,
        blocked_providers=blocked_providers,
    )
