import logging

import httpx
import pytest

from config.env import get_settings
from studio_platform.llm import LLMResult, StudioLLMGateway
from studio_platform.models import ChatAttachment, ChatMessage, ChatRole


def test_gemini_parts_include_inline_image_data():
    gateway = StudioLLMGateway()
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="reference.png",
        )
    ]

    parts = gateway._build_gemini_user_parts("Analyze this image", attachments)

    assert parts[0] == {"text": "Analyze this image"}
    assert parts[1]["inline_data"]["mime_type"] == "image/png"
    assert parts[1]["inline_data"]["data"] == "aGVsbG8="


def test_openrouter_content_preserves_text_and_image_url():
    gateway = StudioLLMGateway()
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/jpeg;base64,aGVsbG8=",
            asset_id=None,
            label="photo.jpg",
        )
    ]

    content = gateway._build_openrouter_user_content("Describe what you see", attachments)

    assert content[0] == {"type": "text", "text": "Describe what you see"}
    assert content[1]["type"] == "image_url"
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")


def test_openai_content_preserves_text_and_image_url():
    gateway = StudioLLMGateway()
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/jpeg;base64,aGVsbG8=",
            asset_id=None,
            label="photo.jpg",
        )
    ]

    content = gateway._build_openai_message_content("Describe what you see", attachments)

    assert content[0] == {"type": "input_text", "text": "Describe what you see"}
    assert content[1]["type"] == "input_image"
    assert content[1]["image_url"].startswith("data:image/jpeg;base64,")


def test_invalid_or_non_image_attachments_are_ignored_for_multimodal_payloads():
    gateway = StudioLLMGateway()
    attachments = [
        ChatAttachment(
            kind="file",
            url="data:text/plain;base64,aGVsbG8=",
            asset_id=None,
            label="notes.txt",
        ),
        ChatAttachment(
            kind="image",
            url="data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
            asset_id=None,
            label="vector.svg",
        ),
    ]

    gemini_parts = gateway._build_gemini_user_parts("Inspect attachments", attachments)
    openrouter_content = gateway._build_openrouter_user_content("Inspect attachments", attachments)
    openai_content = gateway._build_openai_message_content("Inspect attachments", attachments)

    assert gemini_parts == [{"text": "Inspect attachments"}]
    assert openrouter_content == [{"type": "text", "text": "Inspect attachments"}]
    assert openai_content == [{"type": "input_text", "text": "Inspect attachments"}]


def test_render_user_message_keeps_attachment_only_requests_non_empty():
    gateway = StudioLLMGateway()
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="reference.png",
        )
    ]

    rendered = gateway._render_user_message("", attachments)

    assert "without extra text" in rendered
    assert "reference.png" in rendered


def test_truncation_detector_flags_incomplete_short_outputs():
    gateway = StudioLLMGateway()

    assert gateway._looks_truncated(
        "Elbette, bu gorselin birebir aynisini uretmek icin detayli bir prompt hazirlay",
        20,
    )


def test_truncation_detector_ignores_complete_replies():
    gateway = StudioLLMGateway()

    assert not gateway._looks_truncated(
        "Elbette. Bu gorsel icin kisa ve temiz bir prompt hazirladim.",
        24,
    )


