from studio_platform.llm import StudioLLMGateway
from studio_platform.models import ChatAttachment


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

    assert gemini_parts == [{"text": "Inspect attachments"}]
    assert openrouter_content == [{"type": "text", "text": "Inspect attachments"}]


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
        "Elbette, bu görselin birebir aynısını üretmek için detaylı bir prompt hazırlay",
        20,
    )


def test_truncation_detector_ignores_complete_replies():
    gateway = StudioLLMGateway()

    assert not gateway._looks_truncated(
        "Elbette. Bu görsel için kısa ve temiz bir prompt hazırladım.",
        24,
    )
