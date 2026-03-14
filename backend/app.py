from __future__ import annotations

from fastapi import FastAPI

from backend.api.routes import build_api_router
from backend.config import load_settings
from backend.services.cache import StatusCache
from backend.services.tailscale import TailscaleService
from backend.web.routes import register_frontend


def create_app() -> FastAPI:
    settings = load_settings()
    cache = StatusCache(ttl_seconds=settings.cache_seconds)
    tailscale = TailscaleService(host_override=settings.tailscale_host)

    app = FastAPI(title="Tailgraph")
    app.state.settings = settings
    app.state.cache = cache
    app.state.tailscale = tailscale

    app.include_router(build_api_router(cache, tailscale))
    register_frontend(app, settings.frontend_dist_dir)
    return app