def test_premium_multimodal_plan_prefers_configured_provider_order():
    gateway = StudioLLMGateway()
    settings = get_settings()
    original = {
        "gemini_api_key": settings.gemini_api_key,
        "openrouter_api_key": settings.openrouter_api_key,
        "chat_primary_provider": settings.chat_primary_provider,
        "chat_fallback_provider": settings.chat_fallback_provider,
        "gemini_premium_model": settings.gemini_premium_model,
        "openrouter_premium_model": settings.openrouter_premium_model,
    }
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="reference.png",
        )
    ]

    try:
        settings.gemini_api_key = "gemini-key"
        settings.openrouter_api_key = "openrouter-key"
        settings.chat_primary_provider = "openrouter"
        settings.chat_fallback_provider = "gemini"
        settings.gemini_premium_model = "gemini-2.5-pro"
        settings.openrouter_premium_model = "google/gemini-2.5-pro"

        plan = gateway.resolve_chat_execution_plan(
            requested_model=None,
            mode="vision",
            attachments=attachments,
            premium_chat=True,
            prompt_profile="realistic_editorial",
            detail_score=4,
            premium_intent=True,
            recommended_workflow="edit",
        )

        assert plan.requested_quality_tier == "premium"
        assert plan.routing_reason == "premium_multimodal_chat"
        assert plan.provider_plan[0].provider == "openrouter"
        assert plan.provider_plan[0].model == "google/gemini-2.5-pro"
        assert plan.provider_plan[1].provider == "gemini"
        assert plan.provider_plan[1].model == "gemini-2.5-pro"
    finally:
        settings.gemini_api_key = original["gemini_api_key"]
        settings.openrouter_api_key = original["openrouter_api_key"]
        settings.chat_primary_provider = original["chat_primary_provider"]
        settings.chat_fallback_provider = original["chat_fallback_provider"]
        settings.gemini_premium_model = original["gemini_premium_model"]
        settings.openrouter_premium_model = original["openrouter_premium_model"]


def test_openrouter_request_body_no_longer_price_sorts_provider_fallbacks():
    gateway = StudioLLMGateway()

    body = gateway._build_openrouter_request_body(
        model="google/gemini-2.5-pro",
        system_prompt="You are helpful.",
        history=(),
        current_message="Describe the scene",
        attachments=[],
        temperature=0.45,
        max_output_tokens=1400,
    )

    assert body["model"] == "google/gemini-2.5-pro"
    assert body["temperature"] == 0.45
    assert body["max_tokens"] == 1400
    assert "provider" not in body


def test_openai_request_body_uses_responses_api_message_shape():
    gateway = StudioLLMGateway()
    attachments = [
        ChatAttachment(
            kind="image",
            url="https://example.com/reference.png",
            asset_id=None,
            label="reference.png",
        )
    ]

    body = gateway._build_openai_request_body(
        model="gpt-5.4",
        system_prompt="You are helpful.",
        history=(),
        current_message="Analyze this reference",
        attachments=attachments,
        temperature=0.45,
        max_output_tokens=1200,
    )

    assert body["model"] == "gpt-5.4"
    assert body["instructions"] == "You are helpful."
    assert body["temperature"] == 0.45
    assert body["max_output_tokens"] == 1200
    assert body["input"][0]["role"] == "user"
    assert body["input"][0]["content"][0] == {"type": "input_text", "text": "Analyze this reference"}
    assert body["input"][0]["content"][1] == {
        "type": "input_image",
        "image_url": "https://example.com/reference.png",
    }


def test_explicit_openai_model_request_routes_to_openai_provider():
    gateway = StudioLLMGateway()

    plan = gateway.resolve_chat_execution_plan(
        requested_model="gpt-5.4",
        mode="think",
        attachments=(),
        premium_chat=True,
        prompt_profile="generic",
        detail_score=1,
        premium_intent=False,
        recommended_workflow="text_to_image",
    )

    assert plan.routing_strategy == "explicit-model"
    assert plan.provider_plan[0].provider == "openai"
    assert plan.provider_plan[0].model == "gpt-5.4"
    assert plan.provider_plan[0].quality_tier == "premium"


def test_chat_system_prompt_includes_continuity_summary_when_present():
    gateway = StudioLLMGateway()

    prompt = gateway._build_chat_system_prompt(
        mode="edit",
        intent_kind="edit_image",
        prompt_profile="realistic_editorial",
        recommended_workflow="edit",
        premium_chat=True,
        continuity_summary=(
            "This is a follow-up refinement, not a fresh request. "
            "Keep the existing workflow anchored as edit. "
            "This direction remains reference-locked."
        ),
    )

    assert "Continuity context:" in prompt
    assert "follow-up refinement" in prompt
    assert "reference-locked" in prompt


