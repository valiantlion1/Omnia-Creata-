"""Request-scoped context propagation for Studio backend.

**Purpose:** Thread a stable ``request_id`` through the entire async call
stack so every log line and metric emission can be correlated with the
originating HTTP request — even across background tasks spawned from an
endpoint.

**Why ContextVar?** FastAPI middleware runs before the endpoint, but service
layers and background tasks don't receive the ``Request`` object. ``ContextVar``
is the stdlib-native way to carry request-scoped values through ``asyncio``
without polluting every function signature.

**Usage — middleware side:**

    from observability.context import bind_request_id

    request_id = request.headers.get("X-Request-ID") or new_request_id()
    token = bind_request_id(request_id)
    try:
        response = await call_next(request)
    finally:
        reset_request_id(token)

**Usage — service side:**

    from observability.context import current_request_id

    logger.info("doing_work", extra={"request_id": current_request_id()})

**Invariants:**
    - ``current_request_id()`` always returns a string (empty if unset).
    - ``bind_request_id`` returns a token that MUST be passed to
      ``reset_request_id`` (use try/finally) to avoid context leaking across
      requests in connection-reuse scenarios.
    - Background tasks spawned via ``asyncio.create_task`` inherit the context
      automatically — no manual propagation needed.
"""

from __future__ import annotations

import secrets
from contextvars import ContextVar, Token
from typing import Any

_request_id_var: ContextVar[str] = ContextVar("studio_request_id", default="")
_identity_id_var: ContextVar[str] = ContextVar("studio_identity_id", default="")


def new_request_id() -> str:
    """Generate a fresh request ID.

    Uses ``secrets.token_hex(8)`` (16 hex chars) — short enough for log
    readability, long enough to avoid collisions within a single deployment.
    """
    return secrets.token_hex(8)


def current_request_id() -> str:
    """Return the request ID bound to the current async context, or ``""``."""
    return _request_id_var.get()


def current_identity_id() -> str:
    """Return the authenticated identity ID bound to the current context."""
    return _identity_id_var.get()


def bind_request_id(request_id: str) -> Token[str]:
    """Bind ``request_id`` to the current context. Returns a reset token."""
    return _request_id_var.set(str(request_id or ""))


def bind_identity_id(identity_id: str) -> Token[str]:
    """Bind an authenticated identity ID to the current context."""
    return _identity_id_var.set(str(identity_id or ""))


def reset_request_id(token: Token[str]) -> None:
    """Restore the previous request_id value. Must be paired with ``bind_request_id``."""
    _request_id_var.reset(token)


def reset_identity_id(token: Token[str]) -> None:
    _identity_id_var.reset(token)


def log_context() -> dict[str, Any]:
    """Return the standard ``extra=`` dict for structured log calls.

    Skips empty values so log aggregators don't store useless fields.
    """
    payload: dict[str, Any] = {}
    request_id = _request_id_var.get()
    if request_id:
        payload["request_id"] = request_id
    identity_id = _identity_id_var.get()
    if identity_id:
        payload["identity_id"] = identity_id
    return payload


__all__ = [
    "new_request_id",
    "current_request_id",
    "current_identity_id",
    "bind_request_id",
    "bind_identity_id",
    "reset_request_id",
    "reset_identity_id",
    "log_context",
]
