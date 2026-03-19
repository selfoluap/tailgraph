import { describe, expect, it } from "vitest";

import {
  MIN_NODE_DISTANCE,
  moveNodeToNearestGridCell,
  NODE_GRID_SIZE,
  snapNodePointToGrid,
  snapNodesToGrid,
} from "../../frontend/src/graph/grid";
import type { GraphNode } from "../../frontend/src/types/graph";

function makeNode(id: string, x: number, y: number): GraphNode {
  return {
    id,
    name: id,
    dns: "",
    hostname: "",
    ip: "",
    os: "",
    lastHandshake: "",
    lastSeen: "",
    lastWrite: "",
    groups: [],
    tags: [],
    routes: [],
    online: true,
    active: true,
    relay: "",
    exitNode: false,
    exitNodeOption: false,
    subnetRouter: false,
    services: [],
    servicesScannedAt: "",
    servicesStatus: "unknown",
    servicesError: "",
    role: "peer",
    x,
    y,
    vx: 0,
    vy: 0,
    r: 12,
  };
}

describe("grid helpers", () => {
  it("snaps arbitrary points to the node grid", () => {
    expect(snapNodePointToGrid(91, -89)).toEqual({ x: 3 * NODE_GRID_SIZE, y: -3 * NODE_GRID_SIZE });
    expect(snapNodePointToGrid(269, 271)).toEqual({ x: 8 * NODE_GRID_SIZE, y: 8 * NODE_GRID_SIZE });
  });

  it("assigns overlapping nodes to different grid cells", () => {
    const snapped = snapNodesToGrid([
      makeNode("a", 0, 0),
      makeNode("b", 10, 12),
      makeNode("c", 180, 0),
    ]);

    const positions = new Set(snapped.map((node) => `${node.x},${node.y}`));

    expect(positions.size).toBe(3);
  });

  it("keeps snapped nodes at least the minimum distance apart", () => {
    const snapped = snapNodesToGrid([
      makeNode("a", 0, 0),
      makeNode("b", NODE_GRID_SIZE, 0),
      makeNode("c", NODE_GRID_SIZE * 2, 0),
    ]);

    for (let index = 0; index < snapped.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < snapped.length; otherIndex += 1) {
        const a = snapped[index];
        const b = snapped[otherIndex];
        expect(Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0))).toBeGreaterThanOrEqual(
          MIN_NODE_DISTANCE,
        );
      }
    }
  });

  it("moves dragged nodes to the nearest free grid cell", () => {
    const moved = moveNodeToNearestGridCell(
      [
        makeNode("a", 0, 0),
        makeNode("b", NODE_GRID_SIZE, 0),
      ],
      "b",
      20,
      20,
    );

    const movedNode = moved.find((node) => node.id === "b");
    const anchorNode = moved.find((node) => node.id === "a");

    expect(movedNode).toBeDefined();
    expect(anchorNode).toBeDefined();
    expect(
      Math.hypot((movedNode?.x ?? 0) - (anchorNode?.x ?? 0), (movedNode?.y ?? 0) - (anchorNode?.y ?? 0)),
    ).toBeGreaterThanOrEqual(MIN_NODE_DISTANCE);
  });
});
