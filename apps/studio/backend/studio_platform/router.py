from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from security.auth import User, UserRole, create_user_tokens, get_current_user
from security.auth import User as AuthUser

from .models import ChatAttachment, ChatConversation, ChatMessage, CheckoutKind, GenerationJob, IdentityPlan
from .service import PRESET_CATALOG, PLAN_CATALOG, StudioService


class DemoLoginRequest(BaseModel):
    email: str = Field(default="creator@omnia.local")
    display_name: str = Field(default="Creator")
    plan: IdentityPlan = Field(default=IdentityPlan.FREE)


class ProjectCreateRequest(BaseModel):
    title: str
    description: str = ""


class LocalOwnerLoginRequest(BaseModel):
    owner_key: str = ""
    display_name: str = Field(default="Omnia Owner")
    email: str = Field(default="owner@omnia.local")


class GenerationCreateRequest(BaseModel):
    project_id: str
    prompt: str = Field(min_length=1, max_length=1600)
    negative_prompt: str = ""
    model: str = "flux-schnell"
    width: int = Field(default=1024, ge=512, le=1536)
    height: int = Field(default=1024, ge=512, le=1536)
    steps: int = Field(default=28, ge=8, le=60)
    cfg_scale: float = Field(default=6.5, ge=1, le=20)
    seed: int = Field(default=20260316, ge=0, le=2**32 - 1)
    aspect_ratio: str = "1:1"
    output_count: int = Field(default=1, ge=1, le=4)


class ShareCreateRequest(BaseModel):
    project_id: Optional[str] = None
    asset_id: Optional[str] = None


class BillingCheckoutRequest(BaseModel):
    kind: CheckoutKind


class ConversationCreateRequest(BaseModel):
    title: str = ""
    model: str = "studio-assist"


class ChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2400)
    model: Optional[str] = None
    attachments: list[ChatAttachment] = Field(default_factory=list)


