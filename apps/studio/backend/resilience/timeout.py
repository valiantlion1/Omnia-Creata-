import asyncio
import time
from typing import Any, Callable, Optional, Dict, List
from dataclasses import dataclass
import logging
from contextlib import asynccontextmanager
from functools import wraps

logger = logging.getLogger(__name__)


class TimeoutError(Exception):
    """Custom timeout error with additional context"""
    
    def __init__(self, timeout: float, operation: str = "operation", elapsed: Optional[float] = None):
        self.timeout = timeout
        self.operation = operation
        self.elapsed = elapsed or timeout
        
        message = f"{operation} timed out after {self.elapsed:.2f}s (limit: {timeout}s)"
        super().__init__(message)


@dataclass
class TimeoutConfig:
    """Timeout configuration"""
    default_timeout: float = 30.0
    operation_timeouts: Dict[str, float] = None
    enable_warnings: bool = True
    warning_threshold: float = 0.8  # Warn when 80% of timeout is reached
    
    def __post_init__(self):
        if self.operation_timeouts is None:
            self.operation_timeouts = {}


class TimeoutManager:
    """Manager for handling various timeout scenarios"""
    
    def __init__(self, config: Optional[TimeoutConfig] = None):
        self.config = config or TimeoutConfig()
        self._active_operations: Dict[str, Dict[str, Any]] = {}
        self._stats = {
            'total_operations': 0,
            'timeouts': 0,
            'warnings': 0,
            'average_duration': 0.0,
            'max_duration': 0.0
        }
    
    async def execute_with_timeout(
        self,
        func: Callable,
        timeout: Optional[float] = None,
        operation_name: str = "operation",
        *args,
        **kwargs
    ) -> Any:
        """Execute function with timeout"""
        # Determine timeout value
        effective_timeout = self._get_effective_timeout(operation_name, timeout)
        
        operation_id = f"{operation_name}_{int(time.time() * 1000)}"
        start_time = time.time()
        
        # Track operation
        self._active_operations[operation_id] = {
            'name': operation_name,
            'start_time': start_time,
            'timeout': effective_timeout,
            'function': func.__name__ if hasattr(func, '__name__') else str(func)
        }
        
        try:
            # Set up warning task if enabled
            warning_task = None
            if self.config.enable_warnings:
                warning_delay = effective_timeout * self.config.warning_threshold
                warning_task = asyncio.create_task(
                    self._warn_approaching_timeout(operation_id, warning_delay)
                )
            
            # Execute with timeout
            try:
                result = await asyncio.wait_for(
                    self._execute_function(func, *args, **kwargs),
                    timeout=effective_timeout
                )
                
                # Cancel warning task if still running
                if warning_task and not warning_task.done():
                    warning_task.cancel()
                
                # Record success
                elapsed = time.time() - start_time
                self._record_completion(operation_id, elapsed, success=True)
                
                return result
                
            except asyncio.TimeoutError:
                # Cancel warning task
                if warning_task and not warning_task.done():
                    warning_task.cancel()
                
                elapsed = time.time() - start_time
                self._record_completion(operation_id, elapsed, success=False)
                
                raise TimeoutError(
                    timeout=effective_timeout,
                    operation=operation_name,
                    elapsed=elapsed
                )
        
        finally:
            # Clean up tracking
            self._active_operations.pop(operation_id, None)
    
    async def _execute_function(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function (async or sync)"""
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        else:
            # Run sync function in thread pool
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, lambda: func(*args, **kwargs))
    
    def _get_effective_timeout(self, operation_name: str, explicit_timeout: Optional[float]) -> float:
        """Determine effective timeout for operation"""
        if explicit_timeout is not None:
            return explicit_timeout
        
        return self.config.operation_timeouts.get(operation_name, self.config.default_timeout)
    
    async def _warn_approaching_timeout(self, operation_id: str, delay: float):
        """Warn when operation is approaching timeout"""
        try:
            await asyncio.sleep(delay)
            
            if operation_id in self._active_operations:
                op_info = self._active_operations[operation_id]
                elapsed = time.time() - op_info['start_time']
                remaining = op_info['timeout'] - elapsed
                
                logger.warning(
                    f"Operation '{op_info['name']}' approaching timeout: "
                    f"{elapsed:.2f}s elapsed, {remaining:.2f}s remaining"
                )
                
                self._stats['warnings'] += 1
        
        except asyncio.CancelledError:
            # Operation completed before warning
            pass
    
    def _record_completion(self, operation_id: str, elapsed: float, success: bool):
        """Record operation completion statistics"""
        self._stats['total_operations'] += 1
        
        if not success:
            self._stats['timeouts'] += 1
        
        # Update duration statistics
        total_ops = self._stats['total_operations']
        current_avg = self._stats['average_duration']
        self._stats['average_duration'] = ((current_avg * (total_ops - 1)) + elapsed) / total_ops
        self._stats['max_duration'] = max(self._stats['max_duration'], elapsed)
    
    @asynccontextmanager
    async def timeout_context(
        self,
        timeout: Optional[float] = None,
        operation_name: str = "context_operation"
    ):
        """Context manager for timeout operations"""
        effective_timeout = self._get_effective_timeout(operation_name, timeout)
        start_time = time.time()
        
        try:
            async with asyncio.timeout(effective_timeout):
                yield
            
            # Record success
            elapsed = time.time() - start_time
            self._record_completion(f"{operation_name}_context", elapsed, success=True)
        
        except asyncio.TimeoutError:
            elapsed = time.time() - start_time
            self._record_completion(f"{operation_name}_context", elapsed, success=False)
            
            raise TimeoutError(
                timeout=effective_timeout,
                operation=operation_name,
                elapsed=elapsed
            )
    
    def set_operation_timeout(self, operation_name: str, timeout: float):
        """Set timeout for specific operation type"""
        self.config.operation_timeouts[operation_name] = timeout
        logger.info(f"Set timeout for '{operation_name}' to {timeout}s")
    
    def get_operation_timeout(self, operation_name: str) -> float:
        """Get timeout for specific operation type"""
        return self.config.operation_timeouts.get(operation_name, self.config.default_timeout)
    
    def get_active_operations(self) -> List[Dict[str, Any]]:
        """Get list of currently active operations"""
        current_time = time.time()
        
        active_ops = []
        for op_id, op_info in self._active_operations.items():
            elapsed = current_time - op_info['start_time']
            remaining = op_info['timeout'] - elapsed
            
            active_ops.append({
                'id': op_id,
                'name': op_info['name'],
                'function': op_info['function'],
                'elapsed': elapsed,
                'remaining': remaining,
                'timeout': op_info['timeout'],
                'progress': elapsed / op_info['timeout']
            })
        
        return active_ops
    
    def get_stats(self) -> Dict[str, Any]:
        """Get timeout manager statistics"""
        total_ops = self._stats['total_operations']
        
        return {
            'total_operations': total_ops,
            'timeouts': self._stats['timeouts'],
            'warnings': self._stats['warnings'],
            'timeout_rate': self._stats['timeouts'] / max(total_ops, 1),
            'warning_rate': self._stats['warnings'] / max(total_ops, 1),
            'average_duration': self._stats['average_duration'],
            'max_duration': self._stats['max_duration'],
            'active_operations': len(self._active_operations),
            'operation_timeouts': dict(self.config.operation_timeouts),
            'default_timeout': self.config.default_timeout
        }
    
    def reset_stats(self):
        """Reset statistics"""
        self._stats = {
            'total_operations': 0,
            'timeouts': 0,
            'warnings': 0,
            'average_duration': 0.0,
            'max_duration': 0.0
        }
        logger.info("Reset timeout manager statistics")


# Global timeout manager instance
_global_timeout_manager = TimeoutManager()


def timeout(
    seconds: Optional[float] = None,
    operation_name: Optional[str] = None
):
    """Decorator for applying timeout to functions"""
    def decorator(func):
        op_name = operation_name or f"{func.__module__}.{func.__name__}"
        
        if asyncio.iscoroutinefunction(func):
            @wraps(func)
            async def async_wrapper(*args, **kwargs):
                return await _global_timeout_manager.execute_with_timeout(
                    func, seconds, op_name, *args, **kwargs
                )
            return async_wrapper
        else:
            @wraps(func)
            def sync_wrapper(*args, **kwargs):
                loop = asyncio.get_event_loop()
                return loop.run_until_complete(
                    _global_timeout_manager.execute_with_timeout(
                        func, seconds, op_name, *args, **kwargs
                    )
                )
            return sync_wrapper
    
    return decorator


# Convenience functions

async def with_timeout(
    func: Callable,
    timeout_seconds: float,
    operation_name: str = "operation",
    *args,
    **kwargs
) -> Any:
    """Execute function with timeout"""
    return await _global_timeout_manager.execute_with_timeout(
        func, timeout_seconds, operation_name, *args, **kwargs
    )


def set_default_timeout(seconds: float):
    """Set global default timeout"""
    _global_timeout_manager.config.default_timeout = seconds
    logger.info(f"Set global default timeout to {seconds}s")


def set_operation_timeout(operation_name: str, seconds: float):
    """Set timeout for specific operation type"""
    _global_timeout_manager.set_operation_timeout(operation_name, seconds)


def get_timeout_stats() -> Dict[str, Any]:
    """Get global timeout statistics"""
    return _global_timeout_manager.get_stats()


def get_active_operations() -> List[Dict[str, Any]]:
    """Get currently active operations"""
    return _global_timeout_manager.get_active_operations()


# Common timeout configurations
COMMON_TIMEOUTS = {
    'http_request': 30.0,
    'api_call': 60.0,
    'database_query': 10.0,
    'file_upload': 300.0,
    'image_generation': 120.0,
    'image_processing': 60.0,
    'model_inference': 180.0,
    'health_check': 5.0
}


def setup_common_timeouts():
    """Setup common timeout configurations"""
    for operation, timeout_value in COMMON_TIMEOUTS.items():
        set_operation_timeout(operation, timeout_value)
    
    logger.info("Setup common timeout configurations")