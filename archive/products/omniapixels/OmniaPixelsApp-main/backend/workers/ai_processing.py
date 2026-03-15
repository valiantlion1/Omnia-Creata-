import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any
import io
from minio.error import S3Error

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import Job, JobEvent, JobStatus
from app.storage import storage_service
from app.config import settings
from app.services.ai_engine import ai_engine  # Import the new AI Engine

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def log_lifecycle_event(message: str):
    """Log worker lifecycle events to proof file"""
    try:
        os.makedirs("proof/backend", exist_ok=True)
        with open("proof/backend/rq_lifecycle.log", "a") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] AI_WORKER: {message}\n")
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


def process_ai(job_data: Dict[str, Any]):
    """Process AI job using AIEngine"""
    job_id = job_data['job_id']
    input_key = job_data['input_key']
    params = job_data.get('params', {})
    task_type = params.get('task_type', 'enhance') # Default to enhance
    
    log_lifecycle_event(f"Starting AI processing job {job_id} ({task_type}) with input {input_key}")
    
    try:
        # Update status to processing
        update_job_status(job_id, JobStatus.PROCESSING, f"Starting AI processing: {task_type}")
        
        # Download from storage
        try:
            input_data, _ = storage_service.get_bytes(input_key)
        except Exception as e:
            msg = f"Input not found or storage error for {input_key}: {e}"
            logger.error(msg)
            log_lifecycle_event(msg)
            update_job_status(job_id, JobStatus.FAILED, "Input missing", error_message=str(e))
            raise

        # Process with AI Engine
        try:
            processed_data, content_type, metadata = ai_engine.process(input_data, task_type, params)
        except Exception as e:
            msg = f"AI Engine error: {e}"
            logger.error(msg)
            log_lifecycle_event(msg)
            update_job_status(job_id, JobStatus.FAILED, "AI Processing Failed", error_message=str(e))
            raise

        # Generate output key
        # Use task type in output filename for clarity
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        output_key = f"processed/{job_id}_{task_type}_{timestamp}.{content_type.split('/')[-1]}"
        
        # Upload to storage
        storage_service.put_bytes(
            output_key,
            processed_data,
            content_type=content_type
        )
        
        processing_method = metadata.get("provider", "unknown")
        model_used = metadata.get("model", "unknown")
        
        log_lifecycle_event(f"AI processing completed for job {job_id} using {processing_method}/{model_used}, output {output_key}")
        
        # Update status to completed
        update_job_status(
            job_id, 
            JobStatus.COMPLETED, 
            f"AI processing completed successfully using {processing_method}",
            output_key=output_key
        )
        
        return {
            'job_id': job_id,
            'status': 'completed',
            'output_key': output_key,
            'metadata': metadata
        }
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"AI processing failed for job {job_id}: {error_msg}")
        log_lifecycle_event(f"ERROR in job {job_id}: {error_msg}")
        
        # Update status to failed
        update_job_status(
            job_id,
            JobStatus.FAILED,
            "AI processing failed",
            error_message=error_msg
        )
        
        raise


if __name__ == "__main__":
    # Test the worker locally (requires local dependencies and storage setup)
    test_job = {
        'job_id': 999,
        'input_key': 'test_ai_image.jpg',
        'params': {'task_type': 'enhance', 'processing_time': 2}
    }
    
    print("Starting worker test...")
    try:
        # Note: This might fail if database/storage is not accessible in this context
        # But it serves as a sanity check for syntax
        # result = process_ai(test_job)
        # print(f"Test result: {result}")
        pass
    except Exception as e:
        print(f"Test failed (expected if DB/S3 not mocked): {e}")
