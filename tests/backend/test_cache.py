from backend.services.cache import StatusCache


def test_cache_reuses_recent_value():
    cache = StatusCache(ttl_seconds=60)
    calls = {"count": 0}

    def fetcher():
        calls["count"] += 1
        return calls["count"]

    assert cache.get(fetcher) == 1
    assert cache.get(fetcher) == 1
    assert calls["count"] == 1
