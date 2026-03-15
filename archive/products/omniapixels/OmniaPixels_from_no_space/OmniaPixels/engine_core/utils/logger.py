# engine_core/utils/logger.py

import os
import datetime
from rich.console import Console
from rich.theme import Theme
from threading import Lock

# Özel tema
custom_theme = Theme({
    "info": "cyan",
    "success": "green",
    "warning": "yellow",
    "error": "bold red",
    "debug": "dim white",
    "time": "dim white"
})

console = Console(theme=custom_theme)
_log_lock = Lock()

# Log dosyası yolu
LOG_DIR = os.path.join(os.getcwd(), "engine_core", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "omnia_pixels.log")


def _timestamp():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _write_file(level: str, message: str):
    with _log_lock:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"[{_timestamp()}] [{level}] {message}\n")


def log_info(message: str):
    console.print(f"[time]{_timestamp()}[/] [info][INFO][/]: {message}")
    _write_file("INFO", message)


def log_success(message: str):
    console.print(f"[time]{_timestamp()}[/] [success][SUCCESS][/]: {message}")
    _write_file("SUCCESS", message)


def log_warning(message: str):
    console.print(f"[time]{_timestamp()}[/] [warning][WARNING][/]: {message}")
    _write_file("WARNING", message)


def log_error(message: str):
    console.print(f"[time]{_timestamp()}[/] [error][ERROR][/]: {message}")
    _write_file("ERROR", message)


def log_debug(message: str):
    console.print(f"[time]{_timestamp()}[/] [debug][DEBUG][/]: {message}")
    _write_file("DEBUG", message)


def clear_log_file():
    with _log_lock:
        open(LOG_FILE, "w", encoding="utf-8").close()


def get_log_file_path():
    return LOG_FILE
