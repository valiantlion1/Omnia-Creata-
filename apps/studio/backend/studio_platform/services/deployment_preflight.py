from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

_PLACEHOLDER_PREFIXES = (
    "your-",
    "replace-",
    "placeholder",
    "example-",
    "<",
)


@dataclass(frozen=True)
class DeploymentPreflightCheck:
    key: str
    status: str
    summary: str
    detail: str


def load_dotenv_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def _looks_like_placeholder(value: str) -> bool:
    normalized = value.strip().lower()
    if not normalized:
        return True
    return any(normalized.startswith(prefix) for prefix in _PLACEHOLDER_PREFIXES)


def _has_real_value(env_values: dict[str, str], key: str) -> bool:
    value = env_values.get(key, "").strip()
    return bool(value) and not _looks_like_placeholder(value)


def _protected_beta_chat_provider(env_values: dict[str, str]) -> str:
    value = (
        env_values.get("PROTECTED_BETA_CHAT_PROVIDER")
        or env_values.get("CHAT_PRIMARY_PROVIDER")
        or "openai"
    )
    normalized = value.strip().lower()
    if normalized in {"gemini", "openrouter", "openai"}:
        return normalized
    return "openai"


def _protected_beta_image_provider(env_values: dict[str, str]) -> str:
    value = env_values.get("PROTECTED_BETA_IMAGE_PROVIDER") or "openai"
    normalized = value.strip().lower()
    if normalized in {"openai", "fal", "runware"}:
        return normalized
    return "openai"


