from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from auth.supabase_auth import SupabaseAuthClient, SupabaseAuthError, SupabaseUser
from core.config import settings

security = HTTPBearer(auto_error=False)

_supabase_client: Optional[SupabaseAuthClient] = None


def get_supabase_client() -> SupabaseAuthClient:
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseAuthClient(
            base_url=settings.SUPABASE_URL,
            anon_key=settings.SUPABASE_ANON_KEY,
            admin_emails=settings.ADMIN_EMAILS_LIST,
        )
    return _supabase_client


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> SupabaseUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        client = get_supabase_client()
        return await client.get_user(credentials.credentials)
    except SupabaseAuthError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[SupabaseUser]:
    if not credentials:
        return None
    try:
        client = get_supabase_client()
        return await client.get_user(credentials.credentials)
    except SupabaseAuthError:
        return None


async def require_admin(user: SupabaseUser = Depends(get_current_user)) -> SupabaseUser:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user
