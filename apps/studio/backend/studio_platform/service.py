from __future__ import annotations

import asyncio
import io
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from PIL import Image

from .models import (
    CheckoutKind,
    CreditEntryType,
    CreditLedgerEntry,
    GenerationJob,
    GenerationOutput,
    IdentityPlan,
    JobStatus,
    MediaAsset,
    ModelCatalogEntry,
    OmniaIdentity,
    PlanCatalogEntry,
    Project,
    PromptSnapshot,
    ShareLink,
    StudioState,
    StudioWorkspace,
    SubscriptionStatus,
    utc_now,
)
from .providers import ProviderRegistry, ProviderTemporaryError, build_media_path, guess_file_extension
from .store import StudioStateStore


PLAN_CATALOG: Dict[IdentityPlan, PlanCatalogEntry] = {
    IdentityPlan.GUEST: PlanCatalogEntry(
        id=IdentityPlan.GUEST,
        label="Guest",
        monthly_credits=0,
        queue_priority="browse-only",
        max_resolution="preview only",
        share_links=False,
        can_generate=False,
    ),
    IdentityPlan.FREE: PlanCatalogEntry(
        id=IdentityPlan.FREE,
        label="Free",
        monthly_credits=60,
        queue_priority="standard",
        max_resolution="1024x1024",
        share_links=False,
        can_generate=True,
    ),
    IdentityPlan.PRO: PlanCatalogEntry(
        id=IdentityPlan.PRO,
        label="Pro",
        monthly_credits=1200,
        queue_priority="priority",
        max_resolution="1536x1536",
        share_links=True,
        can_generate=True,
    ),
}

MODEL_CATALOG: Dict[str, ModelCatalogEntry] = {
    "flux-schnell": ModelCatalogEntry(
        id="flux-schnell",
        label="Flux Schnell",
        description="Fast ideation model for everyday concept work.",
        min_plan=IdentityPlan.FREE,
        credit_cost=6,
        estimated_cost=0.003,
        max_width=1024,
        max_height=1024,
        featured=True,
    ),
    "sdxl-base": ModelCatalogEntry(
        id="sdxl-base",
        label="SDXL Base",
        description="Balanced baseline image model for clean compositions.",
        min_plan=IdentityPlan.FREE,
        credit_cost=8,
        estimated_cost=0.008,
        max_width=1024,
        max_height=1024,
    ),
    "realvis-xl": ModelCatalogEntry(
        id="realvis-xl",
        label="RealVis XL",
        description="Cinematic realism tuned for polished renders.",
        min_plan=IdentityPlan.PRO,
        credit_cost=12,
        estimated_cost=0.015,
        max_width=1536,
        max_height=1536,
        featured=True,
    ),
    "juggernaut-xl": ModelCatalogEntry(
        id="juggernaut-xl",
        label="Juggernaut XL",
        description="Sharper detail and stylized realism for hero shots.",
        min_plan=IdentityPlan.PRO,
        credit_cost=14,
        estimated_cost=0.02,
        max_width=1536,
        max_height=1536,
    ),
}

PRESET_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "cinematic",
        "label": "Cinematic",
        "description": "Moody contrast, richer highlights, stronger composition.",
        "defaults": {"steps": 30, "cfg_scale": 6.5, "aspect_ratio": "16:9"},
    },
    {
        "id": "portrait",
        "label": "Portrait",
        "description": "Sharper faces and centered subject framing.",
        "defaults": {"steps": 28, "cfg_scale": 7.0, "aspect_ratio": "3:4"},
    },
    {
        "id": "editorial",
        "label": "Editorial",
        "description": "Premium product and campaign visuals with clean light.",
        "defaults": {"steps": 32, "cfg_scale": 6.0, "aspect_ratio": "4:5"},
    },
]

