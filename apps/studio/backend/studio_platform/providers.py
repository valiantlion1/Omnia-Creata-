from __future__ import annotations

import asyncio
import base64
import io
import json
import textwrap
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence
from urllib.parse import quote

import httpx
from PIL import Image, ImageDraw, ImageFont

from config.env import get_settings


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


@dataclass(slots=True)
class ProviderReferenceImage:
    asset_id: str
    image_bytes: bytes
    mime_type: str
    title: str = ""


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


def normalize_generation_workflow(workflow: str | None, *, has_reference_image: bool = False) -> str:
    normalized = (workflow or "").strip().lower()
    if normalized in {"image_to_image", "img2img", "i2i"}:
        return "image_to_image"
    if normalized in {"edit", "inpaint", "outpaint"}:
        return "edit"
    if has_reference_image:
        return "image_to_image"
    return "text_to_image"


class StudioImageProvider(ABC):
    name: str
    rollout_tier: str = "fallback"
    capabilities: ProviderCapabilities = ProviderCapabilities(workflows=("text_to_image",))

    @abstractmethod
    async def is_available(self) -> bool:
        raise NotImplementedError

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
            "priority": priority,
            "capabilities": self.capabilities.to_dict(),
        }


class FalProvider(StudioImageProvider):
    name = "fal"
    rollout_tier = "primary"
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
        )

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
            try:
                response = await client.post(
                    url,
                    json=payload,
                    headers=self._build_headers(),
                    params={"priority": priority},
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                self._raise_provider_error(
                    status_code=exc.response.status_code,
                    detail=exc.response.text,
                )
            except Exception as exc:
                raise ProviderTemporaryError(f"fal.ai queue submit failed: {exc}") from exc
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
                try:
                    response = await client.get(
                        status_url,
                        headers=self._build_headers(),
                        params={"logs": 1},
                    )
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    self._raise_provider_error(
                        status_code=exc.response.status_code,
                        detail=exc.response.text,
                    )
                except Exception as exc:
                    raise ProviderTemporaryError(f"fal.ai queue status failed: {exc}") from exc

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
                    try:
                        result_response = await client.get(response_url, headers=self._build_headers())
                        result_response.raise_for_status()
                    except httpx.HTTPStatusError as exc:
                        self._raise_provider_error(
                            status_code=exc.response.status_code,
                            detail=exc.response.text,
                        )
                    except Exception as exc:
                        raise ProviderTemporaryError(f"fal.ai queue result fetch failed: {exc}") from exc
                    return result_response.json()

                raise ProviderTemporaryError(f"fal.ai returned unexpected queue status: {status or 'unknown'}")

        raise ProviderTemporaryError("fal.ai queue request timed out before completion")

    async def _download_result_image(self, *, image_url: str, fallback_mime_type: str) -> tuple[bytes, str]:
        async with self._build_client() as client:
            try:
                response = await client.get(image_url)
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise ProviderTemporaryError(
                    f"fal.ai output download returned {exc.response.status_code}"
                ) from exc
            except Exception as exc:
                raise ProviderTemporaryError(f"fal.ai output download failed: {exc}") from exc
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
        timeout = httpx.Timeout(max(get_settings().default_timeout_seconds, 30), connect=10.0)
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
            try:
                response = await client.post(
                    self._API_URL,
                    json=[request_payload],
                    headers=self._build_headers(),
                )
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                self._raise_provider_error(
                    status_code=exc.response.status_code,
                    detail=exc.response.text,
                )
            except Exception as exc:
                raise ProviderTemporaryError(f"Runware request failed: {exc}") from exc

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
        timeout = httpx.Timeout(max(get_settings().default_timeout_seconds, 30), connect=10.0)
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


class PollinationsProvider(StudioImageProvider):
    name = "pollinations"
    rollout_tier = "degraded"
    capabilities = ProviderCapabilities(workflows=("text_to_image",))

    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.base_url = "https://image.pollinations.ai/prompt/"

    async def is_available(self) -> bool:
        return self.enabled

    async def health(self, probe: bool = True) -> Dict[str, object]:
        if not self.enabled:
            return {"name": self.name, "status": "disabled", "detail": "disabled by configuration"}

        if not probe:
            return {"name": self.name, "status": "healthy", "detail": "probe skipped"}

        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                response = await client.get("https://image.pollinations.ai/")
                return {
                    "name": self.name,
                    "status": "healthy" if response.status_code < 500 else "degraded",
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

        params = {"width": width, "height": height, "nologo": "true", "seed": seed}
        if negative_prompt.strip():
            params["negative"] = negative_prompt.strip()

        url = f"{self.base_url}{quote(prompt)}"
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(12.0, connect=5.0), follow_redirects=True) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ProviderTemporaryError(f"Pollinations returned {exc.response.status_code}") from exc
        except Exception as exc:
            raise ProviderTemporaryError(f"Pollinations request failed: {exc}") from exc

        content_type = response.headers.get("content-type", "image/jpeg")
        return ProviderResult(
            provider=self.name,
            image_bytes=response.content,
            mime_type=content_type.split(";")[0],
            width=width,
            height=height,
            estimated_cost=0.0,
        )


class HuggingFaceImageProvider(StudioImageProvider):
    name = "huggingface"
    rollout_tier = "optional-router"
    capabilities = ProviderCapabilities(workflows=("text_to_image",))

    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token

    async def is_available(self) -> bool:
        return bool(self.api_token)

    async def health(self, probe: bool = True) -> Dict[str, object]:
        if not self.api_token:
            return {"name": self.name, "status": "disabled", "detail": "Missing HUGGINGFACE_TOKEN"}
        return {"name": self.name, "status": "healthy", "detail": "Configured"}

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

        hf_model = (
            "black-forest-labs/FLUX.1-schnell"
            if "flux" in str(model_id).lower()
            else "stabilityai/stable-diffusion-xl-base-1.0"
        )
        url = f"https://api-inference.huggingface.co/models/{hf_model}"
        headers = {"Authorization": f"Bearer {self.api_token}"}
        payload = {
            "inputs": prompt,
            "parameters": {
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "guidance_scale": cfg_scale,
                "num_inference_steps": min(steps, 50),
            },
        }

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 503:
                    raise ProviderTemporaryError(f"HuggingFace model is currently loading: {response.text}")
                response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ProviderTemporaryError(f"HuggingFace returned {exc.response.status_code}: {exc.response.text}") from exc
        except Exception as exc:
            raise ProviderTemporaryError(f"HuggingFace request failed: {exc}") from exc

        content_type = response.headers.get("content-type", "image/jpeg")
        return ProviderResult(
            provider=self.name,
            image_bytes=response.content,
            mime_type=content_type.split(";")[0],
            width=width,
            height=height,
            estimated_cost=0.01,
        )


class DemoImageProvider(StudioImageProvider):
    name = "demo"
    rollout_tier = "local-fallback"
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
        )


