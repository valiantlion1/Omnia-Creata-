from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
STUDIO_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run manual-gated live smoke tests for configured Studio providers.",
    )
    parser.add_argument(
        "--env-file",
        default=None,
        help="Optional env file to load before Studio settings initialize, e.g. ../deploy/.env.staging",
    )
    parser.add_argument(
        "--enable-live-provider-smoke",
        action="store_true",
        help="Force ENABLE_LIVE_PROVIDER_SMOKE=true for this run after loading the optional env file.",
    )
    parser.add_argument(
        "--provider",
        choices=("all", "fal", "runware", "gemini", "openrouter", "openai"),
        default="all",
        help="Which provider smoke suite to run.",
    )
    parser.add_argument(
        "--surface",
        choices=("all", "image", "chat"),
        default="all",
        help="Which provider surface to smoke-test.",
    )
    parser.add_argument(
        "--skip-failure-probe",
        action="store_true",
        help="Skip expected-failure probes that validate error mapping.",
    )
    parser.add_argument(
        "--profile",
        choices=("full", "refresh"),
        default="full",
        help="Smoke profile. 'refresh' keeps current-build truth fresh with cheaper required-path cases only.",
    )
    return parser.parse_args()


def _resolve_env_file(path_value: str) -> Path:
    candidate = Path(path_value).expanduser()
    if candidate.is_absolute():
        return candidate.resolve()

    search_roots = (Path.cwd(), BACKEND_DIR, STUDIO_DIR)
    for root in search_roots:
        resolved = (root / candidate).resolve()
        if resolved.exists():
            return resolved
    return (Path.cwd() / candidate).resolve()


def _load_env_file(path_value: str) -> Path:
    env_file = _resolve_env_file(path_value)
    if not env_file.exists():
        raise FileNotFoundError(f"Smoke env file was not found: {env_file}")

    for raw_line in env_file.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ[key.strip()] = value.strip()
    return env_file


async def main() -> int:
    args = parse_args()
    loaded_env_file: str | None = None
    if args.env_file:
        env_file = _load_env_file(args.env_file)
        loaded_env_file = str(env_file)
    if args.enable_live_provider_smoke:
        os.environ["ENABLE_LIVE_PROVIDER_SMOKE"] = "true"

    from config.env import get_settings
    from studio_platform.providers import ProviderRegistry
    from studio_platform.services.launch_readiness import persist_provider_smoke_report
    from studio_platform.services.provider_smoke import (
        ensure_live_provider_smoke_enabled,
        run_provider_smoke_suite,
    )

    settings = get_settings()
    ensure_live_provider_smoke_enabled(settings)

    registry = ProviderRegistry()
    results = await run_provider_smoke_suite(
        registry=registry,
        selected_provider=args.provider,
        selected_surface=args.surface,
        include_failure_probe=not args.skip_failure_probe,
        profile=args.profile,
    )
    report = persist_provider_smoke_report(
        settings,
        selected_provider=args.provider,
        selected_surface=args.surface,
        include_failure_probe=not args.skip_failure_probe,
        source_env_file=loaded_env_file,
        results=results,
    )
    payload = {
        "provider": args.provider,
        "surface": args.surface,
        "profile": args.profile,
        "report_path": report["path"],
        "summary": report["summary"],
        "coverage": report.get("coverage"),
        "results": [result.to_dict() for result in results],
    }
    print(json.dumps(payload, indent=2, ensure_ascii=True))
    return 1 if any(result.status == "error" for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
