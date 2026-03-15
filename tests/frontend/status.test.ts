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
});
