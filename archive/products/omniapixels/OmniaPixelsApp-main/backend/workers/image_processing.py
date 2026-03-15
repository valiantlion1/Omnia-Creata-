import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, Tuple
import io
from minio.error import S3Error

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Job, JobEvent, JobStatus
from app.storage import storage_service
from app.config import settings

# Pillow for local image operations
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

# Sprint-2: Numpy + OpenCV for enhanced filters and BG removal helpers
import numpy as np
import cv2

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def log_lifecycle_event(message: str):
    """Log worker lifecycle events to proof file"""
    try:
        os.makedirs("proof/backend", exist_ok=True)
        with open("proof/backend/rq_lifecycle.log", "a") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] IMAGE_WORKER: {message}\n")
    except Exception as e:
        logger.error(f"Failed to write lifecycle log: {e}")


def update_job_status(job_id: int, status: JobStatus, message: str = None, output_key: str = None, error_message: str = None):
    """Update job status in database"""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = status
            if output_key:
                job.output_key = output_key
            if error_message:
                job.error_message = error_message
            if status == JobStatus.COMPLETED:
                job.completed_at = datetime.utcnow()
            
            # Add job event
            event = JobEvent(
                job_id=job_id,
                event_type=status.value,
                message=message or f"Job {status.value}"
            )
            db.add(event)
            db.commit()
            
            log_lifecycle_event(f"Job {job_id} status updated to {status.value}")
    except Exception as e:
        logger.error(f"Failed to update job status: {e}")
        log_lifecycle_event(f"ERROR updating job {job_id}: {str(e)}")
    finally:
        db.close()


# --- Image ops helpers ---

def upscale_lanczos(img: Image.Image, scale: int = 2) -> Image.Image:
    """Upscale image by scale (2 or 4) using LANCZOS."""
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    w, h = img.size
    w2, h2 = max(1, int(w * scale)), max(1, int(h * scale))
    return img.resize((w2, h2), Image.LANCZOS)


def lite_deblur(img: Image.Image) -> Image.Image:
    """Lite deblur using unsharp masking via OpenCV for a bit more control.
    Fallback to PIL UnsharpMask if cv2 conversion fails.
    """
    try:
        # Convert PIL image to numpy BGR
        mode = img.mode
        if mode == "RGBA":
            rgba = np.array(img)
            rgb = rgba[:, :, :3]
            alpha = rgba[:, :, 3]
        else:
            rgb = np.array(img.convert("RGB"))
            alpha = None
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        # Unsharp mask: blur then add weighted
        blur = cv2.GaussianBlur(bgr, (0, 0), sigmaX=1.2)
        sharp = cv2.addWeighted(bgr, 1.5, blur, -0.5, 0)
        # Light denoise to remove ringing
        sharp = cv2.bilateralFilter(sharp, d=5, sigmaColor=50, sigmaSpace=50)
        rgb_out = cv2.cvtColor(sharp, cv2.COLOR_BGR2RGB)
        if alpha is not None:
            out = np.dstack([rgb_out, alpha])
            return Image.fromarray(out, mode="RGBA")
        return Image.fromarray(rgb_out)
    except Exception:
        # Fallback
        return img.filter(ImageFilter.UnsharpMask(radius=1.5, percent=140, threshold=3))


def estimate_bg_color(img_rgb: np.ndarray) -> np.ndarray:
    """Estimate background color from image borders (RGB)."""
    top = img_rgb[0, :, :]
    bottom = img_rgb[-1, :, :]
    left = img_rgb[:, 0, :]
    right = img_rgb[:, -1, :]
    border = np.vstack([top, bottom, left, right]).reshape(-1, 3)
    return border.mean(axis=0)


