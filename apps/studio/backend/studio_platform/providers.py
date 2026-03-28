from __future__ import annotations

import asyncio
import io
import os
import textwrap
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import quote
from uuid import uuid4

import httpx
from PIL import Image, ImageDraw, ImageFont


LOCAL_MODEL_PREFIX = "local::"
ALLOWED_LOCAL_MODEL_EXTENSIONS = {".safetensors", ".ckpt", ".pt", ".pth"}


class ProviderTemporaryError(Exception):
    """Provider failed in a retryable way."""


class ProviderFatalError(Exception):
    """Provider failed in a non-retryable way."""


@dataclass
class ProviderResult:
    provider: str
    image_bytes: bytes
    mime_type: str
    width: int
    height: int
    estimated_cost: float


@dataclass
class LocalModelDescriptor:
    id: str
    filename: str
    path: str
    label: str
    size_bytes: int


class StudioImageProvider(ABC):
    name: str

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
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
    ) -> ProviderResult:
        raise NotImplementedError


class RunwareProvider(StudioImageProvider):
    """Architecture placeholder for the paid managed provider path."""

    name = "runware"

    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def health(self, probe: bool = True) -> Dict[str, object]:
        return {
            "name": self.name,
            "status": "healthy" if self.api_key else "not_configured",
            "detail": "managed provider configured" if self.api_key else "RUNWARE_API_KEY missing",
        }

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
    ) -> ProviderResult:
        raise ProviderTemporaryError(
            "Runware adapter is configured as the primary managed path but a concrete API flow is not yet wired."
        )


class PollinationsProvider(StudioImageProvider):
    name = "pollinations"

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
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
    ) -> ProviderResult:
        if not self.enabled:
            raise ProviderTemporaryError("Pollinations is disabled")

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


class DemoImageProvider(StudioImageProvider):
    name = "demo"

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
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
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

        draw.rounded_rectangle((32, 32, width - 32, height - 32), radius=28, outline=(70, 90, 130), width=2)
        draw.text((52, 56), title, fill=(245, 240, 255), font=font)
        draw.multiline_text((52, 120), wrapped_prompt, fill=(225, 229, 255), font=font, spacing=6)
        if negative_prompt.strip():
            neg = "Negative: " + negative_prompt[:120]
            draw.multiline_text((52, height - 150), "\n".join(textwrap.wrap(neg, width=42)), fill=(255, 195, 195), font=font, spacing=4)
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


