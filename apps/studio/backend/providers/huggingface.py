import base64
import io
from typing import Dict, Any, Optional
from PIL import Image
from .base import (
    BaseProvider, 
    GenerationRequest, 
    GenerationResponse, 
    ProviderHealth, 
    ProviderStatus,
    ProviderError
)


class HuggingFaceProvider(BaseProvider):
    """Hugging Face Inference API provider"""
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get Hugging Face authentication headers"""
        headers = {}
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        return headers
    
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Generate image using Hugging Face Inference API"""
        import time
        start_time = time.time()
        
        # Build the payload
        payload = {
            "inputs": request.prompt,
            "parameters": {
                "negative_prompt": request.negative_prompt or "",
                "num_inference_steps": request.steps,
                "guidance_scale": request.cfg_scale,
                "width": request.width,
                "height": request.height
            }
        }
        
        if request.seed is not None:
            payload["parameters"]["seed"] = request.seed
        
        # Determine model endpoint
        model = request.model or "stabilityai/stable-diffusion-xl-base-1.0"
        url = f"https://api-inference.huggingface.co/models/{model}"
        
        response = await self._make_request(
            "POST",
            url,
            json=payload
        )
        
        if response.status != 200:
            error_text = await response.text()
            raise ProviderError(
                f"HuggingFace API error: {error_text}",
                self.config.name
            )
        
        # Get image data
        image_data = await response.read()
        
        # Convert to base64 for storage/transmission
        image_b64 = base64.b64encode(image_data).decode('utf-8')
        image_url = f"data:image/png;base64,{image_b64}"
        
        # Create thumbnail
        thumbnail_url = self._create_thumbnail(image_data)
        
        generation_time = (time.time() - start_time) * 1000
        
        return GenerationResponse(
            image_url=image_url,
            thumbnail_url=thumbnail_url,
            metadata={
                "prompt": request.prompt,
                "negative_prompt": request.negative_prompt,
                "steps": request.steps,
                "cfg_scale": request.cfg_scale,
                "width": request.width,
                "height": request.height,
                "seed": request.seed,
                "model": model,
                "provider": "huggingface"
            },
            provider=self.config.name,
            generation_time_ms=generation_time,
            cost_estimate=self.config.cost_estimate_per_request
        )
    
    async def health_check(self) -> ProviderHealth:
        """Check Hugging Face API health"""
        try:
            # Use a lightweight model for health check
            test_payload = {
                "inputs": "test",
                "parameters": {
                    "num_inference_steps": 1,
                    "width": 64,
                    "height": 64
                }
            }
            
            response = await self._make_request(
                "POST",
                "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
                json=test_payload
            )
            
            if response.status == 200:
                self.health.status = ProviderStatus.HEALTHY
            elif response.status == 503:
                # Model loading
                self.health.status = ProviderStatus.DEGRADED
                self.health.last_error = "Model is loading"
            else:
                self.health.status = ProviderStatus.DEGRADED
                error_text = await response.text()
                self.health.last_error = f"HTTP {response.status}: {error_text}"
            
            return self.health
            
        except Exception as e:
            self.health.status = ProviderStatus.UNAVAILABLE
            self.health.last_error = str(e)
            return self.health
    
    def _create_thumbnail(self, image_data: bytes) -> str:
        """Create thumbnail from image data"""
        try:
            # Open image
            image = Image.open(io.BytesIO(image_data))
            
            # Create thumbnail (max 256x256)
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            
            # Convert to bytes
            thumb_buffer = io.BytesIO()
            image.save(thumb_buffer, format='PNG', optimize=True)
            thumb_data = thumb_buffer.getvalue()
            
            # Convert to base64
            thumb_b64 = base64.b64encode(thumb_data).decode('utf-8')
            return f"data:image/png;base64,{thumb_b64}"
            
        except Exception:
            # Return None if thumbnail creation fails
            return None
    
    async def get_available_models(self) -> list[str]:
        """Get list of available models"""
        # Common Hugging Face diffusion models
        return [
            "stabilityai/stable-diffusion-xl-base-1.0",
            "stabilityai/stable-diffusion-2-1",
            "runwayml/stable-diffusion-v1-5",
            "stabilityai/stable-diffusion-xl-refiner-1.0",
            "SG161222/RealVisXL_V3.0_Turbo",
            "playgroundai/playground-v2.5-1024px-aesthetic",
            "dataautogpt3/OpenDalleV1.1"
        ]