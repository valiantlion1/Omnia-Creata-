from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Dict, Iterable, Literal, Optional

from .models import GenerationJob, MediaAsset, Project, StudioState

ProjectSurface = Literal["compose", "chat"]
SerializeGenerationFn = Callable[[GenerationJob, str], Dict[str, Any]]
SerializeAssetsFn = Callable[[list[MediaAsset], str], list[Dict[str, Any]]]


def normalize_project_surface(surface: Optional[str]) -> ProjectSurface:
    return "chat" if surface == "chat" else "compose"


def filter_projects(
    projects: Iterable[Project],
    *,
    identity_id: str,
    surface: Optional[ProjectSurface] = None,
) -> list[Project]:
    filtered = [project for project in projects if project.identity_id == identity_id]
    if surface is not None:
        normalized_surface = normalize_project_surface(surface)
        filtered = [project for project in filtered if normalize_project_surface(project.surface) == normalized_surface]
    return sorted(filtered, key=lambda item: item.updated_at, reverse=True)


def create_project_record(
    *,
    workspace_id: str,
    identity_id: str,
    title: str,
    description: str = "",
    surface: Optional[str] = None,
) -> Project:
    return Project(
        workspace_id=workspace_id,
        identity_id=identity_id,
        title=title.strip() or "Untitled Project",
        description=description.strip(),
        surface=normalize_project_surface(surface),
    )


def build_project_detail_payload(
    *,
    project: Project,
    generations: list[GenerationJob],
    assets: list[MediaAsset],
    identity_id: str,
    serialize_generation: SerializeGenerationFn,
    serialize_assets: SerializeAssetsFn,
) -> Dict[str, Any]:
    return {
        "project": project.model_dump(mode="json"),
        "recent_generations": [serialize_generation(job, identity_id) for job in generations[:10]],
        "recent_assets": serialize_assets(assets[:16], identity_id),
    }


def apply_project_update(
    *,
    state: StudioState,
    project_id: str,
    title: str,
    description: str,
    now: datetime,
) -> None:
    current = state.projects[project_id]
    current.title = title
    current.description = description.strip()
    current.updated_at = now
    state.projects[current.id] = current


def remove_project_from_state(*, state: StudioState, project_id: str) -> None:
    state.projects.pop(project_id, None)
    stale_posts = [post_id for post_id, post in state.posts.items() if post.project_id == project_id]
    for post_id in stale_posts:
        state.posts.pop(post_id, None)
