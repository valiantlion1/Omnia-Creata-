"""Create Studio state-store baseline schema.

Revision ID: 20260420_01
Revises:
Create Date: 2026-04-20 00:00:00
"""

from __future__ import annotations

import json

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260420_01"
down_revision = None
branch_labels = None
depends_on = None

POSTGRES_RECORDS_TABLE = "studio_state_records"
POSTGRES_METADATA_TABLE = "studio_state_metadata"
STORE_SCHEMA_VERSION = "2"
POSTGRES_COLLECTION_INDEX = f"idx_{POSTGRES_RECORDS_TABLE}_collection"
POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX = (
    f"idx_{POSTGRES_RECORDS_TABLE}_generations_identity_status_created_at"
)


def _baseline_schema_statements() -> tuple[str, ...]:
    return (
        f"""
        CREATE TABLE IF NOT EXISTS {POSTGRES_RECORDS_TABLE} (
            collection TEXT NOT NULL,
            model_id TEXT NOT NULL,
            payload JSONB NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            PRIMARY KEY (collection, model_id)
        )
        """,
        f"""
        CREATE INDEX IF NOT EXISTS {POSTGRES_COLLECTION_INDEX}
        ON {POSTGRES_RECORDS_TABLE}(collection)
        """,
        f"""
        CREATE TABLE IF NOT EXISTS {POSTGRES_METADATA_TABLE} (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL
        )
        """,
        f"""
        CREATE INDEX IF NOT EXISTS {POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX}
        ON {POSTGRES_RECORDS_TABLE} (
            ((payload ->> 'identity_id')),
            ((payload ->> 'status')),
            ((payload ->> 'created_at'))
        )
        WHERE collection = 'generations'
        """,
    )


def _baseline_schema_version_upsert_sql() -> str:
    return f"""
    INSERT INTO {POSTGRES_METADATA_TABLE} (key, value)
    VALUES ('schema_version', %s::jsonb)
    ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    """


def _baseline_drop_statements() -> tuple[str, ...]:
    return (
        f"DROP INDEX IF EXISTS {POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX}",
        f"DROP INDEX IF EXISTS {POSTGRES_COLLECTION_INDEX}",
        f"DROP TABLE IF EXISTS {POSTGRES_METADATA_TABLE}",
        f"DROP TABLE IF EXISTS {POSTGRES_RECORDS_TABLE}",
    )


def upgrade() -> None:
    for statement in _baseline_schema_statements():
        op.execute(statement)
    op.execute(
        _baseline_schema_version_upsert_sql().replace(
            "%s",
            f"'{json.dumps(STORE_SCHEMA_VERSION)}'",
        )
    )


def downgrade() -> None:
    for statement in _baseline_drop_statements():
        op.execute(statement)
