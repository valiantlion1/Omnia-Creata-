from __future__ import annotations

import asyncio
import base64
import io
import json
import textwrap
import time
from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Awaitable, Callable, Dict, List, Optional, Sequence, TypeVar
from urllib.parse import quote

import httpx
from PIL import Image, ImageDraw, ImageFont

from config.env import Environment, get_settings, reveal_secret
from security.redaction import redact_sensitive_text

from .models import IdentityPlan
from .prompt_engineering import PromptProfileAnalysis, analyze_generation_prompt_profile

ProviderOpT = TypeVar("ProviderOpT")


class ProviderTemporaryError(Exception):
    """Provider failed in a retryable way."""


class ProviderFatalError(Exception):
    """Provider failed in a non-retryable way."""


@dataclass(slots=True)
class ProviderResult:
    provider: str
    image_bytes: bytes
    mime_type: str
    width: int
    height: int
    estimated_cost: float
    provider_rollout_tier: str = "fallback"
    billable: bool = False


@dataclass(slots=True)
class ProviderReferenceImage:
    asset_id: str
    image_bytes: bytes
    mime_type: str
    title: str = ""


@dataclass(slots=True)
class ProviderObservation:
    timestamp_monotonic: float
    success: bool
    latency_ms: float


@dataclass(slots=True)
class ProviderCircuitState:
    consecutive_failures: int = 0
    opened_until_monotonic: float | None = None
    half_open: bool = False
    half_open_in_flight: bool = False
    last_error: str | None = None
    observations: deque[ProviderObservation] = field(default_factory=deque)


@dataclass(frozen=True, slots=True)
class ProviderCapabilities:
    workflows: tuple[str, ...]
    supports_reference_image: bool = False
    supports_analysis: bool = False
    supports_upscale: bool = False
    supports_async_queue: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "workflows": list(self.workflows),
            "supports_reference_image": self.supports_reference_image,
            "supports_analysis": self.supports_analysis,
            "supports_upscale": self.supports_upscale,
            "supports_async_queue": self.supports_async_queue,
        }


WORKFLOW_COMPATIBILITY: dict[str, tuple[str, ...]] = {
    "text_to_image": ("text_to_image",),
    "image_to_image": ("image_to_image",),
    "edit": ("edit", "image_to_image"),
}
_PREMIUM_CAPABLE_PROVIDERS = frozenset({"openai", "fal", "runware"})
_STANDARD_CAPABLE_PROVIDERS = frozenset({"pollinations", "huggingface"})
_DEGRADED_ONLY_PROVIDERS = frozenset({"demo"})
_QUALITY_TIER_RANK = {"degraded": 0, "standard": 1, "premium": 2}

_REALISM_HINTS = (
    "portrait",
    "fashion",
    "beauty",
    "editorial",
    "product",
    "campaign",
    "photo",
    "photography",
    "cinematic",
    "realistic",
)
_STYLIZED_HINTS = (
    "illustration",
    "anime",
    "manga",
    "concept art",
    "fantasy",
    "sci-fi",
    "cyberpunk",
    "stylized",
)
_AUTH_FAILURE_MARKERS = (
    "401",
    "403",
    "unauthorized",
    "forbidden",
    "invalid api key",
    "invalid token",
    "expired token",
    "token is expired",
    "authentication required",
    "permission denied",
)


@dataclass(frozen=True, slots=True)
class GenerationRoutingDecision:
    workflow: str
    requested_quality_tier: str
    selected_quality_tier: str
    degraded: bool
    routing_strategy: str
    routing_reason: str
    prompt_profile: str
    provider_candidates: tuple[str, ...]
    selected_provider: str | None = None


def normalize_generation_workflow(workflow: str | None, *, has_reference_image: bool = False) -> str:
    normalized = (workflow or "").strip().lower()
    if normalized in {"image_to_image", "img2img", "i2i"}:
        return "image_to_image"
    if normalized in {"edit", "inpaint", "outpaint"}:
        return "edit"
    if has_reference_image:
        return "image_to_image"
    return "text_to_image"


def is_provider_auth_failure(value: Exception | str | None) -> bool:
    text = str(value or "").strip().lower()
    if not text:
        return False
    return any(marker in text for marker in _AUTH_FAILURE_MARKERS)


class StudioImageProvider(ABC):
    name: str
    rollout_tier: str = "fallback"
    billable: bool = False
    capabilities: ProviderCapabilities = ProviderCapabilities(workflows=("text_to_image",))
    request_timeout_seconds: float = 30.0
    retry_backoff_seconds: tuple[float, ...] = (1.0, 2.0, 4.0)

    @abstractmethod
    async def is_available(self) -> bool:
        raise NotImplementedError

    def is_configured(self) -> bool:
        return True

    @abstractmethod
    async def health(self, probe: bool = True) -> Dict[str, object]:
        raise NotImplementedError

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        raise NotImplementedError

    def estimate_generation_cost(
        self,
        *,
        width: int,
        height: int,
        model_id: Optional[str] = None,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
    ) -> float | None:
        return None

    def supports_generation(self, workflow: str, *, has_reference_image: bool) -> bool:
        normalized = normalize_generation_workflow(workflow, has_reference_image=has_reference_image)
        accepted_workflows = WORKFLOW_COMPATIBILITY.get(normalized, ("text_to_image",))
        if not any(candidate in self.capabilities.workflows for candidate in accepted_workflows):
            return False
        if has_reference_image and normalized in {"image_to_image", "edit"} and not self.capabilities.supports_reference_image:
            return False
        return True

    async def health_snapshot(self, probe: bool = True, *, priority: int) -> Dict[str, object]:
        payload = await self.health(probe=probe)
        return {
            **payload,
            "rollout_tier": self.rollout_tier,
            "billable": self.billable,
            "priority": priority,
            "capabilities": self.capabilities.to_dict(),
        }

    async def _run_with_retry(
        self,
        *,
        operation_name: str,
        operation: Callable[[], Awaitable[ProviderOpT]],
    ) -> ProviderOpT:
        last_error: ProviderTemporaryError | None = None
        retry_backoff_seconds = self._effective_retry_backoff_seconds()
        max_attempts = len(retry_backoff_seconds) + 1

        for attempt in range(max_attempts):
            try:
                return await operation()
            except asyncio.CancelledError:
                raise
            except ProviderFatalError:
                raise
            except ProviderTemporaryError as exc:
                last_error = exc
                if is_provider_auth_failure(exc):
                    break
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                last_error = ProviderTemporaryError(
                    f"{self.name} {operation_name} timed out or lost network connectivity: {exc}"
                )
            except Exception as exc:
                last_error = ProviderTemporaryError(
                    f"{self.name} {operation_name} failed unexpectedly: {exc}"
                )

            if attempt >= len(retry_backoff_seconds):
                break

            await asyncio.sleep(retry_backoff_seconds[attempt])

        raise last_error or ProviderTemporaryError(f"{self.name} {operation_name} failed")

    def _effective_retry_backoff_seconds(self) -> tuple[float, ...]:
        settings = get_settings()
        if settings.environment == Environment.DEVELOPMENT and self.billable:
            return ()
        return self.retry_backoff_seconds


