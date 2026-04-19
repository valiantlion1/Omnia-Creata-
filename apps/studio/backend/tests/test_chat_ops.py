import pytest

from studio_platform.chat_ops import (
    build_attachment_only_request,
    build_chat_continuity_summary,
    build_chat_context,
    build_chat_generation_bridge,
    build_chat_generation_blueprint,
    build_chat_metadata,
    build_chat_prompt_candidate,
    build_chat_reply,
    build_chat_suggested_actions,
    conversation_seed_from_attachments,
    detect_chat_intent,
    resolve_chat_mode,
    title_from_message,
)
from studio_platform.models import ChatAttachment, ChatMessage, ChatRole
from studio_platform.studio_model_contract import (
    STUDIO_FAST_MODEL_ID,
    STUDIO_PREMIUM_MODEL_ID,
)


def test_detect_chat_intent_prefers_image_analysis_when_reference_is_uploaded():
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="reference.png",
        )
    ]

    intent = detect_chat_intent(
        content="Analyze this image and tell me what you see",
        attachments=attachments,
        mode="vision",
    )

    assert intent.kind == "analyze_image"
    assert intent.has_image_attachment is True
    assert intent.asks_for_analysis is True


def test_chat_attachment_rejects_insecure_http_url():
    with pytest.raises(ValueError, match="Unsupported attachment URL"):
        ChatAttachment(
            kind="image",
            url="http://example.com/reference.png",
            asset_id=None,
            label="reference.png",
        )


def test_detect_chat_intent_marks_edit_requests_with_reference_image():
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="portrait.png",
        )
    ]

    intent = detect_chat_intent(
        content="Remove the background and retouch the face",
        attachments=attachments,
        mode="think",
    )

    assert intent.kind == "edit_image"
    assert intent.asks_for_edit is True


def test_chat_metadata_exposes_generation_capability_for_edit_flow():
    intent = detect_chat_intent(
        content="Create a cinematic poster from this reference",
        attachments=[
            ChatAttachment(
                kind="image",
                url="data:image/jpeg;base64,aGVsbG8=",
                asset_id=None,
                label="poster.jpg",
            )
        ],
        mode=resolve_chat_mode("vision"),
    )

    metadata = build_chat_metadata(intent)

    assert metadata["workflow_intent"] == "generate_image"
    assert metadata["can_analyze_image"] is True
    assert metadata["can_generate_image"] is True
    assert metadata["prompt_profile"] == "generic"
    assert metadata["recommended_workflow"] == "image_to_image"


def test_detect_chat_intent_keeps_vision_context_questions_out_of_generate_mode():
    attachments = [
        ChatAttachment(
            kind="image",
            url="https://example.com/reference.png",
            asset_id="asset-1",
            label="reference.png",
        )
    ]

    intent = detect_chat_intent(
        content="What could we improve in this image for the landing page?",
        attachments=attachments,
        mode="vision",
    )

    assert intent.kind == "analyze_image"
    assert intent.asks_for_generation is False


def test_attachment_only_request_uses_uploaded_label_for_context():
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="landing-hero.png",
        )
    ]

    request = build_attachment_only_request(attachments, mode="vision")

    assert "landing-hero.png" in request
    assert "visual result" in request


def test_title_seed_uses_attachment_label_when_message_is_empty():
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="brand-board.png",
        )
    ]

    seed = conversation_seed_from_attachments(attachments)

    assert title_from_message(seed) == "brand-board.png"


def test_detect_chat_intent_exposes_prompt_profile_for_product_work():
    intent = detect_chat_intent(
        content="Luxury perfume bottle packshot on a glossy black pedestal, softbox rim light, campaign photography",
        attachments=[],
        mode="think",
    )

    assert intent.kind == "generate_image"
    assert intent.prompt_profile == "product_commercial"
    assert intent.premium_intent is True
    assert intent.recommended_workflow == "text_to_image"


def test_detect_chat_intent_marks_turkish_presence_checks():
    intent = detect_chat_intent(
        content="hoyy orda misin",
        attachments=[],
        mode="think",
    )

    assert intent.kind == "presence_check"


def test_build_chat_reply_varies_for_smalltalk_when_provider_is_down():
    intent = detect_chat_intent(
        content="naber haci",
        attachments=[],
        mode="think",
    )

    response, actions = build_chat_reply(
        intent=intent,
        content="naber haci",
        attachments=[],
        provider_unavailable=True,
    )

    assert "Buradayim" in response or "Iyiyim" in response
    assert "prompt" in response.lower()
    assert any(action.action == "draft_prompt" for action in actions)


