import asyncio
import random
import time
from typing import Any, Callable, Optional, List, Type, Union
from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging
from functools import wraps

logger = logging.getLogger(__name__)


class RetryExhaustedError(Exception):
    """Raised when all retry attempts are exhausted"""
    
    def __init__(self, attempts: int, last_exception: Exception):
        self.attempts = attempts
        self.last_exception = last_exception
        super().__init__(
            f"Retry exhausted after {attempts} attempts. Last exception: {last_exception}"
        )


class DelayStrategy(ABC):
    """Abstract base class for retry delay strategies"""
    
    @abstractmethod
    def get_delay(self, attempt: int) -> float:
        """Get delay in seconds for the given attempt number (1-based)"""
        pass
    
    @abstractmethod
    def reset(self):
        """Reset strategy state"""
        pass


class FixedDelay(DelayStrategy):
    """Fixed delay between retry attempts"""
    
    def __init__(self, delay: float = 1.0, jitter: bool = False):
        self.delay = delay
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """Get fixed delay with optional jitter"""
        base_delay = self.delay
        
        if self.jitter:
            # Add up to 25% jitter
            jitter_amount = base_delay * 0.25 * random.random()
            return base_delay + jitter_amount
        
        return base_delay
    
    def reset(self):
        """No state to reset for fixed delay"""
        pass


class ExponentialBackoff(DelayStrategy):
    """Exponential backoff delay strategy"""
    
    def __init__(
        self,
        initial_delay: float = 1.0,
        max_delay: float = 60.0,
        multiplier: float = 2.0,
        jitter: bool = True
    ):
        self.initial_delay = initial_delay
        self.max_delay = max_delay
        self.multiplier = multiplier
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """Get exponential backoff delay"""
        # Calculate exponential delay
        delay = self.initial_delay * (self.multiplier ** (attempt - 1))
        
        # Cap at max delay
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            # Add full jitter (0 to delay)
            delay = random.uniform(0, delay)
        
        return delay
    
    def reset(self):
        """No state to reset for exponential backoff"""
        pass


class LinearBackoff(DelayStrategy):
    """Linear backoff delay strategy"""
    
    def __init__(
        self,
        initial_delay: float = 1.0,
        increment: float = 1.0,
        max_delay: float = 30.0,
        jitter: bool = False
    ):
        self.initial_delay = initial_delay
        self.increment = increment
        self.max_delay = max_delay
        self.jitter = jitter
    
    def get_delay(self, attempt: int) -> float:
        """Get linear backoff delay"""
        delay = self.initial_delay + (self.increment * (attempt - 1))
        delay = min(delay, self.max_delay)
        
        if self.jitter:
            # Add up to 25% jitter
            jitter_amount = delay * 0.25 * random.random()
            delay += jitter_amount
        
        return delay
    
    def reset(self):
        """No state to reset for linear backoff"""
        pass


@dataclass
class RetryConfig:
    """Retry policy configuration"""
    max_attempts: int = 3
    delay_strategy: DelayStrategy = None
    retryable_exceptions: List[Type[Exception]] = None
    non_retryable_exceptions: List[Type[Exception]] = None
    timeout_per_attempt: Optional[float] = None
    total_timeout: Optional[float] = None
    
    def __post_init__(self):
        if self.delay_strategy is None:
            self.delay_strategy = ExponentialBackoff()
        
        if self.retryable_exceptions is None:
            self.retryable_exceptions = [Exception]
        
        if self.non_retryable_exceptions is None:
            self.non_retryable_exceptions = []