class FalProvider(StudioImageProvider):
    name = "fal"
    rollout_tier = "primary"
    billable = True
    capabilities = ProviderCapabilities(
        workflows=("text_to_image", "image_to_image", "edit"),
        supports_reference_image=True,
        supports_upscale=True,
        supports_async_queue=True,
    )

    _QUEUE_BASE_URL = "https://queue.fal.run"
    _DEFAULT_MEDIA_RETENTION_SECONDS = 60 * 60
    _POLL_INTERVAL_SECONDS = 0.75

    def __init__(self, api_key: Optional[str], *, transport: httpx.AsyncBaseTransport | None = None):
        self.api_key = api_key
        self._transport = transport

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def health(self, probe: bool = True) -> Dict[str, object]:
        return {
            "name": self.name,
            "status": "healthy" if self.api_key else "not_configured",
            "detail": "primary managed provider configured" if self.api_key else "FAL_API_KEY missing",
        }

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        if not self.api_key:
            raise ProviderTemporaryError("fal.ai is not configured")
        if not self.supports_generation(workflow, has_reference_image=reference_image is not None):
            raise ProviderTemporaryError("fal.ai does not support this generation workflow")

        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=reference_image is not None,
        )
        model_path = self._resolve_model_path(
            model_id=model_id,
            workflow=normalized_workflow,
            has_reference_image=reference_image is not None,
        )
        payload = self._build_payload(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            seed=seed,
            reference_image=reference_image,
            steps=steps,
            cfg_scale=cfg_scale,
            workflow=normalized_workflow,
        )
        queue_priority = "low" if normalized_workflow == "text_to_image" and reference_image is None else "normal"
        submit_payload = await self._submit_request(
            model_path=model_path,
            payload=payload,
            priority=queue_priority,
        )
        result_payload = await self._wait_for_result(
            status_url=str(submit_payload["status_url"]),
            response_url=str(submit_payload["response_url"]),
        )
        image_info = self._extract_image_info(result_payload)
        image_bytes, mime_type = await self._download_result_image(
            image_url=str(image_info["url"]),
            fallback_mime_type=str(image_info.get("content_type") or "image/png"),
        )

        return ProviderResult(
            provider=self.name,
            image_bytes=image_bytes,
            mime_type=mime_type,
            width=int(image_info.get("width") or width),
            height=int(image_info.get("height") or height),
            estimated_cost=self._estimate_cost(model_path),
            provider_rollout_tier=self.rollout_tier,
            billable=self.billable,
        )

    def estimate_generation_cost(
        self,
        *,
        width: int,
        height: int,
        model_id: Optional[str] = None,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
    ) -> float | None:
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=has_reference_image,
        )
        model_path = self._resolve_model_path(
            model_id=model_id,
            workflow=normalized_workflow,
            has_reference_image=has_reference_image,
        )
        return self._estimate_cost(model_path)

    def _resolve_model_path(
        self,
        *,
        model_id: Optional[str],
        workflow: str,
        has_reference_image: bool,
    ) -> str:
        normalized_model = (model_id or "").strip().lower()
        if workflow in {"image_to_image", "edit"} or has_reference_image:
            return "fal-ai/flux-pro/kontext"
        if normalized_model in {"realvis-xl", "juggernaut-xl"}:
            return "fal-ai/flux-pro/kontext/text-to-image"
        return "fal-ai/flux/schnell"

    def _build_payload(
        self,
        *,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage],
        steps: int,
        cfg_scale: float,
        workflow: str,
    ) -> dict[str, object]:
        payload: dict[str, object] = {
            "prompt": prompt,
            "seed": seed,
            "guidance_scale": cfg_scale,
            "num_inference_steps": min(max(steps, 1), 50),
            "num_images": 1,
            "output_format": "png",
            "enable_safety_checker": True,
        }
        if workflow == "text_to_image":
            payload["image_size"] = {"width": width, "height": height}
            if negative_prompt.strip():
                payload["prompt"] = f"{prompt}\n\nAvoid: {negative_prompt.strip()}"
            return payload

        if reference_image is None:
            raise ProviderTemporaryError("fal.ai image edit workflow requires a reference image")

        payload["image_url"] = self._build_data_uri(reference_image)
        payload["resolution_mode"] = "match_input"
        payload["enhance_prompt"] = False
        if negative_prompt.strip():
            payload["prompt"] = f"{prompt}\n\nAvoid: {negative_prompt.strip()}"
        return payload

    async def _submit_request(
        self,
        *,
        model_path: str,
        payload: dict[str, object],
        priority: str,
    ) -> dict[str, object]:
        url = f"{self._QUEUE_BASE_URL}/{model_path}"
        async with self._build_client() as client:
            async def submit() -> httpx.Response:
                try:
                    response = await client.post(
                        url,
                        json=payload,
                        headers=self._build_headers(),
                        params={"priority": priority},
                    )
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    self._raise_provider_error(
                        status_code=exc.response.status_code,
                        detail=exc.response.text,
                    )
                except Exception as exc:
                    raise ProviderTemporaryError(f"fal.ai queue submit failed: {exc}") from exc

            response = await self._run_with_retry(
                operation_name="queue submit",
                operation=submit,
            )
        data = response.json()
        if not data.get("status_url") or not data.get("response_url"):
            raise ProviderTemporaryError("fal.ai queue submit response missing status/result URLs")
        return data

    async def _wait_for_result(
        self,
        *,
        status_url: str,
        response_url: str,
    ) -> dict[str, object]:
        deadline = time.monotonic() + max(get_settings().default_timeout_seconds, 30)
        async with self._build_client() as client:
            while time.monotonic() < deadline:
                async def fetch_status() -> httpx.Response:
                    try:
                        response = await client.get(
                            status_url,
                            headers=self._build_headers(),
                            params={"logs": 1},
                        )
                        response.raise_for_status()
                        return response
                    except httpx.HTTPStatusError as exc:
                        self._raise_provider_error(
                            status_code=exc.response.status_code,
                            detail=exc.response.text,
                        )
                    except Exception as exc:
                        raise ProviderTemporaryError(f"fal.ai queue status failed: {exc}") from exc

                response = await self._run_with_retry(
                    operation_name="queue status poll",
                    operation=fetch_status,
                )

                status_payload = response.json()
                status = str(status_payload.get("status") or "").upper()
                if status in {"IN_QUEUE", "IN_PROGRESS"}:
                    await asyncio.sleep(self._POLL_INTERVAL_SECONDS)
                    continue

                if status == "COMPLETED":
                    error = status_payload.get("error")
                    if error:
                        error_type = str(status_payload.get("error_type") or "")
                        self._raise_provider_error(
                            status_code=422 if error_type else 503,
                            detail=str(error),
                        )
                    async def fetch_result() -> httpx.Response:
                        try:
                            result_response = await client.get(
                                response_url,
                                headers=self._build_headers(),
                            )
                            result_response.raise_for_status()
                            return result_response
                        except httpx.HTTPStatusError as exc:
                            self._raise_provider_error(
                                status_code=exc.response.status_code,
                                detail=exc.response.text,
                            )
                        except Exception as exc:
                            raise ProviderTemporaryError(f"fal.ai queue result fetch failed: {exc}") from exc

                    result_response = await self._run_with_retry(
                        operation_name="queue result fetch",
                        operation=fetch_result,
                    )
                    return result_response.json()

                raise ProviderTemporaryError(f"fal.ai returned unexpected queue status: {status or 'unknown'}")

        raise ProviderTemporaryError("fal.ai queue request timed out before completion")

    async def _download_result_image(self, *, image_url: str, fallback_mime_type: str) -> tuple[bytes, str]:
        async with self._build_client() as client:
            async def download() -> httpx.Response:
                try:
                    response = await client.get(image_url)
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    raise ProviderTemporaryError(
                        f"fal.ai output download returned {exc.response.status_code}"
                    ) from exc
                except Exception as exc:
                    raise ProviderTemporaryError(f"fal.ai output download failed: {exc}") from exc

            response = await self._run_with_retry(
                operation_name="output download",
                operation=download,
            )
        content_type = response.headers.get("content-type", fallback_mime_type).split(";")[0]
        return response.content, content_type

    def _extract_image_info(self, result_payload: dict[str, object]) -> dict[str, object]:
        images = result_payload.get("images")
        if not isinstance(images, list) or not images:
            raise ProviderTemporaryError("fal.ai result did not include images")
        first = images[0]
        if not isinstance(first, dict) or not first.get("url"):
            raise ProviderTemporaryError("fal.ai result image is missing a downloadable URL")
        return first

    def _build_data_uri(self, reference_image: ProviderReferenceImage) -> str:
        encoded = base64.b64encode(reference_image.image_bytes).decode("ascii")
        return f"data:{reference_image.mime_type};base64,{encoded}"

    def _estimate_cost(self, model_path: str) -> float:
        if model_path.startswith("fal-ai/flux-pro/kontext"):
            return 0.04
        return 0.003

    def _build_client(self) -> httpx.AsyncClient:
        timeout = httpx.Timeout(self.request_timeout_seconds, connect=min(10.0, self.request_timeout_seconds))
        return httpx.AsyncClient(timeout=timeout, transport=self._transport, follow_redirects=True)

    def _build_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Fal-Store-IO": "0",
            "X-Fal-Object-Lifecycle-Preference": json.dumps(
                {"expiration_duration_seconds": self._DEFAULT_MEDIA_RETENTION_SECONDS}
            ),
        }

    def _raise_provider_error(self, *, status_code: int, detail: str) -> None:
        if status_code in {400, 401, 403, 404, 409, 422}:
            raise ProviderFatalError(f"fal.ai rejected the request ({status_code}): {detail}")
        raise ProviderTemporaryError(f"fal.ai request failed ({status_code}): {detail}")


