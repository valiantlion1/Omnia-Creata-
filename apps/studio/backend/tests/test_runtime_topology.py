from __future__ import annotations

from config.env import Environment
from config.runtime_topology import (
    ALL_IN_ONE_BLOCKED_SUMMARY,
    ALL_IN_ONE_WARNING_SUMMARY,
    GENERATION_BROKER_DETAIL_LOCAL_QUEUE_ONLY,
    GENERATION_BROKER_REASON_REDIS_UNAVAILABLE_FALLBACK_LOCAL_QUEUE,
    MISSING_SHARED_BROKER_SUMMARY,
    RUNTIME_TOPOLOGY_PASS_SUMMARY,
    RUNTIME_TOPOLOGY_CLASS_SPLIT_ADVISORY_FALLBACK,
    build_generation_broker_state,
    build_runtime_topology_check,
    generation_broker_ready_for_runtime,
    is_expected_local_generation_broker_fallback,
    non_dev_all_in_one_runtime_forbidden,
    shared_generation_broker_required,
)


def test_launch_runtime_rejects_all_in_one_mode():
    check = build_runtime_topology_check(Environment.STAGING, "all")

    assert check.status == "blocked"
    assert check.summary == ALL_IN_ONE_BLOCKED_SUMMARY
    assert non_dev_all_in_one_runtime_forbidden(Environment.STAGING, "all") is True


def test_local_runtime_all_in_one_is_only_a_warning():
    check = build_runtime_topology_check(Environment.DEVELOPMENT, "all")

    assert check.status == "warning"
    assert check.summary == ALL_IN_ONE_WARNING_SUMMARY
    assert non_dev_all_in_one_runtime_forbidden(Environment.DEVELOPMENT, "all") is False


def test_split_launch_runtime_requires_shared_broker():
    check = build_runtime_topology_check(Environment.PRODUCTION, "web")

    assert check.status == "blocked"
    assert check.summary == MISSING_SHARED_BROKER_SUMMARY
    assert shared_generation_broker_required(Environment.PRODUCTION, "web") is True


def test_split_launch_runtime_passes_with_configured_shared_broker():
    check = build_runtime_topology_check(
        Environment.PRODUCTION,
        "worker",
        broker_configured=True,
    )

    assert check.status == "pass"
    assert check.summary == RUNTIME_TOPOLOGY_PASS_SUMMARY


def test_build_generation_broker_state_marks_dev_redis_fallback_as_advisory():
    state = build_generation_broker_state(
        Environment.DEVELOPMENT,
        "web",
        generation_broker=None,
        shared_queue_configured=True,
        degraded_reason=GENERATION_BROKER_REASON_REDIS_UNAVAILABLE_FALLBACK_LOCAL_QUEUE,
        broker_metrics=None,
        claimed_count=0,
    )

    assert state.advisory is True
    assert state.degraded is False
    assert state.detail == GENERATION_BROKER_REASON_REDIS_UNAVAILABLE_FALLBACK_LOCAL_QUEUE
    assert state.topology_class == RUNTIME_TOPOLOGY_CLASS_SPLIT_ADVISORY_FALLBACK
    assert is_expected_local_generation_broker_fallback(
        Environment.DEVELOPMENT,
        "web",
        GENERATION_BROKER_REASON_REDIS_UNAVAILABLE_FALLBACK_LOCAL_QUEUE,
    ) is True


def test_build_generation_broker_state_defaults_to_local_queue_only_without_broker():
    state = build_generation_broker_state(
        Environment.DEVELOPMENT,
        "all",
        generation_broker=None,
        shared_queue_configured=False,
        degraded_reason=None,
        broker_metrics=None,
        claimed_count=0,
    )

    assert state.detail == GENERATION_BROKER_DETAIL_LOCAL_QUEUE_ONLY
    assert state.advisory is False
    assert state.degraded is False


def test_generation_broker_ready_requires_live_broker_for_launch_split_runtime():
    assert (
        generation_broker_ready_for_runtime(
            Environment.STAGING,
            "web",
            broker_enabled=False,
            degraded_reason=None,
        )
        is False
    )
    assert (
        generation_broker_ready_for_runtime(
            Environment.STAGING,
            "web",
            broker_enabled=True,
            degraded_reason=None,
        )
        is True
    )
