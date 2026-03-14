from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles


def register_frontend(app, dist_dir: Path) -> None:
    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    router = APIRouter()

    @router.get("/{full_path:path}")
    def frontend(full_path: str = ""):
        if dist_dir.exists():
            requested = dist_dir / full_path
            if full_path and requested.is_file():
                return FileResponse(requested)

            index_file = dist_dir / "index.html"
            if index_file.exists():
                return FileResponse(index_file)

        return HTMLResponse(
            """
            <html>
              <body style="font-family: sans-serif; padding: 24px;">
                <h1>Frontend build not found</h1>
                <p>Run <code>npm run build</code> to generate <code>frontend/dist</code>.</p>
              </body>
            </html>
            """.strip(),
            status_code=503,
        )

    app.include_router(router)
