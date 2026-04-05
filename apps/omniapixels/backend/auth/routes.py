from fastapi import APIRouter, Depends
from auth.dependencies import get_current_user
from auth.supabase_auth import SupabaseUser

router = APIRouter(tags=["Authentication"])


@router.get("/me")
async def get_me(user: SupabaseUser = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "display_name": user.display_name,
        "is_admin": user.is_admin,
    }
