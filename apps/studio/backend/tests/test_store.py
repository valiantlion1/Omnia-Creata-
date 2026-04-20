from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import SecretStr

from studio_platform.models import OmniaIdentity, StudioWorkspace
from studio_platform.store import (
    PostgresStudioStateStore,
    SqliteStudioStateStore,
    StudioStateStore,
    _load_state_from_rows,
    build_state_store,
)
from studio_platform.store_schema import (
    POSTGRES_COLLECTION_INDEX,
    POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX,
    POSTGRES_METADATA_TABLE,
    POSTGRES_RECORDS_TABLE,
    STORE_SCHEMA_VERSION,
)


class _FakeCursor:
    def __init__(self, statements: list[str]) -> None:
        self._statements = statements

    def execute(self, sql: str, *args, **kwargs):
        self._statements.append(sql)

    def executemany(self, sql: str, seq_of_parameters):
        self._statements.append(sql)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class _FakeConnection:
    def __init__(self) -> None:
        self.statements: list[str] = []
        self.commits = 0

    def cursor(self):
        return _FakeCursor(self.statements)

    def commit(self) -> None:
        self.commits += 1


@pytest.mark.asyncio
async def test_sqlite_store_persists_models_across_reloads(tmp_path: Path):
    db_path = tmp_path / "studio-state.sqlite3"
    store = SqliteStudioStateStore(db_path)
    await store.load()

    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")

    await store.save_model("identities", identity)
    await store.save_model("workspaces", workspace)

    reloaded_store = SqliteStudioStateStore(db_path)
    await reloaded_store.load()

    loaded_identity = await reloaded_store.get_model("identities", identity.id, OmniaIdentity)
    loaded_workspace = await reloaded_store.get_model("workspaces", workspace.id, StudioWorkspace)

    assert loaded_identity is not None
    assert loaded_identity.email == identity.email
    assert loaded_workspace is not None
    assert loaded_workspace.identity_id == identity.id


@pytest.mark.asyncio
async def test_sqlite_store_bootstraps_once_from_legacy_json(tmp_path: Path):
    legacy_path = tmp_path / "studio-state.json"
    legacy_store = StudioStateStore(legacy_path)
    await legacy_store.load()

    identity = OmniaIdentity(
        id="user-legacy",
        email="legacy@example.com",
        display_name="Legacy User",
        username="legacyuser",
        workspace_id="ws-legacy",
    )
    await legacy_store.save_model("identities", identity)

    db_path = tmp_path / "studio-state.sqlite3"
    store = SqliteStudioStateStore(db_path, bootstrap_json_path=legacy_path)
    await store.load()

    bootstrapped_identity = await store.get_model("identities", identity.id, OmniaIdentity)
    assert bootstrapped_identity is not None
    assert bootstrapped_identity.email == identity.email

    legacy_path.unlink()

    reloaded_store = SqliteStudioStateStore(db_path, bootstrap_json_path=legacy_path)
    await reloaded_store.load()
    persisted_identity = await reloaded_store.get_model("identities", identity.id, OmniaIdentity)

    assert persisted_identity is not None
    assert persisted_identity.username == identity.username


@pytest.mark.asyncio
async def test_sqlite_store_bootstraps_once_from_legacy_sqlite(tmp_path: Path):
    legacy_db_path = tmp_path / "legacy-state.sqlite3"
    legacy_store = SqliteStudioStateStore(legacy_db_path)
    await legacy_store.load()

    identity = OmniaIdentity(
        id="user-legacy-sqlite",
        email="legacy-sqlite@example.com",
        display_name="Legacy Sqlite User",
        username="legacysqlite",
        workspace_id="ws-legacy-sqlite",
    )
    await legacy_store.save_model("identities", identity)

    runtime_db_path = tmp_path / "runtime-state.sqlite3"
    store = SqliteStudioStateStore(runtime_db_path, bootstrap_paths=[legacy_db_path])
    await store.load()

    bootstrapped_identity = await store.get_model("identities", identity.id, OmniaIdentity)
    description = await store.describe()

    assert bootstrapped_identity is not None
    assert bootstrapped_identity.email == identity.email
    assert description["bootstrap_source"] == str(legacy_db_path.resolve())
    assert description["bootstrap_source_kind"] == "sqlite"
    assert description["path"] == str(runtime_db_path.resolve())
    assert description["durable"] is True


@pytest.mark.asyncio
async def test_sqlite_store_mutate_and_delete_round_trip(tmp_path: Path):
    db_path = tmp_path / "studio-state.sqlite3"
    store = SqliteStudioStateStore(db_path)
    await store.load()

    identity = OmniaIdentity(
        id="user-2",
        email="user2@example.com",
        display_name="User Two",
        username="usertwo",
        workspace_id="ws-user-2",
    )
    workspace = StudioWorkspace(id="ws-user-2", identity_id=identity.id, name="User Two Studio")

    def mutation(state):
        state.identities[identity.id] = identity
        state.workspaces[workspace.id] = workspace

    await store.mutate(mutation)
    await store.delete_model("workspaces", workspace.id)

    reloaded_store = SqliteStudioStateStore(db_path)
    await reloaded_store.load()

    loaded_identity = await reloaded_store.get_model("identities", identity.id, OmniaIdentity)
    loaded_workspace = await reloaded_store.get_model("workspaces", workspace.id, StudioWorkspace)

    assert loaded_identity is not None
    assert loaded_workspace is None


