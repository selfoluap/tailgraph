# Frontend Architecture

The frontend is a Vite + React application that fetches enriched backend JSON, transforms it into graph data, and renders the topology on a canvas.

## Entry Points

- `frontend/index.html`: Vite HTML entry.
- `frontend/src/main.tsx`: React bootstrap.
- `frontend/src/App.tsx`: main application state container and coordinator.
- `vite.config.ts`: sets `frontend/` as the Vite root and proxies backend JSON endpoints to `http://127.0.0.1:8081`.

Most application behavior is orchestrated from `App.tsx`. Start there before changing UI behavior.

## State Ownership

`frontend/src/App.tsx` owns the main state:

- fetched graph data
- selected node
- filters
- viewport
- active saved view
- in-memory view configs
- in-memory device groups
- auto-refresh state
- save status and messages
- mobile sheet visibility
- backend error state

The current pattern is a single stateful container with mostly controlled child components. There is no global store library.

## Data Flow

1. On bootstrap, `App.tsx` fetches `/config.json` and `/groups.json`.
2. It normalizes saved views and group mappings into local refs/state.
3. It then fetches `/status.json`.
4. `buildGraphFromStatus()` converts the backend payload into `GraphData`.
5. Saved node positions and viewport for the active view are applied.
6. `CanvasGraph` renders the current graph and reports interactions back up through callbacks.

Saving is explicit:

1. `snapshotActiveView()` captures the current node positions and viewport.
2. `saveGraphConfig()` writes the active view to `/config.json`.
3. `saveDeviceGroups()` writes current group edits to `/groups.json`.

## API Client Layer

`frontend/src/api/status.ts` is the only backend client module.

It provides:

- `fetchStatus()`
- `fetchGraphConfig()`
- `saveGraphConfig()`
- `fetchDeviceGroups()`
- `saveDeviceGroups()`

If backend payloads change, update this file and the matching types first.

## Graph Transformation Layer

Pure graph logic lives in `frontend/src/graph/`.

### `buildGraph.ts`

- Converts Tailscale status payloads into frontend `GraphNode` and `GraphEdge` structures.
- Applies a default radial layout for peers.
- Derives group/tag indexes used by filters.
- Maps service discovery metadata onto each node.

This is the translation boundary between backend payloads and UI-friendly graph data.

### `filterNodes.ts`

- Filters nodes and edges by search, status, groups, tags, and special-role flags.

### `orderNodes.ts`

- Reorders node positions for group-based layouts initiated from the sidebar.

### `viewport.ts`

- Handles coordinate conversions and zoom clamping between world space and screen space.

### `simulation.ts`

- Contains force-layout stepping logic that can support future or alternate graph layout behavior. Check it before introducing new layout logic so behavior stays centralized.

## Component Structure

### `CanvasGraph.tsx`

- Renders nodes and edges directly to a `<canvas>`.
- Handles pan, zoom, node drag, click selection, and pinch gestures.
- Reads filtered graph data and current viewport from props.

Visual graph changes usually belong here.

### `TopBar.tsx`

- Saved view tabs
- save action
- auto-refresh toggle
- generated timestamp and save status display

### `ControlSheet.tsx`

- Search and filter controls
- peer quick-select list
- responsive mobile bottom-sheet behavior

### `DetailsPanel.tsx`

- Selected node details
- group editing UI
- service links and timestamps

This component edits groups locally through callbacks. Persistence still happens in `App.tsx`.

### `RightSidebar.tsx`

- Secondary layout action entry point.

## Types

- `frontend/src/types/tailscale.ts`: raw backend payload types.
- `frontend/src/types/graph.ts`: normalized UI graph types.

Keep the distinction clear:

- Tailscale types mirror API payloads.
- Graph types represent frontend-ready state after transformation.

## Styling

- `frontend/src/styles/app.css` contains application styles.
- Canvas-rendered graph primitives are not styleable through CSS; update `CanvasGraph.tsx` for node/edge drawing behavior.

## Testing Layout

Frontend tests live in `tests/frontend/`.

- `status.test.ts`: API client behavior.
- `buildGraph.test.ts`: graph-building logic.
- `filterNodes.test.ts`: filtering behavior.
- `orderNodes.test.ts`: layout ordering behavior.
- `DetailsPanel.test.ts`: selected-node details UI behavior.

For frontend changes, add tests in the same layer you changed:

- API contract change: `status.test.ts`
- graph semantics change: `buildGraph.test.ts` or `filterNodes.test.ts`
- component behavior change: the matching component test

## Safe Change Boundaries

Safe places to extend:

- Add UI-only derived fields in `buildGraph.ts`.
- Add new filters in `filterNodes.ts` and wire them through `App.tsx` and `ControlSheet.tsx`.
- Add new node detail sections in `DetailsPanel.tsx`.

Areas to treat carefully:

- `App.tsx`, because it coordinates most state and persistence behavior.
- Saved-view handling, because it must stay consistent with backend `view1`-`view5` persistence.
- Canvas interaction math, because small changes can affect panning, dragging, selection, and touch zoom simultaneously.
