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


def load_settings() -> Settings:
    frontend_dist = os.environ.get("TS_GRAPH_FRONTEND_DIST", "").strip()
    return Settings(
        host=os.environ.get("TS_GRAPH_HOST", "").strip(),
        port=int(os.environ.get("TS_GRAPH_PORT", "8080")),
        cache_seconds=float(os.environ.get("TS_GRAPH_CACHE_SECONDS", "2.0")),
        frontend_dist_dir=Path(frontend_dist) if frontend_dist else BASE_DIR / "frontend" / "dist",
        tailscale_host=os.environ.get("TS_GRAPH_HOST", "").strip(),
    )
