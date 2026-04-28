from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, Depends, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import asyncio
import jwt
import hashlib
import logging
from passlib.context import CryptContext
from passlib.hash import bcrypt
import secrets
import time
from enum import Enum
from config.env import get_settings, reveal_secret_with_audit
from observability.context import bind_identity_id
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

    def _extract_jwt_token(self, token: str) -> str:
        candidate = str(token or "").strip()
        if candidate.startswith(self.config.api_key_prefix):
            if "." not in candidate:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API key format"
                )
            _, jwt_token = candidate.split(".", 1)
            return jwt_token
        return candidate

    def _token_revocation_keys(self, payload: Dict[str, Any]) -> set[str]:
        keys: set[str] = set()
        session_id = str(payload.get("session_id") or "").strip()
        jti = str(payload.get("jti") or "").strip()
        if session_id:
            keys.add(f"session:{session_id}")
        if jti:
            keys.add(f"jti:{jti}")
        return keys
    
    def create_access_token(
        self,
        user: User,
        expires_delta: Optional[timedelta] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """Create access token"""
        issued_at = datetime.now(timezone.utc)
        if expires_delta:
            expire = issued_at + expires_delta
        else:
            expire = issued_at + timedelta(minutes=self.config.access_token_expire_minutes)
        
        payload = {
            "sub": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "metadata": user.metadata,
            "type": TokenType.ACCESS.value,
            "exp": expire,
            "iat": issued_at,
            "session_id": str(session_id or "").strip() or secrets.token_urlsafe(16),
            "jti": secrets.token_urlsafe(16),
        }
        
        return jwt.encode(payload, self.config.secret_key, algorithm=self.config.algorithm)
    
    def create_refresh_token(
        self,
        user: User,
        expires_delta: Optional[timedelta] = None,
        session_id: Optional[str] = None,
    ) -> str:
        """Create refresh token"""
        issued_at = datetime.now(timezone.utc)
        if expires_delta:
            expire = issued_at + expires_delta
        else:
            expire = issued_at + timedelta(days=self.config.refresh_token_expire_days)
        
        payload = {
            "sub": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role.value,
            "metadata": user.metadata,
            "type": TokenType.REFRESH.value,
            "exp": expire,
            "iat": issued_at,
            "session_id": str(session_id or "").strip() or secrets.token_urlsafe(16),
            "jti": secrets.token_urlsafe(16),
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
            normalized_token = self._extract_jwt_token(token)

            if token in self._blacklisted_tokens or normalized_token in self._blacklisted_tokens:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
                )

            # Decode JWT
            payload = jwt.decode(
                normalized_token,
                self.config.secret_key,
                algorithms=[self.config.algorithm]
            )

            if any(key in self._blacklisted_tokens for key in self._token_revocation_keys(payload)):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has been revoked"
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
        normalized_token = self._extract_jwt_token(token)
        self._blacklisted_tokens.add(token)
        self._blacklisted_tokens.add(normalized_token)
        try:
            payload = jwt.decode(
                normalized_token,
                self.config.secret_key,
                algorithms=[self.config.algorithm],
                options={"verify_exp": False},
            )
        except jwt.InvalidTokenError:
            payload = {}
        if isinstance(payload, dict):
            self._blacklisted_tokens.update(self._token_revocation_keys(payload))
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
_supabase_user_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}
_supabase_user_cache_locks: Dict[str, asyncio.Lock] = {}


def _build_supabase_auth_client_from_settings() -> Optional[SupabaseAuthClient]:
    settings = get_settings()
    anon_key = reveal_secret_with_audit("SUPABASE_ANON_KEY", settings.supabase_anon_key)
    if settings.supabase_url and anon_key:
        return SupabaseAuthClient(settings.supabase_url, anon_key)
    return None


def get_jwt_manager() -> JWTManager:
    """Get global JWT manager instance"""
    global _jwt_manager
    if _jwt_manager is None:
        raise RuntimeError("JWT manager not initialized. Call setup_auth() first.")
    return _jwt_manager


def get_auth_security_settings() -> tuple[int, int]:
    global _jwt_manager
    if _jwt_manager is not None:
        return _jwt_manager.config.max_login_attempts, _jwt_manager.config.lockout_duration_minutes

    import os

    return (
        int(os.getenv("AUTH_MAX_LOGIN_ATTEMPTS", "5")),
        int(os.getenv("AUTH_LOCKOUT_DURATION_MINUTES", "15")),
    )


