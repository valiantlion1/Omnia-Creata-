from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse


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
    missing_secrets = [key for key in required_secrets if not env_values.get(key, "").strip()]
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

    premium_chat_configured = any(
        env_values.get(key, "").strip()
        for key in ("GEMINI_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY")
    )
    if premium_chat_configured:
        add_check(
            "premium_chat_lane",
            "pass",
            "At least one premium chat provider secret is configured.",
            "Gemini, OpenRouter, or OpenAI is available for staging validation.",
        )
    else:
        add_check(
            "premium_chat_lane",
            "warning",
            "No premium chat provider secret is configured.",
            "Staging can still boot, but premium chat verification will be limited.",
        )

    premium_image_configured = any(
        env_values.get(key, "").strip()
        for key in ("FAL_API_KEY", "RUNWARE_API_KEY")
    )
    if premium_image_configured:
        add_check(
            "premium_image_lane",
            "pass",
            "At least one premium image provider secret is configured.",
            "fal or Runware can be verified from staging.",
        )
    else:
        add_check(
            "premium_image_lane",
            "warning",
            "No premium image provider secret is configured.",
            "Staging can still boot, but managed image-lane verification will be limited.",
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
