import io
import os
import logging
import time
from typing import Tuple, Dict, Any, Optional

try:
    from PIL import Image, ImageEnhance, ImageFilter
    import numpy as np
    import cv2
    import torch
    from rembg import remove as rembg_remove
    from realesrgan import RealESRGANer
    from basicsr.archs.rrdbnet_arch import RRDBNet
except ImportError:
    Image = None
    np = None
    cv2 = None
    torch = None
    rembg_remove = None
    RealESRGANer = None
    RRDBNet = None

from app.config import settings

logger = logging.getLogger(__name__)

class AIEngine:
    """
    OmniaPixels AI Engine.
    Handles image processing tasks using Local (ZeroCost) or Cloud providers.
    Supports Real-ESRGAN and RemBG models.
    """

    def __init__(self):
        self.has_local_deps = Image is not None and np is not None and cv2 is not None
        if not self.has_local_deps:
            logger.warning("Local AI dependencies (Pillow, numpy, opencv-python) not found. Local processing will fail.")
        
        self.has_ai_models = torch is not None and rembg_remove is not None and RealESRGANer is not None
        if not self.has_ai_models:
            logger.warning("Advanced AI models (torch, rembg, realesrgan) not found.")

        # Model cache
        self.upsampler = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu') if torch else None

    def _load_realesrgan(self):
        if self.upsampler is not None:
            return self.upsampler
        
        if not self.has_ai_models:
            return None

        try:
            model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models", "RealESRGAN_x4plus.pth")
            if not os.path.exists(model_path):
                # Fallback to x2 if x4 not found, or None
                model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "models", "RealESRGAN_x2plus.pth")
                if not os.path.exists(model_path):
                    logger.error("RealESRGAN model weights not found in backend/models/")
                    return None

            # Initialize RealESRGAN
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
            self.upsampler = RealESRGANer(
                scale=4,
                model_path=model_path,
                model=model,
                tile=0,  # 0 for no tile, set to e.g. 400 for low memory
                tile_pad=10,
                pre_pad=0,
                half=False, # True for fp16 inference on GPU
                device=self.device,
            )
            return self.upsampler
        except Exception as e:
            logger.error(f"Failed to load RealESRGAN: {e}")
            return None

    def process(self, image_data: bytes, task_type: str, params: Dict[str, Any] = None) -> Tuple[bytes, str, Dict[str, Any]]:
        """
        Main entry point for processing.
        Returns: (processed_image_bytes, content_type, metadata)
        """
        if params is None:
            params = {}

        # Router Logic
        use_cloud = not settings.COST_SHIELD
        if params.get('force_cloud'):
            use_cloud = True
        elif params.get('force_local'):
            use_cloud = False

        start_time = time.time()
        metadata = {
            "task_type": task_type,
            "provider": "unknown",
            "model": "unknown",
        }

        try:
            # We prefer local AI models if available, even if 'use_cloud' is requested (since our cloud mock is just local fallback)
            # In a real scenario, we would check cloud API status here.
            # For now, we route to advanced local models (Torch) vs basic local ops (Pillow)
            
            if task_type == "upscale" and params.get("scale") == 4 and self.has_ai_models:
                 result, content_type = self._ai_upscale(image_data, params, metadata)
            elif task_type == "remove_bg" and self.has_ai_models:
                 result, content_type = self._ai_remove_bg(image_data, params, metadata)
            elif task_type == "inpaint":
                 # Fallback to OpenCV inpaint as we don't have heavy AI inpaint model yet
                 result, content_type = self._opencv_inpaint(image_data, params, metadata)
            elif use_cloud:
                result, content_type = self._cloud_process(image_data, task_type, params, metadata)
            else:
                result, content_type = self._local_process(image_data, task_type, params, metadata)
        except Exception as e:
            logger.warning(f"Primary processing failed: {e}. Attempting basic local fallback.")
            result, content_type = self._local_process(image_data, task_type, params, metadata)
            metadata["fallback"] = True

        metadata["latency_ms"] = int((time.time() - start_time) * 1000)
        return result, content_type, metadata

    def _ai_upscale(self, image_data: bytes, params: Dict[str, Any], metadata: Dict[str, Any]) -> Tuple[bytes, str]:
        upsampler = self._load_realesrgan()
        if not upsampler:
            raise RuntimeError("RealESRGAN model not available")
        
        img = Image.open(io.BytesIO(image_data)).convert('RGB')
        img_np = np.array(img)
        
        # Inference
        output, _ = upsampler.enhance(img_np, outscale=4)
        
        output_img = Image.fromarray(output)
        out_buf = io.BytesIO()
        output_img.save(out_buf, format="PNG") # Upscale usually PNG
        
        metadata["provider"] = "local_ai"
        metadata["model"] = "realesrgan_x4plus"
        return out_buf.getvalue(), "image/png"

    def _ai_remove_bg(self, image_data: bytes, params: Dict[str, Any], metadata: Dict[str, Any]) -> Tuple[bytes, str]:
        output_data = rembg_remove(image_data)
        metadata["provider"] = "local_ai"
        metadata["model"] = "u2net (rembg)"
        return output_data, "image/png"

    def _opencv_inpaint(self, image_data: bytes, params: Dict[str, Any], metadata: Dict[str, Any]) -> Tuple[bytes, str]:
        """Basic Inpainting using OpenCV (Telea)"""
        # Requires 'mask' in params (base64 or separate file). 
        # For simplicity here, we assume mask is not provided and this is a placeholder/stub
        # In a real scenario, we'd need the mask image.
        # If no mask, return original
        logger.warning("Inpaint requested but no mask provided logic implemented yet. Returning original.")
        metadata["provider"] = "local_opencv"
        metadata["model"] = "telea_stub"
        return image_data, "image/jpeg"

    def _local_process(self, image_data: bytes, task_type: str, params: Dict[str, Any], metadata: Dict[str, Any]) -> Tuple[bytes, str]:
        """
        ZeroCost / Offline processing chain using Pillow and OpenCV.
        """
        if not self.has_local_deps:
            raise RuntimeError("Local dependencies missing")

        metadata["provider"] = "local_zerocost"
        
        # Load image
        img = Image.open(io.BytesIO(image_data))
        original_format = img.format or "JPEG"
        content_type = f"image/{original_format.lower()}"

        # Processing Switch
        if task_type == "enhance":
            img = self._local_enhance(img, params)
            metadata["model"] = "pillow_enhance"
        elif task_type == "upscale":
            # Simple bicubic upscale for ZeroCost
            scale = params.get("scale", 2)
            img = self._local_upscale(img, scale)
            metadata["model"] = "bicubic_upscale"
        elif task_type == "denoise":
            img = self._local_denoise(img, params)
            metadata["model"] = "opencv_denoise"
        else:
            # Default: No-op or Resize if 'resize' param exists
            pass

        # Global Resize if requested (e.g. for thumbnails)
        if "resize_width" in params:
            w = params["resize_width"]
            h = int(img.height * (w / img.width))
            img = img.resize((w, h), Image.Resampling.LANCZOS)

        # Save to bytes
        output = io.BytesIO()
        save_format = original_format
        # Handle RGBA to RGB for JPEG
        if save_format.upper() == "JPEG" and img.mode == "RGBA":
            img = img.convert("RGB")
        
        img.save(output, format=save_format, quality=params.get("quality", 90))
        return output.getvalue(), content_type

    def _cloud_process(self, image_data: bytes, task_type: str, params: Dict[str, Any], metadata: Dict[str, Any]) -> Tuple[bytes, str]:
        """
        Placeholder for Cloud API processing (Replicate, HF, etc.)
        """
        metadata["provider"] = "cloud_mock"
        metadata["model"] = "cloud_v1"
        
        # Simulate network latency
        time.sleep(1)
        
        # For now, just do a high-quality local process to simulate 'cloud' result
        return self._local_process(image_data, task_type, params, metadata)

    # --- Local Algorithms ---

    def _local_enhance(self, img: Image.Image, params: Dict[str, Any]) -> Image.Image:
        """Auto-enhance chain: Color -> Contrast -> Sharpness"""
        # Auto contrast
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2)
        
        # Color
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.1)
        
        # Sharpness
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(1.3)
        
        return img

    def _local_upscale(self, img: Image.Image, scale: int) -> Image.Image:
        new_size = (int(img.width * scale), int(img.height * scale))
        return img.resize(new_size, Image.Resampling.BICUBIC)

    def _local_denoise(self, img: Image.Image, params: Dict[str, Any]) -> Image.Image:
        # Convert to OpenCV format
        cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Denoise
        strength = params.get("strength", 3)
        # fastNlMeansDenoisingColored is good for color images
        denoised = cv2.fastNlMeansDenoisingColored(cv_img, None, strength, strength, 7, 21)
        
        # Convert back to Pillow
        return Image.fromarray(cv2.cvtColor(denoised, cv2.COLOR_BGR2RGB))

ai_engine = AIEngine()