def test_build_chat_reply_for_generation_fallback_uses_profile_specific_direction():
    content = "Luxury perfume bottle packshot on a glossy black pedestal, softbox rim light, campaign photography"
    intent = detect_chat_intent(
        content=content,
        attachments=[],
        mode="think",
    )

    response, actions = build_chat_reply(
        intent=intent,
        content=content,
        attachments=[],
        provider_unavailable=True,
        premium_chat=True,
    )

    assert "product-commercial direction" in response
    assert "4:5" in response
    assert any(action.action == "open_create" for action in actions)


def test_follow_up_refinement_uses_previous_generation_bridge_context():
    assistant_message = ChatMessage(
        role=ChatRole.ASSISTANT,
        conversation_id="conv-1",
        identity_id="user-1",
        content="Here is a strong campaign direction.",
        metadata={
            "generation_bridge": {
                "workflow": "text_to_image",
                "prompt": "Luxury perfume bottle campaign shot, black pedestal, softbox rim light, premium reflections",
                "negative_prompt": "low quality",
                "blueprint": {
                    "workflow": "text_to_image",
                    "model": STUDIO_PREMIUM_MODEL_ID,
                },
            }
        },
    )

    context = build_chat_context(
        history=[assistant_message],
        content="bunu daha sinematik yap",
        attachments=[],
    )
    intent = detect_chat_intent(
        content="bunu daha sinematik yap",
        attachments=[],
        mode="think",
        context=context,
    )
    candidate = build_chat_prompt_candidate(
        intent=intent,
        content="bunu daha sinematik yap",
        attachments=[],
        context=context,
    )

    assert context.follow_up_refinement is True
    assert context.prior_workflow == "text_to_image"
    assert context.creative_direction_summary is not None
    assert "Luxury perfume bottle campaign shot" in context.creative_direction_summary
    assert intent.kind == "generate_image"
    assert "Luxury perfume bottle campaign shot" in candidate.prompt


def test_build_chat_reply_uses_follow_up_continuity_when_provider_is_down():
    assistant_message = ChatMessage(
        role=ChatRole.ASSISTANT,
        conversation_id="conv-1",
        identity_id="user-1",
        content="Here is a strong campaign direction.",
        metadata={
            "generation_bridge": {
                "workflow": "edit",
                "prompt": "Keep the portrait identity, replace the background with a luxury studio set",
                "negative_prompt": "distortion",
                "blueprint": {
                    "workflow": "edit",
                    "model": STUDIO_PREMIUM_MODEL_ID,
                },
            }
        },
    )

    context = build_chat_context(
        history=[assistant_message],
        content="bunu biraz daha temiz yap",
        attachments=[],
    )
    intent = detect_chat_intent(
        content="bunu biraz daha temiz yap",
        attachments=[],
        mode="think",
        context=context,
    )

    response, actions = build_chat_reply(
        intent=intent,
        content="bunu biraz daha temiz yap",
        attachments=[],
        provider_unavailable=True,
        context=context,
    )

    assert "carry the previous" in response.lower()
    assert any(action.action == "plan_edit" for action in actions)


def test_build_chat_prompt_candidate_tracks_edit_workflow():
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id=None,
            label="portrait.png",
        )
    ]
    intent = detect_chat_intent(
        content="Remove the background and retouch the face",
        attachments=attachments,
        mode="think",
    )

    candidate = build_chat_prompt_candidate(
        intent=intent,
        content="Remove the background and retouch the face",
        attachments=attachments,
    )

    assert candidate.workflow == "edit"
    assert candidate.prompt
    assert candidate.negative_prompt


def test_suggested_actions_use_compiled_prompt_candidate():
    content = "Luxury perfume bottle packshot on a glossy black pedestal, softbox rim light, campaign photography"
    intent = detect_chat_intent(
        content=content,
        attachments=[],
        mode="think",
    )
    candidate = build_chat_prompt_candidate(
        intent=intent,
        content=content,
        attachments=[],
    )

    actions = build_chat_suggested_actions(
        content=content,
        attachments=[],
        mode="think",
    )

    draft_action = next(action for action in actions if action.action == "draft_prompt")
    assert draft_action.value == candidate.prompt
    assert draft_action.payload["target_surface"] == "chat_composer"
    assert draft_action.payload["generation_bridge"]["prompt"] == candidate.prompt
    assert draft_action.payload["generation_bridge"]["blueprint"]["model"] == STUDIO_FAST_MODEL_ID


def test_generation_blueprint_prefers_premium_model_for_product_chat():
    content = "Luxury perfume bottle packshot on a glossy black pedestal, softbox rim light, campaign photography"
    intent = detect_chat_intent(
        content=content,
        attachments=[],
        mode="think",
    )

    blueprint = build_chat_generation_blueprint(
        intent=intent,
        content=content,
        attachments=[],
        premium_chat=True,
    )

    assert blueprint.workflow == "text_to_image"
    assert blueprint.model == STUDIO_PREMIUM_MODEL_ID
    assert blueprint.aspect_ratio == "4:5"
    assert blueprint.width == 1280
    assert blueprint.height == 1600
    assert blueprint.steps >= 30


