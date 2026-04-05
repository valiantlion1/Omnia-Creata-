from __future__ import annotations

import asyncio
import json
import os
import sqlite3
import time
from uuid import uuid4
from pathlib import Path
from typing import Any, Type, TypeVar

from pydantic import BaseModel

from .models import StudioState

ModelT = TypeVar("ModelT", bound=BaseModel)
STATE_COLLECTIONS = tuple(StudioState.model_fields.keys())
POSTGRES_RECORDS_TABLE = "studio_state_records"
POSTGRES_METADATA_TABLE = "studio_state_metadata"


class StudioStateStore:
    """Simple JSON-backed state store for local Studio development."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._state = StudioState()

    async def load(self) -> StudioState:
        async with self._lock:
            if not self.path.exists():
                await self._save_locked()
                return self._state

            raw = await asyncio.to_thread(self.path.read_text, encoding="utf-8")
            if not raw.strip():
                self._state = StudioState()
                await self._save_locked()
                return self._state

            payload = json.loads(raw)
            self._state = StudioState.model_validate(payload)
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
            target = getattr(self._state, collection)
            target[model.id] = model
            await self._save_locked()
            return model

    async def delete_model(self, collection: str, model_id: str) -> None:
        async with self._lock:
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

    async def mutate(self, callback):
        async with self._lock:
            callback(self._state)
            await self._save_locked()
            return self._state.model_copy(deep=True)

    async def _save_locked(self) -> None:
        payload = self._state.model_dump(mode="json")
        text = json.dumps(payload, indent=2, ensure_ascii=True)
        await asyncio.to_thread(self._write_atomic_sync, text)

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

    def __init__(self, path: Path, *, bootstrap_json_path: Path | None = None):
        self.path = path
        self.bootstrap_json_path = bootstrap_json_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if self.bootstrap_json_path is not None:
            self.bootstrap_json_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._state = StudioState()

    async def load(self) -> StudioState:
        async with self._lock:
            self._state = await asyncio.to_thread(self._load_sync)
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
            return self._state.model_copy(deep=True)

    async def save_model(self, collection: str, model: BaseModel) -> BaseModel:
        async with self._lock:
            target = getattr(self._state, collection)
            target[model.id] = model
            await asyncio.to_thread(self._save_model_sync, collection, model)
            return model

    async def delete_model(self, collection: str, model_id: str) -> None:
        async with self._lock:
            target = getattr(self._state, collection)
            target.pop(model_id, None)
            await asyncio.to_thread(self._delete_model_sync, collection, model_id)

    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            target = getattr(self._state, collection)
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

    async def mutate(self, callback):
        async with self._lock:
            callback(self._state)
            await asyncio.to_thread(self._replace_state_sync, self._state)
            return self._state.model_copy(deep=True)

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
        if self.bootstrap_json_path and self.bootstrap_json_path.exists():
            raw = self.bootstrap_json_path.read_text(encoding="utf-8")
            if raw.strip():
                return StudioState.model_validate(json.loads(raw))
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

    def _has_records_sync(self, connection: sqlite3.Connection) -> bool:
        row = connection.execute("SELECT 1 FROM records LIMIT 1").fetchone()
        return row is not None

    def _read_state_from_connection(self, connection: sqlite3.Connection) -> StudioState:
        payload: dict[str, dict[str, Any]] = {
            collection: {}
            for collection in STATE_COLLECTIONS
        }
        rows = connection.execute(
            "SELECT collection, model_id, payload FROM records ORDER BY collection, model_id"
        ).fetchall()
        for row in rows:
            payload.setdefault(row["collection"], {})[row["model_id"]] = json.loads(row["payload"])
        return StudioState.model_validate(payload)

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

    def __init__(self, dsn: str, *, bootstrap_json_path: Path | None = None):
        self.dsn = dsn.strip()
        if not self.dsn:
            raise ValueError("DATABASE_URL is required for PostgresStudioStateStore")
        self.bootstrap_json_path = bootstrap_json_path
        if self.bootstrap_json_path is not None:
            self.bootstrap_json_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._state = StudioState()
        self._pool = None
        self._pool_minconn = 2
        self._pool_maxconn = 10
        self._statement_timeout_ms = 30000

    async def load(self) -> StudioState:
        async with self._lock:
            self._state = await asyncio.to_thread(self._load_sync)
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
            return self._state.model_copy(deep=True)

    async def save_model(self, collection: str, model: BaseModel) -> BaseModel:
        async with self._lock:
            target = getattr(self._state, collection)
            target[model.id] = model
            await asyncio.to_thread(self._save_model_sync, collection, model)
            return model

    async def delete_model(self, collection: str, model_id: str) -> None:
        async with self._lock:
            target = getattr(self._state, collection)
            target.pop(model_id, None)
            await asyncio.to_thread(self._delete_model_sync, collection, model_id)

    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            target = getattr(self._state, collection)
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

    async def mutate(self, callback):
        async with self._lock:
            callback(self._state)
            await asyncio.to_thread(self._replace_state_sync, self._state)
            return self._state.model_copy(deep=True)

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
        connection = pool.getconn()
        self._prepare_connection(connection)
        return connection

    def _release_connection(self, connection, *, discard: bool = False) -> None:
        if connection is None:
            return
        pool = self._ensure_pool()
        pool.putconn(connection, close=discard)

    def _prepare_connection(self, connection) -> None:
        with connection.cursor() as cursor:
            cursor.execute(f"SET statement_timeout = {self._statement_timeout_ms}")
        connection.commit()

    def _load_sync(self) -> StudioState:
        connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
            if not self._has_records_sync(connection):
                state = self._bootstrap_or_empty_state_sync()
                self._replace_state_sync(state, connection=connection)
                return state
            return self._read_state_from_connection(connection)
        except Exception:
            connection.rollback()
            raise
        finally:
            self._release_connection(connection)

    def _bootstrap_or_empty_state_sync(self) -> StudioState:
        if self.bootstrap_json_path and self.bootstrap_json_path.exists():
            raw = self.bootstrap_json_path.read_text(encoding="utf-8")
            if raw.strip():
                return StudioState.model_validate(json.loads(raw))
        return StudioState()

    def _ensure_schema_sync(self, connection) -> None:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {POSTGRES_RECORDS_TABLE} (
                    collection TEXT NOT NULL,
                    model_id TEXT NOT NULL,
                    payload JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (collection, model_id)
                )
                """
            )
            cursor.execute(
                f"""
                CREATE INDEX IF NOT EXISTS idx_{POSTGRES_RECORDS_TABLE}_collection
                ON {POSTGRES_RECORDS_TABLE}(collection)
                """
            )
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {POSTGRES_METADATA_TABLE} (
                    key TEXT PRIMARY KEY,
                    value JSONB NOT NULL
                )
                """
            )
            cursor.execute(
                f"""
                CREATE INDEX IF NOT EXISTS idx_{POSTGRES_RECORDS_TABLE}_generations_identity_status_created_at
                ON {POSTGRES_RECORDS_TABLE} (
                    ((payload ->> 'identity_id')),
                    ((payload ->> 'status')),
                    (((payload ->> 'created_at')::timestamptz))
                )
                WHERE collection = 'generations'
                """
            )
        connection.commit()

    def _has_records_sync(self, connection) -> bool:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT 1 FROM {POSTGRES_RECORDS_TABLE} LIMIT 1")
            return cursor.fetchone() is not None

    def _read_state_from_connection(self, connection) -> StudioState:
        payload: dict[str, dict[str, Any]] = {
            collection: {}
            for collection in STATE_COLLECTIONS
        }
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                SELECT collection, model_id, payload
                FROM {POSTGRES_RECORDS_TABLE}
                ORDER BY collection, model_id
                """
            )
            rows = cursor.fetchall()
        for collection, model_id, raw_payload in rows:
            payload.setdefault(collection, {})[model_id] = _normalize_loaded_payload(raw_payload)
        return StudioState.model_validate(payload)

    def _replace_state_sync(self, state: StudioState, *, connection=None) -> None:
        owns_connection = connection is None
        if connection is None:
            connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
            rows = self._serialize_state_rows(state)
            self._replace_rows_sync(connection, rows)
        except Exception:
            connection.rollback()
            raise
        finally:
            if owns_connection:
                self._release_connection(connection)

    def _save_model_sync(self, collection: str, model: BaseModel) -> None:
        payload = json.dumps(model.model_dump(mode="json"), ensure_ascii=True, separators=(",", ":"))
        connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
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
            connection.rollback()
            raise
        finally:
            self._release_connection(connection)

    def _delete_model_sync(self, collection: str, model_id: str) -> None:
        connection = self._connect()
        try:
            self._ensure_schema_sync(connection)
            with connection.cursor() as cursor:
                cursor.execute(
                    f"DELETE FROM {POSTGRES_RECORDS_TABLE} WHERE collection = %s AND model_id = %s",
                    (collection, model_id),
                )
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            self._release_connection(connection)

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
                f"""
                INSERT INTO {POSTGRES_METADATA_TABLE} (key, value)
                VALUES ('schema_version', '"1"'::jsonb)
                ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
                """
            )
        connection.commit()


def build_state_store(settings, *, default_json_path: Path, default_sqlite_path: Path):
    backend = settings.state_store_backend
    if backend == "json":
        return StudioStateStore(_resolve_store_path(settings.state_store_path, default_json_path))
    bootstrap_json_path = _resolve_store_path(
        settings.legacy_state_store_path,
        default_json_path,
    )
    if backend == "postgres":
        return PostgresStudioStateStore(
            settings.database_url or "",
            bootstrap_json_path=bootstrap_json_path,
        )

    sqlite_path = _resolve_store_path(settings.state_store_path, default_sqlite_path)
    return SqliteStudioStateStore(sqlite_path, bootstrap_json_path=bootstrap_json_path)


def _resolve_store_path(raw_path: str | None, default_path: Path) -> Path:
    if not raw_path:
        return default_path
    candidate = Path(raw_path).expanduser()
    if candidate.is_absolute():
        return candidate
    return default_path.parent / candidate


def _normalize_loaded_payload(value: Any) -> Any:
    if isinstance(value, str):
        return json.loads(value)
    return value
