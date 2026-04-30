"""Wire-up tests for the chat<>generation completion linkage.

When a chat assistant message kicks off a generation, the GenerationJob
carries `origin_chat_message_id` and `origin_conversation_id`. After the
generation succeeds, `_attach_completed_generation_to_origin_chat_message`
mutates the chat message in place to:

  - Append a `ChatAttachment` for each rendered asset (so the chat UI
    shows the image inline).
  - Stamp `generation_id` / `generation_status` / `generation_assets` /
    `generation_library_state` into `metadata` so the frontend can render
    a proper preview block.

The helper must:
  - Fail open if the chat message has been deleted (no-op, no raise).
  - Skip blocked assets so the inline preview never shows hard-blocked
    output (NCII / CSAM / etc.).
  - Not duplicate attachments when re-run for any reason.
  - Be a strict no-op when the job did not originate from chat (no
    `origin_chat_message_id`).

These tests cover the integration glue. The pure GenerationJob field
contract is covered indirectly by every test that constructs a job
with origin_chat_message_id set.
"""

from __future__ import annotations

import pytest

from studio_platform.models import (
    ChatAttachment,
    ChatConversation,
    ChatMessage,
    ChatRole,
    GenerationJob,
    JobStatus,
    MediaAsset,
    PromptSnapshot,
    StudioState,
)
from studio_platform.services.generation_service import GenerationService

# Bind the helper as an unbound method so we can call it against a
# stand-in host. Same pattern as the moderation post-check tests.
_attach_helper = GenerationService._attach_completed_generation_to_origin_chat_message


# --- Test fixtures ---------------------------------------------------------


class _FakeAssetUrlService:
    """Stand-in for `service` that exposes only `build_asset_delivery_url`."""

    def build_asset_delivery_url(
        self,
        asset_id: str,
        *,
        variant: str,
        identity_id: str | None = None,
        share_id: str | None = None,
        share_token: str | None = None,
        public_preview: bool = False,
    ) -> str:
        # Mirror the real /v1/assets/<id>/<variant> shape so the
        # ChatAttachment.url validator accepts it.
        return f"/v1/assets/{asset_id}/{variant}"


class _FakeGenerationHost:
    """Minimal stand-in for a GenerationService instance.

    The helper only touches `self.service.build_asset_delivery_url` so we
    expose just that surface.
    """

    def __init__(self) -> None:
        self.service = _FakeAssetUrlService()


def _make_job(*, origin_chat_message_id: str | None = None, origin_conversation_id: str | None = None) -> GenerationJob:
    return GenerationJob(
        id="job-1",
        workspace_id="ws-1",
        project_id="proj-1",
        identity_id="id-1",
        title="Test",
        model="flux-2",
        provider="runware",
        estimated_cost=0.0,
        credit_cost=0,
        status=JobStatus.SUCCEEDED,
        origin_chat_message_id=origin_chat_message_id,
        origin_conversation_id=origin_conversation_id,
        prompt_snapshot=PromptSnapshot(
            prompt="adult model in editorial portrait",
            negative_prompt="",
            model="flux-2",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.5,
            seed=42,
            aspect_ratio="1:1",
        ),
    )


def _make_asset(
    *,
    asset_id: str = "asset-1",
    library_state: str = "ready",
    title: str = "Generated image",
) -> MediaAsset:
    return MediaAsset(
        id=asset_id,
        workspace_id="ws-1",
        project_id="proj-1",
        identity_id="id-1",
        title=title,
        prompt="adult model in editorial portrait",
        url="stored",
        local_path="",
        metadata={"library_state": library_state},
    )


def _make_state_with_message(
    *,
    message_id: str = "msg-1",
    conversation_id: str = "conv-1",
    attachments: list[ChatAttachment] | None = None,
) -> StudioState:
    state = StudioState()
    state.conversations[conversation_id] = ChatConversation(
        id=conversation_id,
        workspace_id="ws-1",
        identity_id="id-1",
    )
    state.chat_messages[message_id] = ChatMessage(
        id=message_id,
        conversation_id=conversation_id,
        identity_id="id-1",
        role=ChatRole.ASSISTANT,
        content="Here you go!",
        attachments=list(attachments or []),
    )
    return state