def setup_auth(config: Optional[AuthConfig] = None) -> JWTManager:
    """Setup authentication system"""
    global _jwt_manager, _supabase_auth_client
    
    if config is None:
        config = create_auth_config_from_env()
    
    _jwt_manager = JWTManager(config)
    _supabase_auth_client = _build_supabase_auth_client_from_settings()
    _clear_supabase_user_cache()
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


def _normalize_auth_provider_name(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    return normalized or None


def _append_auth_provider(providers: list[str], value: Any) -> None:
    normalized = _normalize_auth_provider_name(value)
    if normalized and normalized not in providers:
        providers.append(normalized)


def _extract_supabase_auth_provider_context(payload: Dict[str, Any]) -> tuple[str | None, list[str]]:
    app_metadata = payload.get("app_metadata") or {}
    providers: list[str] = []

    _append_auth_provider(providers, app_metadata.get("provider"))

    configured_providers = app_metadata.get("providers")
    if isinstance(configured_providers, list):
        for provider_name in configured_providers:
            _append_auth_provider(providers, provider_name)

    identities = payload.get("identities")
    if isinstance(identities, list):
        for identity in identities:
            if not isinstance(identity, dict):
                continue
            _append_auth_provider(providers, identity.get("provider"))
            identity_data = identity.get("identity_data") or {}
            if isinstance(identity_data, dict):
                _append_auth_provider(providers, identity_data.get("provider"))

    primary_provider = providers[0] if providers else None
    if primary_provider is None and payload.get("email"):
        primary_provider = "email"
        providers = ["email"]

    return primary_provider, providers


def extract_unverified_session_context(token: str | None) -> Dict[str, Any]:
    candidate = str(token or "").strip()
    if not candidate:
        return {
            "session_id": None,
            "session_issued_at": None,
            "session_expires_at": None,
            "claims": {},
        }

    try:
        payload = jwt.decode(
            candidate,
            options={
                "verify_signature": False,
                "verify_exp": False,
                "verify_aud": False,
                "verify_iss": False,
            },
        )
    except jwt.PyJWTError:
        payload = {}

    if not isinstance(payload, dict):
        payload = {}

    session_id = str(payload.get("session_id") or payload.get("jti") or "").strip()
    if not session_id:
        session_id = hashlib.sha256(candidate.encode("utf-8")).hexdigest()[:32]

    return {
        "session_id": session_id,
        "session_issued_at": payload.get("iat"),
        "session_expires_at": payload.get("exp"),
        "claims": payload,
    }


def _token_fingerprint(token: str | None) -> str | None:
    candidate = str(token or "").strip()
    if not candidate:
        return None
    return hashlib.sha256(candidate.encode("utf-8")).hexdigest()[:16]


def _clear_supabase_user_cache() -> None:
    _supabase_user_cache.clear()
    _supabase_user_cache_locks.clear()


def _supabase_user_cache_key(token: str) -> str:
    return hashlib.sha256(str(token or "").encode("utf-8")).hexdigest()


def _supabase_user_cache_expiry(token: str, ttl_seconds: float) -> float:
    now = time.time()
    expiry = now + max(0.0, ttl_seconds)
    session_context = extract_unverified_session_context(token)
    token_expires_at = session_context.get("session_expires_at")
    if isinstance(token_expires_at, (int, float)) and token_expires_at > 0:
        expiry = min(expiry, float(token_expires_at))
    return expiry


def _prune_supabase_user_cache(now: float) -> None:
    stale_keys = [
        key for key, (expires_at, _) in _supabase_user_cache.items()
        if expires_at <= now
    ]
    for key in stale_keys:
        _supabase_user_cache.pop(key, None)
        _supabase_user_cache_locks.pop(key, None)


async def _get_supabase_user_payload(
    supabase_client: SupabaseAuthClient,
    token: str,
) -> dict[str, Any]:
    settings = get_settings()
    ttl_seconds = max(0.0, float(getattr(settings, "supabase_auth_user_cache_ttl_seconds", 0.0) or 0.0))
    if ttl_seconds <= 0:
        return await supabase_client.get_user(token)

    now = time.time()
    _prune_supabase_user_cache(now)
    cache_key = _supabase_user_cache_key(token)
    cached = _supabase_user_cache.get(cache_key)
    if cached and cached[0] > now:
        return dict(cached[1])

    lock = _supabase_user_cache_locks.setdefault(cache_key, asyncio.Lock())
    async with lock:
        now = time.time()
        cached = _supabase_user_cache.get(cache_key)
        if cached and cached[0] > now:
            return dict(cached[1])

        payload = await supabase_client.get_user(token)
        expires_at = _supabase_user_cache_expiry(token, ttl_seconds)
        if expires_at > time.time():
            _supabase_user_cache[cache_key] = (expires_at, dict(payload))
        return dict(payload)


def _get_studio_service_from_request(request: Request):
    app = request.scope.get("app")
    state = getattr(app, "state", None)
    return getattr(state, "studio_service", None)


def _bind_authenticated_identity_context(request: Request, identity_id: str) -> None:
    normalized_identity_id = str(identity_id or "").strip()
    bind_identity_id(normalized_identity_id)
    request.state.identity_id = normalized_identity_id


async def _enforce_persistent_session(
    request: Request,
    *,
    identity_id: str,
    session_metadata: Dict[str, Any],
) -> None:
    service = _get_studio_service_from_request(request)
    if service is None:
        return

    session_id = str(session_metadata.get("session_id") or "").strip() or None
    if session_id is None:
        return

    if await service.is_access_session_active(identity_id=identity_id, session_id=session_id):
        return

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session has been revoked",
    )


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
    except HTTPException as exc:
        supabase_client = get_supabase_auth_client()
        if supabase_client is None:
            logger.warning("auth_token_rejected_without_supabase_fallback", extra={"path": str(request.url.path)})
            return None
        try:
            payload = await _get_supabase_user_payload(supabase_client, token)
            settings = get_settings()
            user_metadata = payload.get("user_metadata") or {}
            app_metadata = payload.get("app_metadata") or {}
            email = (payload.get("email") or "").strip().lower()
            auth_provider, auth_providers = _extract_supabase_auth_provider_context(payload)
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
                "accepted_terms_at": user_metadata.get("accepted_terms_at"),
                "terms_version": user_metadata.get("terms_version"),
                "accepted_privacy": bool(user_metadata.get("accepted_privacy")),
                "accepted_privacy_at": user_metadata.get("accepted_privacy_at"),
                "privacy_version": user_metadata.get("privacy_version"),
                "accepted_usage_policy": bool(user_metadata.get("accepted_usage_policy")),
                "accepted_usage_policy_at": user_metadata.get("accepted_usage_policy_at"),
                "usage_policy_version": user_metadata.get("usage_policy_version"),
                "marketing_opt_in": bool(user_metadata.get("marketing_opt_in")),
                "marketing_opt_in_at": user_metadata.get("marketing_opt_in_at"),
                "marketing_consent_version": user_metadata.get("marketing_consent_version"),
                "auth_provider": auth_provider,
                "auth_providers": auth_providers,
                "supabase": True,
            }
            metadata.update(extract_unverified_session_context(token))
            await _enforce_persistent_session(
                request,
                identity_id=payload["id"],
                session_metadata=metadata,
            )
            _bind_authenticated_identity_context(request, payload["id"])
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
            logger.debug(
                "auth_supabase_token_rejected",
                extra={
                    "path": str(request.url.path),
                    "jwt_rejection": exc.detail,
                    "supabase_rejection": str(supabase_exc),
                    "token_fingerprint": _token_fingerprint(token),
                },
            )
            return None
    else:
        metadata = payload.get("metadata", {}) or {}
        if isinstance(metadata, dict):
            metadata = dict(metadata)
        else:
            metadata = {}
        metadata.update(extract_unverified_session_context(token))

        await _enforce_persistent_session(
            request,
            identity_id=payload["sub"],
            session_metadata=metadata,
        )
        _bind_authenticated_identity_context(request, payload["sub"])

        return User(
            id=payload["sub"],
            email=payload.get("email", ""),
            username=payload.get("username"),
            role=UserRole(payload.get("role", "user")),
            is_active=True,
            is_verified=True,
            metadata=metadata,
        )


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
    session_id = secrets.token_urlsafe(16)

    access_token = jwt_manager.create_access_token(user, session_id=session_id)
    refresh_token = jwt_manager.create_refresh_token(user, session_id=session_id)
    
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
        email=str(payload.get("email") or "").strip(),
        username=payload.get("username"),
        role=UserRole(str(payload.get("role") or UserRole.USER.value)),
        metadata=payload.get("metadata") if isinstance(payload.get("metadata"), dict) else {},
    )

    return jwt_manager.create_access_token(user, session_id=str(payload.get("session_id") or "").strip() or None)
