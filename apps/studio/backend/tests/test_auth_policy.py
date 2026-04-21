from __future__ import annotations

from fastapi import FastAPI
import pytest

from main import app
from security.auth_policy import missing_route_policies, validate_route_policy_coverage


def test_route_policy_covers_registered_application_routes() -> None:
    assert missing_route_policies(app) == []


def test_validate_route_policy_coverage_raises_for_unmapped_route() -> None:
    demo = FastAPI()

    @demo.get("/unmapped")
    async def unmapped() -> dict[str, str]:
        return {"status": "ok"}

    with pytest.raises(RuntimeError, match=r"GET /unmapped"):
        validate_route_policy_coverage(demo, route_policy={})
