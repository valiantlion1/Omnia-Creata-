from pathlib import Path

import pytest

from studio_platform.models import IdentityPlan, MediaAsset, OmniaIdentity, Project, StudioWorkspace
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
from studio_platform.store import StudioStateStore


async def _build_service(tmp_path: Path) -> StudioService:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()
    return service


async def _seed_identity(service: StudioService) -> OmniaIdentity:
    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        plan=IdentityPlan.PRO,
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")
    await service.store.mutate(
        lambda state: (
            state.identities.__setitem__(identity.id, identity),
            state.workspaces.__setitem__(workspace.id, workspace),
        )
    )
    return identity


@pytest.mark.asyncio
async def test_settings_payload_exposes_draft_projects_but_hides_them_from_user_project_lists(tmp_path: Path) -> None:
    service = await _build_service(tmp_path)
    identity = await _seed_identity(service)

    settings = await service.get_settings_payload(identity.id)
    visible_projects = await service.list_projects(identity.id, surface="compose")
    all_projects = await service.list_projects(identity.id, surface="compose", include_system_managed=True)

    compose_draft_id = settings["draft_projects"]["compose"]
    assert compose_draft_id
    assert visible_projects == []
    assert any(project.id == compose_draft_id and project.system_managed for project in all_projects)
    assert settings["styles"]["my_styles"] == []
    assert settings["prompt_memory"]["generation_count"] == 0


@pytest.mark.asyncio
async def test_serialize_asset_exposes_protected_library_contract_fields(tmp_path: Path) -> None:
    service = await _build_service(tmp_path)
    identity = await _seed_identity(service)
    project = await service.create_project(identity.id, "Editorial", "Editorial project")

    asset = MediaAsset(
        id="asset-1",
        workspace_id=identity.workspace_id,
        project_id=project.id,
        identity_id=identity.id,
        title="Original title",
        prompt="cinematic anime portrait with blue eyes",
        url="stored",
        metadata={
            "display_title": "Anime Portrait",
            "derived_tags": ["anime", "portrait", "blue-eyes"],
            "protection_state": "blocked",
            "library_state": "blocked",
        },
    )

    payload = service.serialize_asset(asset, identity_id=identity.id, allow_clean_export=True)

    assert payload["display_title"] == "Anime Portrait"
    assert payload["derived_tags"] == ["anime", "portrait", "blue-eyes"]
    assert payload["library_state"] == "blocked"
    assert payload["protection_state"] == "blocked"
    assert payload["can_open"] is False
    assert payload["can_export_clean"] is False
    assert "/preview" in payload["preview_url"]
    assert "/blocked-preview" in payload["blocked_preview_url"]


@pytest.mark.asyncio
async def test_styles_and_prompt_memory_round_trip_through_service(tmp_path: Path) -> None:
    service = await _build_service(tmp_path)
    identity = await _seed_identity(service)

    style = await service.save_style_from_prompt(
        identity.id,
        prompt="cinematic anime fashion portrait with luminous blue eyes",
        category="illustration",
        negative_prompt="blurry low quality extra fingers",
        preferred_model_id="flux-schnell",
        preferred_aspect_ratio="1:1",
        preferred_steps=30,
        preferred_cfg_scale=7,
        preferred_output_count=2,
    )
    await service._record_prompt_memory_signal(
        identity_id=identity.id,
        prompt="cinematic anime fashion portrait with luminous blue eyes",
        negative_prompt="blurry low quality extra fingers",
        model_id="flux-schnell",
        aspect_ratio="1:1",
    )

    styles_payload = await service.list_styles(identity.id)
    prompt_memory_payload = await service.get_prompt_memory_profile_payload(identity.id)

    assert styles_payload["my_styles"][0]["id"] == style.id
    assert styles_payload["my_styles"][0]["prompt_modifier"] == style.prompt_modifier
    assert styles_payload["my_styles"][0]["text_mode"] == "prompt"
    assert styles_payload["my_styles"][0]["negative_prompt"] == "blurry low quality extra fingers"
    assert styles_payload["my_styles"][0]["preferred_model_id"] == "flux-schnell"
    assert styles_payload["my_styles"][0]["preferred_aspect_ratio"] == "1:1"
    assert styles_payload["my_styles"][0]["preferred_steps"] == 30
    assert styles_payload["my_styles"][0]["preferred_cfg_scale"] == 7
    assert styles_payload["my_styles"][0]["preferred_output_count"] == 2
    assert prompt_memory_payload["generation_count"] == 1
    assert prompt_memory_payload["context_summary"]
    assert "1:1" in prompt_memory_payload["preferred_aspect_ratios"]
    assert any(tag in prompt_memory_payload["aesthetic_tags"] for tag in {"anime", "cinematic", "editorial"})


@pytest.mark.asyncio
async def test_styles_support_mutation_and_delete_flow(tmp_path: Path) -> None:
    service = await _build_service(tmp_path)
    identity = await _seed_identity(service)

    style = await service.save_style(
        identity.id,
        title="Starter Portrait",
        prompt_modifier="soft portrait lighting, calm expression",
        text_mode="prompt",
        description="Original starter",
        category="illustration",
    )

    updated = await service.update_style(
        identity.id,
        style.id,
        updates={
            "title": "Night Portrait",
            "description": "A sharper saved preset",
            "text_mode": "modifier",
            "negative_prompt": "extra fingers",
            "preferred_aspect_ratio": "4:5",
            "preferred_output_count": 3,
            "favorite": True,
        },
    )

    assert updated.title == "Night Portrait"
    assert updated.text_mode == "modifier"
    assert updated.negative_prompt == "extra fingers"
    assert updated.preferred_aspect_ratio == "4:5"
    assert updated.preferred_output_count == 3
    assert updated.favorite is True

    await service.delete_style(identity.id, style.id)
    styles_payload = await service.list_styles(identity.id)
    assert styles_payload["my_styles"] == []
