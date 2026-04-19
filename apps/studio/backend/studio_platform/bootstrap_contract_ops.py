from __future__ import annotations

from typing import Any, Mapping, Sequence


def build_settings_bootstrap_payload(
    *,
    identity: Mapping[str, Any],
    entitlements: Mapping[str, Any],
    plans: Sequence[Mapping[str, Any]],
    models: Sequence[Mapping[str, Any]],
    presets: Any,
    compose_draft_id: str,
    chat_draft_id: str,
    styles: Mapping[str, Any],
    prompt_memory: Mapping[str, Any],
    active_sessions: Mapping[str, Any],
) -> dict[str, Any]:
    return {
        "identity": dict(identity),
        "entitlements": dict(entitlements),
        "plans": [dict(plan) for plan in plans],
        "models": [dict(model) for model in models],
        "presets": _clone_jsonish(presets),
        "draft_projects": {
            "compose": compose_draft_id,
            "chat": chat_draft_id,
        },
        "styles": dict(styles),
        "prompt_memory": dict(prompt_memory),
        "active_sessions": dict(active_sessions),
    }


def _clone_jsonish(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {str(key): _clone_jsonish(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_clone_jsonish(item) for item in value]
    if isinstance(value, tuple):
        return [_clone_jsonish(item) for item in value]
    return value
