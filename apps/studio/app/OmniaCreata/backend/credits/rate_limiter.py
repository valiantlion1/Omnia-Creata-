from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
import asyncio
import time
import math

from .models import PlanType


class LimitType(Enum):
    """Types of rate limits"""
    REQUESTS_PER_MINUTE = "requests_per_minute"
    REQUESTS_PER_HOUR = "requests_per_hour"
    REQUESTS_PER_DAY = "requests_per_day"
    CONCURRENT_REQUESTS = "concurrent_requests"
    CREDITS_PER_MINUTE = "credits_per_minute"
    CREDITS_PER_HOUR = "credits_per_hour"
    CREDITS_PER_DAY = "credits_per_day"
    BANDWIDTH_PER_MINUTE = "bandwidth_per_minute"
    BANDWIDTH_PER_HOUR = "bandwidth_per_hour"
    CUSTOM = "custom"


class LimitPeriod(Enum):
    """Rate limit time periods"""
    MINUTE = "minute"
    HOUR = "hour"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class RateLimitResult(Enum):
    """Rate limit check results"""
    ALLOWED = "allowed"
    RATE_LIMITED = "rate_limited"
    QUOTA_EXCEEDED = "quota_exceeded"
    CONCURRENT_LIMIT_EXCEEDED = "concurrent_limit_exceeded"
    SUSPENDED = "suspended"


@dataclass
class RateLimitInfo:
    """Rate limit information"""
    result: RateLimitResult
    limit: int
    current: int
    remaining: int
    reset_time: datetime
    retry_after: Optional[int] = None  # Seconds to wait before retry
    message: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'result': self.result.value,
            'limit': self.limit,
            'current': self.current,
            'remaining': self.remaining,
            'reset_time': self.reset_time.isoformat(),
            'retry_after': self.retry_after,
            'message': self.message
        }


@dataclass
class RateLimitConfig:
    """Rate limiter configuration"""
    # Redis connection
    redis_url: str = "redis://localhost:6379"
    redis_db: int = 3
    redis_prefix: str = "ratelimit:"
    
    # Default limits per plan
    plan_limits: Dict[PlanType, Dict[LimitType, int]] = field(default_factory=lambda: {
        PlanType.FREE: {
            LimitType.REQUESTS_PER_MINUTE: 5,
            LimitType.REQUESTS_PER_HOUR: 50,
            LimitType.REQUESTS_PER_DAY: 200,
            LimitType.CONCURRENT_REQUESTS: 2,
            LimitType.CREDITS_PER_MINUTE: 50,
            LimitType.CREDITS_PER_HOUR: 500,
            LimitType.CREDITS_PER_DAY: 2000
        },
        PlanType.STARTER: {
            LimitType.REQUESTS_PER_MINUTE: 15,
            LimitType.REQUESTS_PER_HOUR: 200,
            LimitType.REQUESTS_PER_DAY: 2000,
            LimitType.CONCURRENT_REQUESTS: 5,
            LimitType.CREDITS_PER_MINUTE: 150,
            LimitType.CREDITS_PER_HOUR: 1500,
            LimitType.CREDITS_PER_DAY: 15000
        },
        PlanType.PRO: {
            LimitType.REQUESTS_PER_MINUTE: 30,
            LimitType.REQUESTS_PER_HOUR: 500,
            LimitType.REQUESTS_PER_DAY: 10000,
            LimitType.CONCURRENT_REQUESTS: 10,
            LimitType.CREDITS_PER_MINUTE: 300,
            LimitType.CREDITS_PER_HOUR: 3000,
            LimitType.CREDITS_PER_DAY: 50000
        },
        PlanType.ENTERPRISE: {
            LimitType.REQUESTS_PER_MINUTE: 100,
            LimitType.REQUESTS_PER_HOUR: 2000,
            LimitType.REQUESTS_PER_DAY: 50000,
            LimitType.CONCURRENT_REQUESTS: 25,
            LimitType.CREDITS_PER_MINUTE: 1000,
            LimitType.CREDITS_PER_HOUR: 10000,
            LimitType.CREDITS_PER_DAY: 200000
        }
    })
    
    # Sliding window settings
    window_size: int = 60  # seconds
    precision: int = 10    # number of sub-windows
    
    # Burst allowance
    burst_multiplier: float = 1.5  # Allow 50% burst above normal rate
    burst_duration: int = 30       # seconds
    
    # Backoff settings
    enable_exponential_backoff: bool = True
    base_backoff: int = 1          # seconds
    max_backoff: int = 300         # seconds
    backoff_multiplier: float = 2.0
    
    # Monitoring
    enable_monitoring: bool = True
    alert_threshold: float = 0.8   # Alert when 80% of limit is reached
    
    @classmethod
    def from_env(cls) -> 'RateLimitConfig':
        """Create config from environment variables"""
        import os
        
        return cls(
            redis_url=os.getenv('RATELIMIT_REDIS_URL', 'redis://localhost:6379'),
            redis_db=int(os.getenv('RATELIMIT_REDIS_DB', '3')),
            redis_prefix=os.getenv('RATELIMIT_REDIS_PREFIX', 'ratelimit:'),
            window_size=int(os.getenv('RATELIMIT_WINDOW_SIZE', '60')),
            precision=int(os.getenv('RATELIMIT_PRECISION', '10')),
            burst_multiplier=float(os.getenv('RATELIMIT_BURST_MULTIPLIER', '1.5')),
            burst_duration=int(os.getenv('RATELIMIT_BURST_DURATION', '30')),
            enable_exponential_backoff=os.getenv('RATELIMIT_EXPONENTIAL_BACKOFF', 'true').lower() == 'true',
            base_backoff=int(os.getenv('RATELIMIT_BASE_BACKOFF', '1')),
            max_backoff=int(os.getenv('RATELIMIT_MAX_BACKOFF', '300')),
            backoff_multiplier=float(os.getenv('RATELIMIT_BACKOFF_MULTIPLIER', '2.0')),
            enable_monitoring=os.getenv('RATELIMIT_MONITORING', 'true').lower() == 'true',
            alert_threshold=float(os.getenv('RATELIMIT_ALERT_THRESHOLD', '0.8'))
        )


