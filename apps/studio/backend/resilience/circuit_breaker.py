import asyncio
import time
from typing import Any, Callable, Optional, Dict, List
from enum import Enum
from dataclasses import dataclass
import logging
from collections import deque

logger = logging.getLogger(__name__)


class CircuitBreakerState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, rejecting requests
    HALF_OPEN = "half_open" # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Circuit breaker configuration"""
    failure_threshold: int = 5          # Number of failures to open circuit
    recovery_timeout: float = 60.0      # Seconds to wait before trying half-open
    success_threshold: int = 3          # Successes needed to close from half-open
    timeout: float = 30.0               # Request timeout in seconds
    expected_exception: type = Exception # Exception type that counts as failure
    

class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open"""
    pass


class CircuitBreaker:
    """Circuit breaker implementation for resilient service calls"""
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        
        # State management
        self._state = CircuitBreakerState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = 0.0
        
        # Statistics
        self._total_requests = 0
        self._total_failures = 0
        self._total_successes = 0
        self._total_timeouts = 0
        self._total_circuit_open_rejections = 0
        
        # Recent failures for monitoring
        self._recent_failures: deque = deque(maxlen=100)
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
        
        logger.info(f"Circuit breaker '{name}' initialized with config: {self.config}")
    
    @property
    def state(self) -> CircuitBreakerState:
        """Get current circuit breaker state"""
        return self._state
    
    @property
    def is_closed(self) -> bool:
        """Check if circuit is closed (normal operation)"""
        return self._state == CircuitBreakerState.CLOSED
    
    @property
    def is_open(self) -> bool:
        """Check if circuit is open (failing)"""
        return self._state == CircuitBreakerState.OPEN
    
    @property
    def is_half_open(self) -> bool:
        """Check if circuit is half-open (testing)"""
        return self._state == CircuitBreakerState.HALF_OPEN
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        async with self._lock:
            self._total_requests += 1
            
            # Check if we should allow the request
            if not await self._should_allow_request():
                self._total_circuit_open_rejections += 1
                raise CircuitBreakerError(
                    f"Circuit breaker '{self.name}' is {self._state.value}, rejecting request"
                )
        
        # Execute the function with timeout
        try:
            result = await asyncio.wait_for(
                self._execute_function(func, *args, **kwargs),
                timeout=self.config.timeout
            )
            
            # Record success
            await self._on_success()
            return result
            
        except asyncio.TimeoutError as e:
            await self._on_timeout()
            raise
            
        except self.config.expected_exception as e:
            await self._on_failure(e)
            raise
            
        except Exception as e:
            # Unexpected exceptions don't count as circuit breaker failures
            logger.warning(f"Unexpected exception in circuit breaker '{self.name}': {e}")
            raise
    
    async def _execute_function(self, func: Callable, *args, **kwargs) -> Any:
        """Execute the function (async or sync)"""
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: func(*args, **kwargs))
    
    async def _should_allow_request(self) -> bool:
        """Determine if request should be allowed based on current state"""
        if self._state == CircuitBreakerState.CLOSED:
            return True
        
        if self._state == CircuitBreakerState.OPEN:
            # Check if recovery timeout has passed
            if time.time() - self._last_failure_time >= self.config.recovery_timeout:
                logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN")
                self._state = CircuitBreakerState.HALF_OPEN
                self._success_count = 0
                return True
            return False
        
        if self._state == CircuitBreakerState.HALF_OPEN:
            # Allow limited requests to test service recovery
            return True
        
        return False
    
    async def _on_success(self):
        """Handle successful request"""
        async with self._lock:
            self._total_successes += 1
            
            if self._state == CircuitBreakerState.HALF_OPEN:
                self._success_count += 1
                
                if self._success_count >= self.config.success_threshold:
                    logger.info(f"Circuit breaker '{self.name}' transitioning to CLOSED")
                    self._state = CircuitBreakerState.CLOSED
                    self._failure_count = 0
                    self._success_count = 0
            
            elif self._state == CircuitBreakerState.CLOSED:
                # Reset failure count on success
                self._failure_count = 0
    
    async def _on_failure(self, exception: Exception):
        """Handle failed request"""
        async with self._lock:
            self._total_failures += 1
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            # Record failure details
            self._recent_failures.append({
                'timestamp': self._last_failure_time,
                'exception': str(exception),
                'exception_type': type(exception).__name__
            })
            
            if self._state == CircuitBreakerState.CLOSED:
                if self._failure_count >= self.config.failure_threshold:
                    logger.warning(
                        f"Circuit breaker '{self.name}' transitioning to OPEN after {self._failure_count} failures"
                    )
                    self._state = CircuitBreakerState.OPEN
            
            elif self._state == CircuitBreakerState.HALF_OPEN:
                logger.warning(
                    f"Circuit breaker '{self.name}' transitioning back to OPEN after failure in HALF_OPEN state"
                )
                self._state = CircuitBreakerState.OPEN
                self._success_count = 0
    
    async def _on_timeout(self):
        """Handle request timeout"""
        async with self._lock:
            self._total_timeouts += 1
            
            # Treat timeouts as failures
            timeout_exception = asyncio.TimeoutError(f"Request timeout after {self.config.timeout}s")
            await self._on_failure(timeout_exception)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get circuit breaker statistics"""
        return {
            'name': self.name,
            'state': self._state.value,
            'failure_count': self._failure_count,
            'success_count': self._success_count,
            'total_requests': self._total_requests,
            'total_failures': self._total_failures,
            'total_successes': self._total_successes,
            'total_timeouts': self._total_timeouts,
            'total_circuit_open_rejections': self._total_circuit_open_rejections,
            'failure_rate': self._total_failures / max(self._total_requests, 1),
            'success_rate': self._total_successes / max(self._total_requests, 1),
            'last_failure_time': self._last_failure_time,
            'config': {
                'failure_threshold': self.config.failure_threshold,
                'recovery_timeout': self.config.recovery_timeout,
                'success_threshold': self.config.success_threshold,
                'timeout': self.config.timeout
            },
            'recent_failures': list(self._recent_failures)
        }
    
    async def reset(self):
        """Reset circuit breaker to closed state"""
        async with self._lock:
            logger.info(f"Manually resetting circuit breaker '{self.name}'")
            self._state = CircuitBreakerState.CLOSED
            self._failure_count = 0
            self._success_count = 0
            self._last_failure_time = 0.0
    
    async def force_open(self):
        """Force circuit breaker to open state"""
        async with self._lock:
            logger.warning(f"Manually opening circuit breaker '{self.name}'")
            self._state = CircuitBreakerState.OPEN
            self._last_failure_time = time.time()
    
    def __str__(self) -> str:
        return f"CircuitBreaker(name='{self.name}', state={self._state.value}, failures={self._failure_count})"
    
    def __repr__(self) -> str:
        return self.__str__()


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers"""
    
    def __init__(self):
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = asyncio.Lock()
    
    async def get_or_create(
        self, 
        name: str, 
        config: Optional[CircuitBreakerConfig] = None
    ) -> CircuitBreaker:
        """Get existing circuit breaker or create new one"""
        async with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(name, config)
                logger.info(f"Created new circuit breaker: {name}")
            
            return self._breakers[name]
    
    async def get(self, name: str) -> Optional[CircuitBreaker]:
        """Get circuit breaker by name"""
        return self._breakers.get(name)
    
    async def remove(self, name: str) -> bool:
        """Remove circuit breaker"""
        async with self._lock:
            if name in self._breakers:
                del self._breakers[name]
                logger.info(f"Removed circuit breaker: {name}")
                return True
            return False
    
    def list_breakers(self) -> List[str]:
        """List all circuit breaker names"""
        return list(self._breakers.keys())
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all circuit breakers"""
        return {name: breaker.get_stats() for name, breaker in self._breakers.items()}
    
    async def reset_all(self):
        """Reset all circuit breakers"""
        for breaker in self._breakers.values():
            await breaker.reset()
        logger.info("Reset all circuit breakers")


# Global registry instance
_global_registry = CircuitBreakerRegistry()


async def get_circuit_breaker(
    name: str, 
    config: Optional[CircuitBreakerConfig] = None
) -> CircuitBreaker:
    """Get or create a circuit breaker from global registry"""
    return await _global_registry.get_or_create(name, config)


def circuit_breaker(
    name: Optional[str] = None,
    config: Optional[CircuitBreakerConfig] = None
):
    """Decorator for applying circuit breaker to functions"""
    def decorator(func):
        breaker_name = name or f"{func.__module__}.{func.__name__}"
        
        async def async_wrapper(*args, **kwargs):
            breaker = await get_circuit_breaker(breaker_name, config)
            return await breaker.call(func, *args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            # For sync functions, we need to run in async context
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(async_wrapper(*args, **kwargs))
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator