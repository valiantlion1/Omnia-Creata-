from __future__ import annotations
import hmac
import hashlib
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field

from config.env import get_settings
from security.auth import User, UserRole, create_user_tokens, get_current_user, get_supabase_auth_client
from security.auth import User as AuthUser
from security.rate_limit import RateLimiter
from security.supabase_auth import SupabaseAuthError
from security.moderation import check_prompt_safety, ModerationResult

from .models import ChatAttachment, ChatConversation, ChatFeedback, ChatMessage, CheckoutKind, GenerationJob, IdentityPlan, PublicPost, Visibility
from .service import GenerationCapacityError, PRESET_CATALOG, PLAN_CATALOG, StudioService


class DemoLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(default="creator@omnia.local")
    display_name: str = Field(default="Creator")
    plan: IdentityPlan = Field(default=IdentityPlan.FREE)


class ProjectCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    description: str = ""
    surface: Literal["compose", "chat"] = "compose"


class ProjectUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    description: str = ""


class SupabaseSignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=256)
    display_name: str = Field(default="Omnia User", max_length=120)
    username: str = Field(min_length=3, max_length=32)
    accepted_terms: bool
    accepted_privacy: bool
    accepted_usage_policy: bool
    marketing_opt_in: bool = False


class SupabaseLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=256)


class PromptImproveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=1, max_length=1600)


class GenerationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: str
    prompt: str = Field(min_length=1, max_length=2000)
    negative_prompt: str = Field(default="", max_length=500)
    reference_asset_id: Optional[str] = None
    model: str = "flux-schnell"
    width: int = Field(default=1024, ge=512, le=1536)
    height: int = Field(default=1024, ge=512, le=1536)
    steps: int = Field(default=28, ge=1, le=50)
    cfg_scale: float = Field(default=6.5, ge=1, le=20)
    seed: int = Field(default=20260316, ge=0, le=2**32 - 1)
    aspect_ratio: str = "1:1"
    output_count: int = Field(default=1, ge=1, le=4)


class ShareCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    project_id: Optional[str] = None
    asset_id: Optional[str] = None


class BillingCheckoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: CheckoutKind


class ConversationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = ""
    model: str = "studio-assist"


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
    project_id: str


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    display_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    bio: Optional[str] = Field(default=None, max_length=220)
    default_visibility: Optional[Visibility] = None


