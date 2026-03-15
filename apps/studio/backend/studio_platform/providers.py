from __future__ import annotations

import io
import os
import textwrap
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import quote

import httpx
from PIL import Image, ImageDraw, ImageFont


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


class StudioImageProvider(ABC):
    name: str

    @abstractmethod
    async def is_available(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def health(self) -> Dict[str, str]:
        raise NotImplementedError

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
    ) -> ProviderResult:
        raise NotImplementedError


class RunwareProvider(StudioImageProvider):
    """Architecture placeholder for the paid managed provider path."""

    name = "runware"

    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key

    async def is_available(self) -> bool:
        return bool(self.api_key)

    async def health(self) -> Dict[str, str]:
        return {
            "name": self.name,
            "status": "healthy" if self.api_key else "not_configured",
            "detail": "ready" if self.api_key else "RUNWARE_API_KEY missing",
        }

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
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

    async def health(self) -> Dict[str, str]:
        if not self.enabled:
            return {"name": self.name, "status": "disabled", "detail": "disabled by configuration"}

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
    ) -> ProviderResult:
        if not self.enabled:
            raise ProviderTemporaryError("Pollinations is disabled")

        params = {"width": width, "height": height, "nologo": "true", "seed": seed}
        if negative_prompt.strip():
            params["negative"] = negative_prompt.strip()

        url = f"{self.base_url}{quote(prompt)}"
        try:
            async with httpx.AsyncClient(timeout=90.0, follow_redirects=True) as client:
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

    async def health(self) -> Dict[str, str]:
        return {"name": self.name, "status": "healthy", "detail": "local fallback"}

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
    ) -> ProviderResult:
        image = Image.new("RGBA", (width, height), (12, 16, 28, 255))
        draw = ImageDraw.Draw(image)

        # Keep the dev fallback visually branded instead of a blank placeholder.
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


class ProviderRegistry:
    def __init__(self) -> None:
        self.providers: List[StudioImageProvider] = [
            RunwareProvider(os.getenv("RUNWARE_API_KEY")),
            PollinationsProvider(enabled=os.getenv("STUDIO_ENABLE_POLLINATIONS", "true").lower() != "false"),
            DemoImageProvider(),
        ]

    async def health_snapshot(self) -> List[Dict[str, str]]:
        return [await provider.health() for provider in self.providers]

    async def generate(
        self,
        prompt: str,
        negative_prompt: str,
        width: int,
        height: int,
        seed: int,
    ) -> ProviderResult:
        last_error: Optional[Exception] = None
        for provider in self.providers:
            if not await provider.is_available():
                continue

            try:
                return await provider.generate(prompt, negative_prompt, width, height, seed)
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
