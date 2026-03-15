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


class BackgroundRefreshCache:
    def __init__(self, ttl_seconds: float) -> None:
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._cached_at = 0.0
        self._cached_value: T | None = None
        self._has_value = False
        self._refreshing = False

    def get(self, fetcher: Callable[[], T]) -> T:
        should_refresh = False
        now = time.time()

        with self._lock:
            is_fresh = self._has_value and (now - self._cached_at) < self.ttl_seconds
            if is_fresh:
                return self._cached_value  # type: ignore[return-value]

            if self._has_value:
                if not self._refreshing:
                    self._refreshing = True
                    should_refresh = True
                cached = self._cached_value
            else:
                cached = None

        if cached is not None and should_refresh:
            thread = threading.Thread(target=self._refresh, args=(fetcher,), daemon=True)
            thread.start()
            return cached

        value = fetcher()
        with self._lock:
            self._cached_value = value
            self._cached_at = time.time()
            self._has_value = True
            self._refreshing = False
        return value

    def _refresh(self, fetcher: Callable[[], T]) -> None:
        try:
            value = fetcher()
        except Exception:
            with self._lock:
                self._refreshing = False
            return

        with self._lock:
            self._cached_value = value
            self._cached_at = time.time()
            self._has_value = True
            self._refreshing = False

    def clear(self) -> None:
        with self._lock:
            self._cached_value = None
            self._cached_at = 0.0
            self._has_value = False
            self._refreshing = False