def build_deployment_preflight(env_values: dict[str, str]) -> dict[str, object]:
    checks: list[DeploymentPreflightCheck] = []

    def add_check(key: str, status: str, summary: str, detail: str) -> None:
        checks.append(DeploymentPreflightCheck(key=key, status=status, summary=summary, detail=detail))

    environment = env_values.get("ENVIRONMENT", "").strip().lower()
    if environment in {"staging", "production"}:
        add_check(
            "environment",
            "pass",
            "Deployment environment is launch-shaped.",
            f"ENVIRONMENT={environment}.",
        )
    else:
        add_check(
            "environment",
            "blocked",
            "Deployment environment is not staging or production.",
            f"ENVIRONMENT={environment or 'missing'}.",
        )

    public_web_base_url = env_values.get("PUBLIC_WEB_BASE_URL", "").strip()
    parsed_public_url = urlparse(public_web_base_url) if public_web_base_url else None
    if (
        parsed_public_url
        and parsed_public_url.scheme == "https"
        and parsed_public_url.netloc
        and "localhost" not in parsed_public_url.netloc
        and "127.0.0.1" not in parsed_public_url.netloc
    ):
        add_check(
            "public_web_base_url",
            "pass",
            "Public web base URL looks staging-safe.",
            public_web_base_url,
        )
    else:
        add_check(
            "public_web_base_url",
            "blocked",
            "PUBLIC_WEB_BASE_URL is missing, local, or not HTTPS.",
            public_web_base_url or "missing",
        )

    state_store_backend = env_values.get("STATE_STORE_BACKEND", "").strip().lower()
    if state_store_backend == "postgres":
        add_check(
            "state_store_backend",
            "pass",
            "State store backend is Postgres.",
            "STATE_STORE_BACKEND=postgres.",
        )
    else:
        add_check(
            "state_store_backend",
            "blocked",
            "Launch-shaped staging should use Postgres authority.",
            f"STATE_STORE_BACKEND={state_store_backend or 'missing'}.",
        )

    postgres_database_url = env_values.get("DATABASE_URL", "").strip()
    postgres_user = env_values.get("POSTGRES_USER", "").strip()
    postgres_password = env_values.get("POSTGRES_PASSWORD", "").strip()
    postgres_db = env_values.get("POSTGRES_DB", "").strip()
    if state_store_backend == "postgres":
        if postgres_database_url and postgres_user and postgres_password and postgres_db:
            parsed_database_url = urlparse(postgres_database_url)
            database_user = parsed_database_url.username or ""
            database_password = parsed_database_url.password or ""
            database_name = parsed_database_url.path.lstrip("/")
            if (
                database_user == postgres_user
                and database_password == postgres_password
                and database_name == postgres_db
            ):
                add_check(
                    "postgres_credentials_alignment",
                    "pass",
                    "Postgres service credentials align with DATABASE_URL.",
                    f"user={postgres_user}, db={postgres_db}.",
                )
            else:
                add_check(
                    "postgres_credentials_alignment",
                    "blocked",
                    "Postgres service credentials do not match DATABASE_URL.",
                    (
                        f"DATABASE_URL user/db={database_user or 'missing'}/{database_name or 'missing'}; "
                        f"POSTGRES user/db={postgres_user or 'missing'}/{postgres_db or 'missing'}."
                    ),
                )
        else:
            add_check(
                "postgres_credentials_alignment",
                "warning",
                "Postgres service credentials are not explicitly pinned in the staging env.",
                "Set POSTGRES_DB, POSTGRES_USER, and POSTGRES_PASSWORD alongside DATABASE_URL to avoid drift.",
            )

    web_mode = env_values.get("GENERATION_RUNTIME_MODE_WEB", "").strip().lower()
    worker_mode = env_values.get("GENERATION_RUNTIME_MODE_WORKER", "").strip().lower()
    if web_mode == "web" and worker_mode == "worker":
        add_check(
            "generation_runtime_topology",
            "pass",
            "Web/worker runtime split is configured correctly.",
            f"web={web_mode}, worker={worker_mode}.",
        )
    else:
        add_check(
            "generation_runtime_topology",
            "blocked",
            "Generation runtime split is not configured correctly.",
            f"web={web_mode or 'missing'}, worker={worker_mode or 'missing'}.",
        )

    required_secrets = (
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "JWT_SECRET",
        "DATABASE_URL",
        "REDIS_URL",
    )
    missing_secrets = [key for key in required_secrets if not _has_real_value(env_values, key)]
    if missing_secrets:
        add_check(
            "required_secrets",
            "blocked",
            "Critical staging secrets are missing.",
            ", ".join(missing_secrets),
        )
    else:
        add_check(
            "required_secrets",
            "pass",
            "Critical staging secrets are present.",
            "Supabase, JWT, database, and Redis secrets are populated.",
        )

    protected_beta_chat_provider = _protected_beta_chat_provider(env_values)
    premium_chat_secret_key = {
        "gemini": "GEMINI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "openai": "OPENAI_API_KEY",
    }[protected_beta_chat_provider]
    premium_chat_configured = _has_real_value(env_values, premium_chat_secret_key)
    gemini_service_tier = env_values.get("GEMINI_SERVICE_TIER", "free").strip().lower() or "free"
    if premium_chat_configured:
        if protected_beta_chat_provider == "gemini" and gemini_service_tier != "paid":
            add_check(
                "premium_chat_lane",
                "warning",
                "The selected protected-beta chat lane is configured, but Gemini is not set to a paid tier.",
                "Set GEMINI_SERVICE_TIER=paid before treating Gemini as launch-grade.",
            )
        else:
            add_check(
                "premium_chat_lane",
                "pass",
                "The selected protected-beta chat provider secret is configured.",
                f"{protected_beta_chat_provider} is available for staging validation.",
            )
    else:
        add_check(
            "premium_chat_lane",
            "warning",
            "The selected protected-beta chat provider secret is not configured.",
            f"Missing {premium_chat_secret_key} for {protected_beta_chat_provider}. Staging can still boot, but launch-grade chat verification will be limited.",
        )

    protected_beta_image_provider = _protected_beta_image_provider(env_values)
    premium_image_secret_key = {
        "openai": "OPENAI_API_KEY",
        "fal": "FAL_API_KEY",
        "runware": "RUNWARE_API_KEY",
    }[protected_beta_image_provider]
    premium_image_configured = _has_real_value(env_values, premium_image_secret_key)
    if premium_image_configured:
        add_check(
            "premium_image_lane",
            "pass",
            "The selected protected-beta image provider secret is configured.",
            f"{protected_beta_image_provider} can be verified from staging.",
        )
    else:
        add_check(
            "premium_image_lane",
            "warning",
            "The selected protected-beta image provider secret is not configured.",
            f"Missing {premium_image_secret_key} for {protected_beta_image_provider}. Staging can still boot, but managed image-lane verification will be limited.",
        )

    blocked = sum(1 for check in checks if check.status == "blocked")
    warnings = sum(1 for check in checks if check.status == "warning")
    if blocked:
        status = "blocked"
        summary = "Deployment preflight found one or more hard blockers."
    elif warnings:
        status = "warning"
        summary = "Deployment preflight passed with warnings."
    else:
        status = "pass"
        summary = "Deployment preflight passed."

    return {
        "status": status,
        "summary": summary,
        "blocking_count": blocked,
        "warning_count": warnings,
        "checks": [asdict(check) for check in checks],
    }


def format_deployment_preflight_lines(report: dict[str, object]) -> list[str]:
    checks = report.get("checks")
    lines = [
        f"Deployment preflight: {report.get('status')} - {report.get('summary')}",
    ]
    if isinstance(checks, Iterable):
        for raw_check in checks:
            if not isinstance(raw_check, dict):
                continue
            lines.append(
                f"[{raw_check.get('status')}] {raw_check.get('key')}: {raw_check.get('summary')} ({raw_check.get('detail')})"
            )
    return lines