def create_fg_mask(img: Image.Image, threshold: int = 30, feather: int = 2) -> np.ndarray:
    """Create a simple foreground mask by color distance from estimated background color.
    Returns mask as uint8 [0,255].
    """
    rgb = np.array(img.convert("RGB"))
    bg = estimate_bg_color(rgb)
    diff = np.linalg.norm(rgb.astype(np.float32) - bg.reshape(1, 1, 3), axis=2)
    # Normalize and threshold
    mask = (diff > float(threshold)).astype(np.uint8) * 255
    # Morphology to clean noise
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    if feather > 0:
        mask = cv2.GaussianBlur(mask, (0, 0), sigmaX=feather)
    return mask


def apply_bg_preset(img: Image.Image, mask: np.ndarray, preset: str) -> Tuple[Image.Image, str, str]:
    """Apply background preset.
    Returns (out_image, pil_format, content_type)
    - preset: 'white' | 'shadow' | 'transparent'
    """
    preset = (preset or "transparent").lower()
    rgb = img.convert("RGB")
    h, w = mask.shape
    alpha = Image.fromarray(mask).resize(rgb.size, Image.LANCZOS)
    rgba = rgb.copy()
    rgba.putalpha(alpha)

    if preset == "white":
        # Composite on white background; output JPEG
        white_bg = Image.new("RGB", rgb.size, (255, 255, 255))
        comp = Image.alpha_composite(white_bg.convert("RGBA"), rgba).convert("RGB")
        return comp, "JPEG", "image/jpeg"
    elif preset == "shadow":
        # Simple drop shadow: blur the mask, offset and draw beneath
        shadow = Image.new("RGBA", rgb.size, (0, 0, 0, 0))
        shadow_mask = Image.fromarray(mask)
        shadow_mask = shadow_mask.filter(ImageFilter.GaussianBlur(radius=10))
        shadow_layer = Image.new("RGBA", rgb.size, (0, 0, 0, 80))
        # Offset a bit
        shadow.paste(shadow_layer, (8, 8), shadow_mask)
        base = Image.new("RGBA", rgb.size, (255, 255, 255, 255))
        base = Image.alpha_composite(base, shadow)
        base = Image.alpha_composite(base, rgba)
        return base, "PNG", "image/png"
    else:
        # Transparent PNG
        return rgba, "PNG", "image/png"


def _apply_local_upscale_and_enhance(img: Image.Image) -> Image.Image:
    """Apply 2x upscale and light auto-enhance using Pillow.
    - 2x upscale with LANCZOS
    - Light autocontrast, slight sharpening and contrast boost
    """
    # 2x upscale
    w, h = img.size
    # Convert to RGB to avoid issues for PNG with palette
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    up = img.resize((max(1, w * 2), max(1, h * 2)), Image.LANCZOS)

    # Light auto-contrast (clip 1%)
    up = ImageOps.autocontrast(up, cutoff=1)

    # Slight sharpness
    up = up.filter(ImageFilter.UnsharpMask(radius=1.2, percent=120, threshold=3))

    # Gentle contrast and color pop
    up = ImageEnhance.Contrast(up).enhance(1.05)
    if up.mode == "RGB":
        up = ImageEnhance.Color(up).enhance(1.03)

    return up


