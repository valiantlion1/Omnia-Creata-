from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Sequence

from .models import ModelCatalogEntry
from .providers import GenerationRoutingDecision, normalize_generation_workflow
from .studio_model_contract import (
    STUDIO_CINEMATIC_IMAGE_MODEL_ID,
    STUDIO_DEFAULT_IMAGE_MODEL_ID,
    STUDIO_DESIGN_IMAGE_MODEL_ID,
    STUDIO_IDEOGRAM_MODEL_ID,
    STUDIO_MULTI_REFERENCE_MODEL_ID,
    STUDIO_MODEL_PRICING_LANES,
    STUDIO_PREMIUM_MODEL_ID,
    STUDIO_QUICK_IMAGE_MODEL_ID,
    STUDIO_SEEDREAM_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID,
    STUDIO_TEXT_IMAGE_MODEL_ID,
    normalize_studio_model_id,
    resolve_studio_model_pricing_lane,
)

_FALLBACK_ONLY_PROVIDERS = frozenset({"pollinations", "huggingface"})
_DEGRADED_ONLY_PROVIDERS = frozenset({"demo"})
_MANAGED_BILLABLE_PROVIDERS = frozenset({"openai", "fal", "runware"})
_OPENAI_DRAFT_MODEL_IDS = frozenset({"gpt-image-1-mini"})
_OPENAI_FINAL_MODEL_IDS = frozenset({"gpt-image-1.5", "gpt-image-1"})
_TARGET_GROSS_MARGIN_MULTIPLIER = 2.5
_RECOMMENDED_PRO_NET_USD_PER_CREDIT = 0.0202875
_CREDIT_ROUNDING_STEP = 2

_MODEL_BASE_CREDITS: dict[str, int] = {
    STUDIO_QUICK_IMAGE_MODEL_ID: 10,
    STUDIO_DEFAULT_IMAGE_MODEL_ID: 20,
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: 16,
    STUDIO_PREMIUM_MODEL_ID: 20,
    STUDIO_MULTI_REFERENCE_MODEL_ID: 20,
    STUDIO_TEXT_IMAGE_MODEL_ID: 24,
    STUDIO_DESIGN_IMAGE_MODEL_ID: 10,
    STUDIO_IDEOGRAM_MODEL_ID: 14,
    STUDIO_SEEDREAM_MODEL_ID: 18,
    STUDIO_SIGNATURE_MODEL_ID: 40,
}
_REFERENCE_SURCHARGE_CREDITS: dict[str, int] = {
    STUDIO_QUICK_IMAGE_MODEL_ID: 2,
    STUDIO_DEFAULT_IMAGE_MODEL_ID: 2,
    STUDIO_CINEMATIC_IMAGE_MODEL_ID: 2,
    STUDIO_PREMIUM_MODEL_ID: 4,
    STUDIO_MULTI_REFERENCE_MODEL_ID: 4,
    STUDIO_TEXT_IMAGE_MODEL_ID: 4,
    STUDIO_DESIGN_IMAGE_MODEL_ID: 2,
    STUDIO_IDEOGRAM_MODEL_ID: 4,
    STUDIO_SEEDREAM_MODEL_ID: 4,
    STUDIO_SIGNATURE_MODEL_ID: 8,
}


@dataclass(frozen=True, slots=True)
class GenerationPricingQuote:
    pricing_lane: str
    estimated_cost: float
    estimated_cost_source: str
    credit_cost: int
    reserved_credit_cost: int


def resolve_generation_pricing_lane(
    *,
    provider_name: str | None,
    requested_model_id: str | None,
    workflow: str = "text_to_image",
    degraded: bool = False,
) -> str:
    normalized_provider = (provider_name or "").strip().lower()
    normalized_model = normalize_studio_model_id(requested_model_id)
    normalized_workflow = normalize_generation_workflow(workflow)

    if normalized_provider in _DEGRADED_ONLY_PROVIDERS:
        return "degraded"
    if normalized_provider in _FALLBACK_ONLY_PROVIDERS:
        return "fallback"
    if degraded and normalized_provider in {"", "pending"}:
        return "degraded"
    if normalized_provider == "openai":
        if normalized_model in _OPENAI_DRAFT_MODEL_IDS:
            return "draft"
        if normalized_model in _OPENAI_FINAL_MODEL_IDS:
            return "final"
        if normalized_workflow in {"image_to_image", "edit"}:
            return "final"
        if resolve_studio_model_pricing_lane(normalized_model) == "draft":
            return "draft"
        return "final"
    return STUDIO_MODEL_PRICING_LANES.get(normalized_model, "standard")


def calculate_generation_reservation_cost(
    *,
    base_credit_cost: int,
    provider_candidates: Sequence[str],
) -> int:
    normalized_cost = max(int(base_credit_cost or 0), 0)
    if normalized_cost <= 0:
        return 0

    normalized_candidates = tuple(
        str(provider_name or "").strip().lower()
        for provider_name in provider_candidates
        if str(provider_name or "").strip()
    )
    has_managed_candidate = any(
        candidate in _MANAGED_BILLABLE_PROVIDERS
        for candidate in normalized_candidates
    )
    if has_managed_candidate:
        return normalized_cost

    has_standard_candidate = any(
        candidate not in _DEGRADED_ONLY_PROVIDERS
        for candidate in normalized_candidates
    )
    if has_standard_candidate:
        return max(1, int(math.ceil(normalized_cost * 0.5)))
    return 0


