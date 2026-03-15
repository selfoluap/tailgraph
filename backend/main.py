from __future__ import annotations

import sys

import uvicorn

from backend.app import create_app


def main() -> int:
    app = create_app()
    settings = app.state.settings

    try:
        bind_host = app.state.tailscale.guess_host()
    except Exception as exc:
        print(f"Error determining bind host: {exc}", file=sys.stderr)
        return 1

    print(f"Serving on http://{bind_host}:{settings.port}")
    print("Endpoints:")
    print("  /status.json -> live tailscale status")
    print("  /healthz     -> health check")
    print("")
    print("Press Ctrl+C to stop.")

    uvicorn.run(app, host=bind_host, port=settings.port, log_level="info")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
