from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, status
from fastapi.responses import JSONResponse
from typing import Dict, List, Any, Optional
import asyncio
import logging
import time
from datetime import datetime
import uuid

from .schemas import (
    GenerateImageRequest, GenerationResponse, BatchGenerateRequest, BatchGenerationResponse,
    PresetsResponse, PresetInfo, LoRAsResponse, LoRAInfo, HealthResponse, ErrorResponse,
    QueueResponse, UsageResponse, GenerationStatus, PresetType, AspectRatio
)
from providers.manager import ProviderManager
from presets.resolver import PresetResolver
from presets.assets import AssetResolver
from config.env import get_settings


router = APIRouter(prefix="/v1", tags=["api"])
logger = logging.getLogger(__name__)

# Global instances (will be initialized in main app)
provider_manager: Optional[ProviderManager] = None
preset_resolver: Optional[PresetResolver] = None
asset_resolver: Optional[AssetResolver] = None

# In-memory storage for demo (replace with Redis/DB in production)
generation_cache: Dict[str, GenerationResponse] = {}
batch_cache: Dict[str, BatchGenerationResponse] = {}


def get_provider_manager() -> ProviderManager:
    """Dependency to get provider manager"""
    if provider_manager is None:
        raise HTTPException(status_code=500, detail="Provider manager not initialized")
    return provider_manager


def get_preset_resolver() -> PresetResolver:
    """Dependency to get preset resolver"""
    if preset_resolver is None:
        raise HTTPException(status_code=500, detail="Preset resolver not initialized")
    return preset_resolver


def get_asset_resolver() -> AssetResolver:
    """Dependency to get asset resolver"""
    if asset_resolver is None:
        raise HTTPException(status_code=500, detail="Asset resolver not initialized")
    return asset_resolver


