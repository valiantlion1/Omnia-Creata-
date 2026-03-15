import asyncio
import logging
from typing import Any, Callable, List, Optional, Dict, Union, TypeVar, Generic
from dataclasses import dataclass, field
from enum import Enum
import time
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

T = TypeVar('T')


class FallbackStrategy(Enum):
    """Fallback execution strategies"""
    FAIL_FAST = "fail_fast"  # Stop on first failure
    TRY_ALL = "try_all"  # Try all options before failing
    CIRCUIT_BREAKER = "circuit_breaker"  # Use circuit breaker logic
    WEIGHTED = "weighted"  # Use weighted selection
    ROUND_ROBIN = "round_robin"  # Round-robin selection


class FallbackResult(Generic[T]):
    """Result of fallback execution"""
    
    def __init__(
        self,
        success: bool,
        result: Optional[T] = None,
        error: Optional[Exception] = None,
        provider_used: Optional[str] = None,
        attempts: int = 0,
        total_duration: float = 0.0,
        fallback_chain: List[str] = None
    ):
        self.success = success
        self.result = result
        self.error = error
        self.provider_used = provider_used
        self.attempts = attempts
        self.total_duration = total_duration
        self.fallback_chain = fallback_chain or []
    
    def __bool__(self) -> bool:
        return self.success
    
    def unwrap(self) -> T:
        """Get result or raise error"""
        if self.success and self.result is not None:
            return self.result
        raise self.error or RuntimeError("No result available")


@dataclass
class FallbackProvider:
    """Configuration for a fallback provider"""
    name: str
    func: Callable
    weight: float = 1.0
    enabled: bool = True
    max_failures: int = 5
    failure_window: float = 300.0  # 5 minutes
    timeout: Optional[float] = None
    
    # Runtime state
    failures: List[float] = field(default_factory=list)
    last_success: Optional[float] = None
    last_failure: Optional[float] = None
    total_calls: int = 0
    successful_calls: int = 0
    
    def is_healthy(self) -> bool:
        """Check if provider is healthy"""
        if not self.enabled:
            return False
        
        # Clean old failures
        current_time = time.time()
        self.failures = [
            failure_time for failure_time in self.failures
            if current_time - failure_time < self.failure_window
        ]
        
        return len(self.failures) < self.max_failures
    
    def record_success(self):
        """Record successful call"""
        self.last_success = time.time()
        self.total_calls += 1
        self.successful_calls += 1
    
    def record_failure(self):
        """Record failed call"""
        current_time = time.time()
        self.last_failure = current_time
        self.failures.append(current_time)
        self.total_calls += 1
    
    def get_success_rate(self) -> float:
        """Get success rate"""
        if self.total_calls == 0:
            return 1.0
        return self.successful_calls / self.total_calls
    
    def reset_stats(self):
        """Reset statistics"""
        self.failures.clear()
        self.last_success = None
        self.last_failure = None
        self.total_calls = 0
        self.successful_calls = 0


class FallbackSelector(ABC):
    """Abstract base for fallback selection strategies"""
    
    @abstractmethod
    def select_provider(self, providers: List[FallbackProvider]) -> Optional[FallbackProvider]:
        """Select next provider to try"""
        pass
    
    @abstractmethod
    def reset(self):
        """Reset selector state"""
        pass


class WeightedSelector(FallbackSelector):
    """Weighted random selection"""
    
    def select_provider(self, providers: List[FallbackProvider]) -> Optional[FallbackProvider]:
        healthy_providers = [p for p in providers if p.is_healthy()]
        if not healthy_providers:
            return None
        
        # Calculate weights based on success rate and configured weight
        weights = []
        for provider in healthy_providers:
            success_rate = provider.get_success_rate()
            effective_weight = provider.weight * success_rate
            weights.append(effective_weight)
        
        # Simple weighted selection (could use random.choices in production)
        total_weight = sum(weights)
        if total_weight == 0:
            return healthy_providers[0]
        
        # Return provider with highest effective weight for deterministic behavior
        max_weight_idx = weights.index(max(weights))
        return healthy_providers[max_weight_idx]
    
    def reset(self):
        pass


class RoundRobinSelector(FallbackSelector):
    """Round-robin selection"""
    
    def __init__(self):
        self.current_index = 0
    
    def select_provider(self, providers: List[FallbackProvider]) -> Optional[FallbackProvider]:
        healthy_providers = [p for p in providers if p.is_healthy()]
        if not healthy_providers:
            return None
        
        if self.current_index >= len(healthy_providers):
            self.current_index = 0
        
        provider = healthy_providers[self.current_index]
        self.current_index = (self.current_index + 1) % len(healthy_providers)
        return provider
    
    def reset(self):
        self.current_index = 0


class PrioritySelector(FallbackSelector):
    """Priority-based selection (try in order)"""
    
    def select_provider(self, providers: List[FallbackProvider]) -> Optional[FallbackProvider]:
        for provider in providers:
            if provider.is_healthy():
                return provider
        return None
    
    def reset(self):
        pass


