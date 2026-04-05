from __future__ import annotations

import asyncio
from collections import deque
from contextlib import suppress
from typing import Awaitable, Callable


class GenerationDispatcher:
    """Small in-process dispatcher with bounded concurrency and restart recovery hooks."""

    _PRIORITY_ORDER = ("priority", "standard", "browse-only")
    _PRIORITY_BURST_LIMIT = 3

    def __init__(
        self,
        *,
        process_job: Callable[[str], Awaitable[None]],
        max_concurrent_jobs: int,
    ) -> None:
        self._process_job = process_job
        self._max_concurrent_jobs = max(1, max_concurrent_jobs)
        self._queues: dict[str, deque[str]] = {
            priority: deque() for priority in self._PRIORITY_ORDER
        }
        self._queued_ids: set[str] = set()
        self._queued_priorities: dict[str, str] = {}
        self._running_ids: set[str] = set()
        self._active_tasks: set[asyncio.Task[None]] = set()
        self._drain_task: asyncio.Task[None] | None = None
        self._stopped = False
        self._priority_streak = 0

    async def enqueue(self, job_id: str, *, priority: str = "standard") -> bool:
        if job_id in self._queued_ids or job_id in self._running_ids:
            return False

        normalized_priority = self._normalize_priority(priority)
        self._stopped = False
        self._queued_ids.add(job_id)
        self._queued_priorities[job_id] = normalized_priority
        self._queues[normalized_priority].append(job_id)
        self._ensure_drain_task()
        return True

    async def stop(self) -> None:
        self._stopped = True

        drain_task = self._drain_task
        if drain_task and not drain_task.done():
            drain_task.cancel()
            with suppress(asyncio.CancelledError):
                await drain_task

        active_tasks = list(self._active_tasks)
        for task in active_tasks:
            task.cancel()
        for task in active_tasks:
            with suppress(asyncio.CancelledError):
                await task

        self._drain_task = None
        self._active_tasks.clear()
        self._queued_ids.clear()
        self._queued_priorities.clear()
        self._running_ids.clear()
        for queue in self._queues.values():
            queue.clear()
        self._priority_streak = 0

    def metrics(self) -> dict[str, object]:
        return {
            "queued": len(self._queued_ids),
            "running": len(self._running_ids),
            "max_concurrent": self._max_concurrent_jobs,
            "queued_by_priority": {
                priority: len(queue)
                for priority, queue in self._queues.items()
            },
        }

    def tracked_tasks(self) -> set[asyncio.Task[None]]:
        tasks = set(self._active_tasks)
        if self._drain_task is not None and not self._drain_task.done():
            tasks.add(self._drain_task)
        return tasks

    def _ensure_drain_task(self) -> None:
        if self._drain_task is None or self._drain_task.done():
            self._drain_task = asyncio.create_task(self._drain_loop())

    async def _drain_loop(self) -> None:
        semaphore = asyncio.Semaphore(self._max_concurrent_jobs)

        while not self._stopped:
            while self._has_queued_jobs():
                await semaphore.acquire()
                job_id = self._dequeue_next_job()
                if job_id is None:
                    semaphore.release()
                    break

                if job_id in self._running_ids:
                    semaphore.release()
                    continue

                self._running_ids.add(job_id)
                task = asyncio.create_task(self._run_job(job_id, semaphore))
                self._active_tasks.add(task)
                task.add_done_callback(self._active_tasks.discard)

            if not self._active_tasks:
                break

            await asyncio.sleep(0.01)

    async def _run_job(self, job_id: str, semaphore: asyncio.Semaphore) -> None:
        try:
            await self._process_job(job_id)
        finally:
            self._running_ids.discard(job_id)
            semaphore.release()

    def _has_queued_jobs(self) -> bool:
        return any(self._queues[priority] for priority in self._PRIORITY_ORDER)

    def _dequeue_next_job(self) -> str | None:
        chosen_priority: str | None = None
        if self._queues["priority"]:
            if self._queues["standard"] and self._priority_streak >= self._PRIORITY_BURST_LIMIT:
                chosen_priority = "standard"
                self._priority_streak = 0
            else:
                chosen_priority = "priority"
                self._priority_streak += 1
        elif self._queues["standard"]:
            chosen_priority = "standard"
            self._priority_streak = 0
        elif self._queues["browse-only"]:
            chosen_priority = "browse-only"
            self._priority_streak = 0

        if chosen_priority is None:
            return None

        job_id = self._queues[chosen_priority].popleft()
        self._queued_ids.discard(job_id)
        self._queued_priorities.pop(job_id, None)
        return job_id

    def _normalize_priority(self, value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized in self._PRIORITY_ORDER:
            return normalized
        return "standard"
