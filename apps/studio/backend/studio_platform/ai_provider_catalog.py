from __future__ import annotations

from typing import Any, Mapping, Sequence

from config.env import Settings
from .contract_catalog import (
    ASSET_TRUTH_FIELDS,
    BOOTSTRAP_FIELDS,
    PRODUCT_GENERATION_STATUSES,
    build_contract_freeze_summary,
)
from .studio_model_contract import (
    STUDIO_FAST_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID,
    STUDIO_SIGNATURE_MODEL_ID,
    STUDIO_STANDARD_MODEL_ID,
    resolve_studio_model_openai_quality,
)

CANONICAL_GENERATION_STATUSES = PRODUCT_GENERATION_STATUSES
CANONICAL_ASSET_TRUTH_FIELDS = ASSET_TRUTH_FIELDS
CANONICAL_BOOTSTRAP_FIELDS = BOOTSTRAP_FIELDS

STUDIO_OPENAI_IMAGE_QUALITY_BY_MODEL_ID: dict[str, str] = {
    STUDIO_FAST_MODEL_ID: "low",
    STUDIO_STANDARD_MODEL_ID: "medium",
    STUDIO_PREMIUM_MODEL_ID: "high",
    STUDIO_SIGNATURE_MODEL_ID: "high",
    "flux-schnell": "low",
    "sdxl-base": "medium",
    "realvis-xl": "high",
    "juggernaut-xl": "high",
}

_CHAT_PROVIDER_LABELS: dict[str, str] = {
    "openai": "OpenAI",
    "openrouter": "OpenRouter",
    "gemini": "Gemini",
    "heuristic": "Heuristic",
}

_CHAT_MODEL_PRICING: tuple[dict[str, Any], ...] = (
    {
        "prefixes": ("google/gemini-2.5-flash-lite", "gemini-2.5-flash-lite"),
        "provider": "gemini",
        "display_name": "Gemini 2.5 Flash-Lite",
        "reference_model": "gemini-2.5-flash-lite",
        "input_per_million_usd": 0.10,
        "output_per_million_usd": 0.40,
        "pricing_source": "google_ai_dev_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("google/gemini-2.5-flash", "gemini-2.5-flash"),
        "provider": "gemini",
        "display_name": "Gemini 2.5 Flash",
        "reference_model": "gemini-2.5-flash",
        "input_per_million_usd": 0.30,
        "output_per_million_usd": 2.50,
        "pricing_source": "google_ai_dev_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("google/gemini-2.5-pro", "gemini-2.5-pro"),
        "provider": "gemini",
        "display_name": "Gemini 2.5 Pro",
        "reference_model": "gemini-2.5-pro",
        "input_per_million_usd": 1.25,
        "output_per_million_usd": 10.00,
        "pricing_source": "google_ai_dev_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-4o-mini",),
        "provider": "openai",
        "display_name": "GPT-4o mini",
        "reference_model": "gpt-4o-mini",
        "input_per_million_usd": 0.15,
        "output_per_million_usd": 0.60,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-4.1-mini",),
        "provider": "openai",
        "display_name": "GPT-4.1 mini",
        "reference_model": "gpt-4.1-mini",
        "input_per_million_usd": 0.40,
        "output_per_million_usd": 1.60,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-5.4-mini",),
        "provider": "openai",
        "display_name": "GPT-5.4 mini",
        "reference_model": "gpt-5.4-mini",
        "input_per_million_usd": 0.75,
        "output_per_million_usd": 4.50,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-5.4-nano",),
        "provider": "openai",
        "display_name": "GPT-5.4 nano",
        "reference_model": "gpt-5.4-nano",
        "input_per_million_usd": 0.20,
        "output_per_million_usd": 1.25,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-5.4",),
        "provider": "openai",
        "display_name": "GPT-5.4",
        "reference_model": "gpt-5.4",
        "input_per_million_usd": 2.50,
        "output_per_million_usd": 15.00,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-5-mini",),
        "provider": "openai",
        "display_name": "GPT-5 mini",
        "reference_model": "gpt-5-mini",
        "input_per_million_usd": 0.25,
        "output_per_million_usd": 2.00,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-5-nano",),
        "provider": "openai",
        "display_name": "GPT-5 nano",
        "reference_model": "gpt-5-nano",
        "input_per_million_usd": 0.05,
        "output_per_million_usd": 0.40,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
    {
        "prefixes": ("gpt-5",),
        "provider": "openai",
        "display_name": "GPT-5",
        "reference_model": "gpt-5",
        "input_per_million_usd": 1.25,
        "output_per_million_usd": 10.00,
        "pricing_source": "openai_official",
        "inferred_alias": False,
    },
)

