from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from studio_platform.services.deployment_preflight import (
    build_deployment_preflight,
    format_deployment_preflight_lines,
    load_dotenv_file,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Studio deploy env before staging bring-up or external proof runs.")
    parser.add_argument(
        "--env-file",
        default=str(Path(__file__).resolve().parents[2] / "deploy" / ".env.staging"),
        help="Path to the staging env file to validate.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print the full report as JSON.",
    )
    args = parser.parse_args()

    env_path = Path(args.env_file).resolve()
    if not env_path.exists():
        print(f"Missing env file: {env_path}", file=sys.stderr)
        return 2

    env_values = load_dotenv_file(env_path)
    report = build_deployment_preflight(env_values)

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=True))
    else:
        for line in format_deployment_preflight_lines(report):
            print(line)

    return 1 if report["status"] == "blocked" else 0


if __name__ == "__main__":
    raise SystemExit(main())