class RunwareProvider(StudioImageProvider):
    name = "runware"
    rollout_tier = "secondary"
    billable = True
    capabilities = ProviderCapabilities(
        workflows=("text_to_image", "image_to_image", "edit"),
        supports_reference_image=True,
        supports_upscale=True,
        supports_async_queue=False,
    )

    _API_URL = "https://api.runware.ai/v1"
    _DEFAULT_MODEL = "runware:101@1"

    def __init__(self, api_key: Optional[str], *, transport: httpx.AsyncBaseTransport | None = None):
        self.api_key = api_key
        self._transport = transport

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def health(self, probe: bool = True) -> Dict[str, object]:
        return {
            "name": self.name,
            "status": "healthy" if self.api_key else "not_configured",
            "detail": "secondary managed provider configured" if self.api_key else "RUNWARE_API_KEY missing",
        }

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        if not self.api_key:
            raise ProviderTemporaryError("Runware is not configured")
        if not self.supports_generation(workflow, has_reference_image=reference_image is not None):
            raise ProviderTemporaryError("Runware does not support this generation workflow")

        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=reference_image is not None,
        )
        request_payload = self._build_payload(
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            seed=seed,
            reference_image=reference_image,
            model_id=model_id,
            steps=steps,
            cfg_scale=cfg_scale,
            workflow=normalized_workflow,
        )

        async with self._build_client() as client:
            async def send_request() -> httpx.Response:
                try:
                    response = await client.post(
                        self._API_URL,
                        json=[request_payload],
                        headers=self._build_headers(),
                    )
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    self._raise_provider_error(
                        status_code=exc.response.status_code,
                        detail=exc.response.text,
                    )
                except Exception as exc:
                    raise ProviderTemporaryError(f"Runware request failed: {exc}") from exc

            response = await self._run_with_retry(
                operation_name="image request",
                operation=send_request,
            )

        payload = response.json()
        if payload.get("errors"):
            first_error = payload["errors"][0]
            self._raise_provider_error(
                status_code=422,
                detail=str(first_error.get("message") or first_error),
            )

        data = payload.get("data")
        if not isinstance(data, list) or not data:
            raise ProviderTemporaryError("Runware returned no result data")
        result = data[0]
        image_bytes, mime_type = self._extract_runware_image(result)

        if result.get("NSFWContent") is True:
            raise ProviderFatalError("Runware flagged the output as potentially sensitive")

        return ProviderResult(
            provider=self.name,
            image_bytes=image_bytes,
            mime_type=mime_type,
            width=width,
            height=height,
            estimated_cost=float(result.get("cost") or 0.0),
            provider_rollout_tier=self.rollout_tier,
            billable=self.billable,
        )

    def _build_payload(
        self,
        *,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage],
        model_id: Optional[str],
        steps: int,
        cfg_scale: float,
        workflow: str,
    ) -> dict[str, object]:
        task_uuid = str(__import__("uuid").uuid4())
        payload: dict[str, object] = {
            "taskType": "imageInference",
            "taskUUID": task_uuid,
            "outputType": "base64Data",
            "outputFormat": "PNG",
            "includeCost": True,
            "checkNSFW": True,
            "positivePrompt": prompt,
            "negativePrompt": negative_prompt,
            "width": width,
            "height": height,
            "steps": min(max(steps, 1), 50),
            "CFGScale": cfg_scale,
            "seed": seed,
            "numberResults": 1,
            "model": self._resolve_model_id(model_id),
        }
        if workflow in {"image_to_image", "edit"}:
            if reference_image is None:
                raise ProviderTemporaryError("Runware image-to-image workflow requires a reference image")
            payload["seedImage"] = self._build_data_uri(reference_image)
            payload["strength"] = 0.45 if workflow == "edit" else 0.7
        return payload

    def _resolve_model_id(self, model_id: Optional[str]) -> str:
        normalized_model = (model_id or "").strip().lower()
        if normalized_model in {"realvis-xl", "juggernaut-xl", "sdxl-base", "flux-schnell"}:
            return self._DEFAULT_MODEL
        return self._DEFAULT_MODEL

    def _extract_runware_image(self, result: dict[str, object]) -> tuple[bytes, str]:
        image_data_uri = result.get("imageDataURI")
        if isinstance(image_data_uri, str) and image_data_uri.startswith("data:"):
            header, encoded = image_data_uri.split(",", 1)
            mime_type = header.split(";", 1)[0].removeprefix("data:") or "image/png"
            return base64.b64decode(encoded), mime_type

        image_base64 = result.get("imageBase64Data")
        if isinstance(image_base64, str) and image_base64:
            return base64.b64decode(image_base64), "image/png"

        raise ProviderTemporaryError("Runware result did not include image data")

    def _build_client(self) -> httpx.AsyncClient:
        timeout = httpx.Timeout(self.request_timeout_seconds, connect=min(10.0, self.request_timeout_seconds))
        return httpx.AsyncClient(timeout=timeout, transport=self._transport, follow_redirects=True)

    def _build_headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _build_data_uri(self, reference_image: ProviderReferenceImage) -> str:
        encoded = base64.b64encode(reference_image.image_bytes).decode("ascii")
        return f"data:{reference_image.mime_type};base64,{encoded}"

    def _raise_provider_error(self, *, status_code: int, detail: str) -> None:
        if status_code in {400, 401, 403, 404, 409, 422}:
            raise ProviderFatalError(f"Runware rejected the request ({status_code}): {detail}")
        raise ProviderTemporaryError(f"Runware request failed ({status_code}): {detail}")


