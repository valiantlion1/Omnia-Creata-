from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Iterable, List

from .models import ChatAttachment, ChatMessage, ChatRole, ChatSuggestedAction
from .prompt_engineering import (
    analyze_generation_prompt_profile,
    compact_visual_prompt,
    compile_generation_request,
)
from .studio_model_contract import STUDIO_FAST_MODEL_ID, STUDIO_PREMIUM_MODEL_ID


@dataclass(slots=True)
class ChatIntent:
    kind: str
    mode: str
    has_image_attachment: bool
    asks_for_generation: bool
    asks_for_edit: bool
    asks_for_analysis: bool
    asks_for_prompt_help: bool
    prompt_profile: str
    detail_score: int
    premium_intent: bool
    recommended_workflow: str


@dataclass(slots=True)
class ChatPromptCandidate:
    prompt: str
    negative_prompt: str
    workflow: str


@dataclass(slots=True)
class ChatGenerationBlueprint:
    workflow: str
    prompt: str
    negative_prompt: str
    reference_asset_id: str | None
    model: str
    width: int
    height: int
    steps: int
    cfg_scale: float
    aspect_ratio: str
    output_count: int
    reference_mode: str


@dataclass(slots=True)
class ChatConversationContext:
    last_user_message: str = ""
    last_assistant_message: str = ""
    last_generation_bridge: dict[str, Any] | None = None
    reference_asset_id: str | None = None
    follow_up_refinement: bool = False
    prior_workflow: str | None = None
    creative_direction_summary: str | None = None
    prior_prompt_profile: str | None = None


def build_chat_generation_bridge(
    *,
    intent: ChatIntent,
    content: str,
    attachments: List[ChatAttachment],
    premium_chat: bool,
    context: ChatConversationContext | None = None,
) -> dict[str, Any]:
    candidate = build_chat_prompt_candidate(
        intent=intent,
        content=content,
        attachments=attachments,
        context=context,
    )
    blueprint = build_chat_generation_blueprint(
        intent=intent,
        content=content,
        attachments=attachments,
        premium_chat=premium_chat,
        context=context,
    )
    return {
        "workflow": candidate.workflow,
        "prompt": candidate.prompt,
        "negative_prompt": blueprint.negative_prompt,
        "reference_asset_id": blueprint.reference_asset_id,
        "blueprint": {
            "workflow": blueprint.workflow,
            "prompt": blueprint.prompt,
            "negative_prompt": blueprint.negative_prompt,
            "reference_asset_id": blueprint.reference_asset_id,
            "model": blueprint.model,
            "width": blueprint.width,
            "height": blueprint.height,
            "steps": blueprint.steps,
            "cfg_scale": blueprint.cfg_scale,
            "aspect_ratio": blueprint.aspect_ratio,
            "output_count": blueprint.output_count,
            "reference_mode": blueprint.reference_mode,
        },
    }


