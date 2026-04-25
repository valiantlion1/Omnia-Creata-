from __future__ import annotations
from dataclasses import replace
from datetime import datetime, timedelta, timezone
import hmac
import hashlib
import ipaddress
import json
import time
from typing import Annotated, Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from config.feature_flags import FEATURE_FLAGS, FLAG_STRICT_INPUT_SANITIZATION
from config.env import Environment, get_settings, reveal_secret_with_audit
from config.runtime_topology import generation_broker_ready_for_runtime
from security.auth import (
    User,
    UserRole,
    create_user_tokens,
    extract_unverified_session_context,
    get_auth_security_settings,
    get_current_user,
    get_supabase_auth_client,
    _extract_supabase_auth_provider_context,
)
from security.auth import User as AuthUser
from security.captcha import (
    CaptchaConfigurationError,
    CaptchaServiceError,
    CaptchaVerificationError,
    verify_captcha_token,
)
from security.rate_limit import RateLimiter
from security.sanitize import sanitize_prompt
from security.supabase_auth import SupabaseAuthError, SupabaseAuthUnavailableError
from security.moderation import ModerationAction, PromptModerationDecision, check_prompt_safety, ModerationResult

from .asset_storage import AssetStorageError
from .experience_contract_ops import attach_chat_experience
from .models import (
    ChatAttachment,
    ChatConversation,
    ChatFeedback,
    ChatMessage,
    CheckoutKind,
    GenerationJob,
    IdentityPlan,
    ModerationCaseSource,
    ModerationCaseStatus,
    ModerationCaseSubject,
    ModerationVisibilityEffect,
    PublicPost,
    Visibility,
    StudioPersona,
)
from .models.identity import MARKETING_CONSENT_VERSION, PRIVACY_VERSION, TERMS_VERSION, USAGE_POLICY_VERSION
from .service import DeletedIdentityError, GenerationCapacityError, PRESET_CATALOG, PLAN_CATALOG, StudioService
from .studio_model_contract import STUDIO_FAST_MODEL_ID


ValidatedEmail = Annotated[EmailStr, Field(max_length=320)]


def _sanitize_prompt_field(value: str | None) -> str | None:
    if value is None or not FEATURE_FLAGS.is_enabled(FLAG_STRICT_INPUT_SANITIZATION):
        return value
    return sanitize_prompt(value)


class DemoLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: ValidatedEmail = "creator@omnia.local"
    display_name: str = Field(default="Creator")
    plan: IdentityPlan = Field(default=IdentityPlan.FREE)


class ProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)
    surface: Literal["compose", "chat"] = "compose"


class ProjectUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=2000)


class StyleSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=72)
    prompt_modifier: str = Field(min_length=1, max_length=1200)
    text_mode: Literal["modifier", "prompt"] = "modifier"
    description: str = Field(default="", max_length=240)
    category: str = Field(default="custom", max_length=40)
    preview_image_url: Optional[str] = None
    negative_prompt: str = Field(default="", max_length=2000)
    preferred_model_id: Optional[str] = Field(default=None, max_length=120)
    preferred_aspect_ratio: Optional[str] = Field(default=None, max_length=20)
    preferred_steps: Optional[int] = Field(default=None, ge=1, le=50)
    preferred_cfg_scale: Optional[float] = Field(default=None, ge=1, le=20)
    preferred_output_count: Optional[int] = Field(default=None, ge=1, le=4)
    source_kind: str = Field(default="saved", max_length=24)
    source_style_id: Optional[str] = Field(default=None, max_length=80)
    favorite: bool = False

    _sanitize_prompt_fields = field_validator("negative_prompt")(_sanitize_prompt_field)


class StyleUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    favorite: Optional[bool] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=72)
    prompt_modifier: Optional[str] = Field(default=None, min_length=1, max_length=1200)
    text_mode: Optional[Literal["modifier", "prompt"]] = None
    description: Optional[str] = Field(default=None, max_length=240)
    category: Optional[str] = Field(default=None, max_length=40)
    preview_image_url: Optional[str] = None
    negative_prompt: Optional[str] = Field(default=None, max_length=2000)
    preferred_model_id: Optional[str] = Field(default=None, max_length=120)
    preferred_aspect_ratio: Optional[str] = Field(default=None, max_length=20)
    preferred_steps: Optional[int] = Field(default=None, ge=1, le=50)
    preferred_cfg_scale: Optional[float] = Field(default=None, ge=1, le=20)
    preferred_output_count: Optional[int] = Field(default=None, ge=1, le=4)

    _sanitize_prompt_fields = field_validator("negative_prompt")(_sanitize_prompt_field)


class StyleFromPromptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=2000)
    title: Optional[str] = Field(default=None, max_length=72)
    category: str = Field(default="custom", max_length=40)
    negative_prompt: str = Field(default="", max_length=2000)
    preferred_model_id: Optional[str] = Field(default=None, max_length=120)
    preferred_aspect_ratio: Optional[str] = Field(default=None, max_length=20)
    preferred_steps: Optional[int] = Field(default=None, ge=1, le=50)
    preferred_cfg_scale: Optional[float] = Field(default=None, ge=1, le=20)
    preferred_output_count: Optional[int] = Field(default=None, ge=1, le=4)
    preview_image_url: Optional[str] = None

    _sanitize_prompt_fields = field_validator("prompt", "negative_prompt")(_sanitize_prompt_field)


class SupabaseSignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: ValidatedEmail
    password: str = Field(min_length=8, max_length=256)
    display_name: str = Field(default="Omnia User", max_length=120)
    username: str = Field(min_length=3, max_length=32)
    captcha_token: Optional[str] = Field(default=None, max_length=4096)
    accepted_terms: bool
    accepted_privacy: bool
    accepted_usage_policy: bool
    marketing_opt_in: bool = False


class SupabaseLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: ValidatedEmail
    password: str = Field(min_length=8, max_length=256)
    captcha_token: Optional[str] = Field(default=None, max_length=4096)


class PromptImproveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=1600)

    _sanitize_prompt_fields = field_validator("prompt")(_sanitize_prompt_field)


class GenerationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str
    prompt: str = Field(min_length=1, max_length=2000)
    negative_prompt: str = Field(default="", max_length=500)
    reference_asset_id: Optional[str] = None
    model: str = STUDIO_FAST_MODEL_ID
    width: Optional[int] = Field(default=None, ge=512, le=4096)
    height: Optional[int] = Field(default=None, ge=512, le=4096)
    steps: int = Field(default=28, ge=1, le=50)
    cfg_scale: float = Field(default=6.5, ge=1, le=20)
    seed: int = Field(default=20260316, ge=0, le=2**32 - 1)
    aspect_ratio: str = "1:1"
    output_count: int = Field(default=1, ge=1, le=4)

    _sanitize_prompt_fields = field_validator("prompt", "negative_prompt")(_sanitize_prompt_field)


class ShareCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: Optional[str] = Field(default=None, max_length=128)
    asset_id: Optional[str] = Field(default=None, max_length=128)


class BillingCheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: CheckoutKind


class ConversationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="", max_length=200)
    model: str = Field(default="studio-assist", max_length=64)


class ChatMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(default="", max_length=2400)
    model: Optional[str] = None
    attachments: list[ChatAttachment] = Field(default_factory=list, max_length=4)


class ChatMessageEditRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(default="", max_length=2400)
    model: Optional[str] = None
    attachments: list[ChatAttachment] = Field(default_factory=list, max_length=4)


class ChatFeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    feedback: Optional[Literal["like", "dislike"]] = None


class AssetRenameRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=72)


class AssetImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str
    data_url: str = Field(min_length=32, max_length=5_000_000)
    title: str = Field(default="Reference upload", min_length=1, max_length=72)


class PostUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Optional[str] = Field(default=None, min_length=1, max_length=72)
    visibility: Optional[Visibility] = None


class PostMoveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str = Field(max_length=128)


class PostReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason_code: str = Field(min_length=2, max_length=64)
    detail: str = Field(default="", max_length=1200)


class ModerationAppealRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    linked_case_id: Optional[str] = Field(default=None, max_length=128)
    subject: Optional[ModerationCaseSubject] = None
    subject_id: Optional[str] = Field(default=None, max_length=128)
    reason_code: str = Field(default="appeal", min_length=2, max_length=64)
    detail: str = Field(default="", max_length=1200)


class ModerationCaseResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: ModerationCaseStatus
    resolution_note: str = Field(min_length=1, max_length=1200)
    visibility_effect: Optional[ModerationVisibilityEffect] = None


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=220)
    default_visibility: Optional[Visibility] = None
    featured_asset_id: Optional[str] = Field(default=None, max_length=128)
    featured_asset_position: Optional[str] = Field(default=None, pattern="^(top|center|bottom)$")


class PersonaCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(default="New Persona", min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    system_prompt: str = Field(min_length=1, max_length=12000)
    avatar_url: Optional[str] = Field(default=None, max_length=1000)

    _sanitize_prompt_fields = field_validator("system_prompt")(_sanitize_prompt_field)


def create_router(service: StudioService, rate_limiter: RateLimiter) -> APIRouter:
    router = APIRouter(prefix="/v1", tags=["studio"])
    settings = get_settings()

    def _require_auth(auth_user: Optional[AuthUser]) -> AuthUser:
        if auth_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        return auth_user

    def _raise_deleted_identity_session(exc: DeletedIdentityError) -> None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This session belongs to an account that has been permanently deleted.",
        ) from exc

    def _identity_consent_kwargs(
        metadata: Dict[str, Any],
        *,
        defaults: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        fallback = defaults or {}
        return {
            "accepted_terms": bool(metadata.get("accepted_terms", fallback.get("accepted_terms", False))),
            "accepted_terms_at": metadata.get("accepted_terms_at") or fallback.get("accepted_terms_at"),
            "terms_version": metadata.get("terms_version") or fallback.get("terms_version"),
            "accepted_privacy": bool(metadata.get("accepted_privacy", fallback.get("accepted_privacy", False))),
            "accepted_privacy_at": metadata.get("accepted_privacy_at") or fallback.get("accepted_privacy_at"),
            "privacy_version": metadata.get("privacy_version") or fallback.get("privacy_version"),
            "accepted_usage_policy": bool(
                metadata.get("accepted_usage_policy", fallback.get("accepted_usage_policy", False))
            ),
            "accepted_usage_policy_at": metadata.get("accepted_usage_policy_at") or fallback.get("accepted_usage_policy_at"),
            "usage_policy_version": metadata.get("usage_policy_version") or fallback.get("usage_policy_version"),
            "marketing_opt_in": bool(metadata.get("marketing_opt_in", fallback.get("marketing_opt_in", False))),
            "marketing_opt_in_at": metadata.get("marketing_opt_in_at") or fallback.get("marketing_opt_in_at"),
            "marketing_consent_version": metadata.get("marketing_consent_version")
            or fallback.get("marketing_consent_version"),
        }

    async def _ensure_identity_for_auth_user(auth_user: Optional[AuthUser], request: Request | None = None) -> AuthUser:
        current = _require_auth(auth_user)
        metadata = getattr(current, "metadata", {}) or {}
        try:
            await service.ensure_identity(
                user_id=current.id,
                email=current.email or f"{current.id}@omnia.local",
                display_name=getattr(current, "username", None) or current.email or "Omnia User",
                username=metadata.get("username") or None,
                **_identity_consent_kwargs(metadata),
            )
        except DeletedIdentityError as exc:
            _raise_deleted_identity_session(exc)
        if request is not None:
            await _touch_access_session(request, current)
        return current

    async def _require_owner(auth_user: Optional[AuthUser]) -> AuthUser:
        current = _require_auth(auth_user)
        await _ensure_identity_for_auth_user(current)
        try:
            identity = await service.get_identity(current.id)
        except KeyError:
            identity = None
        if identity is None or not (identity.owner_mode or identity.root_admin or identity.local_access):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner access required")
        return current

    def _serialize_generation(job: GenerationJob, identity_id: str) -> dict:
        return service.serialize_generation_for_identity(job, identity_id)

    def _serialize_conversation(conversation: ChatConversation) -> dict:
        return {
            "id": conversation.id,
            "workspace_id": conversation.workspace_id,
            "identity_id": conversation.identity_id,
            "title": conversation.title,
            "model": conversation.model,
            "message_count": conversation.message_count,
            "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat(),
        }

    def _serialize_chat_message(message: ChatMessage) -> dict:
        metadata = dict(message.metadata)
        if message.role.value == "assistant":
            metadata = attach_chat_experience(metadata)
        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "identity_id": message.identity_id,
            "role": message.role.value,
            "content": message.content,
            "parent_message_id": message.parent_message_id,
            "attachments": [attachment.model_dump(mode="json") for attachment in message.attachments],
            "suggested_actions": [action.model_dump(mode="json") for action in message.suggested_actions],
            "feedback": message.feedback.value if message.feedback else None,
            "metadata": metadata,
            "version": message.version,
            "created_at": message.created_at.isoformat(),
            "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        }

    def _build_client_key(request: Request, scope: str, identifier: Optional[str] = None) -> str:
        if identifier is not None:
            return f"{scope}:{identifier}"
        client_host = _request_client_ip(request) or "unknown"
        return f"{scope}:{client_host}"

    def _normalize_forwarded_ip(value: str | None) -> str | None:
        candidate = str(value or "").strip()
        if not candidate:
            return None
        try:
            return str(ipaddress.ip_address(candidate))
        except ValueError:
            return None

    def _request_client_ip(request: Request) -> str | None:
        client_host = request.client.host if request.client else None

        trusted_proxy = False
        if client_host:
            try:
                parsed = ipaddress.ip_address(client_host)
            except ValueError:
                trusted_proxy = client_host in {"localhost", "testclient"}
            else:
                trusted_proxy = parsed.is_private or parsed.is_loopback

        if trusted_proxy:
            for header_name in ("cf-connecting-ip", "x-forwarded-for", "x-real-ip"):
                raw_value = str(request.headers.get(header_name) or "").strip()
                if not raw_value:
                    continue
                candidate = _normalize_forwarded_ip(raw_value.split(",")[0].strip())
                if candidate:
                    return candidate
        normalized_client_host = _normalize_forwarded_ip(client_host)
        if normalized_client_host:
            return normalized_client_host
        return client_host

    async def _touch_access_session(request: Request, auth_user: AuthUser) -> None:
        metadata = getattr(auth_user, "metadata", {}) or {}
        await service.record_access_session(
            identity_id=auth_user.id,
            session_id=str(metadata.get("session_id") or "").strip() or None,
            auth_provider=str(metadata.get("auth_provider") or "").strip() or None,
            user_agent=request.headers.get("user-agent"),
            client_ip=_request_client_ip(request),
            host_label=request.headers.get("host"),
            display_mode=request.headers.get("x-omnia-client-display-mode"),
            token_issued_at=metadata.get("session_issued_at"),
            token_expires_at=metadata.get("session_expires_at"),
        )

    async def _consume_rate_limit(
        request: Request,
        scope: str,
        limit: int,
        identifier: Optional[str] = None,
        window_seconds: int = 60,
    ) -> None:
        decision = await rate_limiter.check(
            _build_client_key(request, scope, identifier),
            limit=limit,
            window_seconds=window_seconds,
        )
        if decision.allowed:
            return
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please slow down and try again.",
            headers={
                "Retry-After": str(decision.retry_after),
                "X-RateLimit-Limit": str(decision.limit),
                "X-RateLimit-Remaining": str(decision.remaining),
                "X-RateLimit-Reset": str(decision.retry_after),
            },
        )

    async def _consume_generation_rate_limits(request: Request, auth_user: AuthUser) -> None:
        normalized_email = (auth_user.email or "").strip().lower()
        privileged_emails = set(settings.owner_emails_list) | set(settings.root_admin_emails_list)
        if normalized_email in privileged_emails:
            return
        await _consume_rate_limit(
            request,
            "generation:create:user",
            limit=10,
            identifier=auth_user.id,
        )
        await _consume_rate_limit(
            request,
            "generation:create:ip",
            limit=20,
        )

    def _require_verified_generation_account(auth_user: AuthUser) -> None:
        if auth_user.is_verified:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Verify your email address before creating generations.",
        )

    async def _enforce_persistent_login_lockout(identifier: str | None) -> None:
        max_login_attempts, lockout_duration_minutes = get_auth_security_settings()
        if max_login_attempts <= 0 or lockout_duration_minutes <= 0:
            return
        status_payload = await service.get_login_lockout_status(
            identifier=identifier,
            max_attempts=max_login_attempts,
            lockout_window=timedelta(minutes=lockout_duration_minutes),
        )
        if status_payload is None:
            return
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please wait and try again.",
            headers={"Retry-After": str(status_payload["retry_after_seconds"])},
        )

    async def _record_login_result(identifier: str | None, *, success: bool) -> None:
        _, lockout_duration_minutes = get_auth_security_settings()
        if lockout_duration_minutes <= 0:
            return
        await service.record_login_result(
            identifier=identifier,
            success=success,
            lockout_window=timedelta(minutes=lockout_duration_minutes),
        )

    async def _require_auth_captcha(
        request: Request,
        *,
        token: str | None,
        action: Literal["signup", "login"],
    ) -> None:
        if (
            settings.environment in {Environment.STAGING, Environment.PRODUCTION}
            and settings.captcha_ready_for_sensitive_flows is not True
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="CAPTCHA verification is required for this environment but is not configured correctly.",
            )
        if settings.captcha_verification_enabled is not True:
            return
        try:
            await verify_captcha_token(
                token,
                remote_ip=_request_client_ip(request),
                action=action,
                settings=settings,
            )
        except CaptchaVerificationError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
        except (CaptchaConfigurationError, CaptchaServiceError) as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

    @router.post("/auth/demo-login")
    async def demo_login(payload: DemoLoginRequest, request: Request):
        if not settings.enable_demo_auth:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo auth is disabled")
        if settings.environment != Environment.DEVELOPMENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Demo login is only available in local development.",
            )
        await _consume_rate_limit(request, "auth:demo-login", limit=8)
        demo_user = User(
            id=payload.email.lower(),
            email=payload.email.lower(),
            username=payload.display_name,
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
            metadata={"owner_mode": False, "local_access": False},
        )
        identity = await service.ensure_identity(
            user_id=demo_user.id,
            email=demo_user.email,
            display_name=payload.display_name,
            desired_plan=payload.plan,
        )
        tokens = create_user_tokens(demo_user)
        session_context = extract_unverified_session_context(tokens["access_token"])
        await service.record_access_session(
            identity_id=identity.id,
            session_id=session_context.get("session_id"),
            auth_provider="demo",
            user_agent=request.headers.get("user-agent"),
            client_ip=_request_client_ip(request),
            host_label=request.headers.get("host"),
            display_mode=request.headers.get("x-omnia-client-display-mode"),
            token_issued_at=session_context.get("session_issued_at"),
            token_expires_at=session_context.get("session_expires_at"),
        )
        return {
            **tokens,
            "identity": service.serialize_identity(identity),
        }

    @router.post("/auth/local-owner-login")
    async def local_owner_login():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Local owner bypass has been removed. Use an approved admin account instead.",
        )

    @router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
    async def signup(payload: SupabaseSignupRequest, request: Request):
        await _consume_rate_limit(request, "auth:signup", limit=8)
        await _require_auth_captcha(request, token=payload.captcha_token, action="signup")
        if not (payload.accepted_terms and payload.accepted_privacy and payload.accepted_usage_policy):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Terms, privacy, and usage policy must be accepted.",
            )
        supabase_client = get_supabase_auth_client()
        if supabase_client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase auth is not configured")

        try:
            consent_recorded_at = datetime.now(timezone.utc).isoformat()
            signup_consent_defaults: Dict[str, Any] = {
                "accepted_terms": payload.accepted_terms,
                "accepted_terms_at": consent_recorded_at if payload.accepted_terms else None,
                "terms_version": TERMS_VERSION if payload.accepted_terms else None,
                "accepted_privacy": payload.accepted_privacy,
                "accepted_privacy_at": consent_recorded_at if payload.accepted_privacy else None,
                "privacy_version": PRIVACY_VERSION if payload.accepted_privacy else None,
                "accepted_usage_policy": payload.accepted_usage_policy,
                "accepted_usage_policy_at": consent_recorded_at if payload.accepted_usage_policy else None,
                "usage_policy_version": USAGE_POLICY_VERSION if payload.accepted_usage_policy else None,
                "marketing_opt_in": payload.marketing_opt_in,
                "marketing_opt_in_at": consent_recorded_at if payload.marketing_opt_in else None,
                "marketing_consent_version": MARKETING_CONSENT_VERSION if payload.marketing_opt_in else None,
            }
            session = await supabase_client.sign_up(
                email=payload.email.strip().lower(),
                password=payload.password,
                display_name=payload.display_name.strip() or "Omnia User",
                username=payload.username.strip().lower(),
                accepted_terms=payload.accepted_terms,
                accepted_privacy=payload.accepted_privacy,
                accepted_usage_policy=payload.accepted_usage_policy,
                marketing_opt_in=payload.marketing_opt_in,
                accepted_terms_at=signup_consent_defaults["accepted_terms_at"],
                terms_version=signup_consent_defaults["terms_version"],
                accepted_privacy_at=signup_consent_defaults["accepted_privacy_at"],
                privacy_version=signup_consent_defaults["privacy_version"],
                accepted_usage_policy_at=signup_consent_defaults["accepted_usage_policy_at"],
                usage_policy_version=signup_consent_defaults["usage_policy_version"],
                marketing_opt_in_at=signup_consent_defaults["marketing_opt_in_at"],
                marketing_consent_version=signup_consent_defaults["marketing_consent_version"],
            )
        except SupabaseAuthUnavailableError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
        except SupabaseAuthError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        user_data = session.user
        user_metadata = user_data.get("user_metadata") or {}
        display_name = (
            user_metadata.get("display_name")
            or payload.display_name.strip()
            or payload.email.split("@")[0]
            or "Omnia User"
        )
        identity = await service.ensure_identity(
            user_id=user_data["id"],
            email=user_data.get("email", payload.email.strip().lower()),
            display_name=display_name,
            username=(user_metadata.get("username") or payload.username).strip().lower(),
            desired_plan=IdentityPlan.FREE,
            **_identity_consent_kwargs(user_metadata, defaults=signup_consent_defaults),
        )
        session_context = extract_unverified_session_context(session.access_token)
        auth_provider, _ = _extract_supabase_auth_provider_context(user_data)
        await service.record_access_session(
            identity_id=identity.id,
            session_id=session_context.get("session_id"),
            auth_provider=auth_provider,
            user_agent=request.headers.get("user-agent"),
            client_ip=_request_client_ip(request),
            host_label=request.headers.get("host"),
            display_mode=request.headers.get("x-omnia-client-display-mode"),
            token_issued_at=session_context.get("session_issued_at"),
            token_expires_at=session_context.get("session_expires_at"),
        )
        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "token_type": session.token_type,
            "identity": service.serialize_identity(identity),
        }

    @router.post("/auth/login")
    async def login(payload: SupabaseLoginRequest, request: Request):
        await _consume_rate_limit(request, "auth:login", limit=12)
        await _require_auth_captcha(request, token=payload.captcha_token, action="login")
        normalized_email = payload.email.strip().lower()
        await _enforce_persistent_login_lockout(normalized_email)
        supabase_client = get_supabase_auth_client()
        if supabase_client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase auth is not configured")

        try:
            session = await supabase_client.sign_in(
                email=normalized_email,
                password=payload.password,
            )
        except SupabaseAuthUnavailableError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
        except SupabaseAuthError as exc:
            await _record_login_result(normalized_email, success=False)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

        await _record_login_result(normalized_email, success=True)

        user_data = session.user
        user_metadata = user_data.get("user_metadata") or {}
        display_name = (
            user_metadata.get("display_name")
            or user_data.get("email", normalized_email).split("@")[0]
            or "Omnia User"
        )
        identity = await service.ensure_identity(
            user_id=user_data["id"],
            email=user_data.get("email", normalized_email),
            display_name=display_name,
            username=(user_metadata.get("username") or user_data.get("email", "").split("@")[0]).strip().lower(),
            desired_plan=IdentityPlan.FREE,
            **_identity_consent_kwargs(user_metadata),
        )
        session_context = extract_unverified_session_context(session.access_token)
        auth_provider, _ = _extract_supabase_auth_provider_context(user_data)
        await service.record_access_session(
            identity_id=identity.id,
            session_id=session_context.get("session_id"),
            auth_provider=auth_provider,
            user_agent=request.headers.get("user-agent"),
            client_ip=_request_client_ip(request),
            host_label=request.headers.get("host"),
            display_mode=request.headers.get("x-omnia-client-display-mode"),
            token_issued_at=session_context.get("session_issued_at"),
            token_expires_at=session_context.get("session_expires_at"),
        )
        return {
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "token_type": session.token_type,
            "identity": service.serialize_identity(identity),
        }

    @router.get("/public/plans")
    async def get_public_plans():
        return service.get_public_plan_payload()

    @router.get("/auth/me")
    async def get_me(request: Request, current_user: Optional[AuthUser] = Depends(get_current_user)):
        if current_user is None:
            has_auth_header = bool(request.headers.get("authorization") or request.headers.get("x-api-key"))
            if has_auth_header:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session")
        if current_user is not None:
            await _touch_access_session(request, current_user)
        try:
            return await service.get_public_identity(current_user)
        except DeletedIdentityError as exc:
            _raise_deleted_identity_session(exc)

    @router.get("/admin/telemetry")
    async def admin_telemetry(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _require_owner(current_user)
        await _ensure_identity_for_auth_user(auth_user)
        identity = await service.get_identity(auth_user.id)
        if not identity.root_admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Root Administrator Required")

        telemetry = await service._build_cost_telemetry_summary()
        counts = await service.store.get_counts_summary()

        return {
            "status": "OK",
            "telemetry": telemetry,
            "total_identities": counts.get("identities", 0),
            "blocked_injections": None,
            "blocked_injections_status": "unavailable",
            "blocked_injections_detail": (
                "Injection-specific blocking telemetry is not persisted yet; "
                "this field is intentionally unset instead of returning a fake value."
            ),
        }

    def _startup_probe_payload() -> dict[str, object]:
        started = bool(getattr(service, "_initialized", False))
        return {
            "status": "started" if started else "starting",
            "started": started,
        }

    def _readiness_probe_payload() -> dict[str, object]:
        service_started = bool(getattr(service, "_initialized", False))
        limiter_ready = rate_limiter.is_initialized() if hasattr(rate_limiter, "is_initialized") else True
        store_breaker = service.store.describe_circuit_breaker()
        store_ready = not (
            isinstance(store_breaker, dict) and str(store_breaker.get("state")) == "open"
        )
        broker_ready = generation_broker_ready_for_runtime(
            service.settings.environment,
            service._generation_runtime_mode,
            broker_enabled=service.generation_broker is not None,
            degraded_reason=service._generation_broker_degraded_reason,
        )
        ready = service_started and limiter_ready and store_ready and broker_ready
        return {
            "status": "ready" if ready else "not_ready",
            "ready": ready,
            "checks": {
                "service_initialized": service_started,
                "rate_limiter_initialized": limiter_ready,
                "store_available": store_ready,
                "generation_broker_ready": broker_ready,
            },
        }

    @router.get("/healthz")
    async def healthz():
        payload = await service.health(detail=False)
        return service.serialize_health_payload(payload, detail=False)

    @router.get("/healthz/ready")
    async def healthz_ready():
        payload = _readiness_probe_payload()
        status_code = status.HTTP_200_OK if payload["ready"] else status.HTTP_503_SERVICE_UNAVAILABLE
        return JSONResponse(status_code=status_code, content=payload)

    @router.get("/healthz/startup")
    async def healthz_startup():
        payload = _startup_probe_payload()
        status_code = status.HTTP_200_OK if payload["started"] else status.HTTP_503_SERVICE_UNAVAILABLE
        return JSONResponse(status_code=status_code, content=payload)

    @router.get("/healthz/detail")
    async def healthz_detail(current_user: Optional[AuthUser] = Depends(get_current_user)):
        await _require_owner(current_user)
        payload = await service.health(detail=True)
        return service.serialize_health_payload(payload, detail=True)

    @router.get("/models")
    async def get_models(current_user: Optional[AuthUser] = Depends(get_current_user)):
        identity = None
        if current_user is not None:
            try:
                await _ensure_identity_for_auth_user(current_user)
                identity = await service.get_identity(current_user.id)
            except KeyError:
                identity = None
        return {
            "models": [
                model.model_dump(mode="json")
                for model in await service.list_models_for_identity(identity)
            ]
        }

    @router.post("/prompts/improve")
    async def improve_prompt(
        payload: PromptImproveRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "prompt:improve", limit=20, identifier=auth_user.id)
        moderation_decision = await check_prompt_safety(payload.prompt)
        if moderation_decision.action == ModerationAction.HARD_BLOCK:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your prompt was flagged by our content safety filter.",
            )
        try:
            return await service.improve_generation_prompt(payload.prompt, identity_id=auth_user.id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @router.get("/presets")
    async def get_presets():
        return {"presets": PRESET_CATALOG}

    @router.get("/personas")
    async def get_personas(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        personas = await service.store.list_models("personas", StudioPersona)
        user_personas = [p.model_dump(mode="json") for p in personas if p.identity_id == auth_user.id or p.is_default]
        user_personas.sort(key=lambda p: (not p.get("is_default", False), p.get("created_at", "")))
        return {"personas": user_personas}

    @router.post("/personas", status_code=status.HTTP_201_CREATED)
    async def create_persona(
        payload: PersonaCreateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user)
    ):
        import uuid
        from datetime import datetime, timezone
        from .models.persona import StudioPersona

        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "personas:create", limit=12, identifier=auth_user.id)
        new_persona = StudioPersona(
            id=f"persona_{uuid.uuid4().hex[:8]}",
            identity_id=auth_user.id,
            name=payload.name.strip(),
            description=payload.description.strip(),
            system_prompt=payload.system_prompt.strip(),
            avatar_url=payload.avatar_url,
            is_default=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        await service.store.save_model("personas", new_persona)
        return new_persona.model_dump(mode="json")

    @router.get("/projects")
    async def get_projects(
        surface: Optional[Literal["compose", "chat"]] = Query(default=None),
        include_system_managed: bool = Query(default=False),
        limit: int = Query(default=60, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
        sort: Literal["updated", "newest", "oldest", "name"] = Query(default="updated"),
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        projects = await service.list_projects(
            auth_user.id,
            surface=surface,
            include_system_managed=include_system_managed,
            limit=limit,
            offset=offset,
            sort=sort,
        )
        total = len(
            await service.list_projects(
                auth_user.id,
                surface=surface,
                include_system_managed=include_system_managed,
            )
        )
        return {
            "projects": [project.model_dump(mode="json") for project in projects],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    @router.post("/projects", status_code=status.HTTP_201_CREATED)
    async def post_project(
        payload: ProjectCreateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "projects:create", limit=24, identifier=auth_user.id, window_seconds=3600)
        project = await service.create_project(auth_user.id, payload.title, payload.description, payload.surface)
        return project.model_dump(mode="json")

    @router.get("/projects/{project_id}")
    async def get_project(project_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            payload = await service.get_project(auth_user.id, project_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return payload

    @router.post("/projects/{project_id}/export")
    async def export_project_bundle(
        project_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "projects:export", limit=12, identifier=auth_user.id)
        await _consume_rate_limit(request, "projects:export:ip", limit=20)
        try:
            delivery = await service.export_project(auth_user.id, project_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        headers = {"Content-Disposition": f'attachment; filename="{delivery.filename}"'}
        return Response(content=delivery.content or b"", media_type=delivery.media_type, headers=headers)

    @router.patch("/projects/{project_id}")
    async def patch_project(
        project_id: str,
        payload: ProjectUpdateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "projects:update", limit=60, identifier=auth_user.id, window_seconds=3600)
        try:
            project = await service.update_project(
                auth_user.id,
                project_id,
                title=payload.title,
                description=payload.description,
            )
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return project.model_dump(mode="json")

    @router.delete("/projects/{project_id}")
    async def delete_project(
        project_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "projects:delete", limit=12, identifier=auth_user.id, window_seconds=3600)
        try:
            return await service.delete_project(auth_user.id, project_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @router.get("/public/posts")
    async def get_public_posts(
        request: Request,
        sort: str = Query(default="trending", pattern="^(trending|newest|top|styles)$"),
        limit: int = Query(default=60, ge=1, le=60),
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        await _consume_rate_limit(request, "public:posts:ip", limit=90, window_seconds=60)
        viewer_identity_id = current_user.id if current_user is not None else None
        if viewer_identity_id is not None:
            await _consume_rate_limit(
                request,
                "public:posts:user",
                limit=240,
                identifier=viewer_identity_id,
                window_seconds=3600,
            )
        posts = await service.list_public_posts(sort=sort, viewer_identity_id=viewer_identity_id, limit=limit)
        return {"posts": posts}

    @router.get("/public/export")
    async def get_public_export(request: Request):
        await _consume_rate_limit(request, "public:export", limit=20, window_seconds=60)
        # Ecosystem Federation: Send public data for omniacreata.com main website
        posts = await service.list_public_posts(sort="trending", viewer_identity_id=None, limit=20)
        export_data = []
        for p in posts:
            cover_asset = p.get("cover_asset") if isinstance(p.get("cover_asset"), dict) else None
            preview_assets = p.get("preview_assets") if isinstance(p.get("preview_assets"), list) else []
            image_url = None
            for candidate in [cover_asset, *preview_assets]:
                if not isinstance(candidate, dict):
                    continue
                image_url = (
                    candidate.get("preview_url")
                    or candidate.get("thumbnail_url")
                    or candidate.get("url")
                )
                if image_url:
                    break
            prompt = str(p.get("prompt") or "")
            export_data.append({
                "id": p.get("id"),
                "image_url": image_url,
                "prompt_snippet": (prompt[:100] + "...") if len(prompt) > 100 else prompt,
                "creator": p.get("owner_display_name", "Omnia Creator"),
                "likes": p.get("like_count", 0),
                "source": "studio.omniacreata.com",
            })
        return {
            "status": "success",
            "federation_version": "1.0",
            "trending_creations": export_data
        }

    @router.get("/profiles/me")
    async def get_my_profile(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            return await service.get_profile_payload(identity_id=auth_user.id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.get("/profiles/me/favorites")
    async def get_my_favorites(
        request: Request,
        limit: int = Query(default=60, ge=1, le=100),
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(
            request,
            "profiles:favorites",
            limit=120,
            identifier=auth_user.id,
            window_seconds=3600,
        )
        return {"posts": await service.list_liked_posts(auth_user.id, limit=limit)}

    @router.get("/profiles/me/export")
    async def export_my_profile(
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "profiles:export", limit=6, identifier=auth_user.id, window_seconds=3600)
        try:
            data = await service.export_identity_data(identity_id=auth_user.id)
            return data
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.delete("/profiles/me")
    async def delete_my_profile(
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "profiles:delete", limit=3, identifier=auth_user.id, window_seconds=3600)
        try:
            await service.permanently_delete_identity(identity_id=auth_user.id)
            return {"status": "deleted"}
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.patch("/profiles/me")
    async def patch_my_profile(
        payload: ProfileUpdateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "profiles:update", limit=24, identifier=auth_user.id, window_seconds=3600)
        try:
            await service.update_profile(
                auth_user.id,
                display_name=payload.display_name,
                bio=payload.bio,
                default_visibility=payload.default_visibility,
                featured_asset_id=payload.featured_asset_id,
                featured_asset_id_provided="featured_asset_id" in payload.model_fields_set,
                featured_asset_position=payload.featured_asset_position,
            )
            return await service.get_profile_payload(identity_id=auth_user.id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @router.get("/profiles/{username}")
    async def get_profile(
        username: str,
        request: Request,
        limit: int = Query(default=60, ge=1, le=100),
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        await _consume_rate_limit(request, "profiles:public:ip", limit=90, window_seconds=60)
        viewer_identity_id = current_user.id if current_user is not None else None
        if viewer_identity_id is not None:
            await _consume_rate_limit(
                request,
                "profiles:public:user",
                limit=240,
                identifier=viewer_identity_id,
                window_seconds=3600,
            )
        try:
            return await service.get_profile_payload(
                username=username,
                viewer_identity_id=viewer_identity_id,
                limit=limit,
            )
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.get("/conversations")
    async def get_conversations(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        conversations = await service.list_conversations(auth_user.id)
        return {"conversations": [_serialize_conversation(conversation) for conversation in conversations]}

    @router.post("/conversations", status_code=status.HTTP_201_CREATED)
    async def post_conversation(
        payload: ConversationCreateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "chat:new-conversation", limit=20, identifier=auth_user.id)
        conversation = await service.create_conversation(auth_user.id, payload.title, payload.model)
        return _serialize_conversation(conversation)

    @router.get("/conversations/{conversation_id}")
    async def get_conversation(conversation_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            payload = await service.get_conversation(auth_user.id, conversation_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        return {
            "conversation": _serialize_conversation(ChatConversation.model_validate(payload["conversation"])),
            "messages": [_serialize_chat_message(ChatMessage.model_validate(message)) for message in payload["messages"]],
        }

    @router.delete("/conversations/{conversation_id}")
    async def delete_conversation(conversation_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            await service.delete_conversation(auth_user.id, conversation_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        return {"status": "deleted"}

    @router.post("/conversations/{conversation_id}/messages", status_code=status.HTTP_201_CREATED)
    async def post_conversation_message(
        conversation_id: str,
        payload: ChatMessageRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "chat:message", limit=60, identifier=auth_user.id)
        moderation_decision = await check_prompt_safety(payload.content)
        if moderation_decision.action == ModerationAction.HARD_BLOCK:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your message was flagged by our content safety filter.",
            )
        try:
            result = await service.send_chat_message(
                auth_user.id,
                conversation_id,
                payload.content,
                model=payload.model,
                attachments=[attachment.model_dump(mode="json") for attachment in payload.attachments],
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
        return {
            "conversation": _serialize_conversation(ChatConversation.model_validate(result["conversation"])),
            "user_message": _serialize_chat_message(ChatMessage.model_validate(result["user_message"])),
            "assistant_message": _serialize_chat_message(ChatMessage.model_validate(result["assistant_message"])),
        }

    @router.patch("/conversations/{conversation_id}/messages/{message_id}")
    async def patch_conversation_message(
        conversation_id: str,
        message_id: str,
        payload: ChatMessageEditRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "chat:edit-message", limit=24, identifier=auth_user.id)
        moderation_decision = await check_prompt_safety(payload.content)
        if moderation_decision.action == ModerationAction.HARD_BLOCK:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your message was flagged by our content safety filter.",
            )
        try:
            result = await service.edit_chat_message(
                auth_user.id,
                conversation_id,
                message_id,
                payload.content,
                model=payload.model,
                attachments=[attachment.model_dump(mode="json") for attachment in payload.attachments],
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        return {
            "conversation": _serialize_conversation(ChatConversation.model_validate(result["conversation"])),
            "user_message": _serialize_chat_message(ChatMessage.model_validate(result["user_message"])),
            "assistant_message": _serialize_chat_message(ChatMessage.model_validate(result["assistant_message"])),
        }

    @router.post("/conversations/{conversation_id}/messages/{message_id}/regenerate")
    async def regenerate_conversation_message(
        conversation_id: str,
        message_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "chat:regenerate-message", limit=24, identifier=auth_user.id)
        try:
            result = await service.regenerate_chat_message(auth_user.id, conversation_id, message_id)
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        return {
            "conversation": _serialize_conversation(ChatConversation.model_validate(result["conversation"])),
            "user_message": _serialize_chat_message(ChatMessage.model_validate(result["user_message"])),
            "assistant_message": _serialize_chat_message(ChatMessage.model_validate(result["assistant_message"])),
        }

    @router.post("/conversations/{conversation_id}/messages/{message_id}/revert")
    async def revert_conversation_message(
        conversation_id: str,
        message_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "chat:revert-message", limit=24, identifier=auth_user.id)
        try:
            result = await service.revert_chat_message(auth_user.id, conversation_id, message_id)
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        return {
            "conversation": _serialize_conversation(ChatConversation.model_validate(result["conversation"])),
            "user_message": _serialize_chat_message(ChatMessage.model_validate(result["user_message"])),
            "assistant_message": _serialize_chat_message(ChatMessage.model_validate(result["assistant_message"])),
        }

    @router.patch("/conversations/{conversation_id}/messages/{message_id}/feedback")
    async def patch_conversation_message_feedback(
        conversation_id: str,
        message_id: str,
        payload: ChatFeedbackRequest,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            message = await service.set_chat_message_feedback(
                auth_user.id,
                conversation_id,
                message_id,
                ChatFeedback(payload.feedback) if payload.feedback else None,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
        return _serialize_chat_message(message)

    @router.get("/generations")
    async def get_generations(
        current_user: Optional[AuthUser] = Depends(get_current_user),
        project_id: Optional[str] = Query(default=None),
        limit: int = Query(default=40, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
        sort: Literal["newest", "oldest", "updated", "model"] = Query(default="newest"),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        jobs = await service.list_generations(
            auth_user.id,
            project_id=project_id,
            limit=limit,
            offset=offset,
            sort=sort,
        )
        total = len(await service.list_generations(auth_user.id, project_id=project_id))
        return {
            "generations": [_serialize_generation(job, auth_user.id) for job in jobs],
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    @router.post("/generations", status_code=status.HTTP_202_ACCEPTED)
    async def post_generations(
        payload: GenerationCreateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_generation_rate_limits(request, auth_user)
        _require_verified_generation_account(auth_user)

        raw_moderation_decision = await check_prompt_safety(payload.prompt)
        if isinstance(raw_moderation_decision, PromptModerationDecision):
            moderation_decision = raw_moderation_decision
        else:
            mod_result, flagged_term = raw_moderation_decision
            moderation_decision = PromptModerationDecision(
                result=mod_result,
                action=ModerationAction.HARD_BLOCK if mod_result in {
                    ModerationResult.SOFT_BLOCK,
                    ModerationResult.HARD_BLOCK,
                } else ModerationAction.ALLOW,
                reason=flagged_term,
            )
        if (
            moderation_decision.result == ModerationResult.REVIEW
            and moderation_decision.action == ModerationAction.ALLOW
        ):
            moderation_decision = replace(moderation_decision, action=ModerationAction.REVIEW)
        mod_result = moderation_decision.result
        flagged_term = moderation_decision.reason
        rewritten_prompt = moderation_decision.rewritten_prompt or payload.prompt
        moderation_tier = moderation_decision.provider_moderation
        audit = await service.record_prompt_moderation_audit(
            surface="generation_prompt",
            identity_id=auth_user.id,
            original_text=payload.prompt,
            final_text=rewritten_prompt,
            decision=moderation_decision,
        )

        if moderation_decision.action == ModerationAction.HARD_BLOCK or mod_result in {
            ModerationResult.SOFT_BLOCK,
            ModerationResult.HARD_BLOCK,
        }:
            await service.record_generation_moderation_block(
                auth_user.id,
                mod_result,
                flagged_term or mod_result.value,
                prompt=payload.prompt,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Safety violation: Your prompt contains blocked content and has been rejected.",
            )
            
        try:
            job = await service.create_generation(
                identity_id=auth_user.id,
                project_id=payload.project_id,
                prompt=rewritten_prompt,
                source_prompt=payload.prompt,
                negative_prompt=payload.negative_prompt,
                reference_asset_id=payload.reference_asset_id,
                model_id=payload.model,
                width=payload.width,
                height=payload.height,
                steps=payload.steps,
                cfg_scale=payload.cfg_scale,
                seed=payload.seed,
                aspect_ratio=payload.aspect_ratio,
                output_count=payload.output_count,
                moderation_tier=moderation_tier,
                moderation_reason=flagged_term,
                moderation_action=moderation_decision.action.value,
                moderation_risk_level=moderation_decision.risk_level.value,
                moderation_risk_score=moderation_decision.risk_score,
                moderation_age_ambiguity=moderation_decision.age_ambiguity.value,
                moderation_sexual_intent=moderation_decision.sexual_intent.value,
                moderation_context_type=moderation_decision.context_type.value,
                moderation_audit_id=audit.id,
                moderation_rewrite_applied=moderation_decision.rewrite_applied,
                moderation_rewritten_prompt=moderation_decision.rewritten_prompt,
                moderation_llm_used=moderation_decision.llm_used,
            )
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except GenerationCapacityError as exc:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": str(exc),
                    "queue_full": exc.queue_full,
                    "estimated_wait_seconds": exc.estimated_wait_seconds,
                },
                headers={
                    "Retry-After": str(exc.estimated_wait_seconds or 30),
                    "X-Queue-Full": "true" if exc.queue_full else "false",
                },
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Requested resource not found")
        return _serialize_generation(job, auth_user.id)

    @router.get("/generations/{generation_id}")
    async def get_generation(generation_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            job = await service.get_generation(auth_user.id, generation_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")
        return _serialize_generation(job, auth_user.id)

    @router.delete("/generations/{generation_id}")
    async def delete_generation(generation_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            return await service.delete_generation(auth_user.id, generation_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @router.get("/assets")
    async def get_assets(
        current_user: Optional[AuthUser] = Depends(get_current_user),
        project_id: Optional[str] = Query(default=None),
        include_deleted: bool = Query(default=False),
        limit: int = Query(default=80, ge=1, le=200),
        offset: int = Query(default=0, ge=0),
        sort: Literal["newest", "oldest", "name", "model"] = Query(default="newest"),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        assets = await service.list_assets(
            auth_user.id,
            project_id=project_id,
            include_deleted=include_deleted,
            limit=limit,
            offset=offset,
            sort=sort,
        )
        allow_clean_export = await service.can_identity_clean_export(auth_user.id)
        total = len(
            await service.list_assets(
                auth_user.id,
                project_id=project_id,
                include_deleted=include_deleted,
            )
        )
        return {
            "assets": service.serialize_assets(assets, identity_id=auth_user.id, allow_clean_export=allow_clean_export),
            "total": total,
            "limit": limit,
            "offset": offset,
        }

    @router.post("/assets/import", status_code=status.HTTP_201_CREATED)
    async def import_asset(
        payload: AssetImportRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "assets:import", limit=24, identifier=auth_user.id, window_seconds=3600)
        await _consume_rate_limit(request, "assets:import:ip", limit=30, window_seconds=3600)
        try:
            asset = await service.import_asset_from_data_url(
                identity_id=auth_user.id,
                project_id=payload.project_id,
                data_url=payload.data_url,
                title=payload.title,
            )
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return service.serialize_asset(asset, identity_id=auth_user.id)

    @router.patch("/assets/{asset_id}")
    async def patch_asset(
        asset_id: str,
        payload: AssetRenameRequest,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            asset = await service.rename_asset(auth_user.id, asset_id, payload.title)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return service.serialize_asset(asset, identity_id=auth_user.id)

    @router.delete("/assets/{asset_id}")
    async def delete_asset(asset_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            asset = await service.trash_asset(auth_user.id, asset_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        return service.serialize_asset(asset, identity_id=auth_user.id)

    @router.post("/assets/{asset_id}/restore")
    async def restore_asset(asset_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            asset = await service.restore_asset(auth_user.id, asset_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        return service.serialize_asset(asset, identity_id=auth_user.id)

    @router.delete("/assets/{asset_id}/permanent")
    async def permanently_delete_asset(
        asset_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "assets:permanent-delete", limit=20, identifier=auth_user.id)
        try:
            return await service.permanently_delete_asset(auth_user.id, asset_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except AssetStorageError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Asset storage unavailable",
            )

    @router.post("/assets/trash/empty")
    async def empty_trash(
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "assets:empty-trash", limit=8, identifier=auth_user.id)
        try:
            return await service.empty_trash(auth_user.id)
        except AssetStorageError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Asset storage unavailable",
            )

    @router.get("/assets/{asset_id}/content")
    async def get_asset_content(
        asset_id: str,
        request: Request,
        token: str = Query(min_length=16),
    ):
        await _consume_rate_limit(request, "assets:content:ip", limit=120)
        try:
            delivery = await service.resolve_asset_delivery(asset_id, token, "content")
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset file not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except AssetStorageError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Asset storage unavailable",
            )
        if delivery.local_path is not None:
            return FileResponse(delivery.local_path, media_type=delivery.media_type, filename=delivery.filename)
        return Response(content=delivery.content or b"", media_type=delivery.media_type)

    @router.get("/assets/{asset_id}/thumbnail")
    async def get_asset_thumbnail(
        asset_id: str,
        request: Request,
        token: str = Query(min_length=16),
    ):
        await _consume_rate_limit(request, "assets:thumbnail:ip", limit=120)
        try:
            delivery = await service.resolve_asset_delivery(asset_id, token, "thumbnail")
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except AssetStorageError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Asset storage unavailable",
            )
        if delivery.local_path is not None:
            return FileResponse(delivery.local_path, media_type=delivery.media_type, filename=delivery.filename)
        return Response(content=delivery.content or b"", media_type=delivery.media_type)

    @router.get("/assets/{asset_id}/preview")
    async def get_asset_preview(
        asset_id: str,
        request: Request,
        token: str = Query(min_length=16),
    ):
        await _consume_rate_limit(request, "assets:preview:ip", limit=120)
        try:
            delivery = await service.resolve_asset_delivery(asset_id, token, "preview")
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preview not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except AssetStorageError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Asset storage unavailable",
            )
        if delivery.local_path is not None:
            return FileResponse(delivery.local_path, media_type=delivery.media_type, filename=delivery.filename)
        return Response(content=delivery.content or b"", media_type=delivery.media_type)

    @router.get("/assets/{asset_id}/blocked-preview")
    async def get_asset_blocked_preview(
        asset_id: str,
        request: Request,
        token: str = Query(min_length=16),
    ):
        await _consume_rate_limit(request, "assets:blocked-preview:ip", limit=120)
        try:
            delivery = await service.resolve_asset_delivery(asset_id, token, "blocked")
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blocked preview not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except AssetStorageError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Asset storage unavailable",
            )
        if delivery.local_path is not None:
            return FileResponse(delivery.local_path, media_type=delivery.media_type, filename=delivery.filename)
        return Response(content=delivery.content or b"", media_type=delivery.media_type)

    @router.get("/assets/{asset_id}/clean-export")
    async def get_asset_clean_export(
        asset_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "assets:clean-export", limit=24, identifier=auth_user.id)
        await _consume_rate_limit(request, "assets:clean-export:ip", limit=30)
        try:
            delivery = await service.resolve_clean_asset_export(asset_id, auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset file not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except AssetStorageError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Asset storage unavailable",
            )
        headers = {"Content-Disposition": f'attachment; filename="{delivery.filename}"'}
        if delivery.local_path is not None:
            return FileResponse(
                delivery.local_path,
                media_type=delivery.media_type,
                filename=delivery.filename,
                headers=headers,
            )
        return Response(content=delivery.content or b"", media_type=delivery.media_type, headers=headers)

    @router.patch("/posts/{post_id}")
    async def patch_post(
        post_id: str,
        payload: PostUpdateRequest,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            await service.update_post(
                auth_user.id,
                post_id,
                title=payload.title,
                visibility=payload.visibility,
            )
            post = await service.get_post_payload(post_id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        return {"post": post}

    @router.post("/posts/{post_id}/move")
    async def post_move_post(
        post_id: str,
        payload: PostMoveRequest,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            await service.move_post(auth_user.id, post_id, payload.project_id)
            post = await service.get_post_payload(post_id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        return {"post": post}

    @router.post("/posts/{post_id}/trash")
    async def post_trash_post(post_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            return await service.trash_post(auth_user.id, post_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    @router.post("/posts/{post_id}/like")
    async def post_like_post(
        post_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "posts:like", limit=80, identifier=auth_user.id)
        try:
            await service.like_post(auth_user.id, post_id)
            post = await service.get_post_payload(post_id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        return {"post": post}

    @router.delete("/posts/{post_id}/like")
    async def delete_like_post(
        post_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "posts:like", limit=80, identifier=auth_user.id)
        try:
            await service.unlike_post(auth_user.id, post_id)
            post = await service.get_post_payload(post_id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        return {"post": post}

    @router.post("/posts/{post_id}/report", status_code=status.HTTP_201_CREATED)
    async def post_report_public_post(
        post_id: str,
        payload: PostReportRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "posts:report", limit=24, identifier=auth_user.id, window_seconds=3600)
        await _consume_rate_limit(request, "posts:report:ip", limit=40, window_seconds=3600)
        try:
            case = await service.report_public_post(
                auth_user.id,
                post_id,
                reason_code=payload.reason_code,
                detail=payload.detail,
            )
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return {"case": service.moderation_cases.serialize_case(case)}

    @router.post("/moderation/appeals", status_code=status.HTTP_201_CREATED)
    async def post_moderation_appeal(
        payload: ModerationAppealRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "moderation:appeal", limit=12, identifier=auth_user.id, window_seconds=3600)
        await _consume_rate_limit(request, "moderation:appeal:ip", limit=20, window_seconds=3600)
        try:
            case = await service.submit_moderation_appeal(
                auth_user.id,
                linked_case_id=payload.linked_case_id,
                subject=payload.subject,
                subject_id=payload.subject_id,
                reason_code=payload.reason_code,
                detail=payload.detail,
            )
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderation subject not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return {"case": service.moderation_cases.serialize_case(case)}

    @router.get("/admin/moderation/cases")
    async def get_admin_moderation_cases(
        current_user: Optional[AuthUser] = Depends(get_current_user),
        status_filter: ModerationCaseStatus | None = Query(default=None, alias="status"),
        source_filter: ModerationCaseSource | None = Query(default=None, alias="source"),
        limit: int = Query(default=200, ge=1, le=500),
    ):
        await _require_owner(current_user)
        cases = await service.list_moderation_cases(
            status=status_filter,
            source=source_filter,
            limit=limit,
        )
        return {"cases": cases}

    @router.patch("/admin/moderation/cases/{case_id}")
    async def patch_admin_moderation_case(
        case_id: str,
        payload: ModerationCaseResolveRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _require_owner(current_user)
        await _consume_rate_limit(
            request,
            "admin:moderation:resolve",
            limit=60,
            identifier=auth_user.id,
            window_seconds=3600,
        )
        try:
            case = await service.resolve_moderation_case(
                auth_user.id,
                case_id,
                status=payload.status,
                resolution_note=payload.resolution_note,
                visibility_effect=payload.visibility_effect,
            )
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderation case not found")
        return {"case": service.moderation_cases.serialize_case(case)}

    @router.post("/shares", status_code=status.HTTP_201_CREATED)
    async def post_shares(
        payload: ShareCreateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(
            request,
            "shares:create",
            limit=12,
            identifier=auth_user.id,
            window_seconds=3600,
        )
        try:
            share, public_token = await service.create_share(auth_user.id, payload.project_id, payload.asset_id)
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share target not found")

        return {
            "share_id": share.id,
            "token": public_token,
            "url": f"/shared/{public_token}",
            "token_preview": share.token_preview,
            "created_at": share.created_at.isoformat(),
            "revoked_at": share.revoked_at.isoformat() if share.revoked_at else None,
        }

    @router.get("/shares")
    async def get_shares(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        return {"shares": await service.list_shares(auth_user.id)}

    @router.delete("/shares/{share_id}")
    async def delete_share(share_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        try:
            share = await service.revoke_share(auth_user.id, share_id)
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share not found")
        return {"share": share}

    @router.get("/shares/public/{token}")
    async def get_public_share(token: str, request: Request):
        await _consume_rate_limit(request, "shares:public:ip", limit=60)
        try:
            payload = await service.get_public_share(token)
            return service.serialize_public_share_payload(payload)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share not found")

    @router.get("/billing/summary")
    async def get_billing_summary(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        return await service.billing_summary(auth_user.id)

    @router.get("/styles")
    async def get_styles(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        return await service.list_styles(auth_user.id)

    @router.post("/styles", status_code=status.HTTP_201_CREATED)
    async def post_style(
        payload: StyleSaveRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "styles:mutate", limit=40, identifier=auth_user.id, window_seconds=3600)
        try:
            style = await service.save_style(
                auth_user.id,
                title=payload.title,
                prompt_modifier=payload.prompt_modifier,
                text_mode=payload.text_mode,
                description=payload.description,
                category=payload.category,
                preview_image_url=payload.preview_image_url,
                negative_prompt=payload.negative_prompt,
                preferred_model_id=payload.preferred_model_id,
                preferred_aspect_ratio=payload.preferred_aspect_ratio,
                preferred_steps=payload.preferred_steps,
                preferred_cfg_scale=payload.preferred_cfg_scale,
                preferred_output_count=payload.preferred_output_count,
                source_kind=payload.source_kind,
                source_style_id=payload.source_style_id,
                favorite=payload.favorite,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return service._serialize_style(style)

    @router.post("/styles/from-prompt", status_code=status.HTTP_201_CREATED)
    async def post_style_from_prompt(
        payload: StyleFromPromptRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "styles:mutate", limit=40, identifier=auth_user.id, window_seconds=3600)
        try:
            style = await service.save_style_from_prompt(
                auth_user.id,
                prompt=payload.prompt,
                title=payload.title,
                category=payload.category,
                negative_prompt=payload.negative_prompt,
                preferred_model_id=payload.preferred_model_id,
                preferred_aspect_ratio=payload.preferred_aspect_ratio,
                preferred_steps=payload.preferred_steps,
                preferred_cfg_scale=payload.preferred_cfg_scale,
                preferred_output_count=payload.preferred_output_count,
                preview_image_url=payload.preview_image_url,
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return service._serialize_style(style)

    @router.patch("/styles/{style_id}")
    async def patch_style(
        style_id: str,
        payload: StyleUpdateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "styles:mutate", limit=40, identifier=auth_user.id, window_seconds=3600)
        try:
            style = await service.update_style(auth_user.id, style_id, updates=payload.model_dump(exclude_unset=True))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Style not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return service._serialize_style(style)

    @router.delete("/styles/{style_id}")
    async def delete_style(
        style_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "styles:mutate", limit=40, identifier=auth_user.id, window_seconds=3600)
        try:
            await service.delete_style(auth_user.id, style_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Style not found")
        return {"style_id": style_id, "status": "deleted"}

    @router.get("/prompt-memory")
    async def get_prompt_memory(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        return await service.get_prompt_memory_profile_payload(auth_user.id)

    @router.post("/billing/checkout")
    async def post_billing_checkout(
        payload: BillingCheckoutRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user)
        await _consume_rate_limit(request, "billing:checkout", limit=10, identifier=auth_user.id)
        try:
            return await service.checkout(auth_user.id, payload.kind)
        except RuntimeError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    @router.get("/settings/bootstrap")
    async def get_settings_bootstrap(request: Request, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = await _ensure_identity_for_auth_user(current_user, request=request)
        current_session_id = str((getattr(auth_user, "metadata", {}) or {}).get("session_id") or "").strip() or None
        return await service.get_settings_payload(auth_user.id, current_session_id=current_session_id)

    @router.post("/settings/sessions/end-others")
    async def end_other_settings_sessions(
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = await _ensure_identity_for_auth_user(current_user, request=request)
        current_session_id = str((getattr(auth_user, "metadata", {}) or {}).get("session_id") or "").strip() or None
        if not current_session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Studio could not identify the current session yet. Refresh and try again.",
            )
        await _consume_rate_limit(request, "settings:sessions:end-others", limit=6, identifier=auth_user.id, window_seconds=3600)
        return await service.revoke_other_access_sessions(
            identity_id=auth_user.id,
            current_session_id=current_session_id,
            reason="user_requested_sign_out_others",
        )

    def _parse_paddle_signature(signature_header: str) -> tuple[str | None, list[str]]:
        timestamp: str | None = None
        signatures: list[str] = []
        for raw_part in signature_header.split(";"):
            key, _, value = raw_part.strip().partition("=")
            normalized_key = key.strip().lower()
            normalized_value = value.strip()
            if normalized_key == "ts" and normalized_value:
                timestamp = normalized_value
            elif normalized_key == "h1" and normalized_value:
                signatures.append(normalized_value)
        return timestamp, signatures

    def _verify_paddle_signature(*, payload_bytes: bytes, signature_header: str, secret: str) -> bool:
        timestamp, signatures = _parse_paddle_signature(signature_header)
        if not timestamp or not signatures:
            return False
        try:
            event_ts = int(timestamp)
        except ValueError:
            return False
        if abs(int(time.time()) - event_ts) > 300:
            return False
        signed_payload = timestamp.encode("utf-8") + b":" + payload_bytes
        expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return any(hmac.compare_digest(expected, candidate) for candidate in signatures)

    @router.post("/webhooks/paddle")
    async def post_paddle_webhook(request: Request):
        settings = get_settings()
        secret = reveal_secret_with_audit("PADDLE_WEBHOOK_SECRET", settings.paddle_webhook_secret).strip()
        if not secret:
            return Response("Webhook secret not configured", status_code=500)

        payload_bytes = await request.body()
        signature = request.headers.get("Paddle-Signature") or request.headers.get("paddle-signature")

        if not signature:
            return Response("Missing signature", status_code=401)

        if not _verify_paddle_signature(payload_bytes=payload_bytes, signature_header=signature, secret=secret):
            return Response("Invalid signature", status_code=401)

        try:
            payload = json.loads(payload_bytes)
        except json.JSONDecodeError:
            return Response("Invalid JSON", status_code=400)

        await service.process_paddle_webhook(payload)
        return {"status": "ok"}

    @router.post("/webhooks/lemonsqueezy")
    async def post_legacy_lemonsqueezy_webhook():
        return Response("LemonSqueezy webhook has been retired. Use /v1/webhooks/paddle.", status_code=410)

    return router
