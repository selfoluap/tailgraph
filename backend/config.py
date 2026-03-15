from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    cache_seconds: float
    frontend_dist_dir: Path
    tailscale_host: str
    service_discovery_enabled: bool
    service_discovery_ttl_seconds: float
    service_discovery_timeout_ms: int
    service_discovery_ports: tuple[int, ...]


def _env_flag(name: str, default: str) -> bool:
    return os.environ.get(name, default).strip().lower() not in {"0", "false", "no", "off"}


def load_settings() -> Settings:
    from backend.services.service_discovery import DEFAULT_DISCOVERY_PORTS, parse_service_discovery_ports

    frontend_dist = os.environ.get("TS_GRAPH_FRONTEND_DIST", "").strip()
    raw_ports = os.environ.get(
        "TS_GRAPH_SERVICE_DISCOVERY_PORTS",
        ",".join(str(port) for port in DEFAULT_DISCOVERY_PORTS),
    )
    return Settings(
        host=os.environ.get("TS_GRAPH_HOST", "").strip(),
        port=int(os.environ.get("TS_GRAPH_PORT", "8080")),
        cache_seconds=float(os.environ.get("TS_GRAPH_CACHE_SECONDS", "2.0")),
        frontend_dist_dir=Path(frontend_dist) if frontend_dist else BASE_DIR / "frontend" / "dist",
        tailscale_host=os.environ.get("TS_GRAPH_HOST", "").strip(),
        service_discovery_enabled=_env_flag("TS_GRAPH_SERVICE_DISCOVERY_ENABLED", "true"),
        service_discovery_ttl_seconds=float(os.environ.get("TS_GRAPH_SERVICE_DISCOVERY_TTL_SECONDS", "60")),
        service_discovery_timeout_ms=int(os.environ.get("TS_GRAPH_SERVICE_DISCOVERY_TIMEOUT_MS", "250")),
        service_discovery_ports=parse_service_discovery_ports(raw_ports),
    )
