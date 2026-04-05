from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, List

from .models import ChatAttachment, ChatMessage, ChatRole, ChatSuggestedAction
from .prompt_engineering import compact_visual_prompt


@dataclass(slots=True)
class ChatIntent:
    kind: str
    mode: str
    has_image_attachment: bool
    asks_for_generation: bool
    asks_for_edit: bool
    asks_for_analysis: bool
    asks_for_prompt_help: bool


def resolve_chat_mode(requested_model: str | None) -> str:
    normalized = (requested_model or "think").strip().lower()
    if normalized in {"think", "vision", "edit"}:
        return normalized
    return "think"


def detect_chat_intent(
    *,
    content: str,
    attachments: List[ChatAttachment],
    mode: str,
) -> ChatIntent:
    lower = content.strip().lower()
    has_image_attachment = any(attachment.kind == "image" for attachment in attachments)
    asks_for_generation = _matches_any(
        lower,
        (
            "generate",
            "create",
            "render",
            "make",
            "visual",
            "poster",
            "cover",
            "illustration",
            "artwork",
        ),
    )
    asks_for_edit = _matches_any(
        lower,
        (
            "edit",
            "retouch",
            "cleanup",
            "clean up",
            "remove",
            "replace",
            "background",
            "mask",
            "inpaint",
            "erase",
        ),
    )
    asks_for_analysis = _matches_any(
        lower,
        (
            "analyze",
            "analyse",
            "describe",
            "caption",
            "what do you see",
            "explain this image",
        ),
    )
    asks_for_prompt_help = _matches_any(
        lower,
        (
            "prompt",
            "rewrite",
            "stronger prompt",
            "better prompt",
            "improve this",
        ),
    )

    resolved_mode = (mode or "think").strip().lower()
    if resolved_mode == "edit" or (has_image_attachment and asks_for_edit):
        kind = "edit_image"
    elif asks_for_generation:
        kind = "generate_image"
    elif asks_for_prompt_help:
        kind = "prompt_help"
    elif has_image_attachment and (resolved_mode == "vision" or asks_for_analysis):
        kind = "analyze_image"
    else:
        kind = "creative_guidance"

    return ChatIntent(
        kind=kind,
        mode=resolved_mode,
        has_image_attachment=has_image_attachment,
        asks_for_generation=asks_for_generation,
        asks_for_edit=asks_for_edit,
        asks_for_analysis=asks_for_analysis,
        asks_for_prompt_help=asks_for_prompt_help,
    )


def build_chat_reply(
    *,
    intent: ChatIntent,
    content: str,
    attachments: List[ChatAttachment],
) -> tuple[str, List[ChatSuggestedAction]]:
    prompt = compact_prompt(content)

    if intent.kind == "edit_image":
        reference_note = " Use the uploaded image as the protected reference." if intent.has_image_attachment else ""
        return (
            "This reads like an edit pass. Lock what must stay, describe only what changes, and keep the instruction tight." + reference_note,
            [
                ChatSuggestedAction(label="Draft edit prompt", action="draft_prompt", value=prompt),
                ChatSuggestedAction(label="Plan edit pass", action="plan_edit", value=prompt),
            ],
        )

    if intent.kind == "analyze_image":
        return (
            "I can inspect the uploaded image directly and break down subject, composition, lighting, style, and likely prompt direction.",
            [
                ChatSuggestedAction(label="Describe this image", action="draft_prompt", value="Describe the uploaded image in detail."),
                ChatSuggestedAction(label="Turn into prompt", action="draft_prompt", value=f"Turn this image into a strong generation prompt: {prompt}".strip()),
            ],
        )

    if intent.kind == "prompt_help":
        return (
            "I would compress this into one stronger visual instruction, then keep extra constraints as edit or negative notes.",
            [
                ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt),
                ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
            ],
        )

    if intent.kind == "generate_image":
        reference_hint = ""
        if intent.has_image_attachment:
            label = next((attachment.label.strip() for attachment in attachments if attachment.kind == "image" and attachment.label.strip()), "")
            if label:
                reference_hint = f" I will treat {label} as the reference direction."
        return (
            "This is close to render-ready. Lock the subject, framing, and lighting, then send it into generation." + reference_hint,
            [
                ChatSuggestedAction(label="Draft render prompt", action="draft_prompt", value=prompt),
                ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
            ],
        )

    return (
        "I can help with prompt shaping, image analysis, or edit planning. Pick the direction and I will structure the next pass.",
        [
            ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt),
            ChatSuggestedAction(label="Describe image", action="draft_prompt", value="Describe the uploaded image in detail."),
            ChatSuggestedAction(label="Plan edit", action="plan_edit", value=prompt),
        ],
    )


def build_chat_metadata(intent: ChatIntent) -> dict[str, Any]:
    return {
        "workflow_intent": intent.kind,
        "has_image_attachment": intent.has_image_attachment,
        "asks_for_generation": intent.asks_for_generation,
        "asks_for_edit": intent.asks_for_edit,
        "asks_for_analysis": intent.asks_for_analysis,
        "asks_for_prompt_help": intent.asks_for_prompt_help,
        "can_analyze_image": intent.has_image_attachment,
        "can_generate_image": intent.kind in {"generate_image", "edit_image"},
    }


def count_user_turns(messages: Iterable[ChatMessage]) -> int:
    return sum(1 for message in messages if message.role == ChatRole.USER)


def title_from_message(content: str) -> str:
    words = content.strip().split()
    return " ".join(words[:6]).strip()[:72] or "New chat"


def conversation_seed_from_attachments(attachments: List[ChatAttachment]) -> str:
    first_image_label = next(
        (
            attachment.label.strip()
            for attachment in attachments
            if attachment.kind == "image" and attachment.label.strip()
        ),
        "",
    )
    return first_image_label or "Image reference"


def build_attachment_only_request(attachments: List[ChatAttachment], *, mode: str) -> str:
    label = conversation_seed_from_attachments(attachments)
    if mode == "edit":
        return f"Edit the uploaded reference image ({label})."
    if mode == "vision":
        return f"Use the uploaded reference image ({label}) to create or analyze a visual result."
    return f"Analyze the uploaded reference image ({label})."


def build_chat_suggested_actions(
    *,
    content: str,
    attachments: List[ChatAttachment],
    mode: str,
) -> List[ChatSuggestedAction]:
    intent = detect_chat_intent(
        content=content,
        attachments=attachments,
        mode=mode,
    )
    _, actions = build_chat_reply(intent=intent, content=content, attachments=attachments)
    return actions


def compact_prompt(content: str) -> str:
    cleaned = " ".join(content.strip().split())
    if not cleaned:
        return ""
    return compact_visual_prompt(cleaned, limit=320)


def _matches_any(content: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in content for keyword in keywords) or bool(
        re.search(r"\b(t2i|i2i|i2t)\b", content)
    )
