from pathlib import Path
from types import SimpleNamespace

import pytest

from studio_platform.models import OmniaIdentity, StudioWorkspace
from studio_platform.store import (
    PostgresStudioStateStore,
    SqliteStudioStateStore,
    StudioStateStore,
    build_state_store,
)


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
    )

    json_store = build_state_store(
        json_settings,
        default_json_path=json_path,
        default_sqlite_path=sqlite_path,
    )
    sqlite_store = build_state_store(
        sqlite_settings,
        default_json_path=json_path,
        default_sqlite_path=sqlite_path,
    )
    postgres_store = build_state_store(
        postgres_settings,
        default_json_path=json_path,
        default_sqlite_path=sqlite_path,
    )

    assert isinstance(json_store, StudioStateStore)
    assert isinstance(sqlite_store, SqliteStudioStateStore)
    assert isinstance(postgres_store, PostgresStudioStateStore)
    assert sqlite_store.path == sqlite_path
    assert sqlite_store.bootstrap_json_path == json_path
    assert postgres_store.dsn == postgres_settings.database_url
    assert postgres_store.bootstrap_json_path == json_path
