import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TopBar } from "../../frontend/src/components/TopBar";

describe("TopBar", () => {
  it("shows mobile layout actions below the view tabs when toggled", () => {
    const onToggleMobileLayouts = vi.fn();
    const onOrderByGroups = vi.fn();
    const onOrderInGrid = vi.fn();

    render(
      React.createElement(TopBar, {
        generatedAt: "2026-03-18T10:00:00Z",
        autoRefresh: false,
        activeView: "view1",
        isDesktop: false,
        isSwitchingView: false,
        mobileLayoutsOpen: true,
        saveState: "idle",
        saveMessage: "",
        onOrderByGroups,
        onOrderInGrid,
        onSaveConfig: vi.fn(),
        onSelectView: vi.fn(),
        onToggleMobileLayouts,
        onToggleRefresh: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Layouts" }));
    fireEvent.click(screen.getByRole("button", { name: "Group by groups" }));
    fireEvent.click(screen.getByRole("button", { name: "Align to grid" }));

    expect(onToggleMobileLayouts).toHaveBeenCalledTimes(1);
    expect(onOrderByGroups).toHaveBeenCalledTimes(1);
    expect(onOrderInGrid).toHaveBeenCalledTimes(1);
  });
});
