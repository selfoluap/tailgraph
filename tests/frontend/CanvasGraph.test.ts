import { describe, expect, it } from "vitest";

import { getCanvasDensityScale } from "../../frontend/src/components/CanvasGraph";

describe("CanvasGraph", () => {
  it("reduces density for mobile widths", () => {
    expect(getCanvasDensityScale(390)).toBe(0.82);
    expect(getCanvasDensityScale(768)).toBe(0.9);
    expect(getCanvasDensityScale(1280)).toBe(1);
  });
});
