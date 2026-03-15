from __future__ import annotations

import json
import threading
import time
from pathlib import Path

MAX_LAYOUT_VIEWS = 5
DEFAULT_LAYOUT_VIEW = "view1"


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


def _empty_layout() -> dict:
    return {"nodes": {}, "viewport": None, "updatedAt": None}


def _view_key(index: int) -> str:
    return f"view{index}"


def _normalize_view_id(view_id: object) -> str:
    if isinstance(view_id, str) and view_id in {_view_key(index) for index in range(1, MAX_LAYOUT_VIEWS + 1)}:
        return view_id
    return DEFAULT_LAYOUT_VIEW


def _coerce_layout(raw_layout: object) -> dict:
    if not isinstance(raw_layout, dict):
        return _empty_layout()

    updated_at = raw_layout.get("updatedAt")
    if not isinstance(updated_at, int):
        updated_at = None

    return {
        "nodes": _coerce_nodes(raw_layout.get("nodes")),
        "viewport": _coerce_viewport(raw_layout.get("viewport")),
        "updatedAt": updated_at,
    }


def _coerce_views(raw_views: object) -> dict[str, dict]:
    allowed_views = {_view_key(index) for index in range(1, MAX_LAYOUT_VIEWS + 1)}
    views = {_view_key(index): _empty_layout() for index in range(1, MAX_LAYOUT_VIEWS + 1)}
    if not isinstance(raw_views, dict):
        return views

    for view_id, raw_layout in raw_views.items():
        if isinstance(view_id, str) and view_id in allowed_views:
            views[view_id] = _coerce_layout(raw_layout)
    return views


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
        view_id: str = DEFAULT_LAYOUT_VIEW,
    ) -> dict:
        normalized_view_id = _normalize_view_id(view_id)
        next_layout = {
            "nodes": _coerce_nodes(nodes),
            "viewport": _coerce_viewport(viewport),
            "updatedAt": int(time.time()),
        }

        with self._lock:
            existing = self._read_unlocked()
            existing_views = _coerce_views(existing.get("views"))
            existing_views[normalized_view_id] = next_layout
            payload = {
                "activeView": normalized_view_id,
                "views": existing_views,
            }
            self._path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self._path.with_suffix(f"{self._path.suffix}.tmp")
            temp_path.write_text(json.dumps(payload, sort_keys=True), encoding="utf-8")
            temp_path.replace(self._path)
            return self._compose_payload(normalized_view_id, existing_views)

    def _read_unlocked(self) -> dict:
        if not self._path.exists():
            return self._compose_payload(DEFAULT_LAYOUT_VIEW, _coerce_views(None))

        try:
            payload = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return self._compose_payload(DEFAULT_LAYOUT_VIEW, _coerce_views(None))

        if isinstance(payload, dict) and isinstance(payload.get("views"), dict):
            active_view = _normalize_view_id(payload.get("activeView"))
            views = _coerce_views(payload.get("views"))
            return self._compose_payload(active_view, views)

        legacy_layout = _coerce_layout(payload)
        views = _coerce_views(None)
        views[DEFAULT_LAYOUT_VIEW] = legacy_layout
        return self._compose_payload(DEFAULT_LAYOUT_VIEW, views)

    def _compose_payload(self, active_view: str, views: dict[str, dict]) -> dict:
        active_layout = views.get(active_view) or _empty_layout()
        return {
            "activeView": active_view,
            "views": views,
            "nodes": active_layout["nodes"],
            "viewport": active_layout["viewport"],
            "updatedAt": active_layout["updatedAt"],
        }
