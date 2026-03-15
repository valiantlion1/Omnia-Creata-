from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum


class JobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class JobQueue(str, enum.Enum):
    IMAGE_PROCESSING = "image_processing"
    AI_PROCESSING = "ai_processing"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_pro = Column(Boolean, default=False)
    # Sprint-2: Credit system and feedback flags
    credits = Column(Integer, default=0, nullable=False)
    credit_refresh_date = Column(String, nullable=True)  # ISO date string (YYYY-MM-DD)
    feedback_popup_disabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    jobs = relationship("Job", back_populates="user")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Persist enum .value strings to match existing PostgreSQL ENUM types (jobqueue, jobstatus)
    queue = Column(
        Enum(
            JobQueue,
            name="jobqueue",
            values_callable=lambda e: [i.value for i in e],
        ),
        nullable=False,
    )
    status = Column(
        Enum(
            JobStatus,
            name="jobstatus",
            values_callable=lambda e: [i.value for i in e],
        ),
        default=JobStatus.PENDING.value,
        nullable=False,
    )
    input_key = Column(String, nullable=False)  # S3/MinIO key for input file
    output_key = Column(String, nullable=True)  # S3/MinIO key for output file
    params = Column(Text, nullable=True)  # JSON parameters
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="jobs")
    events = relationship("JobEvent", back_populates="job")


class JobEvent(Base):
    __tablename__ = "job_events"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id"), nullable=False)
    event_type = Column(String, nullable=False)  # started, progress, completed, failed
    message = Column(Text, nullable=True)
    event_metadata = Column(Text, nullable=True)  # JSON metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("Job", back_populates="events")


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    content_type = Column(String, nullable=False)
    size = Column(Integer, nullable=False)
    s3_key = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


# Stub models for future features
class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # free, pro
    price = Column(Integer, default=0)  # cents
    features = Column(Text, nullable=True)  # JSON features
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FeatureFlag(Base):
    __tablename__ = "feature_flags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    enabled = Column(Boolean, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
