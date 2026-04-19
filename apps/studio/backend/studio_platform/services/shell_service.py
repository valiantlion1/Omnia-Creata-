from __future__ import annotations

from typing import TYPE_CHECKING, Any

from ..bootstrap_contract_ops import build_settings_bootstrap_payload
from ..model_catalog_ops import (
    get_model_catalog_entry_or_raise,
    list_model_catalog_entries,
    normalize_generation_aspect_ratio,
    resolve_generation_dimensions_for_model,
    serialize_model_catalog_for_identity,
    validate_dimensions_for_model,
    validate_model_for_identity,
)
from ..models import ModelCatalogEntry, OmniaIdentity

if TYPE_CHECKING:
    from ..service import StudioService


class ShellService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    async def get_settings_payload(
        self,
        identity_id: str,
        *,
        current_session_id: str | None = None,
    ) -> dict[str, Any]:
        identity = await self.service.identity.get_identity(identity_id=identity_id)
        billing_state = await self.service.billing._resolve_billing_state_for_identity(identity)
        compose_draft = await self.service.projects.get_or_create_draft_project(identity.id, surface="compose")
        chat_draft = await self.service.projects.get_or_create_draft_project(identity.id, surface="chat")
        models = [
            self.serialize_model_catalog_for_identity(identity=identity, model=model, billing_state=billing_state)
            for model in await self.list_models_for_identity(identity)
        ]
        return build_settings_bootstrap_payload(
            identity=self.service.identity.serialize_identity(identity, billing_state=billing_state),
            entitlements=self.service.identity.serialize_entitlements(identity, billing_state=billing_state),
            plans=[plan.model_dump(mode="json") for plan in self.service.plan_catalog.values()],
            models=models,
            presets=self.service.preset_catalog,
            compose_draft_id=compose_draft.id,
            chat_draft_id=chat_draft.id,
            styles=await self.service.library.list_styles(identity.id),
            prompt_memory=await self.service.library.get_prompt_memory_profile_payload(identity.id),
            active_sessions=await self.service.get_access_sessions_payload(
                identity_id=identity.id,
                current_session_id=current_session_id,
            ),
        )

    async def list_models_for_identity(
        self,
        identity: OmniaIdentity | None = None,
    ) -> list[ModelCatalogEntry]:
        return list_model_catalog_entries()

    async def get_model(self, model_id: str) -> ModelCatalogEntry:
        return get_model_catalog_entry_or_raise(model_id)

    def serialize_model_catalog_for_identity(
        self,
        *,
        identity: OmniaIdentity,
        model: ModelCatalogEntry,
        billing_state=None,
    ) -> dict[str, Any]:
        return serialize_model_catalog_for_identity(
            identity=identity,
            model=model,
            providers=self.service.providers,
            billing_state=billing_state,
        )

    def validate_model_for_identity(self, identity: OmniaIdentity, model: ModelCatalogEntry, *, billing_state=None) -> None:
        validate_model_for_identity(identity=identity, model=model, billing_state=billing_state)

    def validate_dimensions_for_model(self, width: int, height: int, model: ModelCatalogEntry) -> None:
        validate_dimensions_for_model(width=width, height=height, model=model)

    def normalize_generation_aspect_ratio(self, aspect_ratio: str | None) -> str:
        return normalize_generation_aspect_ratio(aspect_ratio)

    def resolve_generation_dimensions_for_model(
        self,
        *,
        model: ModelCatalogEntry,
        aspect_ratio: str,
    ) -> tuple[int, int]:
        return resolve_generation_dimensions_for_model(model=model, aspect_ratio=aspect_ratio)
