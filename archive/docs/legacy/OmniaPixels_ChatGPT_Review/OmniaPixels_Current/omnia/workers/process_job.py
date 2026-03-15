import os
import time
import logging
from datetime import datetime
from PIL import Image
import cv2
import numpy as np
from sqlalchemy.orm import Session
from core.database import SessionLocal
from core.models import Job, JobStatus
from storage.s3 import download_file, upload_file
from models.registry import registry
import tempfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_job(job_id: int):
    """Main job processing function"""
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        logger.info(f"Processing job {job_id}: {job.processing_type}")
        
        # Update job status
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.utcnow()
        db.commit()
        
        # Process based on type
        success = False
        error_msg = None
        
        try:
            if job.processing_type == "background_removal":
                success = process_background_removal(job, db)
            elif job.processing_type == "crop":
                success = process_crop(job, db)
            elif job.processing_type == "enhance":
                success = process_enhance(job, db)
            elif job.processing_type == "super_resolution":
                success = process_super_resolution(job, db)
            elif job.processing_type == "style_transfer":
                success = process_style_transfer(job, db)
            else:
                error_msg = f"Unknown processing type: {job.processing_type}"
                
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {e}")
            error_msg = str(e)
            success = False
        
        # Update final status
        if success:
            job.status = JobStatus.COMPLETED
            job.progress = 1.0
        else:
            job.status = JobStatus.FAILED
            job.error = error_msg or "Processing failed"
        
        job.completed_at = datetime.utcnow()
        if job.started_at:
            job.processing_time_ms = int((job.completed_at - job.started_at).total_seconds() * 1000)
        
        db.commit()
        logger.info(f"Job {job_id} completed with status: {job.status}")
        
    except Exception as e:
        logger.error(f"Fatal error processing job {job_id}: {e}")
        if 'job' in locals():
            job.status = JobStatus.FAILED
            job.error = f"Fatal error: {str(e)}"
            job.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()

def process_background_removal(job: Job, db: Session) -> bool:
    """Process background removal"""
    try:
        # Download input file
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as input_file:
            if not download_file(job.input_key, input_file.name):
                return False
            
            # Load image
            image = Image.open(input_file.name)
            
            # Simple background removal simulation (replace with actual rembg)
            # For demo purposes, we'll just create a simple mask
            img_array = np.array(image)
            
            # Create alpha channel (simple edge-based mask)
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            mask = cv2.dilate(edges, np.ones((3,3), np.uint8), iterations=1)
            
            # Create RGBA image
            rgba_img = cv2.cvtColor(img_array, cv2.COLOR_RGB2RGBA)
            rgba_img[:, :, 3] = 255 - mask  # Invert mask for alpha
            
            # Save result
            result_image = Image.fromarray(rgba_img, 'RGBA')
            
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as output_file:
                result_image.save(output_file.name, 'PNG')
                
                # Upload result
                if upload_file(job.output_key, output_file.name):
                    # Create preview (smaller version)
                    preview = result_image.copy()
                    preview.thumbnail((512, 512), Image.Resampling.LANCZOS)
                    
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as preview_file:
                        # Convert to RGB for JPEG preview
                        preview_rgb = Image.new('RGB', preview.size, (255, 255, 255))
                        preview_rgb.paste(preview, mask=preview.split()[-1] if preview.mode == 'RGBA' else None)
                        preview_rgb.save(preview_file.name, 'JPEG', quality=85)
                        
                        upload_file(job.preview_key, preview_file.name)
                        os.unlink(preview_file.name)
                    
                    # Update metadata
                    job.result_metadata = {
                        'width': result_image.width,
                        'height': result_image.height,
                        'format': 'PNG',
                        'has_transparency': True
                    }
                    
                    os.unlink(output_file.name)
                    os.unlink(input_file.name)
                    return True
                    
        return False
        
    except Exception as e:
        logger.error(f"Background removal error: {e}")
        return False