class OpenAIImageProvider(StudioImageProvider):
    name = "openai"
    rollout_tier = "primary"
    billable = True
    capabilities = ProviderCapabilities(
        workflows=("text_to_image", "image_to_image", "edit"),
        supports_reference_image=True,
    )

    _API_BASE_URL = "https://api.openai.com/v1"
    _DEFAULT_DRAFT_IMAGE_MODEL = "gpt-image-1-mini"
    _DEFAULT_IMAGE_MODEL = "gpt-image-1.5"
    _SQUARE_SIZE = "1024x1024"
    _PORTRAIT_SIZE = "1024x1536"
    _LANDSCAPE_SIZE = "1536x1024"
    _QUALITY_BY_MODEL_ID = {
        "flux-schnell": "low",
        "sdxl-base": "medium",
        "realvis-xl": "high",
        "juggernaut-xl": "high",
    }
    _COST_TABLE = {
        ("1024x1024", "low"): 0.009,
        ("1024x1024", "medium"): 0.034,
        ("1024x1024", "high"): 0.133,
        ("1024x1536", "low"): 0.013,
        ("1024x1536", "medium"): 0.05,
        ("1024x1536", "high"): 0.2,
        ("1536x1024", "low"): 0.013,
        ("1536x1024", "medium"): 0.05,
        ("1536x1024", "high"): 0.2,
    }

    def __init__(
        self,
        api_key: Optional[str],
        *,
        draft_image_model: Optional[str] = None,
        image_model: Optional[str] = None,
        premium_qa_enabled: bool = True,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.api_key = api_key
        self.draft_image_model = (
            (draft_image_model or self._DEFAULT_DRAFT_IMAGE_MODEL).strip()
            or self._DEFAULT_DRAFT_IMAGE_MODEL
        )
        self.image_model = (image_model or self._DEFAULT_IMAGE_MODEL).strip() or self._DEFAULT_IMAGE_MODEL
        self.premium_qa_enabled = bool(premium_qa_enabled)
        self._transport = transport

    def is_configured(self) -> bool:
        return bool(self.api_key)

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def health(self, probe: bool = True) -> Dict[str, object]:
        return {
            "name": self.name,
            "status": "healthy" if self.api_key else "not_configured",
            "detail": (
                "primary billable image provider configured "
                f"(draft={self.draft_image_model}, final={self.image_model}, "
                f"premium_qa={'enabled' if self.premium_qa_enabled else 'development_cost_safe'})"
                if self.api_key
                else "OPENAI_API_KEY missing"
            ),
        }

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        if not self.api_key:
            raise ProviderTemporaryError("OpenAI image provider is not configured")
        if not self.supports_generation(workflow, has_reference_image=reference_image is not None):
            raise ProviderTemporaryError("OpenAI image provider does not support this generation workflow")

        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=reference_image is not None,
        )
        requested_size = self._select_size(width=width, height=height)
        quality = self._select_quality(model_id=model_id)
        request_model = self._select_request_model(model_id=model_id, quality=quality)
        composed_prompt = self._compose_prompt(prompt=prompt, negative_prompt=negative_prompt)

        if normalized_workflow == "text_to_image" and reference_image is None:
            response_payload = await self._request_generation(
                prompt=composed_prompt,
                size=requested_size,
                quality=quality,
                model=request_model,
            )
        else:
            if reference_image is None:
                raise ProviderTemporaryError("OpenAI image edit workflow requires a reference image")
            response_payload = await self._request_edit(
                prompt=composed_prompt,
                size=requested_size,
                quality=quality,
                model=request_model,
                reference_image=reference_image,
            )

        image_bytes, mime_type = await self._extract_image_bytes(response_payload)
        actual_width, actual_height = self._inspect_dimensions(
            image_bytes=image_bytes,
            requested_size=requested_size,
        )

        return ProviderResult(
            provider=self.name,
            image_bytes=image_bytes,
            mime_type=mime_type,
            width=actual_width,
            height=actual_height,
            estimated_cost=self._estimate_cost(size=requested_size, quality=quality),
            provider_rollout_tier=self.rollout_tier,
            billable=self.billable,
        )

    def estimate_generation_cost(
        self,
        *,
        width: int,
        height: int,
        model_id: Optional[str] = None,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
    ) -> float | None:
        requested_size = self._select_size(width=width, height=height)
        quality = self._select_quality(model_id=model_id)
        return self._estimate_cost(size=requested_size, quality=quality)

    async def _request_generation(
        self,
        *,
        prompt: str,
        size: str,
        quality: str,
        model: str,
    ) -> dict[str, object]:
        payload = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "quality": quality,
            "output_format": "png",
        }
        async with self._build_client() as client:
            async def send_request() -> httpx.Response:
                try:
                    response = await client.post(
                        f"{self._API_BASE_URL}/images/generations",
                        json=payload,
                        headers=self._build_headers(json_request=True),
                    )
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    self._raise_provider_error(
                        status_code=exc.response.status_code,
                        detail=exc.response.text,
                    )
                except Exception as exc:
                    raise ProviderTemporaryError(f"OpenAI image generation failed: {exc}") from exc

            response = await self._run_with_retry(
                operation_name="image generation",
                operation=send_request,
            )
        return response.json()

    async def _request_edit(
        self,
        *,
        prompt: str,
        size: str,
        quality: str,
        model: str,
        reference_image: ProviderReferenceImage,
    ) -> dict[str, object]:
        data = {
            "model": model,
            "prompt": prompt,
            "size": size,
            "quality": quality,
            "output_format": "png",
        }
        files = {
            "image": (
                f"{reference_image.asset_id or 'reference'}.png",
                reference_image.image_bytes,
                reference_image.mime_type,
            )
        }
        async with self._build_client() as client:
            async def send_request() -> httpx.Response:
                try:
                    response = await client.post(
                        f"{self._API_BASE_URL}/images/edits",
                        data=data,
                        files=files,
                        headers=self._build_headers(json_request=False),
                    )
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    self._raise_provider_error(
                        status_code=exc.response.status_code,
                        detail=exc.response.text,
                    )
                except Exception as exc:
                    raise ProviderTemporaryError(f"OpenAI image edit failed: {exc}") from exc

            response = await self._run_with_retry(
                operation_name="image edit",
                operation=send_request,
            )
        return response.json()

    async def _extract_image_bytes(self, payload: dict[str, object]) -> tuple[bytes, str]:
        data = payload.get("data")
        if not isinstance(data, list) or not data:
            raise ProviderTemporaryError("OpenAI image response did not include result data")
        first = data[0]
        if not isinstance(first, dict):
            raise ProviderTemporaryError("OpenAI image result payload is malformed")

        b64_json = first.get("b64_json")
        if isinstance(b64_json, str) and b64_json:
            return base64.b64decode(b64_json), "image/png"

        image_url = first.get("url")
        if isinstance(image_url, str) and image_url:
            return await self._download_image(image_url)

        raise ProviderTemporaryError("OpenAI image response did not include image bytes")

    async def _download_image(self, image_url: str) -> tuple[bytes, str]:
        async with self._build_client() as client:
            async def download() -> httpx.Response:
                try:
                    response = await client.get(image_url)
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    raise ProviderTemporaryError(
                        f"OpenAI image download returned {exc.response.status_code}"
                    ) from exc
                except Exception as exc:
                    raise ProviderTemporaryError(f"OpenAI image download failed: {exc}") from exc

            response = await self._run_with_retry(
                operation_name="image download",
                operation=download,
            )
        content_type = response.headers.get("content-type", "image/png").split(";", 1)[0] or "image/png"
        return response.content, content_type

    def _inspect_dimensions(self, *, image_bytes: bytes, requested_size: str) -> tuple[int, int]:
        try:
            with Image.open(io.BytesIO(image_bytes)) as image:
                return int(image.width), int(image.height)
        except Exception:
            return self._size_to_dimensions(requested_size)

    def _compose_prompt(self, *, prompt: str, negative_prompt: str) -> str:
        cleaned_prompt = prompt.strip()
        cleaned_negative = negative_prompt.strip()
        if not cleaned_negative:
            return cleaned_prompt
        return f"{cleaned_prompt}\n\nAvoid: {cleaned_negative}"

    def _select_quality(self, *, model_id: Optional[str]) -> str:
        if self._should_force_cost_safe_draft(model_id=model_id):
            return "low"
        normalized_model = (model_id or "").strip().lower()
        if normalized_model == self.draft_image_model.strip().lower():
            return "low"
        if normalized_model == self.image_model.strip().lower():
            return "medium"
        return self._QUALITY_BY_MODEL_ID.get(normalized_model, "medium")

    def _select_request_model(self, *, model_id: Optional[str], quality: str) -> str:
        if self._should_force_cost_safe_draft(model_id=model_id):
            return self.draft_image_model
        normalized_model = (model_id or "").strip().lower()
        if normalized_model in {
            self.draft_image_model.strip().lower(),
            self.image_model.strip().lower(),
        }:
            return normalized_model
        if quality == "low":
            return self.draft_image_model
        return self.image_model

    def _should_force_cost_safe_draft(self, *, model_id: Optional[str]) -> bool:
        if self.premium_qa_enabled:
            return False
        normalized_model = (model_id or "").strip().lower()
        explicit_model_ids = {
            self.draft_image_model.strip().lower(),
            self.image_model.strip().lower(),
            "gpt-image-1",
            "gpt-image-1.5",
            "gpt-image-1-mini",
            "chatgpt-image-latest",
        }
        return normalized_model not in explicit_model_ids

    def _select_size(self, *, width: int, height: int) -> str:
        safe_width = max(int(width or 0), 1)
        safe_height = max(int(height or 0), 1)
        if safe_width >= safe_height * 1.2:
            return self._LANDSCAPE_SIZE
        if safe_height >= safe_width * 1.2:
            return self._PORTRAIT_SIZE
        return self._SQUARE_SIZE

    def _size_to_dimensions(self, size: str) -> tuple[int, int]:
        try:
            width_text, height_text = size.split("x", 1)
            return int(width_text), int(height_text)
        except Exception:
            return (1024, 1024)

    def _estimate_cost(self, *, size: str, quality: str) -> float:
        return float(
            self._COST_TABLE.get(
                (size, quality),
                self._COST_TABLE[(self._SQUARE_SIZE, "medium")],
            )
        )

    def _build_client(self) -> httpx.AsyncClient:
        timeout = httpx.Timeout(self.request_timeout_seconds, connect=min(10.0, self.request_timeout_seconds))
        return httpx.AsyncClient(timeout=timeout, transport=self._transport, follow_redirects=True)

    def _build_headers(self, *, json_request: bool) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }
        if json_request:
            headers["Content-Type"] = "application/json"
        return headers

    def _raise_provider_error(self, *, status_code: int, detail: str) -> None:
        if status_code in {400, 401, 403, 404, 409, 422}:
            raise ProviderFatalError(f"OpenAI image request was rejected ({status_code}): {detail}")
        raise ProviderTemporaryError(f"OpenAI image request failed ({status_code}): {detail}")