@router.post("/generate", response_model=GenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_image(
    request: GenerateImageRequest,
    background_tasks: BackgroundTasks,
    pm: ProviderManager = Depends(get_provider_manager),
    pr: PresetResolver = Depends(get_preset_resolver)
):
    """Generate a single image"""
    try:
        # Create generation response
        generation_id = str(uuid.uuid4())
        response = GenerationResponse(
            id=generation_id,
            status=GenerationStatus.PENDING,
            prompt=request.prompt
        )
        
        # Store in cache
        generation_cache[generation_id] = response
        
        # Start background generation
        background_tasks.add_task(
            _process_generation,
            generation_id,
            request,
            pm,
            pr
        )
        
        logger.info(f"Started generation {generation_id} for prompt: {request.prompt[:50]}...")
        return response
        
    except Exception as e:
        logger.error(f"Error starting generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate/batch", response_model=BatchGenerationResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_batch(
    request: BatchGenerateRequest,
    background_tasks: BackgroundTasks,
    pm: ProviderManager = Depends(get_provider_manager),
    pr: PresetResolver = Depends(get_preset_resolver)
):
    """Generate multiple images in batch"""
    try:
        batch_id = request.batch_id or str(uuid.uuid4())
        
        # Create batch response
        batch_response = BatchGenerationResponse(
            batch_id=batch_id,
            total_requests=len(request.requests),
            completed=0,
            failed=0,
            pending=len(request.requests),
            results=[]
        )
        
        # Create individual generation responses
        for req in request.requests:
            generation_id = str(uuid.uuid4())
            gen_response = GenerationResponse(
                id=generation_id,
                status=GenerationStatus.PENDING,
                prompt=req.prompt
            )
            
            generation_cache[generation_id] = gen_response
            batch_response.results.append(gen_response)
            
            # Start background generation
            background_tasks.add_task(
                _process_generation,
                generation_id,
                req,
                pm,
                pr,
                batch_id
            )
        
        # Store batch in cache
        batch_cache[batch_id] = batch_response
        
        logger.info(f"Started batch generation {batch_id} with {len(request.requests)} requests")
        return batch_response
        
    except Exception as e:
        logger.error(f"Error starting batch generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/generate/{generation_id}", response_model=GenerationResponse)
async def get_generation_status(generation_id: str):
    """Get status of a generation request"""
    if generation_id not in generation_cache:
        raise HTTPException(status_code=404, detail="Generation not found")
    
    return generation_cache[generation_id]


@router.get("/generate/batch/{batch_id}", response_model=BatchGenerationResponse)
async def get_batch_status(batch_id: str):
    """Get status of a batch generation request"""
    if batch_id not in batch_cache:
        raise HTTPException(status_code=404, detail="Batch not found")
    
    return batch_cache[batch_id]


@router.get("/presets", response_model=PresetsResponse)
async def get_presets(pr: PresetResolver = Depends(get_preset_resolver)):
    """Get available presets"""
    try:
        presets_info = pr.get_available_presets()
        
        presets = []
        for preset_name, preset_data in presets_info.items():
            preset_info = PresetInfo(
                name=preset_name,
                type=PresetType(preset_data.get('type', 'custom')),
                description=preset_data.get('description', ''),
                model=preset_data.get('model', ''),
                default_steps=preset_data.get('steps', 20),
                default_cfg=preset_data.get('cfg_scale', 7.0),
                supported_ratios=[AspectRatio(ratio) for ratio in preset_data.get('supported_ratios', ['1:1'])],
                default_loras=preset_data.get('default_loras', []),
                enhancement_prompt=preset_data.get('enhancement_prompt'),
                negative_prompt=preset_data.get('negative_prompt')
            )
            presets.append(preset_info)
        
        return PresetsResponse(presets=presets, total=len(presets))
        
    except Exception as e:
        logger.error(f"Error getting presets: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets/{preset_name}", response_model=PresetInfo)
async def get_preset(preset_name: str, pr: PresetResolver = Depends(get_preset_resolver)):
    """Get specific preset information"""
    try:
        presets_info = pr.get_available_presets()
        
        if preset_name not in presets_info:
            raise HTTPException(status_code=404, detail="Preset not found")
        
        preset_data = presets_info[preset_name]
        return PresetInfo(
            name=preset_name,
            type=PresetType(preset_data.get('type', 'custom')),
            description=preset_data.get('description', ''),
            model=preset_data.get('model', ''),
            default_steps=preset_data.get('steps', 20),
            default_cfg=preset_data.get('cfg_scale', 7.0),
            supported_ratios=[AspectRatio(ratio) for ratio in preset_data.get('supported_ratios', ['1:1'])],
            default_loras=preset_data.get('default_loras', []),
            enhancement_prompt=preset_data.get('enhancement_prompt'),
            negative_prompt=preset_data.get('negative_prompt')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting preset {preset_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/loras", response_model=LoRAsResponse)
async def get_loras(ar: AssetResolver = Depends(get_asset_resolver)):
    """Get available LoRA models"""
    try:
        lora_assets = ar.list_assets('loras')
        
        loras = []
        for asset in lora_assets:
            lora_info = LoRAInfo(
                name=asset.name,
                filename=asset.name,
                description=f"LoRA model from {asset.source}",
                keywords=[],  # Could be extracted from filename or metadata
                strength=1.0,
                compatible_presets=[PresetType.REALISTIC, PresetType.ANIME, PresetType.ULTRA]
            )
            loras.append(lora_info)
        
        return LoRAsResponse(loras=loras, total=len(loras))
        
    except Exception as e:
        logger.error(f"Error getting LoRAs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/healthz", response_model=HealthResponse)
async def health_check(
    pm: ProviderManager = Depends(get_provider_manager),
    ar: AssetResolver = Depends(get_asset_resolver)
):
    """Health check endpoint"""
    try:
        # Get provider health
        provider_health = await pm.get_health_status()
        
        # Get cache stats
        cache_stats = ar.get_cache_stats()
        
        # Determine overall status
        healthy_providers = sum(1 for p in provider_health if p.get('status') == 'healthy')
        total_providers = len(provider_health)
        
        if healthy_providers == 0:
            overall_status = "unhealthy"
        elif healthy_providers < total_providers:
            overall_status = "degraded"
        else:
            overall_status = "healthy"
        
        # System info
        system_info = {
            "python_version": "3.11+",
            "fastapi_version": "0.104+",
            "total_generations": len(generation_cache),
            "active_batches": len(batch_cache)
        }
        
        return HealthResponse(
            status=overall_status,
            version="1.0.0",
            uptime=time.time(),  # Simplified uptime
            providers=[
                {
                    "name": p.get('name', 'unknown'),
                    "status": p.get('status', 'unknown'),
                    "response_time": p.get('response_time'),
                    "last_check": datetime.utcnow(),
                    "error": p.get('error')
                }
                for p in provider_health
            ],
            cache_stats=cache_stats,
            system_info=system_info
        )
        
    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return HealthResponse(
            status="unhealthy",
            version="1.0.0",
            uptime=0,
            providers=[],
            cache_stats={},
            system_info={"error": str(e)}
        )


@router.get("/queue", response_model=QueueResponse)
async def get_queue_status():
    """Get queue status"""
    try:
        # Calculate queue stats from cache
        pending = sum(1 for g in generation_cache.values() if g.status == GenerationStatus.PENDING)
        processing = sum(1 for g in generation_cache.values() if g.status == GenerationStatus.PROCESSING)
        completed_today = sum(1 for g in generation_cache.values() if g.status == GenerationStatus.COMPLETED)
        failed_today = sum(1 for g in generation_cache.values() if g.status == GenerationStatus.FAILED)
        
        return QueueResponse(
            status={
                "pending": pending,
                "processing": processing,
                "completed_today": completed_today,
                "failed_today": failed_today,
                "average_wait_time": 30.0,  # Estimated
                "estimated_wait_time": pending * 30.0
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting queue status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/usage", response_model=UsageResponse)
async def get_usage_stats():
    """Get usage statistics"""
    try:
        # Mock usage stats (replace with real implementation)
        return UsageResponse(
            stats={
                "images_generated": len(generation_cache),
                "credits_used": len(generation_cache) * 10,
                "credits_remaining": 1000,
                "daily_limit": 100,
                "monthly_limit": 3000,
                "reset_date": datetime.utcnow()
            },
            history=[]
        )
        
    except Exception as e:
        logger.error(f"Error getting usage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Background task functions
async def _process_generation(
    generation_id: str,
    request: GenerateImageRequest,
    pm: ProviderManager,
    pr: PresetResolver,
    batch_id: Optional[str] = None
):
    """Process image generation in background"""
    try:
        # Update status to processing
        if generation_id in generation_cache:
            generation_cache[generation_id].status = GenerationStatus.PROCESSING
        
        start_time = time.time()
        
        # Resolve generation request with preset
        resolved_request = pr.resolve_preset(
            prompt=request.prompt,
            preset_name=request.preset.value if hasattr(request.preset, 'value') else request.preset
        )
        
        # Override with user values
        if request.negative_prompt:
            resolved_request.negative_prompt = request.negative_prompt
        if request.steps:
            resolved_request.steps = request.steps
        if request.cfg_scale:
            resolved_request.cfg_scale = request.cfg_scale
        if request.seed is not None and request.seed != -1:
            resolved_request.seed = request.seed
        if getattr(request, 'model', None):
            resolved_request.model = request.model
            
        # Aspect Ratio overrides
        if request.aspect_ratio:
            ar = request.aspect_ratio.value if hasattr(request.aspect_ratio, 'value') else request.aspect_ratio
            if ar == "1:1":
                resolved_request.width, resolved_request.height = 1024, 1024
            elif ar == "16:9":
                resolved_request.width, resolved_request.height = 1344, 768
            elif ar == "9:16":
                resolved_request.width, resolved_request.height = 768, 1344
            elif ar == "4:3":
                resolved_request.width, resolved_request.height = 1152, 896
            elif ar == "3:4":
                resolved_request.width, resolved_request.height = 896, 1152
                
        # Enhance prompt if requested
        if getattr(request, 'enhance_prompt', False):
            resolved_request.prompt = await pm.enhance_prompt(resolved_request.prompt, request.preset.value)
        
        # Generate image using provider manager
        result = await pm.generate_image(resolved_request)
        
        processing_time = time.time() - start_time
        
        # Update generation response
        if generation_id in generation_cache:
            response = generation_cache[generation_id]
            response.status = GenerationStatus.COMPLETED
            response.enhanced_prompt = resolved_request.prompt if getattr(request, 'enhance_prompt', False) else None
            response.completed_at = datetime.utcnow()
            response.processing_time = processing_time
            
            # Add generated images
            # Generate UUIDs for all returned items
            response.images = []
            
            # Provider might return one image or a list of images depending on implementation
            # Base generation schema only defines single image_url right now, but we'll extract it
            img_url = getattr(result, 'image_url', '/api/placeholder.jpg')
            thumb_url = getattr(result, 'thumbnail_url', None)
            
            response.images.append({
                'id': str(uuid.uuid4()),
                'url': img_url,
                'thumbnail_url': thumb_url,
                'metadata': {
                    'width': resolved_request.width,
                    'height': resolved_request.height,
                    'steps': resolved_request.steps,
                    'cfg_scale': resolved_request.cfg_scale,
                    'seed': resolved_request.seed,
                    'model': resolved_request.model,
                    'sampler': resolved_request.sampler,
                    'preset': request.preset.value if hasattr(request.preset, 'value') else request.preset,
                    'loras': resolved_request.loras,
                    'generation_time': processing_time,
                    'provider': getattr(result, 'provider', 'unknown')
                },
                'created_at': datetime.utcnow()
            })
        
        # Update batch if applicable
        if batch_id and batch_id in batch_cache:
            batch = batch_cache[batch_id]
            batch.completed += 1
            batch.pending -= 1
        
        logger.info(f"Completed generation {generation_id} in {processing_time:.2f}s")
        
    except Exception as e:
        logger.error(f"Error processing generation {generation_id}: {e}")
        
        # Update status to failed
        if generation_id in generation_cache:
            response = generation_cache[generation_id]
            response.status = GenerationStatus.FAILED
            response.error = str(e)
            response.completed_at = datetime.utcnow()
        
        # Update batch if applicable
        if batch_id and batch_id in batch_cache:
            batch = batch_cache[batch_id]
            batch.failed += 1
            batch.pending -= 1


# Initialize function (to be called from main app)
def initialize_dependencies(pm: ProviderManager, pr: PresetResolver, ar: AssetResolver):
    """Initialize global dependencies"""
    global provider_manager, preset_resolver, asset_resolver
    provider_manager = pm
    preset_resolver = pr
    asset_resolver = ar