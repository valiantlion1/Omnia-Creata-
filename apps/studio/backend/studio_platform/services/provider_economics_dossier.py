from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from config.env import Settings

from ..ai_provider_catalog import lookup_chat_model_pricing, lookup_openai_image_output_price
from ..billing_ops import BillingStateSnapshot
from ..generation_credit_forecast_ops import build_generation_credit_forecasts
from ..model_catalog_ops import list_model_catalog_entries
from ..models import IdentityPlan
from ..providers import OpenAIImageProvider, ProviderCircuitState, ProviderRegistry
from ..versioning import load_version_info

_OPENAI_PRICING_URL = "https://openai.com/api/pricing/"
_CANONICAL_IMAGE_SIZES = ("1024x1024", "1024x1536", "1536x1024")
_CANONICAL_IMAGE_QUALITIES = ("low", "medium", "high")


def provider_economics_dossier_report_path(settings: Settings) -> Path:
    return (settings.runtime_root_path / "reports" / "provider-economics-latest.json").resolve()


def persist_provider_economics_dossier(
    settings: Settings,
    *,
    public_plan_payload: Mapping[str, Any] | None,
) -> dict[str, Any]:
    payload = build_provider_economics_dossier(
        settings=settings,
        public_plan_payload=public_plan_payload,
    )
    report_path = provider_economics_dossier_report_path(settings)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(payload, indent=2, ensure_ascii=True), encoding="utf-8")
    payload["path"] = str(report_path)
    return payload


