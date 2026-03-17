from backend.api.routes import merge_service_discovery, resolve_service_discovery
from backend.services.cache import BackgroundRefreshCache
from backend.services.service_discovery import (
    DEFAULT_DISCOVERY_PORTS,
    PORT_LABELS,
    ServiceScanner,
    parse_service_discovery_ports,
)


def test_parse_service_discovery_ports_uses_defaults_for_empty_values():
    assert parse_service_discovery_ports("") == DEFAULT_DISCOVERY_PORTS
    assert parse_service_discovery_ports(" , ") == DEFAULT_DISCOVERY_PORTS


def test_parse_service_discovery_ports_deduplicates_and_preserves_order():
    assert parse_service_discovery_ports("8000, 8001, 8000, 8080") == (8000, 8001, 8080)


def test_scan_status_returns_open_ports(monkeypatch):
    scanner = ServiceScanner(enabled=True, ports=(5000, 8000), timeout_ms=50)
    monkeypatch.setattr(scanner, "_is_port_open", lambda ip, port: port == 8000)

    payload = scanner.scan_status(
        {
            "Self": {"TailscaleIPs": ["100.64.0.1"]},
            "Peer": {
                "peer1": {"TailscaleIPs": ["100.64.0.2"]},
            },
        }
    )

    assert payload["meta"]["status"] == "ready"
    assert payload["self"] == [{"label": PORT_LABELS[8000], "port": 8000, "protocol": "tcp"}]
    assert payload["peers"]["peer1"] == [{"label": PORT_LABELS[8000], "port": 8000, "protocol": "tcp"}]


def test_scan_status_skips_nodes_without_ipv4(monkeypatch):
    scanner = ServiceScanner(enabled=True, ports=(8000,), timeout_ms=50)
    monkeypatch.setattr(scanner, "_is_port_open", lambda ip, port: True)

    payload = scanner.scan_status(
        {
            "Self": {"TailscaleIPs": []},
            "Peer": {
                "peer1": {"TailscaleIPs": ["fd7a:115c:a1e0::1"]},
            },
        }
    )

    assert payload["self"] == []
    assert payload["peers"]["peer1"] == []
    assert payload["meta"]["skippedNodes"] == ["self", "peer1"]


def test_merge_service_discovery_attaches_metadata_and_peer_services():
    merged = merge_service_discovery(
        {
            "Self": {"HostName": "alpha"},
            "Peer": {"peer1": {"HostName": "beta"}},
            "_meta": {"generatedAtISO": "2026-03-14T00:00:00Z"},
        },
        {
            "self": [{"label": "vite", "port": 5173, "protocol": "tcp"}],
            "peers": {"peer1": [{"label": "fastapi", "port": 8000, "protocol": "tcp"}]},
            "meta": {"status": "ready", "ports": [5173, 8000]},
        },
    )

    assert merged["_meta"]["serviceDiscovery"]["status"] == "ready"
    assert merged["Self"]["DiscoveredServices"][0]["port"] == 5173
    assert merged["Peer"]["peer1"]["DiscoveredServices"][0]["port"] == 8000


def test_resolve_service_discovery_marks_stale_cache_and_schedules_refresh():
    cache = BackgroundRefreshCache(ttl_seconds=0)
    cache._cached_value = {  # type: ignore[attr-defined]
        "self": [],
        "peers": {},
        "meta": {"status": "ready", "ports": [8000]},
    }
    cache._cached_at = 0  # type: ignore[attr-defined]
    cache._has_value = True  # type: ignore[attr-defined]
    scanner = ServiceScanner(enabled=True, ports=(8000,), timeout_ms=50)
    scheduled = {"count": 0}

    cache.refresh_in_background = lambda fetcher: scheduled.__setitem__("count", scheduled["count"] + 1) or True  # type: ignore[method-assign]

    payload = resolve_service_discovery({"Self": {}, "Peer": {}}, cache, scanner)

    assert scheduled["count"] == 1
    assert payload["meta"]["status"] == "ready"
    assert payload["meta"]["stale"] is True
