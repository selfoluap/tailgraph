import { describe, expect, it } from "vitest";

import { filterNodes } from "../../frontend/src/graph/filterNodes";
import type { GraphNode } from "../../frontend/src/types/graph";

const baseNode: GraphNode = {
  id: "peer1",
  name: "beta",
  dns: "beta.tail.ts.net",
  hostname: "beta",
  ip: "100.64.0.2",
  os: "linux",
  tags: ["tag:prod"],
  routes: [],
  online: true,
  active: true,
  relay: "dfw",
  exitNode: false,
  exitNodeOption: false,
  subnetRouter: false,
  role: "peer",
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  r: 12,
};

describe("filterNodes", () => {
  it("filters by search, status, tag, and special role", () => {
    const nodes = [
      baseNode,
      { ...baseNode, id: "peer2", name: "gamma", tags: ["tag:dev"], online: false, subnetRouter: true },
    ];

    expect(
      filterNodes(nodes, {
        query: "gam",
        status: "offline",
        tag: "tag:dev",
        special: "router",
      }),
    ).toHaveLength(1);
  });
});
