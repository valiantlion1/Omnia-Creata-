from __future__ import annotations

from typing import Any, Mapping

from .generation_pricing_ops import build_generation_pricing_quote
from .models import IdentityPlan, ModelCatalogEntry
from .providers import ProviderRegistry

_ROUTE_PREVIEW_PROMPT = "Studio route preview"
_LAUNCH_GRADE_PROVIDERS = frozenset({"openai", "fal", "runware"})
_FALLBACK_ONLY_PROVIDERS = frozenset({"pollinations", "huggingface"})
_DEGRADED_ONLY_PROVIDERS = frozenset({"demo"})
_CHAT_PROVIDER_LABELS = {
    "openai": "OpenAI",
    "openrouter": "OpenRouter",
    "gemini": "Gemini",
    "anthropic": "Anthropic",
}
_RENDER_EXPERIENCE_COPY = {
    "ready": {
        "label": "Ready to render",
        "message": "Studio can start this profile on a live launch-grade render route right now.",
    },
    "fallback": {
        "label": "Preview route",
        "message": "Studio can only offer a fallback preview route for this profile in the current environment.",
    },
    "degraded": {
        "label": "Degraded mode",
        "message": "Studio can only offer a degraded rescue route for this profile until healthier lanes recover.",
    },
    "unavailable": {
        "label": "Not available",
        "message": "Studio cannot honestly start this render experience in the current environment yet.",
    },
}
_CHAT_EXPERIENCE_COPY = {
    "live_premium": {
        "label": "Live premium reply",
        "message": "Studio answered on a live premium chat lane.",
    },
    "premium_unavailable": {
        "label": "Premium lane unavailable",
        "message": "Studio could not keep this reply on its premium lane, so the premium experience is currently unavailable.",
    },
    "degraded_fallback": {
        "label": "Fallback assistant",
        "message": "Studio answered with its degraded fallback assistant because live providers were unavailable.",
    },
}


def build_render_experience(
    *,
    provider_name: str | None,
    pricing_lane: str | None,
    degraded: bool,
    provider_billable: bool | None,
) -> dict[str, Any]:
    normalized_provider = (provider_name or "").strip().lower()
    normalized_lane = (pricing_lane or "").strip().lower()

    if normalized_provider in {"", "pending"}:
        state = "unavailable"
    elif normalized_provider in _DEGRADED_ONLY_PROVIDERS or normalized_lane == "degraded":
        state = "degraded"
    elif normalized_provider in _FALLBACK_ONLY_PROVIDERS or normalized_lane == "fallback":
        state = "fallback"
    elif degraded:
        state = "fallback"
    elif normalized_provider in _LAUNCH_GRADE_PROVIDERS and provider_billable is not False:
        state = "ready"
    else:
        state = "unavailable"

    copy = _RENDER_EXPERIENCE_COPY[state]
    return {
        "state": state,
        "label": copy["label"],
        "message": copy["message"],
        "launch_grade": state == "ready",
        "billable": False if state == "unavailable" else bool(provider_billable),
    }


def build_model_route_preview(
    *,
    model: ModelCatalogEntry,
    identity_plan: IdentityPlan | str,
    providers: ProviderRegistry,
    workflow: str = "text_to_image",
    has_reference_image: bool = False,
    wallet_backed: bool = False,
) -> dict[str, Any]:
    routing_decision = providers.plan_generation_route(
        plan=identity_plan,
        prompt=_ROUTE_PREVIEW_PROMPT,
        model_id=model.id,
        workflow=workflow,
        has_reference_image=has_reference_image,
        wallet_backed=wallet_backed,
    )
    provider_estimated_cost = providers.estimate_generation_cost(
        provider_name=routing_decision.selected_provider,
        width=model.max_width,
        height=model.max_height,
        model_id=model.id,
        workflow=routing_decision.workflow,
        has_reference_image=has_reference_image,
    )
    pricing_quote = build_generation_pricing_quote(
        selected_provider=routing_decision.selected_provider,
        routing_decision=routing_decision,
        requested_model_id=model.id,
        workflow=routing_decision.workflow,
        width=model.max_width,
        height=model.max_height,
        output_count=1,
        provider_estimated_cost=provider_estimated_cost,
        legacy_model=model,
        unlimited_generation_access=False,
    )
    render_experience = build_render_experience(
        provider_name=routing_decision.selected_provider,
        pricing_lane=pricing_quote.pricing_lane,
        degraded=routing_decision.degraded,
        provider_billable=providers.provider_billable(routing_decision.selected_provider),
    )
    return {
        "workflow": routing_decision.workflow,
        "pricing_lane": pricing_quote.pricing_lane,
        "planned_provider": routing_decision.selected_provider,
        "render_experience": render_experience,
    }


def build_chat_experience(
    metadata: Mapping[str, Any] | None,
) -> dict[str, Any] | None:
    payload = dict(metadata or {})
    normalized_provider = str(payload.get("provider") or "").strip().lower()
    normalized_mode = str(payload.get("response_mode") or "").strip().lower()

    if normalized_mode == "live_provider_reply":
        state = "live_premium"
    elif normalized_mode == "premium_lane_unavailable":
        state = "premium_unavailable"
    elif normalized_mode == "degraded_fallback_reply":
        state = "degraded_fallback"
    elif payload.get("premium_lane_unavailable"):
        state = "premium_unavailable"
    elif payload.get("degraded") or payload.get("used_fallback"):
        state = "degraded_fallback"
    elif normalized_provider and normalized_provider not in {"heuristic", "pending"}:
        state = "live_premium"
    else:
        return None

    show_provider = state == "live_premium" and normalized_provider not in {"", "heuristic", "pending"}
    provider_label = None
    if show_provider:
        provider_label = _CHAT_PROVIDER_LABELS.get(
            normalized_provider,
            normalized_provider.replace("-", " ").title(),
        )

    copy = _CHAT_EXPERIENCE_COPY[state]
    return {
        "state": state,
        "label": copy["label"],
        "message": copy["message"],
        "show_provider": show_provider,
        "provider_label": provider_label,
    }


def attach_chat_experience(
    metadata: Mapping[str, Any] | None,
) -> dict[str, Any]:
    payload = dict(metadata or {})
    chat_experience = build_chat_experience(payload)
    if chat_experience is not None:
        payload["chat_experience"] = chat_experience
    return payload
