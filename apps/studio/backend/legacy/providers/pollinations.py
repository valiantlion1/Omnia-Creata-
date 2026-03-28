import aiohttp
import asyncio
import logging
import base64
import urllib.parse
from typing import Optional, Dict, Any, List

from .base import (
    BaseProvider, 
    ProviderConfig, 
    GenerationRequest, 
    GenerationResponse, 
    ProviderError,
    ProviderHealth,
    ProviderStatus
)

logger = logging.getLogger(__name__)

class PollinationsProvider(BaseProvider):
    """
    Pollinations.ai provider for zero-configuration, free image generation fallback.
    No API key required.
    """
    
    def __init__(self, config: ProviderConfig):
        super().__init__(config)
        self.config.base_url = "https://image.pollinations.ai/prompt/"
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Pollinations does not require authentication."""
        return {}
        
    def _get_default_headers(self) -> Dict[str, str]:
        """Override User-Agent to avoid Cloudflare 530 block."""
        headers = super()._get_default_headers()
        headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        return headers
        
    async def health_check(self) -> ProviderHealth:
        """Check if Pollinations is accessible."""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get("https://image.pollinations.ai/", timeout=5) as response:
                    status = ProviderStatus.HEALTHY if response.status == 200 else ProviderStatus.DEGRADED
                    return ProviderHealth(status=status)
        except Exception as e:
            logger.warning(f"Pollinations health check failed: {e}")
            return ProviderHealth(status=ProviderStatus.UNAVAILABLE, last_error=str(e))

    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Generate an image using Pollinations.ai"""
        health = await self.health_check()
        if health.status == ProviderStatus.UNAVAILABLE:
            raise ProviderError("Pollinations API is currently unavailable", "pollinations")
            
        try:
            encoded_prompt = urllib.parse.quote(request.prompt)
            url = f"{self.config.base_url}{encoded_prompt}"
            
            # Build query parameters
            params: Dict[str, Any] = {
                "width": request.width,
                "height": request.height,
                "nologo": "true"
            }
            
            if request.seed is not None and request.seed != -1:
                params["seed"] = request.seed
                
            async with aiohttp.ClientSession() as session:
                logger.info(f"Generating via Pollinations.ai: {request.prompt[:50]}...")
                async with session.get(url, params=params, timeout=self.config.timeout) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise ProviderError(f"Pollinations API returned {response.status}: {error_text}", "pollinations")
                        
                    image_bytes = await response.read()
                    
                    base64_img = base64.b64encode(image_bytes).decode('utf-8')
                    img_data = f"data:image/jpeg;base64,{base64_img}"
                    
                    logger.info("Successfully generated image via Pollinations.ai")
                    return GenerationResponse(
                        id=request.id or "pollinations-gen",
                        images=[img_data],
                        prompt=request.prompt,
                        provider="pollinations"
                    )
        except asyncio.TimeoutError:
            logger.error("Pollinations generation timed out")
            raise ProviderError("Generation request timed out", "pollinations")
        except Exception as e:
            logger.error(f"Pollinations generation failed: {str(e)}")
            raise ProviderError(f"Pollinations generation failed: {str(e)}", "pollinations")