def process_image(job_data: Dict[str, Any]):
    """Process image job with local 2x/4x upscale, optional deblur, and background removal presets.
    Reads bytes from MinIO, processes, and uploads the result back with processed_ naming.
    """
    job_id = job_data['job_id']
    input_key = job_data['input_key']
    params = job_data.get('params', {}) or {}
    
    log_lifecycle_event(f"Starting image processing job {job_id} with input {input_key}")
    
    try:
        # Update status to processing
        update_job_status(job_id, JobStatus.PROCESSING, "Starting image processing")
        
        # Optional simulated latency (tiny)
        import time
        time.sleep(float(params.get('processing_time', 0.2)))
        
        # Download from storage (supports local or MinIO)
        try:
            data, in_content_type = storage_service.get_bytes(input_key)
        except Exception as e:
            # Graceful fail if missing
            msg = f"Input not found or storage error for {input_key}: {e}"
            logger.error(msg)
            log_lifecycle_event(msg)
            update_job_status(job_id, JobStatus.FAILED, "Input missing", error_message=str(e))
            raise
        
        # Process image according to params
        try:
            img = Image.open(io.BytesIO(data))
            # Determine scale: default 2x; allow explicit 4x via flags
            scale = 4 if (params.get('upscale_4x') or params.get('scale') in (4, '4x') or params.get('upscale') in (4, '4x')) else 2
            if scale == 4:
                # 4x upscale with LANCZOS + mild enhancement
                out_img = upscale_lanczos(img, 4)
                out_img = ImageOps.autocontrast(out_img, cutoff=1)
                out_img = out_img.filter(ImageFilter.UnsharpMask(radius=1.0, percent=110, threshold=2))
            else:
                # Keep previous 2x behavior for compatibility
                out_img = _apply_local_upscale_and_enhance(img)

            # Optional lite deblur
            if params.get('deblur'):
                out_img = lite_deblur(out_img)

            out_content_type = None
            preferred_fmt = None

            # Optional background removal with presets
            if params.get('bg_remove') or params.get('background_remove') or (params.get('bg') == 'remove'):
                preset = params.get('bg_preset') or params.get('preset') or 'transparent'
                threshold = int(params.get('bg_threshold', 30))
                feather = int(params.get('bg_feather', 2))
                mask = create_fg_mask(out_img, threshold=threshold, feather=feather)
                out_img, preferred_fmt, out_content_type = apply_bg_preset(out_img, mask, preset)
            else:
                # No BG removal: choose format based on original ext
                orig_ext = (input_key.split('.')[-1] if '.' in input_key else '').lower()
                if orig_ext in {"jpg", "jpeg"}:
                    preferred_fmt = "JPEG"
                    out_content_type = "image/jpeg"
                elif orig_ext in {"png"}:
                    preferred_fmt = "PNG"
                    out_content_type = "image/png"
                else:
                    preferred_fmt = "PNG"
                    out_content_type = "image/png"
        except Exception as e:
            msg = f"Image decode/process failed for job {job_id}: {e}"
            logger.error(msg)
            log_lifecycle_event(msg)
            update_job_status(job_id, JobStatus.FAILED, "Image processing error", error_message=str(e))
            raise

        # Encode output
        out_buf = io.BytesIO()
        save_kwargs = {"format": preferred_fmt}
        if preferred_fmt == "JPEG":
            # Ensure RGB and set quality for JPEG
            if out_img.mode not in ("RGB",):
                out_img = out_img.convert("RGB")
            save_kwargs.update({"quality": 90, "optimize": True})
        out_img.save(out_buf, **save_kwargs)
        out_bytes = out_buf.getvalue()

        # Generate output key (keep previous pattern to avoid breaking clients)
        output_key = f"processed_{input_key}"
        
        # Upload to MinIO
        storage_service.put_bytes(
            output_key,
            io.BytesIO(out_bytes).getvalue() if isinstance(out_bytes, (bytes, bytearray)) is False else out_bytes,
            content_type=out_content_type
        )
        
        log_lifecycle_event(f"Image processing completed for job {job_id}, output {output_key}")
        
        # Update status to completed
        update_job_status(
            job_id, 
            JobStatus.COMPLETED, 
            "Image processing completed successfully",
            output_key=output_key
        )
        
        return {
            'job_id': job_id,
            'status': 'completed',
            'output_key': output_key,
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Image processing failed for job {job_id}: {error_msg}")
        log_lifecycle_event(f"ERROR in job {job_id}: {error_msg}")
        
        # Update status to failed
        update_job_status(
            job_id,
            JobStatus.FAILED,
            "Image processing failed",
            error_message=error_msg
        )
        
        raise


if __name__ == "__main__":
    # Test the worker
    test_job = {
        'job_id': 999,
        'input_key': 'test_image.jpg',
        'params': {'processing_time': 0}
    }
    
    log_lifecycle_event("Image processing worker started (test mode)")
    result = process_image(test_job)
    log_lifecycle_event(f"Test completed: {result}")
    print("Image processing worker test completed")
