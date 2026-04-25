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
    async def eval(self, *args, **kwargs):
        raise RuntimeError("redis unavailable")

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


class _StatefulPipeline:
    def __init__(self, redis: "_StatefulRedis") -> None:
        self.redis = redis
        self._operations: list[tuple[str, tuple[object, ...]]] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def llen(self, *args, **kwargs):
        self._operations.append(("llen", args))
        return None

    def lrange(self, *args, **kwargs):
        self._operations.append(("lrange", args))
        return None

    def hgetall(self, *args, **kwargs):
        self._operations.append(("hgetall", args))
        return None

    def zrem(self, *args, **kwargs):
        self._operations.append(("zrem", args))
        return None

    def hdel(self, *args, **kwargs):
        self._operations.append(("hdel", args))
        return None

    def srem(self, *args, **kwargs):
        self._operations.append(("srem", args))
        return None

    def lrem(self, *args, **kwargs):
        self._operations.append(("lrem", args))
        return None

    async def execute(self):
        results: list[object] = []
        for operation, args in self._operations:
            if operation == "llen":
                results.append(len(self.redis.queues.get(str(args[0]), [])))
            elif operation == "lrange":
                values = list(self.redis.queues.get(str(args[0]), []))
                start = int(args[1])
                end = int(args[2])
                results.append(values[start:] if end == -1 else values[start : end + 1])
            elif operation == "hgetall":
                results.append(dict(self.redis.claimed_priority))
            elif operation == "zrem":
                job_id = str(args[1])
                existed = job_id in self.redis.claimed_scores
                self.redis.claimed_scores.pop(job_id, None)
                results.append(1 if existed else 0)
            elif operation == "hdel":
                job_id = str(args[1])
                existed = job_id in self.redis.claimed_priority
                self.redis.claimed_priority.pop(job_id, None)
                results.append(1 if existed else 0)
            elif operation == "srem":
                job_id = str(args[1])
                existed = job_id in self.redis.queued_index
                self.redis.queued_index.discard(job_id)
                results.append(1 if existed else 0)
            elif operation == "lrem":
                queue_key = str(args[0])
                job_id = str(args[2])
                queue = self.redis.queues.setdefault(queue_key, [])
                removed = queue.count(job_id)
                self.redis.queues[queue_key] = [value for value in queue if value != job_id]
                results.append(removed)
            else:
                raise AssertionError(f"Unsupported fake pipeline operation: {operation}")
        return results


class _StatefulRedis:
    def __init__(self) -> None:
        self.queues: dict[str, list[str]] = {}
        self.queued_index: set[str] = set()
        self.claimed_scores: dict[str, float] = {}
        self.claimed_priority: dict[str, str] = {}

    async def eval(self, script, numkeys, *keys_and_args):
        keys = [str(value) for value in keys_and_args[:numkeys]]
        argv = [str(value) for value in keys_and_args[numkeys:]]
        if "generation_broker_enqueue" in script:
            _queued_key, _scores_key, _priority_key, queue_key = keys
            job_id = argv[0]
            if (
                job_id in self.queued_index
                or job_id in self.claimed_scores
                or job_id in self.claimed_priority
            ):
                return 0
            self.queued_index.add(job_id)
            self.queues.setdefault(queue_key, []).append(job_id)
            return 1
        if "generation_broker_claim_next" in script:
            queue_key, _queued_key, _scores_key, _priority_key = keys
            claim_score, priority = argv
            queue = self.queues.setdefault(queue_key, [])
            if not queue:
                return None
            job_id = queue.pop(0)
            self.queued_index.discard(job_id)
            self.claimed_scores[job_id] = float(claim_score)
            self.claimed_priority[job_id] = priority
            return job_id
        if "generation_broker_heartbeat_claim" in script:
            job_id, claim_score = argv
            if job_id not in self.claimed_scores and job_id not in self.claimed_priority:
                return 0
            self.claimed_scores[job_id] = float(claim_score)
            return 1
        if "generation_broker_requeue_stale_claim" in script:
            _scores_key, _priority_key, _queued_key, queue_key = keys
            job_id = argv[0]
            if job_id not in self.claimed_scores:
                self.claimed_priority.pop(job_id, None)
                return 0
            self.claimed_scores.pop(job_id, None)
            self.claimed_priority.pop(job_id, None)
            if job_id in self.queued_index:
                return 0
            self.queued_index.add(job_id)
            self.queues.setdefault(queue_key, []).append(job_id)
            return 1
        raise AssertionError("Unsupported fake redis script")

    def pipeline(self, transaction=True):
        return _StatefulPipeline(self)

    async def zrangebyscore(self, *args, **kwargs):
        cutoff = float(args[2])
        return [
            job_id
            for job_id, score in sorted(self.claimed_scores.items(), key=lambda item: item[1])
            if score <= cutoff
        ]

    async def hget(self, *args, **kwargs):
        return self.claimed_priority.get(str(args[1]))

    async def zcard(self, *args, **kwargs):
        return len(self.claimed_scores)

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


@pytest.mark.asyncio
async def test_redis_generation_broker_rejects_enqueue_for_claimed_job() -> None:
    broker = RedisGenerationBroker("redis://example")
    broker.redis = _StatefulRedis()

    assert await broker.enqueue("job-claimed", priority="standard") is True
    job_id, priority, _ = await broker.dequeue_next(
        priority_streak=0,
        priority_burst_limit=3,
        priority_order=("priority", "standard", "browse-only"),
    )

    assert (job_id, priority) == ("job-claimed", "standard")
    assert await broker.enqueue("job-claimed", priority="priority") is False
    assert await broker.inspect() == {
        "queued": {"priority": [], "standard": [], "browse-only": []},
        "claimed": {"job-claimed": "standard"},
    }

    await broker.complete("job-claimed")

    assert await broker.enqueue("job-claimed", priority="priority") is True
    assert await broker.metrics() == {"priority": 1, "standard": 0, "browse-only": 0}


@pytest.mark.asyncio
async def test_redis_generation_broker_ignores_heartbeat_for_unclaimed_job() -> None:
    broker = RedisGenerationBroker("redis://example")
    broker.redis = _StatefulRedis()

    await broker.heartbeat_claim("ghost-job")

    assert await broker.claimed_count() == 0
    assert await broker.inspect() == {
        "queued": {"priority": [], "standard": [], "browse-only": []},
        "claimed": {},
    }


@pytest.mark.asyncio
async def test_redis_generation_broker_requeues_stale_claim_atomically() -> None:
    broker = RedisGenerationBroker("redis://example")
    redis = _StatefulRedis()
    broker.redis = redis

    assert await broker.enqueue("job-stale", priority="browse-only") is True
    job_id, priority, _ = await broker.dequeue_next(
        priority_streak=0,
        priority_burst_limit=3,
        priority_order=("priority", "standard", "browse-only"),
    )
    assert (job_id, priority) == ("job-stale", "browse-only")
    redis.claimed_scores["job-stale"] = 1.0

    recovered = await broker.requeue_stale_claims(stale_after_seconds=1)

    assert recovered == [("job-stale", "browse-only")]
    assert await broker.claimed_count() == 0
    assert await broker.metrics() == {"priority": 0, "standard": 0, "browse-only": 1}