def test_relevant_history_prefers_latest_visual_bridge_over_irrelevant_chatter():
    gateway = StudioLLMGateway()
    history = [
        ChatMessage(
            id=f"msg-{index}",
            conversation_id="conv-1",
            identity_id="user-1",
            role=ChatRole.USER if index % 2 == 0 else ChatRole.ASSISTANT,
            content=f"generic message {index}",
        )
        for index in range(1, 9)
    ]
    history[1] = ChatMessage(
        id="user-visual",
        conversation_id="conv-1",
        identity_id="user-1",
        role=ChatRole.USER,
        content="edit this portrait",
        attachments=[
            ChatAttachment(
                kind="image",
                url="https://example.com/portrait.png",
                asset_id="asset-portrait",
                label="portrait.png",
            )
        ],
    )
    history[2] = ChatMessage(
        id="assistant-visual",
        conversation_id="conv-1",
        identity_id="user-1",
        role=ChatRole.ASSISTANT,
        content="Locked edit direction ready.",
        parent_message_id="user-visual",
        metadata={"generation_bridge": {"workflow": "edit"}},
    )

    selected = gateway._select_relevant_history(history)
    selected_ids = [message.id for message in selected]

    assert "assistant-visual" in selected_ids
    assert "user-visual" in selected_ids
    assert "msg-1" not in selected_ids
    assert len(selected_ids) <= 6


def test_flatten_message_includes_visual_context_summary_from_bridge_metadata():
    gateway = StudioLLMGateway()
    message = ChatMessage(
        id="assistant-bridge",
        conversation_id="conv-1",
        identity_id="user-1",
        role=ChatRole.ASSISTANT,
        content="I can keep the portrait identity and push the lighting more cinematic.",
        metadata={
            "prompt_profile": "realistic_editorial",
            "creative_direction_summary": "Keep the portrait identity and push the lighting more cinematic.",
            "negative_guardrails_summary": "distortion, extra fingers, warped face",
            "follow_up_refinement": True,
            "generation_bridge": {
                "workflow": "edit",
                "prompt": "Keep the portrait identity, preserve pose, and deepen the cinematic rim light.",
                "blueprint": {
                    "workflow": "edit",
                    "model": "realvis-xl",
                    "aspect_ratio": "3:4",
                    "reference_mode": "required",
                },
            },
        },
    )

    flattened = gateway._flatten_message(message)

    assert "Visual context:" in flattened
    assert "workflow=edit" in flattened
    assert "model=realvis-xl" in flattened
    assert "aspect=3:4" in flattened
    assert "reference_mode=required" in flattened
    assert "profile=realistic_editorial" in flattened
    assert "direction=Keep the portrait identity and push the lighting more cinematic." in flattened
    assert "negative_guardrails=distortion, extra fingers, warped face" in flattened
    assert "follow_up=refinement" in flattened
    assert "planned_prompt=Keep the portrait identity" in flattened


def test_openrouter_request_body_keeps_visual_context_for_bridge_history():
    gateway = StudioLLMGateway()
    history = (
        ChatMessage(
            id="assistant-bridge",
            conversation_id="conv-1",
            identity_id="user-1",
            role=ChatRole.ASSISTANT,
            content="Locked edit direction ready.",
            metadata={
                "generation_bridge": {
                    "workflow": "edit",
                    "prompt": "Keep the portrait identity and soften the studio light.",
                    "blueprint": {
                        "workflow": "edit",
                        "model": "realvis-xl",
                        "aspect_ratio": "3:4",
                        "reference_mode": "required",
                    },
                }
            },
        ),
    )

    body = gateway._build_openrouter_request_body(
        model="google/gemini-2.5-pro",
        system_prompt="You are helpful.",
        history=history,
        current_message="Make it moodier.",
        attachments=[],
        temperature=0.45,
        max_output_tokens=1400,
    )

    assert len(body["messages"]) == 3
    assert "Visual context:" in body["messages"][1]["content"]
    assert "workflow=edit" in body["messages"][1]["content"]
    assert "model=realvis-xl" in body["messages"][1]["content"]


