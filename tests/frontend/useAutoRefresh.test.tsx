import "@testing-library/jest-dom/vitest";
import React from "react";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAutoRefresh } from "../../frontend/src/hooks/useAutoRefresh";

function AutoRefreshHarness({
  enabled,
  refresh,
  intervalMs,
}: {
  enabled: boolean;
  refresh: () => Promise<void>;
  intervalMs?: number;
}) {
  useAutoRefresh(enabled, refresh, intervalMs);
  return null;
}

describe("useAutoRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("waits for the interval before the first refresh", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);

    render(React.createElement(AutoRefreshHarness, { enabled: true, refresh }));

    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299999);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not schedule refreshes while disabled", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);

    render(React.createElement(AutoRefreshHarness, { enabled: false, refresh }));

    vi.advanceTimersByTime(600000);
    expect(refresh).not.toHaveBeenCalled();
  });
});
