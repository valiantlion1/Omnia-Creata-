from typing import TYPE_CHECKING, Optional, List, Dict, Any
from fastapi import Request
import asyncio
import logging
from ..models import (
    ChatAttachment,
    ChatConversation,
    ChatFeedback,
    ChatMessage,
    ChatRole,
    OmniaIdentity,
    StudioState,
    utc_now,
)
from ..conversation_ops import (
    apply_chat_exchange_to_state,
    apply_message_feedback_to_state,
    apply_message_pair_edit_to_state,
    build_chat_exchange_payload,
    build_conversation_detail_payload,
    build_message_action_payload,
    create_conversation_record,
    pop_message_revision,
    push_message_revision,
    remove_conversation_from_state,
)
from ..chat_ops import (
    build_attachment_only_request,
    build_chat_context,
    build_chat_continuity_summary,
    build_chat_generation_bridge,
    build_chat_metadata,
    build_chat_reply,
    build_chat_suggested_actions,
    conversation_seed_from_attachments,
    count_user_turns,
    detect_chat_intent,
    resolve_chat_mode,
    title_from_message,
)
from ..entitlement_ops import ensure_chat_request_allowed
from ..experience_contract_ops import attach_chat_experience

if TYPE_CHECKING:
    from ..service import StudioService

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, service: 'StudioService'):
        self.service = service
        self.store = service.store
        self.llm_gateway = service.llm_gateway

    async def list_conversations(self, identity_id: str) -> List[ChatConversation]:
        return await self.store.list_conversations_for_identity(identity_id)

    async def create_conversation(self, identity_id: str, title: str = "", model: str = "studio-assist") -> ChatConversation:
        identity = await self.service.get_identity(identity_id)
        conversation = create_conversation_record(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title,
            model=model,
        )
        await self.store.save_model("conversations", conversation)
        return conversation

    async def get_conversation(self, identity_id: str, conversation_id: str) -> Dict[str, Any]:
        conversation = await self.service.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.list_conversation_messages(identity_id, conversation_id)
        return build_conversation_detail_payload(conversation=conversation, messages=messages)

    async def list_conversation_messages(self, identity_id: str, conversation_id: str) -> List[ChatMessage]:
        await self.service.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        return await self.store.list_chat_messages_for_conversation(
            identity_id=identity_id,
            conversation_id=conversation_id,
        )

    async def delete_conversation(self, identity_id: str, conversation_id: str) -> None:
        conversation = await self.service.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)

        def mutation(state: StudioState) -> None:
            remove_conversation_from_state(state=state, conversation_id=conversation.id)

        await self.store.mutate(mutation)

    async def set_chat_message_feedback(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
        feedback: ChatFeedback | None,
    ) -> ChatMessage:
        await self.service.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        message = await self.service.require_owned_model("chat_messages", message_id, ChatMessage, identity_id)
        if message.conversation_id != conversation_id:
            raise KeyError("Message not found")
        if message.role != ChatRole.ASSISTANT:
            raise ValueError("Feedback can only be applied to assistant messages")

        def mutation(state: StudioState) -> None:
            apply_message_feedback_to_state(
                state=state,
                message_id=message.id,
                feedback=feedback,
            )

        await self.store.mutate(mutation)
        updated = await self.store.get_model("chat_messages", message.id, ChatMessage)
        if updated is None:
            raise KeyError("Message not found")
        return updated

    async def edit_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
        content: str,
        *,
        model: str | None = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        conversation, messages, user_message, assistant_message = await self._resolve_latest_editable_turn(
            identity_id=identity_id,
            conversation_id=conversation_id,
            user_message_id=message_id,
        )
        identity = await self.service.get_identity(identity_id)
        attachment_models = [ChatAttachment.model_validate(item) for item in (attachments or [])]
        resolved_mode = resolve_chat_mode(model or conversation.model)
        billing_state = await self.service._resolve_billing_state_for_identity(identity)
        entitlements = ensure_chat_request_allowed(
            identity=identity,
            mode=resolved_mode,
            attachments=attachment_models,
            plan_catalog=self.service.plan_catalog,
            billing_state=billing_state,
        )
        sanitized_content = content.strip()
        if not sanitized_content and not attachment_models:
            raise ValueError("Message content or an attachment is required")

        history = self._messages_before_turn(messages, user_message.id)
        rebuilt_assistant = await self._build_assistant_message(
            identity=identity,
            conversation=conversation,
            history=history,
            content=sanitized_content,
            attachments=attachment_models,
            requested_model=model,
            parent_message_id=user_message.id,
            premium_chat=entitlements.premium_chat,
        )

        def mutation(state: StudioState) -> None:
            now = utc_now()
            current_user = state.chat_messages[user_message.id]
            current_assistant = state.chat_messages[assistant_message.id]
            push_message_revision(message=current_user, now=now)
            push_message_revision(message=current_assistant, now=now)
            current_user.content = sanitized_content
            current_user.attachments = attachment_models
            current_assistant.content = rebuilt_assistant.content
            current_assistant.attachments = rebuilt_assistant.attachments
            current_assistant.suggested_actions = rebuilt_assistant.suggested_actions
            current_assistant.metadata = {
                **rebuilt_assistant.metadata,
                "revision_history": current_assistant.metadata.get("revision_history", []),
            }
            current_assistant.parent_message_id = user_message.id
            apply_message_pair_edit_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=current_user,
                assistant_message=current_assistant,
                now=now,
                model=model,
            )

        await self.store.mutate(mutation)
        updated_conversation = await self.service.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        updated_user = await self.service.require_owned_model("chat_messages", user_message.id, ChatMessage, identity_id)
        updated_assistant = await self.service.require_owned_model("chat_messages", assistant_message.id, ChatMessage, identity_id)
        return build_message_action_payload(
            conversation=updated_conversation,
            user_message=updated_user,
            assistant_message=updated_assistant,
        )

    async def regenerate_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        conversation, messages, user_message, assistant_message = await self._resolve_latest_editable_turn(
            identity_id=identity_id,
            conversation_id=conversation_id,
            assistant_message_id=message_id,
        )
        identity = await self.service.get_identity(identity_id)
        resolved_mode = resolve_chat_mode(conversation.model)
        billing_state = await self.service._resolve_billing_state_for_identity(identity)
        entitlements = ensure_chat_request_allowed(
            identity=identity,
            mode=resolved_mode,
            attachments=user_message.attachments,
            plan_catalog=self.service.plan_catalog,
            billing_state=billing_state,
        )
        history = self._messages_before_turn(messages, user_message.id)
        rebuilt_assistant = await self._build_assistant_message(
            identity=identity,
            conversation=conversation,
            history=history,
            content=user_message.content,
            attachments=user_message.attachments,
            requested_model=conversation.model,
            parent_message_id=user_message.id,
            premium_chat=entitlements.premium_chat,
        )

        def mutation(state: StudioState) -> None:
            now = utc_now()
            current_user = state.chat_messages[user_message.id]
            current_assistant = state.chat_messages[assistant_message.id]
            push_message_revision(message=current_assistant, now=now)
            current_assistant.content = rebuilt_assistant.content
            current_assistant.attachments = rebuilt_assistant.attachments
            current_assistant.suggested_actions = rebuilt_assistant.suggested_actions
            current_assistant.metadata = {
                **rebuilt_assistant.metadata,
                "revision_history": current_assistant.metadata.get("revision_history", []),
            }
            current_assistant.parent_message_id = user_message.id
            apply_message_pair_edit_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=current_user,
                assistant_message=current_assistant,
                now=now,
            )

        await self.store.mutate(mutation)
        updated_conversation = await self.service.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        updated_user = await self.service.require_owned_model("chat_messages", user_message.id, ChatMessage, identity_id)
        updated_assistant = await self.service.require_owned_model("chat_messages", assistant_message.id, ChatMessage, identity_id)
        return build_message_action_payload(
            conversation=updated_conversation,
            user_message=updated_user,
            assistant_message=updated_assistant,
        )

    async def revert_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        message_id: str,
    ) -> Dict[str, Any]:
        conversation, _, user_message, assistant_message = await self._resolve_latest_editable_turn(
            identity_id=identity_id,
            conversation_id=conversation_id,
            user_message_id=message_id,
        )

        def mutation(state: StudioState) -> None:
            now = utc_now()
            current_user = state.chat_messages[user_message.id]
            current_assistant = state.chat_messages[assistant_message.id]
            user_revision = pop_message_revision(message=current_user)
            if user_revision is None:
                raise ValueError("No previous revision is available for this turn")
            assistant_revision = pop_message_revision(message=current_assistant)
            if assistant_revision is None:
                raise ValueError("No previous revision is available for this turn")
            target_history_depth = len(current_user.metadata.get("revision_history", []))
            while len(current_assistant.metadata.get("revision_history", [])) > target_history_depth:
                if pop_message_revision(message=current_assistant) is None:
                    break
            apply_message_pair_edit_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=current_user,
                assistant_message=current_assistant,
                now=now,
            )

        await self.store.mutate(mutation)
        updated_conversation = await self.service.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        updated_user = await self.service.require_owned_model("chat_messages", user_message.id, ChatMessage, identity_id)
        updated_assistant = await self.service.require_owned_model("chat_messages", assistant_message.id, ChatMessage, identity_id)
        return build_message_action_payload(
            conversation=updated_conversation,
            user_message=updated_user,
            assistant_message=updated_assistant,
        )

    async def send_chat_message(
        self,
        identity_id: str,
        conversation_id: str,
        content: str,
        model: str | None = None,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        identity = await self.service.get_identity(identity_id)
        conversation = await self.service.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.list_conversation_messages(identity_id, conversation_id)
        attachment_models = [ChatAttachment.model_validate(item) for item in (attachments or [])]
        resolved_mode = resolve_chat_mode(model or conversation.model)
        billing_state = await self.service._resolve_billing_state_for_identity(identity)
        entitlements = ensure_chat_request_allowed(
            identity=identity,
            mode=resolved_mode,
            attachments=attachment_models,
            plan_catalog=self.service.plan_catalog,
            billing_state=billing_state,
        )
        user_turn_count = count_user_turns(messages)
        message_limit = entitlements.chat_message_limit
        if message_limit and user_turn_count >= message_limit:
            raise PermissionError(f"{self.service.plan_catalog[identity.plan].label} plan chat limit reached")
        sanitized_content = content.strip()
        if not sanitized_content and not attachment_models:
            raise ValueError("Message content or an attachment is required")

        user_message = ChatMessage(
            conversation_id=conversation.id,
            identity_id=identity.id,
            role=ChatRole.USER,
            content=sanitized_content,
            attachments=attachment_models,
        )
        assistant_message = await self._build_assistant_message(
            identity=identity,
            conversation=conversation,
            history=messages,
            content=sanitized_content,
            attachments=attachment_models,
            requested_model=model,
            parent_message_id=user_message.id,
            premium_chat=entitlements.premium_chat,
        )

        def mutation(state: StudioState) -> None:
            title = title_from_message(sanitized_content or conversation_seed_from_attachments(attachment_models))
            apply_chat_exchange_to_state(
                state=state,
                conversation_id=conversation.id,
                user_message=user_message,
                assistant_message=assistant_message,
                now=utc_now(),
                title=title,
                model=model,
            )

        await self.store.mutate(mutation)

        updated_conversation = await self.service.require_owned_model("conversations", conversation.id, ChatConversation, identity_id)
        return build_chat_exchange_payload(
            conversation=updated_conversation,
            user_message=user_message,
            assistant_message=assistant_message,
        )

    async def _build_assistant_message(
        self,
        *,
        identity: OmniaIdentity,
        conversation: ChatConversation,
        history: List[ChatMessage],
        content: str,
        attachments: List[ChatAttachment],
        requested_model: str | None,
        parent_message_id: str,
        premium_chat: bool,
    ) -> ChatMessage:
        resolved_mode = resolve_chat_mode(requested_model or conversation.model)
        llm_input_content = content.strip() or build_attachment_only_request(attachments, mode=resolved_mode)
        context = build_chat_context(
            history=history,
            content=llm_input_content,
            attachments=attachments,
        )
        intent = detect_chat_intent(
            content=llm_input_content,
            attachments=attachments,
            mode=resolved_mode,
            context=context,
        )
        generation_bridge = build_chat_generation_bridge(
            intent=intent,
            content=llm_input_content,
            attachments=attachments,
            premium_chat=premium_chat,
            context=context,
        )
        continuity_summary = build_chat_continuity_summary(
            intent=intent,
            context=context,
            generation_bridge=generation_bridge,
        )
        llm_reply = await self.llm_gateway.generate_chat_reply(
            requested_model=requested_model or conversation.model,
            mode=resolved_mode,
            history=history,
            content=llm_input_content,
            attachments=attachments,
            identity_plan=identity.plan,
            premium_chat=premium_chat,
            intent_kind=intent.kind,
            prompt_profile=intent.prompt_profile,
            detail_score=intent.detail_score,
            premium_intent=intent.premium_intent,
            recommended_workflow=intent.recommended_workflow,
            continuity_summary=continuity_summary,
        )
        if llm_reply:
            response_body = llm_reply.text
            suggested_actions = build_chat_suggested_actions(
                content=llm_input_content,
                attachments=attachments,
                mode=resolved_mode,
                premium_chat=premium_chat,
                context=context,
            )
            premium_lane_unavailable = bool(premium_chat and llm_reply.degraded)
            response_mode = (
                "premium_lane_unavailable"
                if premium_lane_unavailable
                else "live_provider_reply"
            )
            metadata = {
                "provider": llm_reply.provider,
                "model": llm_reply.model,
                "mode": resolved_mode,
                "prompt_tokens": llm_reply.prompt_tokens,
                "completion_tokens": llm_reply.completion_tokens,
                "estimated_cost_usd": llm_reply.estimated_cost_usd,
                "used_fallback": llm_reply.used_fallback,
                "used_llm": True,
                "premium_chat": premium_chat,
                "requested_quality_tier": llm_reply.requested_quality_tier,
                "selected_quality_tier": llm_reply.selected_quality_tier,
                "degraded": llm_reply.degraded,
                "provider_status": "degraded" if premium_lane_unavailable else "healthy",
                "fallback_reason": "premium_lane_unavailable" if premium_lane_unavailable else None,
                "premium_lane_unavailable": premium_lane_unavailable,
                "response_mode": response_mode,
                "routing_strategy": llm_reply.routing_strategy,
                "routing_reason": llm_reply.routing_reason,
                "generation_bridge": generation_bridge,
                **build_chat_metadata(intent, context=context),
            }
            metadata = attach_chat_experience(metadata)
        else:
            response_body, suggested_actions = build_chat_reply(
                intent=intent,
                content=llm_input_content,
                attachments=attachments,
                provider_unavailable=True,
                premium_chat=premium_chat,
                context=context,
            )
            suggested_actions = build_chat_suggested_actions(
                content=llm_input_content,
                attachments=attachments,
                mode=resolved_mode,
                premium_chat=premium_chat,
                context=context,
            )
            logger.warning(
                "chat_heuristic_fallback %s",
                {
                    "event": "chat_heuristic_fallback",
                    "conversation_id": conversation.id,
                    "identity_id": identity.id,
                    "mode": resolved_mode,
                    "intent_kind": intent.kind,
                    "prompt_profile": intent.prompt_profile,
                    "premium_chat": premium_chat,
                    "routing_reason": "provider_unavailable_or_empty",
                },
            )
            metadata = {
                "provider": "heuristic",
                "model": "studio-assist",
                "mode": resolved_mode,
                "estimated_cost_usd": 0.0,
                "used_fallback": True,
                "used_llm": False,
                "premium_chat": premium_chat,
                "requested_quality_tier": "premium" if premium_chat else "standard",
                "selected_quality_tier": "degraded",
                "degraded": True,
                "routing_strategy": "heuristic-fallback",
                "routing_reason": "provider_unavailable_or_empty",
                "provider_status": "degraded",
                "fallback_reason": "all_provider_candidates_failed",
                "premium_lane_unavailable": premium_chat,
                "response_mode": "degraded_fallback_reply",
                "generation_bridge": generation_bridge,
                **build_chat_metadata(intent, context=context),
            }
            metadata = attach_chat_experience(metadata)
        return ChatMessage(
            conversation_id=conversation.id,
            identity_id=identity.id,
            role=ChatRole.ASSISTANT,
            content=response_body,
            parent_message_id=parent_message_id,
            suggested_actions=suggested_actions,
            metadata=metadata,
        )

    def _messages_before_turn(self, messages: List[ChatMessage], user_message_id: str) -> List[ChatMessage]:
        ordered = sorted(messages, key=lambda item: item.created_at)
        for index, message in enumerate(ordered):
            if message.id == user_message_id:
                return ordered[:index]
        raise KeyError("Message not found")

    def _find_assistant_reply_for_user(self, messages: List[ChatMessage], user_message_id: str) -> ChatMessage | None:
        ordered = sorted(messages, key=lambda item: item.created_at)
        for message in ordered:
            if message.role == ChatRole.ASSISTANT and message.parent_message_id == user_message_id:
                return message
        for index, message in enumerate(ordered):
            if message.id != user_message_id:
                continue
            for candidate in ordered[index + 1:]:
                if candidate.role == ChatRole.ASSISTANT:
                    return candidate
            return None
        return None

    async def _resolve_latest_editable_turn(
        self,
        *,
        identity_id: str,
        conversation_id: str,
        user_message_id: str | None = None,
        assistant_message_id: str | None = None,
    ) -> tuple[ChatConversation, List[ChatMessage], ChatMessage, ChatMessage]:
        conversation = await self.service.require_owned_model("conversations", conversation_id, ChatConversation, identity_id)
        messages = await self.list_conversation_messages(identity_id, conversation_id)
        latest_user = next((message for message in reversed(messages) if message.role == ChatRole.USER), None)
        if latest_user is None:
            raise KeyError("Conversation has no user turns")

        if user_message_id is not None:
            user_message = next((message for message in messages if message.id == user_message_id), None)
            if user_message is None or user_message.role != ChatRole.USER:
                raise KeyError("Message not found")
            if user_message.id != latest_user.id:
                raise ValueError("Only the latest user message can be edited or reverted right now")
            assistant_message = self._find_assistant_reply_for_user(messages, user_message.id)
            if assistant_message is None:
                raise KeyError("Assistant reply not found")
            return conversation, messages, user_message, assistant_message

        assistant_message = next((message for message in messages if message.id == assistant_message_id), None)
        if assistant_message is None or assistant_message.role != ChatRole.ASSISTANT:
            raise KeyError("Message not found")
        paired_assistant = self._find_assistant_reply_for_user(messages, latest_user.id)
        if paired_assistant is None or paired_assistant.id != assistant_message.id:
            raise ValueError("Only the latest assistant reply can be regenerated right now")
        return conversation, messages, latest_user, assistant_message