class LocalComfyProvider(StudioImageProvider):
    name = "comfyui-local"

    def __init__(self) -> None:
        self.enabled = os.getenv("STUDIO_ENABLE_LOCAL_PROVIDER", "true").lower() != "false"
        self.base_url = os.getenv("STUDIO_LOCAL_COMFYUI_URL", "http://127.0.0.1:8188").rstrip("/")
        self.model_dir = self._resolve_model_dir(os.getenv("STUDIO_LOCAL_MODEL_DIR"))
        self.timeout_seconds = int(os.getenv("STUDIO_LOCAL_COMFYUI_TIMEOUT", "180"))

    async def is_available(self) -> bool:
        snapshot = await self.runtime_snapshot()
        return bool(snapshot.get("available"))

    async def health(self, probe: bool = True) -> Dict[str, object]:
        snapshot = await self.runtime_snapshot(probe=probe)
        return {
            "name": self.name,
            "status": snapshot["status"],
            "detail": snapshot["detail"],
            "model_directory": snapshot["model_directory"],
            "discovered_models": snapshot["discovered_models"],
            "url": snapshot["url"],
        }

    async def runtime_snapshot(self, probe: bool = True) -> Dict[str, object]:
        if not self.enabled:
            return {
                "enabled": False,
                "available": False,
                "status": "disabled",
                "detail": "Local provider disabled by configuration",
                "url": self.base_url,
                "model_directory": str(self.model_dir),
                "discovered_models": 0,
                "models": [],
            }

        discovered_models = await self.list_models()
        if not self.model_dir.exists():
            return {
                "enabled": True,
                "available": False,
                "status": "not_configured",
                "detail": "Local model directory was not found",
                "url": self.base_url,
                "model_directory": str(self.model_dir),
                "discovered_models": 0,
                "models": [],
            }

        if not probe:
            return {
                "enabled": True,
                "available": bool(discovered_models),
                "status": "healthy" if discovered_models else "degraded",
                "detail": "Local runtime configured (probe skipped)",
                "url": self.base_url,
                "model_directory": str(self.model_dir),
                "discovered_models": len(discovered_models),
                "models": [model.filename for model in discovered_models],
            }

        is_ready, detail = await self._probe_server()
        return {
            "enabled": True,
            "available": is_ready and bool(discovered_models),
            "status": "healthy" if is_ready and discovered_models else "degraded" if is_ready else "unavailable",
            "detail": detail if is_ready else detail,
            "url": self.base_url,
            "model_directory": str(self.model_dir),
            "discovered_models": len(discovered_models),
            "models": [model.filename for model in discovered_models],
        }

    async def list_models(self) -> List[LocalModelDescriptor]:
        return await asyncio.to_thread(self._discover_models)

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
    ) -> ProviderResult:
        if not self.enabled:
            raise ProviderTemporaryError("Local ComfyUI provider is disabled")
        if model_id is None or not model_id.startswith(LOCAL_MODEL_PREFIX):
            raise ProviderTemporaryError("Local provider requires a local model selection")

        checkpoint_name = model_id[len(LOCAL_MODEL_PREFIX):]
        available_models = {model.filename: model for model in await self.list_models()}
        if checkpoint_name not in available_models:
            raise ProviderTemporaryError(
                f"Local model '{checkpoint_name}' was not found in {self.model_dir}"
            )

        is_ready, detail = await self._probe_server()
        if not is_ready:
            raise ProviderTemporaryError(
                f"ComfyUI is not reachable at {self.base_url}. {detail}"
            )

        workflow = self._build_text_to_image_workflow(
            checkpoint_name=checkpoint_name,
            prompt=prompt,
            negative_prompt=negative_prompt,
            width=width,
            height=height,
            seed=seed,
            steps=steps,
            cfg_scale=cfg_scale,
        )
        client_id = f"studio-{uuid4().hex}"

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds, connect=5.0)) as client:
                response = await client.post(
                    f"{self.base_url}/prompt",
                    json={"prompt": workflow, "client_id": client_id},
                )
                response.raise_for_status()
                prompt_id = response.json().get("prompt_id")
                if not prompt_id:
                    raise ProviderTemporaryError("ComfyUI did not return a prompt_id")

                image_ref = await self._wait_for_output(client, prompt_id)
                image_response = await client.get(f"{self.base_url}/view", params=image_ref)
                image_response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise ProviderTemporaryError(f"ComfyUI returned {exc.response.status_code}") from exc
        except ProviderTemporaryError:
            raise
        except Exception as exc:
            raise ProviderTemporaryError(f"ComfyUI request failed: {exc}") from exc

        content_type = image_response.headers.get("content-type", "image/png").split(";")[0]
        return ProviderResult(
            provider=self.name,
            image_bytes=image_response.content,
            mime_type=content_type,
            width=width,
            height=height,
            estimated_cost=0.0,
        )

    def _resolve_model_dir(self, configured_dir: Optional[str]) -> Path:
        candidates: List[Path] = []
        if configured_dir:
            candidates.append(Path(configured_dir))

        candidates.extend(
            [
                Path("C:/AI/models/checkpoints"),
                Path("C:/AI/ComfyUI_windows_portable/ComfyUI/models/checkpoints"),
            ]
        )

        for candidate in candidates:
            if candidate.exists():
                return candidate
        return candidates[0]

    def _discover_models(self) -> List[LocalModelDescriptor]:
        if not self.model_dir.exists():
            return []

        descriptors: List[LocalModelDescriptor] = []
        for path in sorted(self.model_dir.iterdir(), key=lambda item: item.name.lower()):
            if not path.is_file() or path.suffix.lower() not in ALLOWED_LOCAL_MODEL_EXTENSIONS:
                continue
            try:
                size_bytes = path.stat().st_size
            except OSError:
                size_bytes = 0
            if size_bytes <= 0:
                continue
            descriptors.append(
                LocalModelDescriptor(
                    id=f"{LOCAL_MODEL_PREFIX}{path.name}",
                    filename=path.name,
                    path=str(path),
                    label=self._humanize_model_name(path.stem),
                    size_bytes=size_bytes,
                )
            )
        return descriptors

    async def _probe_server(self) -> tuple[bool, str]:
        try:
            async with httpx.AsyncClient(timeout=5.0, follow_redirects=True) as client:
                response = await client.get(f"{self.base_url}/system_stats")
                response.raise_for_status()
                return True, f"ready at {self.base_url}"
        except Exception as exc:
            return False, str(exc)

    async def _wait_for_output(self, client: httpx.AsyncClient, prompt_id: str) -> Dict[str, str]:
        deadline = asyncio.get_running_loop().time() + self.timeout_seconds
        while asyncio.get_running_loop().time() < deadline:
            history_response = await client.get(f"{self.base_url}/history/{prompt_id}")
            history_response.raise_for_status()
            payload = history_response.json()
            history = payload.get(prompt_id) if isinstance(payload, dict) else None

            if history and "outputs" in history:
                for output in history["outputs"].values():
                    images = output.get("images") or []
                    if images:
                        image = images[0]
                        return {
                            "filename": image["filename"],
                            "subfolder": image.get("subfolder", ""),
                            "type": image.get("type", "output"),
                        }

            await asyncio.sleep(1.0)

        raise ProviderTemporaryError("Timed out while waiting for ComfyUI output")

    def _build_text_to_image_workflow(
        self,
        checkpoint_name: str,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        steps: int,
        cfg_scale: float,
    ) -> Dict[str, Dict[str, object]]:
        return {
            "4": {
                "inputs": {"ckpt_name": checkpoint_name},
                "class_type": "CheckpointLoaderSimple",
            },
            "6": {
                "inputs": {"text": prompt, "clip": ["4", 1]},
                "class_type": "CLIPTextEncode",
            },
            "7": {
                "inputs": {"text": negative_prompt or "", "clip": ["4", 1]},
                "class_type": "CLIPTextEncode",
            },
            "5": {
                "inputs": {"width": width, "height": height, "batch_size": 1},
                "class_type": "EmptyLatentImage",
            },
            "3": {
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg_scale,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 1,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0],
                },
                "class_type": "KSampler",
            },
            "8": {
                "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
                "class_type": "VAEDecode",
            },
            "9": {
                "inputs": {
                    "filename_prefix": f"omnia_creata_{uuid4().hex[:8]}",
                    "images": ["8", 0],
                },
                "class_type": "SaveImage",
            },
        }

    def _humanize_model_name(self, stem: str) -> str:
        cleaned = stem.replace("_", " ").replace("-", " ").strip()
        parts = [part for part in cleaned.split() if part]
        if not parts:
            return stem
        return " ".join(word.upper() if word.isupper() else word.capitalize() for word in parts)


