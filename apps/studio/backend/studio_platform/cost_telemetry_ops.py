from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterable

from .models import ChatRole, CostTelemetryEvent, StudioState

SURFACE_IMAGE_GENERATION = "image_generation"
SURFACE_CHAT_REPLY = "chat_reply"
SURFACE_PROMPT_IMPROVE = "prompt_improve"


def _coerce_cost(value: Any) -> float:
    try:
        normalized = float(value or 0.0)
    except (TypeError, ValueError):
        return 0.0
    normalized = round(normalized, 6)
    return normalized if normalized > 0 else 0.0


def _normalize_text(value: Any) -> str | None:
    normalized = str(value or "").strip()
    return normalized or None


def _utc_bounds(now: datetime, *, window_days: int) -> tuple[datetime, datetime]:
    current = now.astimezone(timezone.utc)
    end = current
    start = (current - timedelta(days=max(int(window_days), 1))).replace(microsecond=0)
    return start, end


def _utc_day_key(value: datetime) -> str:
    return value.astimezone(timezone.utc).date().isoformat()


def _surface_label(surface: str) -> str:
    mapping = {
        SURFACE_IMAGE_GENERATION: "Image generation",
        SURFACE_CHAT_REPLY: "Chat reply",
        SURFACE_PROMPT_IMPROVE: "Prompt improve",
    }
    return mapping.get(surface, surface.replace("_", " ").title())


def _event_key(surface: str, source_id: str | None) -> tuple[str, str] | None:
    normalized_source_id = _normalize_text(source_id)
    if normalized_source_id is None:
        return None
    return surface, normalized_source_id


@dataclass(slots=True)
class CostTelemetryRecord:
    provider: str
    surface: str
    amount_usd: float
    created_at: datetime
    billable: bool
    source_kind: str
    source_id: str | None = None
    identity_id: str | None = None
    provider_model: str | None = None
    studio_model: str | None = None
    metadata: dict[str, Any] | None = None

    def serialize(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "surface": self.surface,
            "surface_label": _surface_label(self.surface),
            "amount_usd": round(self.amount_usd, 6),
            "created_at": self.created_at.astimezone(timezone.utc).isoformat(),
            "billable": self.billable,
            "source_kind": self.source_kind,
            "source_id": self.source_id,
            "identity_id": self.identity_id,
            "provider_model": self.provider_model,
            "studio_model": self.studio_model,
            "metadata": dict(self.metadata or {}),
        }


def _legacy_generation_records(
    state: StudioState,
    *,
    seen_keys: set[tuple[str, str]],
) -> Iterable[CostTelemetryRecord]:
    for generation in state.generations.values():
        amount_usd = _coerce_cost(generation.actual_cost_usd)
        if amount_usd <= 0:
            continue
        source_key = _event_key(SURFACE_IMAGE_GENERATION, generation.id)
        if source_key is not None and source_key in seen_keys:
            continue
        created_at = (
            generation.completed_at
            or generation.updated_at
            or generation.created_at
        ).astimezone(timezone.utc)
        yield CostTelemetryRecord(
            provider=_normalize_text(generation.provider) or "unknown",
            surface=SURFACE_IMAGE_GENERATION,
            amount_usd=amount_usd,
            created_at=created_at,
            billable=bool(generation.provider_billable),
            source_kind=SURFACE_IMAGE_GENERATION,
            source_id=generation.id,
            identity_id=generation.identity_id,
            studio_model=_normalize_text(generation.model),
            metadata={
                "job_status": generation.status.value,
                "pricing_lane": generation.pricing_lane,
                "credit_charge_policy": generation.credit_charge_policy,
            },
        )


def _legacy_chat_records(
    state: StudioState,
    *,
    seen_keys: set[tuple[str, str]],
) -> Iterable[CostTelemetryRecord]:
    for message in state.chat_messages.values():
        if message.role != ChatRole.ASSISTANT:
            continue
        metadata = message.metadata or {}
        amount_usd = _coerce_cost(metadata.get("estimated_cost_usd"))
        if amount_usd <= 0:
            continue
        source_key = _event_key(SURFACE_CHAT_REPLY, message.id)
        if source_key is not None and source_key in seen_keys:
            continue
        yield CostTelemetryRecord(
            provider=_normalize_text(metadata.get("provider")) or "unknown",
            surface=SURFACE_CHAT_REPLY,
            amount_usd=amount_usd,
            created_at=message.created_at.astimezone(timezone.utc),
            billable=amount_usd > 0,
            source_kind=SURFACE_CHAT_REPLY,
            source_id=message.id,
            identity_id=message.identity_id,
            provider_model=_normalize_text(metadata.get("model")),
            metadata={
                "response_mode": _normalize_text(metadata.get("response_mode")),
                "mode": _normalize_text(metadata.get("mode")),
                "used_fallback": bool(metadata.get("used_fallback")),
            },
        )


