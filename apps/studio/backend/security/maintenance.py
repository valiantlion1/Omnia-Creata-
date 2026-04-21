from __future__ import annotations

import hmac
import os
from dataclasses import dataclass

from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp


DEFAULT_MAINTENANCE_MESSAGE = "OmniaCreata Studio is undergoing brief maintenance. Please retry shortly."
DEFAULT_RETRY_AFTER_SECONDS = 120
TRUTHY_VALUES = {"1", "true", "yes"}
BYPASS_PATHS = {
    "/",
    "/v1/version",
    "/v1/healthz",
    "/v1/healthz/ready",
    "/v1/healthz/startup",
    "/v1/healthz/detail",
}


@dataclass(slots=True)
class MaintenanceConfig:
    enabled: bool
    message: str
    retry_after_seconds: int
    override_token: str | None


def _is_truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in TRUTHY_VALUES


def _parse_retry_after_seconds(raw_value: str | None) -> int:
    if raw_value is None:
        return DEFAULT_RETRY_AFTER_SECONDS
    try:
        parsed = int(str(raw_value).strip())
    except (TypeError, ValueError):
        return DEFAULT_RETRY_AFTER_SECONDS
    if parsed < 0:
        return DEFAULT_RETRY_AFTER_SECONDS
    return parsed


def load_maintenance_config() -> MaintenanceConfig:
    """Load maintenance-mode settings from env.

    Zero is treated as an explicit retry hint and preserved. Only negative or
    invalid retry-after values fall back to the default of 120 seconds.
    """

    raw_message = os.getenv("MAINTENANCE_MESSAGE")
    override_token = os.getenv("MAINTENANCE_OVERRIDE_TOKEN")
    normalized_override = None if override_token is None else override_token.strip() or None

    return MaintenanceConfig(
        enabled=_is_truthy(os.getenv("MAINTENANCE_MODE")),
        message=(str(raw_message).strip() if raw_message is not None else "") or DEFAULT_MAINTENANCE_MESSAGE,
        retry_after_seconds=_parse_retry_after_seconds(os.getenv("MAINTENANCE_RETRY_AFTER_SECONDS")),
        override_token=normalized_override,
    )


class MaintenanceMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, config: MaintenanceConfig) -> None:
        super().__init__(app)
        self.config = config

    async def dispatch(self, request: Request, call_next):
        if request.url.path in BYPASS_PATHS:
            return await call_next(request)

        if not self.config.enabled:
            return await call_next(request)

        if self.config.override_token:
            override_header = request.headers.get("X-Maintenance-Override")
            if override_header and hmac.compare_digest(override_header, self.config.override_token):
                return await call_next(request)

        return JSONResponse(
            status_code=503,
            content={
                "error": "maintenance",
                "message": self.config.message,
                "retry_after_seconds": self.config.retry_after_seconds,
            },
            headers={
                "Retry-After": str(self.config.retry_after_seconds),
                "Cache-Control": "no-store, private",
            },
        )
