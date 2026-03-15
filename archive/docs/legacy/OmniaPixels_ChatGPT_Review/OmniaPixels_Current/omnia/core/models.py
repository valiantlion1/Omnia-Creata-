from sqlalchemy import Column, Integer, String, DateTime, Text, Float, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
from enum import Enum

Base = declarative_base()

class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class ProcessingType(str, Enum):
    BACKGROUND_REMOVAL = "background_removal"
    CROP = "crop"
    ENHANCE = "enhance"
    STYLE_TRANSFER = "style_transfer"
    SUPER_RESOLUTION = "super_resolution"
    BATCH = "batch"

class Job(Base):
    __tablename__ = "jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)  # For future auth
    status = Column(String, default=JobStatus.PENDING)
    processing_type = Column(String, default=ProcessingType.ENHANCE)
    
    # File references
    input_key = Column(String)  # S3 key for input file
    output_key = Column(String)  # S3 key for output file
    preview_key = Column(String)  # S3 key for preview
    
    # Processing parameters
    parameters = Column(JSON)  # Processing settings
    preset_name = Column(String)  # Used preset if any
    
    # Progress tracking
    progress = Column(Float, default=0.0)  # 0.0 to 1.0
    eta_seconds = Column(Integer)  # Estimated time remaining
    
    # Results and metadata
    result_metadata = Column(JSON)  # Output file info, dimensions etc.
    error = Column(Text)  # Error message if failed
    logs = Column(JSON, default=list)  # Processing logs
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Performance metrics
    processing_time_ms = Column(Integer)
    queue_time_ms = Column(Integer)
    file_size_bytes = Column(Integer)
    
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # Subscription info
    is_premium = Column(Boolean, default=False)
    subscription_expires = Column(DateTime)
    
    # Usage tracking
    monthly_jobs_used = Column(Integer, default=0)
    total_jobs_processed = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    last_login = Column(DateTime)
    
    # Settings
    preferences = Column(JSON, default=dict)
    
class Model(Base):
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    display_name = Column(String)
    description = Column(Text)
    category = Column(String)  # background_removal, enhancement, etc.
    
    # Model metadata
    version = Column(String)
    file_path = Column(String)  # Path to model file
    file_size_mb = Column(Float)
    
    # Performance specs
    gpu_memory_mb = Column(Integer)
    avg_processing_time_ms = Column(Integer)
    supported_formats = Column(JSON)  # ["jpg", "png", "webp"]
    max_resolution = Column(JSON)  # {"width": 4096, "height": 4096}
    
    # Status
    is_active = Column(Boolean, default=True)
    is_premium_only = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
