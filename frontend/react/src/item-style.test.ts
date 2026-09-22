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
    });
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
