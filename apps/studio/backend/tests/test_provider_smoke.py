import pytest

from studio_platform.providers import (
    ProviderCapabilities,
    ProviderReferenceImage,
    ProviderResult,
    ProviderTemporaryError,
    StudioImageProvider,
)
from studio_platform.services.provider_smoke import (
    ProviderSmokeCase,
    build_default_smoke_cases,
    build_smoke_reference_image,
    run_provider_smoke_case,
)


class FakeProvider(StudioImageProvider):
    capabilities = ProviderCapabilities(
        workflows=("text_to_image", "edit"),
        supports_reference_image=True,
    )

    def __init__(self, name: str, *, available: bool = True, error: Exception | None = None):
        self.name = name
        self._available = available
        self._error = error

    async def is_available(self) -> bool:
        return self._available

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {"name": self.name, "status": "healthy"}

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: ProviderReferenceImage | None = None,
        model_id: str | None = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        if self._error is not None:
            raise self._error
        return ProviderResult(
            provider=self.name,
            image_bytes=b"image-bytes",
            mime_type="image/png",
            width=width,
            height=height,
            estimated_cost=0.12,
        )


def test_build_default_smoke_cases_filters_selected_provider() -> None:
    cases = build_default_smoke_cases(selected_provider="runware", include_failure_probe=False)
    assert {case.provider_name for case in cases} == {"runware"}
    assert all(case.label.startswith("runware") for case in cases)


def test_build_smoke_reference_image_returns_png_reference() -> None:
    reference = build_smoke_reference_image()
    assert reference.asset_id == "smoke-reference"
    assert reference.mime_type == "image/png"
    assert reference.image_bytes.startswith(b"\x89PNG")


@pytest.mark.asyncio
async def test_run_provider_smoke_case_reports_success() -> None:
    provider = FakeProvider("fal")
    result = await run_provider_smoke_case(
        provider,
        ProviderSmokeCase(
            label="fal-text",
            provider_name="fal",
            workflow="text_to_image",
            prompt="A premium product render",
        ),
    )
    assert result.status == "ok"
    assert result.actual_provider == "fal"
    assert result.output_bytes == len(b"image-bytes")


@pytest.mark.asyncio
async def test_run_provider_smoke_case_reports_expected_failure() -> None:
    provider = FakeProvider("fal", error=ProviderTemporaryError("reference image required"))
    result = await run_provider_smoke_case(
        provider,
        ProviderSmokeCase(
            label="fal-edit-probe",
            provider_name="fal",
            workflow="edit",
            prompt="Edit this image",
            expected_error_type=ProviderTemporaryError,
        ),
    )
    assert result.status == "expected_failure"
    assert result.error_type == "ProviderTemporaryError"


@pytest.mark.asyncio
async def test_run_provider_smoke_case_skips_unconfigured_provider() -> None:
    provider = FakeProvider("runware", available=False)
    result = await run_provider_smoke_case(
        provider,
        ProviderSmokeCase(
            label="runware-text",
            provider_name="runware",
            workflow="text_to_image",
            prompt="A premium product render",
        ),
    )
    assert result.status == "skipped"
