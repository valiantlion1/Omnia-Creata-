from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Optional
import httpx


class SupabaseAuthError(Exception):
    pass


@dataclass
class SupabaseUser:
    id: str
    email: str
    is_admin: bool
    display_name: str
    access_token: str


class SupabaseAuthClient:
    def __init__(self, base_url: str, anon_key: str, admin_emails: list[str]) -> None:
        self.base_url = base_url.rstrip("/")
        self.anon_key = anon_key
        self.admin_emails = [e.strip().lower() for e in admin_emails]

    @property
    def enabled(self) -> bool:
        return bool(self.base_url and self.anon_key)

    async def get_user(self, access_token: str) -> SupabaseUser:
        payload = await self._request(
            "GET", "/auth/v1/user",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if "id" not in payload:
            raise SupabaseAuthError("Invalid user response from Supabase")

        email = (payload.get("email") or "").strip().lower()
        meta = payload.get("user_metadata") or {}
        display_name = (
            meta.get("full_name") or meta.get("name") or
            meta.get("display_name") or email.split("@")[0]
        )
        return SupabaseUser(
            id=payload["id"],
            email=email,
            is_admin=email in self.admin_emails,
            display_name=display_name,
            access_token=access_token,
        )

    async def _request(self, method: str, path: str, *,
                       json: Optional[dict] = None,
                       headers: Optional[dict] = None) -> dict[str, Any]:
        if not self.enabled:
            raise SupabaseAuthError("Supabase not configured")

        req_headers = {"apikey": self.anon_key, "Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.request(method, f"{self.base_url}{path}",
                                           json=json, headers=req_headers)
        except httpx.HTTPError as e:
            raise SupabaseAuthError(f"Request failed: {e}") from e

        data = res.json() if res.content else {}
        if res.status_code >= 400:
            msg = data.get("msg") or data.get("error_description") or data.get("error") or "Auth failed"
            raise SupabaseAuthError(str(msg))
        return data
