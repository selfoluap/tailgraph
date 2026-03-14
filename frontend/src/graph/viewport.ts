import type { ViewportState } from "../types/graph";

export function worldToScreen(
  x: number,
  y: number,
  viewport: ViewportState,
  width: number,
  height: number,
) {
  return {
    x: width / 2 + (x + viewport.x) * viewport.scale,
    y: height / 2 + (y + viewport.y) * viewport.scale,
  };
}

export function screenToWorld(
  x: number,
  y: number,
  viewport: ViewportState,
  width: number,
  height: number,
) {
  return {
    x: (x - width / 2) / viewport.scale - viewport.x,
    y: (y - height / 2) / viewport.scale - viewport.y,
  };
}

export function clampScale(scale: number): number {
  return Math.max(0.35, Math.min(2.5, scale));
}
