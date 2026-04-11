from __future__ import annotations

from datetime import timedelta

from studio_platform.cost_telemetry_ops import (
    SURFACE_CHAT_REPLY,
    SURFACE_IMAGE_GENERATION,
    SURFACE_PROMPT_IMPROVE,
    build_cost_telemetry_summary,
)
from studio_platform.models import (
    ChatMessage,
    ChatRole,
    CostTelemetryEvent,
    GenerationJob,
    PromptSnapshot,
    StudioState,
    utc_now,
)


def _prompt_snapshot() -> PromptSnapshot:
    return PromptSnapshot(
        prompt="cinematic portrait",
        negative_prompt="",
        model="realvis-xl",
        width=1024,
        height=1024,
        steps=28,
        cfg_scale=6.5,
        seed=7,
        aspect_ratio="1:1",
    )


def test_build_cost_telemetry_summary_rolls_up_provider_model_day_and_surface() -> None:
    now = utc_now()
    state = StudioState()
    state.generations["gen-openai-1"] = GenerationJob(
        workspace_id="ws-user-1",
        project_id="project-1",
        identity_id="user-1",
        title="OpenAI render",
        status="succeeded",
        provider="openai",
        provider_billable=True,
        model="realvis-xl",
        prompt_snapshot=_prompt_snapshot(),
        estimated_cost=0.04,
        actual_cost_usd=0.85,
        credit_cost=12,
        completed_at=now,
    )
    state.chat_messages["msg-openrouter-1"] = ChatMessage(
        conversation_id="conv-1",
        identity_id="user-1",
        role=ChatRole.ASSISTANT,
        content="Here is a refined prompt",
        metadata={
            "provider": "openrouter",
            "model": "openai/gpt-5.4-mini",
            "estimated_cost_usd": 0.12,
        },
        created_at=now,
    )
    state.cost_telemetry_events["telemetry-1"] = CostTelemetryEvent(
        source_kind=SURFACE_PROMPT_IMPROVE,
        source_id="improve-1",
        identity_id="user-1",
        provider="openai",
        surface=SURFACE_PROMPT_IMPROVE,
        amount_usd=0.03,
        provider_model="gpt-5.4-mini",
        metadata={"used_llm": True},
        created_at=now,
    )

    summary = build_cost_telemetry_summary(state, window_days=30, recent_limit=10, now=now)

    assert summary["total_spend_usd"] == 1.0
    assert summary["event_count"] == 3
    assert summary["coverage"][SURFACE_PROMPT_IMPROVE] == "cost_telemetry_events"
    assert summary["providers"][0]["provider"] == "openai"
    assert summary["providers"][0]["total_spend_usd"] == 0.88
    assert {item["surface"] for item in summary["surfaces"]} == {
        SURFACE_IMAGE_GENERATION,
        SURFACE_CHAT_REPLY,
        SURFACE_PROMPT_IMPROVE,
    }
    assert summary["provider_models"][0]["model"] == "openai/gpt-5.4-mini"
    assert summary["studio_models"][0]["model"] == "realvis-xl"
    assert summary["days"][0]["day"] == now.date().isoformat()
    assert len(summary["recent_events"]) == 3


def test_build_cost_telemetry_summary_dedupes_legacy_chat_when_event_exists() -> None:
    now = utc_now()
    state = StudioState()
    state.chat_messages["msg-openai-1"] = ChatMessage(
        id="msg-openai-1",
        conversation_id="conv-1",
        identity_id="user-1",
        role=ChatRole.ASSISTANT,
        content="Live reply",
        metadata={
            "provider": "openai",
            "model": "gpt-5.4-mini",
            "estimated_cost_usd": 0.2,
        },
        created_at=now,
    )
    state.cost_telemetry_events["telemetry-chat-1"] = CostTelemetryEvent(
        source_kind=SURFACE_CHAT_REPLY,
        source_id="msg-openai-1",
        identity_id="user-1",
        provider="openai",
        surface=SURFACE_CHAT_REPLY,
        amount_usd=0.2,
        provider_model="gpt-5.4-mini",
        created_at=now,
    )

    summary = build_cost_telemetry_summary(state, window_days=30, recent_limit=10, now=now)

    assert summary["total_spend_usd"] == 0.2
    assert summary["event_count"] == 1
    assert summary["surfaces"][0]["surface"] == SURFACE_CHAT_REPLY
