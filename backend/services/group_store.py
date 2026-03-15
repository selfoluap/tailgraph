from __future__ import annotations

import json
import threading
import time
from pathlib import Path


def _coerce_groups(raw_groups: object) -> dict[str, list[str]]:
    if not isinstance(raw_groups, dict):
        return {}

    groups: dict[str, list[str]] = {}
    for hostname, names in raw_groups.items():
        if not isinstance(hostname, str) or not isinstance(names, list):
            continue

        clean_hostname = hostname.strip()
        if not clean_hostname:
            continue

        normalized: list[str] = []
        seen: set[str] = set()
        for name in names:
            if not isinstance(name, str):
                continue

            clean_name = name.strip()
            if not clean_name:
                continue

            key = clean_name.casefold()
            if key in seen:
                continue

            seen.add(key)
            normalized.append(clean_name)

        if normalized:
            groups[clean_hostname] = normalized

    return groups


class GroupStore:
    def __init__(self, path: str) -> None:
        self._path = Path(path)
        self._lock = threading.Lock()

    def load(self) -> dict:
        with self._lock:
            return self._read_unlocked()

    def save(self, groups: dict[str, list[str]] | None = None) -> dict:
        payload = {
            "groups": _coerce_groups(groups),
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
            return {"groups": {}, "updatedAt": None}

        try:
            payload = json.loads(self._path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {"groups": {}, "updatedAt": None}

        updated_at = payload.get("updatedAt")
        if not isinstance(updated_at, int):
            updated_at = None

        return {
            "groups": _coerce_groups(payload.get("groups")),
            "updatedAt": updated_at,
        }
