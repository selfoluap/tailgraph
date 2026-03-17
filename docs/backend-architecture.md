# Backend Architecture

The backend is a small FastAPI application that composes a few focused services and exposes JSON endpoints consumed by the frontend.

## Entry Points

- `backend/app.py`: primary composition root. Creates settings, caches, stores, integration services, and the API router.
- `backend/main.py`: CLI-style launcher that determines the bind host and starts Uvicorn.
- `package.json` script `dev:backend`: starts the app with `uvicorn backend.app:create_app --factory --reload`.

`create_app()` is the place to wire in new backend dependencies. It attaches initialized services to `app.state` and passes them into `build_api_router(...)`.

## HTTP Surface

All routes are defined in `backend/api/routes.py`.

- `GET /status.json`
  - Reads cached Tailscale status from `StatusCache`.
  - Runs service discovery through `BackgroundRefreshCache`.
  - Merges persisted device groups into the payload.
  - Returns a JSON error payload with status `500` if any exception escapes.
- `GET /healthz`
  - Lightweight liveness endpoint.
- `GET /config.json`
  - Returns persisted graph layout state.
- `PUT /config.json`
  - Persists node positions and viewport for a specific saved view.
- `GET /groups.json`
  - Returns persisted hostname-to-group mappings.
- `PUT /groups.json`
  - Persists hostname-to-group mappings.

The backend does not currently expose multiple routers, auth middleware, or a database-backed model layer.

## Service Layer

Services live in `backend/services/` and are intentionally small.

### `tailscale.py`

- `TailscaleService` shells out to the local `tailscale` CLI.
- `fetch_status()` runs `tailscale status --json`, parses the result, and adds `_meta` fields such as generation time and server hostname.
- `guess_host()` prefers `TS_GRAPH_HOST` and otherwise falls back to the local Tailscale IPv4 address.

This file is the integration boundary for anything that depends on the local Tailscale installation.

### `cache.py`

- `StatusCache`: synchronous TTL cache for the main status payload.
- `BackgroundRefreshCache`: stale-while-revalidate style cache used for service discovery.

The caches exist to reduce repeated CLI calls and network scans without adding external infrastructure.

### `service_discovery.py`

- `ServiceScanner` inspects configured TCP ports on the self node and peer nodes.
- It derives candidate IPs from Tailscale peer data and returns a normalized metadata payload.
- Discovery is feature-flagged and configurable through environment variables in `backend/config.py`.

The scan is additive enrichment. It does not replace or reshape the base Tailscale status model.

### `layout_store.py`

- File-backed persistence for graph layout data.
- Supports up to five saved views: `view1` through `view5`.
- Normalizes node positions, viewport data, and `activeView`.
- Preserves backward compatibility by coercing legacy single-layout payloads into the multi-view structure.

This is the source of truth for persisted node positions and viewport state.

### `group_store.py`

- File-backed persistence for hostname-to-group mappings.
- Normalizes hostnames and group names, removes empty values, and de-duplicates groups case-insensitively.

This is the source of truth for user-assigned groups shown in the UI.

## Configuration

Environment parsing lives in `backend/config.py`.

Key settings:

- `TS_GRAPH_HOST`
- `TS_GRAPH_PORT`
- `TS_GRAPH_CACHE_SECONDS`
- `TS_GRAPH_CONFIG_PATH`
- `TS_GRAPH_GROUPS_PATH`
- `TS_GRAPH_SERVICE_DISCOVERY_ENABLED`
- `TS_GRAPH_SERVICE_DISCOVERY_TTL_SECONDS`
- `TS_GRAPH_SERVICE_DISCOVERY_TIMEOUT_MS`
- `TS_GRAPH_SERVICE_DISCOVERY_PORTS`

The backend defaults to local JSON files:

- `.tailgraph-config.json`
- `.tailgraph-groups.json`

## Data Flow

1. Frontend requests `GET /status.json`.
2. Backend fetches or reuses cached Tailscale status.
3. Backend augments the payload with service discovery results.
4. Backend augments the payload with saved groups by hostname.
5. Frontend receives a single enriched payload and builds graph state from it.

Persistence endpoints are separate:

1. Frontend `PUT /config.json` saves node positions and viewport for the active view.
2. Frontend `PUT /groups.json` saves user-edited groups.

## Testing Layout

Backend tests live in `tests/backend/`.

- `test_app.py`: route-level behavior.
- `test_cache.py`: cache semantics.
- `test_group_store.py`: group normalization/persistence.
- `test_layout_store.py`: layout normalization and saved views.
- `test_service_discovery.py`: service scanning logic.

When changing backend behavior, update the corresponding service test first unless the change is purely documentation.

## Safe Change Boundaries

Safe places to extend:

- Add route payload fields in `backend/api/routes.py` when the frontend explicitly consumes them.
- Add normalization/persistence rules inside the store classes.
- Add discovery ports or metadata in `service_discovery.py`.

Areas to treat carefully:

- `status.json` payload shape, because the frontend graph builder depends on it.
- View persistence semantics in `layout_store.py`, because the frontend assumes five named views.
- Shell command behavior in `tailscale.py`, because failures surface directly to the API.
