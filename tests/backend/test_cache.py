import threading

from backend.services.cache import BackgroundRefreshCache, StatusCache


def test_cache_reuses_recent_value():
    cache = StatusCache(ttl_seconds=60)
    calls = {"count": 0}

    def fetcher():
        calls["count"] += 1
        return calls["count"]

    assert cache.get(fetcher) == 1
    assert cache.get(fetcher) == 1
    assert calls["count"] == 1


def test_background_refresh_cache_returns_stale_value_while_refreshing(monkeypatch):
    cache = BackgroundRefreshCache(ttl_seconds=0)
    cache._cached_value = 1
    cache._cached_at = 0
    cache._has_value = True

    started = {"count": 0}

    class FakeThread:
        def __init__(self, target, args, daemon):
            self._target = target
            self._args = args

        def start(self):
            started["count"] += 1

    monkeypatch.setattr(threading, "Thread", FakeThread)

    value = cache.get(lambda: 2)

    assert value == 1
    assert started["count"] == 1
