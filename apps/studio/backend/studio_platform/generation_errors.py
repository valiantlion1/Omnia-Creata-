from __future__ import annotations


class GenerationCapacityError(ValueError):
    def __init__(
        self,
        message: str,
        *,
        queue_full: bool = False,
        estimated_wait_seconds: int | None = None,
    ) -> None:
        super().__init__(message)
        self.queue_full = queue_full
        self.estimated_wait_seconds = estimated_wait_seconds
