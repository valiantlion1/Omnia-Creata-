import uuid
import json
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Union, Type
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
import asyncio
from pathlib import Path


class JobType(Enum):
    """Job types"""
    IMAGE_GENERATION = "image_generation"
    IMAGE_PROCESSING = "image_processing"
    IMAGE_UPSCALING = "image_upscaling"
    WATERMARKING = "watermarking"
    THUMBNAIL_GENERATION = "thumbnail_generation"
    METADATA_EXTRACTION = "metadata_extraction"
    STORAGE_UPLOAD = "storage_upload"
    STORAGE_CLEANUP = "storage_cleanup"
    WEBHOOK_DELIVERY = "webhook_delivery"
    EMAIL_NOTIFICATION = "email_notification"
    ANALYTICS_PROCESSING = "analytics_processing"
    CUSTOM = "custom"


class JobStatus(Enum):
    """Job status"""
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"
    TIMEOUT = "timeout"


class JobPriority(Enum):
    """Job priority levels"""
    LOW = 1
    NORMAL = 5
    HIGH = 10
    CRITICAL = 20
    URGENT = 50


@dataclass
class JobContext:
    """Job execution context"""
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    session_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    callback_url: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'JobContext':
        return cls(**data)


@dataclass
class JobData:
    """Base job data structure"""
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    job_type: JobType = JobType.CUSTOM
    priority: JobPriority = JobPriority.NORMAL
    status: JobStatus = JobStatus.PENDING
    
    # Timing
    created_at: Optional[datetime] = None
    queued_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Retry configuration
    max_retries: int = 3
    retry_count: int = 0
    retry_delay: float = 1.0  # seconds
    
    # Timeout configuration
    timeout: Optional[float] = None  # seconds
    
    # Job data
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    error_data: Dict[str, Any] = field(default_factory=dict)
    
    # Context
    context: JobContext = field(default_factory=JobContext)
    
    # Dependencies
    depends_on: List[str] = field(default_factory=list)  # Job IDs
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        data['job_type'] = self.job_type.value
        data['priority'] = self.priority.value
        data['status'] = self.status.value
        data['created_at'] = self.created_at.isoformat() if self.created_at else None
        data['queued_at'] = self.queued_at.isoformat() if self.queued_at else None
        data['started_at'] = self.started_at.isoformat() if self.started_at else None
        data['completed_at'] = self.completed_at.isoformat() if self.completed_at else None
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'JobData':
        # Convert enum values
        if 'job_type' in data:
            data['job_type'] = JobType(data['job_type'])
        if 'priority' in data:
            data['priority'] = JobPriority(data['priority'])
        if 'status' in data:
            data['status'] = JobStatus(data['status'])
        
        # Convert datetime strings
        for field_name in ['created_at', 'queued_at', 'started_at', 'completed_at']:
            if data.get(field_name):
                data[field_name] = datetime.fromisoformat(data[field_name])
        
        # Convert context
        if 'context' in data and isinstance(data['context'], dict):
            data['context'] = JobContext.from_dict(data['context'])
        
        return cls(**data)
    
    def get_duration(self) -> Optional[float]:
        """Get job duration in seconds"""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def get_queue_time(self) -> Optional[float]:
        """Get time spent in queue in seconds"""
        if self.queued_at and self.started_at:
            return (self.started_at - self.queued_at).total_seconds()
        return None
    
    def is_expired(self) -> bool:
        """Check if job has expired"""
        if not self.timeout or not self.started_at:
            return False
        
        elapsed = (datetime.now(timezone.utc) - self.started_at).total_seconds()
        return elapsed > self.timeout
    
    def can_retry(self) -> bool:
        """Check if job can be retried"""
        return self.retry_count < self.max_retries


