import { describe, expect, it } from "vitest";

import { buildServiceUrl, inferServiceScheme } from "../../frontend/src/graph/serviceLinks";
import type { GraphNode } from "../../frontend/src/types/graph";

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "peer1",
    name: "beta",
    dns: "beta.tail.ts.net",
    hostname: "beta",
    ip: "100.64.0.2",
    os: "linux",
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
    servicesStatus: "ready",
    servicesError: "",
    role: "peer",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 12,
    ...overrides,
  };
}

describe("serviceLinks", () => {
  it("builds http links for generic tcp services", () => {
    const url = buildServiceUrl(makeNode(), {
      label: "fastapi",
      port: 8000,
      protocol: "tcp",
    });

    expect(url).toBe("http://beta.tail.ts.net:8000");
  });

  it("prefers https for secure ports and labels", () => {
    expect(inferServiceScheme(443, "tcp", "admin")).toBe("https");
    expect(inferServiceScheme(8443, "tcp", "dashboard")).toBe("https");
    expect(inferServiceScheme(3000, "tcp", "https-proxy")).toBe("https");
  });
});
