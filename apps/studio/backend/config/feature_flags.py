"""Feature flag registry — simple env-backed flags for risky code paths.

**Purpose:** Give us a kill switch for new/risky behavior without a full
rollout/targeting system. Each flag is read from an environment variable
once at registry construction and cached; flipping a flag requires a
process restart. This is intentional — it keeps the flag check cost zero
in hot paths and makes behavior deterministic per deployment.

**Why not LaunchDarkly / GrowthBook?** We don't need user-level targeting
yet. When we do, replace this module with a thin adapter over the real
service — the public API (``FEATURE_FLAGS.is_enabled("...")``) won't change.

**Usage:**

    from config.feature_flags import FEATURE_FLAGS

    if FEATURE_FLAGS.is_enabled("circuit_breaker_enabled"):
        await breaker.call(op)
    else:
        await op()

**Adding a flag:**

    1. Register it in :data:`_DEFAULT_FLAGS` with a safe default.
    2. Reference it by name — no magic strings at call sites; prefer the
       module-level constants below for discoverability.
    3. Document the corresponding environment variable in README.

**Exposure:**
    :func:`FEATURE_FLAGS.snapshot` returns the full flag map, surfaced by
    ``/healthz/detail`` so operators can verify what's on without shelling
    into the container.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from threading import Lock
from typing import Any

logger = logging.getLogger("omnia.studio.feature_flags")


# ---------------------------------------------------------------------- flags
# Flag name -> (env var, default value). Keep names ``snake_case`` and stable;
# they appear in ``/healthz/detail`` and are searchable in logs.
_DEFAULT_FLAGS: dict[str, tuple[str, bool]] = {
    # Allow the generation broker factory to fall back to in-memory when
    # Redis URL is missing. Tests explicitly want False for strict paths.
    "broker_inmemory_fallback": ("STUDIO_FLAG_BROKER_INMEMORY_FALLBACK", False),
    # Wrap Redis/provider/pool calls with the circuit breaker utility.
    "circuit_breaker_enabled": ("STUDIO_FLAG_CIRCUIT_BREAKER_ENABLED", True),
    # Enable stricter input sanitization for chat/prompt fields.
    "strict_input_sanitization": ("STUDIO_FLAG_STRICT_INPUT_SANITIZATION", False),
    # Enforce RFC5322 email validation on auth endpoints.
    "strict_email_validation": ("STUDIO_FLAG_STRICT_EMAIL_VALIDATION", True),
    # Emit structured JSON log lines with correlation IDs.
    "structured_logging": ("STUDIO_FLAG_STRUCTURED_LOGGING", True),
    # Reject startup if config validation surfaces any bound violations.
    "strict_startup_validation": ("STUDIO_FLAG_STRICT_STARTUP_VALIDATION", False),
    # Redact Postgres DSN passwords from ``describe()`` payloads.
    "redact_dsn_passwords": ("STUDIO_FLAG_REDACT_DSN_PASSWORDS", True),
}


def _coerce_bool(raw: str | None, *, default: bool) -> bool:
    if raw is None:
        return default
    normalized = raw.strip().lower()
    if not normalized:
        return default
    if normalized in {"1", "true", "yes", "on", "enabled"}:
        return True
    if normalized in {"0", "false", "no", "off", "disabled"}:
        return False
    return default


@dataclass
class FeatureFlagRegistry:
    """Immutable-at-construction flag map.

    Instances are cheap to create but we keep a module-level singleton
    (``FEATURE_FLAGS``) so call sites don't re-parse env vars.
    """

    _flags: dict[str, bool] = field(default_factory=dict)
    _lock: Lock = field(default_factory=Lock, init=False, repr=False)

    @classmethod
    def from_environment(cls) -> "FeatureFlagRegistry":
        flags: dict[str, bool] = {}
        for name, (env_var, default) in _DEFAULT_FLAGS.items():
            flags[name] = _coerce_bool(os.environ.get(env_var), default=default)
        return cls(_flags=flags)

    def is_enabled(self, name: str) -> bool:
        with self._lock:
            if name not in self._flags:
                logger.warning(
                    "feature_flag.unknown",
                    extra={"flag": name, "subsystem": "feature_flags"},
                )
                return False
            return self._flags[name]

    def snapshot(self) -> dict[str, bool]:
        with self._lock:
            return dict(self._flags)

    def override(self, name: str, value: bool) -> None:
        """Test-only override. Do NOT call from production code paths."""
        with self._lock:
            self._flags[name] = bool(value)

    def refresh_from_environment(self) -> None:
        """Re-read all flags from env (useful for tests that mutate env vars)."""
        with self._lock:
            for name, (env_var, default) in _DEFAULT_FLAGS.items():
                self._flags[name] = _coerce_bool(
                    os.environ.get(env_var), default=default
                )


FEATURE_FLAGS = FeatureFlagRegistry.from_environment()


# Public flag name constants — prefer these over magic strings at call sites.
FLAG_BROKER_INMEMORY_FALLBACK = "broker_inmemory_fallback"
FLAG_CIRCUIT_BREAKER_ENABLED = "circuit_breaker_enabled"
FLAG_STRICT_INPUT_SANITIZATION = "strict_input_sanitization"
FLAG_STRICT_EMAIL_VALIDATION = "strict_email_validation"
FLAG_STRUCTURED_LOGGING = "structured_logging"
FLAG_STRICT_STARTUP_VALIDATION = "strict_startup_validation"
FLAG_REDACT_DSN_PASSWORDS = "redact_dsn_passwords"


__all__ = [
    "FeatureFlagRegistry",
    "FEATURE_FLAGS",
    "FLAG_BROKER_INMEMORY_FALLBACK",
    "FLAG_CIRCUIT_BREAKER_ENABLED",
    "FLAG_STRICT_INPUT_SANITIZATION",
    "FLAG_STRICT_EMAIL_VALIDATION",
    "FLAG_STRUCTURED_LOGGING",
    "FLAG_STRICT_STARTUP_VALIDATION",
    "FLAG_REDACT_DSN_PASSWORDS",
]
