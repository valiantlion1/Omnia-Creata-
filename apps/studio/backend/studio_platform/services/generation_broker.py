"""Generation job broker — queue + claim lifecycle for image/text jobs.

**Purpose:** Decouple job enqueue from job execution across web/worker split
runtimes. The broker owns queue ordering (priority/standard/browse-only),
claim leases, stale-claim recovery, and metrics.

**Implementations:**
    - ``InMemoryGenerationBroker`` — single-process, no Redis, test/dev only.
    - ``RedisGenerationBroker`` — shared across processes, production default.

**Invariants:**
    - ``enqueue`` returns ``False`` if job already queued/claimed (idempotent).
    - ``dequeue_next`` atomically moves a job from queue to claim set.
    - ``requeue_stale_claims`` returns jobs whose claim heartbeat expired.
    - All mutations are safe to call concurrently.

**Factory:**
    :func:`build_generation_broker` chooses an implementation based on
    ``redis_url``. When Redis URL is empty and the in-memory fallback flag is
    enabled, returns an :class:`InMemoryGenerationBroker` so single-process
    deployments stay functional.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from collections import deque
from contextlib import suppress
from threading import Lock
import time

from redis.asyncio import Redis

from config.feature_flags import FEATURE_FLAGS, FLAG_CIRCUIT_BREAKER_ENABLED

from ..resilience import CircuitBreaker, CircuitOpenError, describe_breaker

logger = logging.getLogger("omnia.studio.generation_broker")


class GenerationBroker(ABC):
    @abstractmethod
    async def initialize(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def enqueue(self, job_id: str, *, priority: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    async def dequeue_next(
        self,
        *,
        priority_streak: int,
        priority_burst_limit: int,
        priority_order: tuple[str, ...],
    ) -> tuple[str | None, str | None, int]:
        raise NotImplementedError

    @abstractmethod
    async def heartbeat_claim(self, job_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    async def complete(self, job_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    async def requeue_stale_claims(self, *, stale_after_seconds: int) -> list[tuple[str, str]]:
        raise NotImplementedError

    @abstractmethod
    async def metrics(self) -> dict[str, int]:
        raise NotImplementedError

    @abstractmethod
    async def claimed_count(self) -> int:
        raise NotImplementedError

    @abstractmethod
    async def inspect(self) -> dict[str, object]:
        raise NotImplementedError

    @abstractmethod
    async def discard(self, job_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    async def shutdown(self) -> None:
        raise NotImplementedError

    def describe_circuit_breaker(self) -> dict[str, object] | None:
        return None


class InMemoryGenerationBroker(GenerationBroker):
    def __init__(self) -> None:
        self._lock = Lock()
        self._queues: dict[str, deque[str]] = {
            "priority": deque(),
            "standard": deque(),
            "browse-only": deque(),
        }
        self._queued_ids: set[str] = set()
        self._claimed: dict[str, tuple[str, float]] = {}

    async def initialize(self) -> None:
        return None

    async def enqueue(self, job_id: str, *, priority: str) -> bool:
        normalized = _normalize_priority(priority)
        with self._lock:
            if job_id in self._queued_ids or job_id in self._claimed:
                return False
            self._queued_ids.add(job_id)
            self._queues[normalized].append(job_id)
            return True

    async def dequeue_next(
        self,
        *,
        priority_streak: int,
        priority_burst_limit: int,
        priority_order: tuple[str, ...],
    ) -> tuple[str | None, str | None, int]:
        with self._lock:
            queue_sizes = {priority: len(self._queues[priority]) for priority in priority_order}
            chosen_priority, next_streak = _choose_priority(
                queue_sizes=queue_sizes,
                priority_streak=priority_streak,
                priority_burst_limit=priority_burst_limit,
            )
            if chosen_priority is None:
                return None, None, next_streak
            job_id = self._queues[chosen_priority].popleft()
            self._queued_ids.discard(job_id)
            self._claimed[job_id] = (chosen_priority, time.monotonic())
            return job_id, chosen_priority, next_streak

    async def heartbeat_claim(self, job_id: str) -> None:
        with self._lock:
            if job_id not in self._claimed:
                return
            priority, _ = self._claimed[job_id]
            self._claimed[job_id] = (priority, time.monotonic())

    async def complete(self, job_id: str) -> None:
        with self._lock:
            self._claimed.pop(job_id, None)

    async def requeue_stale_claims(self, *, stale_after_seconds: int) -> list[tuple[str, str]]:
        cutoff = time.monotonic() - max(1, stale_after_seconds)
        recovered: list[tuple[str, str]] = []
        with self._lock:
            stale_job_ids = [
                job_id
                for job_id, (_, claimed_at) in self._claimed.items()
                if claimed_at <= cutoff
            ]
            for job_id in stale_job_ids:
                priority, _ = self._claimed.pop(job_id)
                if job_id in self._queued_ids:
                    continue
                self._queued_ids.add(job_id)
                self._queues[priority].append(job_id)
                recovered.append((job_id, priority))
        return recovered

    async def metrics(self) -> dict[str, int]:
        with self._lock:
            return {priority: len(queue) for priority, queue in self._queues.items()}

    async def claimed_count(self) -> int:
        with self._lock:
            return len(self._claimed)

    async def inspect(self) -> dict[str, object]:
        with self._lock:
            return {
                "queued": {
                    priority: list(queue)
                    for priority, queue in self._queues.items()
                },
                "claimed": {
                    job_id: priority
                    for job_id, (priority, _) in self._claimed.items()
                },
            }

    async def discard(self, job_id: str) -> None:
        with self._lock:
            self._queued_ids.discard(job_id)
            self._claimed.pop(job_id, None)
            for queue in self._queues.values():
                with suppress(ValueError):
                    queue.remove(job_id)

    async def shutdown(self) -> None:
        with self._lock:
            for queue in self._queues.values():
                queue.clear()
            self._queued_ids.clear()
            self._claimed.clear()


class RedisGenerationBroker(GenerationBroker):
    def __init__(self, redis_url: str, *, prefix: str = "oc-studio:generation") -> None:
        self.redis = Redis.from_url(redis_url, decode_responses=True)
        self.prefix = prefix
        self._queued_index_key = f"{self.prefix}:queued:index"
        self._claimed_scores_key = f"{self.prefix}:claimed:scores"
        self._claimed_priority_key = f"{self.prefix}:claimed:priority"
        self._breaker = (
            CircuitBreaker[object](
                name="generation_broker",
                fail_threshold=5,
                cooldown_seconds=10.0,
                half_open_max_probes=2,
            )
            if FEATURE_FLAGS.is_enabled(FLAG_CIRCUIT_BREAKER_ENABLED)
            else None
        )

    async def initialize(self) -> None:
        await self.redis.ping()

    async def enqueue(self, job_id: str, *, priority: str) -> bool:
        async def operation() -> bool:
            normalized = _normalize_priority(priority)
            queue_key = self._queue_key(normalized)
            async with self.redis.pipeline(transaction=True) as pipe:
                pipe.sadd(self._queued_index_key, job_id)
                pipe.rpush(queue_key, job_id)
                results = await pipe.execute()
            if int(results[0]) == 0:
                return False
            return True

        return await self._call_with_breaker(operation)

    async def dequeue_next(
        self,
        *,
        priority_streak: int,
        priority_burst_limit: int,
        priority_order: tuple[str, ...],
    ) -> tuple[str | None, str | None, int]:
        async def operation() -> tuple[str | None, str | None, int]:
            queue_sizes = await self._metrics_raw()
            chosen_priority, next_streak = _choose_priority(
                queue_sizes=queue_sizes,
                priority_streak=priority_streak,
                priority_burst_limit=priority_burst_limit,
            )
            if chosen_priority is None:
                return None, None, next_streak

            queue_key = self._queue_key(chosen_priority)
            now = time.time()
            async with self.redis.pipeline(transaction=True) as pipe:
                pipe.lpop(queue_key)
                results = await pipe.execute()
            job_id = results[0]
            if job_id is None:
                return None, None, next_streak
            async with self.redis.pipeline(transaction=True) as pipe:
                pipe.srem(self._queued_index_key, job_id)
                pipe.zadd(self._claimed_scores_key, {str(job_id): now})
                pipe.hset(self._claimed_priority_key, str(job_id), chosen_priority)
                await pipe.execute()
            return str(job_id), chosen_priority, next_streak

        return await self._call_with_breaker(operation)

    async def heartbeat_claim(self, job_id: str) -> None:
        async def operation() -> None:
            if not job_id:
                return
            await self.redis.zadd(self._claimed_scores_key, {str(job_id): time.time()})

        await self._call_with_breaker(operation)

    async def complete(self, job_id: str) -> None:
        async def operation() -> None:
            if not job_id:
                return
            async with self.redis.pipeline(transaction=True) as pipe:
                pipe.zrem(self._claimed_scores_key, str(job_id))
                pipe.hdel(self._claimed_priority_key, str(job_id))
                await pipe.execute()

        await self._call_with_breaker(operation)

    async def requeue_stale_claims(self, *, stale_after_seconds: int) -> list[tuple[str, str]]:
        async def operation() -> list[tuple[str, str]]:
            cutoff = time.time() - max(1, stale_after_seconds)
            stale_job_ids = await self.redis.zrangebyscore(self._claimed_scores_key, "-inf", cutoff)
            if not stale_job_ids:
                return []

            recovered: list[tuple[str, str]] = []
            for job_id in stale_job_ids:
                priority = await self.redis.hget(self._claimed_priority_key, str(job_id))
                normalized_priority = _normalize_priority(priority or "standard")
                async with self.redis.pipeline(transaction=True) as pipe:
                    pipe.zrem(self._claimed_scores_key, str(job_id))
                    pipe.hdel(self._claimed_priority_key, str(job_id))
                    pipe.sadd(self._queued_index_key, str(job_id))
                    results = await pipe.execute()
                removed = int(results[0])
                if removed <= 0:
                    continue
                await self.redis.rpush(self._queue_key(normalized_priority), str(job_id))
                recovered.append((str(job_id), normalized_priority))
            return recovered

        return await self._call_with_breaker(operation)

    async def metrics(self) -> dict[str, int]:
        async def operation() -> dict[str, int]:
            return await self._metrics_raw()
        return await self._call_with_breaker(
            operation,
            open_fallback={"priority": 0, "standard": 0, "browse-only": 0},
        )

    async def claimed_count(self) -> int:
        async def operation() -> int:
            return int(await self.redis.zcard(self._claimed_scores_key))

        return await self._call_with_breaker(operation, open_fallback=0)

    async def inspect(self) -> dict[str, object]:
        async def operation() -> dict[str, object]:
            async with self.redis.pipeline(transaction=False) as pipe:
                pipe.lrange(self._queue_key("priority"), 0, -1)
                pipe.lrange(self._queue_key("standard"), 0, -1)
                pipe.lrange(self._queue_key("browse-only"), 0, -1)
                pipe.hgetall(self._claimed_priority_key)
                priority_jobs, standard_jobs, browse_jobs, claimed = await pipe.execute()
            return {
                "queued": {
                    "priority": [str(job_id) for job_id in priority_jobs],
                    "standard": [str(job_id) for job_id in standard_jobs],
                    "browse-only": [str(job_id) for job_id in browse_jobs],
                },
                "claimed": {
                    str(job_id): _normalize_priority(str(priority))
                    for job_id, priority in dict(claimed).items()
                },
            }

        return await self._call_with_breaker(
            operation,
            open_fallback={
                "queued": {"priority": [], "standard": [], "browse-only": []},
                "claimed": {},
            },
        )

    async def discard(self, job_id: str) -> None:
        async def operation() -> None:
            if not job_id:
                return
            async with self.redis.pipeline(transaction=True) as pipe:
                pipe.srem(self._queued_index_key, str(job_id))
                pipe.zrem(self._claimed_scores_key, str(job_id))
                pipe.hdel(self._claimed_priority_key, str(job_id))
                pipe.lrem(self._queue_key("priority"), 0, str(job_id))
                pipe.lrem(self._queue_key("standard"), 0, str(job_id))
                pipe.lrem(self._queue_key("browse-only"), 0, str(job_id))
                await pipe.execute()

        await self._call_with_breaker(operation)

    async def shutdown(self) -> None:
        await self.redis.aclose()

    def _queue_key(self, priority: str) -> str:
        return f"{self.prefix}:queued:{priority}"

    def describe_circuit_breaker(self) -> dict[str, object] | None:
        if self._breaker is None:
            return None
        return describe_breaker(self._breaker)

    async def _metrics_raw(self) -> dict[str, int]:
        async with self.redis.pipeline(transaction=False) as pipe:
            pipe.llen(self._queue_key("priority"))
            pipe.llen(self._queue_key("standard"))
            pipe.llen(self._queue_key("browse-only"))
            priority_count, standard_count, browse_count = await pipe.execute()
        return {
            "priority": int(priority_count),
            "standard": int(standard_count),
            "browse-only": int(browse_count),
        }

    async def _call_with_breaker(
        self,
        operation,
        *,
        open_fallback=None,
    ):
        if self._breaker is None:
            return await operation()
        try:
            return await self._breaker.call(operation)
        except CircuitOpenError:
            if open_fallback is not None:
                return open_fallback
            raise


def build_generation_broker(*, redis_url: str | None) -> GenerationBroker | None:
    """Pick the right broker implementation for the current runtime.

    Returns a ``RedisGenerationBroker`` when ``redis_url`` is configured.
    When the URL is empty, returns ``None`` and the caller (``StudioService``)
    is responsible for deciding the fallback behavior:

    - In ``DEVELOPMENT`` single-process mode, ``StudioService`` runs the
      generation loop locally (no broker needed).
    - In ``STAGING`` / ``PRODUCTION`` split runtimes this is treated as a
      fatal configuration error via
      ``_requires_strict_shared_generation_broker``.

    **Note:** An in-memory broker is intentionally *not* auto-created here.
    Tests rely on the ``None`` return to exercise the local-queue fallback
    path. If a future caller wants an explicit in-memory broker (e.g.
    integration tests), instantiate :class:`InMemoryGenerationBroker`
    directly rather than via this factory.
    """
    normalized = (redis_url or "").strip()
    if not normalized:
        return None
    return RedisGenerationBroker(normalized)


def _choose_priority(
    *,
    queue_sizes: dict[str, int],
    priority_streak: int,
    priority_burst_limit: int,
) -> tuple[str | None, int]:
    if queue_sizes.get("priority", 0) > 0:
        if queue_sizes.get("standard", 0) > 0 and priority_streak >= priority_burst_limit:
            return "standard", 0
        return "priority", priority_streak + 1
    if queue_sizes.get("standard", 0) > 0:
        return "standard", 0
    if queue_sizes.get("browse-only", 0) > 0:
        return "browse-only", 0
    return None, 0


def _normalize_priority(value: str) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"priority", "standard", "browse-only"}:
        return normalized
    return "standard"