class PollinationsProvider(StudioImageProvider):
    name = "pollinations"
    rollout_tier = "degraded"
    billable = False
    capabilities = ProviderCapabilities(workflows=("text_to_image",))

    def __init__(self, enabled: bool = True, *, transport: httpx.AsyncBaseTransport | None = None):
        self.enabled = enabled
        self.base_url = "https://gen.pollinations.ai/image/"
        self._transport = transport

    def is_configured(self) -> bool:
        return self.enabled

    async def is_available(self) -> bool:
        return self.enabled

    async def health(self, probe: bool = True) -> Dict[str, object]:
        if not self.enabled:
            return {"name": self.name, "status": "disabled", "detail": "disabled by configuration"}

        if not probe:
            return {"name": self.name, "status": "healthy", "detail": "probe skipped"}

        try:
            async with httpx.AsyncClient(
                timeout=5.0,
                transport=self._transport,
                follow_redirects=True,
            ) as client:
                response = await client.get("https://image.pollinations.ai/")
                if response.status_code in {401, 403}:
                    return {
                        "name": self.name,
                        "status": "unavailable",
                        "detail": f"http {response.status_code} auth rejected",
                    }
                return {
                    "name": self.name,
                    "status": "healthy" if response.status_code < 400 else "degraded",
                    "detail": f"http {response.status_code}",
                }
        except Exception as exc:
            return {"name": self.name, "status": "unavailable", "detail": str(exc)}

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        if not self.enabled:
            raise ProviderTemporaryError("Pollinations is disabled")
        if not self.supports_generation(workflow, has_reference_image=reference_image is not None):
            raise ProviderTemporaryError("Pollinations does not support this generation workflow")

        selected_model = self._select_model(model_id=model_id, prompt=prompt)
        params = {
            "width": width,
            "height": height,
            "nologo": "true",
            "seed": seed,
            "model": selected_model,
        }
        if negative_prompt.strip():
            params["negative"] = negative_prompt.strip()
        if selected_model == "gptimage":
            params["quality"] = "high"

        url = f"{self.base_url}{quote(prompt)}"
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(self.request_timeout_seconds, connect=min(5.0, self.request_timeout_seconds)),
            transport=self._transport,
            follow_redirects=True,
        ) as client:
            async def send_request() -> httpx.Response:
                try:
                    response = await client.get(url, params=params)
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    raise ProviderTemporaryError(f"Pollinations returned {exc.response.status_code}") from exc
                except Exception as exc:
                    raise ProviderTemporaryError(f"Pollinations request failed: {exc}") from exc

            response = await self._run_with_retry(
                operation_name="image request",
                operation=send_request,
            )

        content_type = response.headers.get("content-type", "image/jpeg")
        return ProviderResult(
            provider=self.name,
            image_bytes=response.content,
            mime_type=content_type.split(";")[0],
            width=width,
            height=height,
            estimated_cost=0.0,
            provider_rollout_tier=self.rollout_tier,
            billable=self.billable,
        )

    def _select_model(self, *, model_id: Optional[str], prompt: str) -> str:
        normalized_model = (model_id or "").strip().lower()
        lowered_prompt = prompt.lower()
        if normalized_model in {"realvis-xl", "juggernaut-xl"}:
            return "gptimage"
        if normalized_model == "sdxl-base":
            return "qwen-image"
        if normalized_model == "flux-schnell":
            return "flux"
        if any(keyword in lowered_prompt for keyword in _REALISM_HINTS):
            return "gptimage"
        if any(keyword in lowered_prompt for keyword in _STYLIZED_HINTS):
            return "qwen-image"
        return "flux"


class HuggingFaceImageProvider(StudioImageProvider):
    name = "huggingface"
    rollout_tier = "optional-router"
    billable = True
    capabilities = ProviderCapabilities(workflows=("text_to_image",))

    def __init__(self, api_token: Optional[str] = None, *, transport: httpx.AsyncBaseTransport | None = None):
        self.api_token = api_token
        self._transport = transport

    def is_configured(self) -> bool:
        return bool(self.api_token)

    async def is_available(self) -> bool:
        return bool(self.api_token)

    async def health(self, probe: bool = True) -> Dict[str, object]:
        if not self.api_token:
            return {"name": self.name, "status": "disabled", "detail": "Missing HUGGINGFACE_TOKEN"}
        if not probe:
            return {"name": self.name, "status": "healthy", "detail": "Configured"}

        headers = {"Authorization": f"Bearer {self.api_token}"}
        try:
            async with self._build_client() as client:
                response = await client.get("https://huggingface.co/api/whoami-v2", headers=headers)
                if response.status_code in {401, 403}:
                    return {
                        "name": self.name,
                        "status": "unavailable",
                        "detail": f"token rejected (http {response.status_code})",
                    }
                if response.status_code >= 500:
                    return {
                        "name": self.name,
                        "status": "degraded",
                        "detail": f"http {response.status_code}",
                    }
                response.raise_for_status()
                return {"name": self.name, "status": "healthy", "detail": "token probe ok"}
        except Exception as exc:
            return {"name": self.name, "status": "unavailable", "detail": str(exc)}

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        if not self.api_token:
            raise ProviderTemporaryError("HuggingFace provider is disabled")
        if not self.supports_generation(workflow, has_reference_image=reference_image is not None):
            raise ProviderTemporaryError("HuggingFace provider does not support this generation workflow")

        last_error: ProviderTemporaryError | ProviderFatalError | None = None
        for hf_model in self._candidate_models_for_request(model_id=model_id, prompt=prompt):
            try:
                response = await self._request_model_once(
                    hf_model=hf_model,
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    width=width,
                    height=height,
                    steps=steps,
                    cfg_scale=cfg_scale,
                )
            except ProviderTemporaryError as exc:
                last_error = exc
                if self._is_model_level_recoverable_error(str(exc)):
                    continue
                raise
            except ProviderFatalError as exc:
                last_error = exc
                if self._is_model_level_recoverable_error(str(exc)):
                    continue
                raise

            content_type = response.headers.get("content-type", "image/jpeg")
            return ProviderResult(
                provider=self.name,
                image_bytes=response.content,
                mime_type=content_type.split(";")[0],
                width=width,
                height=height,
                estimated_cost=self._estimate_cost(hf_model),
                provider_rollout_tier=self.rollout_tier,
                billable=self.billable,
            )

        raise last_error or ProviderTemporaryError("HuggingFace provider failed to generate an image")

    async def _request_model_once(
        self,
        *,
        hf_model: str,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        steps: int,
        cfg_scale: float,
    ) -> httpx.Response:
        url = f"https://api-inference.huggingface.co/models/{hf_model}"
        headers = {"Authorization": f"Bearer {self.api_token}"}
        payload = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "guidance_scale": cfg_scale,
                "num_inference_steps": min(max(steps, 1), 50),
            },
            "options": {
                "wait_for_model": True,
                "use_cache": False,
            },
        }

        async with self._build_client() as client:
            async def send_request() -> httpx.Response:
                try:
                    response = await client.post(url, headers=headers, json=payload)
                    if response.status_code == 503:
                        raise ProviderTemporaryError(
                            f"HuggingFace model {hf_model} is currently loading: {response.text}"
                        )
                    if response.status_code in {404, 410, 422}:
                        raise ProviderTemporaryError(
                            f"HuggingFace model {hf_model} is unavailable ({response.status_code}): {response.text}"
                        )
                    response.raise_for_status()
                    return response
                except httpx.HTTPStatusError as exc:
                    raise ProviderTemporaryError(
                        f"HuggingFace returned {exc.response.status_code}: {exc.response.text}"
                    ) from exc
                except Exception as exc:
                    raise ProviderTemporaryError(f"HuggingFace request failed: {exc}") from exc

            return await self._run_with_retry(
                operation_name=f"image request ({hf_model})",
                operation=send_request,
            )

    def _candidate_models_for_request(self, *, model_id: Optional[str], prompt: str) -> list[str]:
        normalized_model = (model_id or "").strip().lower()
        lowered_prompt = prompt.lower()
        if normalized_model in {"realvis-xl", "juggernaut-xl"}:
            return [
                "black-forest-labs/FLUX.1-Krea-dev",
                "playgroundai/playground-v2.5-1024px-aesthetic",
                "black-forest-labs/FLUX.1-schnell",
                "stabilityai/stable-diffusion-xl-base-1.0",
            ]
        if normalized_model == "sdxl-base":
            return [
                "playgroundai/playground-v2.5-1024px-aesthetic",
                "stabilityai/stable-diffusion-xl-base-1.0",
                "black-forest-labs/FLUX.1-schnell",
            ]
        if any(keyword in lowered_prompt for keyword in _REALISM_HINTS):
            return [
                "black-forest-labs/FLUX.1-Krea-dev",
                "playgroundai/playground-v2.5-1024px-aesthetic",
                "black-forest-labs/FLUX.1-schnell",
            ]
        return [
            "black-forest-labs/FLUX.1-schnell",
            "stabilityai/stable-diffusion-xl-base-1.0",
        ]

    def _is_model_level_recoverable_error(self, message: str) -> bool:
        lowered = message.lower()
        return any(code in lowered for code in ("404", "410", "422", "503"))

    def _estimate_cost(self, hf_model: str) -> float:
        if "krea" in hf_model.lower() or "playground" in hf_model.lower():
            return 0.012
        if "stable-diffusion-xl" in hf_model.lower():
            return 0.008
        return 0.006

    def _build_client(self) -> httpx.AsyncClient:
        timeout = httpx.Timeout(self.request_timeout_seconds, connect=min(10.0, self.request_timeout_seconds))
        return httpx.AsyncClient(timeout=timeout, transport=self._transport, follow_redirects=True)


