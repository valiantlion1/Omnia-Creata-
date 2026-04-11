from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import logging
from passlib.context import CryptContext
from passlib.hash import bcrypt
import secrets
import time
from enum import Enum
from config.env import get_settings, reveal_secret
from .supabase_auth import SupabaseAuthClient, SupabaseAuthError

logger = logging.getLogger(__name__)


class TokenType(Enum):
    """JWT token types"""
    ACCESS = "access"
    REFRESH = "refresh"
    API_KEY = "api_key"
    RESET_PASSWORD = "reset_password"
    EMAIL_VERIFICATION = "email_verification"


class UserRole(Enum):
    """User roles"""
    ADMIN = "admin"
    USER = "user"
    API_CLIENT = "api_client"
    GUEST = "guest"


@dataclass
class AuthConfig:
    """Authentication configuration"""
    # JWT settings
    secret_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Password settings
    password_min_length: int = 8
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_special: bool = True
    
    # Security settings
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15
    require_email_verification: bool = True
    allow_password_reset: bool = True
    
    # API Key settings
    api_key_prefix: str = "oc_"
    api_key_length: int = 32
    
    # Rate limiting
    enable_rate_limiting: bool = True
    max_requests_per_minute: int = 60
    
    def __post_init__(self):
        """Validate configuration"""
        if not self.secret_key:
            self.secret_key = secrets.token_urlsafe(32)
            logger.warning("Generated random secret key. Set AUTH_SECRET_KEY environment variable for production.")
        
        if len(self.secret_key) < 32:
            raise ValueError("Secret key must be at least 32 characters long")


@dataclass
class User:
    """User model"""
    id: str
    email: str
    username: Optional[str] = None
    role: UserRole = UserRole.USER
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "role": self.role.value,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "metadata": self.metadata
        }
    
    def has_permission(self, permission: str) -> bool:
        """Check if user has specific permission"""
        role_permissions = {
            UserRole.ADMIN: ["*"],  # Admin has all permissions
            UserRole.USER: ["generate", "presets", "profile"],
            UserRole.API_CLIENT: ["generate", "presets"],
            UserRole.GUEST: ["presets"]
        }
        
        permissions = role_permissions.get(self.role, [])
        return "*" in permissions or permission in permissions


class JWTManager:
    """JWT token manager"""
    
    def __init__(self, config: AuthConfig):
        self.config = config
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self._blacklisted_tokens: set = set()
        self._login_attempts: Dict[str, List[float]] = {}
    
    def create_access_token(
        self,
        user: User,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create access token"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.config.access_token_expire_minutes)
        
        payload = {
            "sub": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "metadata": user.metadata,
            "type": TokenType.ACCESS.value,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "jti": secrets.token_urlsafe(16)  # JWT ID for blacklisting
        }
        
        return jwt.encode(payload, self.config.secret_key, algorithm=self.config.algorithm)
    
    def create_refresh_token(
        self,
        user: User,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create refresh token"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(days=self.config.refresh_token_expire_days)
        
        payload = {
            "sub": user.id,
            "type": TokenType.REFRESH.value,
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "jti": secrets.token_urlsafe(16)
        }
        
        return jwt.encode(payload, self.config.secret_key, algorithm=self.config.algorithm)
    
    def create_api_key(self, user: User, name: str = "API Key") -> str:
        """Create API key"""
        # Generate API key with prefix
        key_data = secrets.token_urlsafe(self.config.api_key_length)
        api_key = f"{self.config.api_key_prefix}{key_data}"
        
        # Create JWT payload for API key
        payload = {
            "sub": user.id,
            "email": user.email,
            "role": user.role.value,
            "type": TokenType.API_KEY.value,
            "name": name,
            "iat": datetime.now(timezone.utc),
            "jti": secrets.token_urlsafe(16)
            # No expiration for API keys
        }
        
        # Encode the payload and append to API key
        token = jwt.encode(payload, self.config.secret_key, algorithm=self.config.algorithm)
        return f"{api_key}.{token}"
    
    def verify_token(self, token: str, token_type: Optional[TokenType] = None) -> Dict[str, Any]:
        """Verify and decode token"""
        try:
            # Check if token is blacklisted
            if token in self._blacklisted_tokens:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )
            
            # Handle API key format
            if token.startswith(self.config.api_key_prefix):
                if "." in token:
                    _, jwt_token = token.split(".", 1)
                    token = jwt_token
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid API key format"
                    )
            
            # Decode JWT
            payload = jwt.decode(
                token,
                self.config.secret_key,
                algorithms=[self.config.algorithm]
            )
            
            # Verify token type if specified
            if token_type and payload.get("type") != token_type.value:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {token_type.value}"
                )
            
            return payload
        
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    def blacklist_token(self, token: str):
        """Add token to blacklist"""
        self._blacklisted_tokens.add(token)
        logger.info("Token blacklisted")
    
    def hash_password(self, password: str) -> str:
        """Hash password"""
        return self.pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def validate_password(self, password: str) -> List[str]:
        """Validate password strength"""
        errors = []
        
        if len(password) < self.config.password_min_length:
            errors.append(f"Password must be at least {self.config.password_min_length} characters long")
        
        if self.config.password_require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.config.password_require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.config.password_require_numbers and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if self.config.password_require_special and not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
            errors.append("Password must contain at least one special character")
        
        return errors
    
    def check_login_attempts(self, identifier: str) -> bool:
        """Check if login attempts are within limits"""
        current_time = time.time()
        lockout_duration = self.config.lockout_duration_minutes * 60
        
        if identifier not in self._login_attempts:
            return True
        
        # Clean old attempts
        self._login_attempts[identifier] = [
            attempt_time for attempt_time in self._login_attempts[identifier]
            if current_time - attempt_time < lockout_duration
        ]
        
        return len(self._login_attempts[identifier]) < self.config.max_login_attempts
    
    def record_login_attempt(self, identifier: str, success: bool):
        """Record login attempt"""
        if success:
            # Clear failed attempts on successful login
            self._login_attempts.pop(identifier, None)
        else:
            # Record failed attempt
            if identifier not in self._login_attempts:
                self._login_attempts[identifier] = []
            self._login_attempts[identifier].append(time.time())


