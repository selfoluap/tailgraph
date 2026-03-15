from __future__ import annotations

from fastapi import FastAPI

from backend.api.routes import build_api_router
from backend.config import load_settings
from backend.services.cache import BackgroundRefreshCache, StatusCache
from backend.services.group_store import GroupStore
from backend.services.layout_store import LayoutStore
from backend.services.service_discovery import ServiceScanner
from backend.services.tailscale import TailscaleService


def create_app() -> FastAPI:
    settings = load_settings()
    cache = StatusCache(ttl_seconds=settings.cache_seconds)
    service_discovery_cache = BackgroundRefreshCache(
        ttl_seconds=settings.service_discovery_ttl_seconds
    )
    layout_store = LayoutStore(settings.config_path)
    group_store = GroupStore(settings.groups_path)
    tailscale = TailscaleService(host_override=settings.tailscale_host)
    service_scanner = ServiceScanner(
        enabled=settings.service_discovery_enabled,
        ports=settings.service_discovery_ports,
        timeout_ms=settings.service_discovery_timeout_ms,
    )

    app = FastAPI(title="Tailgraph")
    app.state.settings = settings
    app.state.cache = cache
    app.state.service_discovery_cache = service_discovery_cache
    app.state.layout_store = layout_store
    app.state.group_store = group_store
    app.state.tailscale = tailscale
    app.state.service_scanner = service_scanner

    app.include_router(
        build_api_router(
            cache,
            service_discovery_cache,
            layout_store,
            group_store,
            tailscale,
            service_scanner,
        )
    )
    return app
