from __future__ import annotations

from typing import Iterable, Optional

from .models import MediaAsset, Project, ShareLink


def create_share_record(*, identity_id: str, project_id: Optional[str], asset_id: Optional[str]) -> ShareLink:
    return ShareLink(identity_id=identity_id, project_id=project_id, asset_id=asset_id)


def find_share_by_token(shares: Iterable[ShareLink], token: str) -> ShareLink | None:
    return next((item for item in shares if item.token == token), None)


def build_public_share_payload(
    *,
    share: ShareLink,
    project: Project | None = None,
    assets: list[MediaAsset] | None = None,
    asset: MediaAsset | None = None,
) -> dict:
    payload: dict = {"share": share.model_dump(mode="json")}
    if share.project_id:
        payload["project"] = project.model_dump(mode="json") if project else None
        payload["assets"] = [item.model_dump(mode="json") for item in (assets or [])]
    elif share.asset_id:
        payload["asset"] = asset.model_dump(mode="json") if asset else None
    return payload
