from __future__ import annotations

import time

from fastapi import APIRouter, Response

from backend.services.cache import BackgroundRefreshCache, StatusCache
from backend.services.layout_store import LayoutStore
from backend.services.service_discovery import ServiceScanner
from backend.services.tailscale import TailscaleService


def build_api_router(
    cache: StatusCache,
    service_discovery_cache: BackgroundRefreshCache,
    layout_store: LayoutStore,
    tailscale: TailscaleService,
    service_scanner: ServiceScanner,
) -> APIRouter:
    router = APIRouter()

    @router.get("/status.json")
    def get_status(response: Response) -> dict:
        try:
            payload = cache.get(tailscale.fetch_status)
            payload = merge_service_discovery(
                payload,
                service_discovery_cache.get(lambda: service_scanner.scan_status(payload)),
            )
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

    @router.get("/config.json")
    def get_config() -> dict:
        return layout_store.load()

    @router.put("/config.json")
    def put_config(payload: dict) -> dict:
        return {
            "ok": True,
            "config": layout_store.save(payload.get("nodes") or {}, payload.get("viewport")),
        }

    return router


def merge_service_discovery(payload: dict, discovery: dict) -> dict:
    merged = dict(payload)
    merged_meta = dict(merged.get("_meta") or {})
    merged_meta["serviceDiscovery"] = discovery.get("meta", {})
    merged["_meta"] = merged_meta

    self_peer = dict(merged.get("Self") or {})
    self_peer["DiscoveredServices"] = discovery.get("self", [])
    merged["Self"] = self_peer

    peers = dict(merged.get("Peer") or {})
    discovery_peers = discovery.get("peers") or {}
    merged_peers = {}
    for peer_id, peer in peers.items():
        merged_peer = dict(peer)
        merged_peer["DiscoveredServices"] = discovery_peers.get(peer_id, [])
        merged_peers[peer_id] = merged_peer
    merged["Peer"] = merged_peers
    return merged
