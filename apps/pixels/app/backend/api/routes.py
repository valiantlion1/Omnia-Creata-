import json
import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from core.database import get_db
from core.models import Job, JobStatus, ProcessingType, User
from core.queue import enqueue_job, get_job_status
from storage.s3 import upload_file, get_presigned_url, get_presigned_put, get_presigned_get
from auth.dependencies import get_current_user, get_current_user_optional
from typing import Optional
import uuid
import logging
from core.config import settings
from models.registry import registry
from datetime import datetime
from typing import Optional

router = APIRouter()

@router.get('/presets')
def get_presets():
    presets_path = os.path.join(os.path.dirname(__file__), '../models/presets.json')
    with open(presets_path, 'r', encoding='utf-8') as f:
        return json.load(f)

@router.get('/models')
def get_models():
    return registry.list_models()

@router.get('/models/{category}')
def get_models_by_category(category: str):
    return registry.get_models_by_category(category)

@router.post('/jobs')
def create_job(
    processing_type: ProcessingType,
    input_key: str,
    preset_name: Optional[str] = None,
    parameters: Optional[dict] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Create job record
    job = Job(
        user_id=str(current_user.id),
        processing_type=processing_type,
        input_key=input_key,
        preset_name=preset_name,
        parameters=parameters or {},
        output_key=make_output_key(str(id), "output.jpg"),
        preview_key=make_preview_key(str(id))
    )
    
    db.add(job)
    db.commit()
    db.refresh(job)
    
    # Update keys with actual job ID
    job.output_key = make_output_key(str(job.id), "output.jpg")
    job.preview_key = make_preview_key(str(job.id))
    db.commit()
    
    # Enqueue for processing
    priority = 'high' if preset_name and 'premium' in preset_name else 'default'
    enqueue_job('workers.process_job', job.id, priority=priority)
    
    return {
        "job_id": job.id,
        "status": job.status,
        "processing_type": job.processing_type,
        "eta_seconds": 10,
        "logs": ["Job created", "Queued for processing"]
    }

@router.get('/jobs/{job_id}')
def get_job(
    job_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == str(current_user.id)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Get preview URL if available
    preview_url = None
    if job.preview_key and job.status == JobStatus.COMPLETED:
        try:
            preview_url = get_presigned_get(job.preview_key, expires=settings.PRESIGN_EXPIRES_SEC)
        except:
            preview_url = None
    
    # Get output URL if completed
    output_url = None
    if job.output_key and job.status == JobStatus.COMPLETED:
        try:
            output_url = get_presigned_get(job.output_key, expires=settings.PRESIGN_EXPIRES_SEC)
        except:
            output_url = None
    
    return {
        "job_id": job.id,
        "status": job.status,
        "processing_type": job.processing_type,
        "progress": job.progress,
        "error": job.error,
        "eta_seconds": job.eta_seconds or 0,
        "logs": job.logs or [],
        "preview_url": preview_url,
        "output_url": output_url,
        "result_metadata": job.result_metadata,
        "created_at": job.created_at,
        "processing_time_ms": job.processing_time_ms
    }

@router.get('/storage/presigned_put')
def presigned_put(filename: str = Query(...)):
    # Validate file extension
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
    file_ext = os.path.splitext(filename.lower())[1]
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file_ext}")
    
    key = make_input_key(filename)
    url = get_presigned_put(key, expires=settings.PRESIGN_EXPIRES_SEC)
    return {"url": url, "key": key, "expires_in": settings.PRESIGN_EXPIRES_SEC}

@router.get('/storage/presigned_get')
def presigned_get(key: str):
    url = get_presigned_get(key, expires=settings.PRESIGN_EXPIRES_SEC)
    return {"url": url, "expires_in": settings.PRESIGN_EXPIRES_SEC}

@router.delete('/jobs/{job_id}')
def cancel_job(
    job_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    job = db.query(Job).filter(Job.id == job_id, Job.user_id == str(current_user.id)).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Job cannot be cancelled")
    
    job.status = JobStatus.CANCELLED
    job.updated_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Job cancelled successfully", "job_id": job_id}

@router.get('/jobs')
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[JobStatus] = None,
    processing_type: Optional[ProcessingType] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Job).filter(Job.user_id == str(current_user.id))
    
    if status:
        query = query.filter(Job.status == status)
    if processing_type:
        query = query.filter(Job.processing_type == processing_type)
    
    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset(skip).limit(limit).all()
    
    return {
        "jobs": [{
            "job_id": job.id,
            "status": job.status,
            "processing_type": job.processing_type,
            "progress": job.progress,
            "created_at": job.created_at,
            "processing_time_ms": job.processing_time_ms
        } for job in jobs],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@router.get('/stats')
def get_stats(db: Session = Depends(get_db)):
    total_jobs = db.query(Job).count()
    completed_jobs = db.query(Job).filter(Job.status == JobStatus.COMPLETED).count()
    failed_jobs = db.query(Job).filter(Job.status == JobStatus.FAILED).count()
    processing_jobs = db.query(Job).filter(Job.status == JobStatus.PROCESSING).count()
    
    return {
        "total_jobs": total_jobs,
        "completed_jobs": completed_jobs,
        "failed_jobs": failed_jobs,
        "processing_jobs": processing_jobs,
        "success_rate": completed_jobs / max(1, total_jobs) * 100
    }

# Utility functions for S3 key generation
def make_input_key(filename: str) -> str:
    """Generate S3 key for input file"""
    unique_id = str(uuid.uuid4())
    return f"inputs/{unique_id}_{filename}"

def make_output_key(job_id: str, filename: str) -> str:
    """Generate S3 key for output file"""
    return f"outputs/{job_id}_{filename}"

def make_preview_key(job_id: str) -> str:
    """Generate S3 key for preview file"""
    return f"previews/{job_id}_preview.jpg"
