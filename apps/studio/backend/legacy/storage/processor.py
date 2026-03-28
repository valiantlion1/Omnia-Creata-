import os
import asyncio
import aiofiles
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import hashlib
import logging
from io import BytesIO
import base64

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
    from PIL.ExifTags import TAGS
except ImportError:
    Image = None
    ImageDraw = None
    ImageFont = None
    ImageFilter = None
    ImageEnhance = None
    TAGS = None

try:
    import cv2
    import numpy as np
except ImportError:
    cv2 = None
    np = None

logger = logging.getLogger(__name__)


class ImageProcessor:
    """Image processing utilities for upscaling, watermarking, and metadata"""
    
    def __init__(self, temp_dir: str = "./temp", watermark_text: str = "OmniaCreata"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
        self.watermark_text = watermark_text
        
        if Image is None:
            logger.warning("PIL not available - image processing will be limited")
        
        if cv2 is None or np is None:
            logger.warning("OpenCV/NumPy not available - advanced upscaling disabled")
    
    async def process_image(
        self,
        image_data: bytes,
        operations: Dict[str, Any]
    ) -> Tuple[bytes, Dict[str, Any]]:
        """Process image with specified operations"""
        try:
            if Image is None:
                raise ImportError("PIL is required for image processing")
            
            # Load image
            image = Image.open(BytesIO(image_data))
            original_format = image.format or 'JPEG'
            
            # Extract metadata
            metadata = await self._extract_metadata(image)
            
            # Apply operations in order
            if operations.get('upscale'):
                image = await self._upscale_image(
                    image, 
                    operations['upscale'].get('factor', 2),
                    operations['upscale'].get('method', 'lanczos')
                )
            
            if operations.get('enhance'):
                image = await self._enhance_image(image, operations['enhance'])
            
            if operations.get('watermark'):
                image = await self._add_watermark(
                    image, 
                    operations['watermark']
                )
            
            if operations.get('resize'):
                image = await self._resize_image(image, operations['resize'])
            
            # Convert back to bytes
            output_buffer = BytesIO()
            save_format = operations.get('format', original_format).upper()
            
            if save_format == 'JPEG':
                # Convert RGBA to RGB for JPEG
                if image.mode in ('RGBA', 'LA'):
                    background = Image.new('RGB', image.size, (255, 255, 255))
                    background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                    image = background
                
                image.save(
                    output_buffer, 
                    format=save_format,
                    quality=operations.get('quality', 95),
                    optimize=True
                )
            else:
                image.save(output_buffer, format=save_format)
            
            processed_data = output_buffer.getvalue()
            
            # Update metadata
            metadata.update({
                'processed_at': datetime.utcnow().isoformat(),
                'operations': operations,
                'original_size': len(image_data),
                'processed_size': len(processed_data),
                'final_dimensions': image.size,
                'format': save_format
            })
            
            logger.info(f"Processed image: {len(operations)} operations applied")
            
            return processed_data, metadata
            
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise
    
    async def _extract_metadata(self, image: Image.Image) -> Dict[str, Any]:
        """Extract metadata from image"""
        metadata = {
            'dimensions': image.size,
            'mode': image.mode,
            'format': image.format,
            'has_transparency': image.mode in ('RGBA', 'LA') or 'transparency' in image.info
        }
        
        # Extract EXIF data if available
        if hasattr(image, '_getexif') and TAGS:
            try:
                exif_data = image._getexif()
                if exif_data:
                    exif = {}
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        exif[tag] = value
                    metadata['exif'] = exif
            except Exception:
                pass
        
        # Color analysis
        try:
            # Get dominant colors
            colors = image.getcolors(maxcolors=256*256*256)
            if colors:
                # Sort by frequency and get top 5
                dominant_colors = sorted(colors, key=lambda x: x[0], reverse=True)[:5]
                metadata['dominant_colors'] = [
                    {'color': color[1], 'frequency': color[0]} 
                    for color in dominant_colors
                ]
        except Exception:
            pass
        
        return metadata
    
    async def _upscale_image(
        self, 
        image: Image.Image, 
        factor: int = 2, 
        method: str = 'lanczos'
    ) -> Image.Image:
        """Upscale image using various methods"""
        try:
            original_size = image.size
            new_size = (original_size[0] * factor, original_size[1] * factor)
            
            if method == 'lanczos':
                return image.resize(new_size, Image.Resampling.LANCZOS)
            
            elif method == 'bicubic':
                return image.resize(new_size, Image.Resampling.BICUBIC)
            
            elif method == 'nearest':
                return image.resize(new_size, Image.Resampling.NEAREST)
            
            elif method == 'esrgan' and cv2 is not None and np is not None:
                return await self._esrgan_upscale(image, factor)
            
            else:
                # Default to Lanczos
                logger.warning(f"Unknown upscale method '{method}', using Lanczos")
                return image.resize(new_size, Image.Resampling.LANCZOS)
                
        except Exception as e:
            logger.error(f"Error upscaling image: {e}")
            return image
    
    async def _esrgan_upscale(self, image: Image.Image, factor: int) -> Image.Image:
        """Upscale using ESRGAN (placeholder - would need actual model)"""
        # This is a placeholder for ESRGAN upscaling
        # In a real implementation, you would:
        # 1. Load a pre-trained ESRGAN model
        # 2. Convert PIL image to numpy array
        # 3. Run inference
        # 4. Convert back to PIL image
        
        logger.warning("ESRGAN upscaling not implemented, falling back to Lanczos")
        return await self._upscale_image(image, factor, 'lanczos')
    
    async def _enhance_image(
        self, 
        image: Image.Image, 
        enhancements: Dict[str, float]
    ) -> Image.Image:
        """Apply image enhancements"""
        try:
            enhanced = image.copy()
            
            # Brightness
            if 'brightness' in enhancements:
                enhancer = ImageEnhance.Brightness(enhanced)
                enhanced = enhancer.enhance(enhancements['brightness'])
            
            # Contrast
            if 'contrast' in enhancements:
                enhancer = ImageEnhance.Contrast(enhanced)
                enhanced = enhancer.enhance(enhancements['contrast'])
            
            # Saturation
            if 'saturation' in enhancements:
                enhancer = ImageEnhance.Color(enhanced)
                enhanced = enhancer.enhance(enhancements['saturation'])
            
            # Sharpness
            if 'sharpness' in enhancements:
                enhancer = ImageEnhance.Sharpness(enhanced)
                enhanced = enhancer.enhance(enhancements['sharpness'])
            
            # Blur
            if 'blur' in enhancements and enhancements['blur'] > 0:
                enhanced = enhanced.filter(ImageFilter.GaussianBlur(enhancements['blur']))
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing image: {e}")
            return image
    
    async def _add_watermark(
        self, 
        image: Image.Image, 
        watermark_config: Dict[str, Any]
    ) -> Image.Image:
        """Add watermark to image"""
        try:
            watermarked = image.copy()
            
            if watermark_config.get('type') == 'text':
                watermarked = await self._add_text_watermark(watermarked, watermark_config)
            elif watermark_config.get('type') == 'image':
                watermarked = await self._add_image_watermark(watermarked, watermark_config)
            
            return watermarked
            
        except Exception as e:
            logger.error(f"Error adding watermark: {e}")
            return image
    
    async def _add_text_watermark(
        self, 
        image: Image.Image, 
        config: Dict[str, Any]
    ) -> Image.Image:
        """Add text watermark"""
        try:
            # Create a transparent overlay
            overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
            draw = ImageDraw.Draw(overlay)
            
            # Watermark settings
            text = config.get('text', self.watermark_text)
            opacity = int(config.get('opacity', 0.3) * 255)
            position = config.get('position', 'bottom-right')
            font_size = config.get('font_size', max(image.size) // 40)
            color = config.get('color', (255, 255, 255, opacity))
            
            # Try to load a font
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                try:
                    font = ImageFont.load_default()
                except:
                    font = None
            
            # Get text dimensions
            if font:
                bbox = draw.textbbox((0, 0), text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
            else:
                text_width = len(text) * font_size // 2
                text_height = font_size
            
            # Calculate position
            margin = 20
            if position == 'bottom-right':
                x = image.size[0] - text_width - margin
                y = image.size[1] - text_height - margin
            elif position == 'bottom-left':
                x = margin
                y = image.size[1] - text_height - margin
            elif position == 'top-right':
                x = image.size[0] - text_width - margin
                y = margin
            elif position == 'top-left':
                x = margin
                y = margin
            elif position == 'center':
                x = (image.size[0] - text_width) // 2
                y = (image.size[1] - text_height) // 2
            else:
                x, y = margin, image.size[1] - text_height - margin
            
            # Draw text
            draw.text((x, y), text, fill=color, font=font)
            
            # Composite with original image
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            watermarked = Image.alpha_composite(image, overlay)
            
            # Convert back to original mode if needed
            if config.get('preserve_mode', True) and image.mode != 'RGBA':
                watermarked = watermarked.convert(image.mode)
            
            return watermarked
            
        except Exception as e:
            logger.error(f"Error adding text watermark: {e}")
            return image
    
    async def _add_image_watermark(
        self, 
        image: Image.Image, 
        config: Dict[str, Any]
    ) -> Image.Image:
        """Add image watermark"""
        try:
            watermark_path = config.get('image_path')
            if not watermark_path or not os.path.exists(watermark_path):
                logger.warning("Watermark image not found")
                return image
            
            watermark = Image.open(watermark_path)
            
            # Resize watermark if needed
            max_size = config.get('max_size', min(image.size) // 4)
            if max(watermark.size) > max_size:
                ratio = max_size / max(watermark.size)
                new_size = (int(watermark.size[0] * ratio), int(watermark.size[1] * ratio))
                watermark = watermark.resize(new_size, Image.Resampling.LANCZOS)
            
            # Apply opacity
            opacity = config.get('opacity', 0.7)
            if watermark.mode != 'RGBA':
                watermark = watermark.convert('RGBA')
            
            # Adjust alpha channel
            alpha = watermark.split()[-1]
            alpha = ImageEnhance.Brightness(alpha).enhance(opacity)
            watermark.putalpha(alpha)
            
            # Calculate position
            position = config.get('position', 'bottom-right')
            margin = config.get('margin', 20)
            
            if position == 'bottom-right':
                x = image.size[0] - watermark.size[0] - margin
                y = image.size[1] - watermark.size[1] - margin
            elif position == 'bottom-left':
                x = margin
                y = image.size[1] - watermark.size[1] - margin
            elif position == 'top-right':
                x = image.size[0] - watermark.size[0] - margin
                y = margin
            elif position == 'top-left':
                x = margin
                y = margin
            elif position == 'center':
                x = (image.size[0] - watermark.size[0]) // 2
                y = (image.size[1] - watermark.size[1]) // 2
            else:
                x, y = margin, image.size[1] - watermark.size[1] - margin
            
            # Paste watermark
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            image.paste(watermark, (x, y), watermark)
            
            return image
            
        except Exception as e:
            logger.error(f"Error adding image watermark: {e}")
            return image
    
    async def _resize_image(
        self, 
        image: Image.Image, 
        resize_config: Dict[str, Any]
    ) -> Image.Image:
        """Resize image"""
        try:
            if 'width' in resize_config and 'height' in resize_config:
                new_size = (resize_config['width'], resize_config['height'])
            elif 'width' in resize_config:
                ratio = resize_config['width'] / image.size[0]
                new_size = (resize_config['width'], int(image.size[1] * ratio))
            elif 'height' in resize_config:
                ratio = resize_config['height'] / image.size[1]
                new_size = (int(image.size[0] * ratio), resize_config['height'])
            else:
                return image
            
            method = resize_config.get('method', 'lanczos')
            
            if method == 'lanczos':
                resampling = Image.Resampling.LANCZOS
            elif method == 'bicubic':
                resampling = Image.Resampling.BICUBIC
            elif method == 'bilinear':
                resampling = Image.Resampling.BILINEAR
            else:
                resampling = Image.Resampling.LANCZOS
            
            return image.resize(new_size, resampling)
            
        except Exception as e:
            logger.error(f"Error resizing image: {e}")
            return image
    
    async def create_thumbnail(
        self, 
        image_data: bytes, 
        size: Tuple[int, int] = (256, 256),
        quality: int = 85
    ) -> bytes:
        """Create thumbnail from image"""
        try:
            if Image is None:
                raise ImportError("PIL is required for thumbnail creation")
            
            image = Image.open(BytesIO(image_data))
            
            # Create thumbnail maintaining aspect ratio
            image.thumbnail(size, Image.Resampling.LANCZOS)
            
            # Convert to RGB if needed for JPEG
            if image.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            
            # Save as JPEG
            output_buffer = BytesIO()
            image.save(output_buffer, format='JPEG', quality=quality, optimize=True)
            
            return output_buffer.getvalue()
            
        except Exception as e:
            logger.error(f"Error creating thumbnail: {e}")
            raise
    
    async def get_image_info(self, image_data: bytes) -> Dict[str, Any]:
        """Get basic image information"""
        try:
            if Image is None:
                raise ImportError("PIL is required for image info")
            
            image = Image.open(BytesIO(image_data))
            
            return {
                'dimensions': image.size,
                'mode': image.mode,
                'format': image.format,
                'size_bytes': len(image_data),
                'has_transparency': image.mode in ('RGBA', 'LA') or 'transparency' in image.info,
                'aspect_ratio': round(image.size[0] / image.size[1], 2) if image.size[1] > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting image info: {e}")
            raise