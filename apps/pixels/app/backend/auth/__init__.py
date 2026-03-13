"""
Authentication Package
JWT-based authentication system for OmniaPixels
"""

from .jwt_handler import JWTHandler
from .dependencies import get_current_user, get_current_user_optional
from .routes import router as auth_router

__all__ = [
    "JWTHandler",
    "get_current_user", 
    "get_current_user_optional",
    "auth_router"
]
