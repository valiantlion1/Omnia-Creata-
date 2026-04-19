from __future__ import annotations

from pathlib import Path

import pytest

from studio_platform.models import (
    GenerationJob,
    IdentityPlan,
    MediaAsset,
    ModerationCaseSource,
    ModerationCaseStatus,
    ModerationVisibilityEffect,
    OmniaIdentity,
    PromptSnapshot,
    Project,
    PublicPost,
    StudioWorkspace,
    Visibility,
)
from studio_platform.service import StudioService
from studio_platform.providers import ProviderRegistry
from studio_platform.store import StudioStateStore


async def _build_service(tmp_path: Path) -> StudioService:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()
    return service


async def _seed_public_post(service: StudioService, tmp_path: Path) -> tuple[OmniaIdentity, OmniaIdentity, Project, PublicPost]:
    owner = OmniaIdentity(
        id="owner-1",
        email="owner@example.com",
        display_name="Owner",
        username="owner1",
        plan=IdentityPlan.PRO,
        workspace_id="ws-owner-1",
        default_visibility=Visibility.PUBLIC,
    )
    viewer = OmniaIdentity(
        id="viewer-1",
        email="viewer@example.com",
        display_name="Viewer",
        username="viewer1",
        plan=IdentityPlan.PRO,
        workspace_id="ws-viewer-1",
    )
    owner_workspace = StudioWorkspace(id=owner.workspace_id, identity_id=owner.id, name="Owner Studio")
    viewer_workspace = StudioWorkspace(id=viewer.workspace_id, identity_id=viewer.id, name="Viewer Studio")
    project = Project(
        id="project-1",
        workspace_id=owner.workspace_id,
        identity_id=owner.id,
        title="Launch Portraits",
    )
    render_path = tmp_path / "public-post.png"
    render_path.write_bytes(b"png")
    cover = MediaAsset(
        id="asset-1",
        workspace_id=owner.workspace_id,
        project_id=project.id,
        identity_id=owner.id,
        title="Public Render",
        prompt="cinematic editorial portrait",
        url="stored",
        local_path=str(render_path),
        metadata={"library_state": "ready"},
    )
    post = PublicPost(
        id="post-1",
        workspace_id=owner.workspace_id,
        project_id=project.id,
        identity_id=owner.id,
        owner_username=owner.username or "owner1",
        owner_display_name=owner.display_name,
        title="Public Render",
        prompt="cinematic editorial portrait",
        cover_asset_id=cover.id,
        asset_ids=[cover.id],
        visibility=Visibility.PUBLIC,
    )

    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(owner.id, owner),
            state.identities.__setitem__(viewer.id, viewer),
            state.workspaces.__setitem__(owner_workspace.id, owner_workspace),
            state.workspaces.__setitem__(viewer_workspace.id, viewer_workspace),
            state.projects.__setitem__(project.id, project),
            state.assets.__setitem__(cover.id, cover),
            state.posts.__setitem__(post.id, post),
        )
    )
    return owner, viewer, project, post


@pytest.mark.asyncio
async def test_report_public_post_creates_hidden_review_case_and_private_post(tmp_path: Path) -> None:
    service = await _build_service(tmp_path)
    try:
        owner, viewer, _, post = await _seed_public_post(service, tmp_path)

        case = await service.report_public_post(
            viewer.id,
            post.id,
            reason_code="unsafe_public",
            detail="This should be reviewed before it stays public.",
        )
        snapshot = await service.store.snapshot()
        updated_post = snapshot.posts[post.id]

        assert case.source == ModerationCaseSource.PUBLIC_REPORT
        assert case.status == ModerationCaseStatus.OPEN
        assert case.target_identity_id == owner.id
        assert updated_post.visibility == Visibility.PRIVATE
        assert updated_post.visibility_effect == ModerationVisibilityEffect.HIDDEN_PENDING_REVIEW
        assert case.id in updated_post.moderation_case_ids
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_review_routed_post_cannot_be_made_public_and_owner_sees_blocker(tmp_path: Path) -> None:
    service = await _build_service(tmp_path)
    try:
        owner, _, project, post = await _seed_public_post(service, tmp_path)
        prompt_snapshot = PromptSnapshot(
            prompt="adult beach portrait in a red bikini at sunset",
            negative_prompt="",
            model="gpt-image-1-mini",
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.5,
            seed=42,
            aspect_ratio="1:1",
        )
        generation = GenerationJob(
            id=post.id,
            workspace_id=owner.workspace_id,
            project_id=project.id,
            identity_id=owner.id,
            title=post.title,
            model="gpt-image-1-mini",
            provider="openai",
            estimated_cost=0.0,
            credit_cost=0,
            status="succeeded",
            moderation_tier="low",
            moderation_reason="adult_adjacent_review",
            prompt_snapshot=prompt_snapshot,
        )
        await service.store.mutate(
            lambda state: (
                state.generations.__setitem__(generation.id, generation),
                state.posts.__setitem__(
                    post.id,
                    state.posts[post.id].model_copy(
                        update={
                            "visibility": Visibility.PRIVATE,
                            "moderation_tier": "low",
                            "moderation_reason": "adult_adjacent_review",
                            "visibility_effect": ModerationVisibilityEffect.PRIVATE_ONLY,
                        }
                    ),
                ),
            )
        )

        with pytest.raises(PermissionError, match="launch-safe showcase-ready"):
            await service.update_post(owner.id, post.id, visibility=Visibility.PUBLIC)

        payload = await service.get_post_payload(post.id, viewer_identity_id=owner.id)
        blocker_codes = {item["code"] for item in payload["publish_blockers"]}
        assert "moderation_private_only" in blocker_codes
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_submit_appeal_can_link_owned_case_and_resolution_restores_visibility_effect(tmp_path: Path) -> None:
    service = await _build_service(tmp_path)
    try:
        owner, viewer, _, post = await _seed_public_post(service, tmp_path)
        report_case = await service.report_public_post(
            viewer.id,
            post.id,
            reason_code="unsafe_public",
            detail="Please review this.",
        )

        appeal = await service.submit_moderation_appeal(
            owner.id,
            linked_case_id=report_case.id,
            subject=None,
            subject_id=None,
            reason_code="appeal",
            detail="This should stay visible after review.",
        )
        resolved = await service.resolve_moderation_case(
            owner.id,
            report_case.id,
            status=ModerationCaseStatus.RESOLVED,
            resolution_note="Allowed after review.",
            visibility_effect=ModerationVisibilityEffect.NONE,
        )
        snapshot = await service.store.snapshot()

        assert appeal.source == ModerationCaseSource.APPEAL
        assert appeal.linked_case_id == report_case.id
        assert resolved.visibility_effect == ModerationVisibilityEffect.NONE
        assert snapshot.posts[post.id].visibility_effect == ModerationVisibilityEffect.NONE
        assert snapshot.posts[post.id].visibility == Visibility.PRIVATE
    finally:
        await service.shutdown()