def test_chat_provider_failure_log_includes_http_status(caplog):
    gateway = StudioLLMGateway()
    request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
    response = httpx.Response(401, request=request)
    error = httpx.HTTPStatusError("unauthorized", request=request, response=response)

    with caplog.at_level(logging.WARNING):
        gateway._log_chat_provider_failure(
            provider="openrouter",
            model="google/gemini-2.5-pro",
            requested_quality_tier="premium",
            selected_quality_tier="premium",
            routing_strategy="premium-studio",
            routing_reason="premium_visual_direction",
            used_fallback=True,
            error=error,
        )

    assert "chat_provider_failure" in caplog.text
    assert "401" in caplog.text


@pytest.mark.asyncio
async def test_generate_chat_reply_puts_rate_limited_provider_on_cooldown_and_skips_duplicate_attempts(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    gateway = StudioLLMGateway()
    settings = get_settings()
    original = {
        "gemini_api_key": settings.gemini_api_key,
        "openrouter_api_key": settings.openrouter_api_key,
        "chat_primary_provider": settings.chat_primary_provider,
        "chat_fallback_provider": settings.chat_fallback_provider,
    }
    calls: list[tuple[str, str]] = []

    async def fake_call_provider(
        *,
        provider: str,
        model: str,
        system_prompt: str,
        history,
        current_message: str,
        attachments,
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        del system_prompt, history, current_message, attachments, temperature, max_output_tokens
        calls.append((provider, model))
        if provider == "gemini":
            request = httpx.Request("POST", "https://generativelanguage.googleapis.com/v1beta/models/test:generateContent")
            response = httpx.Response(429, request=request)
            raise httpx.HTTPStatusError("rate limited", request=request, response=response)
        return LLMResult(
            text="Premium creative direction with a clear next step.",
            provider=provider,
            model=model,
        )

    try:
        settings.gemini_api_key = "gemini-key"
        settings.openrouter_api_key = "openrouter-key"
        settings.chat_primary_provider = "gemini"
        settings.chat_fallback_provider = "openrouter"
        monkeypatch.setattr(gateway, "_call_provider", fake_call_provider)

        result = await gateway.generate_chat_reply(
            requested_model=None,
            mode="think",
            history=(),
            content="bana premium bir fashion campaign prompt direction ver",
            attachments=(),
            premium_chat=True,
            intent_kind="creative_guidance",
            prompt_profile="product_commercial",
            detail_score=4,
            premium_intent=True,
            recommended_workflow="text_to_image",
        )

        assert result is not None
        assert result.provider == "openrouter"
        assert [provider for provider, _model in calls].count("gemini") == 1
        assert [provider for provider, _model in calls].count("openrouter") == 1
        summary = gateway.routing_summary()
        assert summary["providers"]["gemini"]["status"] == "cooldown"
        assert summary["providers"]["gemini"]["last_status_code"] == 429
        assert summary["providers"]["gemini"]["cooldown_remaining_seconds"] > 0
    finally:
        settings.gemini_api_key = original["gemini_api_key"]
        settings.openrouter_api_key = original["openrouter_api_key"]
        settings.chat_primary_provider = original["chat_primary_provider"]
        settings.chat_fallback_provider = original["chat_fallback_provider"]


@pytest.mark.asyncio
async def test_improve_prompt_skips_provider_models_while_provider_is_on_cooldown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    gateway = StudioLLMGateway()
    settings = get_settings()
    original = {
        "gemini_api_key": settings.gemini_api_key,
        "openrouter_api_key": settings.openrouter_api_key,
        "chat_primary_provider": settings.chat_primary_provider,
        "chat_fallback_provider": settings.chat_fallback_provider,
    }
    calls: list[tuple[str, str]] = []

    async def fake_gemini(
        *,
        model: str,
        system_prompt: str,
        history,
        current_message: str,
        attachments,
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        del system_prompt, history, current_message, attachments, temperature, max_output_tokens
        calls.append(("gemini", model))
        request = httpx.Request("POST", "https://generativelanguage.googleapis.com/v1beta/models/test:generateContent")
        response = httpx.Response(429, request=request)
        raise httpx.HTTPStatusError("rate limited", request=request, response=response)

    async def fake_openrouter(
        *,
        model: str,
        system_prompt: str,
        history,
        current_message: str,
        attachments,
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        del system_prompt, history, current_message, attachments, temperature, max_output_tokens
        calls.append(("openrouter", model))
        return LLMResult(
            text="premium editorial portrait, confident pose, soft-box lighting, luxury fabric detail, campaign-grade finish",
            provider="openrouter",
            model=model,
        )

    try:
        settings.gemini_api_key = "gemini-key"
        settings.openrouter_api_key = "openrouter-key"
        settings.chat_primary_provider = "gemini"
        settings.chat_fallback_provider = "openrouter"
        monkeypatch.setattr(gateway, "_chat_with_gemini", fake_gemini)
        monkeypatch.setattr(gateway, "_chat_with_openrouter", fake_openrouter)

        result = await gateway.improve_prompt("fashion portrait")

        assert result is not None
        assert result.provider == "openrouter"
        assert [provider for provider, _model in calls].count("gemini") == 1
        assert [provider for provider, _model in calls].count("openrouter") == 1
        summary = gateway.routing_summary()
        assert summary["providers"]["gemini"]["status"] == "cooldown"
        assert summary["providers"]["openrouter"]["status"] == "healthy"
    finally:
        settings.gemini_api_key = original["gemini_api_key"]
        settings.openrouter_api_key = original["openrouter_api_key"]
        settings.chat_primary_provider = original["chat_primary_provider"]
        settings.chat_fallback_provider = original["chat_fallback_provider"]


@pytest.mark.asyncio
async def test_improve_prompt_can_fall_back_to_openai_when_openrouter_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    gateway = StudioLLMGateway()
    settings = get_settings()
    original = {
        "openrouter_api_key": settings.openrouter_api_key,
        "openai_api_key": settings.openai_api_key,
        "chat_primary_provider": settings.chat_primary_provider,
        "chat_fallback_provider": settings.chat_fallback_provider,
        "openrouter_premium_model": settings.openrouter_premium_model,
        "openai_premium_model": settings.openai_premium_model,
    }
    calls: list[tuple[str, str]] = []

    async def fake_openrouter(
        *,
        model: str,
        system_prompt: str,
        history,
        current_message: str,
        attachments,
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        del system_prompt, history, current_message, attachments, temperature, max_output_tokens
        calls.append(("openrouter", model))
        request = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")
        response = httpx.Response(503, request=request)
        raise httpx.HTTPStatusError("temporary outage", request=request, response=response)

    async def fake_openai(
        *,
        model: str,
        system_prompt: str,
        history,
        current_message: str,
        attachments,
        temperature: float,
        max_output_tokens: int,
    ) -> LLMResult | None:
        del system_prompt, history, current_message, attachments, temperature, max_output_tokens
        calls.append(("openai", model))
        return LLMResult(
            text="premium portrait, confident pose, soft cinematic light, refined wardrobe styling, campaign-grade finish",
            provider="openai",
            model=model,
        )

    try:
        settings.openrouter_api_key = "openrouter-key"
        settings.openai_api_key = "openai-key"
        settings.chat_primary_provider = "openrouter"
        settings.chat_fallback_provider = "openai"
        settings.openrouter_premium_model = "google/gemini-2.5-pro"
        settings.openai_premium_model = "gpt-5.4"
        monkeypatch.setattr(gateway, "_chat_with_openrouter", fake_openrouter)
        monkeypatch.setattr(gateway, "_chat_with_openai", fake_openai)

        result = await gateway.improve_prompt("cinematic portrait")

        assert result is not None
        assert result.provider == "openai"
        assert calls == [("openrouter", "google/gemini-2.5-pro"), ("openai", settings.openai_model)]
    finally:
        settings.openrouter_api_key = original["openrouter_api_key"]
        settings.openai_api_key = original["openai_api_key"]
        settings.chat_primary_provider = original["chat_primary_provider"]
        settings.chat_fallback_provider = original["chat_fallback_provider"]
        settings.openrouter_premium_model = original["openrouter_premium_model"]
        settings.openai_premium_model = original["openai_premium_model"]
