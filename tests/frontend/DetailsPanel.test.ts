import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DetailsPanel } from "../../frontend/src/components/DetailsPanel";
import type { GraphNode } from "../../frontend/src/types/graph";

function makeNode(overrides: Partial<GraphNode> = {}): GraphNode {
  return {
    id: "peer1",
    name: "beta",
    dns: "beta.tail.ts.net",
    hostname: "beta",
    ip: "100.64.0.2",
    os: "linux",
    lastHandshake: "2026-03-14T11:59:30Z",
    lastSeen: "2026-03-14T11:59:00Z",
    lastWrite: "2026-03-14T11:57:00Z",
    groups: ["Production"],
    tags: ["tag:prod"],
    routes: [],
    online: true,
    active: true,
    relay: "dfw",
    exitNode: false,
    exitNodeOption: false,
    subnetRouter: false,
    services: [{ label: "fastapi", port: 8000, protocol: "tcp" }],
    servicesScannedAt: "2026-03-14T11:58:00Z",
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

describe("DetailsPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00Z"));
  });

  it("renders relative time values for recent timestamps", () => {
    render(
      React.createElement(DetailsPanel, {
        node: makeNode(),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand details" }));
    expect(screen.getByText("1m ago")).toBeInTheDocument();
    expect(screen.getByText("just now")).toBeInTheDocument();
    expect(screen.getByText("3m ago")).toBeInTheDocument();
    expect(screen.getByText("2m ago")).toBeInTheDocument();
  });

  it("renders n/a for missing timestamps", () => {
    render(
      React.createElement(DetailsPanel, {
        node: makeNode({
          lastSeen: "",
          lastHandshake: "",
          lastWrite: "",
        }),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand details" }));
    expect(screen.getAllByText("n/a")).toHaveLength(3);
  });

  it("renders raw values for malformed timestamps", () => {
    render(
      React.createElement(DetailsPanel, {
        node: makeNode({
          lastSeen: "recent-ish",
          lastHandshake: "unknown",
          lastWrite: "never",
        }),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand details" }));
    expect(screen.getByText("recent-ish")).toBeInTheDocument();
    expect(screen.getByText("unknown")).toBeInTheDocument();
    expect(screen.getByText("never")).toBeInTheDocument();
  });

  it("treats year-1 timestamps as missing values", () => {
    render(
      React.createElement(DetailsPanel, {
        node: makeNode({
          lastSeen: "0001-01-01T00:17:30Z",
          lastHandshake: "0001-01-01T00:17:30Z",
          lastWrite: "0001-01-01T00:17:30Z",
        }),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand details" }));
    expect(screen.getAllByText("n/a")).toHaveLength(3);
  });

  it("renders discovered services and fallback empty state", () => {
    const { unmount } = render(
      React.createElement(DetailsPanel, {
        node: makeNode(),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    expect(screen.getByRole("link", { name: "fastapi 8000/tcp" })).toHaveAttribute(
      "href",
      "http://beta.tail.ts.net:8000",
    );

    unmount();

    render(
      React.createElement(DetailsPanel, {
        node: makeNode({
          services: [],
          servicesScannedAt: "",
          servicesStatus: "ready",
        }),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    expect(screen.getByText("no configured service ports reachable")).toBeInTheDocument();
  });

  it("uses https links for secure service ports", () => {
    render(
      React.createElement(DetailsPanel, {
        node: makeNode({
          services: [{ label: "https", port: 443, protocol: "tcp" }],
        }),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    expect(screen.getByRole("link", { name: "https 443/tcp" })).toHaveAttribute(
      "href",
      "https://beta.tail.ts.net:443",
    );
  });

  it("shows important fields before expansion", () => {
    render(
      React.createElement(DetailsPanel, {
        node: makeNode(),
        onClose: () => {},
        onAddGroup: () => {},
        onRemoveGroup: () => {},
      }),
    );

    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("IP")).toBeInTheDocument();
    expect(screen.getByText("Groups")).toBeInTheDocument();
    expect(screen.getByText("Tailscale Tags")).toBeInTheDocument();
    expect(screen.getByText("Services")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "fastapi 8000/tcp" })).toBeInTheDocument();
    expect(screen.queryByText("DNS")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand details" })).toBeInTheDocument();
  });
});
