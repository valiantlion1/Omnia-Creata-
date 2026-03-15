from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, Literal
from datetime import datetime
from .models import JobStatus, JobQueue


# User schemas
class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: int
    is_active: bool
    is_pro: bool
    created_at: datetime
    # Sprint-2: credits and feedback flag
    credits: int | None = None
    feedback_popup_disabled: bool | None = None

    class Config:
        from_attributes = True


class UserMe(User):
    pass


# Token schemas
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


# Job schemas
class JobCreate(BaseModel):
    queue: JobQueue
    input_key: str
    params: Optional[Dict[str, Any]] = None


class Job(BaseModel):
    id: int
    user_id: int
    queue: JobQueue
    status: JobStatus
    input_key: str
    output_key: Optional[str] = None
    params: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Jobs stats schema
class JobStats(BaseModel):
    counts: dict
    average_durations_sec: dict


# Storage schemas
class PresignedUrlRequest(BaseModel):
    path_hint: str
    content_type: str


class PresignedUrlResponse(BaseModel):
    upload_url: str
    download_url: str
    key: str
    expires_in: int


class PresignedDownloadRequest(BaseModel):
    key: str


class PresignedDownloadResponse(BaseModel):
    download_url: str
    expires_in: int


# Health schemas
class HealthResponse(BaseModel):
    status: str
    timestamp: datetime


class ReadinessResponse(BaseModel):
    db_ok: bool
    redis_ok: bool
    s3_ok: bool
    latency_ms: float
