from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import time
import redis
from sqlalchemy import text
from ..database import get_db
from ..config import settings
from ..storage import storage_service
from ..schemas import HealthResponse, ReadinessResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Basic health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow()
    )


@router.get("/readiness", response_model=ReadinessResponse)
async def readiness_check(db: Session = Depends(get_db)):
    """Detailed readiness check with dependency status"""
    start_time = time.time()
    
    # Check database
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    
    # Check Redis
    redis_ok = True
    try:
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
    except Exception:
        redis_ok = False
    
    # Check S3/MinIO
    s3_ok = storage_service.check_connection()
    
    latency_ms = (time.time() - start_time) * 1000
    
    return ReadinessResponse(
        db_ok=db_ok,
        redis_ok=redis_ok,
        s3_ok=s3_ok,
        latency_ms=round(latency_ms, 2)
    )
