from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[1]
RUN_MIGRATIONS_PATH = BACKEND_ROOT / "scripts" / "run_migrations.py"


def _load_run_migrations_module():
    spec = importlib.util.spec_from_file_location("studio_run_migrations", RUN_MIGRATIONS_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_build_alembic_config_requires_database_url():
    module = _load_run_migrations_module()

    with pytest.raises(ValueError, match="DATABASE_URL"):
        module.build_alembic_config("")


def test_build_alembic_config_points_at_backend_alembic_dir():
    module = _load_run_migrations_module()

    config = module.build_alembic_config("postgresql://studio:secret@localhost:5432/studio")

    assert Path(config.config_file_name).resolve() == (BACKEND_ROOT / "alembic.ini").resolve()
    assert Path(config.get_main_option("script_location")).resolve() == (BACKEND_ROOT / "alembic").resolve()
    assert config.get_main_option("sqlalchemy.url") == "postgresql://studio:secret@localhost:5432/studio"


def test_load_database_url_reads_env_file_without_importing_full_app_settings(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
):
    module = _load_run_migrations_module()
    env_file = tmp_path / ".env"
    env_file.write_text("DATABASE_URL=postgresql://studio:secret@localhost:5432/omnia\n", encoding="utf-8")
    monkeypatch.delenv("DATABASE_URL", raising=False)

    database_url = module.load_database_url(env_file=env_file)

    assert database_url == "postgresql://studio:secret@localhost:5432/omnia"
