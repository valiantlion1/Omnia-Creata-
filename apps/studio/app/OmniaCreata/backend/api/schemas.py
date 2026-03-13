from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum
import uuid
from datetime import datetime


class GenerationStatus(str, Enum):
    """Status of image generation request"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class PresetType(str, Enum):
    """Available preset types"""
    REALISTIC = "realistic"
    ANIME = "anime"
    ULTRA = "ultra"
    CUSTOM = "custom"


class AspectRatio(str, Enum):
    """Supported aspect ratios"""
    SQUARE = "1:1"  # 1024x1024
    PORTRAIT = "3:4"  # 768x1024
    LANDSCAPE = "4:3"  # 1024x768
    WIDE = "16:9"  # 1152x648
    ULTRAWIDE = "21:9"  # 1344x576


class UpscaleLevel(str, Enum):
    """Upscale levels"""
    NONE = "none"
    X2 = "2x"
    X4 = "4x"


# Request Models
class GenerateImageRequest(BaseModel):
    """Request model for image generation"""
    prompt: str = Field(..., min_length=1, max_length=2000, description="Image generation prompt")
    negative_prompt: Optional[str] = Field(None, alias="negativePrompt", max_length=1000, description="Negative prompt")
    preset: PresetType = Field(PresetType.REALISTIC, description="Generation preset")
    aspect_ratio: AspectRatio = Field(AspectRatio.SQUARE, description="Image aspect ratio")
    steps: Optional[int] = Field(None, ge=1, le=100, description="Number of generation steps")
    cfg_scale: Optional[float] = Field(None, alias="cfgScale", ge=1.0, le=20.0, description="CFG scale")
    seed: Optional[int] = Field(None, ge=0, le=2**32-1, description="Random seed")
    upscale: UpscaleLevel = Field(UpscaleLevel.NONE, description="Upscale level")
    loras: Optional[List[str]] = Field(None, max_items=5, description="LoRA models to apply")
    enhance_prompt: bool = Field(True, description="Whether to enhance prompt with AI")
    # Optional overrides coming from the frontend (camelCase supported via aliases above)
    width: Optional[int] = Field(None, ge=256, le=2048, description="Override image width")
    height: Optional[int] = Field(None, ge=256, le=2048, description="Override image height")
    sampler: Optional[str] = Field(None, description="Override sampler name")
    model: Optional[str] = Field(None, description="Explicit checkpoint/model selection")

    @validator('prompt')
    def validate_prompt(cls, v):
        if not v.strip():
            raise ValueError('Prompt cannot be empty')
        return v.strip()
    
    @validator('loras')
    def validate_loras(cls, v):
        if v is not None:
            # Remove duplicates and empty strings
            v = list(set(lora.strip() for lora in v if lora.strip()))
        return v

    class Config:
        allow_population_by_field_name = True
        allow_population_by_alias = True
        extra = 'ignore'


class BatchGenerateRequest(BaseModel):
    """Request model for batch image generation"""
    requests: List[GenerateImageRequest] = Field(..., min_items=1, max_items=10)
    batch_id: Optional[str] = Field(None, description="Optional batch identifier")


# Response Models
class ImageMetadata(BaseModel):
    """Image metadata"""
    width: int
    height: int
    steps: int
    cfg_scale: float
    seed: int
    model: str
    sampler: str
    preset: str
    loras: List[str] = []
    generation_time: float
    provider: str


class GeneratedImage(BaseModel):
    """Generated image response"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str = Field(..., description="Image URL")
    thumbnail_url: Optional[str] = Field(None, description="Thumbnail URL")
    metadata: ImageMetadata
    created_at: datetime = Field(default_factory=datetime.utcnow)


class GenerationResponse(BaseModel):
    """Response model for image generation"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: GenerationStatus
    images: List[GeneratedImage] = []
    prompt: str
    enhanced_prompt: Optional[str] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    processing_time: Optional[float] = None


class BatchGenerationResponse(BaseModel):
    """Response model for batch generation"""
    batch_id: str
    total_requests: int
    completed: int
    failed: int
    pending: int
    results: List[GenerationResponse]
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Preset Models
class PresetInfo(BaseModel):
    """Information about a preset"""
    name: str
    type: PresetType
    description: str
    model: str
    default_steps: int
    default_cfg: float
    supported_ratios: List[AspectRatio]
    default_loras: List[str] = []
    enhancement_prompt: Optional[str] = None
    negative_prompt: Optional[str] = None


class PresetsResponse(BaseModel):
    """Response model for available presets"""
    presets: List[PresetInfo]
    total: int


class LoRAInfo(BaseModel):
    """Information about a LoRA model"""
    name: str
    filename: str
    description: Optional[str] = None
    keywords: List[str] = []
    strength: float = 1.0
    compatible_presets: List[PresetType] = []


class LoRAsResponse(BaseModel):
    """Response model for available LoRAs"""
    loras: List[LoRAInfo]
    total: int


# Health Check Models
class ProviderHealth(BaseModel):
    """Health status of a provider"""
    name: str
    status: str  # healthy, degraded, unhealthy
    response_time: Optional[float] = None
    last_check: datetime
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""
    status: str  # healthy, degraded, unhealthy
    version: str
    uptime: float
    providers: List[ProviderHealth]
    cache_stats: Dict[str, Any]
    system_info: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Error Models
class ErrorDetail(BaseModel):
    """Error detail"""
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response model"""
    error: str
    details: List[ErrorDetail] = []
    request_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Queue Models
class QueueStatus(BaseModel):
    """Queue status information"""
    pending: int
    processing: int
    completed_today: int
    failed_today: int
    average_wait_time: float
    estimated_wait_time: float


class QueueResponse(BaseModel):
    """Queue status response"""
    status: QueueStatus
    your_position: Optional[int] = None
    estimated_completion: Optional[datetime] = None


# Usage Models
class UsageStats(BaseModel):
    """Usage statistics"""
    images_generated: int
    credits_used: int
    credits_remaining: int
    daily_limit: int
    monthly_limit: int
    reset_date: datetime


class UsageResponse(BaseModel):
    """Usage statistics response"""
    stats: UsageStats
    history: List[Dict[str, Any]] = []