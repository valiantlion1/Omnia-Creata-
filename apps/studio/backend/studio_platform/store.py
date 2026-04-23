"""Durable state store for Studio — JSON, SQLite, and Postgres backends.

**Purpose:** Persist the entire :class:`StudioState` snapshot + per-model
upserts with a uniform API across three backends. Callers (``StudioService``
and ``StudioRepository``) treat the store as an opaque :class:`StudioPersistence`.

**Backends:**
    - ``JsonStudioStateStore`` — single-file JSON, dev only. Not concurrent.
    - ``SqliteStudioStateStore`` — local SQLite with WAL mode, dev + self-host.
    - ``PostgresStudioStateStore`` — production, connection pooled, uses
      advisory locks to serialize writers across processes.

**Invariants:**
    - ``load`` and ``save``/``mutate`` are the only public mutation paths;
      do not touch the underlying files/tables directly.
    - For Postgres, every writer holds advisory lock
      :data:`POSTGRES_WRITE_LOCK_KEY` for the duration of the mutation so
      no two processes can race the same state snapshot.
    - State schema is versioned (see ``store_schema.STORE_SCHEMA_VERSION``);
      migrations are handled by :mod:`alembic`, not by ad-hoc code here.

**Choosing a backend:**
    :func:`build_state_store` inspects settings (primarily ``database_url``)
    and returns the right implementation. Do not instantiate backends
    directly — call the factory so future additions (e.g. read replicas)
    land in one place.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Type, TypeVar
from urllib.parse import SplitResult, urlsplit, urlunsplit
from uuid import uuid4

from pydantic import BaseModel

from config.env import reveal_secret_with_audit
from config.feature_flags import FEATURE_FLAGS, FLAG_CIRCUIT_BREAKER_ENABLED

from .models import GenerationJob, JobStatus, StudioState
from .resilience import CircuitBreaker, CircuitOpenError, describe_breaker
from .store_schema import (
    POSTGRES_METADATA_TABLE,
    POSTGRES_RECORDS_TABLE,
    STORE_SCHEMA_VERSION,
    postgres_state_store_schema_statements,
    postgres_state_store_schema_version_upsert_sql,
)

ModelT = TypeVar("ModelT", bound=BaseModel)
STATE_COLLECTIONS = tuple(StudioState.model_fields.keys())

# Postgres advisory lock key used by every writer to serialize state
# mutations across processes. The value is an arbitrary but stable 32-bit
# integer — changing it would break concurrent deployments during rollout,
# so treat this as an append-only invariant.
POSTGRES_WRITE_LOCK_KEY = 902417531

logger = logging.getLogger("omnia.studio.store")


class StoreUnavailable(RuntimeError):
    """Raised when the durable store is temporarily unavailable."""


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _count_state_records(state: StudioState) -> int:
    payload = state.model_dump(mode="json")
    return sum(len(payload.get(collection, {})) for collection in STATE_COLLECTIONS)


def _normalize_generation_status_values(statuses: set[JobStatus]) -> tuple[str, ...]:
    return tuple(sorted({JobStatus.coerce(status).value for status in statuses}))


def _count_generation_jobs_in_state(
    state: StudioState,
    *,
    statuses: tuple[str, ...],
    identity_id: str | None = None,
) -> int:
    if not statuses:
        return 0

    status_set = set(statuses)
    return sum(
        1
        for job in state.generations.values()
        if JobStatus.coerce(job.status).value in status_set
        and (identity_id is None or job.identity_id == identity_id)
    )


def _coerce_pool_budget(value: Any, default: int) -> int:
    if value in (None, ""):
        return int(default)
    return int(value)


def _resolve_postgres_pool_budget(settings) -> tuple[int, int, str]:
    default_min = _coerce_pool_budget(
        getattr(settings, "postgres_state_store_min_connections", 2),
        2,
    )
    default_max = _coerce_pool_budget(
        getattr(settings, "postgres_state_store_max_connections", 10),
        10,
    )
    runtime_mode = str(getattr(settings, "generation_runtime_mode", "all") or "all").strip().lower()

    if runtime_mode == "web":
        return (
            _coerce_pool_budget(getattr(settings, "postgres_state_store_web_min_connections", None), default_min),
            _coerce_pool_budget(getattr(settings, "postgres_state_store_web_max_connections", None), default_max),
            "web",
        )

    if runtime_mode == "worker":
        return (
            _coerce_pool_budget(getattr(settings, "postgres_state_store_worker_min_connections", None), default_min),
            _coerce_pool_budget(getattr(settings, "postgres_state_store_worker_max_connections", None), default_max),
            "worker",
        )

    return (default_min, default_max, "default")


def _normalize_bootstrap_paths(
    bootstrap_json_path: Path | None = None,
    bootstrap_paths: list[Path] | None = None,
) -> list[Path]:
    candidates: list[Path] = []
    if bootstrap_paths:
        candidates.extend(bootstrap_paths)
    if bootstrap_json_path is not None:
        candidates.append(bootstrap_json_path)

    normalized: list[Path] = []
    seen: set[str] = set()
    for candidate in candidates:
        resolved = candidate.expanduser().resolve()
        key = str(resolved).lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(resolved)
    return normalized


def _load_json_state_file(path: Path) -> StudioState | None:
    if not path.exists():
        return None
    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        return None
    return StudioState.model_validate(json.loads(raw))


def _load_sqlite_state_file(path: Path) -> StudioState | None:
    if not path.exists():
        return None
    connection = sqlite3.connect(path)
    connection.row_factory = sqlite3.Row
    try:
        row = connection.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'records'"
        ).fetchone()
        if row is None:
            return None
        payload: dict[str, dict[str, Any]] = {collection: {} for collection in STATE_COLLECTIONS}
        rows = connection.execute(
            "SELECT collection, model_id, payload FROM records ORDER BY collection, model_id"
        ).fetchall()
        if not rows:
            return None
        for record in rows:
            payload.setdefault(record["collection"], {})[record["model_id"]] = json.loads(record["payload"])
        return StudioState.model_validate(payload)
    finally:
        connection.close()


def _load_bootstrap_state(path: Path) -> tuple[StudioState | None, str | None]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        return _load_json_state_file(path), "json"
    if suffix in {".sqlite", ".sqlite3", ".db"}:
        return _load_sqlite_state_file(path), "sqlite"
    return None, None


def _load_state_from_rows(rows: list[tuple[str, str, Any]]) -> StudioState:
    payload: dict[str, dict[str, Any]] = {
        collection: {}
        for collection in STATE_COLLECTIONS
    }
    for collection, model_id, raw_payload in rows:
        try:
            payload.setdefault(collection, {})[model_id] = _normalize_loaded_payload(raw_payload)
        except (TypeError, json.JSONDecodeError) as exc:
            logger.warning(
                "Skipping malformed Studio state row while loading durable store: collection=%s model_id=%s (%s)",
                collection,
                model_id,
                exc,
            )
    return StudioState.model_validate(payload)


def _redact_postgres_dsn(dsn: str) -> str:
    parsed = urlsplit(dsn)
    if not parsed.scheme:
        return "<invalid-postgres-dsn>"
    hostname = parsed.hostname or ""
    port = f":{parsed.port}" if parsed.port else ""
    if parsed.username:
        netloc = f"{parsed.username}:***@{hostname}{port}"
    else:
        netloc = f"{hostname}{port}"
    return urlunsplit(SplitResult(parsed.scheme, netloc, parsed.path, "", ""))


class StudioStateStore:
    """Simple JSON-backed state store for local Studio development."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._state = StudioState()
        self._last_loaded_at: str | None = None
        self._last_write_at: str | None = None

    async def load(self) -> StudioState:
        async with self._lock:
            if not self.path.exists():
                await self._save_locked()
                self._last_loaded_at = _utc_now_iso()
                return self._state

            raw = await asyncio.to_thread(self.path.read_text, encoding="utf-8")
            if not raw.strip():
                self._state = StudioState()
                await self._save_locked()
                self._last_loaded_at = _utc_now_iso()
                return self._state

            payload = json.loads(raw)
            self._state = StudioState.model_validate(payload)
            self._last_loaded_at = _utc_now_iso()
            return self._state

    async def read(self, callback):
        async with self._lock:
            return callback(self._state)

    async def snapshot(self) -> StudioState:
        async with self._lock:
            return self._state.model_copy(deep=True)

    async def replace(self, state: StudioState) -> StudioState:
        async with self._lock:
            self._state = state
            await self._save_locked()
            return self._state.model_copy(deep=True)

    async def save_model(self, collection: str, model: BaseModel) -> BaseModel:
        async with self._lock:
            self._state = self._load_json_state_locked()
            target = getattr(self._state, collection)
            target[model.id] = model
            await self._save_locked()
            return model

    async def delete_model(self, collection: str, model_id: str) -> None:
        async with self._lock:
            self._state = self._load_json_state_locked()
            target = getattr(self._state, collection)
            target.pop(model_id, None)
            await self._save_locked()

    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            target = getattr(self._state, collection)
            item = target.get(model_id)
            if item is None:
                return None
            if isinstance(item, model_type):
                return item.model_copy(deep=True)
            return model_type.model_validate(item)

    async def get_model_fresh(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            state = self._load_json_state_locked()
            target = getattr(state, collection)
            item = target.get(model_id)
            if item is None:
                return None
            if isinstance(item, model_type):
                return item.model_copy(deep=True)
            return model_type.model_validate(item)

    async def list_models(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        async with self._lock:
            target = getattr(self._state, collection)
            items = []
            for item in target.values():
                if isinstance(item, model_type):
                    items.append(item.model_copy(deep=True))
                else:
                    items.append(model_type.model_validate(item))
            return items

    async def list_models_fresh(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        async with self._lock:
            state = self._load_json_state_locked()
            target = getattr(state, collection)
            items = []
            for item in target.values():
                if isinstance(item, model_type):
                    items.append(item.model_copy(deep=True))
                else:
                    items.append(model_type.model_validate(item))
            return items

    async def count_generations_with_statuses(self, statuses: set[JobStatus]) -> int:
        normalized_statuses = _normalize_generation_status_values(statuses)
        async with self._lock:
            return _count_generation_jobs_in_state(self._state, statuses=normalized_statuses)

    async def count_generations_with_statuses_for_identity(
        self,
        identity_id: str,
        statuses: set[JobStatus],
    ) -> int:
        normalized_statuses = _normalize_generation_status_values(statuses)
        async with self._lock:
            return _count_generation_jobs_in_state(
                self._state,
                statuses=normalized_statuses,
                identity_id=identity_id,
            )

    async def mutate_generation(
        self,
        job_id: str,
        callback: Callable[[GenerationJob], bool],
    ) -> GenerationJob | None:
        async with self._lock:
            self._state = self._load_json_state_locked()
            current_job = self._state.generations.get(job_id)
            if current_job is None:
                return None
            updated_job = current_job.model_copy(deep=True)
            if not callback(updated_job):
                return None
            self._state.generations[job_id] = updated_job
            await self._save_locked()
            return updated_job.model_copy(deep=True)

    async def mutate(self, callback):
        async with self._lock:
            self._state = self._load_json_state_locked()
            callback(self._state)
            await self._save_locked()
            return self._state.model_copy(deep=True)

    async def describe(self) -> dict[str, Any]:
        async with self._lock:
            return {
                "backend": "json",
                "authority_mode": "legacy_workspace_json",
                "durable": False,
                "schema_version": STORE_SCHEMA_VERSION,
                "path": str(self.path),
                "bootstrap_source": None,
                "bootstrap_source_kind": None,
                "last_loaded_at": self._last_loaded_at,
                "last_write_at": self._last_write_at,
                "record_count": _count_state_records(self._state),
            }

    async def shutdown(self) -> None:
        return None

    def describe_circuit_breaker(self) -> dict[str, Any] | None:
        return None

    async def _save_locked(self) -> None:
        payload = self._state.model_dump(mode="json")
        text = json.dumps(payload, indent=2, ensure_ascii=True)
        await asyncio.to_thread(self._write_atomic_sync, text)
        self._last_write_at = _utc_now_iso()

    def _load_json_state_locked(self) -> StudioState:
        state = _load_json_state_file(self.path)
        return state or StudioState()

    def _write_atomic_sync(self, text: str) -> None:
        temp_path = self.path.with_name(f"{self.path.stem}.{uuid4().hex}.tmp")
        temp_path.write_text(text, encoding="utf-8")
        try:
            for attempt in range(6):
                try:
                    os.replace(temp_path, self.path)
                    return
                except PermissionError:
                    if attempt == 5:
                        raise
                    time.sleep(0.05 * (attempt + 1))
        finally:
            if temp_path.exists():
                try:
                    temp_path.unlink()
                except OSError:
                    pass


class SqliteStudioStateStore:
    """SQLite-backed state store for durable local Studio metadata."""

    def __init__(
        self,
        path: Path,
        *,
        bootstrap_json_path: Path | None = None,
        bootstrap_paths: list[Path] | None = None,
    ):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.bootstrap_paths = _normalize_bootstrap_paths(
            bootstrap_json_path=bootstrap_json_path,
            bootstrap_paths=bootstrap_paths,
        )
        for bootstrap_path in self.bootstrap_paths:
            bootstrap_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._state = StudioState()
        self._bootstrap_source_path: Path | None = None
        self._bootstrap_source_kind: str | None = None
        self._last_loaded_at: str | None = None
        self._last_write_at: str | None = None

    async def load(self) -> StudioState:
        async with self._lock:
            self._state = await asyncio.to_thread(self._load_sync)
            self._last_loaded_at = _utc_now_iso()
            return self._state.model_copy(deep=True)

    async def read(self, callback):
        async with self._lock:
            return callback(self._state)

    async def snapshot(self) -> StudioState:
        async with self._lock:
            return self._state.model_copy(deep=True)

    async def replace(self, state: StudioState) -> StudioState:
        async with self._lock:
            self._state = state
            await asyncio.to_thread(self._replace_state_sync, state)
            self._last_write_at = _utc_now_iso()
            return self._state.model_copy(deep=True)

    async def save_model(self, collection: str, model: BaseModel) -> BaseModel:
        async with self._lock:
            target = getattr(self._state, collection)
            target[model.id] = model
            await asyncio.to_thread(self._save_model_sync, collection, model)
            self._last_write_at = _utc_now_iso()
            return model

    async def delete_model(self, collection: str, model_id: str) -> None:
        async with self._lock:
            target = getattr(self._state, collection)
            target.pop(model_id, None)
            await asyncio.to_thread(self._delete_model_sync, collection, model_id)
            self._last_write_at = _utc_now_iso()

    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            target = getattr(self._state, collection)
            item = target.get(model_id)
            if item is None:
                return None
            if isinstance(item, model_type):
                return item.model_copy(deep=True)
            return model_type.model_validate(item)

    async def get_model_fresh(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            return await asyncio.to_thread(self._get_model_fresh_sync, collection, model_id, model_type)

    async def list_models(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        async with self._lock:
            target = getattr(self._state, collection)
            items = []
            for item in target.values():
                if isinstance(item, model_type):
                    items.append(item.model_copy(deep=True))
                else:
                    items.append(model_type.model_validate(item))
            return items

    async def list_models_fresh(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        async with self._lock:
            return await asyncio.to_thread(self._list_models_fresh_sync, collection, model_type)

    async def count_generations_with_statuses(self, statuses: set[JobStatus]) -> int:
        normalized_statuses = _normalize_generation_status_values(statuses)
        async with self._lock:
            return await asyncio.to_thread(
                self._count_generations_with_statuses_sync,
                normalized_statuses,
            )

    async def count_generations_with_statuses_for_identity(
        self,
        identity_id: str,
        statuses: set[JobStatus],
    ) -> int:
        normalized_statuses = _normalize_generation_status_values(statuses)
        async with self._lock:
            return await asyncio.to_thread(
                self._count_generations_with_statuses_sync,
                normalized_statuses,
                identity_id,
            )

    async def mutate_generation(
        self,
        job_id: str,
        callback: Callable[[GenerationJob], bool],
    ) -> GenerationJob | None:
        async with self._lock:
            updated_job = await asyncio.to_thread(self._mutate_generation_sync, job_id, callback)
            if updated_job is None:
                return None
            self._state.generations[job_id] = updated_job
            self._last_write_at = _utc_now_iso()
            return updated_job.model_copy(deep=True)

    async def mutate(self, callback):
        async with self._lock:
            self._state = await asyncio.to_thread(self._load_sync)
            callback(self._state)
            await asyncio.to_thread(self._replace_state_sync, self._state)
            self._last_write_at = _utc_now_iso()
            return self._state.model_copy(deep=True)

    async def describe(self) -> dict[str, Any]:
        async with self._lock:
            return {
                "backend": "sqlite",
                "authority_mode": "durable_local",
                "durable": True,
                "schema_version": STORE_SCHEMA_VERSION,
                "path": str(self.path),
                "bootstrap_source": str(self._bootstrap_source_path) if self._bootstrap_source_path else None,
                "bootstrap_source_kind": self._bootstrap_source_kind,
                "last_loaded_at": self._last_loaded_at,
                "last_write_at": self._last_write_at,
                "record_count": _count_state_records(self._state),
            }

    async def shutdown(self) -> None:
        return None

    def describe_circuit_breaker(self) -> dict[str, Any] | None:
        return None

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA journal_mode=WAL;")
        connection.execute("PRAGMA foreign_keys=ON;")
        return connection

    def _load_sync(self) -> StudioState:
        with self._connect() as connection:
            self._ensure_schema_sync(connection)
            if not self._has_records_sync(connection):
                state = self._bootstrap_or_empty_state_sync()
                self._replace_state_sync(state, connection=connection)
                return state
            return self._read_state_from_connection(connection)

    def _bootstrap_or_empty_state_sync(self) -> StudioState:
        self._bootstrap_source_path = None
        self._bootstrap_source_kind = None
        for bootstrap_path in self.bootstrap_paths:
            state, kind = _load_bootstrap_state(bootstrap_path)
            if state is None:
                continue
            self._bootstrap_source_path = bootstrap_path
            self._bootstrap_source_kind = kind
            return state
        return StudioState()

    def _ensure_schema_sync(self, connection: sqlite3.Connection) -> None:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS records (
                collection TEXT NOT NULL,
                model_id TEXT NOT NULL,
                payload TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (collection, model_id)
            );
            CREATE INDEX IF NOT EXISTS idx_records_collection ON records(collection);
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            """
        )
        connection.execute(
            """
            INSERT INTO metadata (key, value)
            VALUES ('schema_version', ?)
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
            """,
            (STORE_SCHEMA_VERSION,),
        )

    def _has_records_sync(self, connection: sqlite3.Connection) -> bool:
        row = connection.execute("SELECT 1 FROM records LIMIT 1").fetchone()
        return row is not None

    def _read_state_from_connection(self, connection: sqlite3.Connection) -> StudioState:
        rows = connection.execute(
            "SELECT collection, model_id, payload FROM records ORDER BY collection, model_id"
        ).fetchall()
        normalized_rows = [
            (row["collection"], row["model_id"], row["payload"])
            for row in rows
        ]
        return _load_state_from_rows(normalized_rows)

    def _replace_state_sync(
        self,
        state: StudioState,
        *,
        connection: sqlite3.Connection | None = None,
    ) -> None:
        owns_connection = connection is None
        if connection is None:
            connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
            rows = self._serialize_state_rows(state)
            if owns_connection:
                with connection:
                    self._replace_rows_sync(connection, rows)
            else:
                self._replace_rows_sync(connection, rows)
        finally:
            if owns_connection:
                connection.close()

    def _save_model_sync(self, collection: str, model: BaseModel) -> None:
        payload = json.dumps(model.model_dump(mode="json"), ensure_ascii=True, separators=(",", ":"))
        with self._connect() as connection, connection:
            self._ensure_schema_sync(connection)
            connection.execute(
                """
                INSERT INTO records (collection, model_id, payload, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(collection, model_id) DO UPDATE
                SET payload=excluded.payload, updated_at=CURRENT_TIMESTAMP
                """,
                (collection, model.id, payload),
            )

    def _delete_model_sync(self, collection: str, model_id: str) -> None:
        with self._connect() as connection, connection:
            self._ensure_schema_sync(connection)
            connection.execute(
                "DELETE FROM records WHERE collection = ? AND model_id = ?",
                (collection, model_id),
            )

    def _get_model_fresh_sync(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        with self._connect() as connection:
            self._ensure_schema_sync(connection)
            row = connection.execute(
                "SELECT payload FROM records WHERE collection = ? AND model_id = ?",
                (collection, model_id),
            ).fetchone()
        if row is None:
            return None
        payload = _normalize_loaded_payload(row["payload"])
        return model_type.model_validate(payload)

    def _list_models_fresh_sync(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        with self._connect() as connection:
            self._ensure_schema_sync(connection)
            rows = connection.execute(
                "SELECT payload FROM records WHERE collection = ? ORDER BY model_id",
                (collection,),
            ).fetchall()
        return [
            model_type.model_validate(_normalize_loaded_payload(row["payload"]))
            for row in rows
        ]

    def _count_generations_with_statuses_sync(
        self,
        statuses: tuple[str, ...],
        identity_id: str | None = None,
    ) -> int:
        if not statuses:
            return 0

        status_placeholders = ", ".join("?" for _ in statuses)
        conditions = ["collection = ?"]
        parameters: list[Any] = ["generations"]
        if identity_id is not None:
            conditions.append("json_extract(payload, '$.identity_id') = ?")
            parameters.append(identity_id)
        conditions.append(f"json_extract(payload, '$.status') IN ({status_placeholders})")
        parameters.extend(statuses)

        sql = f"""
            SELECT COUNT(*) AS count
            FROM records
            WHERE {' AND '.join(conditions)}
        """
        with self._connect() as connection:
            self._ensure_schema_sync(connection)
            row = connection.execute(sql, parameters).fetchone()
        return int(row["count"]) if row is not None else 0

    def _mutate_generation_sync(
        self,
        job_id: str,
        callback: Callable[[GenerationJob], bool],
    ) -> GenerationJob | None:
        with self._connect() as connection, connection:
            self._ensure_schema_sync(connection)
            row = connection.execute(
                "SELECT payload FROM records WHERE collection = ? AND model_id = ?",
                ("generations", job_id),
            ).fetchone()
            if row is None:
                return None
            current_job = GenerationJob.model_validate(_normalize_loaded_payload(row["payload"]))
            updated_job = current_job.model_copy(deep=True)
            if not callback(updated_job):
                return None
            payload = json.dumps(updated_job.model_dump(mode="json"), ensure_ascii=True, separators=(",", ":"))
            connection.execute(
                """
                UPDATE records
                SET payload = ?, updated_at = CURRENT_TIMESTAMP
                WHERE collection = ? AND model_id = ?
                """,
                (payload, "generations", job_id),
            )
        return updated_job

    def _serialize_state_rows(self, state: StudioState) -> list[tuple[str, str, str]]:
        payload = state.model_dump(mode="json")
        rows: list[tuple[str, str, str]] = []
        for collection in STATE_COLLECTIONS:
            collection_items = payload.get(collection, {})
            for model_id, model_payload in collection_items.items():
                rows.append(
                    (
                        collection,
                        model_id,
                        json.dumps(model_payload, ensure_ascii=True, separators=(",", ":")),
                    )
                )
        return rows

    def _replace_rows_sync(
        self,
        connection: sqlite3.Connection,
        rows: list[tuple[str, str, str]],
    ) -> None:
        connection.execute("DELETE FROM records")
        if rows:
            connection.executemany(
                """
                INSERT INTO records (collection, model_id, payload)
                VALUES (?, ?, ?)
                """,
                rows,
            )
        connection.execute(
            """
            INSERT INTO metadata (key, value)
            VALUES ('schema_version', '1')
            ON CONFLICT(key) DO UPDATE SET value=excluded.value
            """
        )


class PostgresStudioStateStore:
    """Postgres-backed state store for staging/production Studio metadata."""

    def __init__(
        self,
        dsn: str,
        *,
        bootstrap_json_path: Path | None = None,
        bootstrap_paths: list[Path] | None = None,
        pool_minconn: int = 2,
        pool_maxconn: int = 10,
        statement_timeout_ms: int = 30000,
        connection_max_age_seconds: int = 1800,
        runtime_mode: str = "all",
        pool_budget_profile: str = "default",
    ):
        self.dsn = dsn.strip()
        if not self.dsn:
            raise ValueError("DATABASE_URL is required for PostgresStudioStateStore")
        self.bootstrap_paths = _normalize_bootstrap_paths(
            bootstrap_json_path=bootstrap_json_path,
            bootstrap_paths=bootstrap_paths,
        )
        for bootstrap_path in self.bootstrap_paths:
            bootstrap_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._state = StudioState()
        self._pool = None
        self._pool_minconn = max(1, int(pool_minconn))
        self._pool_maxconn = max(self._pool_minconn, int(pool_maxconn))
        self._statement_timeout_ms = max(1, int(statement_timeout_ms))
        self._connection_max_age_seconds = max(0.0, float(connection_max_age_seconds))
        self._runtime_mode = str(runtime_mode or "all").strip().lower() or "all"
        self._pool_budget_profile = str(pool_budget_profile or "default").strip().lower() or "default"
        self._connection_born_monotonic: dict[int, float] = {}
        self._bootstrap_source_path: Path | None = None
        self._bootstrap_source_kind: str | None = None
        self._last_loaded_at: str | None = None
        self._last_write_at: str | None = None
        self._pool_breaker = (
            CircuitBreaker[object](
                name="postgres_pool",
                fail_threshold=5,
                cooldown_seconds=10.0,
                half_open_max_probes=2,
            )
            if FEATURE_FLAGS.is_enabled(FLAG_CIRCUIT_BREAKER_ENABLED)
            else None
        )

    async def load(self) -> StudioState:
        async with self._lock:
            self._state = await asyncio.to_thread(self._load_sync)
            self._last_loaded_at = _utc_now_iso()
            return self._state.model_copy(deep=True)

    async def read(self, callback):
        async with self._lock:
            return callback(self._state)

    async def snapshot(self) -> StudioState:
        async with self._lock:
            return self._state.model_copy(deep=True)

    async def replace(self, state: StudioState) -> StudioState:
        async with self._lock:
            self._state = state
            await asyncio.to_thread(self._replace_state_sync, state)
            self._last_write_at = _utc_now_iso()
            return self._state.model_copy(deep=True)

    async def save_model(self, collection: str, model: BaseModel) -> BaseModel:
        async with self._lock:
            target = getattr(self._state, collection)
            target[model.id] = model
            await asyncio.to_thread(self._save_model_sync, collection, model)
            self._last_write_at = _utc_now_iso()
            return model

    async def delete_model(self, collection: str, model_id: str) -> None:
        async with self._lock:
            target = getattr(self._state, collection)
            target.pop(model_id, None)
            await asyncio.to_thread(self._delete_model_sync, collection, model_id)
            self._last_write_at = _utc_now_iso()

    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            target = getattr(self._state, collection)
            item = target.get(model_id)
            if item is None:
                return None
            if isinstance(item, model_type):
                return item.model_copy(deep=True)
            return model_type.model_validate(item)

    async def get_model_fresh(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            return await asyncio.to_thread(self._get_model_fresh_sync, collection, model_id, model_type)

    async def list_models(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        async with self._lock:
            target = getattr(self._state, collection)
            items = []
            for item in target.values():
                if isinstance(item, model_type):
                    items.append(item.model_copy(deep=True))
                else:
                    items.append(model_type.model_validate(item))
            return items

    async def list_models_fresh(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        async with self._lock:
            return await asyncio.to_thread(self._list_models_fresh_sync, collection, model_type)

    async def count_generations_with_statuses(self, statuses: set[JobStatus]) -> int:
        normalized_statuses = _normalize_generation_status_values(statuses)
        async with self._lock:
            return await asyncio.to_thread(
                self._count_generations_with_statuses_sync,
                normalized_statuses,
            )

    async def count_generations_with_statuses_for_identity(
        self,
        identity_id: str,
        statuses: set[JobStatus],
    ) -> int:
        normalized_statuses = _normalize_generation_status_values(statuses)
        async with self._lock:
            return await asyncio.to_thread(
                self._count_generations_with_statuses_sync,
                normalized_statuses,
                identity_id,
            )

    async def mutate_generation(
        self,
        job_id: str,
        callback: Callable[[GenerationJob], bool],
    ) -> GenerationJob | None:
        async with self._lock:
            updated_job = await asyncio.to_thread(self._mutate_generation_sync, job_id, callback)
            if updated_job is None:
                return None
            self._state.generations[job_id] = updated_job
            self._last_write_at = _utc_now_iso()
            return updated_job.model_copy(deep=True)

    async def mutate(self, callback):
        async with self._lock:
            self._state = await asyncio.to_thread(self._load_sync)
            callback(self._state)
            await asyncio.to_thread(self._replace_state_sync, self._state)
            self._last_write_at = _utc_now_iso()
            return self._state.model_copy(deep=True)

    async def describe(self) -> dict[str, Any]:
        async with self._lock:
            return {
                "backend": "postgres",
                "authority_mode": "durable_production",
                "durable": True,
                "schema_version": STORE_SCHEMA_VERSION,
                "path": None,
                "connection_target": _redact_postgres_dsn(self.dsn),
                "runtime_mode": self._runtime_mode,
                "pool_budget_profile": self._pool_budget_profile,
                "pool_min_connections": self._pool_minconn,
                "pool_max_connections": self._pool_maxconn,
                "statement_timeout_ms": self._statement_timeout_ms,
                "connection_max_age_seconds": self._connection_max_age_seconds,
                "bootstrap_source": str(self._bootstrap_source_path) if self._bootstrap_source_path else None,
                "bootstrap_source_kind": self._bootstrap_source_kind,
                "last_loaded_at": self._last_loaded_at,
                "last_write_at": self._last_write_at,
                "record_count": _count_state_records(self._state),
            }

    def describe_circuit_breaker(self) -> dict[str, Any] | None:
        if self._pool_breaker is None:
            return None
        return describe_breaker(self._pool_breaker)

    def _ensure_pool(self):
        try:
            from psycopg2.pool import SimpleConnectionPool
        except ImportError as exc:
            raise RuntimeError("psycopg2 is required for the postgres state store") from exc

        if self._pool is None:
            self._pool = SimpleConnectionPool(
                self._pool_minconn,
                self._pool_maxconn,
                self.dsn,
            )
        return self._pool

    def _connect(self):
        pool = self._ensure_pool()
        connection = self._borrow_connection(pool)

        try:
            connection = self._refresh_expired_connection(pool, connection)
            self._prepare_connection(connection)
            return connection
        except Exception:
            self._release_connection_quietly(connection, discard=True, operation="connect cleanup")
            raise

    def _release_connection(self, connection, *, discard: bool = False) -> None:
        if connection is None:
            return
        pool = self._ensure_pool()
        if discard:
            self._connection_born_monotonic.pop(id(connection), None)
        pool.putconn(connection, close=discard)

    def _release_connection_quietly(self, connection, *, discard: bool, operation: str) -> None:
        try:
            self._release_connection(connection, discard=discard)
        except Exception as release_exc:
            logger.warning(
                "Postgres state store connection release failed during %s: %s",
                operation,
                release_exc,
            )

    def _rollback_connection_quietly(self, connection, *, operation: str) -> bool:
        try:
            connection.rollback()
            return True
        except Exception as rollback_exc:
            logger.warning(
                "Postgres state store rollback failed during %s: %s",
                operation,
                rollback_exc,
            )
            return False

    async def shutdown(self) -> None:
        async with self._lock:
            pool = self._pool
            self._pool = None
            self._connection_born_monotonic.clear()
        if pool is not None:
            await asyncio.to_thread(pool.closeall)

    def _borrow_connection(self, pool):
        try:
            if self._pool_breaker is None:
                return pool.getconn()
            return self._pool_breaker.call_sync(pool.getconn)
        except CircuitOpenError as exc:
            raise StoreUnavailable("postgres_pool_circuit_open") from exc

    def _refresh_expired_connection(self, pool, connection):
        while self._connection_is_expired(connection):
            self._release_connection(connection, discard=True)
            connection = self._borrow_connection(pool)
        self._connection_born_monotonic.setdefault(id(connection), time.monotonic())
        return connection

    def _connection_is_expired(self, connection) -> bool:
        if self._connection_max_age_seconds <= 0:
            return False
        born_at = self._connection_born_monotonic.get(id(connection))
        if born_at is None:
            self._connection_born_monotonic[id(connection)] = time.monotonic()
            return False
        return (time.monotonic() - born_at) >= self._connection_max_age_seconds

    def _prepare_connection(self, connection) -> None:
        with connection.cursor() as cursor:
            cursor.execute(f"SET statement_timeout = {self._statement_timeout_ms}")
        connection.commit()

    def _load_sync(self) -> StudioState:
        connection = self._connect()
        discard_connection = False
        release_quietly = False
        try:
            self._ensure_schema_sync(connection)
            if not self._has_records_sync(connection):
                state = self._bootstrap_or_empty_state_sync()
                self._replace_state_sync(state, connection=connection)
                return state
            return self._read_state_from_connection(connection)
        except Exception:
            discard_connection = not self._rollback_connection_quietly(connection, operation="load state")
            release_quietly = True
            raise
        finally:
            if release_quietly:
                self._release_connection_quietly(
                    connection,
                    discard=discard_connection,
                    operation="load state cleanup",
                )
            else:
                self._release_connection(connection, discard=discard_connection)

    def _bootstrap_or_empty_state_sync(self) -> StudioState:
        self._bootstrap_source_path = None
        self._bootstrap_source_kind = None
        for bootstrap_path in self.bootstrap_paths:
            state, kind = _load_bootstrap_state(bootstrap_path)
            if state is None:
                continue
            self._bootstrap_source_path = bootstrap_path
            self._bootstrap_source_kind = kind
            return state
        return StudioState()

    def _ensure_schema_sync(self, connection) -> None:
        with connection.cursor() as cursor:
            for statement in postgres_state_store_schema_statements():
                cursor.execute(statement)
            cursor.execute(
                postgres_state_store_schema_version_upsert_sql(),
                (json.dumps(STORE_SCHEMA_VERSION),),
            )
        connection.commit()

    def _has_records_sync(self, connection) -> bool:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT 1 FROM {POSTGRES_RECORDS_TABLE} LIMIT 1")
            return cursor.fetchone() is not None

    def _read_state_from_connection(self, connection) -> StudioState:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT collection, model_id, payload
                FROM {POSTGRES_RECORDS_TABLE}
                ORDER BY collection, model_id
                """
            )
            rows = cursor.fetchall()
        return _load_state_from_rows(rows)

    def _acquire_write_lock_sync(self, connection) -> None:
        # Serialize durable-state writes across backend and worker processes.
        # The in-process asyncio lock only protects one process; staging runs
        # both backend and worker against the same Postgres table.
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT pg_advisory_xact_lock(%s)",
                (POSTGRES_WRITE_LOCK_KEY,),
            )

    def _replace_state_sync(self, state: StudioState, *, connection=None) -> None:
        owns_connection = connection is None
        if connection is None:
            connection = self._connect()
        discard_connection = False
        release_quietly = False
        try:
            self._ensure_schema_sync(connection)
            rows = self._serialize_state_rows(state)
            self._replace_rows_sync(connection, rows)
        except Exception:
            if owns_connection:
                discard_connection = not self._rollback_connection_quietly(connection, operation="replace state")
                release_quietly = True
            raise
        finally:
            if owns_connection:
                if release_quietly:
                    self._release_connection_quietly(
                        connection,
                        discard=discard_connection,
                        operation="replace state cleanup",
                    )
                else:
                    self._release_connection(connection, discard=discard_connection)

    def _save_model_sync(self, collection: str, model: BaseModel) -> None:
        payload = json.dumps(model.model_dump(mode="json"), ensure_ascii=True, separators=(",", ":"))
        connection = self._connect()
        discard_connection = False
        release_quietly = False
        try:
            self._ensure_schema_sync(connection)
            self._acquire_write_lock_sync(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    INSERT INTO {POSTGRES_RECORDS_TABLE} (collection, model_id, payload, updated_at)
                    VALUES (%s, %s, %s::jsonb, NOW())
                    ON CONFLICT (collection, model_id) DO UPDATE
                    SET payload = EXCLUDED.payload, updated_at = NOW()
                    """,
                    (collection, model.id, payload),
                )
            connection.commit()
        except Exception:
            discard_connection = not self._rollback_connection_quietly(connection, operation=f"save model {collection}")
            release_quietly = True
            raise
        finally:
            if release_quietly:
                self._release_connection_quietly(
                    connection,
                    discard=discard_connection,
                    operation=f"save model {collection} cleanup",
                )
            else:
                self._release_connection(connection, discard=discard_connection)

    def _delete_model_sync(self, collection: str, model_id: str) -> None:
        connection = self._connect()
        discard_connection = False
        release_quietly = False
        try:
            self._ensure_schema_sync(connection)
            self._acquire_write_lock_sync(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    f"DELETE FROM {POSTGRES_RECORDS_TABLE} WHERE collection = %s AND model_id = %s",
                    (collection, model_id),
                )
            connection.commit()
        except Exception:
            discard_connection = not self._rollback_connection_quietly(
                connection,
                operation=f"delete model {collection}",
            )
            release_quietly = True
            raise
        finally:
            if release_quietly:
                self._release_connection_quietly(
                    connection,
                    discard=discard_connection,
                    operation=f"delete model {collection} cleanup",
                )
            else:
                self._release_connection(connection, discard=discard_connection)

    def _get_model_fresh_sync(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT payload
                    FROM {POSTGRES_RECORDS_TABLE}
                    WHERE collection = %s AND model_id = %s
                    """,
                    (collection, model_id),
                )
                row = cursor.fetchone()
        finally:
            self._release_connection(connection)
        if row is None:
            return None
        return model_type.model_validate(_normalize_loaded_payload(row[0]))

    def _list_models_fresh_sync(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT payload
                    FROM {POSTGRES_RECORDS_TABLE}
                    WHERE collection = %s
                    ORDER BY model_id
                    """,
                    (collection,),
                )
                rows = cursor.fetchall()
        finally:
            self._release_connection(connection)
        return [model_type.model_validate(_normalize_loaded_payload(row[0])) for row in rows]

    def _count_generations_with_statuses_sync(
        self,
        statuses: tuple[str, ...],
        identity_id: str | None = None,
    ) -> int:
        if not statuses:
            return 0

        status_placeholders = ", ".join("%s" for _ in statuses)
        conditions = ["collection = %s"]
        parameters: list[Any] = ["generations"]
        if identity_id is not None:
            conditions.append("(payload ->> 'identity_id') = %s")
            parameters.append(identity_id)
        conditions.append(f"(payload ->> 'status') IN ({status_placeholders})")
        parameters.extend(statuses)

        connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT COUNT(*)
                    FROM {POSTGRES_RECORDS_TABLE}
                    WHERE {' AND '.join(conditions)}
                    """,
                    tuple(parameters),
                )
                row = cursor.fetchone()
        finally:
            self._release_connection(connection)
        return int(row[0]) if row is not None else 0

    def _mutate_generation_sync(
        self,
        job_id: str,
        callback: Callable[[GenerationJob], bool],
    ) -> GenerationJob | None:
        connection = self._connect()
        discard_connection = False
        release_quietly = False
        try:
            self._ensure_schema_sync(connection)
            self._acquire_write_lock_sync(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT payload
                    FROM {POSTGRES_RECORDS_TABLE}
                    WHERE collection = %s AND model_id = %s
                    FOR UPDATE
                    """,
                    ("generations", job_id),
                )
                row = cursor.fetchone()
                if row is None:
                    discard_connection = not self._rollback_connection_quietly(
                        connection,
                        operation="mutate generation missing row",
                    )
                    release_quietly = True
                    return None
                current_job = GenerationJob.model_validate(_normalize_loaded_payload(row[0]))
                updated_job = current_job.model_copy(deep=True)
                if not callback(updated_job):
                    discard_connection = not self._rollback_connection_quietly(
                        connection,
                        operation="mutate generation skipped update",
                    )
                    release_quietly = True
                    return None
                cursor.execute(
                    f"""
                    UPDATE {POSTGRES_RECORDS_TABLE}
                    SET payload = %s::jsonb, updated_at = NOW()
                    WHERE collection = %s AND model_id = %s
                    """,
                    (
                        json.dumps(updated_job.model_dump(mode="json"), ensure_ascii=True, separators=(",", ":")),
                        "generations",
                        job_id,
                    ),
                )
            connection.commit()
            return updated_job
        except Exception:
            discard_connection = not self._rollback_connection_quietly(
                connection,
                operation="mutate generation",
            )
            release_quietly = True
            raise
        finally:
            if release_quietly:
                self._release_connection_quietly(
                    connection,
                    discard=discard_connection,
                    operation="mutate generation cleanup",
                )
            else:
                self._release_connection(connection, discard=discard_connection)

    def _serialize_state_rows(self, state: StudioState) -> list[tuple[str, str, str]]:
        payload = state.model_dump(mode="json")
        rows: list[tuple[str, str, str]] = []
        for collection in STATE_COLLECTIONS:
            collection_items = payload.get(collection, {})
            for model_id, model_payload in collection_items.items():
                rows.append(
                    (
                        collection,
                        model_id,
                        json.dumps(model_payload, ensure_ascii=True, separators=(",", ":")),
                    )
                )
        return rows

    def _replace_rows_sync(self, connection, rows: list[tuple[str, str, str]]) -> None:
        self._acquire_write_lock_sync(connection)
        with connection.cursor() as cursor:
            cursor.execute(f"DELETE FROM {POSTGRES_RECORDS_TABLE}")
            if rows:
                cursor.executemany(
                    f"""
                    INSERT INTO {POSTGRES_RECORDS_TABLE} (collection, model_id, payload)
                    VALUES (%s, %s, %s::jsonb)
                    """,
                    rows,
                )
            cursor.execute(
                postgres_state_store_schema_version_upsert_sql(),
                (json.dumps(STORE_SCHEMA_VERSION),),
            )
        connection.commit()


def build_state_store(
    settings,
    *,
    default_json_path: Path,
    default_sqlite_path: Path,
    default_legacy_sqlite_path: Path | None = None,
):
    backend = settings.state_store_backend
    if backend == "json":
        return StudioStateStore(_resolve_store_path(settings.state_store_path, default_json_path))
    bootstrap_json_path = _resolve_store_path(
        settings.legacy_state_store_path,
        default_json_path,
    )
    bootstrap_paths: list[Path] = []
    if default_legacy_sqlite_path is not None:
        bootstrap_paths.append(default_legacy_sqlite_path)
    bootstrap_paths.append(bootstrap_json_path)
    if backend == "postgres":
        pool_minconn, pool_maxconn, pool_budget_profile = _resolve_postgres_pool_budget(settings)
        return PostgresStudioStateStore(
            reveal_secret_with_audit("DATABASE_URL", settings.database_url),
            bootstrap_paths=bootstrap_paths,
            pool_minconn=pool_minconn,
            pool_maxconn=pool_maxconn,
            statement_timeout_ms=getattr(settings, "postgres_state_store_statement_timeout_ms", 30000),
            connection_max_age_seconds=getattr(settings, "studio_db_conn_max_age_seconds", 1800),
            runtime_mode=getattr(settings, "generation_runtime_mode", "all"),
            pool_budget_profile=pool_budget_profile,
        )

    sqlite_path = _resolve_store_path(settings.state_store_path, default_sqlite_path)
    return SqliteStudioStateStore(sqlite_path, bootstrap_paths=bootstrap_paths)


def _resolve_store_path(raw_path: str | None, default_path: Path) -> Path:
    if not raw_path:
        return default_path
    candidate = Path(raw_path).expanduser()
    if candidate.is_absolute():
        return candidate
    return default_path.parent / candidate


def _normalize_loaded_payload(value: Any) -> Any:
    if isinstance(value, bytes):
        value = value.decode("utf-8")
    if isinstance(value, str):
        return json.loads(value)
    return value