_OPENAI_IMAGE_PRICING: dict[str, dict[tuple[str, str], float]] = {
    "gpt-image-1-mini": {
        ("1024x1024", "low"): 0.005,
        ("1024x1024", "medium"): 0.011,
        ("1024x1024", "high"): 0.036,
        ("1024x1536", "low"): 0.006,
        ("1024x1536", "medium"): 0.015,
        ("1024x1536", "high"): 0.052,
        ("1536x1024", "low"): 0.006,
        ("1536x1024", "medium"): 0.015,
        ("1536x1024", "high"): 0.052,
    },
    "gpt-image-1.5": {
        ("1024x1024", "low"): 0.009,
        ("1024x1024", "medium"): 0.034,
        ("1024x1024", "high"): 0.133,
        ("1024x1536", "low"): 0.013,
        ("1024x1536", "medium"): 0.050,
        ("1024x1536", "high"): 0.200,
        ("1536x1024", "low"): 0.013,
        ("1536x1024", "medium"): 0.050,
        ("1536x1024", "high"): 0.200,
    },
    "gpt-image-1": {
        ("1024x1024", "low"): 0.011,
        ("1024x1024", "medium"): 0.042,
        ("1024x1024", "high"): 0.167,
        ("1024x1536", "low"): 0.016,
        ("1024x1536", "medium"): 0.063,
        ("1024x1536", "high"): 0.250,
        ("1536x1024", "low"): 0.016,
        ("1536x1024", "medium"): 0.063,
        ("1536x1024", "high"): 0.250,
    },
    "chatgpt-image-latest": {
        ("1024x1024", "low"): 0.009,
        ("1024x1024", "medium"): 0.034,
        ("1024x1024", "high"): 0.133,
        ("1024x1536", "low"): 0.013,
        ("1024x1536", "medium"): 0.050,
        ("1024x1536", "high"): 0.200,
        ("1536x1024", "low"): 0.013,
        ("1536x1024", "medium"): 0.050,
        ("1536x1024", "high"): 0.200,
    },
}


def lookup_chat_model_pricing(model: str | None) -> dict[str, Any] | None:
    normalized = _normalize_model_name(model)
    if not normalized:
        return None
    for entry in _CHAT_MODEL_PRICING:
        if any(normalized.startswith(prefix) for prefix in entry["prefixes"]):
            return {
                "model": normalized,
                "provider": entry["provider"],
                "display_name": entry["display_name"],
                "reference_model": entry["reference_model"],
                "input_per_million_usd": entry["input_per_million_usd"],
                "output_per_million_usd": entry["output_per_million_usd"],
                "pricing_source": entry["pricing_source"],
                "inferred_alias": entry["inferred_alias"],
            }
    return None


def chat_model_cost_rates(model: str | None) -> tuple[float | None, float | None]:
    pricing = lookup_chat_model_pricing(model)
    if pricing is None:
        return None, None
    return pricing["input_per_million_usd"], pricing["output_per_million_usd"]


def lookup_openai_image_output_price(
    model: str | None,
    *,
    size: str,
    quality: str,
) -> float | None:
    normalized_model = _normalize_model_name(model)
    if not normalized_model:
        return None
    pricing_table = _OPENAI_IMAGE_PRICING.get(normalized_model)
    if pricing_table is None:
        return None
    direct = pricing_table.get((size, quality))
    if direct is not None:
        return float(direct)
    fallback = pricing_table.get(("1024x1024", "medium"))
    return float(fallback) if fallback is not None else None


