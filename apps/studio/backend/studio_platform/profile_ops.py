from __future__ import annotations

from typing import Any, Callable, Dict, List

from .models import MediaAsset, OmniaIdentity, PublicPost, StudioState, utc_now

SerializeAssetFn = Callable[[MediaAsset, str], Dict[str, Any]]
SerializePostFn = Callable[[PublicPost, Dict[str, MediaAsset], Dict[str, OmniaIdentity], str], Dict[str, Any]]


def build_identity_export(
    *,
    identity: OmniaIdentity,
    identity_id: str,
    assets: List[MediaAsset],
    posts: List[PublicPost],
    assets_by_id: Dict[str, MediaAsset],
    identities_by_id: Dict[str, OmniaIdentity],
    serialize_asset: SerializeAssetFn,
    serialize_post: SerializePostFn,
) -> Dict[str, Any]:
    serialized_assets = [serialize_asset(asset, identity_id) for asset in assets]
    serialized_posts = [
        serialize_post(post, assets_by_id, identities_by_id, identity_id)
        for post in posts
    ]

    return {
        "identity": {
            "id": identity.id,
            "email": identity.email,
            "username": identity.username,
            "display_name": identity.display_name,
            "created_at": identity.created_at.isoformat(),
        },
        "assets": serialized_assets,
        "posts": serialized_posts,
        "meta": {
            "export_date": utc_now().isoformat(),
            "assets_count": len(serialized_assets),
            "posts_count": len(serialized_posts),
        },
    }


def purge_identity_state(state: StudioState, identity_id: str, assets_to_delete: List[MediaAsset]) -> None:
    for asset in assets_to_delete:
        state.assets.pop(asset.id, None)

    generation_ids = [key for key, value in state.generations.items() if value.identity_id == identity_id]
    for generation_id in generation_ids:
        state.generations.pop(generation_id, None)

    post_ids = [key for key, value in state.posts.items() if value.identity_id == identity_id]
    for post_id in post_ids:
        state.posts.pop(post_id, None)

    workspace_ids = [key for key, value in state.workspaces.items() if value.identity_id == identity_id]
    for workspace_id in workspace_ids:
        state.workspaces.pop(workspace_id, None)

    project_ids = [key for key, value in state.projects.items() if value.identity_id == identity_id]
    for project_id in project_ids:
        state.projects.pop(project_id, None)

    conversation_ids = [key for key, value in state.conversations.items() if value.identity_id == identity_id]
    for conversation_id in conversation_ids:
        state.conversations.pop(conversation_id, None)

    message_ids = [
        key
        for key, value in state.chat_messages.items()
        if value.identity_id == identity_id or value.conversation_id in conversation_ids
    ]
    for message_id in message_ids:
        state.chat_messages.pop(message_id, None)

    share_ids = [key for key, value in state.shares.items() if value.identity_id == identity_id]
    for share_id in share_ids:
        state.shares.pop(share_id, None)

    ledger_ids = [key for key, value in state.credit_ledger.items() if value.identity_id == identity_id]
    for ledger_id in ledger_ids:
        state.credit_ledger.pop(ledger_id, None)

    webhook_receipt_ids = [
        key for key, value in state.billing_webhook_receipts.items() if value.identity_id == identity_id
    ]
    for receipt_id in webhook_receipt_ids:
        state.billing_webhook_receipts.pop(receipt_id, None)

    for post in state.posts.values():
        if identity_id in post.liked_by:
            post.liked_by = [value for value in post.liked_by if value != identity_id]

    state.identities.pop(identity_id, None)
