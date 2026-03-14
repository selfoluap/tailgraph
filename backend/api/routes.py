from __future__ import annotations

import time

from fastapi import APIRouter, Response

from backend.services.cache import StatusCache
from backend.services.tailscale import TailscaleService


def build_api_router(cache: StatusCache, tailscale: TailscaleService) -> APIRouter:
    router = APIRouter()

    @router.get("/status.json")
    def get_status(response: Response) -> dict:
        try:
            payload = cache.get(tailscale.fetch_status)
            response.status_code = 200
            return payload
        except Exception as exc:
            response.status_code = 500
            return {
                "error": str(exc),
                "generatedAt": int(time.time()),
            }

    @router.get("/healthz")
    def healthz() -> dict:
        return {"ok": True, "time": int(time.time())}

    return router
