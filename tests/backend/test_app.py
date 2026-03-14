from pathlib import Path

from fastapi import Response
from fastapi.responses import HTMLResponse

from backend.api.routes import build_api_router
from backend.app import create_app
from backend.services.cache import StatusCache
from backend.services.tailscale import TailscaleService


def route_endpoint(router, path: str):
    for route in router.routes:
        if route.path == path:
            return route.endpoint
    raise AssertionError(f"route not found: {path}")


def app_endpoint(app, path: str):
    for route in app.routes:
        if getattr(route, "path", None) == path:
            return route.endpoint
    raise AssertionError(f"app route not found: {path}")


def test_healthz():
    router = build_api_router(StatusCache(), TailscaleService())

    payload = route_endpoint(router, "/healthz")()

    assert payload["ok"] is True
    assert isinstance(payload["time"], int)


def test_status_json_success():
    cache = StatusCache()
    tailscale = TailscaleService()
    tailscale.fetch_status = lambda: {"Self": {}, "_meta": {"generatedAtISO": "now"}}  # type: ignore[method-assign]
    router = build_api_router(cache, tailscale)
    response = Response()

    payload = route_endpoint(router, "/status.json")(response)

    assert response.status_code == 200
    assert payload["_meta"]["generatedAtISO"] == "now"


def test_status_json_error():
    cache = StatusCache()
    tailscale = TailscaleService()

    def fail():
        raise RuntimeError("boom")

    tailscale.fetch_status = fail  # type: ignore[method-assign]
    router = build_api_router(cache, tailscale)
    response = Response()

    payload = route_endpoint(router, "/status.json")(response)

    assert response.status_code == 500
    assert payload["error"] == "boom"


def test_frontend_fallback(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("TS_GRAPH_FRONTEND_DIST", str(tmp_path))
    app = create_app()

    response = app_endpoint(app, "/{full_path:path}")("")

    assert isinstance(response, HTMLResponse)
    assert response.status_code == 503
    assert b"Frontend build not found" in response.body
