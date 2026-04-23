"""Delegated StudioService methods that forward to sub-services.

Keeping these thin wrappers out of ``service.py`` helps the backend spine stay
focused on lifecycle and cross-service coordination instead of one-line
pass-through methods.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from .billing_ops import BillingStateSnapshot
from .models import (
    CostTelemetryEvent,
    GenerationJob,
    JobStatus,
    MediaAsset,
    ModelCatalogEntry,
    OmniaIdentity,
    PlanCatalogEntry,
    PromptSnapshot,
)
from .providers import ProviderReferenceImage


class StudioServiceDelegatesMixin:
    async def get_settings_payload(self, identity_id: str, *, current_session_id: str | None = None) -> Dict[str, Any]:
        return await self.shell.get_settings_payload(identity_id, current_session_id=current_session_id)

    async def record_access_session(self, *, identity_id: str, session_id: str | None, auth_provider: str | None, user_agent: str | None, client_ip: str | None, host_label: str | None, display_mode: str | None, token_issued_at: Any = None, token_expires_at: Any = None) -> None:
        await self.access_sessions.touch_session(identity_id=identity_id, session_id=session_id, auth_provider=auth_provider, user_agent=user_agent, client_ip=client_ip, host_label=host_label, display_mode=display_mode, token_issued_at=token_issued_at, token_expires_at=token_expires_at)

    async def get_access_sessions_payload(self, *, identity_id: str, current_session_id: str | None) -> Dict[str, Any]:
        return await self.access_sessions.build_payload(identity_id=identity_id, current_session_id=current_session_id)

    async def revoke_other_access_sessions(self, *, identity_id: str, current_session_id: str | None, reason: str = "signed_out_elsewhere") -> Dict[str, Any]:
        return await self.access_sessions.revoke_other_sessions(identity_id=identity_id, current_session_id=current_session_id, reason=reason)

    async def is_access_session_active(self, *, identity_id: str, session_id: str | None) -> bool:
        return await self.access_sessions.is_session_active(identity_id=identity_id, session_id=session_id)

    async def get_login_lockout_status(self, *, identifier: str | None, max_attempts: int, lockout_window: timedelta) -> Dict[str, Any] | None:
        return await self.access_sessions.get_login_lockout_status(identifier=identifier, max_attempts=max_attempts, lockout_window=lockout_window)

    async def record_login_result(self, *, identifier: str | None, success: bool, lockout_window: timedelta) -> None:
        await self.access_sessions.record_login_result(identifier=identifier, success=success, lockout_window=lockout_window)

    def get_access_session_context_from_token(self, access_token: str | None) -> Dict[str, Any]:
        return self.access_sessions.session_context_from_token(access_token)

    async def list_models_for_identity(self, identity: OmniaIdentity | None = None) -> List[ModelCatalogEntry]:
        return await self.shell.list_models_for_identity(identity)

    async def get_model(self, model_id: str) -> ModelCatalogEntry:
        return await self.shell.get_model(model_id)

    def _serialize_model_catalog_for_identity(self, *, identity: OmniaIdentity, model: ModelCatalogEntry, billing_state: BillingStateSnapshot | None = None) -> Dict[str, Any]:
        return self.shell.serialize_model_catalog_for_identity(identity=identity, model=model, billing_state=billing_state)

    def _validate_model_for_identity(self, identity: OmniaIdentity, model: ModelCatalogEntry, *, billing_state: BillingStateSnapshot | None = None) -> None:
        self.shell.validate_model_for_identity(identity, model, billing_state=billing_state)

    def _validate_dimensions_for_model(self, width: int, height: int, model: ModelCatalogEntry) -> None:
        self.shell.validate_dimensions_for_model(width, height, model)

    def _normalize_generation_aspect_ratio(self, aspect_ratio: str | None) -> str:
        return self.shell.normalize_generation_aspect_ratio(aspect_ratio)

    def _resolve_generation_dimensions_for_model(self, *, model: ModelCatalogEntry, aspect_ratio: str) -> tuple[int, int]:
        return self.shell.resolve_generation_dimensions_for_model(model=model, aspect_ratio=aspect_ratio)

    def _refresh_monthly_credits_locked(self, state, identity: OmniaIdentity) -> None:
        return self.billing._refresh_monthly_credits_locked(state=state, identity=identity)

    async def improve_generation_prompt(self, prompt: str, *, identity_id: str | None = None) -> Dict[str, Any]:
        return await self.generation.improve_generation_prompt(prompt=prompt, identity_id=identity_id)

    def _fallback_enhanced_prompt(self, prompt: str) -> str:
        return self.generation._fallback_enhanced_prompt(prompt=prompt)

    def _sanitize_generation_text(self, value: str, *, field_name: str, max_length: int) -> str:
        return self.generation._sanitize_generation_text(value=value, field_name=field_name, max_length=max_length)

    async def require_owned_model(self, collection: str, model_id: str, model_type, identity_id: str):
        model = await self.store.get_model(collection, model_id, model_type)
        if model is None or model.identity_id != identity_id:
            raise KeyError(f"{model_type.__name__} not found")
        return model

    async def _process_generation(self, job_id: str) -> None:
        return await self.generation._process_generation(job_id=job_id)

    async def _update_job_status(self, job_id: str, status: JobStatus, provider: Optional[str] = None, provider_billable: Optional[bool] = None, error: Optional[str] = None, error_code: Optional[str] = None) -> Optional[GenerationJob]:
        return await self.generation._update_job_status(job_id=job_id, status=status, provider=provider, provider_billable=provider_billable, error=error, error_code=error_code)

    async def _get_generation_job_snapshot(self, job_id: str) -> Optional[GenerationJob]:
        return await self.generation._get_generation_job_snapshot(job_id=job_id)

    def _normalize_generation_error_message(self, exc: Exception) -> str:
        return self.generation._normalize_generation_error_message(exc=exc)

    def _classify_generation_error_code(self, exc: Exception) -> str:
        return self.generation._classify_generation_error_code(exc=exc)

    def _generation_retry_limit_for_job(self, job: GenerationJob, *, provider_billable: Optional[bool] = None) -> int:
        return self.generation._generation_retry_limit_for_job(job=job, provider_billable=provider_billable)

    def _log_generation_event(
        self,
        event: str,
        *,
        job: GenerationJob,
        status: JobStatus,
        provider: str | None = None,
        error: str | None = None,
        error_code: str | None = None,
        started_at: datetime | None = None,
        finished_at: datetime | None = None,
        level: int = logging.INFO,
    ) -> None:
        return self.generation._log_generation_event(event=event, job=job, status=status, provider=provider, error=error, error_code=error_code, started_at=started_at, finished_at=finished_at, level=level)

    async def _ensure_generation_capacity(self, *, identity: OmniaIdentity, project_id: str, model_id: str, prompt_snapshot: PromptSnapshot, plan_config: PlanCatalogEntry) -> None:
        return await self.generation._ensure_generation_capacity(identity=identity, project_id=project_id, model_id=model_id, prompt_snapshot=prompt_snapshot, plan_config=plan_config)

    def _estimate_queue_wait_seconds(self, queued_jobs: int) -> int:
        return self.generation._estimate_queue_wait_seconds(queued_jobs=queued_jobs)

    async def _create_asset_from_result(self, job: GenerationJob, provider: str, image_bytes: bytes, mime_type: str, variation_index: int = 0, variation_count: int = 1, seed: Optional[int] = None) -> MediaAsset:
        return await self.generation._create_asset_from_result(job=job, provider=provider, image_bytes=image_bytes, mime_type=mime_type, variation_index=variation_index, variation_count=variation_count, seed=seed)

    async def _load_generation_reference_image(self, job: GenerationJob) -> Optional[ProviderReferenceImage]:
        return await self.generation._load_generation_reference_image(job=job)

    async def _read_asset_bytes(self, asset: MediaAsset, *, variant: str) -> tuple[bytes, str]:
        return await self.generation._read_asset_bytes(asset=asset, variant=variant)

    async def _store_asset_payload(self, *, asset: MediaAsset, image_bytes: bytes, mime_type: str, clean_image_bytes: Optional[bytes] = None, clean_mime_type: Optional[str] = None, storage_prefix: str) -> None:
        return await self.generation._store_asset_payload(asset=asset, image_bytes=image_bytes, mime_type=mime_type, clean_image_bytes=clean_image_bytes, clean_mime_type=clean_mime_type, storage_prefix=storage_prefix)

    def _extension_for_mime_type(self, mime_type: str) -> str:
        return self.generation._extension_for_mime_type(mime_type=mime_type)

    async def export_identity_data(self, identity_id: str) -> Dict[str, Any]:
        return await self.identity.export_identity_data(identity_id=identity_id)

    async def permanently_delete_identity(self, identity_id: str) -> bool:
        return await self.identity.permanently_delete_identity(identity_id=identity_id)

    async def process_paddle_webhook(self, payload: Dict[str, Any]) -> None:
        return await self.billing.process_paddle_webhook(payload=payload)

    async def process_lemonsqueezy_webhook(self, payload: Dict[str, Any]) -> None:
        raise RuntimeError("LemonSqueezy webhooks have been retired. Use Paddle webhook processing instead.")
