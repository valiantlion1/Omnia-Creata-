from __future__ import annotations

import sys
from pathlib import Path

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from config.env import get_settings
from observability.context import bind_identity_id, bind_request_id


@pytest.fixture(autouse=True)
def _restore_backend_global_state():
    """Keep mutable global backend settings/service state from leaking across tests."""
    settings = get_settings()
    settings_snapshot = settings.model_copy(deep=True)
    bind_request_id("")
    bind_identity_id("")

    main_module = sys.modules.get("main")
    main_service = getattr(main_module, "service", None) if main_module is not None else None
    service_snapshot = None
    if main_service is not None:
        service_snapshot = {
            "_generation_runtime_mode": getattr(main_service, "_generation_runtime_mode", None),
            "generation_broker": getattr(main_service, "generation_broker", None),
            "_owns_generation_broker": getattr(main_service, "_owns_generation_broker", None),
            "_generation_broker_degraded_reason": getattr(
                main_service,
                "_generation_broker_degraded_reason",
                None,
            ),
            "_initialized": getattr(main_service, "_initialized", None),
        }

    try:
        yield
    finally:
        bind_request_id("")
        bind_identity_id("")
        for field_name in type(settings).model_fields:
            setattr(settings, field_name, getattr(settings_snapshot, field_name))

        if main_service is not None and service_snapshot is not None:
            for attribute_name, attribute_value in service_snapshot.items():
                setattr(main_service, attribute_name, attribute_value)