def create_router(service: StudioService, rate_limiter: RateLimiter) -> APIRouter:
    router = APIRouter(prefix="/v1", tags=["studio"])
    settings = get_settings()

    def _require_auth(auth_user: Optional[AuthUser]) -> AuthUser:
        if auth_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        return auth_user

    async def _require_owner(auth_user: Optional[AuthUser]) -> AuthUser:
        current = _require_auth(auth_user)
        metadata = getattr(current, "metadata", {}) or {}
        if current.role != UserRole.ADMIN and not metadata.get("owner_mode"):
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
            "metadata": message.metadata,
            "version": message.version,
            "created_at": message.created_at.isoformat(),
            "edited_at": message.edited_at.isoformat() if message.edited_at else None,
        }

    def _build_client_key(request: Request, scope: str, identifier: Optional[str] = None) -> str:
        client_host = request.client.host if request.client else "unknown"
        return f"{scope}:{identifier or client_host}"

    async def _consume_rate_limit(request: Request, scope: str, limit: int, identifier: Optional[str] = None) -> None:
        decision = await rate_limiter.check(_build_client_key(request, scope, identifier), limit=limit)
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

    @router.post("/auth/demo-login")
    async def demo_login(payload: DemoLoginRequest, request: Request):
        if not settings.enable_demo_auth:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo auth is disabled")
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
        return {
            **create_user_tokens(demo_user),
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
        if not (payload.accepted_terms and payload.accepted_privacy and payload.accepted_usage_policy):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Terms, privacy, and usage policy must be accepted.",
            )
        supabase_client = get_supabase_auth_client()
        if supabase_client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase auth is not configured")

        try:
            session = await supabase_client.sign_up(
                email=payload.email.strip().lower(),
                password=payload.password,
                display_name=payload.display_name.strip() or "Omnia User",
                username=payload.username.strip().lower(),
                accepted_terms=payload.accepted_terms,
                accepted_privacy=payload.accepted_privacy,
                accepted_usage_policy=payload.accepted_usage_policy,
                marketing_opt_in=payload.marketing_opt_in,
            )
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
            accepted_terms=bool(user_metadata.get("accepted_terms", payload.accepted_terms)),
            accepted_privacy=bool(user_metadata.get("accepted_privacy", payload.accepted_privacy)),
            accepted_usage_policy=bool(user_metadata.get("accepted_usage_policy", payload.accepted_usage_policy)),
            marketing_opt_in=bool(user_metadata.get("marketing_opt_in", payload.marketing_opt_in)),
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
        supabase_client = get_supabase_auth_client()
        if supabase_client is None:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Supabase auth is not configured")

        try:
            session = await supabase_client.sign_in(
                email=payload.email.strip().lower(),
                password=payload.password,
            )
        except SupabaseAuthError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))

        user_data = session.user
        user_metadata = user_data.get("user_metadata") or {}
        display_name = (
            user_metadata.get("display_name")
            or user_data.get("email", payload.email.strip().lower()).split("@")[0]
            or "Omnia User"
        )
        identity = await service.ensure_identity(
            user_id=user_data["id"],
            email=user_data.get("email", payload.email.strip().lower()),
            display_name=display_name,
            username=(user_metadata.get("username") or user_data.get("email", "").split("@")[0]).strip().lower(),
            desired_plan=IdentityPlan.FREE,
            accepted_terms=bool(user_metadata.get("accepted_terms")),
            accepted_privacy=bool(user_metadata.get("accepted_privacy")),
            accepted_usage_policy=bool(user_metadata.get("accepted_usage_policy")),
            marketing_opt_in=bool(user_metadata.get("marketing_opt_in")),
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
        return await service.get_public_identity(current_user)

    @router.get("/healthz")
    async def healthz():
        payload = await service.health(detail=False)
        return service.serialize_health_payload(payload, detail=False)

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
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "prompt:improve", limit=20, identifier=auth_user.id)
        try:
            return await service.improve_generation_prompt(payload.prompt)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @router.get("/presets")
    async def get_presets():
        return {"presets": PRESET_CATALOG}

    @router.get("/projects")
    async def get_projects(
        surface: Optional[Literal["compose", "chat"]] = Query(default=None),
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
        projects = await service.list_projects(auth_user.id, surface=surface)
        return {"projects": [project.model_dump(mode="json") for project in projects]}

    @router.post("/projects", status_code=status.HTTP_201_CREATED)
    async def post_project(payload: ProjectCreateRequest, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        project = await service.create_project(auth_user.id, payload.title, payload.description, payload.surface)
        return project.model_dump(mode="json")

    @router.get("/projects/{project_id}")
    async def get_project(project_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            payload = await service.get_project(auth_user.id, project_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        return payload

    @router.patch("/projects/{project_id}")
    async def patch_project(
        project_id: str,
        payload: ProjectUpdateRequest,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
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
    async def delete_project(project_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            return await service.delete_project(auth_user.id, project_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @router.get("/public/posts")
    async def get_public_posts(
        sort: str = Query(default="trending", pattern="^(trending|newest|top|styles)$"),
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        viewer_identity_id = current_user.id if current_user is not None else None
        posts = await service.list_public_posts(sort=sort, viewer_identity_id=viewer_identity_id)
        return {"posts": posts}

    @router.get("/profiles/me")
    async def get_my_profile(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            return await service.get_profile_payload(identity_id=auth_user.id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.get("/profiles/me/export")
    async def export_my_profile(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            data = await service.export_identity_data(identity_id=auth_user.id)
            return data
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.delete("/profiles/me")
    async def delete_my_profile(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            await service.permanently_delete_identity(identity_id=auth_user.id)
            return {"status": "deleted"}
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.patch("/profiles/me")
    async def patch_my_profile(
        payload: ProfileUpdateRequest,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
        try:
            await service.update_profile(
                auth_user.id,
                display_name=payload.display_name,
                bio=payload.bio,
                default_visibility=payload.default_visibility,
            )
            return await service.get_profile_payload(identity_id=auth_user.id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    @router.get("/profiles/{username}")
    async def get_profile(username: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        viewer_identity_id = current_user.id if current_user is not None else None
        try:
            return await service.get_profile_payload(username=username, viewer_identity_id=viewer_identity_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

    @router.get("/conversations")
    async def get_conversations(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        conversations = await service.list_conversations(auth_user.id)
        return {"conversations": [_serialize_conversation(conversation) for conversation in conversations]}

    @router.post("/conversations", status_code=status.HTTP_201_CREATED)
    async def post_conversation(
        payload: ConversationCreateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "chat:new-conversation", limit=20, identifier=auth_user.id)
        conversation = await service.create_conversation(auth_user.id, payload.title, payload.model)
        return _serialize_conversation(conversation)

    @router.get("/conversations/{conversation_id}")
    async def get_conversation(conversation_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "chat:message", limit=60, identifier=auth_user.id)
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
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "chat:edit-message", limit=24, identifier=auth_user.id)
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
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
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
    ):
        auth_user = _require_auth(current_user)
        jobs = await service.list_generations(auth_user.id, project_id=project_id)
        return {"generations": [_serialize_generation(job, auth_user.id) for job in jobs]}

    @router.post("/generations", status_code=status.HTTP_202_ACCEPTED)
    async def post_generations(
        payload: GenerationCreateRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
        await _consume_generation_rate_limits(request, auth_user)
        
        # Verify safety rules
        mod_result, flagged_term = await check_prompt_safety(payload.prompt)
        if mod_result == ModerationResult.HARD_BLOCK:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Safety violation: Your prompt contains prohibited content and has been blocked."
            )
        elif mod_result == ModerationResult.SOFT_BLOCK:
            # In a real app we might write to an audit log table here.
            pass
            
        try:
            job = await service.create_generation(
                identity_id=auth_user.id,
                project_id=payload.project_id,
                prompt=payload.prompt,
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
                    "X-Queue-Full": "true",
                },
            )
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
        return _serialize_generation(job, auth_user.id)

    @router.get("/generations/{generation_id}")
    async def get_generation(generation_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            job = await service.get_generation(auth_user.id, generation_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")
        return _serialize_generation(job, auth_user.id)

    @router.get("/assets")
    async def get_assets(
        current_user: Optional[AuthUser] = Depends(get_current_user),
        project_id: Optional[str] = Query(default=None),
        include_deleted: bool = Query(default=False),
    ):
        auth_user = _require_auth(current_user)
        assets = await service.list_assets(auth_user.id, project_id=project_id, include_deleted=include_deleted)
        return {"assets": service.serialize_assets(assets, identity_id=auth_user.id)}

    @router.post("/assets/import", status_code=status.HTTP_201_CREATED)
    async def import_asset(
        payload: AssetImportRequest,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
        try:
            asset = await service.rename_asset(auth_user.id, asset_id, payload.title)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        return service.serialize_asset(asset, identity_id=auth_user.id)

    @router.delete("/assets/{asset_id}")
    async def delete_asset(asset_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            asset = await service.trash_asset(auth_user.id, asset_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        return service.serialize_asset(asset, identity_id=auth_user.id)

    @router.post("/assets/{asset_id}/restore")
    async def restore_asset(asset_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "assets:permanent-delete", limit=20, identifier=auth_user.id)
        try:
            return await service.permanently_delete_asset(auth_user.id, asset_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    @router.post("/assets/trash/empty")
    async def empty_trash(
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "assets:empty-trash", limit=8, identifier=auth_user.id)
        return await service.empty_trash(auth_user.id)

    @router.get("/assets/{asset_id}/content")
    async def get_asset_content(asset_id: str, token: str = Query(min_length=16)):
        try:
            delivery = await service.resolve_asset_delivery(asset_id, token, "content")
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset file not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        if delivery.local_path is not None:
            return FileResponse(delivery.local_path, media_type=delivery.media_type, filename=delivery.filename)
        return Response(content=delivery.content or b"", media_type=delivery.media_type)

    @router.get("/assets/{asset_id}/thumbnail")
    async def get_asset_thumbnail(asset_id: str, token: str = Query(min_length=16)):
        try:
            delivery = await service.resolve_asset_delivery(asset_id, token, "thumbnail")
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thumbnail not found")
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        if delivery.local_path is not None:
            return FileResponse(delivery.local_path, media_type=delivery.media_type, filename=delivery.filename)
        return Response(content=delivery.content or b"", media_type=delivery.media_type)

    @router.get("/assets/{asset_id}/clean-export")
    async def get_asset_clean_export(
        asset_id: str,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "assets:clean-export", limit=24, identifier=auth_user.id)
        try:
            delivery = await service.resolve_clean_asset_export(asset_id, auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        except FileNotFoundError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
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
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
        try:
            await service.move_post(auth_user.id, post_id, payload.project_id)
            post = await service.get_post_payload(post_id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        return {"post": post}

    @router.post("/posts/{post_id}/trash")
    async def post_trash_post(post_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
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
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "posts:like", limit=80, identifier=auth_user.id)
        try:
            await service.unlike_post(auth_user.id, post_id)
            post = await service.get_post_payload(post_id, viewer_identity_id=auth_user.id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        return {"post": post}

    @router.post("/shares", status_code=status.HTTP_201_CREATED)
    async def post_shares(payload: ShareCreateRequest, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            share = await service.create_share(auth_user.id, payload.project_id, payload.asset_id)
        except PermissionError as exc:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share target not found")

        return {
            "share_id": share.id,
            "token": share.token,
            "url": f"/shared/{share.token}",
        }

    @router.get("/shares/public/{token}")
    async def get_public_share(token: str):
        try:
            payload = await service.get_public_share(token)
            return service.serialize_public_share_payload(payload, token)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share not found")

    @router.get("/billing/summary")
    async def get_billing_summary(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        return await service.billing_summary(auth_user.id)

    @router.post("/billing/checkout")
    async def post_billing_checkout(
        payload: BillingCheckoutRequest,
        request: Request,
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
        await _consume_rate_limit(request, "billing:checkout", limit=10, identifier=auth_user.id)
        return await service.checkout(auth_user.id, payload.kind)

    @router.get("/settings/bootstrap")
    async def get_settings_bootstrap(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        return await service.get_settings_payload(auth_user.id)

    @router.post("/webhooks/lemonsqueezy")
    async def post_lemonsqueezy_webhook(request: Request):
        settings = get_settings()
        secret = settings.lemonsqueezy_webhook_secret
        if not secret:
            return Response("Webhook secret not configured", status_code=500)
            
        payload_bytes = await request.body()
        signature = request.headers.get("X-Signature") or request.headers.get("x-signature")
        
        if not signature:
            # If no signature, reject
            return Response("Missing signature", status_code=401)
            
        # Verify HMAC signature
        expected = hmac.new(
            secret.encode("utf-8"), 
            payload_bytes, 
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected, signature):
            return Response("Invalid signature", status_code=401)
            
        import json
        try:
            payload = json.loads(payload_bytes)
        except json.JSONDecodeError:
            return Response("Invalid JSON", status_code=400)
            
        await service.process_lemonsqueezy_webhook(payload)
        return {"status": "ok"}

    return router
