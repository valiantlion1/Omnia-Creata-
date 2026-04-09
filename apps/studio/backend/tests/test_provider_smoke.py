import pytest

from config.env import get_settings
from security.redaction import redact_sensitive_text
from studio_platform.llm import LLMResult
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
    run_chat_provider_smoke_case,
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
        self.calls: list[dict[str, object]] = []

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
        self.calls.append(
            {
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "seed": seed,
                "reference_image": reference_image,
                "model_id": model_id,
                "steps": steps,
                "cfg_scale": cfg_scale,
                "workflow": workflow,
            }
        )
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


class FakeGateway:
    def __init__(self, *, text: str = "STUDIO_SMOKE_OK ready", error: Exception | None = None):
        self._text = text
        self._error = error

    async def _chat_with_gemini(self, **_: object) -> LLMResult | None:
        if self._error is not None:
            raise self._error
        return LLMResult(
            text=self._text,
            provider="gemini",
            model="gemini-2.5-flash",
            estimated_cost_usd=0.001,
        )


def test_build_default_smoke_cases_filters_selected_provider() -> None:
    cases = build_default_smoke_cases(selected_provider="runware", include_failure_probe=False)
    assert {case.provider_name for case in cases} == {"runware"}
    assert all(case.label.startswith("runware") for case in cases)


def test_build_default_smoke_cases_can_filter_chat_surface() -> None:
    cases = build_default_smoke_cases(
        selected_provider="gemini",
        selected_surface="chat",
        include_failure_probe=False,
    )
    assert {case.provider_name for case in cases} == {"gemini"}
    assert {case.surface for case in cases} == {"chat"}
    assert all(case.workflow == "chat" for case in cases)


def test_build_default_smoke_cases_include_openai_image_and_chat_surfaces() -> None:
    cases = build_default_smoke_cases(
        selected_provider="openai",
        selected_surface="all",
        include_failure_probe=False,
    )
    assert {case.provider_name for case in cases} == {"openai"}
    assert {case.surface for case in cases} == {"chat", "image"}
    assert any(case.workflow == "text_to_image" for case in cases if case.surface == "image")
    assert any(case.workflow == "edit" for case in cases if case.surface == "image")
    assert any(case.workflow == "chat" for case in cases if case.surface == "chat")


def test_build_default_smoke_cases_split_openai_image_into_draft_and_final_lanes() -> None:
    settings = get_settings()
    cases = build_default_smoke_cases(
        selected_provider="openai",
        selected_surface="image",
        include_failure_probe=False,
    )

    image_cases = {(case.label, case.lane, case.model, case.workflow) for case in cases}

    assert image_cases == {
        ("openai-draft-text-to-image", "draft", settings.openai_image_draft_model, "text_to_image"),
        ("openai-final-text-to-image", "final", settings.openai_image_model, "text_to_image"),
        ("openai-final-image-edit", "final", settings.openai_image_model, "edit"),
    }


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
async def test_run_provider_smoke_case_forwards_model_and_lane() -> None:
    provider = FakeProvider("openai")
    result = await run_provider_smoke_case(
        provider,
        ProviderSmokeCase(
            label="openai-draft",
            provider_name="openai",
            workflow="text_to_image",
            surface="image",
            lane="draft",
            model="gpt-image-1-mini",
            prompt="A draft skincare render",
        ),
    )

    assert result.status == "ok"
    assert result.lane == "draft"
    assert provider.calls[0]["model_id"] == "gpt-image-1-mini"


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


@pytest.mark.asyncio
async def test_run_chat_provider_smoke_case_reports_success() -> None:
    settings = get_settings()
    original_gemini_api_key = settings.gemini_api_key
    settings.gemini_api_key = "gemini-key"
    try:
        result = await run_chat_provider_smoke_case(
            FakeGateway(),
            ProviderSmokeCase(
                label="gemini-chat",
                provider_name="gemini",
                workflow="chat",
                surface="chat",
                prompt="Return STUDIO_SMOKE_OK and one sentence.",
            ),
        )
        assert result.status == "ok"
        assert result.surface == "chat"
        assert result.actual_provider == "gemini"
        assert result.text_preview and "STUDIO_SMOKE_OK" in result.text_preview
    finally:
        settings.gemini_api_key = original_gemini_api_key


@pytest.mark.asyncio
async def test_run_chat_provider_smoke_case_redacts_sensitive_error_text() -> None:
    settings = get_settings()
    original_gemini_api_key = settings.gemini_api_key
    settings.gemini_api_key = "AIzaSyRealKeyShouldNeverLeak1234567890"
    try:
        result = await run_chat_provider_smoke_case(
            FakeGateway(
                error=RuntimeError(
                    "provider failed at https://generativelanguage.googleapis.com/v1beta/models"
                    "/gemini-2.5-flash:generateContent?key=AIzaSyRealKeyShouldNeverLeak1234567890"
                )
            ),
            ProviderSmokeCase(
                label="gemini-chat",
                provider_name="gemini",
                workflow="chat",
                surface="chat",
                prompt="Return STUDIO_SMOKE_OK and one sentence.",
            ),
        )
        assert result.status == "error"
        assert result.error is not None
        assert "AIzaSyRealKeyShouldNeverLeak1234567890" not in result.error
        assert "ShouldNeverLeak1234567890" not in result.error
        assert "***REDACTED***" in result.error
    finally:
        settings.gemini_api_key = original_gemini_api_key


def test_redact_sensitive_text_fully_masks_query_param_value() -> None:
    redacted = redact_sensitive_text(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
        "?key=AIzaSyCPQPhy6yWLzfJ6W7icofB771qmdfifG90"
    )

    assert "?key=***REDACTED***" in redacted
    assert "AIzaSyCPQPhy6yWLzfJ6W7icofB771qmdfifG90" not in redacted
    assert "SyCPQPhy6yWLzfJ6W7icofB771qmdfifG90" not in redacted


@pytest.mark.asyncio
async def test_run_chat_provider_smoke_case_skips_unconfigured_provider() -> None:
    settings = get_settings()
    original_gemini_api_key = settings.gemini_api_key
    settings.gemini_api_key = None
    try:
        result = await run_chat_provider_smoke_case(
            FakeGateway(),
            ProviderSmokeCase(
                label="gemini-chat",
                provider_name="gemini",
                workflow="chat",
                surface="chat",
                prompt="Return STUDIO_SMOKE_OK and one sentence.",
            ),
        )
        assert result.status == "skipped"
        assert result.surface == "chat"
    finally:
        settings.gemini_api_key = original_gemini_api_key
