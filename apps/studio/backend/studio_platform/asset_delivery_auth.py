from __future__ import annotations

import hashlib
import hmac
import secrets
from pathlib import Path
from typing import Any

from config.env import Environment

DEVELOPMENT_LEGACY_ASSET_SECRET = "omnia-creata-local-dev-secret-2026"
_DEVELOPMENT_JWT_FALLBACK = "dev-jwt-secret-0123456789abcdef0123456789abcdef"
_ASSET_DELIVERY_SECRET_CONTEXT = "omnia-studio-asset-delivery:v2"
_ASSET_DELIVERY_SECRET_FILENAME = "asset-delivery-secret.txt"


def _derive_scoped_secret(seed: str, *, scope: str) -> str:
    return hmac.new(
        seed.encode("utf-8"),
        scope.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def _load_or_create_development_delivery_secret(runtime_root: Path) -> str:
    secret_path = runtime_root / "config" / _ASSET_DELIVERY_SECRET_FILENAME
    secret_path.parent.mkdir(parents=True, exist_ok=True)
    if secret_path.exists():
        existing = secret_path.read_text(encoding="utf-8").strip()
        if len(existing) >= 32:
            return existing

    generated = secrets.token_urlsafe(48)
    secret_path.write_text(generated, encoding="utf-8")
    return generated


def resolve_asset_delivery_secrets(*, settings: Any, configured_jwt_secret: str) -> tuple[str, str]:
    legacy_secret = configured_jwt_secret or DEVELOPMENT_LEGACY_ASSET_SECRET

    if settings.environment != Environment.DEVELOPMENT:
        return _derive_scoped_secret(legacy_secret, scope=_ASSET_DELIVERY_SECRET_CONTEXT), legacy_secret

    using_default_development_secret = configured_jwt_secret in {"", _DEVELOPMENT_JWT_FALLBACK}
    if using_default_development_secret:
        seed = _load_or_create_development_delivery_secret(settings.runtime_root_path)
    else:
        seed = configured_jwt_secret
    return _derive_scoped_secret(seed, scope=_ASSET_DELIVERY_SECRET_CONTEXT), legacy_secret