def build_chat_continuity_summary(
    *,
    intent: ChatIntent,
    context: ChatConversationContext | None = None,
    generation_bridge: dict[str, Any] | None = None,
) -> str | None:
    if context is None or not context.follow_up_refinement:
        return None
    bridge = generation_bridge if isinstance(generation_bridge, dict) else context.last_generation_bridge
    if not isinstance(bridge, dict):
        return None
    blueprint = bridge.get("blueprint") if isinstance(bridge.get("blueprint"), dict) else {}
    workflow = str(blueprint.get("workflow") or bridge.get("workflow") or context.prior_workflow or intent.recommended_workflow or "").strip()
    model = str(blueprint.get("model") or "").strip()
    aspect_ratio = str(blueprint.get("aspect_ratio") or "").strip()
    reference_mode = str(blueprint.get("reference_mode") or "").strip()
    reference_asset_id = (
        str(blueprint.get("reference_asset_id") or bridge.get("reference_asset_id") or context.reference_asset_id or "").strip()
    )

    parts = [
        "This is a follow-up refinement, not a fresh request.",
    ]
    if workflow:
        parts.append(f"Keep the existing workflow anchored as {workflow}.")
    if intent.kind == "edit_image" or workflow == "edit":
        parts.append("Preserve identity, pose, framing, and protected details before describing any change.")
    if model:
        parts.append(f"Stay compatible with the current generation model plan ({model}).")
    if aspect_ratio:
        parts.append(f"Keep the established format and composition frame ({aspect_ratio}) unless the user explicitly changes it.")
    if reference_mode == "required":
        parts.append("This direction remains reference-locked.")
    if reference_asset_id:
        parts.append("A specific source image is already attached to this direction; refine from it instead of restarting from zero.")
    if context.creative_direction_summary:
        parts.append(
            f"Keep the established creative direction anchored around: {context.creative_direction_summary}."
        )
    negative_guardrails_summary = _negative_guardrails_summary(context)
    if negative_guardrails_summary:
        parts.append(
            f"Keep the established exclusion guardrails intact: {negative_guardrails_summary}."
        )
    if context.prior_prompt_profile:
        parts.append(f"The current visual lane is still closest to {context.prior_prompt_profile}.")
    return " ".join(parts).strip()


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
    context: ChatConversationContext | None = None,
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
            "packshot",
            "pack shot",
            "campaign",
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
    asks_if_present = _matches_phrase(
        lower,
        (
            "orada misin",
            "orda misin",
            "burada misin",
            "burda misin",
            "you there",
            "are you there",
            "you around",
            "still there",
        ),
    )
    casual_smalltalk = _matches_phrase(
        lower,
        (
            "naber",
            "napıy",
            "napiy",
            "nasilsin",
            "selam",
            "merhaba",
            "hey",
            "yo",
            "sup",
            "hello",
            "hi",
        ),
    )

    resolved_mode = (mode or "think").strip().lower()
    suggested_workflow = "text_to_image"
    if resolved_mode == "edit" or (has_image_attachment and asks_for_edit):
        suggested_workflow = "edit"
    elif has_image_attachment and asks_for_generation:
        suggested_workflow = "image_to_image"

    profile_analysis = analyze_generation_prompt_profile(
        prompt=content or conversation_seed_from_attachments(attachments),
        workflow=suggested_workflow,
        has_reference_image=has_image_attachment,
    )

    prior_workflow = context.prior_workflow if context is not None else None
    is_follow_up_refinement = context.follow_up_refinement if context is not None else False

    if resolved_mode == "edit" or (has_image_attachment and asks_for_edit):
        kind = "edit_image"
    elif is_follow_up_refinement and prior_workflow == "edit":
        kind = "edit_image"
        asks_for_edit = True
    elif asks_for_generation:
        kind = "generate_image"
    elif is_follow_up_refinement and prior_workflow in {"text_to_image", "image_to_image"}:
        kind = "generate_image"
        asks_for_generation = True
    elif asks_for_prompt_help:
        kind = "prompt_help"
    elif has_image_attachment and (resolved_mode == "vision" or asks_for_analysis):
        kind = "analyze_image"
    elif asks_if_present:
        kind = "presence_check"
    elif casual_smalltalk:
        kind = "casual_chat"
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
        prompt_profile=profile_analysis.profile,
        detail_score=profile_analysis.detail_score,
        premium_intent=profile_analysis.premium_intent,
        recommended_workflow=profile_analysis.workflow,
    )


