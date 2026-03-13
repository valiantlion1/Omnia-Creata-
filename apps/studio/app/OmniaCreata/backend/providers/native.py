import os
import io
import base64
import asyncio
import logging
import time
from pathlib import Path
from typing import Optional, Dict, Any, List
from concurrent.futures import ThreadPoolExecutor

from .base import (
    BaseProvider,
    ProviderConfig,
    GenerationRequest,
    GenerationResponse,
    ProviderError,
    ProviderHealth,
    ProviderStatus,
)

logger = logging.getLogger(__name__)

MODELS_DIR = Path(r"C:\AI\models\checkpoints")

# Models known to be SDXL (filename substring checks)
SDXL_KEYWORDS = ["xl", "sdxl", "juggernaut", "realvis", "animagine", "pony"]

_executor = ThreadPoolExecutor(max_workers=1)


def _check_cuda() -> bool:
    """Safely check CUDA availability without crashing."""
    try:
        import torch
        return torch.cuda.is_available()
    except Exception:
        return False


class NativeProvider(BaseProvider):
    """
    Generates images directly on the local GPU using HuggingFace diffusers.
    No external server required – pure Python + CUDA.
    """

    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self._pipe: Optional[Any] = None
        self._loaded_model: Optional[str] = None

    # ── abstract method stubs ──────────────────────────────────
    def _get_auth_headers(self) -> Dict[str, str]:
        return {}

    async def health_check(self) -> ProviderHealth:
        if not _check_cuda():
            return ProviderHealth(status=ProviderStatus.UNAVAILABLE, last_error="No CUDA GPU")
        if not MODELS_DIR.exists() or not list(MODELS_DIR.glob("*.safetensors")):
            return ProviderHealth(status=ProviderStatus.UNAVAILABLE, last_error="No models found")
        return ProviderHealth(status=ProviderStatus.HEALTHY)

    # ── helpers ────────────────────────────────────────────────
    def list_models(self) -> List[Dict[str, Any]]:
        models: List[Dict[str, Any]] = []
        if not MODELS_DIR.exists():
            return models
        for f in MODELS_DIR.glob("*.safetensors"):
            size_gb = f.stat().st_size / (1024 ** 3)
            is_xl = any(kw in f.stem.lower() for kw in SDXL_KEYWORDS)
            models.append({
                "filename": f.name,
                "path": str(f),
                "size_gb": round(size_gb, 2),
                "type": "sdxl" if is_xl else "sd15",
            })
        return models

    def _pick_default_model(self) -> Optional[Path]:
        """Pick the best available model (prefer SDXL realistic models)."""
        priorities = ["juggernaut", "realvis", "sd_xl_base", "animagine", "sdxl"]
        for keyword in priorities:
            for f in MODELS_DIR.glob("*.safetensors"):
                if keyword in f.stem.lower() and f.stat().st_size > 1_000_000_000:
                    return f
        # fallback: largest safetensors file
        files = sorted(MODELS_DIR.glob("*.safetensors"), key=lambda p: p.stat().st_size, reverse=True)
        return files[0] if files else None

    def _load_pipeline(self, model_path: Path) -> Any:
        # ── Compatibility shims for PyTorch 2.1.x ──────────────────────
        # diffusers 0.31+ probes torch features that don't exist in older
        # PyTorch. We stub them so the import succeeds.
        import torch
        import types

        # 1) torch.xpu (Intel GPU support, added in PyTorch 2.4)
        if not hasattr(torch, 'xpu'):
            class _FakeXPU:
                def is_available(self): return False
                def __getattr__(self, name): return lambda *a, **kw: None
            torch.xpu = _FakeXPU()

        # 2) torch.distributed.device_mesh (added in PyTorch 2.3)
        import torch.distributed as dist
        if not hasattr(dist, 'device_mesh'):
            dist.device_mesh = types.ModuleType('torch.distributed.device_mesh')
            import sys
            sys.modules['torch.distributed.device_mesh'] = dist.device_mesh

        from diffusers import StableDiffusionXLPipeline, StableDiffusionPipeline

        model_name = model_path.stem.lower()
        is_xl = any(kw in model_name for kw in SDXL_KEYWORDS)

        logger.info(f"Loading {'SDXL' if is_xl else 'SD1.5'} model: {model_path.name}")

        PipeClass = StableDiffusionXLPipeline if is_xl else StableDiffusionPipeline
        pipe = PipeClass.from_single_file(
            str(model_path),
            torch_dtype=torch.float16,
            use_safetensors=True,
        )
        pipe.to("cuda")

        # Memory optimizations for laptop GPUs
        if hasattr(pipe, "enable_attention_slicing"):
            pipe.enable_attention_slicing()

        logger.info(f"Model loaded successfully: {model_path.name}")
        return pipe

    def _generate_sync(self, request: GenerationRequest) -> GenerationResponse:
        """Blocking generation – run in thread pool."""
        import torch

        start = time.time()

        # Determine model
        model_path = self._pick_default_model()
        if model_path is None:
            raise ProviderError("No models found in C:\\AI\\models\\checkpoints", "native")

        # Lazy-load / switch model
        if self._pipe is None or self._loaded_model != str(model_path):
            if self._pipe is not None:
                del self._pipe
                torch.cuda.empty_cache()
            self._pipe = self._load_pipeline(model_path)
            self._loaded_model = str(model_path)

        # Build generation kwargs
        gen_kwargs: Dict[str, Any] = {
            "prompt": request.prompt,
            "width": request.width or 512,
            "height": request.height or 512,
            "num_inference_steps": min(request.steps or 20, 30),
            "guidance_scale": request.cfg_scale or 7.0,
        }
        if request.negative_prompt:
            gen_kwargs["negative_prompt"] = request.negative_prompt
        if request.seed is not None and request.seed != -1:
            gen_kwargs["generator"] = torch.Generator("cuda").manual_seed(request.seed)

        logger.info(f"Generating {gen_kwargs['width']}x{gen_kwargs['height']} "
                     f"with {gen_kwargs['num_inference_steps']} steps...")

        result = self._pipe(**gen_kwargs)
        image = result.images[0]

        # Convert to base64
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        img_data = f"data:image/png;base64,{b64}"

        elapsed = time.time() - start
        logger.info(f"Generation complete in {elapsed:.1f}s")

        return GenerationResponse(
            id=request.id or "native-gen",
            images=[img_data],
            prompt=request.prompt,
            provider="native",
        )

    # ── main entry point ───────────────────────────────────────
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, self._generate_sync, request)
