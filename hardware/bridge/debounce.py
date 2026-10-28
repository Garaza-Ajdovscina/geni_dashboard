"""Debounce helper for host-side button filtering (optional)."""

from __future__ import annotations

import time


class EdgeDebouncer:
    def __init__(self, debounce_ms: int = 25) -> None:
        self.debounce_s = debounce_ms / 1000.0
        self._last_fire: dict[str, float] = {}

    def should_fire(self, key: str) -> bool:
        now = time.monotonic()
        last = self._last_fire.get(key, 0.0)
        if now - last < self.debounce_s:
            return False
        self._last_fire[key] = now
        return True
