from __future__ import annotations

import threading
import time
from typing import Callable, TypeVar


T = TypeVar("T")


class StatusCache:
    def __init__(self, ttl_seconds: float = 2.0) -> None:
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._cached_at = 0.0
        self._cached_value: T | None = None
        self._has_value = False

    def get(self, fetcher: Callable[[], T]) -> T:
        now = time.time()
        with self._lock:
            if self._has_value and (now - self._cached_at) < self.ttl_seconds:
                return self._cached_value  # type: ignore[return-value]

            value = fetcher()
            self._cached_value = value
            self._cached_at = now
            self._has_value = True
            return value

    def clear(self) -> None:
        with self._lock:
            self._cached_value = None
            self._cached_at = 0.0
            self._has_value = False