class DemoImageProvider(StudioImageProvider):
    name = "demo"
    rollout_tier = "local-fallback"
    billable = False
    capabilities = ProviderCapabilities(
        workflows=("text_to_image", "image_to_image", "edit"),
        supports_reference_image=True,
    )

    async def is_available(self) -> bool:
        return True

    async def health(self, probe: bool = True) -> Dict[str, object]:
        return {"name": self.name, "status": "healthy", "detail": "local fallback"}

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
    ) -> ProviderResult:
        image = Image.new("RGBA", (width, height), (12, 16, 28, 255))
        draw = ImageDraw.Draw(image)

        for index, color in enumerate(((171, 109, 255), (40, 192, 255), (252, 185, 83))):
            offset = index * 160
            draw.ellipse(
                (40 + offset, 60 + offset // 3, width // 2 + offset, height // 2 + offset // 4),
                fill=(color[0], color[1], color[2], 75),
            )

        font = ImageFont.load_default()
        title = "OMNIACREATA STUDIO"
        wrapped_prompt = "\n".join(textwrap.wrap(prompt[:180], width=34)) or "Describe your first image."
        footer = "Demo fallback active. Configure a managed provider to replace this output."
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=reference_image is not None,
        )
        if reference_image is not None:
            footer = f"{normalized_workflow.replace('_', ' ').title()} demo output from {reference_image.asset_id}."

        draw.rounded_rectangle((32, 32, width - 32, height - 32), radius=28, outline=(70, 90, 130), width=2)
        draw.text((52, 56), title, fill=(245, 240, 255), font=font)
        draw.multiline_text((52, 120), wrapped_prompt, fill=(225, 229, 255), font=font, spacing=6)
        if negative_prompt.strip():
            neg = "Negative: " + negative_prompt[:120]
            draw.multiline_text(
                (52, height - 150),
                "\n".join(textwrap.wrap(neg, width=42)),
                fill=(255, 195, 195),
                font=font,
                spacing=4,
            )
        draw.text((52, height - 68), footer, fill=(160, 174, 196), font=font)

        buffer = io.BytesIO()
        image.convert("RGB").save(buffer, format="PNG")
        return ProviderResult(
            provider=self.name,
            image_bytes=buffer.getvalue(),
            mime_type="image/png",
            width=width,
            height=height,
            estimated_cost=0.0,
            provider_rollout_tier=self.rollout_tier,
            billable=self.billable,
        )


