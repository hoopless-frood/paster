import { describe, expect, it } from "vitest";
import { figmaRotationToCss } from "./figma-export";

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
