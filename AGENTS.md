# Tailgraph Agent Guide

This repository is split into a small FastAPI backend and a Vite/React frontend.
Agents should understand that most user-facing behavior comes from the interaction between live Tailscale status data, backend-enriched metadata, and frontend graph rendering.

## Top-Level Structure

- `backend/`: FastAPI app, API routes, Tailscale integration, file-backed stores, and service discovery.
- `frontend/`: Vite app, React UI, graph building/filtering logic, and app styles.
- `tests/backend/`: unit tests for backend routes and services.
- `tests/frontend/`: unit tests for frontend graph helpers, API client code, and UI behavior.
- `docs/`: supporting project docs, including backend/frontend architecture notes.
- `scripts/`: local developer workflow scripts.
- `package.json`: frontend scripts and JS dependencies.
- `requirements.txt`: backend Python dependencies.
- `vite.config.ts`: frontend dev server config and proxying to the backend.

## Runtime Model

1. The backend serves JSON endpoints on port `8081` during local development.
2. The frontend dev server runs on port `8080` and proxies `/status.json`, `/config.json`, `/groups.json`, and `/healthz` to the backend.
3. `GET /status.json` is the main data feed. It starts with `tailscale status --json`, then enriches the payload with discovered services and saved device groups.
4. The frontend turns that payload into graph nodes/edges, applies saved positions for the active view, and renders the graph on a canvas.

## Key Files To Read First

- `backend/app.py`: backend composition root.
- `backend/api/routes.py`: all HTTP endpoints and payload merging.
- `backend/services/`: caches, stores, Tailscale shell integration, and service discovery.
- `frontend/src/App.tsx`: main state container and UI orchestration.
- `frontend/src/api/status.ts`: backend API client.
- `frontend/src/graph/`: graph construction, filtering, ordering, and viewport helpers.
- `frontend/src/components/CanvasGraph.tsx`: canvas rendering and pointer interaction.

## Backend Notes

Read [docs/backend-architecture.md](/root/tailgraph/docs/backend-architecture.md) before changing API behavior, persistence, or Tailscale integration.

Important constraints:

- The backend keeps almost all state in small services attached to `app.state`.
- Layouts and groups are persisted as JSON files, not a database.
- `status.json` should stay resilient: route failures are converted into a `500` JSON response instead of propagating framework errors.
- Service discovery is intentionally cached separately from the main Tailscale status fetch.

## Frontend Notes

Read [docs/frontend-architecture.md](/root/tailgraph/docs/frontend-architecture.md) before changing graph state flow or UI composition.

Important constraints:

- `App.tsx` owns most state; child components are mostly controlled/presentational.
- Graph positions and viewport are per-view and must stay aligned with backend `config.json` semantics.
- Group edits are local UI state until explicitly saved.
- The graph is rendered manually on a `<canvas>`, so visual changes often belong in `CanvasGraph.tsx`, not CSS.

## Development Commands

- Frontend dev: `npm run dev`
- Backend dev: `npm run dev:backend`
- Combined dev session: `scripts/dev-session.sh`
- Frontend tests: `npm test`
- Backend tests: `pytest tests/backend`

## Working Guidance For Agents

- Preserve the backend/frontend boundary. Avoid moving rendering concerns into the backend or shell/process concerns into the frontend.
- When changing API shapes, update both `backend/api/routes.py` and the matching TypeScript types/API client.
- When changing graph semantics, check both the pure graph helpers and the canvas interaction layer.
- Prefer adding or updating tests in the mirrored `tests/backend` or `tests/frontend` folder for any behavior change.
