from __future__ import annotations

from pathlib import Path

import httpx
import pytest
from fastapi import FastAPI, Request

import studio_platform.router as router_module
from config.feature_flags import FEATURE_FLAGS, FLAG_STRICT_INPUT_SANITIZATION
from security.moderation_engine import AgeAmbiguity, ContextType, PromptRiskLevel, SexualIntent
from security.auth import User, UserRole
from security.rate_limit import InMemoryRateLimiter
from studio_platform.models import (
    GenerationJob,
    IdentityPlan,
    JobStatus,
    OmniaIdentity,
    PromptSnapshot,
    SubscriptionStatus,
)
from studio_platform.providers import ProviderRegistry
from studio_platform.router import create_router
from studio_platform.service import GenerationCapacityError, StudioService
from studio_platform.studio_model_contract import STUDIO_FAST_MODEL_ID, STUDIO_LAUNCH_MODEL_IDS
from studio_platform.store import StudioStateStore


async def _safe_prompt(_: str):
    return router_module.ModerationResult.SAFE, None


def _build_generation_job(**overrides: object) -> GenerationJob:
    return GenerationJob(
        id="job-test",
        workspace_id="ws-user-1",
        project_id="project-1",
        identity_id="user-1",
        title="Test Job",
        provider="pollinations",
        provider_rollout_tier="standard",
        provider_billable=False,
        requested_quality_tier="standard",
        selected_quality_tier="standard",
        degraded=False,
        routing_strategy="free-first",
        routing_reason="free_standard_default",
        prompt_profile="generic",
        provider_candidates=["pollinations", "huggingface", "demo"],
        model="flux-schnell",
        estimated_cost=0.0,
        estimated_cost_source="catalog_fallback",
        pricing_lane="fallback",
        credit_cost=80,
        reserved_credit_cost=40,
        credit_status="reserved",
        output_count=1,
        prompt_snapshot=PromptSnapshot(
            prompt="test prompt",
            negative_prompt="",
            model="flux-schnell",
            width=1536,
            height=1536,
            steps=28,
            cfg_scale=6.5,
            seed=1,
            aspect_ratio="1:1",
        ),
        **overrides,
    )


async def _build_test_app(tmp_path: Path) -> tuple[FastAPI, StudioService, InMemoryRateLimiter]:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    rate_limiter = InMemoryRateLimiter()
    await rate_limiter.initialize()
    await service.initialize()

    app = FastAPI()

    async def _current_user(request: Request) -> User:
        user_id = request.headers.get("X-Test-User", "user-1")
        email = request.headers.get("X-Test-Email", f"{user_id}@example.com")
        is_verified = request.headers.get("X-Test-Verified", "true").strip().lower() in {"1", "true", "yes"}
        return User(
            id=user_id,
            email=email,
            username=user_id,
            role=UserRole.USER,
            is_active=True,
            is_verified=is_verified,
        )

    app.dependency_overrides[router_module.get_current_user] = _current_user
    app.include_router(create_router(service, rate_limiter))
    return app, service, rate_limiter


