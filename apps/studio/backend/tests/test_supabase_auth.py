import pytest
import httpx

import security.auth as auth_module
from config.env import get_settings
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


def test_get_supabase_auth_client_lazy_initializes_from_settings(monkeypatch):
    settings = get_settings()
    original_url = settings.supabase_url
    original_key = settings.supabase_anon_key
    original_client = auth_module._supabase_auth_client
    try:
        settings.supabase_url = "https://example.supabase.co"
        settings.supabase_anon_key = "anon-key"
        auth_module._supabase_auth_client = None

        client = auth_module.get_supabase_auth_client()

        assert client is not None
        assert isinstance(client, SupabaseAuthClient)
        assert client.base_url == "https://example.supabase.co"
        assert client.anon_key == "anon-key"
    finally:
        settings.supabase_url = original_url
        settings.supabase_anon_key = original_key
        auth_module._supabase_auth_client = original_client
