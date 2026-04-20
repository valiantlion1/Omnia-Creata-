from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Sequence

from alembic import command
from alembic.config import Config
from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[1]
STUDIO_ROOT = BACKEND_ROOT.parent
DEFAULT_ENV_FILE = STUDIO_ROOT / ".env"


def load_database_url(*, env_file: Path | None = DEFAULT_ENV_FILE, explicit_database_url: str | None = None) -> str:
    if env_file is not None and env_file.exists():
        load_dotenv(env_file, override=False)
    database_url = str(explicit_database_url or os.getenv("DATABASE_URL") or "").strip()
    if not database_url:
        raise ValueError("DATABASE_URL is required to run Studio migrations")
    return database_url


def build_alembic_config(database_url: str) -> Config:
    normalized_database_url = str(database_url or "").strip()
    if not normalized_database_url:
        raise ValueError("DATABASE_URL is required to build Alembic config")

    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "alembic"))
    config.set_main_option("sqlalchemy.url", normalized_database_url)
    return config


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Studio Postgres state-store migrations.")
    parser.add_argument("action", choices=["upgrade", "current", "history"], help="Alembic action to run")
    parser.add_argument("revision", nargs="?", default="head", help="Revision target for upgrade")
    parser.add_argument("--sql", action="store_true", help="Render SQL without executing it")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE, help="Optional env file that contains DATABASE_URL")
    parser.add_argument("--database-url", default=None, help="Explicit DATABASE_URL override")
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    database_url = load_database_url(env_file=args.env_file, explicit_database_url=args.database_url)
    config = build_alembic_config(database_url)

    if args.action == "upgrade":
        command.upgrade(config, args.revision, sql=args.sql)
    elif args.action == "current":
        command.current(config)
    else:
        command.history(config)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