def test_build_state_store_selects_configured_backend(tmp_path: Path):
    json_path = tmp_path / "studio-state.json"
    sqlite_path = tmp_path / "studio-state.sqlite3"
    legacy_sqlite_path = tmp_path / "legacy-state.sqlite3"

    json_settings = SimpleNamespace(
        state_store_backend="json",
        state_store_path=None,
        legacy_state_store_path=None,
        database_url=None,
    )
    sqlite_settings = SimpleNamespace(
        state_store_backend="sqlite",
        state_store_path=None,
        legacy_state_store_path=None,
        database_url=None,
    )
    postgres_settings = SimpleNamespace(
        state_store_backend="postgres",
        state_store_path=None,
        legacy_state_store_path=None,
        database_url="postgresql://studio:secret@localhost:5432/studio",
        postgres_state_store_min_connections=4,
        postgres_state_store_max_connections=12,
        postgres_state_store_statement_timeout_ms=45000,
    )

    json_store = build_state_store(
        json_settings,
        default_json_path=json_path,
        default_sqlite_path=sqlite_path,
        default_legacy_sqlite_path=legacy_sqlite_path,
    )
    sqlite_store = build_state_store(
        sqlite_settings,
        default_json_path=json_path,
        default_sqlite_path=sqlite_path,
        default_legacy_sqlite_path=legacy_sqlite_path,
    )
    postgres_store = build_state_store(
        postgres_settings,
        default_json_path=json_path,
        default_sqlite_path=sqlite_path,
        default_legacy_sqlite_path=legacy_sqlite_path,
    )

    assert isinstance(json_store, StudioStateStore)
    assert isinstance(sqlite_store, SqliteStudioStateStore)
    assert isinstance(postgres_store, PostgresStudioStateStore)
    assert sqlite_store.path == sqlite_path
    assert sqlite_store.bootstrap_paths == [legacy_sqlite_path.resolve(), json_path.resolve()]
    assert postgres_store.dsn == postgres_settings.database_url
    assert postgres_store.bootstrap_paths == [legacy_sqlite_path.resolve(), json_path.resolve()]
    assert postgres_store._pool_minconn == 4
    assert postgres_store._pool_maxconn == 12
    assert postgres_store._statement_timeout_ms == 45000


def test_build_state_store_accepts_secretstr_database_url(tmp_path: Path):
    settings = SimpleNamespace(
        state_store_backend="postgres",
        state_store_path=None,
        legacy_state_store_path=None,
        database_url=SecretStr("postgresql://studio:secret@localhost:5432/studio"),
    )

    store = build_state_store(
        settings,
        default_json_path=tmp_path / "studio-state.json",
        default_sqlite_path=tmp_path / "studio-state.sqlite3",
        default_legacy_sqlite_path=tmp_path / "legacy-state.sqlite3",
    )

    assert isinstance(store, PostgresStudioStateStore)
    assert store.dsn == "postgresql://studio:secret@localhost:5432/studio"


def test_postgres_store_prepares_statement_timeout_and_generation_index():
    store = PostgresStudioStateStore(
        "postgresql://studio:secret@localhost:5432/studio",
        pool_minconn=3,
        pool_maxconn=9,
        statement_timeout_ms=45000,
    )
    connection = _FakeConnection()

    store._prepare_connection(connection)
    store._ensure_schema_sync(connection)

    joined_sql = "\n".join(connection.statements)
    assert "SET statement_timeout = 45000" in joined_sql
    assert POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX in joined_sql
    assert POSTGRES_COLLECTION_INDEX in joined_sql
    assert "payload ->> 'identity_id'" in joined_sql


def test_postgres_store_replace_rows_uses_advisory_lock():
    store = PostgresStudioStateStore("postgresql://studio:secret@localhost:5432/studio")
    connection = _FakeConnection()

    store._replace_rows_sync(
        connection,
        [
            (
                "identities",
                "user-1",
                '{"id":"user-1","email":"user@example.com","display_name":"User","username":"user","workspace_id":"ws-user-1"}',
            )
        ],
    )

    joined_sql = "\n".join(connection.statements)
    assert "SELECT pg_advisory_xact_lock" in joined_sql
    assert f"DELETE FROM {POSTGRES_RECORDS_TABLE}" in joined_sql
    assert f"INSERT INTO {POSTGRES_RECORDS_TABLE} (collection, model_id, payload)" in joined_sql


def test_load_state_from_rows_skips_malformed_payloads(caplog: pytest.LogCaptureFixture):
    identity = OmniaIdentity(
        id="user-1",
        email="user@example.com",
        display_name="User One",
        username="userone",
        workspace_id="ws-user-1",
    )
    workspace = StudioWorkspace(id="ws-user-1", identity_id=identity.id, name="User One Studio")

    with caplog.at_level("WARNING"):
        state = _load_state_from_rows(
            [
                ("identities", "broken-user", '{"id":"broken-user"} not-json'),
                ("identities", identity.id, identity.model_dump(mode="json")),
                ("workspaces", workspace.id, workspace.model_dump(mode="json")),
            ]
        )

    assert "broken-user" not in state.identities
    assert state.identities[identity.id].email == identity.email
    assert state.workspaces[workspace.id].identity_id == identity.id
    assert any(
        "Skipping malformed Studio state row while loading durable store" in record.message
        for record in caplog.records
    )


def test_store_schema_contract_is_stable():
    assert POSTGRES_RECORDS_TABLE == "studio_state_records"
    assert POSTGRES_METADATA_TABLE == "studio_state_metadata"
    assert STORE_SCHEMA_VERSION == "2"
    assert POSTGRES_COLLECTION_INDEX == "idx_studio_state_records_collection"
    assert (
        POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX
        == "idx_studio_state_records_generations_identity_status_created_at"
    )
