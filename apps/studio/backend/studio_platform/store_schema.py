from __future__ import annotations

POSTGRES_RECORDS_TABLE = "studio_state_records"
POSTGRES_METADATA_TABLE = "studio_state_metadata"
STORE_SCHEMA_VERSION = "2"
POSTGRES_COLLECTION_INDEX = f"idx_{POSTGRES_RECORDS_TABLE}_collection"
POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX = (
    f"idx_{POSTGRES_RECORDS_TABLE}_generations_identity_status_created_at"
)


def postgres_state_store_schema_statements() -> tuple[str, ...]:
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


def postgres_state_store_schema_version_upsert_sql() -> str:
    return f"""
    INSERT INTO {POSTGRES_METADATA_TABLE} (key, value)
    VALUES ('schema_version', %s::jsonb)
    ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value
    """


def postgres_state_store_drop_statements() -> tuple[str, ...]:
    return (
        f"DROP INDEX IF EXISTS {POSTGRES_GENERATIONS_IDENTITY_STATUS_CREATED_AT_INDEX}",
        f"DROP INDEX IF EXISTS {POSTGRES_COLLECTION_INDEX}",
        f"DROP TABLE IF EXISTS {POSTGRES_METADATA_TABLE}",
        f"DROP TABLE IF EXISTS {POSTGRES_RECORDS_TABLE}",
    )