# --- Tests -----------------------------------------------------------------


def test_helper_is_noop_when_job_has_no_origin_chat_message_id():
    """Generations launched from the standalone Create surface must not
    mutate any chat state — even if there happen to be messages around."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id=None)
    state = _make_state_with_message()
    asset = _make_asset()
    snapshot_attachments = list(state.chat_messages["msg-1"].attachments)
    snapshot_metadata = dict(state.chat_messages["msg-1"].metadata)

    _attach_helper(host, state=state, job=job, created_assets=[asset])

    msg = state.chat_messages["msg-1"]
    assert list(msg.attachments) == snapshot_attachments
    assert msg.metadata == snapshot_metadata


def test_helper_is_noop_when_created_assets_empty():
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1")
    state = _make_state_with_message()

    _attach_helper(host, state=state, job=job, created_assets=[])

    msg = state.chat_messages["msg-1"]
    assert msg.attachments == []
    assert "generation_id" not in msg.metadata


def test_helper_is_noop_when_chat_message_was_deleted():
    """If the message was deleted between enqueue and completion, the
    helper logs and returns cleanly — never raises."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-DELETED")
    state = _make_state_with_message(message_id="msg-1")  # different id
    asset = _make_asset()

    # Should not raise.
    _attach_helper(host, state=state, job=job, created_assets=[asset])

    # Existing message is untouched.
    msg = state.chat_messages["msg-1"]
    assert msg.attachments == []
    assert "generation_id" not in msg.metadata


def test_helper_attaches_ready_assets_and_stamps_metadata():
    """Happy path: rendered assets get attached and metadata stamped."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1", origin_conversation_id="conv-1")
    state = _make_state_with_message(message_id="msg-1", conversation_id="conv-1")
    asset_a = _make_asset(asset_id="asset-a", title="Editorial A")
    asset_b = _make_asset(asset_id="asset-b", title="Editorial B")

    _attach_helper(host, state=state, job=job, created_assets=[asset_a, asset_b])

    msg = state.chat_messages["msg-1"]
    assert len(msg.attachments) == 2
    assert msg.attachments[0].asset_id == "asset-a"
    assert msg.attachments[0].kind == "image"
    assert msg.attachments[0].url == "/v1/assets/asset-a/preview"
    assert msg.attachments[0].label == "Editorial A"
    assert msg.attachments[1].asset_id == "asset-b"
    assert msg.attachments[1].url == "/v1/assets/asset-b/preview"

    assert msg.metadata["generation_id"] == "job-1"
    assert msg.metadata["generation_status"] == "succeeded"
    assert msg.metadata["generation_assets"] == ["asset-a", "asset-b"]
    assert msg.metadata["generation_library_state"] == "ready"
    assert msg.edited_at is not None


def test_helper_filters_out_blocked_assets():
    """A blocked asset (NCII / CSAM / hard_block) must NOT appear in the
    chat preview — the inline image area should skip it entirely."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1")
    state = _make_state_with_message(message_id="msg-1")
    blocked = _make_asset(asset_id="asset-blocked", library_state="blocked")
    ready = _make_asset(asset_id="asset-ready", library_state="ready")

    _attach_helper(host, state=state, job=job, created_assets=[blocked, ready])

    msg = state.chat_messages["msg-1"]
    attachment_ids = [att.asset_id for att in msg.attachments]
    assert "asset-blocked" not in attachment_ids
    assert "asset-ready" in attachment_ids
    assert msg.metadata["generation_assets"] == ["asset-ready"]


