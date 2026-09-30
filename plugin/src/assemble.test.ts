import { beforeEach, describe, expect, it } from "vitest";
import { assembleComposition, attachImages } from "./assemble";
import type { ScannedItem, ScanSuccess, SupportedItemNode } from "./figma-export";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

/**
 * formatForNode reads figma.mixed and figma.getImageByHash directly (there's
 * no dependency injection for it), so this stubs just enough of the global
 * for tests to control what each image-fill hash "contains" without needing
 * a real Figma environment.
 */
function stubFigma(imagesByHash: Record<string, Uint8Array> = {}) {
  (globalThis as unknown as { figma: unknown }).figma = {
    mixed: Symbol("figma-mixed"),
    getImageByHash: (hash: string) => {
      const bytes = imagesByHash[hash];
      if (!bytes) return null;
      return { getBytesAsync: async () => bytes };
    },
  };
}

beforeEach(() => {
  stubFigma({ "jpeg-hash": JPEG_BYTES, "png-hash": PNG_BYTES });
});

/**
 * Defaults to a JPEG-sourced photo fill (confirmed opaque) so existing tests
 * that only care about the (layout, item) -> asset wiring, not format
 * detection itself, see the raster format they pass through unchanged.
 */
function fakeNode(
  width: number,
  height: number,
  bytes: Uint8Array = new Uint8Array([1, 2, 3]),
  overrides: { type?: string; fills?: unknown[] } = {},
): SupportedItemNode {
  return {
    width,
    height,
    type: overrides.type ?? "RECTANGLE",
    fills: overrides.fills ?? [{ type: "IMAGE", visible: true, imageHash: "jpeg-hash" }],
    exportAsync: async () => bytes,
  } as unknown as SupportedItemNode;
}

