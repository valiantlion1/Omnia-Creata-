from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Dict, Literal, Optional

from ..models import MediaAsset, OmniaIdentity, Project, utc_now
from ..project_ops import (
    apply_project_update,
    build_project_detail_payload,
    create_project_record,
    remove_project_from_state,
)

if TYPE_CHECKING:
    from ..service import StudioService

logger = logging.getLogger(__name__)


class ProjectService:
    def __init__(self, service: "StudioService") -> None:
        self.service = service

    async def list_projects(
        self,
        identity_id: str,
        surface: Optional[Literal["compose", "chat"]] = None,
        *,
        include_system_managed: bool = False,
    ) -> list[Project]:
        return await self.service.store.list_projects_for_identity(
            identity_id,
            surface=surface,
            include_system_managed=include_system_managed,
        )

    async def create_project(
        self,
        identity_id: str,
        title: str,
        description: str = "",
        surface: str = "compose",
        *,
        system_managed: bool = False,
    ) -> Project:
        identity = await self.service.get_identity(identity_id)
        project = create_project_record(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title,
            description=description,
            surface=surface,
            system_managed=system_managed,
        )
        await self.service.store.save_model("projects", project)
        return project

    async def get_or_create_draft_project(
        self,
        identity_id: str,
        *,
        surface: str = "compose",
    ) -> Project:
        projects = await self.list_projects(
            identity_id,
            surface=surface,
            include_system_managed=True,
        )
        for project in projects:
            if project.system_managed and project.surface == surface:
                return project
        return await self.create_project(
            identity_id,
            title="Draft project",
            description="System-managed draft project",
            surface=surface,
            system_managed=True,
        )

    async def resolve_generation_project(
        self,
        *,
        identity: OmniaIdentity,
        requested_project_id: str,
        reference_asset: MediaAsset | None,
    ) -> Project:
        try:
            return await self.service.require_owned_model(
                "projects",
                requested_project_id,
                Project,
                identity.id,
            )
        except KeyError:
            if reference_asset is not None:
                fallback_project = await self.service.store.get_project(reference_asset.project_id)
                if fallback_project is not None and fallback_project.identity_id == identity.id:
                    logger.warning(
                        "Recovered missing generation project %s for identity %s using reference asset project %s",
                        requested_project_id,
                        identity.id,
                        fallback_project.id,
                    )
                    return fallback_project

            compose_projects = await self.list_projects(identity.id, surface="compose")
            if compose_projects:
                fallback_project = compose_projects[0]
                logger.warning(
                    "Recovered missing generation project %s for identity %s using latest compose project %s",
                    requested_project_id,
                    identity.id,
                    fallback_project.id,
                )
                return fallback_project

            fallback_project = await self.get_or_create_draft_project(identity.id, surface="compose")
            logger.warning(
                "Recovered missing generation project %s for identity %s using draft compose project %s",
                requested_project_id,
                identity.id,
                fallback_project.id,
            )
            return fallback_project

    async def get_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        project = await self.service.require_owned_model("projects", project_id, Project, identity_id)
        generations = await self.service.list_generations(identity_id, project_id=project_id)
        assets = await self.service.list_assets(identity_id, project_id=project_id)
        allow_clean_export = await self.service.can_identity_clean_export(identity_id)
        return build_project_detail_payload(
            project=project,
            generations=generations,
            assets=assets,
            identity_id=identity_id,
            serialize_generation=self.service.serialize_generation_for_identity,
            serialize_assets=lambda values, **kwargs: self.service.serialize_assets(
                values,
                allow_clean_export=allow_clean_export,
                **kwargs,
            ),
        )

    async def update_project(
        self,
        identity_id: str,
        project_id: str,
        *,
        title: str,
        description: str = "",
    ) -> Project:
        project = await self.service.require_owned_model("projects", project_id, Project, identity_id)
        next_title = title.strip()[:72]
        if not next_title:
            raise ValueError("Collection name is required")

        def mutation(state) -> None:
            apply_project_update(
                state=state,
                project_id=project.id,
                title=next_title,
                description=description,
                now=utc_now(),
            )

        await self.service.store.mutate(mutation)
        updated = await self.service.store.get_model("projects", project.id, Project)
        if updated is None:
            raise KeyError("Project not found")
        return updated

    async def delete_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        project = await self.service.require_owned_model("projects", project_id, Project, identity_id)
        assets = await self.service.list_assets(identity_id, project_id=project_id, include_deleted=True)
        if assets:
            raise ValueError("Move or remove items before deleting this collection")

        def mutation(state) -> None:
            remove_project_from_state(state=state, project_id=project.id)

        await self.service.store.mutate(mutation)
        return {"project_id": project.id, "status": "deleted"}