def _persisted_cost_records(
    state: StudioState,
    *,
    seen_keys: set[tuple[str, str]],
) -> list[CostTelemetryRecord]:
    records: list[CostTelemetryRecord] = []
    for event in state.cost_telemetry_events.values():
        source_key = _event_key(event.surface, event.source_id)
        if source_key is not None:
            seen_keys.add(source_key)
        records.append(
            CostTelemetryRecord(
                provider=event.provider,
                surface=event.surface,
                amount_usd=event.amount_usd,
                created_at=event.created_at.astimezone(timezone.utc),
                billable=event.billable,
                source_kind=event.source_kind,
                source_id=event.source_id,
                identity_id=event.identity_id,
                provider_model=event.provider_model,
                studio_model=event.studio_model,
                metadata=dict(event.metadata or {}),
            )
        )
    return records


def list_cost_telemetry_records(
    state: StudioState,
    *,
    window_days: int | None = None,
    now: datetime | None = None,
) -> list[CostTelemetryRecord]:
    seen_keys: set[tuple[str, str]] = set()
    records = _persisted_cost_records(state, seen_keys=seen_keys)
    records.extend(_legacy_generation_records(state, seen_keys=seen_keys))
    records.extend(_legacy_chat_records(state, seen_keys=seen_keys))
    if window_days is not None:
        current = now or datetime.now(timezone.utc)
        window_start, window_end = _utc_bounds(current, window_days=window_days)
        records = [
            item
            for item in records
            if window_start <= item.created_at.astimezone(timezone.utc) <= window_end
        ]
    return sorted(records, key=lambda item: item.created_at, reverse=True)


