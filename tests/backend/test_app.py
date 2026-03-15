from fastapi import Response

from backend.api.routes import build_api_router
from backend.services.cache import BackgroundRefreshCache, StatusCache
from backend.services.group_store import GroupStore
from backend.services.layout_store import LayoutStore
from backend.services.service_discovery import ServiceScanner
from backend.services.tailscale import TailscaleService


def route_endpoint(router, path: str, method: str = "GET"):
    for route in router.routes:
        if route.path == path and method in route.methods:
            return route.endpoint
    raise AssertionError(f"route not found: {method} {path}")


def test_healthz():
    router = build_api_router(
        StatusCache(),
        BackgroundRefreshCache(ttl_seconds=60),
        LayoutStore("/tmp/test-config-healthz.json"),
        GroupStore("/tmp/test-groups-healthz.json"),
        TailscaleService(),
        ServiceScanner(enabled=False),
    )

    payload = route_endpoint(router, "/healthz")()

    assert payload["ok"] is True
    assert isinstance(payload["time"], int)


def test_status_json_success():
    cache = StatusCache()
    service_discovery_cache = BackgroundRefreshCache(ttl_seconds=60)
    layout_store = LayoutStore("/tmp/test-config-status-success.json")
    group_store = GroupStore("/tmp/test-groups-status-success.json")
    tailscale = TailscaleService()
    service_scanner = ServiceScanner(enabled=False)
    group_store.save({"beta": ["Production"]})
    tailscale.fetch_status = lambda: {  # type: ignore[method-assign]
        "Self": {"HostName": "beta"},
        "_meta": {"generatedAtISO": "now"},
    }
    router = build_api_router(cache, service_discovery_cache, layout_store, group_store, tailscale, service_scanner)
    response = Response()

    payload = route_endpoint(router, "/status.json")(response)

    assert response.status_code == 200
    assert payload["_meta"]["generatedAtISO"] == "now"
    assert payload["_meta"]["serviceDiscovery"]["status"] == "disabled"
    assert payload["Self"]["DiscoveredServices"] == []
    assert payload["Self"]["Groups"] == ["Production"]


def test_status_json_error():
    cache = StatusCache()
    service_discovery_cache = BackgroundRefreshCache(ttl_seconds=60)
    layout_store = LayoutStore("/tmp/test-config-status-error.json")
    group_store = GroupStore("/tmp/test-groups-status-error.json")
    tailscale = TailscaleService()
    service_scanner = ServiceScanner(enabled=False)

    def fail():
        raise RuntimeError("boom")

    tailscale.fetch_status = fail  # type: ignore[method-assign]
    router = build_api_router(cache, service_discovery_cache, layout_store, group_store, tailscale, service_scanner)
    response = Response()

    payload = route_endpoint(router, "/status.json")(response)

    assert response.status_code == 500
    assert payload["error"] == "boom"


def test_config_json_round_trip(tmp_path):
    router = build_api_router(
        StatusCache(),
        BackgroundRefreshCache(ttl_seconds=60),
        LayoutStore(str(tmp_path / "config.json")),
        GroupStore(str(tmp_path / "groups.json")),
        TailscaleService(),
        ServiceScanner(enabled=False),
    )

    saved = route_endpoint(router, "/config.json", method="PUT")(
        {
            "viewId": "view2",
            "nodes": {"peer1": {"x": 12, "y": -8.5}},
            "viewport": {"x": 5, "y": 7, "scale": 1.25},
        }
    )
    loaded = route_endpoint(router, "/config.json", method="GET")()

    assert saved["ok"] is True
    assert saved["config"]["activeView"] == "view2"
    assert saved["config"]["nodes"] == {"peer1": {"x": 12.0, "y": -8.5}}
    assert saved["config"]["viewport"] == {"x": 5.0, "y": 7.0, "scale": 1.25}
    assert saved["config"]["views"]["view2"]["nodes"] == {"peer1": {"x": 12.0, "y": -8.5}}
    assert isinstance(saved["config"]["updatedAt"], int)
    assert loaded == saved["config"]


def test_groups_json_round_trip(tmp_path):
    router = build_api_router(
        StatusCache(),
        BackgroundRefreshCache(ttl_seconds=60),
        LayoutStore(str(tmp_path / "config.json")),
        GroupStore(str(tmp_path / "groups.json")),
        TailscaleService(),
        ServiceScanner(enabled=False),
    )

    saved = route_endpoint(router, "/groups.json", method="PUT")(
        {"groups": {"beta": ["Production", "Edge"]}}
    )
    loaded = route_endpoint(router, "/groups.json", method="GET")()

    assert saved["ok"] is True
    assert saved["groups"]["groups"] == {"beta": ["Production", "Edge"]}
    assert isinstance(saved["groups"]["updatedAt"], int)
    assert loaded == saved["groups"]
