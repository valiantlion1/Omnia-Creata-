import pytest
import httpx

from security.supabase_auth import SupabaseAuthClient, SupabaseAuthError


class _TimeoutingClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def request(self, *args, **kwargs):
        raise httpx.ConnectTimeout("timed out")


@pytest.mark.asyncio
async def test_supabase_request_wraps_timeout_as_auth_error(monkeypatch):
    monkeypatch.setattr(httpx, "AsyncClient", lambda *args, **kwargs: _TimeoutingClient())
    client = SupabaseAuthClient("https://example.supabase.co", "anon-key")

    with pytest.raises(SupabaseAuthError, match="timed out"):
        await client.get_user("token")
