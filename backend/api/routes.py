from __future__ import annotations

import time

from fastapi import APIRouter, Response

from backend.services.cache import BackgroundRefreshCache, StatusCache
from backend.services.group_store import GroupStore
from backend.services.layout_store import LayoutStore
from backend.services.service_discovery import ServiceScanner
from backend.services.tailscale import TailscaleService


def build_api_router(
    cache: StatusCache,
    service_discovery_cache: BackgroundRefreshCache,
    layout_store: LayoutStore,
    group_store: GroupStore,
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
            payload = merge_saved_groups(payload, group_store.load().get("groups") or {})
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
            "config": layout_store.save(
                payload.get("nodes") or {},
                payload.get("viewport"),
            ),
        }

    @router.get("/groups.json")
    def get_groups() -> dict:
        return group_store.load()

    @router.put("/groups.json")
    def put_groups(payload: dict) -> dict:
        return {
            "ok": True,
            "groups": group_store.save(payload.get("groups") or {}),
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


def merge_saved_groups(payload: dict, groups_by_hostname: dict[str, list[str]]) -> dict:
    merged = dict(payload)

    self_peer = dict(merged.get("Self") or {})
    self_hostname = self_peer.get("HostName")
    self_peer["Groups"] = groups_by_hostname.get(self_hostname, []) if isinstance(self_hostname, str) else []
    merged["Self"] = self_peer

    peers = dict(merged.get("Peer") or {})
    merged_peers = {}
    for peer_id, peer in peers.items():
        merged_peer = dict(peer)
        hostname = merged_peer.get("HostName")
        merged_peer["Groups"] = groups_by_hostname.get(hostname, []) if isinstance(hostname, str) else []
        merged_peers[peer_id] = merged_peer

    merged["Peer"] = merged_peers
    return merged
