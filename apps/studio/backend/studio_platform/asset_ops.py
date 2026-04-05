from __future__ import annotations

from datetime import datetime
from typing import Iterable

from .models import MediaAsset, StudioState


def rename_asset_in_state(*, state: StudioState, asset_id: str, title: str) -> None:
    current = state.assets[asset_id]
    current.title = title
    state.assets[current.id] = current


def trash_asset_in_state(*, state: StudioState, asset_id: str, now: datetime) -> None:
    current = state.assets[asset_id]
    current.deleted_at = now
    state.assets[current.id] = current
    project = state.projects.get(current.project_id)
    if project and project.cover_asset_id == current.id:
        project.cover_asset_id = None
        project.updated_at = now
        state.projects[project.id] = project


def restore_asset_in_state(*, state: StudioState, asset_id: str) -> None:
    current = state.assets[asset_id]
    current.deleted_at = None
    state.assets[current.id] = current


def permanently_remove_asset_from_state(*, state: StudioState, asset: MediaAsset, now: datetime) -> None:
    state.assets.pop(asset.id, None)

    project = state.projects.get(asset.project_id)
    if project and project.cover_asset_id == asset.id:
        project.cover_asset_id = None
        project.updated_at = now
        state.projects[project.id] = project

    stale_share_ids = [
        share_id
        for share_id, share in state.shares.items()
        if share.asset_id == asset.id
    ]
    for share_id in stale_share_ids:
        state.shares.pop(share_id, None)

    generation_id = str(asset.metadata.get("generation_id") or "")
    post = state.posts.get(generation_id)
    if post:
        post.asset_ids = [value for value in post.asset_ids if value != asset.id]
        if post.cover_asset_id == asset.id:
            post.cover_asset_id = post.asset_ids[0] if post.asset_ids else None
        post.updated_at = now
        if post.asset_ids:
            state.posts[post.id] = post
        else:
            state.posts.pop(post.id, None)


def empty_trash_in_state(*, state: StudioState, trashed_assets: Iterable[MediaAsset], now: datetime) -> int:
    trashed_assets = list(trashed_assets)
    trashed_asset_ids = {asset.id for asset in trashed_assets}
    trashed_project_ids = {asset.project_id for asset in trashed_assets}

    for asset_id in trashed_asset_ids:
        state.assets.pop(asset_id, None)

    stale_share_ids = [
        share_id
        for share_id, share in state.shares.items()
        if share.asset_id in trashed_asset_ids
    ]
    for share_id in stale_share_ids:
        state.shares.pop(share_id, None)

    for project_id in trashed_project_ids:
        project = state.projects.get(project_id)
        if project and project.cover_asset_id in trashed_asset_ids:
            project.cover_asset_id = None
            project.updated_at = now
            state.projects[project.id] = project

    for post_id, post in list(state.posts.items()):
        remaining_asset_ids = [asset_id for asset_id in post.asset_ids if asset_id not in trashed_asset_ids]
        if len(remaining_asset_ids) == len(post.asset_ids):
            continue
        post.asset_ids = remaining_asset_ids
        if post.cover_asset_id in trashed_asset_ids:
            post.cover_asset_id = remaining_asset_ids[0] if remaining_asset_ids else None
        post.updated_at = now
        if post.asset_ids:
            state.posts[post_id] = post
        else:
            state.posts.pop(post_id, None)

    return len(trashed_assets)
