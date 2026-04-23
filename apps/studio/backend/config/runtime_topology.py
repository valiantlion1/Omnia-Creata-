"""Shared generation runtime topology rules.

Keep launch-shape runtime decisions in one place so startup validation,
readiness reporting, and operator health cannot silently drift apart.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

DEFAULT_GENERATION_RUNTIME_MODE = "all"
SPLIT_GENERATION_RUNTIME_MODES = frozenset({"web", "worker"})
LAUNCH_ENVIRONMENTS = frozenset({"staging", "production"})
LOCAL_FALLBACK_RUNTIME_MODES = frozenset({"all", "web"})

ALL_IN_ONE_DEVELOPMENT_ONLY_ERROR = (
    "All-in-one generation runtime is development-only; use split web/worker plus a shared broker outside local development."
)
GENERATION_RUNTIME_MODE_SPLIT_REQUIRED_PRODUCTION_ERROR = (
    "GENERATION_RUNTIME_MODE must be set to 'web' or 'worker' in staging and production environments"
)
GENERATION_RUNTIME_MODE_SPLIT_REQUIRED_RUNTIME_ERROR = (
    "GENERATION_RUNTIME_MODE must be set to web or worker in staging/production"
)
SHARED_GENERATION_BROKER_REQUIRED_ERROR = (
    "Shared generation broker is required for split runtime outside local development."
)
SHARED_GENERATION_BROKER_UNAVAILABLE_ERROR = (
    "Shared generation broker is unavailable for split runtime outside local development."
)
LOCAL_GENERATION_FALLBACK_FORBIDDEN_ERROR = (
    "Local generation fallback is not allowed for split runtime outside local development."
)

ALL_IN_ONE_BLOCKED_SUMMARY = (
    "Generation runtime is still configured as all-in-one outside local development."
)
ALL_IN_ONE_BLOCKED_DETAIL = (
    "All-in-one mode is development-only; staging and production must run split web/worker topology with a shared broker."
)
ALL_IN_ONE_WARNING_SUMMARY = "Generation still runs in all-in-one local convenience mode."
ALL_IN_ONE_WARNING_DETAIL = (
    "Launch readiness is stronger with explicit web/worker topology."
)
MISSING_SHARED_BROKER_SUMMARY = "Split runtime is missing its shared broker."
MISSING_SHARED_BROKER_DETAIL = (
    "Web/worker launch topology should not run without a configured shared queue."
)
RUNTIME_TOPOLOGY_PASS_SUMMARY = "Generation runtime topology is coherent."

GENERATION_BROKER_DETAIL_SHARED_QUEUE_ACTIVE = "shared_queue_active"
GENERATION_BROKER_DETAIL_LOCAL_QUEUE_ONLY = "local_queue_only"
GENERATION_BROKER_REASON_REDIS_UNAVAILABLE_FALLBACK_LOCAL_QUEUE = (
    "redis_unavailable_fallback_local_queue"
)
GENERATION_BROKER_REASON_WEB_RUNTIME_LOCAL_FALLBACK_NO_SHARED_BROKER = (
    "web_runtime_local_fallback_no_shared_broker"
)
EXPECTED_LOCAL_GENERATION_BROKER_FALLBACK_REASONS = frozenset(
    {
        GENERATION_BROKER_REASON_REDIS_UNAVAILABLE_FALLBACK_LOCAL_QUEUE,
        GENERATION_BROKER_REASON_WEB_RUNTIME_LOCAL_FALLBACK_NO_SHARED_BROKER,
    }
)

RUNTIME_TOPOLOGY_CLASS_ALL_IN_ONE = "all_in_one"
RUNTIME_TOPOLOGY_CLASS_SPLIT_SHARED_BROKER = "split_shared_broker"
RUNTIME_TOPOLOGY_CLASS_SPLIT_ADVISORY_FALLBACK = "split_advisory_fallback"
RUNTIME_TOPOLOGY_CLASS_SPLIT_BROKER_MISSING = "split_broker_missing"
RUNTIME_TOPOLOGY_CLASS_CUSTOM = "custom"


def normalize_environment_name(environment: object) -> str:
    raw_value = getattr(environment, "value", environment)
    return str(raw_value or "").strip().lower()


def is_launch_environment(environment: object) -> bool:
    return normalize_environment_name(environment) in LAUNCH_ENVIRONMENTS


def normalize_generation_runtime_mode(runtime_mode: object) -> str:
    normalized = str(runtime_mode or "").strip().lower()
    return normalized or DEFAULT_GENERATION_RUNTIME_MODE


def uses_split_generation_runtime(runtime_mode: object) -> bool:
    return normalize_generation_runtime_mode(runtime_mode) in SPLIT_GENERATION_RUNTIME_MODES


def non_dev_all_in_one_runtime_forbidden(environment: object, runtime_mode: object) -> bool:
    return is_launch_environment(environment) and normalize_generation_runtime_mode(runtime_mode) == "all"


def shared_generation_broker_required(environment: object, runtime_mode: object) -> bool:
    return is_launch_environment(environment) and uses_split_generation_runtime(runtime_mode)


def launch_shaped_runtime_expects_shared_broker(environment: object) -> bool:
    return is_launch_environment(environment)


@dataclass(frozen=True)
class RuntimeTopologyCheck:
    runtime_mode: str
    launch_environment: bool
    status: str
    summary: str
    detail: str


@dataclass(frozen=True)
class GenerationBrokerState:
    enabled: bool
    configured: bool
    degraded: bool
    advisory: bool
    detail: str
    kind: str | None
    queued_by_priority: Any
    claimed: int
    topology_class: str


def build_runtime_topology_check(
    environment: object,
    runtime_mode: object,
    *,
    broker_enabled: bool = False,
    broker_configured: bool = False,
) -> RuntimeTopologyCheck:
    normalized_mode = normalize_generation_runtime_mode(runtime_mode)
    launch_environment = is_launch_environment(environment)

    if non_dev_all_in_one_runtime_forbidden(environment, normalized_mode):
        return RuntimeTopologyCheck(
            runtime_mode=normalized_mode,
            launch_environment=launch_environment,
            status="blocked",
            summary=ALL_IN_ONE_BLOCKED_SUMMARY,
            detail=ALL_IN_ONE_BLOCKED_DETAIL,
        )
    if normalized_mode == "all":
        return RuntimeTopologyCheck(
            runtime_mode=normalized_mode,
            launch_environment=launch_environment,
            status="warning",
            summary=ALL_IN_ONE_WARNING_SUMMARY,
            detail=ALL_IN_ONE_WARNING_DETAIL,
        )
    if uses_split_generation_runtime(normalized_mode) and not (broker_enabled or broker_configured):
        return RuntimeTopologyCheck(
            runtime_mode=normalized_mode,
            launch_environment=launch_environment,
            status="blocked",
            summary=MISSING_SHARED_BROKER_SUMMARY,
            detail=MISSING_SHARED_BROKER_DETAIL,
        )
    return RuntimeTopologyCheck(
        runtime_mode=normalized_mode,
        launch_environment=launch_environment,
        status="pass",
        summary=RUNTIME_TOPOLOGY_PASS_SUMMARY,
        detail=f"Runtime mode is {normalized_mode}.",
    )


def is_expected_local_generation_broker_fallback(
    environment: object,
    runtime_mode: object,
    degraded_reason: str | None,
) -> bool:
    normalized_reason = str(degraded_reason or "").strip()
    if not normalized_reason:
        return False
    if is_launch_environment(environment):
        return False
    if normalize_generation_runtime_mode(runtime_mode) not in LOCAL_FALLBACK_RUNTIME_MODES:
        return False
    return normalized_reason in EXPECTED_LOCAL_GENERATION_BROKER_FALLBACK_REASONS


def resolve_generation_runtime_topology_class(
    runtime_mode: object,
    *,
    broker_enabled: bool = False,
    advisory_fallback: bool = False,
) -> str:
    normalized_mode = normalize_generation_runtime_mode(runtime_mode)
    if normalized_mode == "all":
        return RUNTIME_TOPOLOGY_CLASS_ALL_IN_ONE
    if broker_enabled:
        return RUNTIME_TOPOLOGY_CLASS_SPLIT_SHARED_BROKER
    if advisory_fallback:
        return RUNTIME_TOPOLOGY_CLASS_SPLIT_ADVISORY_FALLBACK
    if uses_split_generation_runtime(normalized_mode):
        return RUNTIME_TOPOLOGY_CLASS_SPLIT_BROKER_MISSING
    return RUNTIME_TOPOLOGY_CLASS_CUSTOM


def generation_broker_ready_for_runtime(
    environment: object,
    runtime_mode: object,
    *,
    broker_enabled: bool,
    degraded_reason: str | None,
) -> bool:
    if not shared_generation_broker_required(environment, runtime_mode):
        return True
    return broker_enabled and not str(degraded_reason or "").strip()


def build_generation_broker_state(
    environment: object,
    runtime_mode: object,
    *,
    generation_broker: object | None,
    shared_queue_configured: bool,
    degraded_reason: str | None,
    broker_metrics: Any,
    claimed_count: int,
) -> GenerationBrokerState:
    advisory_fallback = is_expected_local_generation_broker_fallback(
        environment,
        runtime_mode,
        degraded_reason,
    )
    broker_enabled = generation_broker is not None
    detail = str(degraded_reason or "").strip() or (
        GENERATION_BROKER_DETAIL_SHARED_QUEUE_ACTIVE
        if broker_enabled
        else GENERATION_BROKER_DETAIL_LOCAL_QUEUE_ONLY
    )
    return GenerationBrokerState(
        enabled=broker_enabled,
        configured=bool(shared_queue_configured),
        degraded=bool(str(degraded_reason or "").strip()) and not advisory_fallback,
        advisory=advisory_fallback,
        detail=detail,
        kind=generation_broker.__class__.__name__ if generation_broker is not None else None,
        queued_by_priority=broker_metrics,
        claimed=int(claimed_count),
        topology_class=resolve_generation_runtime_topology_class(
            runtime_mode,
            broker_enabled=broker_enabled,
            advisory_fallback=advisory_fallback,
        ),
    )
