from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
import time
import asyncio
import aiohttp
from pydantic import BaseModel


class ProviderType(str, Enum):
    """Provider types for different AI services"""
    COMFYUI = "comfyui"
    HUGGINGFACE = "huggingface"
    POLLINATIONS = "pollinations"
    NATIVE = "native"
    GEMINI = "gemini"
    OPENROUTER = "openrouter"
    OPENAI = "openai"
    STABILITY = "stability"


class ProviderStatus(str, Enum):
    """Provider health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"
    UNKNOWN = "unknown"


@dataclass
class ProviderConfig:
    """Configuration for a provider"""
    name: str
    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit_per_minute: int = 60
    cost_estimate_per_request: float = 0.01
    priority: int = 1  # Lower number = higher priority


@dataclass
class ProviderHealth:
    """Provider health information"""
    status: ProviderStatus
    latency_ms: Optional[float] = None
    error_count: int = 0
    last_success: Optional[float] = None
    last_error: Optional[str] = None
    uptime_percentage: float = 100.0


class GenerationRequest(BaseModel):
    """Standard generation request format"""
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 1024
    height: int = 1024
    steps: int = 20
    cfg_scale: float = 7.0
    sampler: str = "DPM++ 2M Karras"
    seed: Optional[int] = None
    model: Optional[str] = None
    loras: Optional[List[Dict[str, Any]]] = None
    vae: Optional[str] = None
    upscaler: Optional[str] = None


class GenerationResponse(BaseModel):
    """Standard generation response format"""
    image_url: str
    thumbnail_url: Optional[str] = None
    metadata: Dict[str, Any]
    provider: str
    generation_time_ms: float
    cost_estimate: float
    job_id: Optional[str] = None


class ProviderError(Exception):
    """Base exception for provider errors"""
    def __init__(self, message: str, provider: str, error_code: str = "provider_error"):
        self.message = message
        self.provider = provider
        self.error_code = error_code
        super().__init__(f"[{provider}] {message}")


class ProviderTimeoutError(ProviderError):
    """Timeout error from provider"""
    def __init__(self, provider: str, timeout: int):
        super().__init__(f"Request timed out after {timeout}s", provider, "timeout")


class ProviderRateLimitError(ProviderError):
    """Rate limit error from provider"""
    def __init__(self, provider: str, retry_after: Optional[int] = None):
        message = "Rate limit exceeded"
        if retry_after:
            message += f", retry after {retry_after}s"
        super().__init__(message, provider, "rate_limited")


class ProviderUnavailableError(ProviderError):
    """Provider unavailable error"""
    def __init__(self, provider: str, reason: str = "Service unavailable"):
        super().__init__(reason, provider, "provider_unavailable")


class BaseProvider(ABC):
    """Base class for all AI providers"""
    
    def __init__(self, config: ProviderConfig):
        self.config = config
        self.health = ProviderHealth(status=ProviderStatus.UNKNOWN)
        self._session: Optional[aiohttp.ClientSession] = None
        self._last_request_time = 0.0
        self._request_count = 0
        self._error_count = 0
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self._ensure_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def _ensure_session(self):
        """Ensure aiohttp session is created"""
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.config.timeout)
            headers = self._get_default_headers()
            self._session = aiohttp.ClientSession(
                timeout=timeout,
                headers=headers
            )
    
    def _get_default_headers(self) -> Dict[str, str]:
        """Get default headers for requests"""
        headers = {
            "User-Agent": "Omnia-Creata-Studio/1.0",
            "Content-Type": "application/json"
        }
        if self.config.api_key:
            headers.update(self._get_auth_headers())
        return headers
    
    @abstractmethod
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authentication headers for the provider"""
        pass
    
    @abstractmethod
    async def generate(self, request: GenerationRequest) -> GenerationResponse:
        """Generate image using the provider"""
        pass
    
    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """Check provider health"""
        pass
    
    async def _rate_limit_check(self):
        """Check and enforce rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self._last_request_time
        min_interval = 60.0 / self.config.rate_limit_per_minute
        
        if time_since_last < min_interval:
            sleep_time = min_interval - time_since_last
            await asyncio.sleep(sleep_time)
        
        self._last_request_time = time.time()
    
    async def _make_request(
        self, 
        method: str, 
        url: str, 
        **kwargs
    ) -> aiohttp.ClientResponse:
        """Make HTTP request with error handling"""
        await self._ensure_session()
        await self._rate_limit_check()
        
        start_time = time.time()
        
        try:
            async with self._session.request(method, url, **kwargs) as response:
                latency = (time.time() - start_time) * 1000
                self.health.latency_ms = latency
                
                if response.status == 429:
                    retry_after = response.headers.get('Retry-After')
                    retry_after = int(retry_after) if retry_after else None
                    raise ProviderRateLimitError(self.config.name, retry_after)
                
                if response.status >= 500:
                    error_text = await response.text()
                    raise ProviderUnavailableError(
                        self.config.name, 
                        f"Server error: {response.status} - {error_text}"
                    )
                
                if response.status >= 400:
                    error_text = await response.text()
                    raise ProviderError(
                        f"Client error: {response.status} - {error_text}",
                        self.config.name,
                        "invalid_input"
                    )
                
                self._request_count += 1
                self.health.last_success = time.time()
                self.health.status = ProviderStatus.HEALTHY
                
                return response
                
        except asyncio.TimeoutError:
            self._error_count += 1
            self.health.error_count = self._error_count
            self.health.status = ProviderStatus.UNAVAILABLE
            raise ProviderTimeoutError(self.config.name, self.config.timeout)
        
        except Exception as e:
            self._error_count += 1
            self.health.error_count = self._error_count
            self.health.last_error = str(e)
            
            if isinstance(e, (ProviderError, ProviderTimeoutError, ProviderRateLimitError)):
                raise
            
            self.health.status = ProviderStatus.UNAVAILABLE
            raise ProviderError(str(e), self.config.name)
    
    async def close(self):
        """Close the provider session"""
        if self._session and not self._session.closed:
            await self._session.close()
    
    def get_priority(self) -> int:
        """Get provider priority (lower = higher priority)"""
        return self.config.priority
    
    def is_healthy(self) -> bool:
        """Check if provider is healthy"""
        return self.health.status in [ProviderStatus.HEALTHY, ProviderStatus.DEGRADED]