function fakeItem(overrides: Partial<ScannedItem> & Pick<ScannedItem, "name" | "width" | "height">): ScannedItem {
  return { x: 0, y: 0, zIndex: 0, rotation: 0, node: fakeNode(overrides.width, overrides.height), ...overrides };
}

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
        clipsContent: true,
        items: [
          fakeItem({ name: "image-a", x: 0, y: 0, width: 375, height: 240, zIndex: 0 }),
          fakeItem({ name: "image-b", x: 24, y: 260, width: 327, height: 400, zIndex: 1 }),
        ],
      },
      {
        name: "Desktop",
        width: 1440,
        height: 900,
        clipsContent: true,
        items: [
          fakeItem({ name: "image-b", x: 80, y: 80, width: 480, height: 600, zIndex: 0 }),
          fakeItem({ name: "image-a", x: 600, y: 0, width: 840, height: 900, zIndex: 1 }),
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

  it("propagates a layout's backgroundColor into the assembled composition", () => {
    const withBackground = scan();
    withBackground.layouts[0].backgroundColor = "#f5f1ea";
    const result = assembleComposition(withBackground, { Mobile: 0, Desktop: 1024 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.composition.layouts[0].backgroundColor).toBe("#f5f1ea");
      expect(result.composition.layouts[1].backgroundColor).toBeUndefined();
    }
  });

  it("omits clipsContent when true (Figma's own default), but propagates it when false", () => {
    const withNonClipping = scan();
    withNonClipping.layouts[0].clipsContent = false;
    const result = assembleComposition(withNonClipping, { Mobile: 0, Desktop: 1024 });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.composition.layouts[0].clipsContent).toBe(false);
      expect(result.composition.layouts[1].clipsContent).toBeUndefined();
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

describe("attachImages", () => {
  function assembled(scanResult: ScanSuccess, minWidths: Record<string, number>) {
    const result = assembleComposition(scanResult, minWidths);
    if (!result.valid) {
      throw new Error(`fixture composition failed to validate: ${result.errors.join(", ")}`);
    }
    return result.composition;
  }

  it("exports one asset per (layout, item), wires assetId, and returns matching image bytes", async () => {
    const scanResult = scan();
    const composition = assembled(scanResult, { Mobile: 0, Desktop: 1024 });

    const outcome = await attachImages(composition, scanResult, "PNG");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // 2 layouts x 2 items each = 4 distinct assets, one per (layout, item).
    expect(outcome.composition.assets).toHaveLength(4);
    expect(outcome.images).toHaveLength(4);

    const mobileImageA = outcome.composition.layouts[0].items.find((item) => item.id === "image-a");
    expect(mobileImageA?.assetId).toBe("mobile-image-a");

    const asset = outcome.composition.assets.find((a) => a.id === "mobile-image-a");
    expect(asset).toMatchObject({ path: "images/mobile-image-a.png", width: 375, height: 240 });

    const image = outcome.images.find((img) => img.path === "images/mobile-image-a.png");
    expect(image?.bytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("uses the requested raster format's extension for a confirmed-opaque photo", async () => {
    const scanResult = scan();
    const composition = assembled(scanResult, { Mobile: 0, Desktop: 1024 });

    const outcome = await attachImages(composition, scanResult, "JPG");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // The default fake node is a JPEG-sourced image fill — confirmed opaque,
    // so it's safe to honor the requested raster format.
    expect(outcome.images.every((img) => img.path.endsWith(".jpg"))).toBe(true);
  });

  it("exports a vector shape as SVG regardless of the raster preference", async () => {
    const scanResult: ScanSuccess = {
      ok: true,
      compositionName: "Mixed Formats",
      warnings: [],
      layouts: [
        {
          name: "Mobile",
          width: 375,
          height: 812,
          clipsContent: true,
          items: [
            fakeItem({
              name: "icon",
              width: 24,
              height: 24,
              node: { type: "VECTOR", width: 24, height: 24, exportAsync: async () => new Uint8Array([1]) } as unknown as ScannedItem["node"],
            }),
          ],
        },
      ],
    };
    const composition = assembled(scanResult, { Mobile: 0 });

    const outcome = await attachImages(composition, scanResult, "JPG");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.images[0].path).toMatch(/\.svg$/);
  });

  it("exports a solid-filled shape with no image fill as SVG", async () => {
    const scanResult: ScanSuccess = {
      ok: true,
      compositionName: "Mixed Formats",
      warnings: [],
      layouts: [
        {
          name: "Mobile",
          width: 375,
          height: 812,
          clipsContent: true,
          items: [
            fakeItem({
              name: "swatch",
              width: 100,
              height: 100,
              node: fakeNode(100, 100, new Uint8Array([1]), {
                type: "RECTANGLE",
                fills: [{ type: "SOLID", visible: true, color: { r: 1, g: 0, b: 0 } }],
              }),
            }),
          ],
        },
      ],
    };
    const composition = assembled(scanResult, { Mobile: 0 });

    const outcome = await attachImages(composition, scanResult, "JPG");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.images[0].path).toMatch(/\.svg$/);
  });

  it("always uses PNG for a PNG-sourced image fill, even when JPG is requested", async () => {
    const scanResult: ScanSuccess = {
      ok: true,
      compositionName: "Mixed Formats",
      warnings: [],
      layouts: [
        {
          name: "Mobile",
          width: 375,
          height: 812,
          clipsContent: true,
          items: [
            fakeItem({
              name: "sticker",
              width: 100,
              height: 100,
              node: fakeNode(100, 100, new Uint8Array([1]), {
                type: "RECTANGLE",
                fills: [{ type: "IMAGE", visible: true, imageHash: "png-hash" }],
              }),
            }),
          ],
        },
      ],
    };
    const composition = assembled(scanResult, { Mobile: 0 });

    const outcome = await attachImages(composition, scanResult, "JPG");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.images[0].path).toMatch(/\.png$/);
  });

  it("always uses PNG for text, even when JPG is requested", async () => {
    const scanResult: ScanSuccess = {
      ok: true,
      compositionName: "Mixed Formats",
      warnings: [],
      layouts: [
        {
          name: "Mobile",
          width: 375,
          height: 812,
          clipsContent: true,
          items: [
            fakeItem({
              name: "label",
              width: 100,
              height: 20,
              node: { type: "TEXT", width: 100, height: 20, exportAsync: async () => new Uint8Array([1]) } as unknown as ScannedItem["node"],
            }),
          ],
        },
      ],
    };
    const composition = assembled(scanResult, { Mobile: 0 });

    const outcome = await attachImages(composition, scanResult, "JPG");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.images[0].path).toMatch(/\.png$/);
  });

  it("de-duplicates paths when two items slugify to the same stem", async () => {
    const scanResult: ScanSuccess = {
      ok: true,
      compositionName: "Collision Test",
      warnings: [],
      layouts: [
        {
          name: "Mobile",
          width: 375,
          height: 812,
          clipsContent: true,
          items: [
            fakeItem({ name: "Image A", x: 0, y: 0, width: 100, height: 100, zIndex: 0 }),
            fakeItem({ name: "image-a", x: 0, y: 0, width: 100, height: 100, zIndex: 1 }),
          ],
        },
      ],
    };
    const composition = assembled(scanResult, { Mobile: 0 });

    const outcome = await attachImages(composition, scanResult, "PNG");
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const paths = outcome.images.map((img) => img.path).sort();
    expect(paths).toEqual(["images/mobile-image-a-2.png", "images/mobile-image-a.png"]);
  });

  it("fails explicitly, without partial output, when a node's image export rejects", async () => {
    const scanResult = scan();
    const composition = assembled(scanResult, { Mobile: 0, Desktop: 1024 });
    const failingNode = scanResult.layouts[0].items[0].node as SupportedItemNode;
    failingNode.exportAsync = async () => {
      throw new Error("Figma export failed");
    };

    const outcome = await attachImages(composition, scanResult, "PNG");
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.some((e) => e.includes("mobile") || e.includes("Mobile"))).toBe(true);
  });

  it("fails explicitly when a scanned item's node reference is missing", async () => {
    const scanResult = scan();
    const composition = assembled(scanResult, { Mobile: 0, Desktop: 1024 });
    delete scanResult.layouts[0].items[0].node;

    const outcome = await attachImages(composition, scanResult, "PNG");
    expect(outcome.ok).toBe(false);
  });

  it("rejects an export with more items than the configured limit, before exporting anything", async () => {
    const manyItems: ScannedItem[] = Array.from({ length: 301 }, (_, index) =>
      fakeItem({ name: `item-${index}`, width: 10, height: 10, zIndex: index }),
    );
    const scanResult: ScanSuccess = {
      ok: true,
      compositionName: "Huge",
      warnings: [],
      layouts: [{ name: "Mobile", width: 375, height: 812, clipsContent: true, items: manyItems }],
    };
    const composition = assembled(scanResult, { Mobile: 0 });

    const outcome = await attachImages(composition, scanResult, "PNG");
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.errors.some((e) => e.includes("300"))).toBe(true);
  });
});
