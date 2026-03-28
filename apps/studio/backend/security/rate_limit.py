from __future__ import annotations

import logging
import time
from abc import ABC, abstractmethod
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock

from redis.asyncio import Redis

from config.env import Environment, Settings

logger = logging.getLogger("omnia.studio.rate_limit")


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    limit: int
    remaining: int
    retry_after: int


class RateLimiter(ABC):
    @abstractmethod
    async def initialize(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def check(self, key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        raise NotImplementedError


class InMemoryRateLimiter(RateLimiter):
    """Development-safe in-memory limiter."""

    def __init__(self) -> None:
        self._lock = Lock()
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    async def initialize(self) -> None:
        return None

    async def check(self, key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        now = time.time()
        with self._lock:
            bucket = self._buckets[key]
            while bucket and now - bucket[0] >= window_seconds:
                bucket.popleft()

            if len(bucket) >= limit:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                return RateLimitDecision(
                    allowed=False,
                    limit=limit,
                    remaining=0,
                    retry_after=retry_after,
                )

            bucket.append(now)
            remaining = max(0, limit - len(bucket))
            return RateLimitDecision(
                allowed=True,
                limit=limit,
                remaining=remaining,
                retry_after=0,
            )


class RedisRateLimiter(RateLimiter):
    def __init__(
        self,
        redis_url: str,
        *,
        prefix: str = "oc-studio:ratelimit",
        fallback: RateLimiter | None = None,
    ) -> None:
        self.redis = Redis.from_url(redis_url, decode_responses=True)
        self.prefix = prefix
        self.fallback = fallback
        self._use_fallback = False

    async def initialize(self) -> None:
        if self._use_fallback:
            if self.fallback is not None:
                await self.fallback.initialize()
            return
        try:
            await self.redis.ping()
        except Exception:
            if self.fallback is None:
                raise
            logger.warning("Redis unavailable in development; falling back to in-memory rate limiter")
            self._use_fallback = True
            await self.fallback.initialize()

    async def check(self, key: str, limit: int, window_seconds: int = 60) -> RateLimitDecision:
        if self._use_fallback:
            if self.fallback is None:
                raise RuntimeError("Fallback rate limiter is not configured")
            return await self.fallback.check(key, limit, window_seconds)
        redis_key = f"{self.prefix}:{key}"
        now = time.time()
        window_start = now - window_seconds

        async with self.redis.pipeline(transaction=True) as pipe:
            (
                pipe.zremrangebyscore(redis_key, 0, window_start)
                .zcard(redis_key)
                .zadd(redis_key, {str(now): now})
                .expire(redis_key, window_seconds + 5)
            )
            removed, current_count, added, expire_set = await pipe.execute()

        current_total = int(current_count)
        if current_total >= limit:
            oldest = await self.redis.zrange(redis_key, 0, 0, withscores=True)
            retry_after = 1
            if oldest:
                retry_after = max(1, int(window_seconds - (now - oldest[0][1])))
            await self.redis.zrem(redis_key, str(now))
            return RateLimitDecision(
                allowed=False,
                limit=limit,
                remaining=0,
                retry_after=retry_after,
            )

        remaining = max(0, limit - (current_total + 1))
        return RateLimitDecision(
            allowed=True,
            limit=limit,
            remaining=remaining,
            retry_after=0,
        )


def build_rate_limiter(settings: Settings) -> RateLimiter:
    redis_url = (settings.redis_url or "").strip()
    if redis_url:
        fallback = InMemoryRateLimiter() if settings.environment == Environment.DEVELOPMENT else None
        return RedisRateLimiter(redis_url, fallback=fallback)

    if settings.environment in {Environment.STAGING, Environment.PRODUCTION}:
        raise ValueError("REDIS_URL must be set in staging and production environments")

    return InMemoryRateLimiter()
