import { describe, expect, it } from "vitest";
import { assembleComposition } from "./assemble";
import type { ScanSuccess } from "./figma-export";

function scan(): ScanSuccess {
  return {
    ok: true,
    compositionName: "Asymmetric Grid",
    warnings: [],
    layouts: [
      {
        name: "Mobile",
        width: 375,
        height: 812,
        items: [
          { name: "image-a", x: 0, y: 0, width: 375, height: 240, zIndex: 0 },
          { name: "image-b", x: 24, y: 260, width: 327, height: 400, zIndex: 1 },
        ],
      },
      {
        name: "Desktop",
        width: 1440,
        height: 900,
        items: [
          { name: "image-b", x: 80, y: 80, width: 480, height: 600, zIndex: 0 },
          { name: "image-a", x: 600, y: 0, width: 840, height: 900, zIndex: 1 },
        ],
      },
    ],
  };
}

describe("assembleComposition", () => {
  it("builds a valid composition from a scan and min-widths", () => {
    const result = assembleComposition(scan(), { Mobile: 0, Desktop: 1024 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.composition.layouts.map((l) => l.minWidth)).toEqual([0, 1024]);
      expect(result.composition.layouts[0].items[0].zIndex).toBe(0);
    }
  });

  it("reports which layout is missing a min-width, without calling into core", () => {
    const result = assembleComposition(scan(), { Mobile: 0 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(['No min-width entered for layout "Desktop".']);
    }
  });

  it("surfaces core validation errors (e.g. no base layout at minWidth 0)", () => {
    const result = assembleComposition(scan(), { Mobile: 320, Desktop: 1024 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("minWidth 0"))).toBe(true);
    }
  });

  it("surfaces a core validation warning for mismatched item sets across layouts, without rejecting", () => {
    const withMismatch = scan();
    withMismatch.layouts[1].items = withMismatch.layouts[1].items.filter(
      (item) => item.name !== "image-b",
    );
    const result = assembleComposition(withMismatch, { Mobile: 0, Desktop: 1024 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warnings.some((w) => w.includes("item ids differ"))).toBe(true);
    }
  });
});
