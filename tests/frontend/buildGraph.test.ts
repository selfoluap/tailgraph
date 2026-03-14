import { describe, expect, it } from "vitest";

import { buildGraphFromStatus, statusText } from "../../frontend/src/graph/buildGraph";

describe("buildGraphFromStatus", () => {
  it("normalizes peers and tags", () => {
    const graph = buildGraphFromStatus({
      Self: {
        DNSName: "alpha.tail.ts.net.",
        TailscaleIPs: ["100.64.0.1"],
      },
      Peer: {
        peer1: {
          DNSName: "beta.tail.ts.net.",
          LastHandshake: "2026-03-13T23:50:00Z",
          LastSeen: "2026-03-13T23:30:00Z",
          LastWrite: "2026-03-13T23:55:00Z",
          TailscaleIPs: ["100.64.0.2"],
          Tags: ["tag:prod"],
          Online: true,
        },
      },
      _meta: {
        generatedAtISO: "2026-03-14T00:00:00Z",
      },
    });

    expect(graph.generatedAt).toBe("2026-03-14T00:00:00Z");
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toEqual([{ source: "self", target: "peer1" }]);
    expect(graph.allTags).toEqual(["tag:prod"]);
    expect(graph.nodes[1]?.lastHandshake).toBe("2026-03-13T23:50:00Z");
    expect(graph.nodes[1]?.lastSeen).toBe("2026-03-13T23:30:00Z");
    expect(graph.nodes[1]?.lastWrite).toBe("2026-03-13T23:55:00Z");
    expect(statusText(graph.nodes[1])).toBe("online");
  });
});
