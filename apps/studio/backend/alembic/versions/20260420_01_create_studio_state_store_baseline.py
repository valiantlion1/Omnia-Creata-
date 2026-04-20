"""Create Studio state-store baseline schema.

Revision ID: 20260420_01
Revises:
Create Date: 2026-04-20 00:00:00
"""

from __future__ import annotations

import json

from alembic import op

from studio_platform.store_schema import (
    STORE_SCHEMA_VERSION,
    postgres_state_store_drop_statements,
    postgres_state_store_schema_statements,
    postgres_state_store_schema_version_upsert_sql,
)

# revision identifiers, used by Alembic.
revision = "20260420_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    for statement in postgres_state_store_schema_statements():
        op.execute(statement)
    op.execute(
        postgres_state_store_schema_version_upsert_sql().replace(
            "%s",
            f"'{json.dumps(STORE_SCHEMA_VERSION)}'",
        )
    )


def downgrade() -> None:
    for statement in postgres_state_store_drop_statements():
        op.execute(statement)
