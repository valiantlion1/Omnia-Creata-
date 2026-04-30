from __future__ import annotations

from config.env import get_settings
from studio_platform.contract_catalog import build_contract_freeze_summary
from studio_platform.ai_provider_catalog import (
    build_ai_control_plane_summary,
    chat_model_cost_rates,
    lookup_chat_model_pricing,
    lookup_openai_image_output_price,
)


def test_chat_model_cost_rates_cover_current_selected_models() -> None:
    settings = get_settings()

    assert chat_model_cost_rates(settings.openai_model) == (0.15, 0.60)
    assert chat_model_cost_rates(settings.openai_premium_model) == (2.50, 15.00)
    assert chat_model_cost_rates("google/gemini-2.5-pro") == (1.25, 10.00)
    assert chat_model_cost_rates(settings.runware_chat_model) == (None, None)


def test_lookup_openai_image_output_price_is_model_aware() -> None:
    assert lookup_openai_image_output_price(
        "gpt-image-1-mini",
        size="1024x1024",
        quality="low",
    ) == 0.005
    assert lookup_openai_image_output_price(
        "gpt-image-1.5",
        size="1024x1024",
        quality="high",
    ) == 0.133
    assert lookup_openai_image_output_price(
        "chatgpt-image-latest",
        size="1024x1536",
        quality="medium",
    ) == 0.05


def test_build_ai_control_plane_summary_surfaces_provider_roles() -> None:
    settings = get_settings()
    original = {
        "chat_primary_provider": settings.chat_primary_provider,
        "chat_fallback_provider": settings.chat_fallback_provider,
        "protected_beta_chat_provider": settings.protected_beta_chat_provider,
    }

    try:
        settings.chat_primary_provider = "runware"
        settings.chat_fallback_provider = "heuristic"
        settings.protected_beta_chat_provider = "runware"
        summary = build_ai_control_plane_summary(
            settings=settings,
            chat_routing={
                "primary_provider": settings.chat_primary_provider,
                "fallback_provider": settings.chat_fallback_provider,
                "multimodal_policy": "configured_provider_order",
                "providers": {
                    "runware": {"status": "healthy"},
                    "openrouter": {"status": "healthy"},
                    "openai": {"status": "healthy"},
                    "gemini": {"status": "healthy"},
                },
            },
            generation_routing={"default_strategy": "free-first"},
            studio_models=[
                {
                    "id": "flux-schnell",
                    "label": "Fast",
                    "default_openai_request_model": settings.openai_image_draft_model,
                }
            ],
            surface_matrix=[
                {
                    "id": "chat:standard-assist",
                    "surface": "chat",
                }
            ],
        )
    finally:
        settings.chat_primary_provider = original["chat_primary_provider"]
        settings.chat_fallback_provider = original["chat_fallback_provider"]
        settings.protected_beta_chat_provider = original["protected_beta_chat_provider"]

    runware = next(item for item in summary["chat"]["providers"] if item["provider"] == "runware")
    openai = next(item for item in summary["chat"]["providers"] if item["provider"] == "openai")

    assert runware["roles"]["primary"] is True
    assert runware["roles"]["protected_beta_selected"] is True
    assert openai["roles"]["fallback"] is False
    assert summary["chat"]["free_account_provider"] == "runware"
    assert summary["protected_beta_policy"]["chat_provider"] == settings.protected_beta_chat_provider
    assert summary["image"]["openai"]["draft_model"]["name"] == settings.openai_image_draft_model
    assert summary["operator_policy"]["protected_beta_lock_is_temporary"] is True
    assert summary["surface_matrix"][0]["id"] == "chat:standard-assist"
    assert lookup_chat_model_pricing(settings.openai_premium_model)["reference_model"] == "gpt-5.4"


def test_build_contract_freeze_summary_distinguishes_product_and_worker_states() -> None:
    freeze = build_contract_freeze_summary()

    assert freeze["generation_statuses"] == ["queued", "running", "ready", "failed", "blocked"]
    assert freeze["product_generation_statuses"] == ["queued", "running", "ready", "failed", "blocked"]
    assert freeze["internal_job_statuses"] == [
        "queued",
        "running",
        "succeeded",
        "failed",
        "retryable_failed",
        "cancelled",
        "timed_out",
    ]
    assert freeze["state_vocabularies"][0]["layer"] == "product_surface"
    assert freeze["state_vocabularies"][1]["layer"] == "worker_runtime"
