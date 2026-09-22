import { describe, expect, it } from "vitest";
import { selectLayout } from "./breakpoints";
import { sampleComposition } from "./sample";
import type { Composition } from "./types";

describe("selectLayout", () => {
  it("selects the base (minWidth 0) layout below the next threshold", () => {
    expect(selectLayout(sampleComposition, 320).id).toBe("mobile");
    expect(selectLayout(sampleComposition, 1023).id).toBe("mobile");
  });

  it("selects a layout exactly at its minWidth threshold", () => {
    expect(selectLayout(sampleComposition, 1024).id).toBe("desktop");
  });

  it("selects the widest matching layout above all thresholds", () => {
    expect(selectLayout(sampleComposition, 4000).id).toBe("desktop");
  });

  it("is independent of the input layout array order", () => {
    const reordered: Composition = {
      ...sampleComposition,
      layouts: [...sampleComposition.layouts].reverse(),
    };

    expect(selectLayout(reordered, 320).id).toBe("mobile");
    expect(selectLayout(reordered, 1024).id).toBe("desktop");
  });

  it("throws for a composition with no layouts", () => {
    const empty: Composition = { ...sampleComposition, layouts: [] };
    expect(() => selectLayout(empty, 800)).toThrow();
  });
});
