import json

import httpx
import pytest

from studio_platform.providers import (
    FalProvider,
    ProviderCapabilities,
    ProviderFatalError,
    ProviderReferenceImage,
    ProviderRegistry,
    ProviderResult,
    RunwareProvider,
    StudioImageProvider,
)


class _FakeProvider(StudioImageProvider):
    def __init__(
        self,
        *,
        name: str,
        rollout_tier: str,
        capabilities: ProviderCapabilities,
        available: bool = True,
    ) -> None:
        self.name = name
        self.rollout_tier = rollout_tier
        self.capabilities = capabilities
        self.available = available
        self.calls: list[dict[str, object]] = []

    async def is_available(self) -> bool:
        return self.available

    async def health(self, probe: bool = True) -> dict[str, object]:
        return {
            "name": self.name,
            "status": "healthy" if self.available else "disabled",
            "detail": "fake",
        }

    async def generate(self, **kwargs) -> ProviderResult:
        self.calls.append(kwargs)
        return ProviderResult(
            provider=self.name,
            image_bytes=b"ok",
            mime_type="image/png",
            width=int(kwargs["width"]),
            height=int(kwargs["height"]),
            estimated_cost=0.0,
        )


def _registry_with(*providers: StudioImageProvider) -> ProviderRegistry:
    registry = ProviderRegistry()
    registry.providers = list(providers)
    return registry


def test_preview_generation_provider_prefers_first_supported_provider() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="fal",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image"),
                supports_reference_image=True,
                supports_async_queue=True,
            ),
        ),
        _FakeProvider(
            name="runware",
            rollout_tier="secondary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image"),
                supports_reference_image=True,
            ),
        ),
    )

    assert registry.preview_generation_provider(workflow="text_to_image") == "fal"


@pytest.mark.asyncio
async def test_generate_skips_text_to_image_only_provider_for_reference_workflow() -> None:
    pollinations = _FakeProvider(
        name="pollinations",
        rollout_tier="degraded",
        capabilities=ProviderCapabilities(workflows=("text_to_image",)),
    )
    runware = _FakeProvider(
        name="runware",
        rollout_tier="secondary",
        capabilities=ProviderCapabilities(
            workflows=("text_to_image", "image_to_image"),
            supports_reference_image=True,
        ),
    )
    registry = _registry_with(pollinations, runware)

    reference = ProviderReferenceImage(
        asset_id="asset-ref",
        image_bytes=b"image",
        mime_type="image/png",
        title="ref",
    )
    result = await registry.generate(
        prompt="make variations",
        negative_prompt="",
        width=1024,
        height=1024,
        seed=42,
        reference_image=reference,
        model_id="flux-schnell",
        workflow="image_to_image",
    )

    assert result.provider == "runware"
    assert pollinations.calls == []
    assert runware.calls[0]["workflow"] == "image_to_image"


@pytest.mark.asyncio
async def test_health_snapshot_includes_capabilities_and_priority() -> None:
    registry = _registry_with(
        _FakeProvider(
            name="fal",
            rollout_tier="primary",
            capabilities=ProviderCapabilities(
                workflows=("text_to_image", "image_to_image", "edit"),
                supports_reference_image=True,
                supports_async_queue=True,
            ),
        ),
        _FakeProvider(
            name="demo",
            rollout_tier="local-fallback",
            capabilities=ProviderCapabilities(workflows=("text_to_image",)),
        ),
    )

    snapshot = await registry.health_snapshot(probe=False)

    assert snapshot[0]["name"] == "fal"
    assert snapshot[0]["priority"] == 1
    assert snapshot[0]["capabilities"]["supports_async_queue"] is True
    assert snapshot[1]["name"] == "demo"
    assert snapshot[1]["priority"] == 2


