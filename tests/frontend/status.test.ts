import { afterEach, describe, expect, it, vi } from "vitest";

const originalApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

afterEach(() => {
  vi.restoreAllMocks();
  import.meta.env.VITE_API_BASE_URL = originalApiBaseUrl;
});

describe("fetchStatus", () => {
  it("calls the API on the configured base URL", async () => {
    import.meta.env.VITE_API_BASE_URL = "https://api.example.test/";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ Self: {}, Peer: {}, _meta: { generatedAtISO: "now" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchStatus } = await import("../../frontend/src/api/status");
    await fetchStatus();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\/api\.example\.test\/status\.json\?ts=\d+$/),
      { cache: "no-store" },
    );
  });

  it("loads and saves groups on the dedicated endpoint", async () => {
    import.meta.env.VITE_API_BASE_URL = "https://api.example.test/";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groups: { beta: ["Production"] }, updatedAt: 123 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, groups: { groups: { beta: ["Production"] }, updatedAt: 124 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchDeviceGroups, saveDeviceGroups } = await import("../../frontend/src/api/status");
    await fetchDeviceGroups();
    await saveDeviceGroups({ beta: ["Production"] });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "https://api.example.test/groups.json", {
      cache: "no-store",
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "https://api.example.test/groups.json", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ groups: { beta: ["Production"] } }),
    });
  });
});
