from __future__ import annotations

from datetime import timedelta

from config.env import Environment, get_settings
from studio_platform.models import ChatMessage, ChatRole, CostTelemetryEvent, GenerationJob, PromptSnapshot, StudioState
from studio_platform.provider_spend_guardrails import (
    ProviderDailySpendSummary,
    evaluate_provider_spend_guardrail,
    summarize_provider_daily_spend,
)
from studio_platform.models import utc_now


def _prompt_snapshot() -> PromptSnapshot:
    return PromptSnapshot(
        prompt="cinematic portrait",
        negative_prompt="",
        model="flux-schnell",
        width=1024,
        height=1024,
        steps=28,
        cfg_scale=6.5,
        seed=7,
        aspect_ratio="1:1",
    )


def test_summarize_provider_daily_spend_counts_generation_and_chat_costs() -> None:
    now = utc_now()
    state = StudioState()
    state.generations["gen-openai-today"] = GenerationJob(
        workspace_id="ws-user-1",
        project_id="project-1",
        identity_id="user-1",
        title="OpenAI render",
        status="succeeded",
        provider="openai",
        model="realvis-xl",
        prompt_snapshot=_prompt_snapshot(),
        estimated_cost=0.04,
        actual_cost_usd=0.85,
        credit_cost=12,
        completed_at=now,
    )
    state.generations["gen-openai-old"] = GenerationJob(
        workspace_id="ws-user-1",
        project_id="project-1",
        identity_id="user-1",
        title="Old OpenAI render",
        status="succeeded",
        provider="openai",
        model="realvis-xl",
        prompt_snapshot=_prompt_snapshot(),
        estimated_cost=0.04,
        actual_cost_usd=0.4,
        credit_cost=12,
        completed_at=now - timedelta(days=1),
    )
    state.chat_messages["msg-openai-today"] = ChatMessage(
        conversation_id="conv-1",
        identity_id="user-1",
        role=ChatRole.ASSISTANT,
        content="Here is a refined prompt",
        metadata={"provider": "openai", "estimated_cost_usd": 0.12},
        created_at=now,
    )
    state.chat_messages["msg-openai-old"] = ChatMessage(
        conversation_id="conv-1",
        identity_id="user-1",
        role=ChatRole.ASSISTANT,
        content="Older refined prompt",
        metadata={"provider": "openai", "estimated_cost_usd": 0.22},
        created_at=now - timedelta(days=1),
    )
    state.cost_telemetry_events["telemetry-openai-improve"] = CostTelemetryEvent(
        source_kind="prompt_improve",
        source_id="improve-1",
        identity_id="user-1",
        provider="openai",
        surface="prompt_improve",
        amount_usd=0.03,
        provider_model="gpt-5.4-mini",
        created_at=now,
    )

    summary = summarize_provider_daily_spend(state, provider_name="openai", now=now)

    assert round(summary.generation_spend_usd, 6) == 0.85
    assert round(summary.chat_spend_usd, 6) == 0.12
    assert round(summary.prompt_improve_spend_usd, 6) == 0.03
    assert round(summary.total_spend_usd, 6) == 1.0
    assert summary.generation_count == 1
    assert summary.chat_count == 1
    assert summary.prompt_improve_count == 1


def test_evaluate_provider_spend_guardrail_warns_above_soft_cap_in_development() -> None:
    settings = get_settings()
    original_environment = settings.environment
    original_soft = settings.development_billable_provider_daily_soft_cap_usd
    original_hard = settings.development_billable_provider_daily_hard_cap_usd
    original_enabled = settings.provider_spend_guardrails_enabled
    try:
        settings.environment = Environment.DEVELOPMENT
        settings.provider_spend_guardrails_enabled = True
        settings.development_billable_provider_daily_soft_cap_usd = 1.0
        settings.development_billable_provider_daily_hard_cap_usd = 2.0
        status = evaluate_provider_spend_guardrail(
            settings,
            provider_name="openai",
            provider_billable=True,
            spend_summary=ProviderDailySpendSummary(
                provider="openai",
                window_start=utc_now(),
                window_end=utc_now(),
                generation_spend_usd=0.95,
                chat_spend_usd=0.0,
                prompt_improve_spend_usd=0.0,
                generation_count=1,
                chat_count=0,
                prompt_improve_count=0,
            ),
            projected_cost_usd=0.1,
        )
    finally:
        settings.environment = original_environment
        settings.development_billable_provider_daily_soft_cap_usd = original_soft
        settings.development_billable_provider_daily_hard_cap_usd = original_hard
        settings.provider_spend_guardrails_enabled = original_enabled

    assert status.status == "warning"
    assert status.reason == "soft_cap_exceeded"
    assert status.soft_cap_usd == 1.0
    assert status.hard_cap_usd == 2.0


def test_evaluate_provider_spend_guardrail_blocks_on_emergency_disable() -> None:
    settings = get_settings()
    original_disabled = settings.provider_spend_emergency_disabled
    original_enabled = settings.provider_spend_guardrails_enabled
    try:
        settings.provider_spend_guardrails_enabled = True
        settings.provider_spend_emergency_disabled = "openai"
        status = evaluate_provider_spend_guardrail(
            settings,
            provider_name="openai",
            provider_billable=True,
            spend_summary=ProviderDailySpendSummary(
                provider="openai",
                window_start=utc_now(),
                window_end=utc_now(),
                generation_spend_usd=0.05,
                chat_spend_usd=0.01,
                prompt_improve_spend_usd=0.0,
                generation_count=1,
                chat_count=1,
                prompt_improve_count=0,
            ),
            projected_cost_usd=0.02,
        )
    finally:
        settings.provider_spend_emergency_disabled = original_disabled
        settings.provider_spend_guardrails_enabled = original_enabled

    assert status.status == "blocked"
    assert status.reason == "emergency_disabled"
    assert status.emergency_disabled is True
