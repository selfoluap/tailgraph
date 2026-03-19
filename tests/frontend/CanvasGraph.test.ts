import { describe, expect, it } from "vitest";

import {
  getCanvasDensityScale,
  getNodeRenderMode,
  getNodeZoomScale,
  getTextZoomScale,
} from "../../frontend/src/components/CanvasGraph";

describe("CanvasGraph", () => {
  it("reduces density for mobile widths", () => {
    expect(getCanvasDensityScale(390)).toBe(0.82);
    expect(getCanvasDensityScale(768)).toBe(0.9);
    expect(getCanvasDensityScale(1280)).toBe(1);
  });

  it("switches to compact nodes when zoomed out", () => {
    expect(getNodeRenderMode(0.69, 1280)).toBe("compact");
    expect(getNodeRenderMode(0.7, 1280)).toBe("card");
    expect(getNodeRenderMode(1, 1280)).toBe("card");
  });

  it("keeps phones in compact mode regardless of zoom", () => {
    expect(getNodeRenderMode(0.69, 390)).toBe("compact");
    expect(getNodeRenderMode(0.7, 390)).toBe("compact");
    expect(getNodeRenderMode(1.2, 390)).toBe("compact");
  });

  it("scales node size with zoom within safe bounds", () => {
    expect(getNodeZoomScale(0.35)).toBe(0.75);
    expect(getNodeZoomScale(1)).toBe(1);
    expect(getNodeZoomScale(2.5)).toBe(1.8);
  });

  it("lets text keep shrinking further when zooming out", () => {
    expect(getTextZoomScale(0.35)).toBe(0.45);
    expect(getTextZoomScale(0.6)).toBe(0.6);
    expect(getTextZoomScale(2.5)).toBe(1.4);
  });
});
