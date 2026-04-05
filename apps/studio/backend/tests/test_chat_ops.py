from studio_platform.chat_ops import (
    build_attachment_only_request,
    build_chat_metadata,
    conversation_seed_from_attachments,
    detect_chat_intent,
    resolve_chat_mode,
    title_from_message,
)
from studio_platform.models import ChatAttachment


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
