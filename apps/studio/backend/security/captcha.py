from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import httpx

from config.env import (
    Environment,
    Settings,
    configured_secret_value,
    get_settings,
    has_configured_string,
)

_TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


class CaptchaError(RuntimeError):
    """Base class for CAPTCHA verification failures."""


class CaptchaConfigurationError(CaptchaError):
    """Raised when CAPTCHA is enabled but not configured correctly."""


class CaptchaVerificationError(CaptchaError):
    """Raised when the provided CAPTCHA token is missing or invalid."""


class CaptchaServiceError(CaptchaError):
    """Raised when the upstream CAPTCHA provider cannot be reached cleanly."""


def _expected_captcha_hostname(settings: Settings) -> str | None:
    base_url = str(settings.public_web_base_url or "").strip()
    if not base_url:
        return None
    parsed = urlparse(base_url)
    hostname = (parsed.hostname or "").strip().lower()
    return hostname or None


async def verify_captcha_token(
    token: str | None,
    *,
    remote_ip: str | None = None,
    action: str | None = None,
    settings: Settings | None = None,
    transport: httpx.AsyncBaseTransport | None = None,
) -> dict[str, Any]:
    settings = settings or get_settings()
    if settings.captcha_verification_enabled is not True:
        return {"provider": "disabled", "success": True, "skipped": True}

    provider = settings.captcha_provider_normalized
    if provider != "turnstile":
        raise CaptchaConfigurationError("Unsupported CAPTCHA provider is configured.")

    site_key = str(settings.turnstile_site_key or "").strip()
    secret = configured_secret_value(settings.turnstile_secret_key)
    if not has_configured_string(site_key) or not secret:
        raise CaptchaConfigurationError(
            "Cloudflare Turnstile is enabled but the site key or secret is missing."
        )

    captcha_token = str(token or "").strip()
    if not captcha_token:
        raise CaptchaVerificationError("Complete CAPTCHA verification to continue.")

    payload: dict[str, str] = {
        "secret": secret,
        "response": captcha_token,
    }
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=10.0, transport=transport) as client:
            response = await client.post(_TURNSTILE_VERIFY_URL, data=payload)
        response.raise_for_status()
        response_payload = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise CaptchaServiceError(
            "CAPTCHA verification could not be completed right now."
        ) from exc

    if not isinstance(response_payload, dict):
        raise CaptchaServiceError("CAPTCHA verification returned an unreadable response.")
    if response_payload.get("success") is not True:
        raise CaptchaVerificationError("Complete CAPTCHA verification to continue.")

    returned_action = str(response_payload.get("action") or "").strip()
    if action and returned_action != action:
        raise CaptchaVerificationError("CAPTCHA verification did not match this action.")

    expected_hostname = _expected_captcha_hostname(settings)
    returned_hostname = str(response_payload.get("hostname") or "").strip().lower()
    if settings.environment in {Environment.STAGING, Environment.PRODUCTION} and expected_hostname:
        if not returned_hostname:
            raise CaptchaVerificationError("CAPTCHA verification did not return a hostname.")
        if returned_hostname != expected_hostname:
            raise CaptchaVerificationError(
                "CAPTCHA verification came from an unexpected hostname."
            )

    return response_payload
