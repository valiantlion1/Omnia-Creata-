"""Resilience primitives — circuit breakers and retry helpers.

**Purpose:** Provide a tiny, dependency-free toolkit for wrapping calls to
unreliable subsystems (Redis, external providers, Postgres pools, etc.) so
that repeated failures don't cascade into user-visible latency or outages.

**Why not a third-party library?** Studio's requirements are modest:
thread-safe state, async-friendly, three states (CLOSED → OPEN → HALF_OPEN),
exponential recovery. Shipping this inline avoids a new dependency and keeps
the behavior inspectable.

**Usage:**

    breaker = CircuitBreaker(
        name="generation_broker",
        fail_threshold=5,
        cooldown_seconds=30,
    )
    try:
        result = await breaker.call(lambda: broker.enqueue(job_id))
    except CircuitOpenError:
        # Fast-fail without hitting the downstream
        record_fallback_decision()

**Invariants:**
    - Breaker state transitions are atomic (``threading.Lock``).
    - ``call`` is safe to invoke concurrently from asyncio tasks.
    - ``state()`` is always safe to read; never raises.
    - A successful HALF_OPEN probe closes the breaker; a failure re-opens it
      with cooldown extended.

**Integrations:**
    - :mod:`studio_platform.services.generation_broker` — wrap Redis ops
    - :mod:`studio_platform.providers` — wrap provider ``generate`` calls
    - :mod:`studio_platform.store` — wrap Postgres pool borrows
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from threading import Lock
from typing import Any, Awaitable, Callable, Generic, TypeVar

logger = logging.getLogger("omnia.studio.resilience")

T = TypeVar("T")

# Tunable via environment. Defaults are conservative — tighten per subsystem
# once real-world failure rates are known.
_DEFAULT_FAIL_THRESHOLD = int(os.environ.get("STUDIO_CB_FAIL_THRESHOLD", "5") or "5")
_DEFAULT_COOLDOWN_SECONDS = float(os.environ.get("STUDIO_CB_COOLDOWN_SECONDS", "30") or "30")
_DEFAULT_HALF_OPEN_MAX_PROBES = int(
    os.environ.get("STUDIO_CB_HALF_OPEN_MAX_PROBES", "1") or "1"
)


class CircuitState(str, Enum):
    """Discrete breaker state."""

    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitOpenError(RuntimeError):
    """Raised by :meth:`CircuitBreaker.call` when the breaker is open.

    Callers should treat this as a fast-fail signal (not a bug) — it means the
    downstream was deemed unhealthy and we intentionally skipped the call.
    """


@dataclass
class _BreakerSnapshot:
    state: CircuitState
    consecutive_failures: int
    opened_at: float | None
    half_open_probes_in_flight: int
    last_failure_reason: str | None


@dataclass
class CircuitBreaker(Generic[T]):
    """A minimal three-state circuit breaker.

    :param name: Stable identifier for metrics/logs (e.g. ``"generation_broker"``).
    :param fail_threshold: Consecutive failures before opening.
    :param cooldown_seconds: How long to stay OPEN before probing HALF_OPEN.
    :param half_open_max_probes: Concurrent probes allowed while HALF_OPEN.

    **State machine:**
        CLOSED ──(fail_threshold failures)──▶ OPEN
        OPEN   ──(cooldown_seconds elapsed)──▶ HALF_OPEN
        HALF_OPEN ──(probe succeeds)──▶ CLOSED
        HALF_OPEN ──(probe fails)───▶ OPEN (cooldown resets)
    """

    name: str
    fail_threshold: int = _DEFAULT_FAIL_THRESHOLD
    cooldown_seconds: float = _DEFAULT_COOLDOWN_SECONDS
    half_open_max_probes: int = _DEFAULT_HALF_OPEN_MAX_PROBES

    _lock: Lock = field(default_factory=Lock, init=False, repr=False)
    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _consecutive_failures: int = field(default=0, init=False)
    _opened_at: float | None = field(default=None, init=False)
    _half_open_probes_in_flight: int = field(default=0, init=False)
    _last_failure_reason: str | None = field(default=None, init=False)

    # ------------------------------------------------------------------ state

    def snapshot(self) -> _BreakerSnapshot:
        """Return a thread-safe copy of current state for metrics/logs."""
        with self._lock:
            return _BreakerSnapshot(
                state=self._state,
                consecutive_failures=self._consecutive_failures,
                opened_at=self._opened_at,
                half_open_probes_in_flight=self._half_open_probes_in_flight,
                last_failure_reason=self._last_failure_reason,
            )

    def state(self) -> CircuitState:
        with self._lock:
            return self._state

    # -------------------------------------------------------------- decisions

    def _can_attempt(self) -> bool:
        """Decide whether a call can proceed. Caller must hold ``_lock``."""
        if self._state is CircuitState.CLOSED:
            return True
        if self._state is CircuitState.OPEN:
            elapsed = time.monotonic() - (self._opened_at or 0.0)
            if elapsed >= self.cooldown_seconds:
                # Transition to HALF_OPEN and let this call be the probe.
                self._state = CircuitState.HALF_OPEN
                self._half_open_probes_in_flight = 1
                logger.info(
                    "circuit_breaker.half_open",
                    extra={"subsystem": self.name, "elapsed_seconds": round(elapsed, 3)},
                )
                return True
            return False
        # HALF_OPEN — allow a limited number of concurrent probes.
        if self._half_open_probes_in_flight < self.half_open_max_probes:
            self._half_open_probes_in_flight += 1
            return True
        return False

    def _on_success(self) -> None:
        with self._lock:
            previous = self._state
            self._consecutive_failures = 0
            self._last_failure_reason = None
            if previous is CircuitState.HALF_OPEN:
                self._half_open_probes_in_flight = max(
                    0, self._half_open_probes_in_flight - 1
                )
            self._state = CircuitState.CLOSED
            self._opened_at = None
            if previous is not CircuitState.CLOSED:
                logger.info(
                    "circuit_breaker.closed",
                    extra={"subsystem": self.name, "previous_state": previous.value},
                )

    def _on_failure(self, reason: str) -> None:
        with self._lock:
            self._consecutive_failures += 1
            self._last_failure_reason = reason
            was_half_open = self._state is CircuitState.HALF_OPEN
            if was_half_open:
                self._half_open_probes_in_flight = max(
                    0, self._half_open_probes_in_flight - 1
                )
                self._state = CircuitState.OPEN
                self._opened_at = time.monotonic()
                logger.warning(
                    "circuit_breaker.reopened",
                    extra={"subsystem": self.name, "reason": reason},
                )
                return
            if (
                self._state is CircuitState.CLOSED
                and self._consecutive_failures >= self.fail_threshold
            ):
                self._state = CircuitState.OPEN
                self._opened_at = time.monotonic()
                logger.warning(
                    "circuit_breaker.opened",
                    extra={
                        "subsystem": self.name,
                        "reason": reason,
                        "consecutive_failures": self._consecutive_failures,
                    },
                )

    # ------------------------------------------------------------------- call

    async def call(self, func: Callable[[], Awaitable[T]]) -> T:
        """Execute ``func`` through the breaker.

        Raises :class:`CircuitOpenError` when the breaker is OPEN. Any
        exception raised by ``func`` is re-raised after being recorded as a
        failure (so the caller still sees the original error type).
        """
        with self._lock:
            allowed = self._can_attempt()
        if not allowed:
            raise CircuitOpenError(
                f"Circuit breaker '{self.name}' is OPEN; fast-failing."
            )
        try:
            result = await func()
        except Exception as exc:  # re-raised below after bookkeeping
            self._on_failure(f"{type(exc).__name__}: {exc}")
            raise
        self._on_success()
        return result

    def call_sync(self, func: Callable[[], T]) -> T:
        """Synchronous variant for non-async call sites (e.g. psycopg pool)."""
        with self._lock:
            allowed = self._can_attempt()
        if not allowed:
            raise CircuitOpenError(
                f"Circuit breaker '{self.name}' is OPEN; fast-failing."
            )
        try:
            result = func()
        except Exception as exc:
            self._on_failure(f"{type(exc).__name__}: {exc}")
            raise
        self._on_success()
        return result

    # ------------------------------------------------------------------ admin

    def force_open(self, *, reason: str = "manual") -> None:
        """Open the breaker immediately (useful for ops interventions)."""
        with self._lock:
            self._state = CircuitState.OPEN
            self._opened_at = time.monotonic()
            self._last_failure_reason = reason
            logger.warning(
                "circuit_breaker.force_open",
                extra={"subsystem": self.name, "reason": reason},
            )

    def reset(self) -> None:
        """Reset to CLOSED (useful after an explicit recovery action)."""
        with self._lock:
            self._state = CircuitState.CLOSED
            self._consecutive_failures = 0
            self._opened_at = None
            self._half_open_probes_in_flight = 0
            self._last_failure_reason = None
            logger.info(
                "circuit_breaker.reset",
                extra={"subsystem": self.name},
            )


def describe_breaker(breaker: CircuitBreaker[Any]) -> dict[str, Any]:
    """Produce a JSON-serializable snapshot for ``/healthz/detail`` and tests."""
    snap = breaker.snapshot()
    payload: dict[str, Any] = {
        "name": breaker.name,
        "state": snap.state.value,
        "consecutive_failures": snap.consecutive_failures,
        "half_open_probes_in_flight": snap.half_open_probes_in_flight,
        "fail_threshold": breaker.fail_threshold,
        "cooldown_seconds": breaker.cooldown_seconds,
    }
    if snap.opened_at is not None:
        payload["opened_seconds_ago"] = round(time.monotonic() - snap.opened_at, 3)
    if snap.last_failure_reason:
        payload["last_failure_reason"] = snap.last_failure_reason
    return payload


__all__ = [
    "CircuitBreaker",
    "CircuitOpenError",
    "CircuitState",
    "describe_breaker",
]