def build_chat_reply(
    *,
    intent: ChatIntent,
    content: str,
    attachments: List[ChatAttachment],
    provider_unavailable: bool = False,
    premium_chat: bool = False,
    context: ChatConversationContext | None = None,
) -> tuple[str, List[ChatSuggestedAction]]:
    prompt = compact_prompt(content)
    prompt_candidate = build_chat_prompt_candidate(
        intent=intent,
        content=content,
        attachments=attachments,
        context=context,
    )
    blueprint = build_chat_generation_blueprint(
        intent=intent,
        content=content,
        attachments=attachments,
        premium_chat=premium_chat,
        context=context,
    )

    if (
        provider_unavailable
        and context is not None
        and context.follow_up_refinement
        and context.last_generation_bridge is not None
    ):
        prior_workflow = context.prior_workflow or intent.recommended_workflow
        prior_prompt = str(context.last_generation_bridge.get("prompt") or "").strip()
        continuation = (
            "I can carry the previous direction forward and refine it with this adjustment."
            if prior_workflow != "edit"
            else "I can carry the previous edit direction forward and apply this change on top of the locked reference."
        )
        body = continuation
        if prior_prompt:
            body += " I will keep the core scene intact and tune the next pass instead of starting from zero."
        action_label = "Plan edit" if prior_workflow == "edit" else "Open Create"
        action_value = prompt_candidate.prompt or prompt or prior_prompt
        return (
            body,
            [
                ChatSuggestedAction(label="Draft refinement", action="draft_prompt", value=action_value),
                ChatSuggestedAction(label=action_label, action="plan_edit" if prior_workflow == "edit" else "open_create", value=action_value),
            ],
        )

    if intent.kind == "edit_image":
        reference_note = " Use the uploaded image as the protected reference." if intent.has_image_attachment else ""
        if provider_unavailable:
            locked_reference_note = (
                " The reference stays locked through the next pass."
                if blueprint.reference_mode == "required"
                else ""
            )
            return (
                "The live chat model is down, but the edit plan is stable. "
                f"I would keep this as a {blueprint.workflow} pass, preserve identity, framing, and protected details first, "
                "then apply only the requested change layer in the next render." + locked_reference_note,
                [
                    ChatSuggestedAction(label="Draft edit prompt", action="draft_prompt", value=prompt_candidate.prompt or prompt),
                    ChatSuggestedAction(label="Plan edit pass", action="plan_edit", value=prompt_candidate.prompt or prompt),
                ],
            )
        return (
            "This is an edit pass. Lock identity, pose, framing, and core lighting first, then describe only the change layer." + reference_note,
            [
                ChatSuggestedAction(label="Draft edit prompt", action="draft_prompt", value=prompt_candidate.prompt or prompt),
                ChatSuggestedAction(label="Plan edit pass", action="plan_edit", value=prompt_candidate.prompt or prompt),
            ],
        )

    if intent.kind == "analyze_image":
        return (
            "I can inspect the uploaded image directly, call out what is working, and turn it into a cleaner generation or edit direction.",
            [
                ChatSuggestedAction(label="Describe this image", action="draft_prompt", value="Describe the uploaded image in detail."),
                ChatSuggestedAction(label="Turn into prompt", action="draft_prompt", value=prompt_candidate.prompt or f"Turn this image into a strong generation prompt: {prompt}".strip()),
            ],
        )

    if intent.kind == "prompt_help":
        if provider_unavailable:
            direction = _profile_direction_summary(intent.prompt_profile)
            return (
                "The live chat model is down, but the prompt pass is already shaped. "
                f"I would keep it in a {direction}, tighten subject clarity, framing, and finish quality, "
                "then use the compiled prompt as the next render-ready version.",
                [
                    ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt_candidate.prompt or prompt),
                    ChatSuggestedAction(label="Open Create", action="open_create", value=prompt_candidate.prompt or prompt),
                ],
            )
        return (
            "I would compress this into one stronger visual instruction, then keep constraints, exclusions, and edit notes separate so the output stays clean.",
            [
                ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt_candidate.prompt or prompt),
                ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
            ],
        )

    if intent.kind == "generate_image":
        reference_hint = ""
        if intent.has_image_attachment:
            label = next((attachment.label.strip() for attachment in attachments if attachment.kind == "image" and attachment.label.strip()), "")
            if label:
                reference_hint = f" I will treat {label} as the reference direction."
        if provider_unavailable:
            direction = _profile_direction_summary(intent.prompt_profile)
            return (
                "The live chat model is down, but the render direction is still clear. "
                f"I would keep this as a {direction} on a {blueprint.aspect_ratio} {blueprint.workflow.replace('_', '-')} pass, "
                "lock the subject and finish quality, then send one clean prompt into Create." + reference_hint,
                [
                    ChatSuggestedAction(label="Draft render prompt", action="draft_prompt", value=prompt_candidate.prompt or prompt),
                    ChatSuggestedAction(label="Open Create", action="open_create", value=prompt_candidate.prompt or prompt),
                ],
            )
        return (
            "This is close to render-ready. Lock the subject, framing, lighting, and finish quality, then send one clean prompt into generation." + reference_hint,
            [
                ChatSuggestedAction(label="Draft render prompt", action="draft_prompt", value=prompt_candidate.prompt or prompt),
                ChatSuggestedAction(label="Open Create", action="open_create", value="/create"),
            ],
        )

    if intent.kind == "presence_check":
        body = (
            "Buradayim. Canli chat modeli su an kesintili calisiyor, ama yine de promptu netlestirebilir, "
            "gorseli yorumlayabilir veya edit planini kurabilirim."
            if provider_unavailable
            else "Buradayim. Fikri netlestirelim; ister promptu keskinlestireyim, ister gorsel analizine ya da edit planina gireyim."
        )
        return (
            body,
            [
                ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt),
                ChatSuggestedAction(label="Describe image", action="draft_prompt", value="Describe the uploaded image in detail."),
                ChatSuggestedAction(label="Plan edit", action="plan_edit", value=prompt),
            ],
        )

    if intent.kind == "casual_chat":
        body = (
            "Iyiyim haci, buradayim. Canli model su an stabil degil, o yuzden daha cok studio copilot modundayim. "
            "Istersen bir fikri prompta cevirelim, bir gorseli cozelim ya da edit akisini kuralim."
            if provider_unavailable
            else "Buradayim haci. Istersen bir fikirden render-ready prompt cikaralim, bir gorseli yorumlayalim ya da edit akisini planlayalim."
        )
        return (
            body,
            [
                ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt),
                ChatSuggestedAction(label="Describe image", action="draft_prompt", value="Describe the uploaded image in detail."),
                ChatSuggestedAction(label="Plan edit", action="plan_edit", value=prompt),
            ],
        )

    if provider_unavailable and intent.kind == "creative_guidance":
        direction = _profile_direction_summary(intent.prompt_profile)
        return (
            "The live chat model is down, but I can still steer the next pass like a Studio copilot. "
            f"I would push this toward a {direction}, then lock one clear subject, one framing choice, and one finish target before generation.",
            [
                ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt_candidate.prompt or prompt),
                ChatSuggestedAction(label="Open Create", action="open_create", value=prompt_candidate.prompt or prompt),
            ],
        )

    if provider_unavailable:
        return (
            "The live chat model is currently unavailable, so I am falling back to Studio guidance mode. "
            "I can still sharpen the prompt, inspect an image, or structure an edit plan while the provider lane recovers.",
            [
                ChatSuggestedAction(label="Sharpen prompt", action="draft_prompt", value=prompt),
                ChatSuggestedAction(label="Describe image", action="draft_prompt", value="Describe the uploaded image in detail."),
                ChatSuggestedAction(label="Plan edit", action="plan_edit", value=prompt),
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


def build_chat_metadata(intent: ChatIntent, *, context: ChatConversationContext | None = None) -> dict[str, Any]:
    metadata = {
        "workflow_intent": intent.kind,
        "has_image_attachment": intent.has_image_attachment,
        "asks_for_generation": intent.asks_for_generation,
        "asks_for_edit": intent.asks_for_edit,
        "asks_for_analysis": intent.asks_for_analysis,
        "asks_for_prompt_help": intent.asks_for_prompt_help,
        "can_analyze_image": intent.has_image_attachment,
        "can_generate_image": intent.kind in {"generate_image", "edit_image"},
        "prompt_profile": intent.prompt_profile,
        "detail_score": intent.detail_score,
        "premium_intent": intent.premium_intent,
        "recommended_workflow": intent.recommended_workflow,
    }
    if context is not None:
        metadata.update(
            {
                "follow_up_refinement": context.follow_up_refinement,
                "has_prior_generation_bridge": bool(context.last_generation_bridge),
                "prior_workflow": context.prior_workflow,
                "creative_direction_summary": context.creative_direction_summary,
                "negative_guardrails_summary": _negative_guardrails_summary(context),
                "prior_prompt_profile": context.prior_prompt_profile,
            }
        )
    return metadata


def build_chat_context(
    *,
    history: Iterable[ChatMessage],
    content: str,
    attachments: List[ChatAttachment],
) -> ChatConversationContext:
    ordered = sorted(history, key=lambda item: item.created_at)
    last_user_message = ""
    last_assistant_message = ""
    last_generation_bridge: dict[str, Any] | None = None
    reference_asset_id: str | None = None
    prior_workflow: str | None = None
    prior_prompt_profile: str | None = None

    for message in reversed(ordered):
        if not last_assistant_message and message.role == ChatRole.ASSISTANT:
            last_assistant_message = message.content.strip()
            bridge = message.metadata.get("generation_bridge")
            if isinstance(bridge, dict):
                last_generation_bridge = bridge
                if reference_asset_id is None:
                    reference_asset_id = _reference_asset_id_from_bridge(bridge)
                workflow = bridge.get("workflow")
                if isinstance(workflow, str) and workflow.strip():
                    prior_workflow = workflow.strip()
            prompt_profile = message.metadata.get("prompt_profile")
            if isinstance(prompt_profile, str) and prompt_profile.strip():
                prior_prompt_profile = prompt_profile.strip()
        if reference_asset_id is None and message.role == ChatRole.USER:
            reference_asset_id = _reference_asset_id_from_attachments(message.attachments)
        if not last_user_message and message.role == ChatRole.USER:
            last_user_message = message.content.strip()
        if last_user_message and last_assistant_message and reference_asset_id is not None:
            break

    if prior_workflow is None and last_generation_bridge is not None:
        blueprint = last_generation_bridge.get("blueprint")
        if isinstance(blueprint, dict):
            workflow = blueprint.get("workflow")
            if isinstance(workflow, str) and workflow.strip():
                prior_workflow = workflow.strip()

    return ChatConversationContext(
        last_user_message=last_user_message,
        last_assistant_message=last_assistant_message,
        last_generation_bridge=last_generation_bridge,
        reference_asset_id=reference_asset_id,
        follow_up_refinement=_looks_like_follow_up_refinement(
            content=content,
            attachments=attachments,
            last_generation_bridge=last_generation_bridge,
        ),
        prior_workflow=prior_workflow,
        creative_direction_summary=_summarize_creative_direction(
            generation_bridge=last_generation_bridge,
            assistant_message=last_assistant_message,
            user_message=last_user_message,
        ),
        prior_prompt_profile=prior_prompt_profile,
    )


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
    premium_chat: bool = False,
    context: ChatConversationContext | None = None,
) -> List[ChatSuggestedAction]:
    intent = detect_chat_intent(
        content=content,
        attachments=attachments,
        mode=mode,
        context=context,
    )
    generation_bridge = build_chat_generation_bridge(
        intent=intent,
        content=content,
        attachments=attachments,
        premium_chat=premium_chat,
        context=context,
    )
    _, actions = build_chat_reply(intent=intent, content=content, attachments=attachments, context=context)
    enhanced_actions: List[ChatSuggestedAction] = []
    for action in actions:
        action_value = action.value
        if generation_bridge["prompt"] and action.action in {"draft_prompt", "plan_edit"}:
            action_value = generation_bridge["prompt"]
        enhanced_actions.append(
            ChatSuggestedAction(
                label=action.label,
                action=action.action,
                value=action_value,
                payload=build_chat_action_payload(
                    action=action.action,
                    generation_bridge=generation_bridge,
                    intent=intent,
                ),
            )
        )
    return enhanced_actions


def build_chat_prompt_candidate(
    *,
    intent: ChatIntent,
    content: str,
    attachments: List[ChatAttachment],
    context: ChatConversationContext | None = None,
) -> ChatPromptCandidate:
    source = _resolve_contextual_prompt_source(
        content=content,
        attachments=attachments,
        context=context,
    )
    if not source:
        return ChatPromptCandidate(prompt="", negative_prompt="", workflow=intent.recommended_workflow)
    compiled = compile_generation_request(
        prompt=source,
        workflow=intent.recommended_workflow,
        prompt_profile=intent.prompt_profile,
    )
    return ChatPromptCandidate(
        prompt=compiled.prompt,
        negative_prompt=compiled.negative_prompt,
        workflow=intent.recommended_workflow,
    )


def build_chat_generation_blueprint(
    *,
    intent: ChatIntent,
    content: str,
    attachments: List[ChatAttachment],
    premium_chat: bool,
    context: ChatConversationContext | None = None,
) -> ChatGenerationBlueprint:
    candidate = build_chat_prompt_candidate(
        intent=intent,
        content=content,
        attachments=attachments,
        context=context,
    )
    prior_blueprint = _prior_blueprint(context)
    aspect_ratio = _resolve_blueprint_aspect_ratio(intent, context=context)
    width, height = _resolve_blueprint_dimensions(
        aspect_ratio=aspect_ratio,
        premium_chat=premium_chat,
        context=context,
    )
    model = _resolve_blueprint_model(intent, premium_chat=premium_chat, context=context)
    return ChatGenerationBlueprint(
        workflow=_resolve_blueprint_workflow(intent, context=context),
        prompt=candidate.prompt,
        negative_prompt=_resolve_blueprint_negative_prompt(
            candidate.negative_prompt,
            context=context,
        ),
        reference_asset_id=_resolve_blueprint_reference_asset_id(
            intent,
            attachments=attachments,
            context=context,
        ),
        model=model,
        width=width,
        height=height,
        steps=_resolve_blueprint_steps(intent, premium_chat=premium_chat, context=context),
        cfg_scale=_resolve_blueprint_cfg(intent, context=context),
        aspect_ratio=aspect_ratio,
        output_count=_resolve_blueprint_output_count(context=context),
        reference_mode=_resolve_blueprint_reference_mode(intent, context=context),
    )


def build_chat_action_payload(
    *,
    action: str,
    generation_bridge: dict[str, Any],
    intent: ChatIntent,
) -> dict[str, Any]:
    payload = {
        "intent": intent.kind,
        "mode": intent.mode,
        "prompt_profile": intent.prompt_profile,
        "generation_bridge": generation_bridge,
    }
    if action == "open_create":
        payload["target_surface"] = "create"
    if action == "plan_edit":
        payload["target_surface"] = "edit"
    if action == "draft_prompt":
        payload["target_surface"] = "chat_composer"
    return payload


def compact_prompt(content: str) -> str:
    cleaned = " ".join(content.strip().split())
    if not cleaned:
        return ""
    return compact_visual_prompt(cleaned, limit=320)


def _matches_any(content: str, keywords: tuple[str, ...]) -> bool:
    return any(keyword in content for keyword in keywords) or bool(
        re.search(r"\b(t2i|i2i|i2t)\b", content)
    )


def _matches_phrase(content: str, phrases: tuple[str, ...]) -> bool:
    return any(phrase in content for phrase in phrases)


def _resolve_contextual_prompt_source(
    *,
    content: str,
    attachments: List[ChatAttachment],
    context: ChatConversationContext | None,
) -> str:
    cleaned = content.strip()
    if (
        context is not None
        and context.follow_up_refinement
        and context.last_generation_bridge is not None
    ):
        prior_prompt = str(context.last_generation_bridge.get("prompt") or "").strip()
        if prior_prompt and cleaned:
            return f"{prior_prompt}. Refine this direction with: {cleaned}"
        if prior_prompt:
            return prior_prompt
        if context.creative_direction_summary and cleaned:
            return f"{context.creative_direction_summary}. Refine this direction with: {cleaned}"
        if context.creative_direction_summary:
            return context.creative_direction_summary
    return cleaned or conversation_seed_from_attachments(attachments)


def _looks_like_follow_up_refinement(
    *,
    content: str,
    attachments: List[ChatAttachment],
    last_generation_bridge: dict[str, Any] | None,
) -> bool:
    if attachments or last_generation_bridge is None:
        return False
    cleaned = " ".join(content.strip().lower().split())
    if not cleaned or len(cleaned) > 140:
        return False
    refinement_markers = (
        "daha ",
        "same but",
        "aynı ama",
        "bunu ",
        "bunu da",
        "bunu biraz",
        "shorter",
        "longer",
        "more ",
        "less ",
        "make it",
        "turn it",
        "sinematik",
        "cinematic",
        "dramatic",
        "realistic",
        "editorial",
        "cleaner",
        "stronger",
        "kısalt",
        "uzat",
        "parlat",
    )
    return any(marker in cleaned for marker in refinement_markers)


def _resolve_blueprint_model(
    intent: ChatIntent,
    *,
    premium_chat: bool,
    context: ChatConversationContext | None = None,
) -> str:
    prior_blueprint = _prior_blueprint(context)
    if context is not None and context.follow_up_refinement and isinstance(prior_blueprint.get("model"), str):
        return str(prior_blueprint["model"])
    if not premium_chat:
        return STUDIO_FAST_MODEL_ID
    return STUDIO_PREMIUM_MODEL_ID


def _resolve_blueprint_aspect_ratio(
    intent: ChatIntent,
    *,
    context: ChatConversationContext | None = None,
) -> str:
    prior_blueprint = _prior_blueprint(context)
    if context is not None and context.follow_up_refinement and isinstance(prior_blueprint.get("aspect_ratio"), str):
        return str(prior_blueprint["aspect_ratio"])
    if intent.prompt_profile in {"product_commercial", "realistic_editorial"}:
        return "4:5"
    if intent.prompt_profile == "interior_archviz":
        return "16:9"
    if intent.prompt_profile in {"stylized_illustration", "fantasy_concept"}:
        return "16:9"
    if intent.has_image_attachment and intent.recommended_workflow in {"image_to_image", "edit"}:
        return "3:4"
    return "1:1"


def _resolve_blueprint_dimensions(
    *,
    aspect_ratio: str,
    premium_chat: bool,
    context: ChatConversationContext | None = None,
) -> tuple[int, int]:
    prior_blueprint = _prior_blueprint(context)
    if context is not None and context.follow_up_refinement:
        prior_width = prior_blueprint.get("width")
        prior_height = prior_blueprint.get("height")
        if isinstance(prior_width, int) and isinstance(prior_height, int):
            return prior_width, prior_height
    return _dimensions_for_aspect_ratio(aspect_ratio, premium_chat=premium_chat)


def _dimensions_for_aspect_ratio(aspect_ratio: str, *, premium_chat: bool) -> tuple[int, int]:
    if premium_chat:
        mapping = {
            "1:1": (1536, 1536),
            "4:5": (1280, 1600),
            "3:4": (1344, 1792),
            "16:9": (1600, 900),
        }
    else:
        mapping = {
            "1:1": (1024, 1024),
            "4:5": (1024, 1280),
            "3:4": (960, 1280),
            "16:9": (1280, 720),
        }
    return mapping.get(aspect_ratio, mapping["1:1"])


def _resolve_blueprint_steps(
    intent: ChatIntent,
    *,
    premium_chat: bool,
    context: ChatConversationContext | None = None,
) -> int:
    prior_blueprint = _prior_blueprint(context)
    if context is not None and context.follow_up_refinement and isinstance(prior_blueprint.get("steps"), int):
        return int(prior_blueprint["steps"])
    if intent.recommended_workflow == "edit":
        return 32 if premium_chat else 28
    if intent.prompt_profile in {"product_commercial", "interior_archviz"}:
        return 34 if premium_chat else 28
    if intent.prompt_profile in {"stylized_illustration", "fantasy_concept"}:
        return 30 if premium_chat else 26
    return 30 if premium_chat else 24


def _resolve_blueprint_cfg(
    intent: ChatIntent,
    *,
    context: ChatConversationContext | None = None,
) -> float:
    prior_blueprint = _prior_blueprint(context)
    if context is not None and context.follow_up_refinement and isinstance(prior_blueprint.get("cfg_scale"), (int, float)):
        return float(prior_blueprint["cfg_scale"])
    if intent.prompt_profile in {"stylized_illustration", "fantasy_concept"}:
        return 6.5
    if intent.prompt_profile == "product_commercial":
        return 6.0
    if intent.recommended_workflow == "edit":
        return 5.5
    return 6.0


def _resolve_blueprint_workflow(
    intent: ChatIntent,
    *,
    context: ChatConversationContext | None = None,
) -> str:
    if context is not None and context.follow_up_refinement and context.prior_workflow:
        return context.prior_workflow
    return intent.recommended_workflow


def _resolve_blueprint_reference_mode(
    intent: ChatIntent,
    *,
    context: ChatConversationContext | None = None,
) -> str:
    prior_blueprint = _prior_blueprint(context)
    if intent.has_image_attachment:
        return "required"
    if context is not None and context.follow_up_refinement:
        prior_reference_mode = prior_blueprint.get("reference_mode")
        if isinstance(prior_reference_mode, str) and prior_reference_mode.strip():
            return prior_reference_mode
        if context.prior_workflow in {"edit", "image_to_image"}:
            return "required"
    return "none"


def _resolve_blueprint_reference_asset_id(
    intent: ChatIntent,
    *,
    attachments: List[ChatAttachment],
    context: ChatConversationContext | None = None,
) -> str | None:
    current_reference_asset_id = _reference_asset_id_from_attachments(attachments)
    if current_reference_asset_id is not None:
        return current_reference_asset_id
    if intent.has_image_attachment:
        return None
    if context is not None and context.follow_up_refinement:
        if context.reference_asset_id is not None:
            return context.reference_asset_id
        return _reference_asset_id_from_bridge(context.last_generation_bridge)
    return None


def _resolve_blueprint_output_count(*, context: ChatConversationContext | None = None) -> int:
    prior_blueprint = _prior_blueprint(context)
    if context is not None and context.follow_up_refinement and isinstance(prior_blueprint.get("output_count"), int):
        return int(prior_blueprint["output_count"])
    return 1


def _resolve_blueprint_negative_prompt(
    candidate_negative_prompt: str,
    *,
    context: ChatConversationContext | None = None,
) -> str:
    if context is None or not context.follow_up_refinement:
        return candidate_negative_prompt
    return _merge_negative_prompts(
        _prior_negative_prompt(context),
        candidate_negative_prompt,
    )


def _profile_direction_summary(prompt_profile: str) -> str:
    if prompt_profile == "realistic_editorial":
        return "realistic editorial direction with controlled portrait framing and premium light separation"
    if prompt_profile == "product_commercial":
        return "product-commercial direction with tight framing, clean reflections, and polished material separation"
    if prompt_profile == "interior_archviz":
        return "spatial archviz direction with wide environmental read and believable material depth"
    if prompt_profile == "stylized_illustration":
        return "stylized illustration direction with stronger silhouette, palette control, and atmosphere"
    if prompt_profile == "fantasy_concept":
        return "fantasy concept direction with cinematic scale, mood, and depth"
    return "clean visual direction with a clearer subject, framing, and finish target"


def _prior_blueprint(context: ChatConversationContext | None) -> dict[str, Any]:
    if context is None or context.last_generation_bridge is None:
        return {}
    blueprint = context.last_generation_bridge.get("blueprint")
    if isinstance(blueprint, dict):
        return blueprint
    return {}


def _prior_negative_prompt(context: ChatConversationContext | None) -> str:
    if context is None or context.last_generation_bridge is None:
        return ""
    bridge_negative_prompt = context.last_generation_bridge.get("negative_prompt")
    if isinstance(bridge_negative_prompt, str) and bridge_negative_prompt.strip():
        return bridge_negative_prompt.strip()
    blueprint_negative_prompt = _prior_blueprint(context).get("negative_prompt")
    if isinstance(blueprint_negative_prompt, str) and blueprint_negative_prompt.strip():
        return blueprint_negative_prompt.strip()
    return ""


def _negative_guardrails_summary(context: ChatConversationContext | None) -> str | None:
    prior_negative_prompt = _prior_negative_prompt(context)
    if not prior_negative_prompt:
        return None
    segments = [segment.strip() for segment in prior_negative_prompt.split(",") if segment.strip()]
    if not segments:
        return None
    summary = ", ".join(segments[:4])
    if len(segments) > 4:
        summary = f"{summary}, ..."
    return summary


def _merge_negative_prompts(*parts: str) -> str:
    seen: set[str] = set()
    merged: list[str] = []
    for part in parts:
        if not part:
            continue
        for segment in part.split(","):
            cleaned = " ".join(segment.strip().split())
            if not cleaned:
                continue
            key = cleaned.lower()
            if key in seen:
                continue
            seen.add(key)
            merged.append(cleaned)
    return ", ".join(merged)


def _reference_asset_id_from_attachments(attachments: Iterable[ChatAttachment]) -> str | None:
    for attachment in attachments:
        if attachment.kind != "image":
            continue
        asset_id = attachment.asset_id
        if isinstance(asset_id, str) and asset_id.strip():
            return asset_id
    return None


def _reference_asset_id_from_bridge(bridge: dict[str, Any] | None) -> str | None:
    if not isinstance(bridge, dict):
        return None
    reference_asset_id = bridge.get("reference_asset_id")
    if isinstance(reference_asset_id, str) and reference_asset_id.strip():
        return reference_asset_id.strip()
    blueprint = bridge.get("blueprint")
    if isinstance(blueprint, dict):
        nested_reference_asset_id = blueprint.get("reference_asset_id")
        if isinstance(nested_reference_asset_id, str) and nested_reference_asset_id.strip():
            return nested_reference_asset_id.strip()
    return None


def _summarize_creative_direction(
    *,
    generation_bridge: dict[str, Any] | None,
    assistant_message: str,
    user_message: str,
) -> str | None:
    prompt = ""
    if isinstance(generation_bridge, dict):
        prompt = str(generation_bridge.get("prompt") or "").strip()
        blueprint = generation_bridge.get("blueprint")
        if not prompt and isinstance(blueprint, dict):
            prompt = str(blueprint.get("prompt") or "").strip()
    for candidate in (prompt, assistant_message, user_message):
        cleaned = " ".join(candidate.strip().split())
        if cleaned:
            return _truncate_direction_summary(cleaned, 140)
    return None


def _truncate_direction_summary(value: str, limit: int) -> str:
    cleaned = " ".join(value.strip().split())
    if len(cleaned) <= limit:
        return cleaned
    return f"{cleaned[: limit - 1].rstrip()}..."