class ProviderRegistry:
    def __init__(self) -> None:
        settings = get_settings()
        self.providers: List[StudioImageProvider] = []

        self.providers.append(FalProvider(settings.fal_api_key))
        self.providers.append(RunwareProvider(settings.runware_api_key))
        if settings.huggingface_token:
            self.providers.append(HuggingFaceImageProvider(settings.huggingface_token))
        if settings.enable_pollinations:
            self.providers.append(PollinationsProvider(enabled=True))
        self.providers.append(DemoImageProvider())

    def _iter_supported_providers(
        self,
        *,
        workflow: str,
        reference_image: Optional[ProviderReferenceImage],
    ) -> Sequence[StudioImageProvider]:
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=reference_image is not None,
        )
        return [
            provider
            for provider in self.providers
            if provider.supports_generation(normalized_workflow, has_reference_image=reference_image is not None)
        ]

    def preview_generation_provider(
        self,
        *,
        workflow: str = "text_to_image",
        has_reference_image: bool = False,
    ) -> str:
        normalized_workflow = normalize_generation_workflow(
            workflow,
            has_reference_image=has_reference_image,
        )
        for provider in self.providers:
            if provider.supports_generation(normalized_workflow, has_reference_image=has_reference_image):
                return provider.name
        return "cloud"

    async def health_snapshot(self, probe: bool = True) -> List[Dict[str, object]]:
        payload: list[dict[str, object]] = []
        for priority, provider in enumerate(self.providers, start=1):
            payload.append(await provider.health_snapshot(probe=probe, priority=priority))
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
    ) -> ProviderResult:
        last_error: Optional[Exception] = None
        supported_providers = self._iter_supported_providers(
            workflow=workflow,
            reference_image=reference_image,
        )
        if not supported_providers:
            raise ProviderTemporaryError("No provider supports this generation workflow")

        for provider in supported_providers:
            if not await provider.is_available():
                continue

            try:
                return await provider.generate(
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
            except ProviderFatalError:
                raise
            except Exception as exc:
                last_error = exc
                continue

        if last_error:
            raise ProviderTemporaryError(str(last_error)) from last_error
        raise ProviderTemporaryError("No providers available")


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
