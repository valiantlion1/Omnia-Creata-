from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from security.auth import User, UserRole, create_user_tokens, get_current_user
from security.auth import User as AuthUser

from .models import CheckoutKind, GenerationJob, IdentityPlan
from .service import MODEL_CATALOG, PRESET_CATALOG, PLAN_CATALOG, StudioService


class DemoLoginRequest(BaseModel):
    email: str = Field(default="creator@omnia.local")
    display_name: str = Field(default="Creator")
    plan: IdentityPlan = Field(default=IdentityPlan.FREE)


class ProjectCreateRequest(BaseModel):
    title: str
    description: str = ""


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


class ShareCreateRequest(BaseModel):
    project_id: Optional[str] = None
    asset_id: Optional[str] = None


class BillingCheckoutRequest(BaseModel):
    kind: CheckoutKind


def create_router(service: StudioService) -> APIRouter:
    router = APIRouter(prefix="/v1", tags=["studio"])

    def _require_auth(auth_user: Optional[AuthUser]) -> AuthUser:
        if auth_user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        return auth_user

    def _serialize_generation(job: GenerationJob) -> dict:
        return {
            "job_id": job.id,
            "status": job.status.value,
            "project_id": job.project_id,
            "provider": job.provider,
            "model": job.model,
            "prompt_snapshot": job.prompt_snapshot.model_dump(mode="json"),
            "estimated_cost": job.estimated_cost,
            "credit_cost": job.credit_cost,
            "outputs": [output.model_dump(mode="json") for output in job.outputs],
            "error": job.error,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    @router.post("/auth/demo-login")
    async def demo_login(payload: DemoLoginRequest):
        demo_user = User(
            id=payload.email.lower(),
            email=payload.email.lower(),
            username=payload.display_name,
            role=UserRole.USER,
            is_active=True,
            is_verified=True,
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

    @router.get("/auth/me")
    async def get_me(current_user: Optional[AuthUser] = Depends(get_current_user)):
        return await service.get_public_identity(current_user)

    @router.get("/healthz")
    async def healthz():
        return await service.health()

    @router.get("/models")
    async def get_models():
        return {"models": [model.model_dump(mode="json") for model in MODEL_CATALOG.values()]}

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
    ):
        auth_user = _require_auth(current_user)
        assets = await service.list_assets(auth_user.id, project_id=project_id)
        return {"assets": [asset.model_dump(mode="json") for asset in assets]}

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
