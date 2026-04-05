from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Iterable

from .models import ChatConversation, ChatFeedback, ChatMessage, StudioState


def filter_conversations(conversations: Iterable[ChatConversation], *, identity_id: str) -> list[ChatConversation]:
    return sorted(
        [conversation for conversation in conversations if conversation.identity_id == identity_id],
        key=lambda item: item.updated_at,
        reverse=True,
    )


def create_conversation_record(
    *,
    workspace_id: str,
    identity_id: str,
    title: str = "",
    model: str = "studio-assist",
) -> ChatConversation:
    return ChatConversation(
        workspace_id=workspace_id,
        identity_id=identity_id,
        title=title.strip() or "New chat",
        model=model.strip() or "studio-assist",
    )


def build_conversation_detail_payload(
    *,
    conversation: ChatConversation,
    messages: list[ChatMessage],
) -> dict:
    return {
        "conversation": conversation.model_dump(mode="json"),
        "messages": [message.model_dump(mode="json") for message in messages],
    }


def filter_conversation_messages(
    messages: Iterable[ChatMessage],
    *,
    identity_id: str,
    conversation_id: str,
) -> list[ChatMessage]:
    filtered = [
        message
        for message in messages
        if message.identity_id == identity_id and message.conversation_id == conversation_id
    ]
    return sorted(filtered, key=lambda item: item.created_at)


def build_chat_exchange_payload(
    *,
    conversation: ChatConversation,
    user_message: ChatMessage,
    assistant_message: ChatMessage,
) -> dict:
    return {
        "conversation": conversation.model_dump(mode="json"),
        "user_message": user_message.model_dump(mode="json"),
        "assistant_message": assistant_message.model_dump(mode="json"),
    }


def build_message_action_payload(
    *,
    conversation: ChatConversation,
    user_message: ChatMessage,
    assistant_message: ChatMessage,
) -> dict:
    return build_chat_exchange_payload(
        conversation=conversation,
        user_message=user_message,
        assistant_message=assistant_message,
    )


def apply_chat_exchange_to_state(
    *,
    state: StudioState,
    conversation_id: str,
    user_message: ChatMessage,
    assistant_message: ChatMessage,
    now: datetime,
    title: str,
    model: str | None = None,
) -> None:
    current_conversation = state.conversations[conversation_id]
    if model:
        current_conversation.model = model.strip() or current_conversation.model
    if current_conversation.message_count == 0:
        current_conversation.title = title
    current_conversation.message_count += 2
    current_conversation.last_message_at = now
    current_conversation.updated_at = now
    state.conversations[current_conversation.id] = current_conversation
    state.chat_messages[user_message.id] = user_message
    state.chat_messages[assistant_message.id] = assistant_message


def apply_message_feedback_to_state(
    *,
    state: StudioState,
    message_id: str,
    feedback: ChatFeedback | None,
) -> None:
    message = state.chat_messages[message_id]
    message.feedback = feedback
    state.chat_messages[message.id] = message


def snapshot_message_revision(message: ChatMessage) -> dict:
    metadata = deepcopy(message.metadata)
    metadata.pop("revision_history", None)
    return {
        "content": message.content,
        "attachments": [attachment.model_dump(mode="json") for attachment in message.attachments],
        "suggested_actions": [action.model_dump(mode="json") for action in message.suggested_actions],
        "metadata": metadata,
        "feedback": message.feedback.value if message.feedback else None,
        "version": message.version,
        "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        "parent_message_id": message.parent_message_id,
    }


def _restore_message_parts(message: ChatMessage, revision: dict, history: list[dict]) -> None:
    from .models import ChatAttachment, ChatSuggestedAction

    metadata = deepcopy(revision.get("metadata") or {})
    if history:
        metadata["revision_history"] = history
    message.content = str(revision.get("content") or "")
    message.attachments = [ChatAttachment.model_validate(item) for item in revision.get("attachments", [])]
    message.suggested_actions = [ChatSuggestedAction.model_validate(item) for item in revision.get("suggested_actions", [])]
    feedback_value = revision.get("feedback")
    message.feedback = ChatFeedback(feedback_value) if feedback_value else None
    message.metadata = metadata
    message.version = int(revision.get("version") or 1)
    edited_at = revision.get("edited_at")
    message.edited_at = datetime.fromisoformat(edited_at) if edited_at else None
    message.parent_message_id = revision.get("parent_message_id")


def apply_message_pair_edit_to_state(
    *,
    state: StudioState,
    conversation_id: str,
    user_message: ChatMessage,
    assistant_message: ChatMessage,
    now: datetime,
    model: str | None = None,
) -> None:
    current_conversation = state.conversations[conversation_id]
    if model:
        current_conversation.model = model.strip() or current_conversation.model
    current_conversation.last_message_at = now
    current_conversation.updated_at = now
    state.conversations[current_conversation.id] = current_conversation
    state.chat_messages[user_message.id] = user_message
    state.chat_messages[assistant_message.id] = assistant_message


def push_message_revision(
    *,
    message: ChatMessage,
    now: datetime,
) -> None:
    revision_history = list(message.metadata.get("revision_history", []))
    revision_history.append(snapshot_message_revision(message))
    next_metadata = deepcopy(message.metadata)
    next_metadata["revision_history"] = revision_history
    message.metadata = next_metadata
    message.version += 1
    message.edited_at = now


def pop_message_revision(
    *,
    message: ChatMessage,
) -> dict | None:
    revision_history = list(message.metadata.get("revision_history", []))
    if not revision_history:
        return None
    revision = revision_history.pop()
    _restore_message_parts(message, revision, revision_history)
    return revision


def remove_conversation_from_state(*, state: StudioState, conversation_id: str) -> None:
    state.conversations.pop(conversation_id, None)
    stale_ids = [message.id for message in state.chat_messages.values() if message.conversation_id == conversation_id]
    for message_id in stale_ids:
        state.chat_messages.pop(message_id, None)