def build_ai_control_plane_summary(
    *,
    settings: Settings,
    chat_routing: Mapping[str, Any],
    generation_routing: Mapping[str, Any],
    studio_models: Sequence[Mapping[str, Any]],
    surface_matrix: Sequence[Mapping[str, Any]] | None = None,
) -> dict[str, Any]:
    chat_providers = []
    runtime_providers = chat_routing.get("providers")
    runtime_provider_map = runtime_providers if isinstance(runtime_providers, Mapping) else {}

    for provider_name, standard_model, premium_model, service_tier in (
        (
            "openrouter",
            settings.openrouter_model,
            settings.openrouter_premium_model,
            settings.openrouter_service_tier,
        ),
        (
            "openai",
            settings.openai_model,
            settings.openai_premium_model,
            settings.openai_service_tier,
        ),
        (
            "gemini",
            settings.gemini_model,
            settings.gemini_premium_model,
            settings.gemini_service_tier,
        ),
    ):
        chat_providers.append(
            {
                "provider": provider_name,
                "label": _CHAT_PROVIDER_LABELS.get(provider_name, provider_name.title()),
                "roles": {
                    "primary": provider_name == settings.chat_primary_provider,
                    "fallback": provider_name == settings.chat_fallback_provider,
                    "protected_beta_selected": provider_name == settings.protected_beta_chat_provider,
                },
                "service_tier": str(service_tier or "").strip().lower() or "unknown",
                "runtime_status": runtime_provider_map.get(provider_name),
                "standard_model": _describe_chat_model(standard_model),
                "premium_model": _describe_chat_model(premium_model),
            }
        )

    draft_model = settings.openai_image_draft_model
    final_model = settings.openai_image_model
    image_providers = [
        {
            "provider": "openai",
            "label": _CHAT_PROVIDER_LABELS["openai"],
            "roles": {
                "protected_beta_selected": settings.protected_beta_image_provider == "openai",
                "premium_qa_enabled": bool(settings.openai_image_premium_qa_enabled),
            },
            "draft_model": _describe_image_model(draft_model),
            "final_model": _describe_image_model(final_model),
        }
    ]

    return {
        "contract_freeze": build_contract_freeze_summary(),
        "protected_beta_policy": {
            "chat_provider": settings.protected_beta_chat_provider,
            "image_provider": settings.protected_beta_image_provider,
            "image_final_lane_required": bool(settings.protected_beta_image_require_final_lane),
        },
        "operator_policy": {
            "protected_beta_lock_is_temporary": True,
            "public_paid_provider_strategy_locked": False,
            "current_operator_source": "ai_control_plane.surface_matrix",
        },
        "chat": {
            "primary_provider": settings.chat_primary_provider,
            "fallback_provider": settings.chat_fallback_provider,
            "free_account_provider": "gemini",
            "free_account_model": settings.gemini_free_model,
            "providers": chat_providers,
            "multimodal_policy": chat_routing.get("multimodal_policy"),
        },
        "image": {
            "default_strategy": generation_routing.get("default_strategy"),
            "protected_beta_provider": settings.protected_beta_image_provider,
            "standard_provider_preference": "runware",
            "edit_reference_provider_preference": "runware",
            "openai": image_providers[0],
        },
        "surface_matrix": [dict(item) for item in (surface_matrix or ())],
        "studio_models": [dict(model) for model in studio_models],
    }


def resolve_openai_image_request_model(
    *,
    model_id: str | None,
    draft_image_model: str,
    image_model: str,
    premium_qa_enabled: bool,
) -> str:
    quality = resolve_studio_model_openai_quality(model_id)
    normalized_model = _normalize_model_name(model_id)
    normalized_draft = _normalize_model_name(draft_image_model)
    normalized_final = _normalize_model_name(image_model)
    explicit_model_ids = {
        normalized_draft,
        normalized_final,
        "gpt-image-1",
        "gpt-image-1.5",
        "gpt-image-1-mini",
        "chatgpt-image-latest",
    }

    if not premium_qa_enabled and normalized_model not in explicit_model_ids:
        return draft_image_model
    if normalized_model in {normalized_draft, normalized_final}:
        return normalized_model
    if quality == "low":
        return draft_image_model
    return image_model


def _describe_chat_model(model: str) -> dict[str, Any]:
    pricing = lookup_chat_model_pricing(model)
    return {
        "name": model,
        "pricing": pricing,
    }


def _describe_image_model(model: str) -> dict[str, Any]:
    price_grid = {}
    for size in ("1024x1024", "1024x1536", "1536x1024"):
        price_grid[size] = {
            quality: lookup_openai_image_output_price(model, size=size, quality=quality)
            for quality in ("low", "medium", "high")
        }
    return {
        "name": model,
        "per_image_usd": price_grid,
    }


def _normalize_model_name(model: str | None) -> str:
    return str(model or "").strip().lower()
