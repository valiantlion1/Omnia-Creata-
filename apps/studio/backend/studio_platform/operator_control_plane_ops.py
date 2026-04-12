from __future__ import annotations

from typing import Any, Mapping, Sequence

from config.env import Settings

from .ai_provider_catalog import (
    STUDIO_OPENAI_IMAGE_QUALITY_BY_MODEL_ID,
    build_ai_control_plane_summary,
    lookup_chat_model_pricing,
    resolve_openai_image_request_model,
)
from .experience_contract_ops import build_model_route_preview
from .model_catalog_ops import list_model_catalog_entries
from .models import IdentityPlan, ModelCatalogEntry


def build_operator_studio_model_catalog(
    *,
    settings: Settings,
    providers,
    studio_models: Sequence[ModelCatalogEntry],
) -> list[dict[str, Any]]:
    catalog: list[dict[str, Any]] = []
    for model in studio_models:
        default_quality = STUDIO_OPENAI_IMAGE_QUALITY_BY_MODEL_ID.get(model.id, "medium")
        request_model = resolve_openai_image_request_model(
            model_id=model.id,
            draft_image_model=settings.openai_image_draft_model,
            image_model=settings.openai_image_model,
            premium_qa_enabled=settings.openai_image_premium_qa_enabled,
        )
        default_estimated_cost = providers.estimate_generation_cost(
            provider_name="openai",
            width=1024,
            height=1024,
            model_id=model.id,
            workflow="text_to_image",
        )
        catalog.append(
            {
                "id": model.id,
                "label": model.label,
                "min_plan": model.min_plan.value,
                "credit_cost": model.credit_cost,
                "default_openai_quality": default_quality,
                "default_openai_request_model": request_model,
                "default_openai_estimated_cost_usd": default_estimated_cost,
                "route_previews": {
                    "free": build_model_route_preview(
                        model=model,
                        identity_plan=IdentityPlan.FREE,
                        providers=providers,
                    ),
                    "pro": build_model_route_preview(
                        model=model,
                        identity_plan=IdentityPlan.PRO,
                        providers=providers,
                    ),
                },
            }
        )
    return catalog


def build_operator_surface_matrix(
    *,
    settings: Settings,
    llm_gateway,
    studio_models: Sequence[Mapping[str, Any]],
) -> list[dict[str, Any]]:
    matrix: list[dict[str, Any]] = []
    for model in studio_models:
        free_route = model["route_previews"]["free"]
        pro_route = model["route_previews"]["pro"]
        matrix.append(
            {
                "id": f"create:{model['id']}",
                "surface": "create",
                "operator_role": "image_generation",
                "user_label": model["label"],
                "internal_tier": model["id"],
                "selected_provider": pro_route["planned_provider"],
                "protected_beta_default": model["id"] == "flux-schnell",
                "request_model": model["default_openai_request_model"],
                "request_quality": model["default_openai_quality"],
                "estimated_cost_usd": model["default_openai_estimated_cost_usd"],
                "free_route": {
                    "provider": free_route["planned_provider"],
                    "pricing_lane": free_route["pricing_lane"],
                },
                "pro_route": {
                    "provider": pro_route["planned_provider"],
                    "pricing_lane": pro_route["pricing_lane"],
                },
            }
        )

    matrix.extend(
        [
            _build_chat_surface_matrix_entry(
                settings=settings,
                llm_gateway=llm_gateway,
                surface_id="chat:standard-assist",
                label="Chat Assist",
                requested_model=None,
                mode="think",
                premium_chat=False,
                prompt_profile="generic",
                detail_score=1,
                premium_intent=False,
                recommended_workflow="text_to_image",
            ),
            _build_chat_surface_matrix_entry(
                settings=settings,
                llm_gateway=llm_gateway,
                surface_id="chat:premium-assist",
                label="Chat Deep Assist",
                requested_model=None,
                mode="think",
                premium_chat=True,
                prompt_profile="generic",
                detail_score=4,
                premium_intent=True,
                recommended_workflow="text_to_image",
            ),
            _build_chat_surface_matrix_entry(
                settings=settings,
                llm_gateway=llm_gateway,
                surface_id="chat:prompt-improve",
                label="Prompt Improve",
                requested_model="studio-assist",
                mode="think",
                premium_chat=True,
                prompt_profile="generic",
                detail_score=4,
                premium_intent=True,
                recommended_workflow="text_to_image",
            ),
        ]
    )
    return matrix


def build_owner_ai_control_plane(
    *,
    settings: Settings,
    providers,
    llm_gateway,
    chat_routing: Mapping[str, Any],
    generation_routing: Mapping[str, Any],
) -> dict[str, Any]:
    studio_model_catalog = build_operator_studio_model_catalog(
        settings=settings,
        providers=providers,
        studio_models=list_model_catalog_entries(),
    )
    return build_ai_control_plane_summary(
        settings=settings,
        chat_routing=chat_routing,
        generation_routing=generation_routing,
        studio_models=studio_model_catalog,
        surface_matrix=build_operator_surface_matrix(
            settings=settings,
            llm_gateway=llm_gateway,
            studio_models=studio_model_catalog,
        ),
    )


def _build_chat_surface_matrix_entry(
    *,
    settings: Settings,
    llm_gateway,
    surface_id: str,
    label: str,
    requested_model: str | None,
    mode: str,
    premium_chat: bool,
    prompt_profile: str,
    detail_score: int,
    premium_intent: bool,
    recommended_workflow: str,
) -> dict[str, Any]:
    execution_plan = llm_gateway.resolve_chat_execution_plan(
        requested_model=requested_model,
        mode=mode,
        attachments=(),
        premium_chat=premium_chat,
        prompt_profile=prompt_profile,
        detail_score=detail_score,
        premium_intent=premium_intent,
        recommended_workflow=recommended_workflow,
    )
    return {
        "id": surface_id,
        "surface": "chat",
        "operator_role": "assistant_reply" if surface_id != "chat:prompt-improve" else "prompt_improve",
        "user_label": label,
        "requested_quality_tier": execution_plan.requested_quality_tier,
        "routing_strategy": execution_plan.routing_strategy,
        "routing_reason": execution_plan.routing_reason,
        "provider_chain": [
            {
                "provider": candidate.provider,
                "model": candidate.model,
                "quality_tier": candidate.quality_tier,
                "used_fallback": candidate.used_fallback,
                "protected_beta_selected": candidate.provider == settings.protected_beta_chat_provider,
                "pricing": lookup_chat_model_pricing(candidate.model),
            }
            for candidate in execution_plan.provider_plan
        ],
    }
