import pytest

from studio_platform.services.generation_broker import InMemoryGenerationBroker


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
