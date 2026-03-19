import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TailscaleStatus } from "../../frontend/src/types/tailscale";

const fetchStatusMock = vi.fn<() => Promise<TailscaleStatus>>();
const fetchGraphConfigMock = vi.fn();
const fetchDeviceGroupsMock = vi.fn();
const saveGraphConfigMock = vi.fn();
const saveDeviceGroupsMock = vi.fn();

vi.mock("../../frontend/src/api/status", () => ({
  fetchStatus: fetchStatusMock,
  fetchGraphConfig: fetchGraphConfigMock,
  fetchDeviceGroups: fetchDeviceGroupsMock,
  saveGraphConfig: saveGraphConfigMock,
  saveDeviceGroups: saveDeviceGroupsMock,
}));

vi.mock("../../frontend/src/components/CanvasGraph", () => ({
  CanvasGraph: ({ graph }: { graph: { nodes: Array<{ name: string }> } }) =>
    React.createElement(
      "div",
      { "data-testid": "graph" },
      graph.nodes.map((node) => node.name).join(", "),
    ),
}));

vi.mock("../../frontend/src/components/TopBar", () => ({
  TopBar: ({
    activeView,
    onSelectView,
  }: {
    activeView: string;
    onSelectView: (viewId: string) => void;
  }) =>
    React.createElement(
      "div",
      null,
      React.createElement("div", { "data-testid": "active-view" }, activeView),
      React.createElement(
        "button",
        { type: "button", onClick: () => onSelectView("view2") },
        "switch-view2",
      ),
      React.createElement(
        "button",
        { type: "button", onClick: () => onSelectView("view3") },
        "switch-view3",
      ),
    ),
}));

vi.mock("../../frontend/src/components/ControlSheet", () => ({
  ControlSheet: () => null,
}));

vi.mock("../../frontend/src/components/DetailsPanel", () => ({
  DetailsPanel: () => null,
}));

vi.mock("../../frontend/src/components/RightSidebar", () => ({
  RightSidebar: () => null,
}));

vi.mock("../../frontend/src/hooks/useAutoRefresh", () => ({
  useAutoRefresh: () => {},
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function makeStatus(name: string, generatedAtISO: string): TailscaleStatus {
  return {
    Self: {
      HostName: name,
      DNSName: `${name}.tail.ts.net.`,
      TailscaleIPs: ["100.64.0.1"],
      Online: true,
    },
    Peer: {},
    _meta: {
      generatedAtISO,
    },
  };
}

describe("App view switching", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.innerWidth = 1280;

    fetchGraphConfigMock.mockResolvedValue({
      activeView: "view1",
      views: {
        view1: { nodes: {}, viewport: null, showConnections: true, showGrid: false, updatedAt: null },
        view2: { nodes: {}, viewport: null, showConnections: true, showGrid: false, updatedAt: null },
        view3: { nodes: {}, viewport: null, showConnections: true, showGrid: false, updatedAt: null },
        view4: { nodes: {}, viewport: null, showConnections: true, showGrid: false, updatedAt: null },
        view5: { nodes: {}, viewport: null, showConnections: true, showGrid: false, updatedAt: null },
      },
    });
    fetchDeviceGroupsMock.mockResolvedValue({ groups: {}, updatedAt: null });
    saveGraphConfigMock.mockResolvedValue({ ok: true, config: { activeView: "view1", views: {} } });
    saveDeviceGroupsMock.mockResolvedValue({ ok: true, groups: { groups: {}, updatedAt: null } });
  });

  it("keeps the current graph visible while a new view is loading", async () => {
    const nextStatus = deferred<TailscaleStatus>();
    fetchStatusMock
      .mockResolvedValueOnce(makeStatus("alpha", "2026-03-18T10:00:00Z"))
      .mockReturnValueOnce(nextStatus.promise);

    const { default: App } = await import("../../frontend/src/App");
    render(React.createElement(App));

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("alpha"));

    fireEvent.click(screen.getByRole("button", { name: "switch-view2" }));

    expect(screen.getByTestId("active-view")).toHaveTextContent("view2");
    expect(screen.getByTestId("graph")).toHaveTextContent("alpha");

    nextStatus.resolve(makeStatus("beta", "2026-03-18T10:01:00Z"));

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("beta"));
  });

  it("ignores stale responses from an older view switch", async () => {
    const view2Status = deferred<TailscaleStatus>();
    const view3Status = deferred<TailscaleStatus>();
    fetchStatusMock
      .mockResolvedValueOnce(makeStatus("alpha", "2026-03-18T10:00:00Z"))
      .mockReturnValueOnce(view2Status.promise)
      .mockReturnValueOnce(view3Status.promise);

    const { default: App } = await import("../../frontend/src/App");
    render(React.createElement(App));

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("alpha"));

    fireEvent.click(screen.getByRole("button", { name: "switch-view2" }));
    fireEvent.click(screen.getByRole("button", { name: "switch-view3" }));

    expect(screen.getByTestId("active-view")).toHaveTextContent("view3");

    view3Status.resolve(makeStatus("gamma", "2026-03-18T10:03:00Z"));
    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("gamma"));

    view2Status.resolve(makeStatus("beta", "2026-03-18T10:02:00Z"));

    await waitFor(() => expect(screen.getByTestId("graph")).toHaveTextContent("gamma"));
    expect(screen.getByTestId("active-view")).toHaveTextContent("view3");
  });
});
