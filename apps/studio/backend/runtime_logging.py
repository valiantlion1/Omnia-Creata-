from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from config.env import Settings


LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def configure_runtime_logging(settings: Settings) -> Path:
    log_directory = settings.log_directory_path
    log_directory.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, settings.log_level.value, logging.INFO))

    if not any(getattr(handler, "_oc_runtime_console", False) for handler in root_logger.handlers):
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        console_handler._oc_runtime_console = True  # type: ignore[attr-defined]
        root_logger.addHandler(console_handler)

    app_log_path = log_directory / "backend.app.log"
    error_log_path = log_directory / "backend.error.log"

    if not any(getattr(handler, "_oc_runtime_file_path", None) == str(app_log_path) for handler in root_logger.handlers):
        app_file_handler = RotatingFileHandler(
            app_log_path,
            maxBytes=5 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        app_file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        app_file_handler._oc_runtime_file_path = str(app_log_path)  # type: ignore[attr-defined]
        root_logger.addHandler(app_file_handler)

    if not any(getattr(handler, "_oc_runtime_file_path", None) == str(error_log_path) for handler in root_logger.handlers):
        error_file_handler = RotatingFileHandler(
            error_log_path,
            maxBytes=5 * 1024 * 1024,
            backupCount=5,
            encoding="utf-8",
        )
        error_file_handler.setLevel(logging.WARNING)
        error_file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
        error_file_handler._oc_runtime_file_path = str(error_log_path)  # type: ignore[attr-defined]
        root_logger.addHandler(error_file_handler)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(logger_name)
        logger.handlers = []
        logger.propagate = True

    logging.getLogger("omnia.studio").info("runtime_logging_configured", extra={"log_directory": str(log_directory)})
    return log_directory