def create_router(service: StudioService) -> APIRouter:
    router = APIRouter(prefix="/v1", tags=["studio"])

    def _require_auth(auth_user: Optional[AuthUser]) -> AuthUser:
        if auth_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        return auth_user

    def _serialize_generation(job: GenerationJob) -> dict:
        return {
            "job_id": job.id,
            "title": job.title,
            "status": job.status.value,
            "project_id": job.project_id,
            "provider": job.provider,
            "model": job.model,
            "prompt_snapshot": job.prompt_snapshot.model_dump(mode="json"),
            "estimated_cost": job.estimated_cost,
            "credit_cost": job.credit_cost,
            "output_count": job.output_count,
            "outputs": [output.model_dump(mode="json") for output in job.outputs],
            "error": job.error,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

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
            "attachments": [attachment.model_dump(mode="json") for attachment in message.attachments],
            "suggested_actions": [action.model_dump(mode="json") for action in message.suggested_actions],
            "created_at": message.created_at.isoformat(),
        }

    def _is_local_request(request: Request) -> bool:
        client_host = request.client.host if request.client else ""
        forwarded_for = request.headers.get("x-forwarded-for", "")
        forwarded_host = forwarded_for.split(",")[0].strip() if forwarded_for else ""
        local_hosts = {"127.0.0.1", "::1", "localhost", "testclient"}
        return client_host in local_hosts or forwarded_host in local_hosts

    @router.post("/auth/demo-login")
    async def demo_login(payload: DemoLoginRequest):
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
    async def local_owner_login(payload: LocalOwnerLoginRequest, request: Request):
        if not _is_local_request(request):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Local owner login is only available from this machine.",
            )

        expected_key = os.getenv("STUDIO_OWNER_KEY", "").strip()
        if expected_key and payload.owner_key.strip() != expected_key:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Owner key mismatch")

        owner_email = (payload.email or os.getenv("STUDIO_OWNER_EMAIL") or "owner@omnia.local").lower()
        owner_name = payload.display_name or os.getenv("STUDIO_OWNER_NAME") or "Omnia Owner"
        owner_user = User(
            id=owner_email,
            email=owner_email,
            username=owner_name,
            role=UserRole.ADMIN,
            is_active=True,
            is_verified=True,
            metadata={"owner_mode": True, "local_access": True},
        )
        identity = await service.ensure_identity(
            user_id=owner_user.id,
            email=owner_user.email,
            display_name=owner_name,
            desired_plan=IdentityPlan.PRO,
            owner_mode=True,
            local_access=True,
        )
        return {
            **create_user_tokens(owner_user),
            "identity": service.serialize_identity(identity),
        }

    @router.get("/auth/me")
    async def get_me(current_user: Optional[AuthUser] = Depends(get_current_user)):
        return await service.get_public_identity(current_user)

    @router.get("/healthz")
    async def healthz():
        return await service.health(detail=False)

    @router.get("/healthz/detail")
    async def healthz_detail():
        return await service.health(detail=True)

    @router.get("/models")
    async def get_models(current_user: Optional[AuthUser] = Depends(get_current_user)):
        identity = None
        if current_user is not None:
            try:
                identity = await service.get_identity(current_user.id)
            except KeyError:
                identity = None
        return {"models": [model.model_dump(mode="json") for model in await service.list_models_for_identity(identity)]}

    @router.get("/presets")
    async def get_presets():
        return {"presets": PRESET_CATALOG}

    @router.get("/projects")
    async def get_projects(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        projects = await service.list_projects(auth_user.id)
        return {"projects": [project.model_dump(mode="json") for project in projects]}

    @router.post("/projects", status_code=status.HTTP_201_CREATED)
    async def post_project(payload: ProjectCreateRequest, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        project = await service.create_project(auth_user.id, payload.title, payload.description)
        return project.model_dump(mode="json")

    @router.get("/projects/{project_id}")
    async def get_project(project_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            payload = await service.get_project(auth_user.id, project_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        payload["recent_generations"] = [_serialize_generation(GenerationJob.model_validate(item)) for item in payload["recent_generations"]]
        return payload

    @router.get("/conversations")
    async def get_conversations(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        conversations = await service.list_conversations(auth_user.id)
        return {"conversations": [_serialize_conversation(conversation) for conversation in conversations]}

    @router.post("/conversations", status_code=status.HTTP_201_CREATED)
    async def post_conversation(payload: ConversationCreateRequest, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
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
        current_user: Optional[AuthUser] = Depends(get_current_user),
    ):
        auth_user = _require_auth(current_user)
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

    @router.get("/generations")
    async def get_generations(
        current_user: Optional[AuthUser] = Depends(get_current_user),
        project_id: Optional[str] = Query(default=None),
    ):
        auth_user = _require_auth(current_user)
        jobs = await service.list_generations(auth_user.id, project_id=project_id)
        return {"generations": [_serialize_generation(job) for job in jobs]}

    @router.post("/generations", status_code=status.HTTP_202_ACCEPTED)
    async def post_generations(payload: GenerationCreateRequest, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            job = await service.create_generation(
                identity_id=auth_user.id,
                project_id=payload.project_id,
                prompt=payload.prompt,
                negative_prompt=payload.negative_prompt,
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
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
        except KeyError as exc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
        return _serialize_generation(job)

    @router.get("/generations/{generation_id}")
    async def get_generation(generation_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            job = await service.get_generation(auth_user.id, generation_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Generation not found")
        return _serialize_generation(job)

    @router.get("/assets")
    async def get_assets(
        current_user: Optional[AuthUser] = Depends(get_current_user),
        project_id: Optional[str] = Query(default=None),
        include_deleted: bool = Query(default=False),
    ):
        auth_user = _require_auth(current_user)
        assets = await service.list_assets(auth_user.id, project_id=project_id, include_deleted=include_deleted)
        return {"assets": [asset.model_dump(mode="json") for asset in assets]}

    @router.delete("/assets/{asset_id}")
    async def delete_asset(asset_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            asset = await service.trash_asset(auth_user.id, asset_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        return asset.model_dump(mode="json")

    @router.post("/assets/{asset_id}/restore")
    async def restore_asset(asset_id: str, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        try:
            asset = await service.restore_asset(auth_user.id, asset_id)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
        return asset.model_dump(mode="json")

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
            return await service.get_public_share(token)
        except KeyError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Share not found")

    @router.get("/billing/summary")
    async def get_billing_summary(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        return await service.billing_summary(auth_user.id)

    @router.post("/billing/checkout")
    async def post_billing_checkout(payload: BillingCheckoutRequest, current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        return await service.checkout(auth_user.id, payload.kind)

    @router.get("/settings/bootstrap")
    async def get_settings_bootstrap(current_user: Optional[AuthUser] = Depends(get_current_user)):
        auth_user = _require_auth(current_user)
        return await service.get_settings_payload(auth_user.id)

    return router