@dataclass
class FallbackConfig:
    """Fallback manager configuration"""
    strategy: FallbackStrategy = FallbackStrategy.TRY_ALL
    max_attempts: int = 3
    delay_between_attempts: float = 1.0
    exponential_backoff: bool = True
    max_delay: float = 30.0
    timeout_per_attempt: Optional[float] = None
    enable_stats: bool = True


class FallbackManager:
    """Manager for handling fallback scenarios across multiple providers"""
    
    def __init__(self, config: Optional[FallbackConfig] = None):
        self.config = config or FallbackConfig()
        self.providers: Dict[str, FallbackProvider] = {}
        self.selector = self._create_selector()
        self._stats = {
            'total_executions': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'fallback_used': 0,
            'average_attempts': 0.0,
            'provider_usage': {},
            'error_types': {}
        }
    
    def _create_selector(self) -> FallbackSelector:
        """Create appropriate selector based on strategy"""
        if self.config.strategy == FallbackStrategy.WEIGHTED:
            return WeightedSelector()
        elif self.config.strategy == FallbackStrategy.ROUND_ROBIN:
            return RoundRobinSelector()
        else:
            return PrioritySelector()
    
    def add_provider(
        self,
        name: str,
        func: Callable,
        weight: float = 1.0,
        enabled: bool = True,
        max_failures: int = 5,
        failure_window: float = 300.0,
        timeout: Optional[float] = None
    ) -> 'FallbackManager':
        """Add a fallback provider"""
        provider = FallbackProvider(
            name=name,
            func=func,
            weight=weight,
            enabled=enabled,
            max_failures=max_failures,
            failure_window=failure_window,
            timeout=timeout
        )
        
        self.providers[name] = provider
        
        if self.config.enable_stats:
            self._stats['provider_usage'][name] = {
                'calls': 0,
                'successes': 0,
                'failures': 0
            }
        
        logger.info(f"Added fallback provider: {name}")
        return self
    
    def remove_provider(self, name: str) -> bool:
        """Remove a fallback provider"""
        if name in self.providers:
            del self.providers[name]
            if name in self._stats['provider_usage']:
                del self._stats['provider_usage'][name]
            logger.info(f"Removed fallback provider: {name}")
            return True
        return False
    
    def enable_provider(self, name: str) -> bool:
        """Enable a provider"""
        if name in self.providers:
            self.providers[name].enabled = True
            logger.info(f"Enabled provider: {name}")
            return True
        return False
    
    def disable_provider(self, name: str) -> bool:
        """Disable a provider"""
        if name in self.providers:
            self.providers[name].enabled = False
            logger.info(f"Disabled provider: {name}")
            return True
        return False
    
    async def execute(
        self,
        *args,
        timeout: Optional[float] = None,
        max_attempts: Optional[int] = None,
        **kwargs
    ) -> FallbackResult[Any]:
        """Execute with fallback logic"""
        start_time = time.time()
        effective_max_attempts = max_attempts or self.config.max_attempts
        fallback_chain = []
        last_error = None
        
        self._stats['total_executions'] += 1
        
        for attempt in range(effective_max_attempts):
            # Select provider
            provider = self.selector.select_provider(list(self.providers.values()))
            
            if not provider:
                logger.warning("No healthy providers available")
                break
            
            fallback_chain.append(provider.name)
            
            try:
                # Execute with timeout
                effective_timeout = timeout or provider.timeout or self.config.timeout_per_attempt
                
                if effective_timeout:
                    result = await asyncio.wait_for(
                        self._execute_provider(provider, *args, **kwargs),
                        timeout=effective_timeout
                    )
                else:
                    result = await self._execute_provider(provider, *args, **kwargs)
                
                # Success!
                provider.record_success()
                total_duration = time.time() - start_time
                
                if self.config.enable_stats:
                    self._record_success(provider.name, attempt + 1)
                
                return FallbackResult(
                    success=True,
                    result=result,
                    provider_used=provider.name,
                    attempts=attempt + 1,
                    total_duration=total_duration,
                    fallback_chain=fallback_chain
                )
            
            except Exception as e:
                last_error = e
                provider.record_failure()
                
                if self.config.enable_stats:
                    self._record_failure(provider.name, e)
                
                logger.warning(
                    f"Provider '{provider.name}' failed (attempt {attempt + 1}): {e}"
                )
                
                # Check if we should continue
                if self.config.strategy == FallbackStrategy.FAIL_FAST:
                    break
                
                # Wait before next attempt (except for last attempt)
                if attempt < effective_max_attempts - 1:
                    delay = self._calculate_delay(attempt)
                    if delay > 0:
                        await asyncio.sleep(delay)
        
        # All attempts failed
        total_duration = time.time() - start_time
        
        if self.config.enable_stats:
            self._stats['failed_executions'] += 1
            if len(fallback_chain) > 1:
                self._stats['fallback_used'] += 1
        
        return FallbackResult(
            success=False,
            error=last_error or RuntimeError("All providers failed"),
            attempts=len(fallback_chain),
            total_duration=total_duration,
            fallback_chain=fallback_chain
        )
    
    async def _execute_provider(self, provider: FallbackProvider, *args, **kwargs) -> Any:
        """Execute a specific provider"""
        if asyncio.iscoroutinefunction(provider.func):
            return await provider.func(*args, **kwargs)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: provider.func(*args, **kwargs))
    
    def _calculate_delay(self, attempt: int) -> float:
        """Calculate delay before next attempt"""
        if not self.config.exponential_backoff:
            return self.config.delay_between_attempts
        
        delay = self.config.delay_between_attempts * (2 ** attempt)
        return min(delay, self.config.max_delay)
    
    def _record_success(self, provider_name: str, attempts: int):
        """Record successful execution"""
        self._stats['successful_executions'] += 1
        
        if provider_name in self._stats['provider_usage']:
            self._stats['provider_usage'][provider_name]['calls'] += 1
            self._stats['provider_usage'][provider_name]['successes'] += 1
        
        # Update average attempts
        total_success = self._stats['successful_executions']
        current_avg = self._stats['average_attempts']
        self._stats['average_attempts'] = ((current_avg * (total_success - 1)) + attempts) / total_success
    
    def _record_failure(self, provider_name: str, error: Exception):
        """Record failed execution"""
        if provider_name in self._stats['provider_usage']:
            self._stats['provider_usage'][provider_name]['calls'] += 1
            self._stats['provider_usage'][provider_name]['failures'] += 1
        
        # Track error types
        error_type = type(error).__name__
        if error_type not in self._stats['error_types']:
            self._stats['error_types'][error_type] = 0
        self._stats['error_types'][error_type] += 1
    
    def get_provider_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all providers"""
        status = {}
        
        for name, provider in self.providers.items():
            status[name] = {
                'enabled': provider.enabled,
                'healthy': provider.is_healthy(),
                'weight': provider.weight,
                'total_calls': provider.total_calls,
                'successful_calls': provider.successful_calls,
                'success_rate': provider.get_success_rate(),
                'recent_failures': len(provider.failures),
                'max_failures': provider.max_failures,
                'last_success': provider.last_success,
                'last_failure': provider.last_failure
            }
        
        return status
    
    def get_stats(self) -> Dict[str, Any]:
        """Get fallback manager statistics"""
        total_executions = self._stats['total_executions']
        
        return {
            'total_executions': total_executions,
            'successful_executions': self._stats['successful_executions'],
            'failed_executions': self._stats['failed_executions'],
            'success_rate': self._stats['successful_executions'] / max(total_executions, 1),
            'fallback_usage_rate': self._stats['fallback_used'] / max(total_executions, 1),
            'average_attempts': self._stats['average_attempts'],
            'provider_count': len(self.providers),
            'healthy_providers': len([p for p in self.providers.values() if p.is_healthy()]),
            'provider_usage': dict(self._stats['provider_usage']),
            'error_types': dict(self._stats['error_types']),
            'config': {
                'strategy': self.config.strategy.value,
                'max_attempts': self.config.max_attempts,
                'delay_between_attempts': self.config.delay_between_attempts,
                'exponential_backoff': self.config.exponential_backoff
            }
        }
    
    def reset_stats(self):
        """Reset all statistics"""
        self._stats = {
            'total_executions': 0,
            'successful_executions': 0,
            'failed_executions': 0,
            'fallback_used': 0,
            'average_attempts': 0.0,
            'provider_usage': {name: {'calls': 0, 'successes': 0, 'failures': 0} 
                             for name in self.providers.keys()},
            'error_types': {}
        }
        
        # Reset provider stats
        for provider in self.providers.values():
            provider.reset_stats()
        
        logger.info("Reset fallback manager statistics")
    
    def reset_provider_health(self, provider_name: Optional[str] = None):
        """Reset health status for provider(s)"""
        if provider_name:
            if provider_name in self.providers:
                self.providers[provider_name].failures.clear()
                logger.info(f"Reset health for provider: {provider_name}")
        else:
            for provider in self.providers.values():
                provider.failures.clear()
            logger.info("Reset health for all providers")


# Convenience functions

def create_fallback_manager(
    providers: List[Dict[str, Any]],
    strategy: FallbackStrategy = FallbackStrategy.TRY_ALL,
    max_attempts: int = 3
) -> FallbackManager:
    """Create fallback manager with providers"""
    config = FallbackConfig(strategy=strategy, max_attempts=max_attempts)
    manager = FallbackManager(config)
    
    for provider_config in providers:
        manager.add_provider(**provider_config)
    
    return manager


async def execute_with_fallback(
    providers: List[Callable],
    *args,
    strategy: FallbackStrategy = FallbackStrategy.TRY_ALL,
    max_attempts: int = 3,
    **kwargs
) -> FallbackResult[Any]:
    """Quick fallback execution"""
    manager = FallbackManager(FallbackConfig(strategy=strategy, max_attempts=max_attempts))
    
    for i, provider in enumerate(providers):
        manager.add_provider(f"provider_{i}", provider)
    
    return await manager.execute(*args, **kwargs)