# Global JWT manager instance
_jwt_manager: Optional[JWTManager] = None
_supabase_auth_client: Optional[SupabaseAuthClient] = None


def _build_supabase_auth_client_from_settings() -> Optional[SupabaseAuthClient]:
    settings = get_settings()
    anon_key = reveal_secret(settings.supabase_anon_key)
    if settings.supabase_url and anon_key:
        return SupabaseAuthClient(settings.supabase_url, anon_key)
    return None


def get_jwt_manager() -> JWTManager:
    """Get global JWT manager instance"""
    global _jwt_manager
    if _jwt_manager is None:
        raise RuntimeError("JWT manager not initialized. Call setup_auth() first.")
    return _jwt_manager


def setup_auth(config: Optional[AuthConfig] = None) -> JWTManager:
    """Setup authentication system"""
    global _jwt_manager, _supabase_auth_client
    
    if config is None:
        config = create_auth_config_from_env()
    
    _jwt_manager = JWTManager(config)
    _supabase_auth_client = _build_supabase_auth_client_from_settings()
    logger.info("Authentication system initialized")
    
    return _jwt_manager


def get_supabase_auth_client() -> Optional[SupabaseAuthClient]:
    global _supabase_auth_client
    if _supabase_auth_client is None:
        _supabase_auth_client = _build_supabase_auth_client_from_settings()
    return _supabase_auth_client


def create_auth_config_from_env() -> AuthConfig:
    """Create auth configuration from environment variables"""
    import os
    from .secrets import get_secrets_provider
    
    provider = get_secrets_provider()
    
    # Safely extract secret
    jwt_secret_val = provider.get_secret("AUTH_SECRET_KEY") or provider.get_secret("JWT_SECRET")
    
    return AuthConfig(
        secret_key=jwt_secret_val.get_secret_value() if jwt_secret_val else "",
        algorithm=os.getenv("AUTH_ALGORITHM", "HS256"),
        access_token_expire_minutes=int(os.getenv("AUTH_ACCESS_TOKEN_EXPIRE_MINUTES", "30")),
        refresh_token_expire_days=int(os.getenv("AUTH_REFRESH_TOKEN_EXPIRE_DAYS", "7")),
        password_min_length=int(os.getenv("AUTH_PASSWORD_MIN_LENGTH", "8")),
        max_login_attempts=int(os.getenv("AUTH_MAX_LOGIN_ATTEMPTS", "5")),
        lockout_duration_minutes=int(os.getenv("AUTH_LOCKOUT_DURATION_MINUTES", "15")),
        require_email_verification=os.getenv("AUTH_REQUIRE_EMAIL_VERIFICATION", "true").lower() == "true",
        api_key_prefix=os.getenv("AUTH_API_KEY_PREFIX", "oc_"),
        api_key_length=int(os.getenv("AUTH_API_KEY_LENGTH", "32"))
    )