class ProviderRegistry:
    _CIRCUIT_FAILURE_THRESHOLD = 5
    _CIRCUIT_OPEN_SECONDS = 60.0
    _OBSERVATION_WINDOW_SECONDS = 60.0 * 5

    def __init__(self) -> None:
        settings = get_settings()
        self._configured_strategy = (settings.generation_provider_strategy or "free-first").strip().lower()
        self._enable_demo_generation_fallback = bool(settings.enable_demo_generation_fallback)
        providers_by_name: dict[str, StudioImageProvider | None] = {
            "openai": OpenAIImageProvider(
                reveal_secret(settings.openai_api_key),
                draft_image_model=settings.openai_image_draft_model,
                image_model=settings.openai_image_model,
                premium_qa_enabled=(
                    settings.environment != Environment.DEVELOPMENT
                    or bool(settings.openai_image_premium_qa_enabled)
                ),
            ),
            "fal": FalProvider(reveal_secret(settings.fal_api_key)),
            "runware": RunwareProvider(reveal_secret(settings.runware_api_key)),
            "huggingface": HuggingFaceImageProvider(reveal_secret(settings.huggingface_token)) if settings.huggingface_token else None,
            "pollinations": PollinationsProvider(enabled=True) if settings.enable_pollinations else None,
            "demo": DemoImageProvider() if self._enable_demo_generation_fallback else None,
        }
        self._providers_by_name: dict[str, StudioImageProvider] = {
            name: provider for name, provider in providers_by_name.items() if provider is not None
        }
        self.providers: List[StudioImageProvider] = []
        self._provider_circuits: dict[str, ProviderCircuitState] = {}
        for provider_name in self._provider_order(settings.generation_provider_strategy):
            provider = providers_by_name.get(provider_name)
            if provider is not None:
                self.providers.append(provider)

        for provider in self.providers:
            self._provider_circuits.setdefault(provider.name, ProviderCircuitState())

    def _provider_order(self, strategy: str) -> tuple[str, ...]:
        normalized = (strategy or "managed-first").strip().lower()
        if normalized == "free-first":
            return ("pollinations", "huggingface", "openai", "fal", "runware", "demo")
        if normalized == "balanced":
            return ("pollinations", "openai", "fal", "huggingface", "runware", "demo")
        return ("openai", "fal", "runware", "huggingface", "pollinations", "demo")

    def get_provider(self, provider_name: str | None) -> StudioImageProvider | None:
        normalized = (provider_name or "").strip().lower()
        if not normalized:
            return None
        return self._providers_by_name.get(normalized)

    def provider_rollout_tier(self, provider_name: str | None) -> str | None:
        provider = self.get_provider(provider_name)
        return provider.rollout_tier if provider is not None else None

    def provider_billable(self, provider_name: str | None) -> bool | None:
        provider = self.get_provider(provider_name)
        return provider.billable if provider is not None else None

    def estimate_generation_cost(
        self,
        *,
        provider_name: str | None,
        width: int,
        height: int,
        model_id: str | None = None,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
    ) -> float | None:
        provider = self.get_provider(provider_name)
        if provider is None:
            return None
        try:
            return provider.estimate_generation_cost(
                width=width,
                height=height,
                model_id=model_id,
                workflow=workflow,
                has_reference_image=has_reference_image,
            )
        except Exception:
            return None

    def routing_summary(self) -> dict[str, object]:
        demo_provider_enabled = self.get_provider("demo") is not None
        return {
            "default_strategy": self._configured_strategy,
            "plan_defaults": {
                "free": "free-first",
                "pro": "balanced",
            },
            "demo_policy": (
                "degraded_only_last_resort"
                if demo_provider_enabled
                else "disabled_by_default_explicit_only"
            ),
        }

    def plan_generation_route(
        self,
        *,
        plan: IdentityPlan | str,
        prompt: str,
        model_id: str | None = None,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
    ) -> GenerationRoutingDecision:
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=has_reference_image,
        )
        analysis = analyze_generation_prompt_profile(
            prompt=prompt,
            model_id=model_id,
            workflow=normalized_workflow,
            has_reference_image=has_reference_image,
        )
        normalized_plan = self._normalize_plan(plan)
        routing_strategy = "balanced" if normalized_plan == IdentityPlan.PRO.value else "free-first"
        requested_quality_tier = "premium" if analysis.premium_intent else "standard"
        ordered_provider_names = self._routing_lane_order(
            plan=normalized_plan,
            workflow=normalized_workflow,
            analysis=analysis,
        )
        provider_candidates = tuple(
            provider_name
            for provider_name in ordered_provider_names
            for provider in [self.get_provider(provider_name)]
            if provider is not None
            and provider.is_configured()
            and not self._provider_circuit_blocks_routing(provider.name)
            and provider.supports_generation(
                normalized_workflow,
                has_reference_image=has_reference_image,
            )
        )
        selected_provider = provider_candidates[0] if provider_candidates else None
        selected_quality_tier = self.provider_quality_tier(selected_provider)
        degraded = self._is_degraded_route(
            requested_quality_tier=requested_quality_tier,
            selected_quality_tier=selected_quality_tier,
            provider_name=selected_provider,
        )
        routing_reason = self._routing_reason(
            workflow=normalized_workflow,
            requested_quality_tier=requested_quality_tier,
            routing_strategy=routing_strategy,
            selected_provider=selected_provider,
        )
        return GenerationRoutingDecision(
            workflow=normalized_workflow,
            requested_quality_tier=requested_quality_tier,
            selected_quality_tier=selected_quality_tier,
            degraded=degraded,
            routing_strategy=routing_strategy,
            routing_reason=routing_reason,
            prompt_profile=analysis.profile,
            provider_candidates=provider_candidates,
            selected_provider=selected_provider,
        )

    def finalize_generation_route(
        self,
        decision: GenerationRoutingDecision,
        *,
        provider_name: str | None,
    ) -> GenerationRoutingDecision:
        selected_provider = (provider_name or decision.selected_provider or "").strip().lower() or None
        selected_quality_tier = self.provider_quality_tier(selected_provider)
        degraded = self._is_degraded_route(
            requested_quality_tier=decision.requested_quality_tier,
            selected_quality_tier=selected_quality_tier,
            provider_name=selected_provider,
        )
        routing_reason = self._routing_reason(
            workflow=decision.workflow,
            requested_quality_tier=decision.requested_quality_tier,
            routing_strategy=decision.routing_strategy,
            selected_provider=selected_provider,
        )
        return replace(
            decision,
            selected_quality_tier=selected_quality_tier,
            degraded=degraded,
            routing_reason=routing_reason,
            selected_provider=selected_provider,
        )

    def provider_quality_tier(self, provider_name: str | None) -> str:
        normalized = (provider_name or "").strip().lower()
        if normalized in _PREMIUM_CAPABLE_PROVIDERS:
            return "premium"
        if normalized in _STANDARD_CAPABLE_PROVIDERS:
            return "standard"
        if normalized in _DEGRADED_ONLY_PROVIDERS:
            return "degraded"
        return "standard"

    def _normalize_plan(self, plan: IdentityPlan | str) -> str:
        if isinstance(plan, IdentityPlan):
            return plan.value
        normalized = str(plan or IdentityPlan.FREE.value).strip().lower()
        if normalized in {IdentityPlan.GUEST.value, IdentityPlan.FREE.value, IdentityPlan.PRO.value}:
            return normalized
        return IdentityPlan.FREE.value

    def _routing_lane_order(
        self,
        *,
        plan: str,
        workflow: str,
        analysis: PromptProfileAnalysis,
    ) -> tuple[str, ...]:
        if workflow in {"image_to_image", "edit"}:
            return ("openai", "fal", "runware", "huggingface")
        if plan == IdentityPlan.PRO.value:
            if analysis.premium_intent:
                return ("openai", "fal", "runware", "pollinations", "huggingface", "demo")
            if analysis.profile in {"stylized_illustration", "fantasy_concept"}:
                return ("openai", "fal", "runware", "huggingface", "pollinations", "demo")
            return ("openai", "fal", "runware", "pollinations", "huggingface", "demo")
        if self._should_prefer_managed_free_lanes(workflow=workflow):
            if analysis.profile in {"stylized_illustration", "fantasy_concept"}:
                return ("openai", "fal", "runware", "huggingface", "pollinations", "demo")
            return ("openai", "fal", "runware", "pollinations", "huggingface", "demo")
        if analysis.profile in {"stylized_illustration", "fantasy_concept"}:
            return ("huggingface", "pollinations", "demo")
        return ("pollinations", "huggingface", "demo")

    def _should_prefer_managed_free_lanes(self, *, workflow: str) -> bool:
        settings = get_settings()
        if settings.environment != Environment.DEVELOPMENT:
            return False
        normalized_workflow = normalize_generation_workflow(workflow)
        return any(
            provider is not None
            and provider.is_configured()
            and not self._provider_circuit_blocks_routing(provider.name)
            and provider.supports_generation(normalized_workflow, has_reference_image=False)
            for provider in (
                self.get_provider("openai"),
                self.get_provider("fal"),
                self.get_provider("runware"),
            )
        )

    def _routing_reason(
        self,
        *,
        workflow: str,
        requested_quality_tier: str,
        routing_strategy: str,
        selected_provider: str | None,
    ) -> str:
        normalized_provider = (selected_provider or "").strip().lower()
        if workflow in {"image_to_image", "edit"}:
            if normalized_provider in _PREMIUM_CAPABLE_PROVIDERS:
                return "workflow_requires_capable_provider"
            if normalized_provider in _STANDARD_CAPABLE_PROVIDERS:
                return "provider_capability_escalation"
            return "workflow_requires_capable_provider"
        if normalized_provider == "demo":
            return "all_standard_lanes_unavailable_degraded"
        if requested_quality_tier == "premium":
            if normalized_provider in _PREMIUM_CAPABLE_PROVIDERS:
                return "premium_intent_managed_preferred"
            if routing_strategy == "balanced":
                return "managed_unavailable_fallback_standard"
        if routing_strategy == "free-first" and normalized_provider in _PREMIUM_CAPABLE_PROVIDERS:
            return "free_standard_managed_override"
        if routing_strategy == "balanced":
            return "pro_balanced_standard_default"
        return "free_standard_default"

    def _is_degraded_route(
        self,
        *,
        requested_quality_tier: str,
        selected_quality_tier: str,
        provider_name: str | None,
    ) -> bool:
        normalized_provider = (provider_name or "").strip().lower()
        if normalized_provider in _DEGRADED_ONLY_PROVIDERS:
            return True
        return _QUALITY_TIER_RANK[selected_quality_tier] < _QUALITY_TIER_RANK[requested_quality_tier]

    def _iter_supported_providers(
        self,
        *,
        workflow: str,
        reference_image: Optional[ProviderReferenceImage],
        candidate_names: Sequence[str] | None = None,
    ) -> Sequence[StudioImageProvider]:
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=reference_image is not None,
        )
        if candidate_names:
            ordered_providers: list[StudioImageProvider] = []
            for provider_name in candidate_names:
                provider = self.get_provider(provider_name)
                if provider is None or not provider.is_configured():
                    continue
                if self._provider_circuit_blocks_routing(provider.name):
                    continue
                if not provider.supports_generation(
                    normalized_workflow,
                    has_reference_image=reference_image is not None,
                ):
                    continue
                ordered_providers.append(provider)
            return ordered_providers
        return [
            provider
            for provider in self.providers
            if provider.is_configured()
            and provider.supports_generation(normalized_workflow, has_reference_image=reference_image is not None)
        ]

    def preview_generation_provider(
        self,
        *,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
        plan: IdentityPlan | str | None = None,
        prompt: str | None = None,
        model_id: str | None = None,
    ) -> str:
        if plan is not None and prompt is not None:
            decision = self.plan_generation_route(
                plan=plan,
                prompt=prompt,
                model_id=model_id,
                workflow=workflow,
                has_reference_image=has_reference_image,
            )
            return decision.selected_provider or "cloud"
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=has_reference_image,
        )
        for provider in self.providers:
            if provider.is_configured() and provider.supports_generation(
                normalized_workflow,
                has_reference_image=has_reference_image,
            ) and not self._provider_circuit_blocks_routing(provider.name):
                return provider.name
        return "cloud"

    def has_configured_generation_provider(
        self,
        *,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
    ) -> bool:
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=has_reference_image,
        )
        return any(
            provider.is_configured()
            and not self._provider_circuit_blocks_routing(provider.name)
            and provider.supports_generation(
                normalized_workflow,
                has_reference_image=has_reference_image,
            )
            for provider in self.providers
        )

    async def health_snapshot(self, probe: bool = True) -> List[Dict[str, object]]:
        payload: list[dict[str, object]] = []
        for priority, provider in enumerate(self.providers, start=1):
            snapshot = await provider.health_snapshot(probe=probe, priority=priority)
            metrics = self._provider_health_metrics(provider.name)
            snapshot.update(metrics)
            reported_status = str(snapshot.get("status") or "").strip().lower()
            effective_status, effective_detail = self._derive_effective_provider_health(
                reported_status=reported_status,
                detail=str(snapshot.get("detail") or "").strip(),
                metrics=metrics,
            )
            if effective_status != reported_status and reported_status:
                snapshot["reported_status"] = reported_status
            snapshot["status"] = effective_status
            snapshot["detail"] = effective_detail
            payload.append(snapshot)
        return payload

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        reference_image: Optional[ProviderReferenceImage] = None,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
        workflow: str = "text_to_image",
        provider_candidates: Sequence[str] | None = None,
    ) -> ProviderResult:
        last_error: Optional[Exception] = None
        last_provider_name: str | None = None
        billable_failure_seen = False
        supported_providers = self._iter_supported_providers(
            workflow=workflow,
            reference_image=reference_image,
            candidate_names=provider_candidates,
        )
        if not supported_providers:
            raise ProviderTemporaryError("No provider supports this generation workflow")

        for provider in supported_providers:
            if billable_failure_seen and provider.billable:
                continue
            if not await provider.is_available():
                continue
            if not self._allow_provider_attempt(provider.name):
                continue

            try:
                last_provider_name = provider.name
                started_at = time.monotonic()
                result = await provider.generate(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    width=width,
                    height=height,
                    seed=seed,
                    reference_image=reference_image,
                    model_id=model_id,
                    steps=steps,
                    cfg_scale=cfg_scale,
                    workflow=workflow,
                )
                latency_ms = (time.monotonic() - started_at) * 1000
                self._record_provider_success(provider.name, latency_ms)
                return result
            except ProviderFatalError as exc:
                latency_ms = (time.monotonic() - started_at) * 1000
                tagged_error = self._tag_provider_error(exc, provider.name)
                self._record_provider_nonretryable_failure(provider.name, latency_ms, tagged_error)
                raise tagged_error
            except Exception as exc:
                latency_ms = (time.monotonic() - started_at) * 1000
                tagged_error = self._tag_provider_error(exc, provider.name)
                self._record_provider_failure(provider.name, latency_ms, tagged_error)
                if provider.billable and self._development_cost_safe_failover_guard_active():
                    billable_failure_seen = True
                last_error = tagged_error
                continue

        if last_error:
            if isinstance(last_error, ProviderTemporaryError):
                raise last_error
            wrapped_error = ProviderTemporaryError(str(last_error))
            self._tag_provider_error(
                wrapped_error,
                getattr(last_error, "provider_name", None) or last_provider_name,
            )
            raise wrapped_error from last_error
        raise ProviderTemporaryError("No providers available")

    def _development_cost_safe_failover_guard_active(self) -> bool:
        settings = get_settings()
        return settings.environment == Environment.DEVELOPMENT

    def _tag_provider_error(self, exc: Exception, provider_name: str | None) -> Exception:
        if provider_name:
            try:
                setattr(exc, "provider_name", provider_name)
            except Exception:
                pass
        return exc

    def _allow_provider_attempt(self, provider_name: str) -> bool:
        state = self._provider_circuits.setdefault(provider_name, ProviderCircuitState())
        now = time.monotonic()
        self._prune_provider_observations(state, now=now)

        if state.opened_until_monotonic is not None:
            if now < state.opened_until_monotonic:
                return False
            if state.half_open_in_flight:
                return False
            state.half_open = True
            state.half_open_in_flight = True
            state.opened_until_monotonic = None
            return True

        return True

    def _provider_circuit_blocks_routing(self, provider_name: str) -> bool:
        state = self._provider_circuits.setdefault(provider_name, ProviderCircuitState())
        now = time.monotonic()
        self._prune_provider_observations(state, now=now)
        if state.opened_until_monotonic is not None and now < state.opened_until_monotonic:
            return True
        if state.half_open_in_flight:
            return True
        return False

    def _record_provider_success(self, provider_name: str, latency_ms: float) -> None:
        state = self._provider_circuits.setdefault(provider_name, ProviderCircuitState())
        now = time.monotonic()
        state.consecutive_failures = 0
        state.opened_until_monotonic = None
        state.half_open = False
        state.half_open_in_flight = False
        state.last_error = None
        state.observations.append(
            ProviderObservation(
                timestamp_monotonic=now,
                success=True,
                latency_ms=latency_ms,
            )
        )
        self._prune_provider_observations(state, now=now)

    def _record_provider_failure(self, provider_name: str, latency_ms: float, error: Exception) -> None:
        state = self._provider_circuits.setdefault(provider_name, ProviderCircuitState())
        now = time.monotonic()
        state.consecutive_failures += 1
        state.last_error = redact_sensitive_text(error)
        state.half_open_in_flight = False
        if (
            state.half_open
            or state.consecutive_failures >= self._CIRCUIT_FAILURE_THRESHOLD
            or is_provider_auth_failure(error)
        ):
            state.opened_until_monotonic = now + self._CIRCUIT_OPEN_SECONDS
            state.half_open = False
        state.observations.append(
            ProviderObservation(
                timestamp_monotonic=now,
                success=False,
                latency_ms=latency_ms,
            )
        )
        self._prune_provider_observations(state, now=now)

    def _record_provider_nonretryable_failure(
        self,
        provider_name: str,
        latency_ms: float,
        error: Exception,
    ) -> None:
        state = self._provider_circuits.setdefault(provider_name, ProviderCircuitState())
        now = time.monotonic()
        state.consecutive_failures += 1
        state.last_error = redact_sensitive_text(error)
        state.half_open = False
        state.half_open_in_flight = False
        state.opened_until_monotonic = now + self._CIRCUIT_OPEN_SECONDS
        state.observations.append(
            ProviderObservation(
                timestamp_monotonic=now,
                success=False,
                latency_ms=latency_ms,
            )
        )
        self._prune_provider_observations(state, now=now)

    def _provider_health_metrics(self, provider_name: str) -> dict[str, object]:
        state = self._provider_circuits.setdefault(provider_name, ProviderCircuitState())
        now = time.monotonic()
        self._prune_provider_observations(state, now=now)
        observations = list(state.observations)
        total = len(observations)
        success_count = sum(1 for item in observations if item.success)
        avg_latency_ms = (
            round(sum(item.latency_ms for item in observations) / total, 2)
            if total
            else None
        )

        circuit_state = "closed"
        retry_after_seconds = 0
        if state.opened_until_monotonic is not None and now < state.opened_until_monotonic:
            circuit_state = "open"
            retry_after_seconds = max(1, int(state.opened_until_monotonic - now))
        elif state.half_open or state.half_open_in_flight:
            circuit_state = "half_open"

        return {
            "circuit_breaker": {
                "state": circuit_state,
                "consecutive_failures": state.consecutive_failures,
                "retry_after_seconds": retry_after_seconds,
                "last_error": state.last_error,
            },
            "success_rate_last_5m": round(success_count / total, 4) if total else None,
            "avg_latency_ms_last_5m": avg_latency_ms,
        }

    def _derive_effective_provider_health(
        self,
        *,
        reported_status: str,
        detail: str,
        metrics: dict[str, object],
    ) -> tuple[str, str]:
        if reported_status in {"disabled", "not_configured", "unavailable"}:
            return reported_status or "unknown", detail

        circuit_breaker = metrics.get("circuit_breaker")
        circuit_state = ""
        consecutive_failures = 0
        last_error = ""
        retry_after_seconds = 0
        if isinstance(circuit_breaker, dict):
            circuit_state = str(circuit_breaker.get("state") or "").strip().lower()
            consecutive_failures = int(circuit_breaker.get("consecutive_failures") or 0)
            last_error = str(circuit_breaker.get("last_error") or "").strip()
            retry_after_seconds = int(circuit_breaker.get("retry_after_seconds") or 0)

        success_rate = metrics.get("success_rate_last_5m")
        if circuit_state == "open":
            return "error", self._compose_health_detail(
                detail,
                f"recent provider failures opened the circuit for ~{retry_after_seconds or 0}s",
                last_error,
            )

        if isinstance(success_rate, (int, float)) and success_rate <= 0.0:
            return "error", self._compose_health_detail(
                detail,
                "recent live attempts all failed",
                last_error,
            )

        if reported_status in {"error", "degraded"}:
            return reported_status, self._compose_health_detail(
                detail,
                "provider reported degraded runtime health",
                last_error,
            )

        if circuit_state == "half_open":
            return "degraded", self._compose_health_detail(
                detail,
                "provider circuit is probing recovery",
                last_error,
            )

        if consecutive_failures > 0:
            return "degraded", self._compose_health_detail(
                detail,
                f"recent failure streak={consecutive_failures}",
                last_error,
            )

        if isinstance(success_rate, (int, float)) and success_rate < 1.0:
            return "degraded", self._compose_health_detail(
                detail,
                f"success rate last 5m={success_rate}",
                last_error,
            )

        return reported_status or "unknown", detail

    def _compose_health_detail(self, base_detail: str, headline: str, last_error: str) -> str:
        parts = [part for part in (base_detail, headline) if part]
        if last_error:
            parts.append(f"last_error={last_error}")
        return " | ".join(parts) if parts else "runtime health unavailable"

    def _prune_provider_observations(self, state: ProviderCircuitState, *, now: float) -> None:
        cutoff = now - self._OBSERVATION_WINDOW_SECONDS
        while state.observations and state.observations[0].timestamp_monotonic < cutoff:
            state.observations.popleft()


def guess_file_extension(mime_type: str) -> str:
    if "png" in mime_type:
        return ".png"
    if "webp" in mime_type:
        return ".webp"
    if "jpeg" in mime_type or "jpg" in mime_type:
        return ".jpg"
    return ".bin"


def build_media_path(base_dir: Path, asset_id: str, mime_type: str) -> Path:
    return base_dir / f"{asset_id}{guess_file_extension(mime_type)}"
