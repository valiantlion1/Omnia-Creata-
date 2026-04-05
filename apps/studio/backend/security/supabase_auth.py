from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

import httpx


class SupabaseAuthError(Exception):
    pass


@dataclass
class SupabaseSession:
    access_token: str
    refresh_token: str
    token_type: str
    user: dict[str, Any]


class SupabaseAuthClient:
    def __init__(self, base_url: str, anon_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.anon_key = anon_key

    @property
    def enabled(self) -> bool:
        return bool(self.base_url and self.anon_key)

    async def sign_up(
        self,
        *,
        email: str,
        password: str,
        display_name: str,
        username: str,
        accepted_terms: bool,
        accepted_privacy: bool,
        accepted_usage_policy: bool,
        marketing_opt_in: bool,
    ) -> SupabaseSession:
        payload = {
            "email": email,
            "password": password,
            "data": {
                "display_name": display_name,
                "username": username,
                "accepted_terms": accepted_terms,
                "accepted_privacy": accepted_privacy,
                "accepted_usage_policy": accepted_usage_policy,
                "marketing_opt_in": marketing_opt_in,
            },
        }
        response = await self._request("POST", "/auth/v1/signup", json=payload)
        session = self._extract_session(response)
        if session is None:
            raise SupabaseAuthError("Sign up completed but no session was returned. Check email confirmation settings.")
        return session

    async def sign_in(self, *, email: str, password: str) -> SupabaseSession:
        payload = {
            "email": email,
            "password": password,
        }
        response = await self._request("POST", "/auth/v1/token?grant_type=password", json=payload)
        session = self._extract_session(response)
        if session is None:
            raise SupabaseAuthError("Unable to create a session for this account.")
        return session

    async def get_user(self, access_token: str) -> dict[str, Any]:
        if not access_token:
            raise SupabaseAuthError("Missing access token")
        response = await self._request(
            "GET",
            "/auth/v1/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if "id" not in response:
            raise SupabaseAuthError("Supabase user response did not include an id")
        return response

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None,
    ) -> dict[str, Any]:
        if not self.enabled:
            raise SupabaseAuthError("Supabase auth is not configured")

        request_headers = {
            "apikey": self.anon_key,
            "Content-Type": "application/json",
        }
        if headers:
            request_headers.update(headers)

        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
                response = await client.request(
                    method,
                    f"{self.base_url}{path}",
                    json=json,
                    headers=request_headers,
                )
        except httpx.TimeoutException as exc:
            raise SupabaseAuthError("Supabase auth request timed out") from exc
        except httpx.HTTPError as exc:
            raise SupabaseAuthError("Supabase auth request failed") from exc

        payload = self._safe_json(response)
        if response.status_code >= 400:
            message = (
                payload.get("msg")
                or payload.get("message")
                or payload.get("error_description")
                or payload.get("error")
                or "Supabase auth request failed"
            )
            raise SupabaseAuthError(str(message))

        return payload

    def _extract_session(self, payload: dict[str, Any]) -> Optional[SupabaseSession]:
        access_token = payload.get("access_token")
        refresh_token = payload.get("refresh_token")
        user = payload.get("user")
        token_type = payload.get("token_type", "bearer")

        if not access_token or not refresh_token or not user:
            return None

        return SupabaseSession(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type=token_type,
            user=user,
        )

    @staticmethod
    def _safe_json(response: httpx.Response) -> dict[str, Any]:
        try:
            payload = response.json()
            if isinstance(payload, dict):
                return payload
        except Exception:
            pass
        return {}