class RetryPolicy:
    """Retry policy for resilient function execution"""
    
    def __init__(self, config: Optional[RetryConfig] = None):
        self.config = config or RetryConfig()
        self._start_time: Optional[float] = None
    
    async def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with retry policy"""
        self._start_time = time.time()
        self.config.delay_strategy.reset()
        
        last_exception = None
        
        for attempt in range(1, self.config.max_attempts + 1):
            try:
                # Check total timeout
                if self.config.total_timeout:
                    elapsed = time.time() - self._start_time
                    if elapsed >= self.config.total_timeout:
                        raise RetryExhaustedError(
                            attempt - 1,
                            TimeoutError(f"Total timeout of {self.config.total_timeout}s exceeded")
                        )
                
                # Execute function with per-attempt timeout
                if self.config.timeout_per_attempt:
                    result = await asyncio.wait_for(
                        self._execute_function(func, *args, **kwargs),
                        timeout=self.config.timeout_per_attempt
                    )
                else:
                    result = await self._execute_function(func, *args, **kwargs)
                
                # Success!
                if attempt > 1:
                    logger.info(f"Function succeeded on attempt {attempt}")
                
                return result
            
            except Exception as e:
                last_exception = e
                
                # Check if this exception should be retried
                if not self._should_retry(e, attempt):
                    logger.debug(f"Not retrying due to non-retryable exception: {type(e).__name__}")
                    raise e
                
                # Log retry attempt
                logger.warning(
                    f"Attempt {attempt}/{self.config.max_attempts} failed with {type(e).__name__}: {e}"
                )
                
                # Don't delay after the last attempt
                if attempt < self.config.max_attempts:
                    delay = self.config.delay_strategy.get_delay(attempt)
                    
                    # Check if delay would exceed total timeout
                    if self.config.total_timeout:
                        elapsed = time.time() - self._start_time
                        remaining = self.config.total_timeout - elapsed
                        
                        if delay >= remaining:
                            logger.warning(f"Delay would exceed total timeout, stopping retries")
                            break
                    
                    logger.debug(f"Waiting {delay:.2f}s before retry")
                    await asyncio.sleep(delay)
        
        # All attempts exhausted
        raise RetryExhaustedError(self.config.max_attempts, last_exception)
    
    async def _execute_function(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function (async or sync)"""
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: func(*args, **kwargs))
    
    def _should_retry(self, exception: Exception, attempt: int) -> bool:
        """Determine if exception should trigger a retry"""
        # Don't retry if we've reached max attempts
        if attempt >= self.config.max_attempts:
            return False
        
        # Check non-retryable exceptions first
        for non_retryable in self.config.non_retryable_exceptions:
            if isinstance(exception, non_retryable):
                return False
        
        # Check retryable exceptions
        for retryable in self.config.retryable_exceptions:
            if isinstance(exception, retryable):
                return True
        
        return False
    
    def get_stats(self) -> dict:
        """Get retry policy statistics"""
        return {
            'max_attempts': self.config.max_attempts,
            'delay_strategy': type(self.config.delay_strategy).__name__,
            'retryable_exceptions': [e.__name__ for e in self.config.retryable_exceptions],
            'non_retryable_exceptions': [e.__name__ for e in self.config.non_retryable_exceptions],
            'timeout_per_attempt': self.config.timeout_per_attempt,
            'total_timeout': self.config.total_timeout
        }


def retry(
    max_attempts: int = 3,
    delay_strategy: Optional[DelayStrategy] = None,
    retryable_exceptions: Optional[List[Type[Exception]]] = None,
    non_retryable_exceptions: Optional[List[Type[Exception]]] = None,
    timeout_per_attempt: Optional[float] = None,
    total_timeout: Optional[float] = None
):
    """Decorator for applying retry policy to functions"""
    
    config = RetryConfig(
        max_attempts=max_attempts,
        delay_strategy=delay_strategy or ExponentialBackoff(),
        retryable_exceptions=retryable_exceptions,
        non_retryable_exceptions=non_retryable_exceptions,
        timeout_per_attempt=timeout_per_attempt,
        total_timeout=total_timeout
    )
    
    def decorator(func):
        policy = RetryPolicy(config)
        
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await policy.execute(func, *args, **kwargs)
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                loop = asyncio.get_event_loop()
                return loop.run_until_complete(policy.execute(func, *args, **kwargs))
            return sync_wrapper
    
    return decorator


# Convenience functions for common retry patterns

def retry_with_exponential_backoff(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    multiplier: float = 2.0,
    jitter: bool = True
):
    """Retry with exponential backoff"""
    return retry(
        max_attempts=max_attempts,
        delay_strategy=ExponentialBackoff(
            initial_delay=initial_delay,
            max_delay=max_delay,
            multiplier=multiplier,
            jitter=jitter
        )
    )


def retry_with_fixed_delay(
    max_attempts: int = 3,
    delay: float = 1.0,
    jitter: bool = False
):
    """Retry with fixed delay"""
    return retry(
        max_attempts=max_attempts,
        delay_strategy=FixedDelay(delay=delay, jitter=jitter)
    )


def retry_with_linear_backoff(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    increment: float = 1.0,
    max_delay: float = 30.0,
    jitter: bool = False
):
    """Retry with linear backoff"""
    return retry(
        max_attempts=max_attempts,
        delay_strategy=LinearBackoff(
            initial_delay=initial_delay,
            increment=increment,
            max_delay=max_delay,
            jitter=jitter
        )
    )


# Common retry configurations
HTTP_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    delay_strategy=ExponentialBackoff(initial_delay=1.0, max_delay=30.0),
    retryable_exceptions=[ConnectionError, TimeoutError],
    non_retryable_exceptions=[ValueError, TypeError],
    timeout_per_attempt=30.0,
    total_timeout=120.0
)

API_RETRY_CONFIG = RetryConfig(
    max_attempts=5,
    delay_strategy=ExponentialBackoff(initial_delay=0.5, max_delay=16.0),
    retryable_exceptions=[ConnectionError, TimeoutError],
    timeout_per_attempt=10.0,
    total_timeout=60.0
)

DATABASE_RETRY_CONFIG = RetryConfig(
    max_attempts=3,
    delay_strategy=ExponentialBackoff(initial_delay=0.1, max_delay=5.0),
    retryable_exceptions=[ConnectionError],
    timeout_per_attempt=5.0,
    total_timeout=30.0
)