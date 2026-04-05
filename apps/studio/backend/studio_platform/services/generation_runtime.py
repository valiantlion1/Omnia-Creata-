from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable, Optional

from ..models import GenerationJob, GenerationOutput, MediaAsset
from ..providers import ProviderReferenceImage, ProviderRegistry, ProviderTemporaryError
from ..repository import StudioRepository


@dataclass(slots=True)
class ExecutedGenerationBatch:
    provider_name: Optional[str]
    generated_outputs: list[GenerationOutput]
    created_assets: list[MediaAsset]


class GenerationRuntime:
    def __init__(
        self,
        *,
        store: StudioRepository,
        providers: ProviderRegistry,
        read_asset_bytes: Callable[..., Awaitable[tuple[bytes, str]]],
        create_asset_from_result: Callable[..., Awaitable[MediaAsset]],
    ) -> None:
        self.store = store
        self.providers = providers
        self._read_asset_bytes = read_asset_bytes
        self._create_asset_from_result = create_asset_from_result

    async def load_reference_image(self, job: GenerationJob) -> Optional[ProviderReferenceImage]:
        reference_asset_id = job.prompt_snapshot.reference_asset_id
        if not reference_asset_id:
            return None

        reference_asset = await self.store.get_asset(reference_asset_id)
        if reference_asset is None or reference_asset.identity_id != job.identity_id:
            raise ProviderTemporaryError("Reference image is not available for this generation")

        image_bytes, mime_type = await self._read_asset_bytes(reference_asset, variant="content")
        return ProviderReferenceImage(
            asset_id=reference_asset.id,
            image_bytes=image_bytes,
            mime_type=mime_type,
            title=reference_asset.title,
        )

    async def execute_job(self, job: GenerationJob) -> ExecutedGenerationBatch:
        generated_outputs: list[GenerationOutput] = []
        created_assets: list[MediaAsset] = []
        provider_name: Optional[str] = None
        reference_image = await self.load_reference_image(job)

        for variation_index in range(job.output_count):
            variation_seed = job.prompt_snapshot.seed + variation_index
            result = await self.providers.generate(
                prompt=job.prompt_snapshot.prompt,
                negative_prompt=job.prompt_snapshot.negative_prompt,
                width=job.prompt_snapshot.width,
                height=job.prompt_snapshot.height,
                seed=variation_seed,
                reference_image=reference_image,
                model_id=job.model,
                steps=job.prompt_snapshot.steps,
                cfg_scale=job.prompt_snapshot.cfg_scale,
                workflow=job.prompt_snapshot.workflow,
            )
            provider_name = result.provider
            asset = await self._create_asset_from_result(
                job=job,
                provider=result.provider,
                image_bytes=result.image_bytes,
                mime_type=result.mime_type,
                variation_index=variation_index,
                variation_count=job.output_count,
                seed=variation_seed,
            )
            created_assets.append(asset)
            generated_outputs.append(
                GenerationOutput(
                    asset_id=asset.id,
                    url=asset.url,
                    thumbnail_url=asset.thumbnail_url,
                    mime_type=result.mime_type,
                    width=job.prompt_snapshot.width,
                    height=job.prompt_snapshot.height,
                    variation_index=variation_index,
                )
            )

        return ExecutedGenerationBatch(
            provider_name=provider_name,
            generated_outputs=generated_outputs,
            created_assets=created_assets,
        )


def initial_generation_provider_label(providers: ProviderRegistry, model_id: Optional[str]) -> str:
    preview = getattr(providers, "preview_generation_provider", None)
    if callable(preview):
        return preview()
    return "cloud"
