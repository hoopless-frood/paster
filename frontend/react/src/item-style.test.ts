import { describe, expect, it } from "vitest";
import type { Item, Layout } from "@paster/core";
import { computeItemStyle } from "./item-style";

const layout: Layout = { id: "l", name: "L", minWidth: 0, width: 400, height: 800, items: [] };

describe("computeItemStyle", () => {
  it("converts absolute geometry to layout-relative percentages", () => {
    const item: Item = { id: "i", x: 100, y: 200, width: 200, height: 400, zIndex: 2 };
    expect(computeItemStyle(item, layout)).toEqual({
      left: "25%",
      top: "25%",
      width: "50%",
      height: "50%",
      zIndex: 2,
      transform: "none",
    });
  });

  it("carries a rotation through as a CSS rotate() transform, unaffected by layout scaling", () => {
    const item: Item = { id: "i", x: 0, y: 0, width: 100, height: 100, zIndex: 0, rotation: 15 };
    expect(computeItemStyle(item, layout).transform).toBe("rotate(15deg)");
  });

  it("allows a negative rotation (counterclockwise)", () => {
    const item: Item = { id: "i", x: 0, y: 0, width: 100, height: 100, zIndex: 0, rotation: -90 };
    expect(computeItemStyle(item, layout).transform).toBe("rotate(-90deg)");
  });

  it("omits rotation as \"none\" rather than rotate(0deg)", () => {
    const item: Item = { id: "i", x: 0, y: 0, width: 100, height: 100, zIndex: 0, rotation: 0 };
    expect(computeItemStyle(item, layout).transform).toBe("none");
  });

  it("keeps left/top unchanged for an unrotated item (rotation adjustment is a no-op at 0)", () => {
    const item: Item = { id: "i", x: 40, y: 80, width: 100, height: 100, zIndex: 0, rotation: 0 };
    const style = computeItemStyle(item, layout);
    expect(style.left).toBe("10%");
    expect(style.top).toBe("10%");
  });

  it("adjusts left/top so CSS's own center-based rotation lands the item where Figma's did", () => {
    // A 180° rotation swaps a box's top-left and bottom-right — Figma's x/y
    // (the unrotated top-left's position after rotating around center)
    // ends up at the *original* bottom-right corner, one full width/height
    // away from where an unrotated box with the same x/y would sit.
    const item: Item = { id: "i", x: 0, y: 0, width: 100, height: 100, zIndex: 0, rotation: 180 };
    const style = computeItemStyle(item, layout);
    expect(Number.parseFloat(style.left)).toBeCloseTo(-25, 5); // (0 - 100) / 400 * 100
    expect(Number.parseFloat(style.top)).toBeCloseTo(-12.5, 5); // (0 - 100) / 800 * 100
  });

  it("adjusts left/top for a 90° rotation on a non-square item", () => {
    const item: Item = { id: "i", x: 0, y: 0, width: 200, height: 100, zIndex: 0, rotation: 90 };
    const style = computeItemStyle(item, layout);
    expect(Number.parseFloat(style.left)).toBeCloseTo(-37.5, 5); // (0 - 150) / 400 * 100
    expect(Number.parseFloat(style.top)).toBeCloseTo(6.25, 5); // (0 + 50) / 800 * 100
  });

  it("regression: a heavily-rotated item's true center stays within its layout (a real reported bug)", () => {
    // From a real plugin export: a 337x228 item at x:317.95,y:294.7 inside a
    // 393-wide mobile layout, rotated -151.43° — before the position
    // adjustment above, this rendered with its center far outside the
    // 393px-wide canvas (using x/y as CSS's left/top ignores that Figma's
    // x/y already has the center-rotation baked in).
    const mobileLayout: Layout = { id: "m", name: "Mobile", minWidth: 0, width: 393, height: 982, items: [] };
    const item: Item = {
      id: "red",
      x: 317.9520263671875,
      y: 294.7068786621094,
      width: 337,
      height: 228,
      zIndex: 9,
      rotation: -151.43,
    };
    const style = computeItemStyle(item, mobileLayout);
    const leftPx = (Number.parseFloat(style.left) / 100) * mobileLayout.width;
    const topPx = (Number.parseFloat(style.top) / 100) * mobileLayout.height;
    const centerX = leftPx + item.width / 2;
    const centerY = topPx + item.height / 2;
    expect(centerX).toBeGreaterThan(0);
    expect(centerX).toBeLessThan(mobileLayout.width);
    expect(centerY).toBeGreaterThan(0);
    expect(centerY).toBeLessThan(mobileLayout.height);
  });

  it("passes zIndex through unchanged", () => {
    const item: Item = { id: "i", x: 0, y: 0, width: 400, height: 800, zIndex: 5 };
    expect(computeItemStyle(item, layout).zIndex).toBe(5);
  });

  it("allows negative x/y for an item positioned partially outside its layout's bounds", () => {
    const item: Item = { id: "i", x: -40, y: -80, width: 100, height: 100, zIndex: 0 };
    const style = computeItemStyle(item, layout);
    expect(style.left).toBe("-10%");
    expect(style.top).toBe("-10%");
  });
});
