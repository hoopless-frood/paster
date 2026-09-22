import { describe, expect, it } from "vitest";
import { sampleComposition } from "./sample.js";
import { validateComposition } from "./validate.js";

function clone(): typeof sampleComposition {
  return structuredClone(sampleComposition);
}

describe("validateComposition", () => {
  it("accepts the sample composition", () => {
    const result = validateComposition(sampleComposition);
    expect(result.valid).toBe(true);
  });

  it("rejects non-object input", () => {
    const result = validateComposition("not an object");
    expect(result.valid).toBe(false);
  });

  it("rejects an unsupported schema version", () => {
    const composition = clone();
    // @ts-expect-error intentionally invalid for the test
    composition.version = 2;
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    }
  });

  it("rejects a composition with no layout at minWidth 0", () => {
    const composition = clone();
    composition.layouts[0].minWidth = 320;
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("minWidth 0"))).toBe(true);
    }
  });

  it("rejects duplicate minWidth thresholds", () => {
    const composition = clone();
    composition.layouts[1].minWidth = composition.layouts[0].minWidth;
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("duplicate breakpoint threshold"))).toBe(true);
    }
  });

  it("rejects non-positive item dimensions", () => {
    const composition = clone();
    composition.layouts[0].items[0].width = 0;
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("width"))).toBe(true);
    }
  });

  it("rejects non-finite geometry", () => {
    const composition = clone();
    composition.layouts[0].items[0].x = Number.POSITIVE_INFINITY;
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
  });

  it("warns, but doesn't reject, mismatched item id sets across layouts", () => {
    const composition = clone();
    composition.layouts[1].items = composition.layouts[1].items.filter(
      (item) => item.id !== "image-b",
    );
    const result = validateComposition(composition);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.warnings.some((w) => w.includes("item ids differ"))).toBe(true);
    }
  });

  it("rejects duplicate item ids within a layout", () => {
    const composition = clone();
    composition.layouts[0].items.push({ ...composition.layouts[0].items[0] });
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("duplicate item id"))).toBe(true);
    }
  });

  it("rejects an asset reference to an unknown asset id", () => {
    const composition = clone();
    composition.layouts[0].items[0].assetId = "does-not-exist";
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("unknown asset"))).toBe(true);
    }
  });

  it("rejects unsafe asset paths", () => {
    const composition = clone();
    composition.assets[0].path = "../../etc/passwd";
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("safe relative path"))).toBe(true);
    }
  });

  it("rejects an absolute asset path", () => {
    const composition = clone();
    composition.assets[0].path = "/etc/passwd";
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
  });

  it("rejects a URL as an asset path", () => {
    const composition = clone();
    composition.assets[0].path = "https://example.com/hero.png";
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
  });

  it("rejects duplicate zIndex values within a layout", () => {
    const composition = clone();
    composition.layouts[0].items[1].zIndex = composition.layouts[0].items[0].zIndex;
    const result = validateComposition(composition);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes("duplicate stacking index"))).toBe(true);
    }
  });
});