class BaseJob(ABC):
    """Base job class"""
    
    def __init__(self, data: JobData):
        self.data = data
        self._cancelled = False
    
    @property
    def job_id(self) -> str:
        return self.data.job_id
    
    @property
    def job_type(self) -> JobType:
        return self.data.job_type
    
    @property
    def status(self) -> JobStatus:
        return self.data.status
    
    @property
    def priority(self) -> JobPriority:
        return self.data.priority
    
    def cancel(self):
        """Cancel the job"""
        self._cancelled = True
        self.data.status = JobStatus.CANCELLED
    
    def is_cancelled(self) -> bool:
        """Check if job is cancelled"""
        return self._cancelled or self.data.status == JobStatus.CANCELLED
    
    @abstractmethod
    async def execute(self) -> Dict[str, Any]:
        """Execute the job"""
        pass
    
    @abstractmethod
    def validate_input(self) -> bool:
        """Validate job input data"""
        pass
    
    def get_estimated_duration(self) -> Optional[float]:
        """Get estimated job duration in seconds"""
        return None
    
    def get_resource_requirements(self) -> Dict[str, Any]:
        """Get job resource requirements"""
        return {
            'cpu': 1,
            'memory': '512MB',
            'gpu': False,
            'disk_space': '100MB'
        }
    
    def on_start(self):
        """Called when job starts"""
        self.data.status = JobStatus.PROCESSING
        self.data.started_at = datetime.now(timezone.utc)
    
    def on_complete(self, result: Dict[str, Any]):
        """Called when job completes successfully"""
        self.data.status = JobStatus.COMPLETED
        self.data.completed_at = datetime.now(timezone.utc)
        self.data.output_data = result
    
    def on_error(self, error: Exception):
        """Called when job fails"""
        self.data.status = JobStatus.FAILED
        self.data.completed_at = datetime.now(timezone.utc)
        self.data.error_data = {
            'error_type': type(error).__name__,
            'error_message': str(error),
            'retry_count': self.data.retry_count
        }
    
    def on_retry(self):
        """Called when job is retried"""
        self.data.retry_count += 1
        self.data.status = JobStatus.RETRYING
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary"""
        return {
            'class_name': self.__class__.__name__,
            'data': self.data.to_dict()
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BaseJob':
        """Create job from dictionary"""
        job_data = JobData.from_dict(data['data'])
        return cls(job_data)


class ImageGenerationJob(BaseJob):
    """Job for generating images"""
    
    def __init__(self, data: JobData):
        super().__init__(data)
        self.data.job_type = JobType.IMAGE_GENERATION
    
    def validate_input(self) -> bool:
        """Validate image generation input"""
        required_fields = ['prompt', 'model']
        return all(field in self.data.input_data for field in required_fields)
    
    async def execute(self) -> Dict[str, Any]:
        """Execute image generation"""
        if not self.validate_input():
            raise ValueError("Invalid input data for image generation")
        
        # Extract parameters
        prompt = self.data.input_data['prompt']
        model = self.data.input_data['model']
        width = self.data.input_data.get('width', 512)
        height = self.data.input_data.get('height', 512)
        steps = self.data.input_data.get('steps', 20)
        guidance_scale = self.data.input_data.get('guidance_scale', 7.5)
        
        # Simulate image generation (replace with actual implementation)
        await asyncio.sleep(2)  # Simulate processing time
        
        if self.is_cancelled():
            raise asyncio.CancelledError("Job was cancelled")
        
        # Return result
        return {
            'image_url': f'/generated/{self.job_id}.png',
            'image_path': f'/storage/generated/{self.job_id}.png',
            'metadata': {
                'prompt': prompt,
                'model': model,
                'width': width,
                'height': height,
                'steps': steps,
                'guidance_scale': guidance_scale,
                'generation_time': 2.0
            }
        }
    
    def get_estimated_duration(self) -> Optional[float]:
        """Estimate generation time based on parameters"""
        steps = self.data.input_data.get('steps', 20)
        width = self.data.input_data.get('width', 512)
        height = self.data.input_data.get('height', 512)
        
        # Simple estimation formula
        base_time = 1.0  # Base time in seconds
        step_factor = steps * 0.1
        resolution_factor = (width * height) / (512 * 512)
        
        return base_time + step_factor + resolution_factor
    
    def get_resource_requirements(self) -> Dict[str, Any]:
        """Get resource requirements for image generation"""
        width = self.data.input_data.get('width', 512)
        height = self.data.input_data.get('height', 512)
        
        # Higher resolution requires more resources
        memory_mb = max(1024, (width * height) // 1000)
        
        return {
            'cpu': 2,
            'memory': f'{memory_mb}MB',
            'gpu': True,
            'gpu_memory': '4GB',
            'disk_space': '500MB'
        }


class ImageProcessingJob(BaseJob):
    """Job for processing images"""
    
    def __init__(self, data: JobData):
        super().__init__(data)
        self.data.job_type = JobType.IMAGE_PROCESSING
    
    def validate_input(self) -> bool:
        """Validate image processing input"""
        required_fields = ['image_path', 'operations']
        return all(field in self.data.input_data for field in required_fields)
    
    async def execute(self) -> Dict[str, Any]:
        """Execute image processing"""
        if not self.validate_input():
            raise ValueError("Invalid input data for image processing")
        
        image_path = self.data.input_data['image_path']
        operations = self.data.input_data['operations']
        
        # Simulate processing
        await asyncio.sleep(1)
        
        if self.is_cancelled():
            raise asyncio.CancelledError("Job was cancelled")
        
        # Return result
        return {
            'processed_image_path': f'/storage/processed/{self.job_id}.png',
            'operations_applied': operations,
            'processing_time': 1.0
        }
    
    def get_estimated_duration(self) -> Optional[float]:
        """Estimate processing time"""
        operations = self.data.input_data.get('operations', [])
        return len(operations) * 0.5  # 0.5 seconds per operation


# Job registry for dynamic job creation
JOB_REGISTRY: Dict[JobType, Type[BaseJob]] = {
    JobType.IMAGE_GENERATION: ImageGenerationJob,
    JobType.IMAGE_PROCESSING: ImageProcessingJob,
    # Add more job types as needed
}


def create_job(job_type: JobType, input_data: Dict[str, Any], **kwargs) -> BaseJob:
    """Create a job instance"""
    if job_type not in JOB_REGISTRY:
        raise ValueError(f"Unknown job type: {job_type}")
    
    # Create job data
    job_data = JobData(
        job_type=job_type,
        input_data=input_data,
        **kwargs
    )
    
    # Create job instance
    job_class = JOB_REGISTRY[job_type]
    return job_class(job_data)


def register_job_type(job_type: JobType, job_class: Type[BaseJob]):
    """Register a new job type"""
    JOB_REGISTRY[job_type] = job_class


def get_job_class(job_type: JobType) -> Type[BaseJob]:
    """Get job class for a job type"""
    return JOB_REGISTRY.get(job_type, BaseJob)