from pathlib import Path

import pytest

from studio_platform.models import GenerationJob, JobStatus, MediaAsset, PromptSnapshot
from studio_platform.providers import ProviderReferenceImage, ProviderResult
from studio_platform.repository import StudioRepository
from studio_platform.services.generation_runtime import GenerationRuntime, initial_generation_provider_label
from studio_platform.store import StudioStateStore


class _StubProviders:
    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def generate(self, **kwargs) -> ProviderResult:
        self.calls.append(kwargs)
        return ProviderResult(
            provider="stub-provider",
            image_bytes=b"image-bytes",
            mime_type="image/png",
            width=int(kwargs["width"]),
            height=int(kwargs["height"]),
            estimated_cost=0.0,
        )


@pytest.mark.asyncio
async def test_generation_runtime_executes_reference_guided_variations(tmp_path: Path):
    store = StudioStateStore(tmp_path / "state.json")
    providers = _StubProviders()
    created_assets: list[MediaAsset] = []

    reference_asset = MediaAsset(
        id="asset-ref",
        workspace_id="ws-1",
        project_id="project-1",
        identity_id="user-1",
        title="Reference board",
        prompt="ref",
        url="stored",
        metadata={"mime_type": "image/png"},
    )

    await store.mutate(lambda state: state.assets.__setitem__(reference_asset.id, reference_asset))

    async def read_asset_bytes(asset: MediaAsset, *, variant: str) -> tuple[bytes, str]:
        assert variant == "content"
        return (b"reference-image", "image/png")

    async def create_asset_from_result(**kwargs) -> MediaAsset:
        asset = MediaAsset(
            id=f"asset-{kwargs['variation_index']}",
            workspace_id=kwargs["job"].workspace_id,
            project_id=kwargs["job"].project_id,
            identity_id=kwargs["job"].identity_id,
            title=kwargs["job"].title,
            prompt=kwargs["job"].prompt_snapshot.prompt,
            url=f"/media/{kwargs['variation_index']}.png",
            thumbnail_url=f"/media/{kwargs['variation_index']}_thumb.jpg",
            metadata={"provider": kwargs["provider"], "seed": kwargs["seed"]},
        )
        created_assets.append(asset)
        return asset

    runtime = GenerationRuntime(
        store=StudioRepository(store),
        providers=providers,
        read_asset_bytes=read_asset_bytes,
        create_asset_from_result=create_asset_from_result,
    )
    job = GenerationJob(
        workspace_id="ws-1",
        project_id="project-1",
        identity_id="user-1",
        title="Reference-driven job",
        model="flux-schnell",
        estimated_cost=0.0,
        credit_cost=0,
        output_count=2,
        prompt_snapshot=PromptSnapshot(
            prompt="Turn this into a polished campaign visual",
            negative_prompt="",
            model="flux-schnell",
            workflow="image_to_image",
            reference_asset_id=reference_asset.id,
            width=1024,
            height=1024,
            steps=24,
            cfg_scale=6.0,
            seed=42,
            aspect_ratio="1:1",
        ),
    )

    execution = await runtime.execute_job(job)

    assert execution.provider_name == "stub-provider"
    assert execution.provider_rollout_tier == "fallback"
    assert execution.provider_billable is False
    assert execution.actual_cost_usd == 0.0
    assert [output.asset_id for output in execution.generated_outputs] == ["asset-0", "asset-1"]
    assert len(providers.calls) == 2
    assert providers.calls[0]["seed"] == 42
    assert providers.calls[1]["seed"] == 43
    assert providers.calls[0]["workflow"] == "image_to_image"
    assert isinstance(providers.calls[0]["reference_image"], ProviderReferenceImage)
    assert providers.calls[0]["reference_image"].asset_id == reference_asset.id


def test_initial_generation_provider_label_defaults_to_cloud() -> None:
    providers = _StubProviders()

    assert initial_generation_provider_label(providers, "flux-schnell") == "cloud"


def test_initial_generation_provider_label_uses_registry_preview_when_available() -> None:
    class _PreviewProviders(_StubProviders):
        def preview_generation_provider(self) -> str:
            return "fal"

    providers = _PreviewProviders()

    assert initial_generation_provider_label(providers, "flux-schnell") == "fal"


def test_generation_job_coerces_legacy_statuses_into_durable_lifecycle() -> None:
    queued_job = GenerationJob.model_validate(
        {
            "id": "job-queued",
            "workspace_id": "ws-1",
            "project_id": "project-1",
            "identity_id": "user-1",
            "title": "Queued job",
            "status": "pending",
            "provider": "pending",
            "model": "flux-schnell",
            "prompt_snapshot": {
                "prompt": "hello",
                "negative_prompt": "",
                "model": "flux-schnell",
                "workflow": "text_to_image",
                "reference_asset_id": None,
                "width": 1024,
                "height": 1024,
                "steps": 20,
                "cfg_scale": 6.0,
                "seed": 42,
                "aspect_ratio": "1:1",
            },
            "estimated_cost": 0.0,
            "credit_cost": 0,
        }
    )
    succeeded_job = GenerationJob.model_validate(
        queued_job.model_dump(mode="python") | {"status": "completed"}
    )

    assert queued_job.status == JobStatus.QUEUED
    assert succeeded_job.status == JobStatus.SUCCEEDED
