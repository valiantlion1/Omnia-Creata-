from __future__ import annotations

import logging
import os
from pathlib import Path

from config.env import Settings
from runtime_logging import configure_runtime_logging


def test_settings_runtime_root_prefers_localappdata(monkeypatch):
    monkeypatch.setenv("LOCALAPPDATA", r"C:\Users\creator\AppData\Local")
    monkeypatch.delenv("XDG_STATE_HOME", raising=False)

    settings = Settings(_env_file=None, jwt_secret="x" * 32)

    assert settings.runtime_root_path == Path(r"C:\Users\creator\AppData\Local\OmniaCreata\Studio")
    assert settings.log_directory_path == Path(r"C:\Users\creator\AppData\Local\OmniaCreata\Studio\logs")


def test_settings_log_directory_override_wins(tmp_path):
    runtime_root = tmp_path / "runtime-root"
    log_root = tmp_path / "custom-logs"

    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        studio_runtime_root=str(runtime_root),
        studio_log_directory=str(log_root),
    )

    assert settings.runtime_root_path == runtime_root.resolve()
    assert settings.log_directory_path == log_root.resolve()


def test_runtime_logging_creates_external_log_directory(tmp_path):
    log_root = tmp_path / "runtime-logs"
    settings = Settings(
        _env_file=None,
        jwt_secret="x" * 32,
        studio_log_directory=str(log_root),
    )

    configured_path = configure_runtime_logging(settings)

    assert configured_path == log_root.resolve()
    assert configured_path.exists()
    file_handler_paths = {
        getattr(handler, "_oc_runtime_file_path", None)
        for handler in logging.getLogger().handlers
        if getattr(handler, "_oc_runtime_file_path", None)
    }
    assert str((log_root / "backend.app.log").resolve()) in file_handler_paths
    assert str((log_root / "backend.error.log").resolve()) in file_handler_paths
