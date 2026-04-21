from pathlib import Path
from types import SimpleNamespace

import pytest
from pydantic import SecretStr

from config.feature_flags import FEATURE_FLAGS, FLAG_CIRCUIT_BREAKER_ENABLED
from studio_platform.models import OmniaIdentity, StudioWorkspace
from studio_platform.store import (
    PostgresStudioStateStore,
    SqliteStudioStateStore,
    StoreUnavailable,
    StudioStateStore,
    _redact_postgres_dsn,
    _load_state_from_rows,
    build_state_store,
)
from studio_platform.store_schema import (
    POSTGRES_COLLECTION_INDEX,
    POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX,
    POSTGRES_GENERATIONS_STATUS_CREATED_AT_INDEX,
    POSTGRES_IDENTITIES_EMAIL_CI_INDEX,
    POSTGRES_METADATA_TABLE,
    POSTGRES_MODERATION_CASES_STATUS_INDEX,
    POSTGRES_PROJECTS_IDENTITY_UPDATED_AT_INDEX,
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
    assert postgres_store._runtime_mode == "all"
    assert postgres_store._pool_budget_profile == "default"


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


@pytest.mark.parametrize(
    ("runtime_mode", "expected_min", "expected_max", "expected_profile"),
    [
        ("web", 3, 6, "web"),
        ("worker", 5, 14, "worker"),
        ("all", 4, 12, "default"),
        ("unexpected", 4, 12, "default"),
    ],
)
def test_build_state_store_uses_runtime_specific_postgres_pool_budget(
    tmp_path: Path,
    runtime_mode: str,
    expected_min: int,
    expected_max: int,
    expected_profile: str,
):
    settings = SimpleNamespace(
        state_store_backend="postgres",
        state_store_path=None,
        legacy_state_store_path=None,
        database_url="postgresql://studio:secret@localhost:5432/studio",
        generation_runtime_mode=runtime_mode,
        postgres_state_store_min_connections=4,
        postgres_state_store_max_connections=12,
        postgres_state_store_web_min_connections=3,
        postgres_state_store_web_max_connections=6,
        postgres_state_store_worker_min_connections=5,
        postgres_state_store_worker_max_connections=14,
    )

    store = build_state_store(
        settings,
        default_json_path=tmp_path / "studio-state.json",
        default_sqlite_path=tmp_path / "studio-state.sqlite3",
        default_legacy_sqlite_path=tmp_path / "legacy-state.sqlite3",
    )

    assert isinstance(store, PostgresStudioStateStore)
    assert store._pool_minconn == expected_min
    assert store._pool_maxconn == expected_max
    assert store._runtime_mode == runtime_mode
    assert store._pool_budget_profile == expected_profile


def test_postgres_store_prepares_statement_timeout_and_expression_indexes():
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
    assert POSTGRES_GENERATIONS_STATUS_CREATED_AT_INDEX in joined_sql
    assert POSTGRES_IDENTITIES_EMAIL_CI_INDEX in joined_sql
    assert POSTGRES_PROJECTS_IDENTITY_UPDATED_AT_INDEX in joined_sql
    assert POSTGRES_MODERATION_CASES_STATUS_INDEX in joined_sql
    assert POSTGRES_COLLECTION_INDEX in joined_sql
    assert "payload ->> 'identity_id'" in joined_sql
    assert "LOWER((payload ->> 'email'))" in joined_sql


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
    assert STORE_SCHEMA_VERSION == "3"
    assert POSTGRES_COLLECTION_INDEX == "idx_studio_state_records_collection"
    assert (
        POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX
        == "idx_studio_state_records_generations_identity_status_created_at"
    )
    assert (
        POSTGRES_GENERATIONS_STATUS_CREATED_AT_INDEX
        == "idx_studio_state_records_generations_status_created_at"
    )
    assert POSTGRES_IDENTITIES_EMAIL_CI_INDEX == "idx_studio_state_records_identities_email_ci"
    assert (
        POSTGRES_PROJECTS_IDENTITY_UPDATED_AT_INDEX
        == "idx_studio_state_records_projects_identity_updated_at"
    )
    assert (
        POSTGRES_MODERATION_CASES_STATUS_INDEX
        == "idx_studio_state_records_moderation_cases_status"
    )


def test_redact_postgres_dsn_masks_password():
    assert (
        _redact_postgres_dsn("postgresql://user:supersecret@host:5432/db")
        == "postgresql://user:***@host:5432/db"
    )


class _FailingPool:
    def getconn(self):
        raise RuntimeError("pool exhausted")

    def putconn(self, connection, close=False):
        return None


class _PoolConnection:
    def __init__(self, backend_pid: int, statements: list[str]) -> None:
        self.info = SimpleNamespace(backend_pid=backend_pid)
        self._statements = statements

    def cursor(self):
        return _FakeCursor(self._statements)

    def commit(self):
        return None

    def rollback(self):
        return None


class _RefreshingPool:
    def __init__(self) -> None:
        self.statements: list[str] = []
        self._next_backend_pid = 2
        self._available = [_PoolConnection(1, self.statements)]
        self.put_calls: list[tuple[int, bool]] = []

    def getconn(self):
        if self._available:
            return self._available.pop(0)
        connection = _PoolConnection(self._next_backend_pid, self.statements)
        self._next_backend_pid += 1
        return connection

    def putconn(self, connection, close=False):
        self.put_calls.append((connection.info.backend_pid, close))
        if not close:
            self._available.append(connection)


def test_postgres_store_pool_breaker_opens_after_repeated_borrow_failures():
    original_flag = FEATURE_FLAGS.is_enabled(FLAG_CIRCUIT_BREAKER_ENABLED)
    FEATURE_FLAGS.override(FLAG_CIRCUIT_BREAKER_ENABLED, True)
    store = PostgresStudioStateStore("postgresql://studio:secret@localhost:5432/studio")

    try:
        store._ensure_pool = lambda: _FailingPool()  # type: ignore[method-assign]

        for _ in range(5):
            with pytest.raises(RuntimeError, match="pool exhausted"):
                store._connect()

        with pytest.raises(StoreUnavailable, match="postgres_pool_circuit_open"):
            store._connect()

        snapshot = store.describe_circuit_breaker()
        assert snapshot is not None
        assert snapshot["state"] == "open"
    finally:
        FEATURE_FLAGS.override(FLAG_CIRCUIT_BREAKER_ENABLED, original_flag)


def test_postgres_store_retires_connections_older_than_max_age():
    store = PostgresStudioStateStore(
        "postgresql://studio:secret@localhost:5432/studio",
        connection_max_age_seconds=1,
    )
    pool = _RefreshingPool()
    store._ensure_pool = lambda: pool  # type: ignore[method-assign]

    first_connection = store._connect()
    store._release_connection(first_connection)
    store._connection_born_monotonic[id(first_connection)] = 0.0

    second_connection = store._connect()

    assert first_connection.info.backend_pid == 1
    assert second_connection.info.backend_pid == 2
    assert (1, True) in pool.put_calls
    assert any("SET statement_timeout" in statement for statement in pool.statements)


@pytest.mark.asyncio
async def test_postgres_store_describe_exposes_runtime_pool_budget_profile():
    store = PostgresStudioStateStore(
        "postgresql://studio:secret@localhost:5432/studio",
        pool_minconn=5,
        pool_maxconn=14,
        runtime_mode="worker",
        pool_budget_profile="worker",
    )

    description = await store.describe()

    assert description["runtime_mode"] == "worker"
    assert description["pool_budget_profile"] == "worker"
    assert description["pool_min_connections"] == 5
    assert description["pool_max_connections"] == 14
