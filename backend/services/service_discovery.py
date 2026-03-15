from __future__ import annotations

import socket
import time
from dataclasses import dataclass
from typing import Any


DEFAULT_DISCOVERY_PORTS = (80, 443, 3000, 4173, 5000, 5173, 8000, 8001, 8080, 8443, 9090)

PORT_LABELS = {
    80: "http",
    443: "https",
    3000: "dev-server",
    4173: "vite-preview",
    5000: "app",
    5173: "vite",
    8000: "fastapi",
    8001: "app",
    8080: "http-alt",
    8443: "https-alt",
    9090: "dashboard",
}


@dataclass(frozen=True)
class DiscoveredService:
    port: int
    protocol: str
    label: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "port": self.port,
            "protocol": self.protocol,
            "label": self.label,
        }


@dataclass
class ServiceScanner:
    enabled: bool = True
    ports: tuple[int, ...] = DEFAULT_DISCOVERY_PORTS
    timeout_ms: int = 250

    def scan_status(self, status: dict[str, Any]) -> dict[str, Any]:
        started_at = time.time()
        generated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(started_at))

        if not self.enabled:
            return {
                "self": [],
                "peers": {},
                "meta": {
                    "enabled": False,
                    "status": "disabled",
                    "ports": list(self.ports),
                    "scannedAt": generated_at,
                    "durationMs": 0,
                },
            }

        self_result, peer_results, skipped = self._scan_nodes(status)
        duration_ms = int((time.time() - started_at) * 1000)
        return {
            "self": [service.as_dict() for service in self_result],
            "peers": {
                peer_id: [service.as_dict() for service in services]
                for peer_id, services in peer_results.items()
            },
            "meta": {
                "enabled": True,
                "status": "ready",
                "ports": list(self.ports),
                "scannedAt": generated_at,
                "durationMs": duration_ms,
                "timeoutMs": self.timeout_ms,
                "skippedNodes": skipped,
            },
        }

    def _scan_nodes(self, status: dict[str, Any]) -> tuple[list[DiscoveredService], dict[str, list[DiscoveredService]], list[str]]:
        skipped: list[str] = []
        self_peer = status.get("Self") or {}
        peer_map = status.get("Peer") or {}

        self_ip = self._extract_ip(self_peer)
        if self_ip:
            self_result = self._scan_ip(self_ip)
        else:
            self_result = []
            skipped.append("self")

        peer_results: dict[str, list[DiscoveredService]] = {}
        for peer_id, peer in peer_map.items():
            ip = self._extract_ip(peer)
            if not ip:
                skipped.append(str(peer_id))
                peer_results[str(peer_id)] = []
                continue
            peer_results[str(peer_id)] = self._scan_ip(ip)

        return self_result, peer_results, skipped

    def _extract_ip(self, peer: dict[str, Any]) -> str:
        ips = peer.get("TailscaleIPs") or []
        for ip in ips:
            if isinstance(ip, str) and "." in ip:
                return ip
        return ""

    def _scan_ip(self, ip: str) -> list[DiscoveredService]:
        services: list[DiscoveredService] = []
        for port in self.ports:
            if self._is_port_open(ip, port):
                services.append(
                    DiscoveredService(
                        port=port,
                        protocol="tcp",
                        label=PORT_LABELS.get(port, f"tcp/{port}"),
                    )
                )
        return services

    def _is_port_open(self, ip: str, port: int) -> bool:
        timeout_seconds = self.timeout_ms / 1000
        try:
            with socket.create_connection((ip, port), timeout=timeout_seconds):
                return True
        except OSError:
            return False


def parse_service_discovery_ports(raw_ports: str) -> tuple[int, ...]:
    values = [part.strip() for part in raw_ports.split(",")]
    ports: list[int] = []
    for value in values:
        if not value:
            continue
        port = int(value)
        if port <= 0 or port > 65535:
            raise ValueError(f"invalid service discovery port: {value}")
        ports.append(port)
    if not ports:
        return DEFAULT_DISCOVERY_PORTS
    return tuple(dict.fromkeys(ports))
