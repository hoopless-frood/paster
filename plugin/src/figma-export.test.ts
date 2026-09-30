import { beforeEach, describe, expect, it } from "vitest";
import { exportItemImage, figmaRotationToCss, formatForNode, type SupportedItemNode } from "./figma-export";

describe("figmaRotationToCss", () => {
  it("flips the sign — Figma's rotation is counterclockwise-positive, the schema/CSS is clockwise-positive", () => {
    expect(figmaRotationToCss(45)).toBe(-45);
    expect(figmaRotationToCss(-90)).toBe(90);
  });

  it("treats anything within the epsilon as exactly unrotated", () => {
    expect(figmaRotationToCss(0)).toBe(0);
    expect(figmaRotationToCss(0.005)).toBe(0);
    expect(figmaRotationToCss(-0.005)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(figmaRotationToCss(33.333)).toBe(-33.33);
    expect(figmaRotationToCss(-10.126)).toBe(10.13);
  });
});

describe("exportItemImage", () => {
  interface FakeCopy {
    rotation: number;
    parent: string;
    removed: boolean;
    exportedWith?: { rotation: number; parent: string; settings: unknown };
  }

  function setup(options: { failExport?: boolean } = {}) {
    const copies: FakeCopy[] = [];
    (globalThis as unknown as { figma: unknown }).figma = {
      currentPage: {
        appendChild: (copy: FakeCopy) => {
          copy.parent = "page";
        },
      },
    };
    const original = {
      rotation: 30,
      exportAsync: async () => {
        throw new Error("the original node must never be exported directly");
      },
      clone: () => {
        const copy: FakeCopy & { exportAsync: (settings: unknown) => Promise<Uint8Array>; remove: () => void } = {
          rotation: 30,
          parent: "layout",
          removed: false,
          exportAsync: async (settings) => {
            if (options.failExport) throw new Error("export failed");
            copy.exportedWith = { rotation: copy.rotation, parent: copy.parent, settings };
            return new Uint8Array([7]);
          },
          remove: () => {
            copy.removed = true;
          },
        };
        copies.push(copy);
        return copy;
      },
    };
    return { node: original as unknown as SupportedItemNode, original, copies };
  }

  it("exports an unrotated copy, outside the layout, at its full bounds", async () => {
    const { node, original, copies } = setup();

    expect(await exportItemImage(node, "PNG")).toEqual(new Uint8Array([7]));

    expect(copies).toHaveLength(1);
    expect(copies[0].exportedWith).toEqual({
      rotation: 0,
      parent: "page",
      settings: { format: "PNG", useAbsoluteBounds: true, constraint: { type: "SCALE", value: 1 } },
    });
    expect(copies[0].removed).toBe(true);
    expect(original.rotation).toBe(30);
  });

  it("uses full bounds for SVG too", async () => {
    const { node, copies } = setup();
    await exportItemImage(node, "SVG");
    expect(copies[0].exportedWith?.settings).toEqual({ format: "SVG", useAbsoluteBounds: true });
  });

  it("removes the temporary copy even when the export fails", async () => {
    const { node, copies } = setup({ failExport: true });
    await expect(exportItemImage(node, "PNG")).rejects.toThrow("export failed");
    expect(copies[0].removed).toBe(true);
  });
});

describe("formatForNode", () => {
  const solid = [{ type: "SOLID", visible: true }];
  const photo = [{ type: "IMAGE", visible: true }];

  function frame(children: { type: string; visible?: boolean; fills?: unknown[] }[]): SupportedItemNode {
    const descendants = children.map((child) => ({ visible: true, ...child }));
    return {
      type: "FRAME",
      fills: solid,
      findOne: (predicate: (node: unknown) => boolean) => descendants.find(predicate) ?? null,
    } as unknown as SupportedItemNode;
  }

  beforeEach(() => {
    (globalThis as unknown as { figma: unknown }).figma = { mixed: Symbol("figma-mixed") };
  });

  it("rasterizes a plain frame that contains a photo", () => {
    expect(formatForNode(frame([{ type: "RECTANGLE", fills: photo }]))).toBe("PNG");
  });

  it("rasterizes a plain frame that contains text", () => {
    expect(formatForNode(frame([{ type: "TEXT" }]))).toBe("PNG");
  });

  it("keeps a frame of only vector content as SVG", () => {
    expect(formatForNode(frame([{ type: "VECTOR", fills: solid }, { type: "ELLIPSE", fills: solid }]))).toBe("SVG");
  });

  it("ignores hidden content inside a frame", () => {
    expect(formatForNode(frame([{ type: "RECTANGLE", fills: photo, visible: false }]))).toBe("SVG");
  });
});