def test_generation_blueprint_marks_reference_edit_flow():
    attachments = [
        ChatAttachment(
            kind="image",
            url="data:image/png;base64,aGVsbG8=",
            asset_id="asset-portrait",
            label="portrait.png",
        )
    ]
    intent = detect_chat_intent(
        content="Remove the background and retouch the face",
        attachments=attachments,
        mode="think",
    )

    blueprint = build_chat_generation_blueprint(
        intent=intent,
        content="Remove the background and retouch the face",
        attachments=attachments,
        premium_chat=True,
    )

    assert blueprint.workflow == "edit"
    assert blueprint.reference_mode == "required"
    assert blueprint.reference_asset_id == "asset-portrait"
    assert blueprint.model == STUDIO_PREMIUM_MODEL_ID


def test_follow_up_generation_blueprint_preserves_prior_edit_reference_settings():
    assistant_message = ChatMessage(
        role=ChatRole.ASSISTANT,
        conversation_id="conv-1",
        identity_id="user-1",
        content="Here is the locked edit direction.",
        metadata={
            "generation_bridge": {
                "workflow": "edit",
                "prompt": "Keep the portrait identity, preserve pose, swap the background for a luxury studio set",
                "negative_prompt": "distortion, extra fingers",
                "reference_asset_id": "asset-portrait",
                "blueprint": {
                    "workflow": "edit",
                    "reference_asset_id": "asset-portrait",
                    "model": STUDIO_PREMIUM_MODEL_ID,
                    "width": 1400,
                    "height": 1800,
                    "steps": 33,
                    "cfg_scale": 5.5,
                    "aspect_ratio": "3:4",
                    "output_count": 2,
                    "reference_mode": "required",
                },
            }
        },
    )

    context = build_chat_context(
        history=[assistant_message],
        content="bunu biraz daha soft yap",
        attachments=[],
    )
    intent = detect_chat_intent(
        content="bunu biraz daha soft yap",
        attachments=[],
        mode="think",
        context=context,
    )

    blueprint = build_chat_generation_blueprint(
        intent=intent,
        content="bunu biraz daha soft yap",
        attachments=[],
        premium_chat=False,
        context=context,
    )

    assert context.follow_up_refinement is True
    assert intent.kind == "edit_image"
    assert blueprint.workflow == "edit"
    assert blueprint.reference_mode == "required"
    assert blueprint.reference_asset_id == "asset-portrait"
    assert blueprint.model == STUDIO_PREMIUM_MODEL_ID
    assert blueprint.width == 1400
    assert blueprint.height == 1800
    assert blueprint.steps == 33
    assert blueprint.cfg_scale == 5.5
    assert blueprint.aspect_ratio == "3:4"
    assert blueprint.output_count == 2
    assert "distortion" in blueprint.negative_prompt
    assert "extra fingers" in blueprint.negative_prompt


def test_chat_generation_bridge_recovers_reference_asset_id_from_prior_visual_turn():
    user_message = ChatMessage(
        role=ChatRole.USER,
        conversation_id="conv-1",
        identity_id="user-1",
        content="Edit this portrait",
        attachments=[
            ChatAttachment(
                kind="image",
                url="https://example.com/portrait.png",
                asset_id="asset-portrait",
                label="portrait.png",
            )
        ],
    )
    assistant_message = ChatMessage(
        role=ChatRole.ASSISTANT,
        conversation_id="conv-1",
        identity_id="user-1",
        content="I will keep the identity and replace the background.",
        parent_message_id=user_message.id,
        metadata={
            "generation_bridge": {
                "workflow": "edit",
                "prompt": "Keep the portrait identity and replace the background with a luxury studio set",
                "negative_prompt": "distortion",
                "reference_asset_id": "asset-portrait",
                "blueprint": {
                    "workflow": "edit",
                    "reference_asset_id": "asset-portrait",
                    "model": STUDIO_PREMIUM_MODEL_ID,
                    "width": 1400,
                    "height": 1800,
                    "steps": 33,
                    "cfg_scale": 5.5,
                    "aspect_ratio": "3:4",
                    "output_count": 1,
                    "reference_mode": "required",
                },
            }
        },
    )

    context = build_chat_context(
        history=[user_message, assistant_message],
        content="bunu biraz daha soft yap",
        attachments=[],
    )
    intent = detect_chat_intent(
        content="bunu biraz daha soft yap",
        attachments=[],
        mode="think",
        context=context,
    )
    generation_bridge = build_chat_generation_bridge(
        intent=intent,
        content="bunu biraz daha soft yap",
        attachments=[],
        premium_chat=True,
        context=context,
    )

    assert context.reference_asset_id == "asset-portrait"
    assert generation_bridge["reference_asset_id"] == "asset-portrait"
    assert generation_bridge["blueprint"]["reference_asset_id"] == "asset-portrait"


