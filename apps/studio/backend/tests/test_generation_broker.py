import pytest

from config.feature_flags import FEATURE_FLAGS, FLAG_CIRCUIT_BREAKER_ENABLED
from studio_platform.resilience import CircuitOpenError
from studio_platform.services.generation_broker import InMemoryGenerationBroker, RedisGenerationBroker


@pytest.mark.asyncio
async def test_in_memory_generation_broker_tracks_and_completes_claims() -> None:
    broker = InMemoryGenerationBroker()
    await broker.initialize()

    assert await broker.enqueue("job-1", priority="priority") is True

    job_id, priority, streak = await broker.dequeue_next(
        priority_streak=0,
        priority_burst_limit=3,
        priority_order=("priority", "standard", "browse-only"),
    )

    assert (job_id, priority, streak) == ("job-1", "priority", 1)
    assert await broker.claimed_count() == 1
    assert await broker.enqueue("job-1", priority="priority") is False

    await broker.complete("job-1")

    assert await broker.claimed_count() == 0
    assert await broker.enqueue("job-1", priority="priority") is True


@pytest.mark.asyncio
async def test_in_memory_generation_broker_requeues_stale_claims() -> None:
    broker = InMemoryGenerationBroker()
    await broker.initialize()

    await broker.enqueue("job-stale", priority="standard")
    job_id, priority, _ = await broker.dequeue_next(
        priority_streak=0,
        priority_burst_limit=3,
        priority_order=("priority", "standard", "browse-only"),
    )

    assert (job_id, priority) == ("job-stale", "standard")
    assert await broker.claimed_count() == 1

    priority_value, claimed_at = broker._claimed["job-stale"]  # type: ignore[attr-defined]
    broker._claimed["job-stale"] = (priority_value, claimed_at - 5)  # type: ignore[attr-defined]
    recovered = await broker.requeue_stale_claims(stale_after_seconds=1)

    assert recovered == [("job-stale", "standard")]
    assert await broker.claimed_count() == 0
    assert await broker.metrics() == {
        "priority": 0,
        "standard": 1,
        "browse-only": 0,
    }


@pytest.mark.asyncio
async def test_in_memory_generation_broker_discards_jobs_from_queue_and_claims() -> None:
    broker = InMemoryGenerationBroker()
    await broker.initialize()

    await broker.enqueue("job-queued", priority="priority")
    await broker.enqueue("job-claimed", priority="standard")
    job_id, _, _ = await broker.dequeue_next(
        priority_streak=0,
        priority_burst_limit=3,
        priority_order=("priority", "standard", "browse-only"),
    )
    assert job_id == "job-queued"

    snapshot = await broker.inspect()
    assert snapshot["claimed"] == {"job-queued": "priority"}
    assert snapshot["queued"] == {
        "priority": [],
        "standard": ["job-claimed"],
        "browse-only": [],
    }

    await broker.discard("job-queued")
    await broker.discard("job-claimed")

    assert await broker.claimed_count() == 0
    assert await broker.metrics() == {
        "priority": 0,
        "standard": 0,
        "browse-only": 0,
    }


class _FailingPipeline:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def sadd(self, *args, **kwargs):
        return None

    def rpush(self, *args, **kwargs):
        return None

    def lpop(self, *args, **kwargs):
        return None

    def zadd(self, *args, **kwargs):
        return None

    def hset(self, *args, **kwargs):
        return None

    def zrem(self, *args, **kwargs):
        return None

    def hdel(self, *args, **kwargs):
        return None

    def srem(self, *args, **kwargs):
        return None

    def lrem(self, *args, **kwargs):
        return None

    def llen(self, *args, **kwargs):
        return None

    def lrange(self, *args, **kwargs):
        return None

    def hgetall(self, *args, **kwargs):
        return None

    async def execute(self):
        raise RuntimeError("redis unavailable")


class _FailingRedis:
    def pipeline(self, transaction=True):
        return _FailingPipeline()

    async def zadd(self, *args, **kwargs):
        raise RuntimeError("redis unavailable")

    async def zcard(self, *args, **kwargs):
        raise RuntimeError("redis unavailable")

    async def zrangebyscore(self, *args, **kwargs):
        raise RuntimeError("redis unavailable")

    async def hget(self, *args, **kwargs):
        raise RuntimeError("redis unavailable")

    async def aclose(self):
        return None


class _HealthyPipeline:
    def __init__(self) -> None:
        self._operations: list[str] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def llen(self, *args, **kwargs):
        self._operations.append("llen")
        return None

    async def execute(self):
        return [0 for _ in self._operations]


class _HealthyRedis:
    def pipeline(self, transaction=True):
        return _HealthyPipeline()

    async def aclose(self):
        return None


@pytest.mark.asyncio
async def test_redis_generation_broker_opens_circuit_and_reads_fallback_cleanly() -> None:
    original_flag = FEATURE_FLAGS.is_enabled(FLAG_CIRCUIT_BREAKER_ENABLED)
    FEATURE_FLAGS.override(FLAG_CIRCUIT_BREAKER_ENABLED, True)
    broker = RedisGenerationBroker("redis://example")
    broker.redis = _FailingRedis()

    try:
        for index in range(5):
            with pytest.raises(RuntimeError, match="redis unavailable"):
                await broker.enqueue(f"job-{index}", priority="priority")

        with pytest.raises(CircuitOpenError):
            await broker.enqueue("job-open", priority="priority")

        assert await broker.metrics() == {
            "priority": 0,
            "standard": 0,
            "browse-only": 0,
        }
        assert broker.describe_circuit_breaker() is not None
        assert broker.describe_circuit_breaker()["state"] == "open"

        broker.redis = _HealthyRedis()
        broker._breaker.cooldown_seconds = 0.0  # type: ignore[union-attr]

        assert await broker.metrics() == {
            "priority": 0,
            "standard": 0,
            "browse-only": 0,
        }
        assert broker.describe_circuit_breaker()["state"] == "closed"
    finally:
        FEATURE_FLAGS.override(FLAG_CIRCUIT_BREAKER_ENABLED, original_flag)
