import { describe, expect, it } from "vitest";

import { orderNodesByGroups } from "../../frontend/src/graph/orderNodes";
import type { GraphNode } from "../../frontend/src/types/graph";

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "peer",
    name: "peer",
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
    x: 10,
    y: 20,
    vx: 1,
    vy: -1,
    r: 12,
    ...overrides,
  };
}

describe("orderNodesByGroups", () => {
  it("keeps self centered and clusters peers by group signature", () => {
    const ordered = orderNodesByGroups([
      makeNode({ id: "self", role: "self", name: "alpha", r: 21, groups: [], x: 5, y: 5 }),
      makeNode({ id: "prod-a", name: "prod-a", groups: ["Production"] }),
      makeNode({ id: "prod-b", name: "prod-b", groups: ["Production"] }),
      makeNode({ id: "edge-a", name: "edge-a", groups: ["Edge"] }),
      makeNode({ id: "none-a", name: "none-a", groups: [] }),
    ]);

    const selfNode = ordered.find((node) => node.id === "self");
    const prodNodes = ordered.filter((node) => node.groups.join("|") === "Production");
    const edgeNode = ordered.find((node) => node.id === "edge-a");
    const ungroupedNode = ordered.find((node) => node.id === "none-a");

    expect(selfNode).toMatchObject({ x: 0, y: 0, vx: 0, vy: 0 });
    expect(prodNodes).toHaveLength(2);
    expect([prodNodes[0]?.x, prodNodes[0]?.y]).not.toEqual([prodNodes[1]?.x, prodNodes[1]?.y]);
    expect(edgeNode?.vx).toBe(0);
    expect(edgeNode?.vy).toBe(0);
    expect(ungroupedNode?.x).not.toBe(edgeNode?.x);
  });
});
