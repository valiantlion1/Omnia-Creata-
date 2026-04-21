from __future__ import annotations

import re
import time
from collections import Counter, defaultdict
from threading import Lock
from typing import Iterable


_DEFAULT_HISTOGRAM_BUCKETS = (
    0.005,
    0.01,
    0.025,
    0.05,
    0.1,
    0.25,
    0.5,
    1.0,
    2.5,
    5.0,
)
_DYNAMIC_SEGMENT_RE = re.compile(r"^(?:\d+|[0-9a-f]{8,}|[A-Za-z0-9_-]{16,})$")


def _escape_label(value: str) -> str:
    return (
        str(value)
        .replace("\\", r"\\")
        .replace("\n", r"\n")
        .replace('"', r"\"")
    )


def _circuit_breaker_state_value(state: str | None) -> int:
    normalized = str(state or "").strip().lower()
    if normalized == "open":
        return 1
    if normalized == "half_open":
        return 2
    return 0


class PrometheusMetricsCollector:
    def __init__(self, *, histogram_buckets: Iterable[float] = _DEFAULT_HISTOGRAM_BUCKETS) -> None:
        self._lock = Lock()
        self._started_at = time.time()
        self._in_progress = 0
        self._request_totals: Counter[tuple[str, str, str]] = Counter()
        self._request_exceptions: Counter[tuple[str, str, str]] = Counter()
        self._request_duration_sums: defaultdict[tuple[str, str], float] = defaultdict(float)
        self._request_duration_counts: Counter[tuple[str, str]] = Counter()
        self._request_duration_buckets: Counter[tuple[str, str, float]] = Counter()
        self._histogram_buckets = tuple(sorted(float(bucket) for bucket in histogram_buckets))

    def request_started(self) -> None:
        with self._lock:
            self._in_progress += 1

    def request_finished(self) -> None:
        with self._lock:
            self._in_progress = max(0, self._in_progress - 1)

    def route_label(self, path: str, route_path: str | None = None) -> str:
        candidate = str(route_path or "").strip()
        if candidate:
            return candidate

        segments = []
        for segment in str(path or "/").split("/"):
            if not segment:
                continue
            if _DYNAMIC_SEGMENT_RE.fullmatch(segment):
                segments.append(":id")
            else:
                segments.append(segment)
        return "/" + "/".join(segments) if segments else "/"

    def record_request(self, *, method: str, path: str, status_code: int, duration_seconds: float) -> None:
        normalized_method = str(method or "GET").upper()
        normalized_path = str(path or "/")
        normalized_status = str(int(status_code))
        duration = max(0.0, float(duration_seconds))

        with self._lock:
            self._request_totals[(normalized_method, normalized_path, normalized_status)] += 1
            self._request_duration_sums[(normalized_method, normalized_path)] += duration
            self._request_duration_counts[(normalized_method, normalized_path)] += 1
            for bucket in self._histogram_buckets:
                if duration <= bucket:
                    self._request_duration_buckets[(normalized_method, normalized_path, bucket)] += 1

    def record_exception(self, *, method: str, path: str, exception_type: str) -> None:
        normalized_method = str(method or "GET").upper()
        normalized_path = str(path or "/")
        normalized_exception = str(exception_type or "Exception").strip() or "Exception"

        with self._lock:
            self._request_exceptions[(normalized_method, normalized_path, normalized_exception)] += 1

    def render(
        self,
        *,
        version: str,
        build: str,
        channel: str,
        status: str,
        circuit_breakers: dict[str, object] | None = None,
    ) -> str:
        with self._lock:
            request_totals = dict(self._request_totals)
            request_exceptions = dict(self._request_exceptions)
            request_duration_sums = dict(self._request_duration_sums)
            request_duration_counts = dict(self._request_duration_counts)
            request_duration_buckets = dict(self._request_duration_buckets)
            in_progress = self._in_progress
            uptime_seconds = max(0.0, time.time() - self._started_at)

        lines = [
            "# HELP studio_backend_info Studio backend build info.",
            "# TYPE studio_backend_info gauge",
            (
                'studio_backend_info{version="%s",build="%s",channel="%s",status="%s"} 1'
                % (
                    _escape_label(version),
                    _escape_label(build),
                    _escape_label(channel),
                    _escape_label(status),
                )
            ),
            "# HELP studio_backend_uptime_seconds Studio backend process uptime in seconds.",
            "# TYPE studio_backend_uptime_seconds gauge",
            f"studio_backend_uptime_seconds {uptime_seconds:.6f}",
            "# HELP studio_http_requests_in_progress In-flight HTTP requests.",
            "# TYPE studio_http_requests_in_progress gauge",
            f"studio_http_requests_in_progress {in_progress}",
            "# HELP studio_http_requests_total Total completed HTTP requests.",
            "# TYPE studio_http_requests_total counter",
        ]

        for (method, path, status_code), count in sorted(request_totals.items()):
            lines.append(
                'studio_http_requests_total{method="%s",path="%s",status="%s"} %s'
                % (
                    _escape_label(method),
                    _escape_label(path),
                    _escape_label(status_code),
                    count,
                )
            )

        lines.extend(
            [
                "# HELP studio_http_request_exceptions_total Total unhandled HTTP request exceptions by type.",
                "# TYPE studio_http_request_exceptions_total counter",
            ]
        )
        for (method, path, exception_type), count in sorted(request_exceptions.items()):
            lines.append(
                'studio_http_request_exceptions_total{method="%s",path="%s",exception_type="%s"} %s'
                % (
                    _escape_label(method),
                    _escape_label(path),
                    _escape_label(exception_type),
                    count,
                )
            )

        lines.extend(
            [
                "# HELP studio_http_request_duration_seconds Completed HTTP request duration in seconds.",
                "# TYPE studio_http_request_duration_seconds histogram",
            ]
        )
        for method, path in sorted(request_duration_counts.keys()):
            for bucket in self._histogram_buckets:
                bucket_count = request_duration_buckets.get((method, path, bucket), 0)
                lines.append(
                    'studio_http_request_duration_seconds_bucket{method="%s",path="%s",le="%s"} %s'
                    % (
                        _escape_label(method),
                        _escape_label(path),
                        bucket,
                        bucket_count,
                    )
                )
            count = request_duration_counts[(method, path)]
            duration_sum = request_duration_sums[(method, path)]
            lines.append(
                'studio_http_request_duration_seconds_bucket{method="%s",path="%s",le="+Inf"} %s'
                % (
                    _escape_label(method),
                    _escape_label(path),
                    count,
                )
            )
            lines.append(
                'studio_http_request_duration_seconds_count{method="%s",path="%s"} %s'
                % (
                    _escape_label(method),
                    _escape_label(path),
                    count,
                )
            )
            lines.append(
                'studio_http_request_duration_seconds_sum{method="%s",path="%s"} %.6f'
                % (
                    _escape_label(method),
                    _escape_label(path),
                    duration_sum,
                )
            )

        lines.extend(
            [
                "# HELP studio_circuit_breaker_state Circuit breaker state (0=CLOSED, 1=OPEN, 2=HALF_OPEN).",
                "# TYPE studio_circuit_breaker_state gauge",
            ]
        )
        if circuit_breakers:
            for subsystem, snapshot in sorted(circuit_breakers.items()):
                if subsystem == "providers" and isinstance(snapshot, dict):
                    for provider_name, provider_snapshot in sorted(snapshot.items()):
                        if not isinstance(provider_snapshot, dict):
                            continue
                        lines.append(
                            'studio_circuit_breaker_state{subsystem="%s",provider_name="%s"} %s'
                            % (
                                _escape_label("provider"),
                                _escape_label(provider_name),
                                _circuit_breaker_state_value(provider_snapshot.get("state")),
                            )
                        )
                    continue
                if not isinstance(snapshot, dict):
                    continue
                lines.append(
                    'studio_circuit_breaker_state{subsystem="%s",provider_name=""} %s'
                    % (
                        _escape_label(str(subsystem)),
                        _circuit_breaker_state_value(snapshot.get("state")),
                    )
                )

        return "\n".join(lines) + "\n"