CHECKOUT_CATALOG: Dict[CheckoutKind, Dict[str, Any]] = {
    CheckoutKind.PRO_MONTHLY: {
        "label": "Pro monthly",
        "credits": 1200,
        "price_usd": 18,
        "plan": IdentityPlan.PRO,
    },
    CheckoutKind.TOP_UP_SMALL: {
        "label": "Top-up 200",
        "credits": 200,
        "price_usd": 8,
        "plan": None,
    },
    CheckoutKind.TOP_UP_LARGE: {
        "label": "Top-up 800",
        "credits": 800,
        "price_usd": 24,
        "plan": None,
    },
}


class StudioService:
    def __init__(
        self,
        store: StudioStateStore,
        providers: ProviderRegistry,
        media_dir: Path,
        media_url_prefix: str = "/media",
    ) -> None:
        self.store = store
        self.providers = providers
        self.media_dir = media_dir
        self.media_dir.mkdir(parents=True, exist_ok=True)
        self.media_url_prefix = media_url_prefix.rstrip("/")
        self._tasks: set[asyncio.Task] = set()

    async def initialize(self) -> None:
        await self.store.load()

    async def get_public_identity(self, auth_user: Any | None) -> Dict[str, Any]:
        if auth_user is None:
            return {
                "guest": True,
                "identity": {
                    "id": "guest",
                    "email": "",
                    "display_name": "Guest",
                    "plan": IdentityPlan.GUEST.value,
                    "workspace_id": None,
                },
                "credits": {"remaining": 0, "monthly_remaining": 0, "extra_credits": 0},
                "plan": PLAN_CATALOG[IdentityPlan.GUEST].model_dump(mode="json"),
            }

        identity = await self.ensure_identity(
            user_id=auth_user.id,
            email=auth_user.email or f"{auth_user.id}@omnia.local",
            display_name=getattr(auth_user, "username", None) or "Creator",
        )
        return self.serialize_identity(identity)

    async def ensure_identity(self, user_id: str, email: str, display_name: str, desired_plan: IdentityPlan | None = None) -> OmniaIdentity:
        holder: Dict[str, OmniaIdentity] = {}

        def mutation(state: StudioState) -> None:
            identity = state.identities.get(user_id)
            now = utc_now()

            if identity is None:
                plan = desired_plan or IdentityPlan.FREE
                plan_config = PLAN_CATALOG[plan]
                identity = OmniaIdentity(
                    id=user_id,
                    email=email,
                    display_name=display_name or "Creator",
                    plan=plan,
                    workspace_id=f"ws_{user_id}",
                    guest=False,
                    subscription_status=SubscriptionStatus.ACTIVE if plan == IdentityPlan.PRO else SubscriptionStatus.NONE,
                    monthly_credits_remaining=plan_config.monthly_credits,
                    monthly_credit_allowance=plan_config.monthly_credits,
                    extra_credits=0,
                    last_credit_refresh_at=now,
                    created_at=now,
                    updated_at=now,
                )
                state.identities[identity.id] = identity
                state.workspaces[identity.workspace_id] = StudioWorkspace(
                    id=identity.workspace_id,
                    identity_id=identity.id,
                    name=f"{identity.display_name}'s Studio",
                )
                state.credit_ledger[f"grant_{identity.id}_{int(now.timestamp())}"] = CreditLedgerEntry(
                    identity_id=identity.id,
                    amount=plan_config.monthly_credits,
                    entry_type=CreditEntryType.MONTHLY_GRANT,
                    description=f"{plan_config.label} welcome credits",
                )
            else:
                if desired_plan and desired_plan != identity.plan:
                    identity.plan = desired_plan
                    identity.subscription_status = SubscriptionStatus.ACTIVE if desired_plan == IdentityPlan.PRO else SubscriptionStatus.NONE
                identity.email = email or identity.email
                identity.display_name = display_name or identity.display_name
                self._refresh_monthly_credits_locked(state, identity)
                identity.updated_at = now
                state.identities[identity.id] = identity

                if identity.workspace_id not in state.workspaces:
                    state.workspaces[identity.workspace_id] = StudioWorkspace(
                        id=identity.workspace_id,
                        identity_id=identity.id,
                        name=f"{identity.display_name}'s Studio",
                    )

            holder["identity"] = identity.model_copy(deep=True)

        await self.store.mutate(mutation)
        return holder["identity"]

    def serialize_identity(self, identity: OmniaIdentity) -> Dict[str, Any]:
        return {
            "guest": False,
            "identity": identity.model_dump(mode="json"),
            "credits": {
                "remaining": identity.monthly_credits_remaining + identity.extra_credits,
                "monthly_remaining": identity.monthly_credits_remaining,
                "extra_credits": identity.extra_credits,
            },
            "plan": PLAN_CATALOG[identity.plan].model_dump(mode="json"),
        }

    async def list_projects(self, identity_id: str) -> List[Project]:
        projects = await self.store.list_models("projects", Project)
        return sorted(
            [project for project in projects if project.identity_id == identity_id],
            key=lambda item: item.updated_at,
            reverse=True,
        )

    async def create_project(self, identity_id: str, title: str, description: str = "") -> Project:
        identity = await self.get_identity(identity_id)
        project = Project(
            workspace_id=identity.workspace_id,
            identity_id=identity_id,
            title=title.strip() or "Untitled Project",
            description=description.strip(),
        )
        await self.store.save_model("projects", project)
        return project

    async def get_project(self, identity_id: str, project_id: str) -> Dict[str, Any]:
        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        generations = await self.list_generations(identity_id, project_id=project_id)
        assets = await self.list_assets(identity_id, project_id=project_id)
        return {
            "project": project.model_dump(mode="json"),
            "recent_generations": [job.model_dump(mode="json") for job in generations[:10]],
            "recent_assets": [asset.model_dump(mode="json") for asset in assets[:16]],
        }

    async def list_generations(self, identity_id: str, project_id: Optional[str] = None) -> List[GenerationJob]:
        generations = await self.store.list_models("generations", GenerationJob)
        filtered = [job for job in generations if job.identity_id == identity_id]
        if project_id:
            filtered = [job for job in filtered if job.project_id == project_id]
        return sorted(filtered, key=lambda item: item.created_at, reverse=True)

    async def get_generation(self, identity_id: str, generation_id: str) -> GenerationJob:
        return await self.require_owned_model("generations", generation_id, GenerationJob, identity_id)

    async def list_assets(self, identity_id: str, project_id: Optional[str] = None) -> List[MediaAsset]:
        assets = await self.store.list_models("assets", MediaAsset)
        filtered = [asset for asset in assets if asset.identity_id == identity_id]
        if project_id:
            filtered = [asset for asset in filtered if asset.project_id == project_id]
        return sorted(filtered, key=lambda item: item.created_at, reverse=True)

    async def get_identity(self, identity_id: str) -> OmniaIdentity:
        identity = await self.store.get_model("identities", identity_id, OmniaIdentity)
        if identity is None:
            raise KeyError("Identity not found")
        await self.ensure_identity(identity.id, identity.email, identity.display_name, identity.plan)
        refreshed = await self.store.get_model("identities", identity_id, OmniaIdentity)
        if refreshed is None:
            raise KeyError("Identity not found after refresh")
        return refreshed

    async def create_generation(
        self,
        identity_id: str,
        project_id: str,
        prompt: str,
        negative_prompt: str,
        model_id: str,
        width: int,
        height: int,
        steps: int,
        cfg_scale: float,
        seed: int,
        aspect_ratio: str,
    ) -> GenerationJob:
        identity = await self.get_identity(identity_id)
        plan_config = PLAN_CATALOG[identity.plan]
        if not plan_config.can_generate:
            raise PermissionError("Guests cannot generate images")

        project = await self.require_owned_model("projects", project_id, Project, identity_id)
        model = self.get_model(model_id)
        self._validate_model_for_plan(identity.plan, model)
        self._validate_dimensions_for_model(width, height, model)

        available_credits = identity.monthly_credits_remaining + identity.extra_credits
        if available_credits < model.credit_cost:
            raise ValueError("Not enough credits to run this generation")

        prompt_snapshot = PromptSnapshot(
            prompt=prompt.strip(),
            negative_prompt=negative_prompt.strip(),
            model=model.id,
            width=width,
            height=height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            aspect_ratio=aspect_ratio,
        )
        job = GenerationJob(
            workspace_id=identity.workspace_id,
            project_id=project.id,
            identity_id=identity.id,
            model=model.id,
            prompt_snapshot=prompt_snapshot,
            estimated_cost=model.estimated_cost,
            credit_cost=model.credit_cost,
        )

        await self.store.save_model("generations", job)
        task = asyncio.create_task(self._process_generation(job.id))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return job

    async def create_share(self, identity_id: str, project_id: Optional[str], asset_id: Optional[str]) -> ShareLink:
        identity = await self.get_identity(identity_id)
        if not PLAN_CATALOG[identity.plan].share_links:
            raise PermissionError("Share links require Pro")
        if not project_id and not asset_id:
            raise ValueError("Provide a project_id or asset_id")
        if project_id:
            await self.require_owned_model("projects", project_id, Project, identity_id)
        if asset_id:
            await self.require_owned_model("assets", asset_id, MediaAsset, identity_id)

        share = ShareLink(identity_id=identity_id, project_id=project_id, asset_id=asset_id)
        await self.store.save_model("shares", share)
        return share

    async def get_public_share(self, token: str) -> Dict[str, Any]:
        shares = await self.store.list_models("shares", ShareLink)
        share = next((item for item in shares if item.token == token), None)
        if share is None:
            raise KeyError("Share not found")

        payload: Dict[str, Any] = {"share": share.model_dump(mode="json")}
        if share.project_id:
            project = await self.store.get_model("projects", share.project_id, Project)
            assets = await self.list_assets(share.identity_id, project_id=share.project_id)
            payload["project"] = project.model_dump(mode="json") if project else None
            payload["assets"] = [asset.model_dump(mode="json") for asset in assets]
        elif share.asset_id:
            asset = await self.store.get_model("assets", share.asset_id, MediaAsset)
            payload["asset"] = asset.model_dump(mode="json") if asset else None
        return payload

    async def billing_summary(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        ledger = await self.store.list_models("credit_ledger", CreditLedgerEntry)
        recent_entries = [
            entry for entry in sorted(ledger, key=lambda item: item.created_at, reverse=True)
            if entry.identity_id == identity_id
        ][:12]
        return {
            "plan": PLAN_CATALOG[identity.plan].model_dump(mode="json"),
            "subscription_status": identity.subscription_status.value,
            "credits": {
                "remaining": identity.monthly_credits_remaining + identity.extra_credits,
                "monthly_remaining": identity.monthly_credits_remaining,
                "monthly_allowance": identity.monthly_credit_allowance,
                "extra_credits": identity.extra_credits,
            },
            "checkout_options": [
                {"kind": kind.value, **meta}
                for kind, meta in CHECKOUT_CATALOG.items()
            ],
            "recent_activity": [entry.model_dump(mode="json") for entry in recent_entries],
        }

    async def checkout(self, identity_id: str, kind: CheckoutKind) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        config = CHECKOUT_CATALOG[kind]
        updated_holder: Dict[str, OmniaIdentity] = {}

        def mutation(state: StudioState) -> None:
            current = state.identities[identity.id]
            now = utc_now()
            if config["plan"] == IdentityPlan.PRO:
                current.plan = IdentityPlan.PRO
                current.subscription_status = SubscriptionStatus.ACTIVE
                current.monthly_credit_allowance = PLAN_CATALOG[IdentityPlan.PRO].monthly_credits
                current.monthly_credits_remaining = max(
                    current.monthly_credits_remaining,
                    PLAN_CATALOG[IdentityPlan.PRO].monthly_credits,
                )
            else:
                current.extra_credits += config["credits"]

            current.updated_at = now
            state.identities[current.id] = current
            state.credit_ledger[f"checkout_{kind.value}_{int(now.timestamp())}"] = CreditLedgerEntry(
                identity_id=current.id,
                amount=config["credits"],
                entry_type=CreditEntryType.SUBSCRIPTION if config["plan"] else CreditEntryType.TOP_UP,
                description=config["label"],
                checkout_kind=kind,
            )
            updated_holder["identity"] = current.model_copy(deep=True)

        await self.store.mutate(mutation)
        updated = updated_holder["identity"]
        return {
            "status": "demo_activated",
            "provider": "demo",
            "kind": kind.value,
            "identity": self.serialize_identity(updated),
        }

    async def health(self) -> Dict[str, Any]:
        state = await self.store.snapshot()
        provider_status = await self.providers.health_snapshot()
        return {
            "status": "healthy",
            "providers": provider_status,
            "counts": {
                "identities": len(state.identities),
                "projects": len(state.projects),
                "generations": len(state.generations),
                "assets": len(state.assets),
                "shares": len(state.shares),
            },
        }

    async def get_settings_payload(self, identity_id: str) -> Dict[str, Any]:
        identity = await self.get_identity(identity_id)
        return {
            "identity": self.serialize_identity(identity),
            "plans": [plan.model_dump(mode="json") for plan in PLAN_CATALOG.values()],
            "models": [model.model_dump(mode="json") for model in MODEL_CATALOG.values()],
            "presets": PRESET_CATALOG,
        }

    def get_model(self, model_id: str) -> ModelCatalogEntry:
        try:
            return MODEL_CATALOG[model_id]
        except KeyError as exc:
            raise KeyError("Model not found") from exc

    def _validate_model_for_plan(self, plan: IdentityPlan, model: ModelCatalogEntry) -> None:
        if plan == IdentityPlan.FREE and model.min_plan == IdentityPlan.PRO:
            raise PermissionError("This model requires Pro")
        if plan == IdentityPlan.GUEST:
            raise PermissionError("Guests cannot generate images")

    def _validate_dimensions_for_model(self, width: int, height: int, model: ModelCatalogEntry) -> None:
        if width > model.max_width or height > model.max_height:
            raise ValueError(f"{model.label} supports up to {model.max_width}x{model.max_height}")

    def _refresh_monthly_credits_locked(self, state: StudioState, identity: OmniaIdentity) -> None:
        plan_config = PLAN_CATALOG[identity.plan]
        identity.monthly_credit_allowance = plan_config.monthly_credits
        if identity.plan == IdentityPlan.GUEST:
            identity.monthly_credits_remaining = 0
            identity.last_credit_refresh_at = utc_now()
            return

        last = identity.last_credit_refresh_at.astimezone(timezone.utc)
        now = utc_now()
        if (last.year, last.month) != (now.year, now.month):
            identity.monthly_credits_remaining = plan_config.monthly_credits
            identity.last_credit_refresh_at = now
            state.credit_ledger[f"refresh_{identity.id}_{int(now.timestamp())}"] = CreditLedgerEntry(
                identity_id=identity.id,
                amount=plan_config.monthly_credits,
                entry_type=CreditEntryType.MONTHLY_GRANT,
                description=f"{plan_config.label} monthly refresh",
            )

    async def require_owned_model(self, collection: str, model_id: str, model_type, identity_id: str):
        model = await self.store.get_model(collection, model_id, model_type)
        if model is None or model.identity_id != identity_id:
            raise KeyError(f"{model_type.__name__} not found")
        return model

    async def _process_generation(self, job_id: str) -> None:
        await self._update_job_status(job_id, JobStatus.PROCESSING, provider="cloud")
        job = await self.store.get_model("generations", job_id, GenerationJob)
        if job is None:
            return

        try:
            result = await self.providers.generate(
                prompt=job.prompt_snapshot.prompt,
                negative_prompt=job.prompt_snapshot.negative_prompt,
                width=job.prompt_snapshot.width,
                height=job.prompt_snapshot.height,
                seed=job.prompt_snapshot.seed,
            )
            asset = await self._create_asset_from_result(job, result.provider, result.image_bytes, result.mime_type)

            def mutation(state: StudioState) -> None:
                current_job = state.generations[job.id]
                current_job.status = JobStatus.COMPLETED
                current_job.provider = result.provider
                current_job.outputs = [
                    GenerationOutput(
                        asset_id=asset.id,
                        url=asset.url,
                        thumbnail_url=asset.thumbnail_url,
                        mime_type=result.mime_type,
                        width=job.prompt_snapshot.width,
                        height=job.prompt_snapshot.height,
                    )
                ]
                current_job.completed_at = utc_now()
                current_job.updated_at = utc_now()
                state.generations[current_job.id] = current_job

                state.assets[asset.id] = asset
                project = state.projects[job.project_id]
                project.last_generation_id = current_job.id
                project.cover_asset_id = asset.id
                project.updated_at = utc_now()
                state.projects[project.id] = project

                identity = state.identities[job.identity_id]
                self._consume_credits_locked(identity, job.credit_cost)
                identity.updated_at = utc_now()
                state.identities[identity.id] = identity
                state.credit_ledger[f"spend_{current_job.id}"] = CreditLedgerEntry(
                    identity_id=identity.id,
                    amount=-job.credit_cost,
                    entry_type=CreditEntryType.GENERATION_SPEND,
                    description=f"{job.model} image generation",
                    job_id=current_job.id,
                )

            await self.store.mutate(mutation)
        except ProviderTemporaryError as exc:
            await self._update_job_status(job_id, JobStatus.RETRYABLE_FAILED, error=str(exc))
        except Exception as exc:
            await self._update_job_status(job_id, JobStatus.FAILED, error=str(exc))

    def _consume_credits_locked(self, identity: OmniaIdentity, amount: int) -> None:
        if identity.monthly_credits_remaining >= amount:
            identity.monthly_credits_remaining -= amount
            return
        remainder = amount - identity.monthly_credits_remaining
        identity.monthly_credits_remaining = 0
        identity.extra_credits = max(identity.extra_credits - remainder, 0)

    async def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        provider: Optional[str] = None,
        error: Optional[str] = None,
    ) -> None:
        def mutation(state: StudioState) -> None:
            job = state.generations.get(job_id)
            if job is None:
                return
            job.status = status
            job.updated_at = utc_now()
            if provider is not None:
                job.provider = provider
            if error is not None:
                job.error = error
            if status in (JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.RETRYABLE_FAILED):
                job.completed_at = utc_now()
            state.generations[job.id] = job

        await self.store.mutate(mutation)

    async def _create_asset_from_result(
        self,
        job: GenerationJob,
        provider: str,
        image_bytes: bytes,
        mime_type: str,
    ) -> MediaAsset:
        asset = MediaAsset(
            workspace_id=job.workspace_id,
            project_id=job.project_id,
            identity_id=job.identity_id,
            title=job.prompt_snapshot.prompt[:80] or "Untitled asset",
            prompt=job.prompt_snapshot.prompt,
            url="",
            local_path="",
            metadata={
                "provider": provider,
                "model": job.model,
                "seed": job.prompt_snapshot.seed,
                "steps": job.prompt_snapshot.steps,
                "cfg_scale": job.prompt_snapshot.cfg_scale,
                "width": job.prompt_snapshot.width,
                "height": job.prompt_snapshot.height,
                "negative_prompt": job.prompt_snapshot.negative_prompt,
            },
        )
        main_path = build_media_path(self.media_dir, asset.id, mime_type)
        thumb_path = self.media_dir / f"{asset.id}_thumb.jpg"
        await asyncio.to_thread(main_path.write_bytes, image_bytes)

        thumbnail_url = None
        try:
            image = await asyncio.to_thread(Image.open, io.BytesIO(image_bytes))
            thumb = image.copy()
            thumb.thumbnail((480, 480))
            await asyncio.to_thread(thumb.save, thumb_path, format="JPEG", quality=88)
            thumbnail_url = f"{self.media_url_prefix}/{thumb_path.name}"
        except Exception:
            thumbnail_url = None

        asset.local_path = str(main_path)
        asset.url = f"{self.media_url_prefix}/{main_path.name}"
        asset.thumbnail_url = thumbnail_url
        return asset
