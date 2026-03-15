from __future__ import annotations

import json
import threading
import time
from pathlib import Path


def _coerce_viewport(raw_viewport: object) -> dict[str, float] | None:
    if not isinstance(raw_viewport, dict):
        return None

    x = raw_viewport.get("x")
    y = raw_viewport.get("y")
    scale = raw_viewport.get("scale")
    if not isinstance(x, (int, float)) or not isinstance(y, (int, float)) or not isinstance(scale, (int, float)):
        return None

    return {"x": float(x), "y": float(y), "scale": float(scale)}


def _coerce_nodes(raw_nodes: object) -> dict[str, dict[str, float]]:
    if not isinstance(raw_nodes, dict):
        return {}

    nodes: dict[str, dict[str, float]] = {}
    for node_id, position in raw_nodes.items():
        if not isinstance(node_id, str) or not isinstance(position, dict):
            continue

        x = position.get("x")
        y = position.get("y")
        if isinstance(x, (int, float)) and isinstance(y, (int, float)):
            nodes[node_id] = {"x": float(x), "y": float(y)}
    return nodes


class LayoutStore:
    def __init__(self, path: str) -> None:
        self._path = Path(path)
        self._lock = threading.Lock()

    def load(self) -> dict:
        with self._lock:
            return self._read_unlocked()

    def save(
        self,
        nodes: dict[str, dict[str, float]],
        viewport: dict[str, float] | None = None,
    ) -> dict:
        payload = {
            "nodes": _coerce_nodes(nodes),
            "viewport": _coerce_viewport(viewport),
            "updatedAt": int(time.time()),
        }

        with self._lock:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self._path.with_suffix(f"{self._path.suffix}.tmp")
            temp_path.write_text(json.dumps(payload, sort_keys=True), encoding="utf-8")
            temp_path.replace(self._path)
            return dict(payload)

    def _read_unlocked(self) -> dict:
        if not self._path.exists():
            return {"nodes": {}, "viewport": None, "updatedAt": None}

        try:
            payload = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {"nodes": {}, "viewport": None, "updatedAt": None}

        updated_at = payload.get("updatedAt")
        if not isinstance(updated_at, int):
            updated_at = None

        return {
            "nodes": _coerce_nodes(payload.get("nodes")),
            "viewport": _coerce_viewport(payload.get("viewport")),
            "updatedAt": updated_at,
        }
