"""
AI Orchestrator - Central AI processing coordinator
Handles job queue processing and AI module coordination
"""

import logging
import time
import traceback
from typing import Dict, Any, Optional
from pathlib import Path
import tempfile
import os

from core.queue import redis_client, get_job_status
from storage.s3 import s3_client, download_file, upload_file
from core.database import get_db
from core.models import Job, JobStatus
from ai.modules.background_removal import remove_background
from ai.modules.upscaler import upscale_image
from ai.modules.colorizer import colorize_image
from ai.modules.enhancer import enhance_image
from ai.modules.cropper import smart_crop

class AIOrchestrator:
    """Central AI processing orchestrator"""
    
    def __init__(self):
        self.processors = {
            'background_removal': remove_background,
            'upscale': upscale_image,
            'colorize': colorize_image,
            'enhance': enhance_image,
            'crop': smart_crop
        }
        
    def process_job(self, job_id: int) -> Dict[str, Any]:
        """
        Main job processing function
        Called by Redis RQ worker
        """
        start_time = time.time()
        
        try:
            # Get job from database
            db = next(get_db())
            job = db.query(Job).filter(Job.id == job_id).first()
            
            if not job:
                raise Exception(f"Job {job_id} not found")
            
            # Update job status
            job.status = JobStatus.PROCESSING
            job.started_at = time.time()
            db.commit()
            
            logging.info(f"Processing job {job_id}: {job.processing_type}")
            
            # Download input file
            input_path = self._download_input_file(job)
            
            # Process with appropriate AI module
            output_path = self._process_with_ai(job, input_path)
            
            # Upload result to MinIO
            result_url = self._upload_result(job, output_path)
            
            # Update job with success
            job.status = JobStatus.COMPLETED
            job.completed_at = time.time()
            job.processing_time_ms = int((time.time() - start_time) * 1000)
            job.result_metadata = {
                "output_url": result_url,
                "processing_time_ms": job.processing_time_ms,
                "file_size_bytes": os.path.getsize(output_path) if os.path.exists(output_path) else 0
            }
            db.commit()
            
            # Cleanup temp files
            self._cleanup_temp_files([input_path, output_path])
            
            logging.info(f"Job {job_id} completed successfully")
            return {"status": "success", "result_url": result_url}
            
        except Exception as e:
            # Handle errors
            error_msg = str(e)
            logging.error(f"Job {job_id} failed: {error_msg}\n{traceback.format_exc()}")
            
            try:
                job.status = JobStatus.FAILED
                job.error = error_msg
                job.completed_at = time.time()
                db.commit()
            except:
                pass
                
            return {"status": "error", "error": error_msg}
    
    def _download_input_file(self, job: Job) -> str:
        """Download input file from MinIO to temp location"""
        if not s3_client:
            raise Exception("MinIO not available")
            
        temp_dir = tempfile.mkdtemp()
        input_path = os.path.join(temp_dir, "input.jpg")
        
        success = download_file(job.input_key, input_path)
        if not success:
            raise Exception(f"Failed to download input file: {job.input_key}")
            
        return input_path
    
    def _process_with_ai(self, job: Job, input_path: str) -> str:
        """Process file with appropriate AI module"""
        processor = self.processors.get(job.processing_type)
        if not processor:
            raise Exception(f"Unknown processing type: {job.processing_type}")
        
        temp_dir = os.path.dirname(input_path)
        output_path = os.path.join(temp_dir, "output.jpg")
        
        # Call AI processor
        result = processor(
            input_path=input_path,
            output_path=output_path,
            parameters=job.parameters or {}
        )
        
        if not result.get("success", False):
            raise Exception(f"AI processing failed: {result.get('error', 'Unknown error')}")
            
        return output_path
    
    def _upload_result(self, job: Job, output_path: str) -> str:
        """Upload result file to MinIO and return URL"""
        if not s3_client:
            raise Exception("MinIO not available")
            
        success = upload_file(job.output_key, output_path)
        if not success:
            raise Exception(f"Failed to upload result file: {job.output_key}")
        
        # Generate download URL
        from storage.s3 import get_presigned_get
        result_url = get_presigned_get(job.output_key, expires=86400)  # 24 hours
        
        return result_url
    
    def _cleanup_temp_files(self, file_paths: list):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    
                # Remove temp directory if empty
                temp_dir = os.path.dirname(file_path)
                if os.path.exists(temp_dir) and not os.listdir(temp_dir):
                    os.rmdir(temp_dir)
            except Exception as e:
                logging.warning(f"Failed to cleanup {file_path}: {e}")

# Global orchestrator instance
orchestrator = AIOrchestrator()

def process_job_task(job_id: int):
    """
    RQ task function for job processing
    This is the function called by Redis workers
    """
    return orchestrator.process_job(job_id)