def build_cost_telemetry_summary(
    state: StudioState,
    *,
    window_days: int,
    recent_limit: int,
    now: datetime | None = None,
) -> dict[str, Any]:
    current = now or datetime.now(timezone.utc)
    window_start, window_end = _utc_bounds(current, window_days=window_days)
    records = list_cost_telemetry_records(
        state,
        window_days=window_days,
        now=current,
    )

    provider_rollup: dict[str, dict[str, Any]] = {}
    provider_model_rollup: dict[tuple[str, str], dict[str, Any]] = {}
    studio_model_rollup: dict[str, dict[str, Any]] = {}
    surface_rollup: dict[str, dict[str, Any]] = {}
    day_rollup: dict[str, dict[str, Any]] = {}

    for record in records:
        provider_entry = provider_rollup.setdefault(
            record.provider,
            {
                "provider": record.provider,
                "total_spend_usd": 0.0,
                "event_count": 0,
                "surface_count": 0,
                "provider_model_count": 0,
                "studio_model_count": 0,
                "surfaces": set(),
                "provider_models": set(),
                "studio_models": set(),
            },
        )
        provider_entry["total_spend_usd"] += record.amount_usd
        provider_entry["event_count"] += 1
        provider_entry["surfaces"].add(record.surface)
        if record.provider_model:
            provider_entry["provider_models"].add(record.provider_model)
        if record.studio_model:
            provider_entry["studio_models"].add(record.studio_model)

        if record.provider_model:
            model_key = (record.provider, record.provider_model)
            model_entry = provider_model_rollup.setdefault(
                model_key,
                {
                    "provider": record.provider,
                    "model": record.provider_model,
                    "total_spend_usd": 0.0,
                    "event_count": 0,
                    "surfaces": set(),
                },
            )
            model_entry["total_spend_usd"] += record.amount_usd
            model_entry["event_count"] += 1
            model_entry["surfaces"].add(record.surface)

        if record.studio_model:
            studio_entry = studio_model_rollup.setdefault(
                record.studio_model,
                {
                    "model": record.studio_model,
                    "total_spend_usd": 0.0,
                    "event_count": 0,
                    "providers": set(),
                    "surfaces": set(),
                },
            )
            studio_entry["total_spend_usd"] += record.amount_usd
            studio_entry["event_count"] += 1
            studio_entry["providers"].add(record.provider)
            studio_entry["surfaces"].add(record.surface)

        surface_entry = surface_rollup.setdefault(
            record.surface,
            {
                "surface": record.surface,
                "label": _surface_label(record.surface),
                "total_spend_usd": 0.0,
                "event_count": 0,
                "providers": set(),
                "provider_models": set(),
                "studio_models": set(),
            },
        )
        surface_entry["total_spend_usd"] += record.amount_usd
        surface_entry["event_count"] += 1
        surface_entry["providers"].add(record.provider)
        if record.provider_model:
            surface_entry["provider_models"].add(record.provider_model)
        if record.studio_model:
            surface_entry["studio_models"].add(record.studio_model)

        day_key = _utc_day_key(record.created_at)
        day_entry = day_rollup.setdefault(
            day_key,
            {
                "day": day_key,
                "total_spend_usd": 0.0,
                "event_count": 0,
                "providers": set(),
                "surfaces": set(),
            },
        )
        day_entry["total_spend_usd"] += record.amount_usd
        day_entry["event_count"] += 1
        day_entry["providers"].add(record.provider)
        day_entry["surfaces"].add(record.surface)

    providers = []
    for entry in provider_rollup.values():
        providers.append(
            {
                "provider": entry["provider"],
                "total_spend_usd": round(entry["total_spend_usd"], 6),
                "event_count": entry["event_count"],
                "surfaces": sorted(entry["surfaces"]),
                "provider_models": sorted(entry["provider_models"]),
                "studio_models": sorted(entry["studio_models"]),
            }
        )

    provider_models = []
    for entry in provider_model_rollup.values():
        provider_models.append(
            {
                "provider": entry["provider"],
                "model": entry["model"],
                "total_spend_usd": round(entry["total_spend_usd"], 6),
                "event_count": entry["event_count"],
                "surfaces": sorted(entry["surfaces"]),
            }
        )

    studio_models = []
    for entry in studio_model_rollup.values():
        studio_models.append(
            {
                "model": entry["model"],
                "total_spend_usd": round(entry["total_spend_usd"], 6),
                "event_count": entry["event_count"],
                "providers": sorted(entry["providers"]),
                "surfaces": sorted(entry["surfaces"]),
            }
        )

    surfaces = []
    for entry in surface_rollup.values():
        surfaces.append(
            {
                "surface": entry["surface"],
                "label": entry["label"],
                "total_spend_usd": round(entry["total_spend_usd"], 6),
                "event_count": entry["event_count"],
                "providers": sorted(entry["providers"]),
                "provider_models": sorted(entry["provider_models"]),
                "studio_models": sorted(entry["studio_models"]),
            }
        )

    days = []
    for entry in day_rollup.values():
        days.append(
            {
                "day": entry["day"],
                "total_spend_usd": round(entry["total_spend_usd"], 6),
                "event_count": entry["event_count"],
                "providers": sorted(entry["providers"]),
                "surfaces": sorted(entry["surfaces"]),
            }
        )

    return {
        "window_days": int(window_days),
        "window_start": window_start.isoformat(),
        "window_end": window_end.isoformat(),
        "total_spend_usd": round(sum(item.amount_usd for item in records), 6),
        "event_count": len(records),
        "providers": sorted(providers, key=lambda item: (-item["total_spend_usd"], item["provider"])),
        "provider_models": sorted(
            provider_models,
            key=lambda item: (-item["total_spend_usd"], item["provider"], item["model"]),
        ),
        "studio_models": sorted(studio_models, key=lambda item: (-item["total_spend_usd"], item["model"])),
        "surfaces": sorted(surfaces, key=lambda item: (-item["total_spend_usd"], item["surface"])),
        "days": sorted(days, key=lambda item: item["day"], reverse=True),
        "recent_events": [item.serialize() for item in records[: max(int(recent_limit), 0)]],
        "coverage": {
            SURFACE_IMAGE_GENERATION: "generation_job.actual_cost_usd",
            SURFACE_CHAT_REPLY: "assistant_message.metadata.estimated_cost_usd",
            SURFACE_PROMPT_IMPROVE: "cost_telemetry_events",
        },
    }
