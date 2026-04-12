from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config.env import get_settings
from studio_platform.services.deployment_verification import (
    build_blocked_deployment_verification_report,
    build_deployment_verification_report,
    deployment_verification_exit_code,
    format_deployment_verification_lines,
    persist_deployment_verification_report,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a protected Studio deployment after bring-up.")
    parser.add_argument("--base-url", required=True, help="Public Studio base URL, e.g. https://staging-studio.omniacreata.com")
    parser.add_argument("--api-prefix", default="/api", help="API prefix exposed by the public deployment.")
    parser.add_argument("--expected-build", default=None, help="Expected Studio build from version.json.")
    parser.add_argument("--label", default="protected-staging", help="Short label for the persisted verification report.")
    parser.add_argument("--owner-bearer-token", default=None, help="Optional owner bearer token for /healthz/detail.")
    parser.add_argument(
        "--require-closure-ready",
        action="store_true",
        help="Exit non-zero unless the resulting deployment report says closure_ready=true.",
    )
    parser.add_argument("--json", action="store_true", help="Print the persisted report as JSON.")
    parser.add_argument("--timeout", type=int, default=10, help="Request timeout in seconds.")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    api_prefix = args.api_prefix
    if not api_prefix.startswith("/"):
        api_prefix = "/" + api_prefix
    api_prefix = api_prefix.rstrip("/")

    owner_bearer_token = args.owner_bearer_token or os.getenv("STUDIO_HEALTH_DETAIL_TOKEN")
    owner_health_checked = bool(owner_bearer_token)
    settings = get_settings()

    def persist_blocked_report(summary: str, detail: str, *, check_key: str = "staging_environment") -> dict[str, object]:
        report = build_blocked_deployment_verification_report(
            expected_build=args.expected_build,
            summary=summary,
            detail=detail,
            check_key=check_key,
            owner_health_checked=owner_health_checked,
        )
        return persist_deployment_verification_report(
            settings,
            label=args.label,
            base_url=base_url,
            report=report,
        )

    try:
        version_payload = _fetch_json(f"{base_url}{api_prefix}/v1/version", timeout=args.timeout)
        health_payload = _fetch_json(f"{base_url}{api_prefix}/v1/healthz", timeout=args.timeout)
        login_page_html = _fetch_text(f"{base_url}/login", timeout=args.timeout)
    except SystemExit as exc:
        persisted = persist_blocked_report(
            "Protected staging verification could not reach the deployment cleanly.",
            str(exc),
            check_key="deployment_connectivity",
        )
        if args.json:
            print(json.dumps(persisted, indent=2, ensure_ascii=True))
        else:
            for line in format_deployment_verification_lines(persisted):
                print(line)
            print(f"Report path: {persisted['path']}")
        return 1

    owner_health_checked = bool(owner_bearer_token)
    settings = get_settings()
    version_dict = version_payload or {}
    expected_report_build = (
        args.expected_build
        or str(version_dict.get("bootBuild") or version_dict.get("build") or "").strip()
        or None
    )
    health_detail_payload = None
    if owner_health_checked:
        provisional_report = build_deployment_verification_report(
            base_url=base_url,
            expected_build=args.expected_build,
            version_payload=version_payload,
            health_payload=health_payload,
            health_detail_payload=None,
            login_page_html=login_page_html,
            owner_health_checked=False,
            expected_report_label=args.label,
            expected_report_base_url=base_url,
            expected_report_build=expected_report_build,
        )
        provisional_report["summary"] = "Deployment verification is still collecting owner health detail."
        provisional_report["closure_ready"] = False
        provisional_report["closure_summary"] = "Deployment verification is still collecting owner health detail."
        provisional_report["closure_gaps"] = ["owner health detail round-trip is still in progress"]
        persist_deployment_verification_report(
            settings,
            label=args.label,
            base_url=base_url,
            report=provisional_report,
        )
        try:
            health_detail_payload = _fetch_json(
                f"{base_url}{api_prefix}/v1/healthz/detail",
                timeout=args.timeout,
                bearer_token=owner_bearer_token,
            )
        except SystemExit as exc:
            persisted = persist_blocked_report(
                "Owner health detail could not be fetched from protected staging.",
                str(exc),
                check_key="owner_health_detail",
            )
            if args.json:
                print(json.dumps(persisted, indent=2, ensure_ascii=True))
            else:
                for line in format_deployment_verification_lines(persisted):
                    print(line)
                print(f"Report path: {persisted['path']}")
            return 1

    report = build_deployment_verification_report(
        base_url=base_url,
        expected_build=args.expected_build,
        version_payload=version_payload,
        health_payload=health_payload,
        health_detail_payload=health_detail_payload,
        login_page_html=login_page_html,
        owner_health_checked=owner_health_checked,
        expected_report_label=args.label,
        expected_report_base_url=base_url,
        expected_report_build=expected_report_build,
    )
    persisted = persist_deployment_verification_report(
        settings,
        label=args.label,
        base_url=base_url,
        report=report,
    )
    if owner_health_checked:
        try:
            health_detail_payload = _fetch_json(
                f"{base_url}{api_prefix}/v1/healthz/detail",
                timeout=args.timeout,
                bearer_token=owner_bearer_token,
            )
        except SystemExit as exc:
            persisted = persist_blocked_report(
                "Owner health detail refresh failed after deployment verification was written.",
                str(exc),
                check_key="owner_health_detail",
            )
            if args.json:
                print(json.dumps(persisted, indent=2, ensure_ascii=True))
            else:
                for line in format_deployment_verification_lines(persisted):
                    print(line)
                print(f"Report path: {persisted['path']}")
            return 1
        report = build_deployment_verification_report(
            base_url=base_url,
            expected_build=args.expected_build,
            version_payload=version_payload,
            health_payload=health_payload,
            health_detail_payload=health_detail_payload,
            login_page_html=login_page_html,
            owner_health_checked=True,
            expected_report_label=args.label,
            expected_report_base_url=base_url,
            expected_report_build=expected_report_build,
        )
        persisted = persist_deployment_verification_report(
            settings,
            label=args.label,
            base_url=base_url,
            report=report,
        )

    if args.json:
        print(json.dumps(persisted, indent=2, ensure_ascii=True))
    else:
        for line in format_deployment_verification_lines(persisted):
            print(line)
        print(f"Report path: {persisted['path']}")

    return deployment_verification_exit_code(
        persisted,
        require_closure_ready=args.require_closure_ready,
    )


def _fetch_json(url: str, *, timeout: int, bearer_token: str | None = None) -> dict[str, object] | None:
    payload = _fetch_text(url, timeout=timeout, bearer_token=bearer_token)
    try:
        decoded = json.loads(payload)
    except json.JSONDecodeError:
        return None
    return decoded if isinstance(decoded, dict) else None


def _fetch_text(url: str, *, timeout: int, bearer_token: str | None = None) -> str:
    headers = {"User-Agent": "omnia-studio-deployment-verify/1.0"}
    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"
    request = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {exc.code} while requesting {url}: {body[:400]}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"Network failure while requesting {url}: {exc.reason}") from exc


if __name__ == "__main__":
    raise SystemExit(main())
