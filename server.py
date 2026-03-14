#!/usr/bin/env python3
import json
import os
import socket
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent
INDEX_FILE = BASE_DIR / "index.html"

HOST = os.environ.get("TS_GRAPH_HOST", "").strip()
PORT = int(os.environ.get("TS_GRAPH_PORT", "8080"))
STATUS_CACHE_SECONDS = float(os.environ.get("TS_GRAPH_CACHE_SECONDS", "2.0"))


class StatusCache:
    def __init__(self, ttl_seconds: float = 2.0) -> None:
        self.ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._cached_at = 0.0
        self._cached_json: Optional[str] = None
        self._cached_error: Optional[str] = None

    def get(self) -> tuple[int, str]:
        now = time.time()
        with self._lock:
            if (
                self._cached_json is not None
                and (now - self._cached_at) < self.ttl_seconds
            ):
                return 200, self._cached_json

            try:
                payload = fetch_tailscale_status()
                self._cached_json = json.dumps(payload, ensure_ascii=False)
                self._cached_error = None
                self._cached_at = now
                return 200, self._cached_json
            except Exception as exc:
                error_payload = {
                    "error": str(exc),
                    "generatedAt": int(time.time()),
                }
                self._cached_json = None
                self._cached_error = json.dumps(error_payload, ensure_ascii=False)
                self._cached_at = now
                return 500, self._cached_error


def run_command(cmd: list[str]) -> str:
    proc = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        stderr = (proc.stderr or "").strip()
        stdout = (proc.stdout or "").strip()
        detail = stderr or stdout or f"exit code {proc.returncode}"
        raise RuntimeError(f"{' '.join(cmd)} failed: {detail}")
    return proc.stdout


def get_tailscale_ipv4() -> str:
    output = run_command(["tailscale", "ip", "-4"])
    for line in output.splitlines():
        ip = line.strip()
        if ip:
            return ip
    raise RuntimeError("could not determine Tailscale IPv4 address")


def fetch_tailscale_status() -> dict:
    raw = run_command(["tailscale", "status", "--json"])
    data = json.loads(raw)
    data["_meta"] = {
        "generatedAt": int(time.time()),
        "generatedAtISO": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    return data


def guess_host() -> str:
    if HOST:
        return HOST
    return get_tailscale_ipv4()


def read_index_html() -> bytes:
    if not INDEX_FILE.exists():
        raise FileNotFoundError(
            f"index.html not found at {INDEX_FILE}. Put index.html next to server.py."
        )
    return INDEX_FILE.read_bytes()


STATUS_CACHE = StatusCache(ttl_seconds=STATUS_CACHE_SECONDS)


class Handler(BaseHTTPRequestHandler):
    server_version = "TailscaleGraphHTTP/0.1"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(
            "%s - - [%s] %s\n"
            % (self.address_string(), self.log_date_time_string(), fmt % args)
        )

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]

        if path in ("/", "/index.html"):
            self.serve_index()
            return

        if path == "/status.json":
            self.serve_status()
            return

        if path == "/healthz":
            self.serve_json(200, {"ok": True, "time": int(time.time())})
            return

        self.send_error(404, "Not found")

    def serve_index(self) -> None:
        try:
            content = read_index_html()
        except FileNotFoundError as exc:
            self.send_error(500, str(exc))
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(content)

    def serve_status(self) -> None:
        status_code, payload = STATUS_CACHE.get()
        body = payload.encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def serve_json(self, status_code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def main() -> int:
    try:
        bind_host = guess_host()
    except Exception as exc:
        print(f"Error determining bind host: {exc}", file=sys.stderr)
        return 1

    try:
        _ = read_index_html()
    except Exception as exc:
        print(f"Error reading index.html: {exc}", file=sys.stderr)
        return 1

    try:
        httpd = ThreadingHTTPServer((bind_host, PORT), Handler)
    except OSError as exc:
        print(f"Error binding to {bind_host}:{PORT}: {exc}", file=sys.stderr)
        return 1

    print(f"Serving on http://{bind_host}:{PORT}")
    print("Endpoints:")
    print(f"  /           -> index.html")
    print(f"  /status.json -> live tailscale status")
    print("")
    print("Press Ctrl+C to stop.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        httpd.server_close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())


