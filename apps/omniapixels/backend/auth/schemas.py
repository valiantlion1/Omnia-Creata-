"""
Authentication Schemas
Pydantic models for authentication requests/responses
"""

from pydantic import BaseModel, EmailStr
from typing import Optional

class UserSignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: str
    
    class Config:
        from_attributes = True
