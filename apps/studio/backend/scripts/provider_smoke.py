from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config.env import get_settings
from studio_platform.providers import ProviderRegistry
from studio_platform.services.launch_readiness import persist_provider_smoke_report
from studio_platform.services.provider_smoke import (
    ensure_live_provider_smoke_enabled,
    run_provider_smoke_suite,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run manual-gated live smoke tests for configured image providers.",
    )
    parser.add_argument(
        "--provider",
        choices=("all", "fal", "runware"),
        default="all",
        help="Which provider smoke suite to run.",
    )
    parser.add_argument(
        "--skip-failure-probe",
        action="store_true",
        help="Skip expected-failure probes that validate error mapping.",
    )
    return parser.parse_args()


async def main() -> int:
    args = parse_args()
    settings = get_settings()
    ensure_live_provider_smoke_enabled(settings)

    registry = ProviderRegistry()
    results = await run_provider_smoke_suite(
        registry=registry,
        selected_provider=args.provider,
        include_failure_probe=not args.skip_failure_probe,
    )
    report = persist_provider_smoke_report(
        settings,
        selected_provider=args.provider,
        include_failure_probe=not args.skip_failure_probe,
        results=results,
    )
    payload = {
        "provider": args.provider,
        "report_path": report["path"],
        "summary": report["summary"],
        "results": [result.to_dict() for result in results],
    }
    print(json.dumps(payload, indent=2, ensure_ascii=True))
    return 1 if any(result.status == "error" for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
