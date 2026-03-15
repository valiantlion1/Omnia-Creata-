from fastapi import APIRouter
from core.database import SessionLocal
from core.config import settings
from storage.s3 import client as s3_client
from core.queue import redis_conn

router = APIRouter()

@router.get('/health')
def health():
    return {"status": "ok"}

@router.get('/version')
def version():
    return {"version": settings.APP_VERSION, "env": settings.ENV}

@router.get('/ready')
def ready():
    db_ok = True
    s3_ok = True
    redis_ok = True
    try:
        db = SessionLocal()
        db.execute('SELECT 1')
    except Exception:
        db_ok = False
    try:
        s3_client.list_buckets()
    except Exception:
        s3_ok = False
    try:
        redis_conn.ping()
    except Exception:
        redis_ok = False
    return {"db": db_ok, "s3": s3_ok, "redis": redis_ok, "ready": db_ok and s3_ok and redis_ok}