def _round_credits(value: float) -> int:
    normalized = max(float(value or 0.0), 0.0)
    if normalized <= 0:
        return 0
    return int(math.ceil(normalized / _CREDIT_ROUNDING_STEP) * _CREDIT_ROUNDING_STEP)


def _request_megapixels(*, width: int, height: int) -> float:
    return max((max(int(width or 0), 0) * max(int(height or 0), 0)) / float(1024 * 1024), 0.0)


def _quote_protected_credit_floor(provider_estimated_cost: float | None) -> int:
    if provider_estimated_cost is None:
        return 0
    required = (max(float(provider_estimated_cost), 0.0) * _TARGET_GROSS_MARGIN_MULTIPLIER) / _RECOMMENDED_PRO_NET_USD_PER_CREDIT
    return _round_credits(required)


def _resolution_credit_floor(
    *,
    normalized_model: str,
    width: int,
    height: int,
    base_credit_cost: int,
) -> int:
    megapixels = _request_megapixels(width=width, height=height)
    longest_edge = max(int(width or 0), int(height or 0))
    if normalized_model == STUDIO_DEFAULT_IMAGE_MODEL_ID:
        if longest_edge >= 3000 or megapixels >= 6.0:
            return max(base_credit_cost, 28)
        return max(base_credit_cost, 20)
    if normalized_model == STUDIO_SEEDREAM_MODEL_ID:
        if longest_edge >= 3000 or megapixels >= 6.0:
            return max(base_credit_cost, 24)
        return max(base_credit_cost, 18)
    if normalized_model == STUDIO_TEXT_IMAGE_MODEL_ID and megapixels >= 3.5:
        return max(base_credit_cost, 24)
    if normalized_model in {STUDIO_PREMIUM_MODEL_ID, STUDIO_SIGNATURE_MODEL_ID} and megapixels >= 3.5:
        return max(base_credit_cost, _MODEL_BASE_CREDITS.get(normalized_model, base_credit_cost))
    return base_credit_cost


def _resolve_credit_cost_per_output(
    *,
    requested_model_id: str | None,
    legacy_model: ModelCatalogEntry,
    workflow: str,
    width: int,
    height: int,
    provider_estimated_cost: float | None,
) -> int:
    normalized_model = normalize_studio_model_id(requested_model_id or legacy_model.id)
    base_credit_cost = max(
        int(_MODEL_BASE_CREDITS.get(normalized_model, legacy_model.credit_cost) or 0),
        0,
    )
    if base_credit_cost <= 0:
        return 0

    normalized_workflow = normalize_generation_workflow(workflow)
    credit_cost = _resolution_credit_floor(
        normalized_model=normalized_model,
        width=width,
        height=height,
        base_credit_cost=base_credit_cost,
    )
    if normalized_workflow in {"image_to_image", "edit"}:
        credit_cost += int(_REFERENCE_SURCHARGE_CREDITS.get(normalized_model, 0))

    if normalized_model in _MODEL_BASE_CREDITS:
        credit_cost = max(credit_cost, _quote_protected_credit_floor(provider_estimated_cost))

    return credit_cost


def build_generation_pricing_quote(
    *,
    selected_provider: str | None,
    routing_decision: GenerationRoutingDecision,
    requested_model_id: str | None,
    workflow: str,
    width: int,
    height: int,
    output_count: int,
    provider_estimated_cost: float | None,
    legacy_model: ModelCatalogEntry,
    unlimited_generation_access: bool = False,
) -> GenerationPricingQuote:
    normalized_output_count = max(int(output_count or 1), 1)
    per_output_credit_cost = _resolve_credit_cost_per_output(
        requested_model_id=requested_model_id,
        legacy_model=legacy_model,
        workflow=workflow or routing_decision.workflow,
        width=width,
        height=height,
        provider_estimated_cost=provider_estimated_cost,
    )
    credit_cost = per_output_credit_cost * normalized_output_count
    estimated_cost_source = (
        "provider_quote"
        if provider_estimated_cost is not None
        else "catalog_fallback"
    )
    per_output_estimate = (
        float(provider_estimated_cost)
        if provider_estimated_cost is not None
        else float(legacy_model.estimated_cost)
    )
    estimated_cost = round(max(per_output_estimate, 0.0) * normalized_output_count, 6)
    pricing_lane = resolve_generation_pricing_lane(
        provider_name=selected_provider or routing_decision.selected_provider,
        requested_model_id=requested_model_id or legacy_model.id,
        workflow=workflow or routing_decision.workflow,
        degraded=routing_decision.degraded,
    )
    reserved_credit_cost = (
        0
        if unlimited_generation_access
        else calculate_generation_reservation_cost(
            base_credit_cost=credit_cost,
            provider_candidates=list(routing_decision.provider_candidates),
        )
    )
    return GenerationPricingQuote(
        pricing_lane=pricing_lane,
        estimated_cost=estimated_cost,
        estimated_cost_source=estimated_cost_source,
        credit_cost=credit_cost,
        reserved_credit_cost=reserved_credit_cost,
    )
