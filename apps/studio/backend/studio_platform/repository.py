from __future__ import annotations

from datetime import datetime
from typing import Protocol, Type, TypeVar

from pydantic import BaseModel

from .conversation_ops import filter_conversation_messages, filter_conversations
from .generation_admission_ops import (
    count_incomplete_generations_for_identity,
    count_recent_generation_requests_for_identity,
    has_duplicate_incomplete_generation,
)
from .generation_ops import count_incomplete_generations
from .models import (
    BillingWebhookReceipt,
    ChatConversation,
    ChatMessage,
    CreditLedgerEntry,
    GenerationJob,
    JobStatus,
    MediaAsset,
    OmniaIdentity,
    PromptSnapshot,
    Project,
    PublicPost,
    ShareLink,
    StudioState,
    StudioWorkspace,
)
from .project_ops import filter_projects
from .share_ops import find_share_by_public_token, find_share_by_token

ModelT = TypeVar("ModelT", bound=BaseModel)


class StudioPersistence(Protocol):
    async def load(self) -> StudioState: ...
    async def read(self, callback): ...
    async def snapshot(self) -> StudioState: ...
    async def replace(self, state: StudioState) -> StudioState: ...
    async def save_model(self, collection: str, model: BaseModel) -> BaseModel: ...
    async def delete_model(self, collection: str, model_id: str) -> None: ...
    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None: ...
    async def list_models(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]: ...
    async def mutate(self, callback): ...