# FastAPI dependencies
security = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[User]:
    """Get current authenticated user"""
    jwt_manager = get_jwt_manager()
    
    token = None
    
    # Try to get token from Authorization header
    if credentials:
        token = credentials.credentials
    
    # Try to get API key from X-API-Key header
    if not token:
        api_key = request.headers.get("X-API-Key")
        if api_key:
            token = api_key
    
    if not token:
        return None
    
    try:
        payload = jwt_manager.verify_token(token)
        
        # Create user from token payload
        user = User(
            id=payload["sub"],
            email=payload.get("email", ""),
            username=payload.get("username"),
            role=UserRole(payload.get("role", "user")),
            is_active=True,
            is_verified=True,
            metadata=payload.get("metadata", {}) or {},
        )
        
        return user
    
    except HTTPException as exc:
        supabase_client = get_supabase_auth_client()
        if supabase_client is None:
            logger.warning("auth_token_rejected_without_supabase_fallback", extra={"path": str(request.url.path)})
            return None
        try:
            payload = await supabase_client.get_user(token)
            settings = get_settings()
            user_metadata = payload.get("user_metadata") or {}
            app_metadata = payload.get("app_metadata") or {}
            email = (payload.get("email") or "").strip().lower()
            owner_email_match = email in settings.owner_emails_list
            root_admin_match = email in settings.root_admin_emails_list
            display_name = (
                user_metadata.get("display_name")
                or user_metadata.get("full_name")
                or user_metadata.get("name")
                or email.split("@")[0]
                or "Creator"
            )
            metadata: Dict[str, Any] = {
                "owner_mode": bool(app_metadata.get("owner_mode") or user_metadata.get("owner_mode") or owner_email_match),
                "root_admin": bool(app_metadata.get("root_admin") or user_metadata.get("root_admin") or root_admin_match),
                "local_access": bool(app_metadata.get("local_access") or user_metadata.get("local_access") or owner_email_match),
                "username": (user_metadata.get("username") or email.split("@")[0] or "").strip().lower(),
                "accepted_terms": bool(user_metadata.get("accepted_terms")),
                "accepted_privacy": bool(user_metadata.get("accepted_privacy")),
                "accepted_usage_policy": bool(user_metadata.get("accepted_usage_policy")),
                "marketing_opt_in": bool(user_metadata.get("marketing_opt_in")),
                "supabase": True,
            }
            return User(
                id=payload["id"],
                email=email,
                username=display_name,
                role=UserRole.ADMIN if metadata["owner_mode"] else UserRole.USER,
                is_active=True,
                is_verified=bool(payload.get("email_confirmed_at") or payload.get("confirmed_at")),
                metadata=metadata,
            )
        except SupabaseAuthError as supabase_exc:
            token_preview = f"{token[:12]}..." if token else "missing"
            logger.debug(
                "auth_supabase_token_rejected",
                extra={
                    "path": str(request.url.path),
                    "jwt_rejection": exc.detail,
                    "supabase_rejection": str(supabase_exc),
                    "token_preview": token_preview,
                },
            )
            return None


async def require_auth(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    """Require authentication"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    
    return current_user


def require_role(required_role: UserRole):
    """Require specific role"""
    async def role_checker(current_user: User = Depends(require_auth)) -> User:
        if current_user.role != required_role and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role.value}' required"
            )
        return current_user
    
    return role_checker


def require_permission(permission: str):
    """Require specific permission"""
    async def permission_checker(current_user: User = Depends(require_auth)) -> User:
        if not current_user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return current_user
    
    return permission_checker


# Convenience functions

def create_user_tokens(user: User) -> Dict[str, str]:
    """Create access and refresh tokens for user"""
    jwt_manager = get_jwt_manager()
    
    access_token = jwt_manager.create_access_token(user)
    refresh_token = jwt_manager.create_refresh_token(user)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


def refresh_access_token(refresh_token: str) -> str:
    """Refresh access token using refresh token"""
    jwt_manager = get_jwt_manager()
    
    # Verify refresh token
    payload = jwt_manager.verify_token(refresh_token, TokenType.REFRESH)
    
    # Create new access token
    user = User(
        id=payload["sub"],
        email="",  # Email not stored in refresh token
        role=UserRole.USER  # Default role, should be fetched from database
    )
    
    return jwt_manager.create_access_token(user)
