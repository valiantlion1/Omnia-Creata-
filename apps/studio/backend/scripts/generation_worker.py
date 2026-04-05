from __future__ import annotations

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path

os.environ.setdefault("GENERATION_RUNTIME_MODE", "worker")

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from config.env import get_settings
from studio_platform.providers import ProviderRegistry
from studio_platform.service import StudioService
from studio_platform.store import build_state_store

DATA_DIR = BASE_DIR / "data"
MEDIA_DIR = DATA_DIR / "media"
LEGACY_STATE_PATH = DATA_DIR / "studio-state.json"
SQLITE_STATE_PATH = DATA_DIR / "studio-state.sqlite3"


async def _run_worker() -> None:
    settings = get_settings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    logger = logging.getLogger("omnia.studio.worker")

    store = build_state_store(
        settings,
        default_json_path=LEGACY_STATE_PATH,
        default_sqlite_path=SQLITE_STATE_PATH,
    )
    providers = ProviderRegistry()
    service = StudioService(store, providers, MEDIA_DIR)

    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    for sig_name in ("SIGINT", "SIGTERM"):
        sig = getattr(signal, sig_name, None)
        if sig is None:
            continue
        try:
            loop.add_signal_handler(sig, stop_event.set)
        except NotImplementedError:
            pass

    await service.initialize()
    logger.info("OmniaCreata Studio generation worker ready")
    try:
        await stop_event.wait()
    finally:
        await service.shutdown()
        logger.info("OmniaCreata Studio generation worker stopped")


def main() -> None:
    asyncio.run(_run_worker())


if __name__ == "__main__":
    main()
