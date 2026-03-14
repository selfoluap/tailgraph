import type { TailscaleStatus } from "../types/tailscale";

export async function fetchStatus(): Promise<TailscaleStatus> {
  const response = await fetch(`/status.json?ts=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`status request failed: ${response.status}`);
  }
  return response.json() as Promise<TailscaleStatus>;
}
