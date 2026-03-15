from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Type, TypeVar

from pydantic import BaseModel

from .models import StudioState

ModelT = TypeVar("ModelT", bound=BaseModel)


class StudioStateStore:
    """Simple JSON-backed state store for local Studio development."""

    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._state = StudioState()

    async def load(self) -> StudioState:
        async with self._lock:
            if not self.path.exists():
                await self._save_locked()
                return self._state

            raw = await asyncio.to_thread(self.path.read_text, encoding="utf-8")
            if not raw.strip():
                self._state = StudioState()
                await self._save_locked()
                return self._state

            payload = json.loads(raw)
            self._state = StudioState.model_validate(payload)
            return self._state

    async def snapshot(self) -> StudioState:
        async with self._lock:
            return self._state.model_copy(deep=True)

    async def replace(self, state: StudioState) -> StudioState:
        async with self._lock:
            self._state = state
            await self._save_locked()
            return self._state.model_copy(deep=True)

    async def save_model(self, collection: str, model: BaseModel) -> BaseModel:
        async with self._lock:
            target = getattr(self._state, collection)
            target[model.id] = model
            await self._save_locked()
            return model

    async def delete_model(self, collection: str, model_id: str) -> None:
        async with self._lock:
            target = getattr(self._state, collection)
            target.pop(model_id, None)
            await self._save_locked()

    async def get_model(self, collection: str, model_id: str, model_type: Type[ModelT]) -> ModelT | None:
        async with self._lock:
            target = getattr(self._state, collection)
            item = target.get(model_id)
            if item is None:
                return None
            if isinstance(item, model_type):
                return item.model_copy(deep=True)
            return model_type.model_validate(item)

    async def list_models(self, collection: str, model_type: Type[ModelT]) -> list[ModelT]:
        async with self._lock:
            target = getattr(self._state, collection)
            items = []
            for item in target.values():
                if isinstance(item, model_type):
                    items.append(item.model_copy(deep=True))
                else:
                    items.append(model_type.model_validate(item))
            return items

    async def mutate(self, callback):
        async with self._lock:
            callback(self._state)
            await self._save_locked()
            return self._state.model_copy(deep=True)

    async def _save_locked(self) -> None:
        payload = self._state.model_dump(mode="json")
        text = json.dumps(payload, indent=2, ensure_ascii=True)
        temp_path = self.path.with_suffix(".tmp")
        await asyncio.to_thread(temp_path.write_text, text, encoding="utf-8")
        await asyncio.to_thread(temp_path.replace, self.path)