class RateLimiter:
    """Advanced rate limiter with sliding window and burst support"""
    
    def __init__(self, config: RateLimitConfig, redis_client=None):
        self.config = config
        self.redis = redis_client
        
        # Concurrent request tracking
        self._concurrent_requests: Dict[str, int] = {}
        self._concurrent_lock = asyncio.Lock()
        
        # Backoff tracking
        self._backoff_counts: Dict[str, int] = {}
    
    async def initialize(self):
        """Initialize the rate limiter"""
        if self.redis is None:
            import redis.asyncio as redis
            self.redis = redis.from_url(
                self.config.redis_url,
                db=self.config.redis_db,
                decode_responses=True
            )
    
    async def check_rate_limit(self, user_id: str, plan_type: PlanType, 
                              limit_type: LimitType, amount: int = 1) -> RateLimitInfo:
        """Check if request is within rate limits"""
        # Get limit for user's plan
        limit = self._get_limit(plan_type, limit_type)
        if limit <= 0:
            return RateLimitInfo(
                result=RateLimitResult.ALLOWED,
                limit=0,
                current=0,
                remaining=0,
                reset_time=datetime.now(timezone.utc),
                message="No limit configured"
            )
        
        # Handle concurrent requests separately
        if limit_type == LimitType.CONCURRENT_REQUESTS:
            return await self._check_concurrent_limit(user_id, limit, amount)
        
        # Use sliding window for other limits
        return await self._check_sliding_window_limit(user_id, limit_type, limit, amount)
    
    def _get_limit(self, plan_type: PlanType, limit_type: LimitType) -> int:
        """Get rate limit for plan and limit type"""
        return self.config.plan_limits.get(plan_type, {}).get(limit_type, 0)
    
    async def _check_concurrent_limit(self, user_id: str, limit: int, amount: int) -> RateLimitInfo:
        """Check concurrent request limit"""
        async with self._concurrent_lock:
            current = self._concurrent_requests.get(user_id, 0)
            
            if current + amount > limit:
                return RateLimitInfo(
                    result=RateLimitResult.CONCURRENT_LIMIT_EXCEEDED,
                    limit=limit,
                    current=current,
                    remaining=max(0, limit - current),
                    reset_time=datetime.now(timezone.utc),
                    retry_after=self._calculate_backoff(user_id),
                    message=f"Concurrent request limit exceeded: {current + amount}/{limit}"
                )
            
            return RateLimitInfo(
                result=RateLimitResult.ALLOWED,
                limit=limit,
                current=current,
                remaining=limit - current - amount,
                reset_time=datetime.now(timezone.utc),
                message="Within concurrent limit"
            )
    
    async def _check_sliding_window_limit(self, user_id: str, limit_type: LimitType, 
                                         limit: int, amount: int) -> RateLimitInfo:
        """Check rate limit using sliding window algorithm"""
        now = time.time()
        window_size = self._get_window_size(limit_type)
        
        # Redis key for this user and limit type
        key = f"{self.config.redis_prefix}{user_id}:{limit_type.value}"
        
        # Use Redis pipeline for atomic operations
        pipe = self.redis.pipeline()
        
        # Remove old entries outside the window
        pipe.zremrangebyscore(key, 0, now - window_size)
        
        # Count current requests in window
        pipe.zcard(key)
        
        # Execute pipeline
        results = await pipe.execute()
        current_count = results[1]
        
        # Check if adding this request would exceed the limit
        if current_count + amount > limit:
            # Check for burst allowance
            burst_limit = int(limit * self.config.burst_multiplier)
            if current_count + amount <= burst_limit:
                # Allow burst but track it
                await self._track_burst_usage(user_id, limit_type)
            else:
                # Calculate when the limit will reset
                reset_time = await self._calculate_reset_time(key, window_size)
                
                return RateLimitInfo(
                    result=RateLimitResult.RATE_LIMITED,
                    limit=limit,
                    current=current_count,
                    remaining=max(0, limit - current_count),
                    reset_time=reset_time,
                    retry_after=self._calculate_backoff(user_id),
                    message=f"Rate limit exceeded: {current_count + amount}/{limit}"
                )
        
        # Add current request(s) to the window
        for i in range(amount):
            await self.redis.zadd(key, {f"{now}:{i}": now})
        
        # Set expiration for cleanup
        await self.redis.expire(key, int(window_size) + 60)
        
        # Reset backoff count on successful request
        if user_id in self._backoff_counts:
            del self._backoff_counts[user_id]
        
        return RateLimitInfo(
            result=RateLimitResult.ALLOWED,
            limit=limit,
            current=current_count + amount,
            remaining=max(0, limit - current_count - amount),
            reset_time=datetime.fromtimestamp(now + window_size, timezone.utc),
            message="Within rate limit"
        )
    
    def _get_window_size(self, limit_type: LimitType) -> int:
        """Get window size in seconds for limit type"""
        window_sizes = {
            LimitType.REQUESTS_PER_MINUTE: 60,
            LimitType.REQUESTS_PER_HOUR: 3600,
            LimitType.REQUESTS_PER_DAY: 86400,
            LimitType.CREDITS_PER_MINUTE: 60,
            LimitType.CREDITS_PER_HOUR: 3600,
            LimitType.CREDITS_PER_DAY: 86400,
            LimitType.BANDWIDTH_PER_MINUTE: 60,
            LimitType.BANDWIDTH_PER_HOUR: 3600
        }
        return window_sizes.get(limit_type, self.config.window_size)
    
    async def _calculate_reset_time(self, key: str, window_size: int) -> datetime:
        """Calculate when the rate limit will reset"""
        # Get the oldest entry in the window
        oldest_entries = await self.redis.zrange(key, 0, 0, withscores=True)
        
        if oldest_entries:
            oldest_time = oldest_entries[0][1]
            reset_timestamp = oldest_time + window_size
        else:
            reset_timestamp = time.time() + window_size
        
        return datetime.fromtimestamp(reset_timestamp, timezone.utc)
    
    def _calculate_backoff(self, user_id: str) -> int:
        """Calculate exponential backoff time"""
        if not self.config.enable_exponential_backoff:
            return self.config.base_backoff
        
        backoff_count = self._backoff_counts.get(user_id, 0)
        self._backoff_counts[user_id] = backoff_count + 1
        
        backoff_time = min(
            self.config.base_backoff * (self.config.backoff_multiplier ** backoff_count),
            self.config.max_backoff
        )
        
        return int(backoff_time)
    
    async def _track_burst_usage(self, user_id: str, limit_type: LimitType):
        """Track burst usage for monitoring"""
        if not self.config.enable_monitoring:
            return
        
        burst_key = f"{self.config.redis_prefix}burst:{user_id}:{limit_type.value}"
        await self.redis.incr(burst_key)
        await self.redis.expire(burst_key, self.config.burst_duration)
    
    async def acquire_concurrent_slot(self, user_id: str, plan_type: PlanType) -> bool:
        """Acquire a concurrent request slot"""
        limit_info = await self.check_rate_limit(
            user_id, plan_type, LimitType.CONCURRENT_REQUESTS, 1
        )
        
        if limit_info.result == RateLimitResult.ALLOWED:
            async with self._concurrent_lock:
                self._concurrent_requests[user_id] = self._concurrent_requests.get(user_id, 0) + 1
            return True
        
        return False
    
    async def release_concurrent_slot(self, user_id: str):
        """Release a concurrent request slot"""
        async with self._concurrent_lock:
            if user_id in self._concurrent_requests:
                self._concurrent_requests[user_id] = max(0, self._concurrent_requests[user_id] - 1)
                if self._concurrent_requests[user_id] == 0:
                    del self._concurrent_requests[user_id]
    
    async def get_current_usage(self, user_id: str, limit_type: LimitType) -> Dict[str, Any]:
        """Get current usage for a user and limit type"""
        if limit_type == LimitType.CONCURRENT_REQUESTS:
            current = self._concurrent_requests.get(user_id, 0)
            return {
                'current': current,
                'window_start': datetime.now(timezone.utc).isoformat(),
                'window_end': datetime.now(timezone.utc).isoformat()
            }
        
        now = time.time()
        window_size = self._get_window_size(limit_type)
        key = f"{self.config.redis_prefix}{user_id}:{limit_type.value}"
        
        # Get entries in current window
        entries = await self.redis.zrangebyscore(key, now - window_size, now, withscores=True)
        
        return {
            'current': len(entries),
            'window_start': datetime.fromtimestamp(now - window_size, timezone.utc).isoformat(),
            'window_end': datetime.fromtimestamp(now, timezone.utc).isoformat(),
            'entries': [{'timestamp': datetime.fromtimestamp(score, timezone.utc).isoformat(), 'id': entry} 
                       for entry, score in entries]
        }
    
    async def reset_user_limits(self, user_id: str, limit_types: Optional[List[LimitType]] = None):
        """Reset rate limits for a user"""
        if limit_types is None:
            limit_types = list(LimitType)
        
        # Reset Redis counters
        keys_to_delete = []
        for limit_type in limit_types:
            if limit_type != LimitType.CONCURRENT_REQUESTS:
                key = f"{self.config.redis_prefix}{user_id}:{limit_type.value}"
                keys_to_delete.append(key)
        
        if keys_to_delete:
            await self.redis.delete(*keys_to_delete)
        
        # Reset concurrent requests
        if LimitType.CONCURRENT_REQUESTS in limit_types:
            async with self._concurrent_lock:
                if user_id in self._concurrent_requests:
                    del self._concurrent_requests[user_id]
        
        # Reset backoff
        if user_id in self._backoff_counts:
            del self._backoff_counts[user_id]
    
    async def get_user_stats(self, user_id: str, plan_type: PlanType) -> Dict[str, Any]:
        """Get comprehensive rate limit stats for a user"""
        stats = {
            'user_id': user_id,
            'plan_type': plan_type.value,
            'limits': {},
            'current_usage': {},
            'backoff_count': self._backoff_counts.get(user_id, 0),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Get limits and current usage for each limit type
        for limit_type in LimitType:
            limit = self._get_limit(plan_type, limit_type)
            if limit > 0:
                stats['limits'][limit_type.value] = limit
                usage = await self.get_current_usage(user_id, limit_type)
                stats['current_usage'][limit_type.value] = usage
        
        return stats
    
    async def cleanup_expired_data(self):
        """Clean up expired rate limit data"""
        # This would be called periodically by a background task
        now = time.time()
        
        # Find all rate limit keys
        pattern = f"{self.config.redis_prefix}*"
        keys = await self.redis.keys(pattern)
        
        # Clean up old entries from each key
        for key in keys:
            if ":burst:" not in key:  # Skip burst tracking keys
                # Remove entries older than the largest window size
                await self.redis.zremrangebyscore(key, 0, now - 86400)  # 1 day
        
        # Clean up local caches
        current_time = time.time()
        expired_users = []
        
        async with self._concurrent_lock:
            for user_id, count in list(self._concurrent_requests.items()):
                if count == 0:
                    expired_users.append(user_id)
        
        for user_id in expired_users:
            if user_id in self._concurrent_requests:
                del self._concurrent_requests[user_id]


# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None


async def setup_rate_limiter(config: Optional[RateLimitConfig] = None, redis_client=None) -> RateLimiter:
    """Setup global rate limiter"""
    global _rate_limiter
    
    if config is None:
        config = RateLimitConfig.from_env()
    
    _rate_limiter = RateLimiter(config, redis_client)
    await _rate_limiter.initialize()
    
    return _rate_limiter


def get_rate_limiter() -> RateLimiter:
    """Get global rate limiter"""
    if _rate_limiter is None:
        raise RuntimeError("Rate limiter not initialized. Call setup_rate_limiter() first.")
    return _rate_limiter


# Convenience functions
async def check_rate_limit(user_id: str, plan_type: PlanType, limit_type: LimitType, amount: int = 1) -> RateLimitInfo:
    """Convenience function to check rate limit"""
    limiter = get_rate_limiter()
    return await limiter.check_rate_limit(user_id, plan_type, limit_type, amount)


async def apply_rate_limit(user_id: str, plan_type: PlanType, limit_type: LimitType, amount: int = 1) -> RateLimitInfo:
    """Convenience function to apply rate limit (check and consume)"""
    return await check_rate_limit(user_id, plan_type, limit_type, amount)


class RateLimitMiddleware:
    """Middleware for automatic rate limiting"""
    
    def __init__(self, rate_limiter: RateLimiter):
        self.rate_limiter = rate_limiter
    
    async def __call__(self, request, call_next):
        """Process request with rate limiting"""
        # Extract user info from request
        user_id = getattr(request.state, 'user_id', None)
        plan_type = getattr(request.state, 'plan_type', PlanType.FREE)
        
        if not user_id:
            # Skip rate limiting for unauthenticated requests
            return await call_next(request)
        
        # Check rate limits
        limit_info = await self.rate_limiter.check_rate_limit(
            user_id, plan_type, LimitType.REQUESTS_PER_MINUTE
        )
        
        if limit_info.result != RateLimitResult.ALLOWED:
            from fastapi import HTTPException
            from fastapi.responses import JSONResponse
            
            return JSONResponse(
                status_code=429,
                content={
                    'error': 'Rate limit exceeded',
                    'details': limit_info.to_dict()
                },
                headers={
                    'X-RateLimit-Limit': str(limit_info.limit),
                    'X-RateLimit-Remaining': str(limit_info.remaining),
                    'X-RateLimit-Reset': limit_info.reset_time.isoformat(),
                    'Retry-After': str(limit_info.retry_after or 60)
                }
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        response.headers['X-RateLimit-Limit'] = str(limit_info.limit)
        response.headers['X-RateLimit-Remaining'] = str(limit_info.remaining)
        response.headers['X-RateLimit-Reset'] = limit_info.reset_time.isoformat()
        
        return response