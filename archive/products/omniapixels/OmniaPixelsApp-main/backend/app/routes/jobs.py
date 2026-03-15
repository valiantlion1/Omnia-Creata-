from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import User, Job, JobEvent
from ..schemas import JobCreate, Job as JobSchema
from ..auth import get_current_active_user
from ..queue import enqueue_job
import json
from sqlalchemy import func
from ..schemas import JobStats
from ..config import settings

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


@router.post("/", response_model=JobSchema)
async def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Enqueue a new job for processing"""
    # Sprint-2: compute credit cost for image operations
    params = job_data.params or {}
    if job_data.queue.value == "image_processing":
        four_x = bool(params.get("upscale_4x") or params.get("scale") in (4, "4x") or params.get("upscale") in (4, "4x"))
        deblur = bool(params.get("deblur"))
        bg_remove = bool(params.get("bg_remove") or params.get("background_remove") or (params.get("bg") == "remove"))
        cost = (1 if four_x else 0) + (1 if deblur else 0) + (1 if bg_remove else 0)
    else:
        cost = 0

    # Daily refresh safeguard (if user bypassed login refresh)
    try:
        from datetime import datetime as _dt
        today = _dt.utcnow().date().isoformat()
        if getattr(current_user, "credit_refresh_date", None) != today:
            current_user.credits = settings.DAILY_FREE_CREDITS
            current_user.credit_refresh_date = today
    except Exception:
        pass

    # Ensure enough credits
    user_credits = current_user.credits or 0
    if cost > 0 and user_credits < cost:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits")

    # Create job record
    db_job = Job(
        user_id=current_user.id,
        queue=job_data.queue,
        input_key=job_data.input_key,
        params=json.dumps(job_data.params) if job_data.params else None
    )
    db.add(db_job)

    # Deduct credits now; refund on enqueue failure
    if cost > 0:
        current_user.credits = user_credits - cost
        db.add(current_user)

    db.commit()
    db.refresh(db_job)
    
    # Add job event
    event = JobEvent(
        job_id=db_job.id,
        event_type="created",
        message=f"Job created (cost={cost} credits) and queued for processing"
    )
    db.add(event)
    db.commit()
    
    # Enqueue job for processing
    try:
        enqueue_job(db_job.id, job_data.queue.value, job_data.input_key, job_data.params)
    except Exception as e:
        # Refund credits on failure
        if cost > 0:
            current_user.credits = (current_user.credits or 0) + cost
            db.add(current_user)
            db.commit()
        # Update job status to failed if enqueue fails
        db_job.status = "failed"
        db_job.error_message = str(e)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue job: {str(e)}"
        )
    
    return db_job


@router.get("/", response_model=List[JobSchema])
async def list_jobs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all jobs for current user"""
    jobs = db.query(Job).filter(Job.user_id == current_user.id).order_by(Job.created_at.desc()).all()
    return jobs


@router.get("/id/{job_id}", response_model=JobSchema)
async def get_job(
    job_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific job details"""
    job = db.query(Job).filter(
        Job.id == job_id,
        Job.user_id == current_user.id
    ).first()
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    return job


@router.get("/stats", response_model=JobStats)
async def job_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Counts by status for current user
    status_rows = (
        db.query(Job.status, func.count(Job.id))
        .filter(Job.user_id == current_user.id)
        .group_by(Job.status)
        .all()
    )
    all_statuses = ["pending", "processing", "completed", "failed"]
    counts = {s: 0 for s in all_statuses}
    for status_value, count in status_rows:
        # status_value may be enum; convert to string
        s = status_value.value if hasattr(status_value, "value") else str(status_value)
        counts[s] = count

    # Average duration (seconds) for completed jobs
    completed_rows = (
        db.query(Job.created_at, Job.completed_at)
        .filter(Job.user_id == current_user.id, Job.completed_at.isnot(None))
        .all()
    )
    durations = []
    for created_at, completed_at in completed_rows:
        if created_at and completed_at:
            durations.append((completed_at - created_at).total_seconds())
    avg_completed = round(sum(durations) / len(durations), 2) if durations else 0.0

    return JobStats(
        counts=counts,
        average_durations_sec={"completed": avg_completed},
    )
