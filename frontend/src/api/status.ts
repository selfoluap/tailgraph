import type { NodePositionMap } from "../types/graph";
import type { TailscaleStatus } from "../types/tailscale";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

export async function fetchStatus(): Promise<TailscaleStatus> {
  const response = await fetch(`${apiBaseUrl}/status.json?ts=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`status request failed: ${response.status}`);
  }
  return response.json() as Promise<TailscaleStatus>;
}

export async function fetchGraphConfig(): Promise<{
  nodes: NodePositionMap;
  viewport: { x: number; y: number; scale: number } | null;
  updatedAt: number | null;
}> {
  const response = await fetch(`${apiBaseUrl}/config.json`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`config request failed: ${response.status}`);
  }
  return response.json() as Promise<{
    nodes: NodePositionMap;
    viewport: { x: number; y: number; scale: number } | null;
    updatedAt: number | null;
  }>;
}

export async function saveGraphConfig(
  nodes: NodePositionMap,
  viewport: { x: number; y: number; scale: number },
): Promise<{ ok: boolean }> {
  const response = await fetch(`${apiBaseUrl}/config.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ nodes, viewport }),
  });
  if (!response.ok) {
    throw new Error(`config save failed: ${response.status}`);
  }
  return response.json() as Promise<{ ok: boolean }>;
}
