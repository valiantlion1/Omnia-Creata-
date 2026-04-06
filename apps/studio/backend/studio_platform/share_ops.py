from __future__ import annotations

import hashlib
import hmac
from typing import Callable

from typing import Iterable, Optional

from .models import MediaAsset, Project, ShareLink


def hash_share_token(raw_token: str, *, secret: str) -> str:
    return hmac.new(
        secret.encode("utf-8"),
        raw_token.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def build_share_token_preview(raw_token: str) -> str:
    return f"{raw_token[:8]}...{raw_token[-4:]}" if len(raw_token) > 12 else raw_token


def create_share_record(
    *,
    identity_id: str,
    project_id: Optional[str],
    asset_id: Optional[str],
    token_hash: str,
    token_preview: str,
) -> ShareLink:
    return ShareLink(
        identity_id=identity_id,
        project_id=project_id,
        asset_id=asset_id,
        token="",
        token_hash=token_hash,
        token_preview=token_preview,
    )


def find_share_by_token(shares: Iterable[ShareLink], token: str) -> ShareLink | None:
    return next((item for item in shares if item.token == token), None)


def find_share_by_public_token(
    shares: Iterable[ShareLink],
    raw_token: str,
    *,
    secret: str,
) -> ShareLink | None:
    token_hash = hash_share_token(raw_token, secret=secret)
    for share in shares:
        if share.token_hash and share.token_hash == token_hash:
            return share
        if not share.token_hash and share.token == raw_token:
            return share
    return None


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