def load_provider_economics_dossier(settings: Settings) -> dict[str, Any] | None:
    report_path = provider_economics_dossier_report_path(settings)
    if not report_path.exists():
        return None
    try:
        payload = json.loads(report_path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    payload["path"] = str(report_path)
    return payload


def build_provider_economics_dossier(
    *,
    settings: Settings,
    public_plan_payload: Mapping[str, Any] | None,
) -> dict[str, Any]:
    version = load_version_info()
    plan_payload = dict(public_plan_payload or {})
    package_assumptions = _build_package_assumptions(plan_payload)
    starter_plan = next((item for item in package_assumptions if item.get("id") == "starter"), None)
    pro_plan = next((item for item in package_assumptions if item.get("id") == "pro"), None)

    starter_forecasts = _build_plan_forecasts(
        settings=settings,
        identity_plan=IdentityPlan.FREE,
        available_to_spend=int(starter_plan.get("credits") or 0) if isinstance(starter_plan, dict) else 0,
    )
    pro_forecasts = _build_plan_forecasts(
        settings=settings,
        identity_plan=IdentityPlan.PRO,
        available_to_spend=int(pro_plan.get("credits") or 0) if isinstance(pro_plan, dict) else 0,
    )
    lane_credit_impact = {
        "starter": starter_forecasts,
        "pro": pro_forecasts,
    }
    package_capacity_summary = _build_package_capacity_summary(
        package_assumptions=package_assumptions,
        starter_forecasts=starter_forecasts,
        pro_forecasts=pro_forecasts,
    )

    chat_lane_cost_basis = {
        "standard": _sanitize_chat_pricing(lookup_chat_model_pricing(settings.openai_model)),
        "premium": _sanitize_chat_pricing(lookup_chat_model_pricing(settings.openai_premium_model)),
    }
    image_lane_cost_basis = {
        "draft": _build_image_lane_cost_basis(model=settings.openai_image_draft_model),
        "final": _build_image_lane_cost_basis(model=settings.openai_image_model),
    }

    founder_signoff = {
        "recorded": bool(getattr(settings, "public_paid_provider_economics_ready", False)),
        "build": str(getattr(settings, "public_paid_provider_economics_ready_build", "") or "").strip() or None,
        "note": str(getattr(settings, "public_paid_provider_economics_ready_note", "") or "").strip() or None,
    }

    complete = bool(
        package_assumptions
        and chat_lane_cost_basis["standard"] is not None
        and chat_lane_cost_basis["premium"] is not None
        and image_lane_cost_basis["draft"]["reference_model"]
        and image_lane_cost_basis["final"]["reference_model"]
        and lane_credit_impact["starter"]["models"]
        and lane_credit_impact["pro"]["models"]
        and package_capacity_summary
    )

    summary = (
        "Current-build OpenAI-first economics dossier is complete and ready for founder signoff."
        if complete
        else "Current-build OpenAI-first economics dossier is incomplete."
    )
    safe_risky = {
        "starter": _summarize_safe_and_risky(starter_forecasts),
        "pro": _summarize_safe_and_risky(pro_forecasts),
    }

    return {
        "report_kind": "provider_economics_dossier",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "version": version.version,
        "build": version.build,
        "provider_direction": "openai_only_primary",
        "complete": complete,
        "summary": summary,
        "source_basis": {
            "official_pricing_url": _OPENAI_PRICING_URL,
            "chat_pricing_source": "openai_official",
            "image_pricing_source": "openai_official",
            "package_catalog_source": "studio_public_plan_payload",
            "credit_contract_source": "studio_model_catalog",
        },
        "chat_lane_cost_basis": chat_lane_cost_basis,
        "image_lane_cost_basis": image_lane_cost_basis,
        "package_assumptions": package_assumptions,
        "plan_lane_credit_impact": lane_credit_impact,
        "package_capacity_summary": package_capacity_summary,
        "safe_risky_generation_summary": safe_risky,
        "founder_signoff": founder_signoff,
    }


def _build_package_assumptions(public_plan_payload: Mapping[str, Any]) -> list[dict[str, Any]]:
    plans = public_plan_payload.get("plans")
    result: list[dict[str, Any]] = []
    if isinstance(plans, list):
        for item in plans:
            if not isinstance(item, Mapping):
                continue
            plan_id = str(item.get("id") or "").strip().lower()
            if not plan_id:
                continue
            result.append(
                {
                    "id": plan_id,
                    "kind": "plan",
                    "label": str(item.get("label") or plan_id).strip(),
                    "credits": int(item.get("monthly_credits") or 0),
                    "price_usd": item.get("price_usd"),
                    "billing_period": item.get("billing_period"),
                    "entitlement_plan": str(item.get("entitlement_plan") or "").strip().lower() or None,
                    "checkout_kind": item.get("checkout_kind"),
                }
            )

    top_up = public_plan_payload.get("top_up")
    if isinstance(top_up, Mapping):
        options = top_up.get("options")
        if isinstance(options, list):
            for option in options:
                if not isinstance(option, Mapping):
                    continue
                kind = str(option.get("kind") or "").strip().lower()
                if not kind:
                    continue
                result.append(
                    {
                        "id": kind,
                        "kind": "top_up",
                        "group_id": str(top_up.get("id") or "top_up").strip().lower() or "top_up",
                        "label": str(option.get("label") or kind).strip(),
                        "credits": int(option.get("credits") or 0),
                        "price_usd": option.get("price_usd"),
                        "billing_period": None,
                        "entitlement_plan": None,
                        "checkout_kind": option.get("kind"),
                    }
                )

    return result


def _build_plan_forecasts(
    *,
    settings: Settings,
    identity_plan: IdentityPlan,
    available_to_spend: int,
) -> dict[str, Any]:
    registry = _build_openai_only_registry(settings)
    accessible_models = [
        model
        for model in list_model_catalog_entries()
        if not (identity_plan == IdentityPlan.FREE and model.min_plan == IdentityPlan.PRO)
    ]
    billing_state = BillingStateSnapshot(
        gross_remaining=max(int(available_to_spend or 0), 0),
        reserved_total=0,
        available_to_spend=max(int(available_to_spend or 0), 0),
        monthly_remaining=max(int(available_to_spend or 0), 0),
        monthly_allowance=max(int(available_to_spend or 0), 0),
        extra_credits=0,
        unlimited=False,
        effective_plan=identity_plan,
        subscription_active=identity_plan == IdentityPlan.PRO,
    )
    return build_generation_credit_forecasts(
        identity_plan=identity_plan,
        billing_state=billing_state,
        models=accessible_models,
        providers=registry,
    )


def _build_openai_only_registry(settings: Settings) -> ProviderRegistry:
    registry = ProviderRegistry()
    provider = OpenAIImageProvider(
        "economics-dossier",
        draft_image_model=settings.openai_image_draft_model,
        image_model=settings.openai_image_model,
        premium_qa_enabled=settings.openai_image_premium_qa_enabled,
    )
    registry.providers = [provider]
    registry._providers_by_name = {provider.name: provider}
    registry._provider_circuits = {provider.name: ProviderCircuitState()}
    return registry


def _build_image_lane_cost_basis(*, model: str) -> dict[str, Any]:
    price_grid: dict[str, dict[str, float | None]] = {}
    for size in _CANONICAL_IMAGE_SIZES:
        price_grid[size] = {
            quality: lookup_openai_image_output_price(model, size=size, quality=quality)
            for quality in _CANONICAL_IMAGE_QUALITIES
        }
    return {
        "reference_model": str(model or "").strip().lower() or None,
        "per_image_usd": price_grid,
    }


def _sanitize_chat_pricing(pricing: Mapping[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(pricing, Mapping):
        return None
    return {
        "model": pricing.get("model"),
        "display_name": pricing.get("display_name"),
        "reference_model": pricing.get("reference_model"),
        "input_per_million_usd": pricing.get("input_per_million_usd"),
        "output_per_million_usd": pricing.get("output_per_million_usd"),
        "pricing_source": pricing.get("pricing_source"),
    }


def _summarize_safe_and_risky(forecasts: Mapping[str, Any]) -> dict[str, Any]:
    models = forecasts.get("models")
    if not isinstance(models, list):
        return {
            "safe_model_id": None,
            "safe_generation_count": None,
            "risky_model_id": None,
            "risky_generation_count": None,
        }
    positive_hold = [
        item
        for item in models
        if isinstance(item, Mapping) and int(item.get("reserved_credit_cost") or 0) > 0
    ]
    if not positive_hold:
        return {
            "safe_model_id": None,
            "safe_generation_count": None,
            "risky_model_id": None,
            "risky_generation_count": None,
        }
    safe = min(
        positive_hold,
        key=lambda item: (
            int(item.get("reserved_credit_cost") or 0),
            float(item.get("estimated_cost") or 0.0),
        ),
    )
    risky = max(
        positive_hold,
        key=lambda item: (
            int(item.get("reserved_credit_cost") or 0),
            float(item.get("estimated_cost") or 0.0),
        ),
    )
    return {
        "safe_model_id": safe.get("model_id"),
        "safe_generation_count": safe.get("max_startable_jobs_now"),
        "safe_reserved_credit_cost": safe.get("reserved_credit_cost"),
        "risky_model_id": risky.get("model_id"),
        "risky_generation_count": risky.get("max_startable_jobs_now"),
        "risky_reserved_credit_cost": risky.get("reserved_credit_cost"),
    }


def _build_package_capacity_summary(
    *,
    package_assumptions: list[dict[str, Any]],
    starter_forecasts: Mapping[str, Any],
    pro_forecasts: Mapping[str, Any],
) -> list[dict[str, Any]]:
    starter_summary = _summarize_safe_and_risky(starter_forecasts)
    pro_summary = _summarize_safe_and_risky(pro_forecasts)
    result: list[dict[str, Any]] = []
    for package in package_assumptions:
        kind = str(package.get("kind") or "").strip().lower()
        package_entry = dict(package)
        if kind == "plan":
            plan_id = str(package.get("id") or "").strip().lower()
            package_entry["safe_risky_generation_summary"] = (
                starter_summary if plan_id == "starter" else pro_summary
            )
        elif kind == "top_up":
            package_entry["capacity_contexts"] = {
                "starter": _capacity_for_credit_bundle(
                    credits=int(package.get("credits") or 0),
                    summary=starter_summary,
                ),
                "pro": _capacity_for_credit_bundle(
                    credits=int(package.get("credits") or 0),
                    summary=pro_summary,
                ),
            }
        result.append(package_entry)
    return result


def _capacity_for_credit_bundle(*, credits: int, summary: Mapping[str, Any]) -> dict[str, Any]:
    safe_cost = int(summary.get("safe_reserved_credit_cost") or 0)
    risky_cost = int(summary.get("risky_reserved_credit_cost") or 0)
    return {
        "safe_model_id": summary.get("safe_model_id"),
        "safe_generation_count": (credits // safe_cost) if safe_cost > 0 else None,
        "risky_model_id": summary.get("risky_model_id"),
        "risky_generation_count": (credits // risky_cost) if risky_cost > 0 else None,
    }
