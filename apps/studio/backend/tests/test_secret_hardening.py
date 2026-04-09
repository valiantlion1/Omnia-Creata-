from __future__ import annotations

import subprocess
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def test_studio_has_no_tracked_zip_archives() -> None:
    repo_root = _repo_root()
    result = subprocess.run(
        ["git", "ls-files", "apps/studio"],
        cwd=repo_root,
        check=True,
        capture_output=True,
        text=True,
    )
    tracked_files = [line.strip() for line in result.stdout.splitlines() if line.strip()]
    tracked_archives = [path for path in tracked_files if path.lower().endswith(".zip")]
    assert tracked_archives == []


def test_frontend_env_example_does_not_advertise_browser_side_provider_secrets() -> None:
    env_example = _repo_root() / "apps" / "studio" / "web" / ".env.example"
    content = env_example.read_text(encoding="utf-8")
    assert "VITE_HF_TOKEN" not in content
    assert "Never put provider API keys in Vite/browser env files." in content


def test_studio_dockerignore_blocks_secret_and_runtime_leak_paths() -> None:
    dockerignore = (_repo_root() / "apps" / "studio" / ".dockerignore").read_text(encoding="utf-8")
    assert "backend/.env" in dockerignore
    assert "backend/data" in dockerignore
    assert "backend.zip" in dockerignore
    assert "web/.env.*" in dockerignore
    assert "deploy/.env.*" in dockerignore