@pytest.mark.asyncio
async def test_models_endpoint_exposes_launch_catalog_contract(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/v1/models", headers={"X-Test-User": "user-1"})

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["default_model_id"] == STUDIO_FAST_MODEL_ID
        assert payload["launch_model_ids"] == list(STUDIO_LAUNCH_MODEL_IDS)
        assert [model["id"] for model in payload["models"]] == list(STUDIO_LAUNCH_MODEL_IDS)
        assert [model["label"] for model in payload["models"]] == [
            "GPT Image 2",
            "Nano Banana",
            "Nano Banana 2",
            "Grok Imagine Image Pro",
            "Wan 2.7 Image Pro",
            "FLUX.2 Max",
        ]
        assert all(model["provider_hint"] == "runware" for model in payload["models"])
        assert payload["models"][0]["route_preview"]["planned_provider"]
        assert payload["models"][0]["render_experience"]["state"] in {"ready", "fallback", "blocked"}
        assert "flux-2-klein" not in {model["id"] for model in payload["models"]}
        assert "qwen-image-2512" not in {model["id"] for model in payload["models"]}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_returns_structured_queue_full_response(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_create_generation(**_: object) -> GenerationJob:
        raise GenerationCapacityError(
            "Generation queue is currently full. Please try again shortly.",
            queue_full=True,
            estimated_wait_seconds=90,
        )

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "editorial portrait",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 429
        assert response.json()["queue_full"] is True
        assert response.json()["estimated_wait_seconds"] == 90
        assert response.headers["X-Queue-Full"] == "true"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_distinguishes_queue_unavailable_from_queue_full(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_create_generation(**_: object) -> GenerationJob:
        raise GenerationCapacityError(
            "Generation queue is temporarily unavailable. Please try again shortly.",
            queue_full=False,
            estimated_wait_seconds=30,
        )

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "editorial portrait",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 429
        assert response.json()["queue_full"] is False
        assert response.json()["estimated_wait_seconds"] == 30
        assert response.headers["X-Queue-Full"] == "false"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_returns_routing_metadata(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_create_generation(**_: object) -> GenerationJob:
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "editorial portrait",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 202
        payload = response.json()
        assert payload["provider"] == "pollinations"
        assert payload["requested_quality_tier"] == "standard"
        assert payload["selected_quality_tier"] == "standard"
        assert payload["degraded"] is False
        assert payload["routing_strategy"] == "free-first"
        assert payload["routing_reason"] == "free_standard_default"
        assert payload["prompt_profile"] == "generic"
        assert payload["reserved_credit_cost"] == 40
        assert payload["final_credit_cost"] is None
        assert payload["credit_charge_policy"] == "none"
        assert payload["credit_status"] == "reserved"
        assert payload["pricing_lane"] == "fallback"
        assert payload["estimated_cost_source"] == "catalog_fallback"
        assert payload["creative_profile"]["id"] == "gpt-image-2"
        assert payload["creative_profile"]["label"] == "GPT Image 2"
        assert payload["render_experience"]["state"] == "fallback"
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_capacity_uses_repository_status_counts(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = StudioStateStore(tmp_path / "state.json")
    service = StudioService(store, ProviderRegistry(), tmp_path / "media")
    await service.initialize()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
        plan=IdentityPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        monthly_credits_remaining=1200,
        monthly_credit_allowance=1200,
    )
    prompt_snapshot = PromptSnapshot(
        prompt="editorial portrait",
        negative_prompt="",
        model="flux-schnell",
        width=1024,
        height=1024,
        steps=28,
        cfg_scale=6.5,
        seed=1,
        aspect_ratio="1:1",
    )

    async def _explode_list(*args, **kwargs):
        raise AssertionError("queue admission should not materialize queued jobs")

    async def _count_queued(statuses):
        assert statuses == {JobStatus.QUEUED}
        return min(service.settings.max_queue_size, 50)

    async def _zero(*args, **kwargs):
        return 0

    async def _no_duplicate(*args, **kwargs):
        return False

    monkeypatch.setattr(service.store, "list_generations_with_statuses", _explode_list)
    monkeypatch.setattr(service.store, "count_generations_with_statuses", _count_queued)
    monkeypatch.setattr(service.store, "count_incomplete_generations", _zero)
    monkeypatch.setattr(service.store, "count_incomplete_generations_for_identity", _zero)
    monkeypatch.setattr(service.store, "count_recent_generation_requests_for_identity", _zero)
    monkeypatch.setattr(service.store, "has_duplicate_incomplete_generation", _no_duplicate)

    try:
        with pytest.raises(GenerationCapacityError, match="Generation queue is currently full"):
            await service.generation._ensure_generation_capacity(
                identity=identity,
                project_id="project-1",
                model_id="flux-schnell",
                prompt_snapshot=prompt_snapshot,
                plan_config=service.plan_catalog[IdentityPlan.PRO],
            )
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_returns_error_code_for_failed_jobs(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_get_generation(_: str, __: str) -> GenerationJob:
        job = _build_generation_job()
        job.status = JobStatus.FAILED
        job.error = "Runware flagged the output as potentially sensitive"
        job.error_code = "safety_block"
        job.credit_status = "released"
        job.final_credit_cost = 0
        return job

    service.get_generation = fake_get_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/generations/job-test",
            headers={"X-Test-User": "user-1"},
        )

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["error_code"] == "safety_block"
        assert payload["credit_status"] == "released"
        assert payload["final_credit_cost"] == 0
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_sanitizes_prompt_inputs_when_strict_flag_is_enabled(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original_flag = FEATURE_FLAGS.is_enabled(FLAG_STRICT_INPUT_SANITIZATION)
    FEATURE_FLAGS.override(FLAG_STRICT_INPUT_SANITIZATION, True)
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)
    captured: dict[str, str] = {}

    async def fake_create_generation(**kwargs: object) -> GenerationJob:
        captured["prompt"] = str(kwargs["prompt"])
        captured["negative_prompt"] = str(kwargs["negative_prompt"])
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "editorial\u200b portrait\x00",
                "negative_prompt": "grainy\r\n\tbad\x7f",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 202
        assert captured["prompt"] == "editorial portrait"
        assert captured["negative_prompt"] == "grainy\n\tbad"
    finally:
        FEATURE_FLAGS.override(FLAG_STRICT_INPUT_SANITIZATION, original_flag)
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_rejects_excessive_character_repetition_when_strict_flag_is_enabled(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    original_flag = FEATURE_FLAGS.is_enabled(FLAG_STRICT_INPUT_SANITIZATION)
    FEATURE_FLAGS.override(FLAG_STRICT_INPUT_SANITIZATION, True)
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "a" * 2050,
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 422
    finally:
        FEATURE_FLAGS.override(FLAG_STRICT_INPUT_SANITIZATION, original_flag)
        await service.shutdown()


@pytest.mark.asyncio
async def test_delete_generation_endpoint_returns_deleted_status(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_delete_generation(identity_id: str, generation_id: str) -> dict[str, str]:
        assert identity_id == "user-1"
        assert generation_id == "job-test"
        return {"generation_id": generation_id, "status": "deleted"}

    service.delete_generation = fake_delete_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.delete(
            "/v1/generations/job-test",
            headers={"X-Test-User": "user-1"},
        )

    try:
        assert response.status_code == 200
        assert response.json() == {"generation_id": "job-test", "status": "deleted"}
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_requires_verified_account_before_job_creation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)
    create_generation_called = False

    async def fake_create_generation(**_: object) -> GenerationJob:
        nonlocal create_generation_called
        create_generation_called = True
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1", "X-Test-Verified": "false"},
            json={
                "project_id": "project-1",
                "prompt": "editorial portrait",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 403
        assert response.json() == {"detail": "Verify your email address before creating generations."}
        assert create_generation_called is False
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_profiles_me_returns_profile_payload_for_authenticated_user(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    await service.ensure_identity(
        user_id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(
            "/v1/profiles/me",
            headers={"X-Test-User": "user-1", "X-Test-Email": "user@example.com"},
        )

    try:
        assert response.status_code == 200
        payload = response.json()
        assert payload["own_profile"] is True
        assert payload["can_edit"] is True
        assert payload["profile"]["username"] == "userone"
        assert payload["profile"]["usage_summary"] is not None
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_enforces_per_user_rate_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_create_generation(**_: object) -> GenerationJob:
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for index in range(10):
            response = await client.post(
                "/v1/generations",
                headers={"X-Test-User": "user-1"},
                json={
                    "project_id": "project-1",
                    "prompt": f"editorial portrait {index}",
                    "negative_prompt": "",
                    "model": "flux-schnell",
                    "width": 1024,
                    "height": 1024,
                    "steps": 28,
                    "cfg_scale": 6.5,
                    "seed": index,
                    "aspect_ratio": "1:1",
                    "output_count": 1,
                },
            )
            assert response.status_code == 202

        blocked = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "blocked request",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 77,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert blocked.status_code == 429
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_enforces_per_ip_rate_limit_across_users(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_create_generation(**_: object) -> GenerationJob:
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for index in range(20):
            response = await client.post(
                "/v1/generations",
                headers={"X-Test-User": f"user-{index}"},
                json={
                    "project_id": "project-1",
                    "prompt": f"editorial portrait {index}",
                    "negative_prompt": "",
                    "model": "flux-schnell",
                    "width": 1024,
                    "height": 1024,
                    "steps": 28,
                    "cfg_scale": 6.5,
                    "seed": index,
                    "aspect_ratio": "1:1",
                    "output_count": 1,
                },
            )
            assert response.status_code == 202

        blocked = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-21"},
            json={
                "project_id": "project-1",
                "prompt": "blocked by ip limit",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 21,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert blocked.status_code == 429
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_rejects_negative_prompt_over_limit(tmp_path: Path) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "editorial portrait",
                "negative_prompt": "x" * 501,
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 422
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_bypasses_rate_limit_for_privileged_email(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    settings = router_module.get_settings()
    original_owner_emails = settings.studio_owner_emails
    original_root_admin_emails = settings.studio_root_admin_emails
    settings.studio_owner_emails = "alierdincyigitaslan@gmail.com,ghostsofter12@gmail.com"
    settings.studio_root_admin_emails = "alierdincyigitaslan@gmail.com,ghostsofter12@gmail.com"

    app, service, _ = await _build_test_app(tmp_path)
    monkeypatch.setattr(router_module, "check_prompt_safety", _safe_prompt)

    async def fake_create_generation(**_: object) -> GenerationJob:
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        for index in range(12):
            response = await client.post(
                "/v1/generations",
                headers={
                    "X-Test-User": "owner-1",
                    "X-Test-Email": "ghostsofter12@gmail.com",
                },
                json={
                    "project_id": "project-1",
                    "prompt": f"owner portrait {index}",
                    "negative_prompt": "",
                    "model": "flux-schnell",
                    "width": 1024,
                    "height": 1024,
                    "steps": 28,
                    "cfg_scale": 6.5,
                    "seed": index,
                    "aspect_ratio": "1:1",
                    "output_count": 1,
                },
            )
            assert response.status_code == 202

    try:
        pass
    finally:
        settings.studio_owner_emails = original_owner_emails
        settings.studio_root_admin_emails = original_root_admin_emails
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_rejects_hard_block_with_403_and_no_job_creation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def hard_block(_: str):
        return router_module.ModerationResult.HARD_BLOCK, "violence"

    monkeypatch.setattr(router_module, "check_prompt_safety", hard_block)
    create_generation_called = False

    async def fake_create_generation(**_: object) -> GenerationJob:
        nonlocal create_generation_called
        create_generation_called = True
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "violent prompt",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 403
        assert create_generation_called is False
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_rejects_soft_block_with_403_and_no_job_creation(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def soft_block(_: str):
        return router_module.ModerationResult.SOFT_BLOCK, "sexy"

    monkeypatch.setattr(router_module, "check_prompt_safety", soft_block)
    create_generation_called = False

    async def fake_create_generation(**_: object) -> GenerationJob:
        nonlocal create_generation_called
        create_generation_called = True
        return _build_generation_job()

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "sexy prompt",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 403
        assert create_generation_called is False
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_allows_review_prompt_and_passes_low_moderation_tier(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def review(_: str):
        return router_module.PromptModerationDecision(
            result=router_module.ModerationResult.REVIEW,
            reason="bikini",
            provider_moderation="low",
            provider_review_required=True,
        )

    monkeypatch.setattr(router_module, "check_prompt_safety", review)
    captured_kwargs: dict[str, object] = {}

    async def fake_create_generation(**kwargs: object) -> GenerationJob:
        captured_kwargs.update(kwargs)
        return _build_generation_job(
            moderation_tier=str(kwargs.get("moderation_tier") or "auto"),
            moderation_reason=str(kwargs.get("moderation_reason") or "") or None,
            moderation_action=str(kwargs.get("moderation_action") or "allow"),
            moderation_risk_level=str(kwargs.get("moderation_risk_level") or "low"),
            moderation_risk_score=int(kwargs.get("moderation_risk_score") or 0),
            moderation_age_ambiguity=str(kwargs.get("moderation_age_ambiguity") or "unknown"),
            moderation_sexual_intent=str(kwargs.get("moderation_sexual_intent") or "none"),
            moderation_context_type=str(kwargs.get("moderation_context_type") or "general"),
            moderation_audit_id=str(kwargs.get("moderation_audit_id") or "") or None,
            moderation_rewrite_applied=bool(kwargs.get("moderation_rewrite_applied")),
            moderation_rewritten_prompt=str(kwargs.get("moderation_rewritten_prompt") or "") or None,
            moderation_llm_used=bool(kwargs.get("moderation_llm_used")),
        )

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "editorial swimsuit portrait",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 202
        assert captured_kwargs["moderation_tier"] == "low"
        assert captured_kwargs["moderation_reason"] == "bikini"
        assert captured_kwargs["moderation_action"] == "review"
        payload = response.json()
        assert payload["moderation"]["tier"] == "low"
        assert payload["moderation"]["reason"] == "bikini"
        assert payload["moderation"]["review_routed"] is True
        assert payload["moderation"]["decision"] == "review"
        assert payload["moderation"]["rewrite_applied"] is False
        assert payload["moderation"]["audit_id"] is not None
    finally:
        await service.shutdown()


@pytest.mark.asyncio
async def test_generation_endpoint_rewrites_ambiguous_prompt_and_persists_audit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app, service, _ = await _build_test_app(tmp_path)

    async def rewrite(_: str):
        return router_module.PromptModerationDecision(
            result=router_module.ModerationResult.REVIEW,
            action=router_module.ModerationAction.REWRITE,
            risk_level=PromptRiskLevel.MEDIUM,
            risk_score=42,
            reason="age_ambiguity",
            age_ambiguity=AgeAmbiguity.AMBIGUOUS,
            sexual_intent=SexualIntent.MILD,
            context_type=ContextType.SWIMWEAR,
            rewrite_applied=True,
            rewritten_prompt="adult woman in swimwear, summer fashion portrait",
        )

    monkeypatch.setattr(router_module, "check_prompt_safety", rewrite)
    captured_kwargs: dict[str, object] = {}

    async def fake_create_generation(**kwargs: object) -> GenerationJob:
        captured_kwargs.update(kwargs)
        return _build_generation_job(
            moderation_tier=str(kwargs.get("moderation_tier") or "auto"),
            moderation_reason=str(kwargs.get("moderation_reason") or "") or None,
            moderation_action=str(kwargs.get("moderation_action") or "allow"),
            moderation_risk_level=str(kwargs.get("moderation_risk_level") or "low"),
            moderation_risk_score=int(kwargs.get("moderation_risk_score") or 0),
            moderation_age_ambiguity=str(kwargs.get("moderation_age_ambiguity") or "unknown"),
            moderation_sexual_intent=str(kwargs.get("moderation_sexual_intent") or "none"),
            moderation_context_type=str(kwargs.get("moderation_context_type") or "general"),
            moderation_audit_id=str(kwargs.get("moderation_audit_id") or "") or None,
            moderation_rewrite_applied=bool(kwargs.get("moderation_rewrite_applied")),
            moderation_rewritten_prompt=str(kwargs.get("moderation_rewritten_prompt") or "") or None,
            moderation_llm_used=bool(kwargs.get("moderation_llm_used")),
        )

    service.create_generation = fake_create_generation  # type: ignore[method-assign]

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.post(
            "/v1/generations",
            headers={"X-Test-User": "user-1"},
            json={
                "project_id": "project-1",
                "prompt": "girl with bikini",
                "negative_prompt": "",
                "model": "flux-schnell",
                "width": 1024,
                "height": 1024,
                "steps": 28,
                "cfg_scale": 6.5,
                "seed": 1,
                "aspect_ratio": "1:1",
                "output_count": 1,
            },
        )

    try:
        assert response.status_code == 202
        assert captured_kwargs["prompt"] == "adult woman in swimwear, summer fashion portrait"
        assert captured_kwargs["source_prompt"] == "girl with bikini"
        assert captured_kwargs["moderation_action"] == "rewrite"
        assert captured_kwargs["moderation_rewrite_applied"] is True

        payload = response.json()
        assert payload["moderation"]["decision"] == "rewrite"
        assert payload["moderation"]["rewrite_applied"] is True
        assert payload["moderation"]["rewritten_prompt"] == "adult woman in swimwear, summer fashion portrait"

        snapshot = await service.store.snapshot()
        assert len(snapshot.moderation_audits) == 1
        audit = next(iter(snapshot.moderation_audits.values()))
        assert audit.original_text == "girl with bikini"
        assert audit.final_text == "adult woman in swimwear, summer fashion portrait"
        assert audit.action == "rewrite"
    finally:
        await service.shutdown()
