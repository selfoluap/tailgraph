import type { NodePositionMap } from "../types/graph";
import type { TailscaleStatus } from "../types/tailscale";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim().replace(/\/$/, "");

export interface LayoutConfig {
  nodes: NodePositionMap;
  viewport: { x: number; y: number; scale: number } | null;
  showConnections: boolean;
  showGrid: boolean;
  updatedAt: number | null;
}

export interface LayoutConfigResponse extends LayoutConfig {
  activeView: string;
  views: Record<string, LayoutConfig>;
}

export async function fetchStatus(): Promise<TailscaleStatus> {
  const response = await fetch(`${apiBaseUrl}/status.json`);
  if (!response.ok) {
    throw new Error(`status request failed: ${response.status}`);
  }
  return response.json() as Promise<TailscaleStatus>;
}

export async function fetchGraphConfig(): Promise<LayoutConfigResponse> {
  const response = await fetch(`${apiBaseUrl}/config.json`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`config request failed: ${response.status}`);
  }
  return response.json() as Promise<LayoutConfigResponse>;
}

export async function saveGraphConfig(
  nodes: NodePositionMap,
  viewport: { x: number; y: number; scale: number },
  viewId: string,
  showConnections: boolean,
  showGrid: boolean,
): Promise<{ ok: boolean; config: LayoutConfigResponse }> {
  const response = await fetch(`${apiBaseUrl}/config.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ viewId, nodes, viewport, showConnections, showGrid }),
  });
  if (!response.ok) {
    throw new Error(`config save failed: ${response.status}`);
  }
  return response.json() as Promise<{ ok: boolean; config: LayoutConfigResponse }>;
}

export async function fetchDeviceGroups(): Promise<{
  groups: Record<string, string[]>;
  updatedAt: number | null;
}> {
  const response = await fetch(`${apiBaseUrl}/groups.json`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`groups request failed: ${response.status}`);
  }
  return response.json() as Promise<{
    groups: Record<string, string[]>;
    updatedAt: number | null;
  }>;
}

export async function saveDeviceGroups(
  groups: Record<string, string[]>,
): Promise<{ ok: boolean; groups: { groups: Record<string, string[]>; updatedAt: number | null } }> {
  const response = await fetch(`${apiBaseUrl}/groups.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ groups }),
  });
  if (!response.ok) {
    throw new Error(`groups save failed: ${response.status}`);
  }
  return response.json() as Promise<{
    ok: boolean;
    groups: { groups: Record<string, string[]>; updatedAt: number | null };
  }>;
}
