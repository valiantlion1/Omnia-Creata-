import asyncio
import logging
from typing import Dict, List, Optional, Any
from enum import Enum
from .base import (
    BaseProvider, 
    ProviderConfig, 
    ProviderType, 
    ProviderStatus,
    GenerationRequest, 
    GenerationResponse,
    ProviderError,
    ProviderUnavailableError,
    ProviderTimeoutError
)
from .comfyui import ComfyUIProvider
from .huggingface import HuggingFaceProvider
from .pollinations import PollinationsProvider
from .native import NativeProvider
from .gemini import GeminiProvider
from .openrouter import OpenRouterProvider


logger = logging.getLogger(__name__)


class FallbackStrategy(str, Enum):
    """Fallback strategies for provider selection"""
    LOCAL_FIRST = "local_first"  # ComfyUI -> HuggingFace
    CLOUD_FIRST = "cloud_first"  # HuggingFace -> ComfyUI
    PRIORITY_ORDER = "priority_order"  # Use provider priority


class ProviderManager:
    """Manages multiple AI providers with fallback support"""
    
    def __init__(self):
        self.providers: Dict[str, BaseProvider] = {}
        self.configs: Dict[str, ProviderConfig] = {}
        self.fallback_strategy = FallbackStrategy.LOCAL_FIRST
        self._health_check_interval = 60  # seconds
        self._health_check_task: Optional[asyncio.Task] = None
    
    def add_provider(self, config: ProviderConfig) -> None:
        """Add a provider to the manager"""
        provider_class = self._get_provider_class(config.name)
        provider = provider_class(config)
        
        self.providers[config.name] = provider
        self.configs[config.name] = config
        
        logger.info(f"Added provider: {config.name} ({config.base_url})")
    
    def _get_provider_class(self, provider_name: str) -> type:
        """Get provider class based on name"""
        provider_classes = {
            ProviderType.COMFYUI: ComfyUIProvider,
            ProviderType.HUGGINGFACE: HuggingFaceProvider,
            ProviderType.POLLINATIONS: PollinationsProvider,
            ProviderType.NATIVE: NativeProvider,
            ProviderType.GEMINI: GeminiProvider,
            ProviderType.OPENROUTER: OpenRouterProvider
        }
        
        # Try exact match first
        if provider_name in provider_classes:
            return provider_classes[provider_name]
        
        # Try partial match
        for provider_type, provider_class in provider_classes.items():
            if provider_type.value in provider_name.lower():
                return provider_class
        
        raise ValueError(f"Unknown provider type: {provider_name}")
    
    async def start(self) -> None:
        """Start the provider manager"""
        logger.info("Starting provider manager...")
        
        # Initialize all providers
        for name, provider in self.providers.items():
            try:
                await provider.__aenter__()
                logger.info(f"Initialized provider: {name}")
            except Exception as e:
                logger.error(f"Failed to initialize provider {name}: {e}")
        
        # Start health check task
        self._health_check_task = asyncio.create_task(self._health_check_loop())
        
        logger.info("Provider manager started")
    
    async def stop(self) -> None:
        """Stop the provider manager"""
        logger.info("Stopping provider manager...")
        
        # Cancel health check task
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
        
        # Close all providers
        for name, provider in self.providers.items():
            try:
                await provider.close()
                logger.info(f"Closed provider: {name}")
            except Exception as e:
                logger.error(f"Error closing provider {name}: {e}")
        
        logger.info("Provider manager stopped")
    
    async def generate_image(self, request: GenerationRequest) -> GenerationResponse:
        """Generate image with fallback support"""
        providers = self._get_image_providers_by_priority()
        
        last_error = None
        
        for provider_name in providers:
            provider = self.providers.get(provider_name)
            if not provider:
                continue
            # Skip only explicitly UNAVAILABLE providers; allow UNKNOWN (pre-health-check) and HEALTHY/DEGRADED
            if provider.health.status == ProviderStatus.UNAVAILABLE:
                logger.warning(f"Skipping unavailable provider: {provider_name}")
                continue
            
            try:
                logger.info(f"Attempting image generation with provider: {provider_name}")
                response = await provider.generate(request)
                logger.info(f"Successfully generated image with provider: {provider_name}")
                return response
                
            except (ProviderTimeoutError, ProviderUnavailableError) as e:
                logger.warning(f"Provider {provider_name} failed: {e}")
                last_error = e
                # Mark provider as degraded
                provider.health.status = ProviderStatus.DEGRADED
                continue
                
            except ProviderError as e:
                logger.error(f"Provider {provider_name} error: {e}")
                last_error = e
                # Don't continue for client errors
                if e.error_code == "invalid_input":
                    raise
                continue
                
            except Exception as e:
                logger.error(f"Unexpected error with provider {provider_name}: {e}")
                last_error = ProviderError(str(e), provider_name)
                continue
        
        # All providers failed
        if last_error:
            raise last_error
        else:
            raise ProviderUnavailableError("all", "No healthy providers available")
    
    async def enhance_prompt(self, prompt: str, style: str = "realistic") -> str:
        """Enhance prompt with LLM providers (Gemini -> OpenRouter fallback)"""
        llm_providers = ["gemini", "openrouter"]
        
        for provider_name in llm_providers:
            provider = self.providers.get(provider_name)
            if not provider or not provider.is_healthy():
                continue
            
            try:
                if hasattr(provider, 'enhance_prompt'):
                    logger.info(f"Enhancing prompt with provider: {provider_name}")
                    enhanced = await provider.enhance_prompt(prompt, style)
                    logger.info(f"Successfully enhanced prompt with provider: {provider_name}")
                    return enhanced
            except Exception as e:
                logger.warning(f"Prompt enhancement failed with {provider_name}: {e}")
                continue
        
        # Return original prompt if all enhancement fails
        logger.warning("All prompt enhancement providers failed, returning original prompt")
        return prompt
    
    def _get_image_providers_by_priority(self) -> List[str]:
        """Get image generation providers ordered by fallback strategy"""
        image_providers = []
        
        for name, provider in self.providers.items():
            # Only include providers that can generate images
            if name in [ProviderType.COMFYUI, ProviderType.HUGGINGFACE, ProviderType.POLLINATIONS, ProviderType.NATIVE]:
                image_providers.append(name)
        
        if self.fallback_strategy == FallbackStrategy.LOCAL_FIRST:
            # Local first: native + comfyui before cloud providers
            return sorted(image_providers, key=lambda x: (
                0 if x in [ProviderType.COMFYUI, ProviderType.NATIVE] else 1,
                self.configs[x].priority
            ))
        
        elif self.fallback_strategy == FallbackStrategy.CLOUD_FIRST:
            # Cloud providers first, then local
            return sorted(image_providers, key=lambda x: (
                1 if x == ProviderType.COMFYUI else 0,
                self.configs[x].priority
            ))
        
        else:  # PRIORITY_ORDER
            return sorted(image_providers, key=lambda x: self.configs[x].priority)
    
    async def get_health_status(self) -> Dict[str, Any]:
        """Get health status of all providers"""
        status = {}
        
        for name, provider in self.providers.items():
            try:
                health = await provider.health_check()
                status[name] = {
                    "status": health.status.value,
                    "latency_ms": health.latency_ms,
                    "error_count": health.error_count,
                    "last_success": health.last_success,
                    "last_error": health.last_error,
                    "uptime_percentage": health.uptime_percentage,
                    "base_url": self.configs[name].base_url
                }
            except Exception as e:
                status[name] = {
                    "status": "error",
                    "error": str(e),
                    "base_url": self.configs[name].base_url
                }
        
        return status
    
    async def _health_check_loop(self) -> None:
        """Background task for periodic health checks"""
        while True:
            try:
                for name, provider in self.providers.items():
                    try:
                        health = await provider.health_check()
                        provider.health.status = health.status
                    except Exception as e:
                        logger.error(f"Health check failed for {name}: {e}")
                        provider.health.status = ProviderStatus.UNAVAILABLE
                        provider.health.last_error = str(e)
                
                await asyncio.sleep(self._health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(10)
    
    def set_fallback_strategy(self, strategy: FallbackStrategy) -> None:
        """Set the fallback strategy"""
        self.fallback_strategy = strategy
        logger.info(f"Fallback strategy set to: {strategy.value}")
    
    def get_provider_configs(self) -> Dict[str, Dict[str, Any]]:
        """Get configuration for all providers"""
        configs = {}
        for name, config in self.configs.items():
            configs[name] = {
                "name": config.name,
                "base_url": config.base_url,
                "timeout": config.timeout,
                "max_retries": config.max_retries,
                "rate_limit_per_minute": config.rate_limit_per_minute,
                "cost_estimate_per_request": config.cost_estimate_per_request,
                "priority": config.priority
            }
        return configs