@pytest.mark.asyncio
async def test_fal_provider_generates_via_queue_and_downloads_output() -> None:
    requests: list[tuple[str, str, object | None]] = []
    status_hits = {"count": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        payload = None
        if request.content:
            payload = json.loads(request.content.decode("utf-8"))
        requests.append((request.method, str(request.url), payload))

        if request.method == "POST" and str(request.url).startswith("https://queue.fal.run/fal-ai/flux/schnell"):
            return httpx.Response(
                200,
                json={
                    "request_id": "req-1",
                    "status_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/req-1/status",
                    "response_url": "https://queue.fal.run/fal-ai/flux/schnell/requests/req-1",
                },
            )
        if request.url.path.endswith("/status"):
            status_hits["count"] += 1
            if status_hits["count"] == 1:
                return httpx.Response(200, json={"status": "IN_QUEUE"})
            return httpx.Response(200, json={"status": "COMPLETED"})
        if request.url.path.endswith("/req-1"):
            return httpx.Response(
                200,
                json={
                    "images": [
                        {
                            "url": "https://cdn.fal.ai/generated/output.png",
                            "content_type": "image/png",
                            "width": 1024,
                            "height": 1024,
                        }
                    ]
                },
            )
        if str(request.url) == "https://cdn.fal.ai/generated/output.png":
            return httpx.Response(200, content=b"pngbytes", headers={"content-type": "image/png"})
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    provider = FalProvider("test-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="cinematic portrait",
        negative_prompt="",
        width=1024,
        height=1024,
        seed=42,
        model_id="flux-schnell",
    )

    assert result.provider == "fal"
    assert result.image_bytes == b"pngbytes"
    assert result.mime_type == "image/png"
    assert requests[0][0] == "POST"
    assert requests[0][1].startswith("https://queue.fal.run/fal-ai/flux/schnell")
    assert requests[0][2]["prompt"] == "cinematic portrait"


@pytest.mark.asyncio
async def test_fal_provider_uses_reference_image_for_edit_workflow() -> None:
    submitted_payload: dict[str, object] = {}
    submitted_url = ""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal submitted_payload, submitted_url
        if request.method == "POST" and request.content:
            submitted_payload = json.loads(request.content.decode("utf-8"))
            submitted_url = str(request.url)

        if request.method == "POST":
            return httpx.Response(
                200,
                json={
                    "request_id": "req-2",
                    "status_url": "https://queue.fal.run/fal-ai/flux-pro/kontext/requests/req-2/status",
                    "response_url": "https://queue.fal.run/fal-ai/flux-pro/kontext/requests/req-2",
                },
            )
        if request.url.path.endswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        if request.url.path.endswith("/req-2"):
            return httpx.Response(
                200,
                json={
                    "images": [
                        {
                            "url": "https://cdn.fal.ai/generated/edit.png",
                            "content_type": "image/png",
                            "width": 900,
                            "height": 900,
                        }
                    ]
                },
            )
        if str(request.url) == "https://cdn.fal.ai/generated/edit.png":
            return httpx.Response(200, content=b"edit-bytes", headers={"content-type": "image/png"})
        raise AssertionError(f"Unexpected request: {request.method} {request.url}")

    provider = FalProvider("test-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="make it more editorial",
        negative_prompt="blurry",
        width=900,
        height=900,
        seed=7,
        reference_image=ProviderReferenceImage(
            asset_id="asset-1",
            image_bytes=b"ref-bytes",
            mime_type="image/png",
            title="Reference",
        ),
        model_id="realvis-xl",
        workflow="edit",
    )

    assert result.image_bytes == b"edit-bytes"
    assert submitted_url.startswith("https://queue.fal.run/fal-ai/flux-pro/kontext")
    assert str(submitted_payload["image_url"]).startswith("data:image/png;base64,")
    assert submitted_payload["resolution_mode"] == "match_input"
    assert "Avoid: blurry" in str(submitted_payload["prompt"])


@pytest.mark.asyncio
async def test_fal_provider_surfaces_validation_errors_as_fatal() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, text="invalid payload")

    provider = FalProvider("test-key", transport=httpx.MockTransport(handler))

    with pytest.raises(ProviderFatalError, match="422"):
        await provider.generate(
            prompt="bad",
            negative_prompt="",
            width=1024,
            height=1024,
            seed=1,
            model_id="flux-schnell",
        )


@pytest.mark.asyncio
async def test_runware_provider_generates_from_base64_response() -> None:
    submitted_payload: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.content:
            submitted_payload.extend(json.loads(request.content.decode("utf-8")))
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "taskType": "imageInference",
                        "imageBase64Data": base64_png("runware-image"),
                        "cost": 0.012,
                        "NSFWContent": False,
                    }
                ]
            },
        )

    provider = RunwareProvider("runware-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="editorial portrait",
        negative_prompt="",
        width=768,
        height=1024,
        seed=99,
        model_id="flux-schnell",
    )

    assert result.provider == "runware"
    assert result.mime_type == "image/png"
    assert result.estimated_cost == 0.012
    assert submitted_payload[0]["taskType"] == "imageInference"
    assert submitted_payload[0]["outputType"] == "base64Data"
    assert submitted_payload[0]["positivePrompt"] == "editorial portrait"


@pytest.mark.asyncio
async def test_runware_provider_uses_seed_image_for_reference_workflow() -> None:
    submitted_payload: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.content:
            submitted_payload.extend(json.loads(request.content.decode("utf-8")))
        return httpx.Response(
            200,
            json={
                "data": [
                    {
                        "taskType": "imageInference",
                        "imageDataURI": f"data:image/png;base64,{base64_png('edit')}",
                        "cost": 0.02,
                        "NSFWContent": False,
                    }
                ]
            },
        )

    provider = RunwareProvider("runware-key", transport=httpx.MockTransport(handler))
    result = await provider.generate(
        prompt="make it brighter",
        negative_prompt="blurry",
        width=900,
        height=900,
        seed=101,
        reference_image=ProviderReferenceImage(
            asset_id="asset-1",
            image_bytes=b"seed-image",
            mime_type="image/png",
        ),
        model_id="realvis-xl",
        workflow="image_to_image",
    )

    assert result.provider == "runware"
    assert submitted_payload[0]["seedImage"].startswith("data:image/png;base64,")
    assert submitted_payload[0]["strength"] == 0.7
    assert submitted_payload[0]["negativePrompt"] == "blurry"


@pytest.mark.asyncio
async def test_runware_provider_surfaces_validation_errors_as_fatal() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"errors": [{"message": "invalid image size"}]})

    provider = RunwareProvider("runware-key", transport=httpx.MockTransport(handler))

    with pytest.raises(ProviderFatalError, match="invalid image size"):
        await provider.generate(
            prompt="bad request",
            negative_prompt="",
            width=64,
            height=64,
            seed=12,
            model_id="flux-schnell",
        )


def base64_png(text: str) -> str:
    return __import__("base64").b64encode(text.encode("utf-8")).decode("ascii")