def test_chat_generation_bridge_preserves_prior_negative_prompt_during_follow_up_refinement():
    assistant_message = ChatMessage(
        role=ChatRole.ASSISTANT,
        conversation_id="conv-1",
        identity_id="user-1",
        content="Locked edit direction ready.",
        metadata={
            "generation_bridge": {
                "workflow": "edit",
                "prompt": "Keep the portrait identity and replace the background with a luxury studio set",
                "negative_prompt": "distortion, extra fingers, warped face",
                "blueprint": {
                    "workflow": "edit",
                    "reference_asset_id": "asset-portrait",
                    "model": STUDIO_PREMIUM_MODEL_ID,
                    "reference_mode": "required",
                },
            }
        },
    )

    context = build_chat_context(
        history=[assistant_message],
        content="bunu biraz daha soft yap",
        attachments=[],
    )
    intent = detect_chat_intent(
        content="bunu biraz daha soft yap",
        attachments=[],
        mode="think",
        context=context,
    )
    generation_bridge = build_chat_generation_bridge(
        intent=intent,
        content="bunu biraz daha soft yap",
        attachments=[],
        premium_chat=True,
        context=context,
    )

    assert "distortion" in generation_bridge["negative_prompt"]
    assert "extra fingers" in generation_bridge["negative_prompt"]
    assert generation_bridge["negative_prompt"] == generation_bridge["blueprint"]["negative_prompt"]


def test_chat_continuity_summary_carries_prior_visual_plan_constraints():
    assistant_message = ChatMessage(
        role=ChatRole.ASSISTANT,
        conversation_id="conv-1",
        identity_id="user-1",
        content="Locked edit direction ready.",
        metadata={
            "generation_bridge": {
                "workflow": "edit",
                "prompt": "Keep the portrait identity and soften the studio light.",
                "negative_prompt": "distortion",
                "reference_asset_id": "asset-portrait",
                "blueprint": {
                    "workflow": "edit",
                    "reference_asset_id": "asset-portrait",
                    "model": STUDIO_PREMIUM_MODEL_ID,
                    "aspect_ratio": "3:4",
                    "reference_mode": "required",
                },
            }
        },
    )

    context = build_chat_context(
        history=[assistant_message],
        content="bunu biraz daha sinematik yap",
        attachments=[],
    )
    intent = detect_chat_intent(
        content="bunu biraz daha sinematik yap",
        attachments=[],
        mode="think",
        context=context,
    )
    generation_bridge = build_chat_generation_bridge(
        intent=intent,
        content="bunu biraz daha sinematik yap",
        attachments=[],
        premium_chat=True,
        context=context,
    )

    summary = build_chat_continuity_summary(
        intent=intent,
        context=context,
        generation_bridge=generation_bridge,
    )

    assert summary is not None
    assert "follow-up refinement" in summary
    assert "edit" in summary
    assert STUDIO_PREMIUM_MODEL_ID in summary
    assert "3:4" in summary
    assert "reference-locked" in summary
    assert "Keep the established creative direction anchored around" in summary
    assert "Keep the established exclusion guardrails intact: distortion" in summary


def test_chat_metadata_exposes_creative_direction_summary_for_follow_up_context():
    assistant_message = ChatMessage(
        role=ChatRole.ASSISTANT,
        conversation_id="conv-1",
        identity_id="user-1",
        content="Keep the portrait identity and deepen the cinematic studio mood.",
        metadata={
            "prompt_profile": "realistic_editorial",
            "generation_bridge": {
                "workflow": "edit",
                "prompt": "Keep the portrait identity and deepen the cinematic studio mood.",
                "negative_prompt": "distortion, extra fingers",
                "blueprint": {
                    "workflow": "edit",
                    "model": STUDIO_PREMIUM_MODEL_ID,
                    "aspect_ratio": "3:4",
                    "reference_mode": "required",
                },
            },
        },
    )

    context = build_chat_context(
        history=[assistant_message],
        content="bunu biraz daha premium yap",
        attachments=[],
    )
    intent = detect_chat_intent(
        content="bunu biraz daha premium yap",
        attachments=[],
        mode="think",
        context=context,
    )
    metadata = build_chat_metadata(intent, context=context)

    assert metadata["creative_direction_summary"] is not None
    assert "portrait identity" in metadata["creative_direction_summary"]
    assert metadata["negative_guardrails_summary"] == "distortion, extra fingers"
    assert metadata["prior_prompt_profile"] == "realistic_editorial"
