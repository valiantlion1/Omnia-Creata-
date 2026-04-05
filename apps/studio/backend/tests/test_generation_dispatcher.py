import asyncio

import pytest

from studio_platform.services.generation_dispatcher import GenerationDispatcher


@pytest.mark.asyncio
async def test_generation_dispatcher_applies_priority_burst_without_starving_standard_jobs() -> None:
    processed: list[str] = []

    async def process_job(job_id: str) -> None:
        processed.append(job_id)
        await asyncio.sleep(0)

    dispatcher = GenerationDispatcher(process_job=process_job, max_concurrent_jobs=1)

    try:
        await dispatcher.enqueue("priority-1", priority="priority")
        await dispatcher.enqueue("priority-2", priority="priority")
        await dispatcher.enqueue("priority-3", priority="priority")
        await dispatcher.enqueue("priority-4", priority="priority")
        await dispatcher.enqueue("standard-1", priority="standard")

        for _ in range(200):
            if len(processed) == 5:
                break
            await asyncio.sleep(0.01)
        else:
            raise AssertionError("Dispatcher did not process all jobs in time")

        assert processed == [
            "priority-1",
            "priority-2",
            "priority-3",
            "standard-1",
            "priority-4",
        ]
    finally:
        await dispatcher.stop()


@pytest.mark.asyncio
async def test_generation_dispatcher_metrics_report_priority_breakdown() -> None:
    started = asyncio.Event()
    release = asyncio.Event()

    async def process_job(job_id: str) -> None:
        started.set()
        await release.wait()

    dispatcher = GenerationDispatcher(process_job=process_job, max_concurrent_jobs=1)

    try:
        await dispatcher.enqueue("priority-1", priority="priority")
        await dispatcher.enqueue("standard-1", priority="standard")
        await dispatcher.enqueue("priority-2", priority="priority")

        await asyncio.wait_for(started.wait(), timeout=1)

        metrics = dispatcher.metrics()
        assert metrics["running"] == 1
        assert metrics["queued"] == 2
        assert metrics["queued_by_priority"] == {
            "priority": 1,
            "standard": 1,
            "browse-only": 0,
        }
    finally:
        release.set()
        await dispatcher.stop()