class StudioRepository:
    """Thin persistence seam over the current state store.

    Today this delegates to the JSON-backed store.
    Later, this is the boundary we can replace with a durable Postgres-backed implementation.
    """

    def __init__(self, persistence: StudioPersistence) -> None:
        self._persistence = persistence

    async def load(self) -> StudioState:
        return await self._persistence.load()

    async def read(self, callback):
        return await self._persistence.read(callback)

    async def snapshot(self) -> StudioState:
        return await self._persistence.snapshot()

    async def replace(self, state: StudioState) -> StudioState:
        return await self._persistence.replace(state)

    async def save_model(self, collection: str, model: BaseModel) -> BaseModel:
        return await self._persistence.save_model(collection, model)

    async def delete_model(self, collection: str, model_id: str) -> None:
        await self._persistence.delete_model(collection, model_id)

    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        return await self._persistence.get_model(collection, model_id, model_type)

    async def list_models(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        return await self._persistence.list_models(collection, model_type)

    async def mutate(self, callback):
        return await self._persistence.mutate(callback)

    async def get_identity(self, identity_id: str) -> OmniaIdentity | None:
        return await self.get_model("identities", identity_id, OmniaIdentity)

    async def list_identities(self) -> list[OmniaIdentity]:
        return await self.list_models("identities", OmniaIdentity)

    async def get_identity_map(self) -> dict[str, OmniaIdentity]:
        def query(state: StudioState) -> dict[str, OmniaIdentity]:
            return {
                identity_id: identity.model_copy(deep=True)
                for identity_id, identity in state.identities.items()
            }

        return await self.read(query)

    async def get_workspace(self, workspace_id: str) -> StudioWorkspace | None:
        return await self.get_model("workspaces", workspace_id, StudioWorkspace)

    async def list_workspaces(self) -> list[StudioWorkspace]:
        return await self.list_models("workspaces", StudioWorkspace)

    async def get_project(self, project_id: str) -> Project | None:
        return await self.get_model("projects", project_id, Project)

    async def list_projects(self) -> list[Project]:
        return await self.list_models("projects", Project)

    async def list_projects_for_identity(self, identity_id: str, *, surface: str | None = None) -> list[Project]:
        def query(state: StudioState) -> list[Project]:
            return filter_projects(state.projects.values(), identity_id=identity_id, surface=surface)

        return await self.read(query)

    async def get_conversation(self, conversation_id: str) -> ChatConversation | None:
        return await self.get_model("conversations", conversation_id, ChatConversation)

    async def list_conversations(self) -> list[ChatConversation]:
        return await self.list_models("conversations", ChatConversation)

    async def list_conversations_for_identity(self, identity_id: str) -> list[ChatConversation]:
        def query(state: StudioState) -> list[ChatConversation]:
            return filter_conversations(state.conversations.values(), identity_id=identity_id)

        return await self.read(query)

    async def get_chat_message(self, message_id: str) -> ChatMessage | None:
        return await self.get_model("chat_messages", message_id, ChatMessage)

    async def list_chat_messages(self) -> list[ChatMessage]:
        return await self.list_models("chat_messages", ChatMessage)

    async def list_chat_messages_for_conversation(self, *, identity_id: str, conversation_id: str) -> list[ChatMessage]:
        def query(state: StudioState) -> list[ChatMessage]:
            return filter_conversation_messages(
                state.chat_messages.values(),
                identity_id=identity_id,
                conversation_id=conversation_id,
            )

        return await self.read(query)

    async def get_generation(self, generation_id: str) -> GenerationJob | None:
        return await self.get_model("generations", generation_id, GenerationJob)

    async def list_generations(self) -> list[GenerationJob]:
        return await self.list_models("generations", GenerationJob)

    async def list_generations_for_identity(self, identity_id: str, *, project_id: str | None = None) -> list[GenerationJob]:
        def query(state: StudioState) -> list[GenerationJob]:
            filtered = [
                job.model_copy(deep=True)
                for job in state.generations.values()
                if job.identity_id == identity_id and (project_id is None or job.project_id == project_id)
            ]
            return sorted(filtered, key=lambda item: item.created_at, reverse=True)

        return await self.read(query)

    async def list_generations_with_statuses(self, statuses: set[JobStatus]) -> list[GenerationJob]:
        normalized_statuses = {JobStatus.coerce(status) for status in statuses}

        def query(state: StudioState) -> list[GenerationJob]:
            jobs = [
                job.model_copy(deep=True)
                for job in state.generations.values()
                if job.status in normalized_statuses
            ]
            return sorted(jobs, key=lambda item: item.updated_at)

        return await self.read(query)

    async def get_asset(self, asset_id: str) -> MediaAsset | None:
        return await self.get_model("assets", asset_id, MediaAsset)

    async def list_assets(self) -> list[MediaAsset]:
        return await self.list_models("assets", MediaAsset)

    async def list_assets_for_identity(self, identity_id: str) -> list[MediaAsset]:
        def query(state: StudioState) -> list[MediaAsset]:
            return [
                asset.model_copy(deep=True)
                for asset in state.assets.values()
                if asset.identity_id == identity_id
            ]

        return await self.read(query)

    async def get_post(self, post_id: str) -> PublicPost | None:
        return await self.get_model("posts", post_id, PublicPost)

    async def list_posts(self) -> list[PublicPost]:
        return await self.list_models("posts", PublicPost)

    async def list_posts_for_identity(self, identity_id: str) -> list[PublicPost]:
        def query(state: StudioState) -> list[PublicPost]:
            return [
                post.model_copy(deep=True)
                for post in state.posts.values()
                if post.identity_id == identity_id
            ]

        return await self.read(query)

    async def get_share(self, share_id: str) -> ShareLink | None:
        return await self.get_model("shares", share_id, ShareLink)

    async def list_shares(self) -> list[ShareLink]:
        return await self.list_models("shares", ShareLink)

    async def get_share_by_token(self, token: str) -> ShareLink | None:
        def query(state: StudioState) -> ShareLink | None:
            return find_share_by_token(state.shares.values(), token)

        return await self.read(query)

    async def get_share_by_public_token(self, raw_token: str, *, secret: str) -> ShareLink | None:
        def query(state: StudioState) -> ShareLink | None:
            return find_share_by_public_token(state.shares.values(), raw_token, secret=secret)

        return await self.read(query)

    async def list_shares_for_identity(self, identity_id: str) -> list[ShareLink]:
        def query(state: StudioState) -> list[ShareLink]:
            return [
                share.model_copy(deep=True)
                for share in state.shares.values()
                if share.identity_id == identity_id
            ]

        return await self.read(query)

    async def list_credit_entries(self) -> list[CreditLedgerEntry]:
        return await self.list_models("credit_ledger", CreditLedgerEntry)

    async def list_credit_entries_for_identity(self, identity_id: str) -> list[CreditLedgerEntry]:
        def query(state: StudioState) -> list[CreditLedgerEntry]:
            entries = [
                entry.model_copy(deep=True)
                for entry in state.credit_ledger.values()
                if entry.identity_id == identity_id
            ]
            return sorted(entries, key=lambda item: item.created_at, reverse=True)

        return await self.read(query)

    async def get_billing_webhook_receipt(self, receipt_id: str) -> BillingWebhookReceipt | None:
        return await self.get_model("billing_webhook_receipts", receipt_id, BillingWebhookReceipt)

    async def list_billing_webhook_receipts(self) -> list[BillingWebhookReceipt]:
        return await self.list_models("billing_webhook_receipts", BillingWebhookReceipt)

    async def has_billing_webhook_receipt(self, receipt_id: str) -> bool:
        def query(state: StudioState) -> bool:
            return receipt_id in state.billing_webhook_receipts

        return await self.read(query)

    async def get_asset_map(self) -> dict[str, MediaAsset]:
        def query(state: StudioState) -> dict[str, MediaAsset]:
            return {
                asset_id: asset.model_copy(deep=True)
                for asset_id, asset in state.assets.items()
            }

        return await self.read(query)

    async def get_counts_summary(self) -> dict[str, int]:
        def query(state: StudioState) -> dict[str, int]:
            return {
                "identities": len(state.identities),
                "projects": len(state.projects),
                "conversations": len(state.conversations),
                "chat_messages": len(state.chat_messages),
                "generations": len(state.generations),
                "assets": len(state.assets),
                "shares": len(state.shares),
            }

        return await self.read(query)

    async def count_incomplete_generations(self) -> int:
        return await self.read(count_incomplete_generations)

    async def count_incomplete_generations_for_identity(self, identity_id: str) -> int:
        def query(state: StudioState) -> int:
            return count_incomplete_generations_for_identity(state, identity_id)

        return await self.read(query)

    async def count_recent_generation_requests_for_identity(self, identity_id: str, *, since: datetime) -> int:
        def query(state: StudioState) -> int:
            return count_recent_generation_requests_for_identity(
                state=state,
                identity_id=identity_id,
                since=since,
            )

        return await self.read(query)

    async def has_duplicate_incomplete_generation(
        self,
        *,
        identity_id: str,
        project_id: str,
        model_id: str,
        prompt_snapshot: PromptSnapshot,
    ) -> bool:
        def query(state: StudioState) -> bool:
            return has_duplicate_incomplete_generation(
                state=state,
                identity_id=identity_id,
                project_id=project_id,
                model_id=model_id,
                prompt_snapshot=prompt_snapshot,
            )

        return await self.read(query)
