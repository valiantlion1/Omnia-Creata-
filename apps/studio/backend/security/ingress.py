from __future__ import annotations

import re
import uuid
from typing import Optional

from fastapi.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send


_SAFE_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._:-]{8,128}$")


class _RequestBodyTooLarge(Exception):
    pass


def resolve_request_id(value: str | None) -> str:
    candidate = str(value or "").strip()
    if _SAFE_REQUEST_ID_RE.fullmatch(candidate):
        return candidate
    return uuid.uuid4().hex


def request_id_from_scope(scope: Scope) -> str:
    state = scope.setdefault("state", {})
    existing = state.get("request_id")
    if isinstance(existing, str) and existing:
        return existing

    header_value = _header_value(scope, b"x-request-id")
    resolved = resolve_request_id(header_value.decode("utf-8", errors="ignore") if header_value else None)
    state["request_id"] = resolved
    return resolved


class IngressLimitMiddleware:
    """Reject obviously abusive requests before they hit route handlers."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        max_header_bytes: int,
        max_body_bytes: int,
    ) -> None:
        self.app = app
        self.max_header_bytes = max(0, int(max_header_bytes))
        self.max_body_bytes = max(0, int(max_body_bytes))

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = request_id_from_scope(scope)
        header_bytes = _calculate_header_bytes(scope)
        if self.max_header_bytes and header_bytes > self.max_header_bytes:
            await _send_json_error(
                scope,
                send,
                status_code=431,
                error="Request headers too large.",
                request_id=request_id,
            )
            return

        content_length = _content_length(scope)
        if self.max_body_bytes and content_length is not None and content_length > self.max_body_bytes:
            await _send_json_error(
                scope,
                send,
                status_code=413,
                error="Request body too large.",
                request_id=request_id,
            )
            return

        body_bytes = 0
        response_started = False

        async def guarded_receive() -> Message:
            nonlocal body_bytes
            message = await receive()
            if message["type"] != "http.request":
                return message

            body_bytes += len(message.get("body", b""))
            if self.max_body_bytes and body_bytes > self.max_body_bytes:
                raise _RequestBodyTooLarge
            return message

        async def tracked_send(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, guarded_receive, tracked_send)
        except _RequestBodyTooLarge:
            if response_started:
                raise
            await _send_json_error(
                scope,
                send,
                status_code=413,
                error="Request body too large.",
                request_id=request_id,
            )


async def _send_json_error(
    scope: Scope,
    send: Send,
    *,
    status_code: int,
    error: str,
    request_id: str,
) -> None:
    response = JSONResponse(
        status_code=status_code,
        content={
            "error": error,
            "request_id": request_id,
        },
    )
    response.headers["X-Request-ID"] = request_id

    async def _unused_receive() -> Message:
        return {"type": "http.disconnect"}

    await response(scope, _unused_receive, send)


def _header_value(scope: Scope, name: bytes) -> bytes | None:
    for header_name, header_value in scope.get("headers", []):
        if header_name.lower() == name:
            return header_value
    return None


def _calculate_header_bytes(scope: Scope) -> int:
    total = 0
    for header_name, header_value in scope.get("headers", []):
        total += len(header_name) + len(header_value) + 4
    return total


def _content_length(scope: Scope) -> Optional[int]:
    raw_value = _header_value(scope, b"content-length")
    if raw_value is None:
        return None
    try:
        return int(raw_value.decode("utf-8", errors="ignore").strip())
    except (TypeError, ValueError):
        return None
