"""Add expression indexes for durable Studio state store collections.

Revision ID: 20260420_02
Revises: 20260420_01
Create Date: 2026-04-20 00:30:00
"""

from __future__ import annotations

import json

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260420_02"
down_revision = "20260420_01"
branch_labels = None
depends_on = None

POSTGRES_RECORDS_TABLE = "studio_state_records"
POSTGRES_METADATA_TABLE = "studio_state_metadata"
PREVIOUS_SCHEMA_VERSION = "2"
STORE_SCHEMA_VERSION = "3"
POSTGRES_GENERATIONS_STATUS_CREATED_AT_INDEX = (
    f"idx_{POSTGRES_RECORDS_TABLE}_generations_status_created_at"
)
POSTGRES_IDENTITIES_EMAIL_CI_INDEX = f"idx_{POSTGRES_RECORDS_TABLE}_identities_email_ci"
POSTGRES_PROJECTS_IDENTITY_UPDATED_AT_INDEX = (
    f"idx_{POSTGRES_RECORDS_TABLE}_projects_identity_updated_at"
)
POSTGRES_MODERATION_CASES_STATUS_INDEX = (
    f"idx_{POSTGRES_RECORDS_TABLE}_moderation_cases_status"
)


def _schema_version_upsert_sql() -> str:
    return f"""
    INSERT INTO {POSTGRES_METADATA_TABLE} (key, value)
    VALUES ('schema_version', %s::jsonb)
    ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    """


def upgrade() -> None:
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS {POSTGRES_GENERATIONS_STATUS_CREATED_AT_INDEX}
        ON {POSTGRES_RECORDS_TABLE} (
            ((payload ->> 'status')),
            ((payload ->> 'created_at'))
        )
        WHERE collection = 'generations'
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS {POSTGRES_IDENTITIES_EMAIL_CI_INDEX}
        ON {POSTGRES_RECORDS_TABLE} (
            LOWER((payload ->> 'email'))
        )
        WHERE collection = 'identities'
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS {POSTGRES_PROJECTS_IDENTITY_UPDATED_AT_INDEX}
        ON {POSTGRES_RECORDS_TABLE} (
            ((payload ->> 'identity_id')),
            ((payload ->> 'updated_at'))
        )
        WHERE collection = 'projects'
        """
    )
    op.execute(
        f"""
        CREATE INDEX IF NOT EXISTS {POSTGRES_MODERATION_CASES_STATUS_INDEX}
        ON {POSTGRES_RECORDS_TABLE} (
            ((payload ->> 'status'))
        )
        WHERE collection = 'moderation_cases'
        """
    )
    op.execute(
        _schema_version_upsert_sql().replace(
            "%s",
            f"'{json.dumps(STORE_SCHEMA_VERSION)}'",
        )
    )


def downgrade() -> None:
    op.execute(f"DROP INDEX IF EXISTS {POSTGRES_MODERATION_CASES_STATUS_INDEX}")
    op.execute(f"DROP INDEX IF EXISTS {POSTGRES_PROJECTS_IDENTITY_UPDATED_AT_INDEX}")
    op.execute(f"DROP INDEX IF EXISTS {POSTGRES_IDENTITIES_EMAIL_CI_INDEX}")
    op.execute(f"DROP INDEX IF EXISTS {POSTGRES_GENERATIONS_STATUS_CREATED_AT_INDEX}")
    op.execute(
        _schema_version_upsert_sql().replace(
            "%s",
            f"'{json.dumps(PREVIOUS_SCHEMA_VERSION)}'",
        )
    )
