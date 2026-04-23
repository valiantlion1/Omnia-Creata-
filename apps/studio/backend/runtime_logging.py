from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from config.env import Settings
from observability.context import current_identity_id, current_request_id
from security.redaction import redact_sensitive_text


LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s%(context_suffix)s"
_STANDARD_LOG_RECORD_FIELDS = frozenset(logging.makeLogRecord({}).__dict__.keys())


def _redact_log_arg(value):
    if isinstance(value, str):
        return redact_sensitive_text(value)
    if isinstance(value, Exception):
        return redact_sensitive_text(value)
    if isinstance(value, tuple):
        return tuple(_redact_log_arg(item) for item in value)
    if isinstance(value, list):
        return [_redact_log_arg(item) for item in value]
    if isinstance(value, dict):
        return {key: _redact_log_arg(item) for key, item in value.items()}
    return value


class RedactingLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_sensitive_text(record.msg)
        if record.args:
            record.args = _redact_log_arg(record.args)
        for key, value in list(record.__dict__.items()):
            if key in _STANDARD_LOG_RECORD_FIELDS or key.startswith("_"):
                continue
            record.__dict__[key] = _redact_log_arg(value)
        return True


class RequestContextLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        request_id = str(getattr(record, "request_id", "") or current_request_id()).strip()
        identity_id = str(getattr(record, "identity_id", "") or current_identity_id()).strip()
        record.request_id = request_id
        record.identity_id = identity_id
        context_parts: list[str] = []
        if request_id:
            context_parts.append(f"request_id={request_id}")
        if identity_id:
            context_parts.append(f"identity_id={identity_id}")
        record.context_suffix = f" | {' '.join(context_parts)}" if context_parts else ""
        return True


def _attach_request_context_filter(handler: logging.Handler) -> None:
    if any(isinstance(log_filter, RequestContextLogFilter) for log_filter in handler.filters):
        return
    handler.addFilter(RequestContextLogFilter())


def _attach_redaction_filter(handler: logging.Handler) -> None:
    if any(isinstance(log_filter, RedactingLogFilter) for log_filter in handler.filters):
        return
    handler.addFilter(RedactingLogFilter())


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

    for handler in root_logger.handlers:
        if getattr(handler, "_oc_runtime_console", False) or getattr(handler, "_oc_runtime_file_path", None):
            _attach_request_context_filter(handler)
            _attach_redaction_filter(handler)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logger = logging.getLogger(logger_name)
        logger.handlers = []
        logger.propagate = True

    logging.getLogger("omnia.studio").info("runtime_logging_configured", extra={"log_directory": str(log_directory)})
    return log_directory
