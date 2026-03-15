from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    cache_seconds: float
    config_path: str
    tailscale_host: str
    service_discovery_enabled: bool
    service_discovery_ttl_seconds: float
    service_discovery_timeout_ms: int
    service_discovery_ports: tuple[int, ...]


def _env_flag(name: str, default: str) -> bool:
    return os.environ.get(name, default).strip().lower() not in {"0", "false", "no", "off"}


def load_settings() -> Settings:
    from backend.services.service_discovery import DEFAULT_DISCOVERY_PORTS, parse_service_discovery_ports

    raw_ports = os.environ.get(
        "TS_GRAPH_SERVICE_DISCOVERY_PORTS",
        ",".join(str(port) for port in DEFAULT_DISCOVERY_PORTS),
    )
    return Settings(
        host=os.environ.get("TS_GRAPH_HOST", "").strip(),
        port=int(os.environ.get("TS_GRAPH_PORT", "8080")),
        cache_seconds=float(os.environ.get("TS_GRAPH_CACHE_SECONDS", "2.0")),
        config_path=os.environ.get("TS_GRAPH_CONFIG_PATH", ".tailgraph-config.json").strip(),
        tailscale_host=os.environ.get("TS_GRAPH_HOST", "").strip(),
        service_discovery_enabled=_env_flag("TS_GRAPH_SERVICE_DISCOVERY_ENABLED", "true"),
        service_discovery_ttl_seconds=float(os.environ.get("TS_GRAPH_SERVICE_DISCOVERY_TTL_SECONDS", "60")),
        service_discovery_timeout_ms=int(os.environ.get("TS_GRAPH_SERVICE_DISCOVERY_TIMEOUT_MS", "250")),
        service_discovery_ports=parse_service_discovery_ports(raw_ports),
    )