def process_crop(job: Job, db: Session) -> bool:
    """Process smart cropping"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as input_file:
            if not download_file(job.input_key, input_file.name):
                return False
            
            image = Image.open(input_file.name)
            
            # Simple center crop (replace with AI-based cropping)
            width, height = image.size
            crop_size = min(width, height)
            left = (width - crop_size) // 2
            top = (height - crop_size) // 2
            right = left + crop_size
            bottom = top + crop_size
            
            cropped = image.crop((left, top, right, bottom))
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as output_file:
                cropped.save(output_file.name, 'JPEG', quality=95)
                
                if upload_file(job.output_key, output_file.name):
                    # Create preview
                    preview = cropped.copy()
                    preview.thumbnail((512, 512), Image.Resampling.LANCZOS)
                    
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as preview_file:
                        preview.save(preview_file.name, 'JPEG', quality=85)
                        upload_file(job.preview_key, preview_file.name)
                        os.unlink(preview_file.name)
                    
                    job.result_metadata = {
                        'width': cropped.width,
                        'height': cropped.height,
                        'format': 'JPEG',
                        'crop_area': [left, top, right, bottom]
                    }
                    
                    os.unlink(output_file.name)
                    os.unlink(input_file.name)
                    return True
                    
        return False
        
    except Exception as e:
        logger.error(f"Crop error: {e}")
        return False

def process_enhance(job: Job, db: Session) -> bool:
    """Process image enhancement"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as input_file:
            if not download_file(job.input_key, input_file.name):
                return False
            
            image = Image.open(input_file.name)
            img_array = np.array(image)
            
            # Simple enhancement (adjust brightness, contrast, saturation)
            enhanced = cv2.convertScaleAbs(img_array, alpha=1.1, beta=10)  # Contrast and brightness
            enhanced = cv2.addWeighted(img_array, 0.7, enhanced, 0.3, 0)  # Blend
            
            result_image = Image.fromarray(enhanced)
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as output_file:
                result_image.save(output_file.name, 'JPEG', quality=95)
                
                if upload_file(job.output_key, output_file.name):
                    # Create preview
                    preview = result_image.copy()
                    preview.thumbnail((512, 512), Image.Resampling.LANCZOS)
                    
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as preview_file:
                        preview.save(preview_file.name, 'JPEG', quality=85)
                        upload_file(job.preview_key, preview_file.name)
                        os.unlink(preview_file.name)
                    
                    job.result_metadata = {
                        'width': result_image.width,
                        'height': result_image.height,
                        'format': 'JPEG',
                        'enhancement_applied': True
                    }
                    
                    os.unlink(output_file.name)
                    os.unlink(input_file.name)
                    return True
                    
        return False
        
    except Exception as e:
        logger.error(f"Enhancement error: {e}")
        return False

def process_super_resolution(job: Job, db: Session) -> bool:
    """Process super resolution upscaling"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as input_file:
            if not download_file(job.input_key, input_file.name):
                return False
            
            image = Image.open(input_file.name)
            
            # Simple 2x upscaling (replace with AI model)
            scale_factor = job.parameters.get('scale', 2)
            new_size = (image.width * scale_factor, image.height * scale_factor)
            upscaled = image.resize(new_size, Image.Resampling.LANCZOS)
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as output_file:
                upscaled.save(output_file.name, 'JPEG', quality=95)
                
                if upload_file(job.output_key, output_file.name):
                    # Create preview
                    preview = upscaled.copy()
                    preview.thumbnail((512, 512), Image.Resampling.LANCZOS)
                    
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as preview_file:
                        preview.save(preview_file.name, 'JPEG', quality=85)
                        upload_file(job.preview_key, preview_file.name)
                        os.unlink(preview_file.name)
                    
                    job.result_metadata = {
                        'width': upscaled.width,
                        'height': upscaled.height,
                        'format': 'JPEG',
                        'scale_factor': scale_factor,
                        'original_size': [image.width, image.height]
                    }
                    
                    os.unlink(output_file.name)
                    os.unlink(input_file.name)
                    return True
                    
        return False
        
    except Exception as e:
        logger.error(f"Super resolution error: {e}")
        return False

def process_style_transfer(job: Job, db: Session) -> bool:
    """Process style transfer"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as input_file:
            if not download_file(job.input_key, input_file.name):
                return False
            
            image = Image.open(input_file.name)
            img_array = np.array(image)
            
            # Simple style effect (sepia tone as example)
            sepia_filter = np.array([
                [0.393, 0.769, 0.189],
                [0.349, 0.686, 0.168],
                [0.272, 0.534, 0.131]
            ])
            
            styled = img_array @ sepia_filter.T
            styled = np.clip(styled, 0, 255).astype(np.uint8)
            
            result_image = Image.fromarray(styled)
            
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as output_file:
                result_image.save(output_file.name, 'JPEG', quality=95)
                
                if upload_file(job.output_key, output_file.name):
                    # Create preview
                    preview = result_image.copy()
                    preview.thumbnail((512, 512), Image.Resampling.LANCZOS)
                    
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as preview_file:
                        preview.save(preview_file.name, 'JPEG', quality=85)
                        upload_file(job.preview_key, preview_file.name)
                        os.unlink(preview_file.name)
                    
                    job.result_metadata = {
                        'width': result_image.width,
                        'height': result_image.height,
                        'format': 'JPEG',
                        'style_applied': job.preset_name or 'sepia'
                    }
                    
                    os.unlink(output_file.name)
                    os.unlink(input_file.name)
                    return True
                    
        return False
        
    except Exception as e:
        logger.error(f"Style transfer error: {e}")
        return False