class ProviderRegistry:
    def __init__(self) -> None:
        self.local_provider = LocalComfyProvider()
        self.providers: List[StudioImageProvider] = [
            RunwareProvider(os.getenv("RUNWARE_API_KEY")),
            DemoImageProvider(),
            PollinationsProvider(enabled=os.getenv("STUDIO_ENABLE_POLLINATIONS", "true").lower() != "false"),
        ]

    def is_local_model(self, model_id: Optional[str]) -> bool:
        return bool(model_id and model_id.startswith(LOCAL_MODEL_PREFIX))

    async def health_snapshot(self, probe: bool = True) -> List[Dict[str, object]]:
        return [await self.local_provider.health(probe=probe), *[await provider.health(probe=probe) for provider in self.providers]]

    async def list_local_models(self) -> List[LocalModelDescriptor]:
        return await self.local_provider.list_models()

    async def local_runtime_snapshot(self, probe: bool = True) -> Dict[str, object]:
        return await self.local_provider.runtime_snapshot(probe=probe)

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
        model_id: Optional[str] = None,
        steps: int = 30,
        cfg_scale: float = 6.5,
    ) -> ProviderResult:
        if self.is_local_model(model_id):
            return await self.local_provider.generate(
                prompt=prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                seed=seed,
                model_id=model_id,
                steps=steps,
                cfg_scale=cfg_scale,
            )

        last_error: Optional[Exception] = None
        for provider in self.providers:
            if not await provider.is_available():
                continue

            try:
                return await provider.generate(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    width=width,
                    height=height,
                    seed=seed,
                    model_id=model_id,
                    steps=steps,
                    cfg_scale=cfg_scale,
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