def test_helper_is_noop_when_all_assets_are_blocked():
    """If every asset is blocked, we still must not stamp the metadata —
    there is nothing safe to preview, so the chat row stays in its
    pre-generation state (the frontend will rely on the assistant
    message text + a separate moderation banner)."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1")
    state = _make_state_with_message(message_id="msg-1")
    blocked_a = _make_asset(asset_id="asset-blocked-a", library_state="blocked")
    blocked_b = _make_asset(asset_id="asset-blocked-b", library_state="blocked")

    _attach_helper(host, state=state, job=job, created_assets=[blocked_a, blocked_b])

    msg = state.chat_messages["msg-1"]
    assert msg.attachments == []
    assert "generation_id" not in msg.metadata


def test_helper_does_not_duplicate_already_attached_assets():
    """If the helper runs twice for any reason (retry, replay, etc.), the
    same asset must not be appended twice."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1")
    pre_existing = ChatAttachment(
        kind="image",
        url="/v1/assets/asset-a/preview",
        asset_id="asset-a",
        label="already there",
    )
    state = _make_state_with_message(message_id="msg-1", attachments=[pre_existing])
    asset = _make_asset(asset_id="asset-a")

    _attach_helper(host, state=state, job=job, created_assets=[asset])

    msg = state.chat_messages["msg-1"]
    # Still only one attachment with that asset id.
    asset_a_attachments = [att for att in msg.attachments if att.asset_id == "asset-a"]
    assert len(asset_a_attachments) == 1
    # Pre-existing attachment was preserved (label not overwritten).
    assert asset_a_attachments[0].label == "already there"
    # And — importantly — the helper short-circuits the metadata stamp
    # too, since no NEW asset was attached. This avoids overwriting
    # earlier generation metadata on a no-op replay.
    assert "generation_id" not in msg.metadata


def test_helper_records_needs_review_state_in_metadata():
    """When the analyzer flips an asset to needs_review, that state must
    propagate into the chat message metadata so the frontend can render
    the "pending review" badge instead of the regular preview."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1")
    state = _make_state_with_message(message_id="msg-1")
    review_asset = _make_asset(asset_id="asset-review", library_state="needs_review")

    _attach_helper(host, state=state, job=job, created_assets=[review_asset])

    msg = state.chat_messages["msg-1"]
    assert len(msg.attachments) == 1
    assert msg.attachments[0].asset_id == "asset-review"
    assert msg.metadata["generation_library_state"] == "needs_review"
    assert msg.metadata["generation_status"] == "succeeded"


def test_helper_uses_first_previewable_asset_for_library_state():
    """When generations produce multiple assets with different states
    (one needs_review, one ready), the chat metadata reports the first
    previewable asset's state so the frontend can pick the badge.

    The blocked-filter happens BEFORE the state read, so a [blocked,
    needs_review, ready] generation reports needs_review."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1")
    state = _make_state_with_message(message_id="msg-1")
    blocked = _make_asset(asset_id="b", library_state="blocked")
    review = _make_asset(asset_id="r", library_state="needs_review")
    ready = _make_asset(asset_id="ok", library_state="ready")

    _attach_helper(host, state=state, job=job, created_assets=[blocked, review, ready])

    msg = state.chat_messages["msg-1"]
    attached_ids = [att.asset_id for att in msg.attachments]
    assert attached_ids == ["r", "ok"]
    # First *previewable* asset is the needs_review one — that's what
    # propagates to chat metadata.
    assert msg.metadata["generation_library_state"] == "needs_review"
    assert msg.metadata["generation_assets"] == ["r", "ok"]


def test_helper_preserves_existing_message_metadata():
    """The helper merges into metadata — it must not clobber unrelated
    metadata fields the chat layer set earlier (e.g. tool_call_id,
    persona_id, etc.)."""
    host = _FakeGenerationHost()
    job = _make_job(origin_chat_message_id="msg-1")
    state = _make_state_with_message(message_id="msg-1")
    state.chat_messages["msg-1"].metadata["tool_call_id"] = "tc-9"
    state.chat_messages["msg-1"].metadata["persona_id"] = "persona-x"
    asset = _make_asset()

    _attach_helper(host, state=state, job=job, created_assets=[asset])

    md = state.chat_messages["msg-1"].metadata
    assert md["tool_call_id"] == "tc-9"
    assert md["persona_id"] == "persona-x"
    assert md["generation_id"] == "job-1"
    assert md["generation_status"] == "succeeded"
