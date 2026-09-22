import { describe, expect, it } from "vitest";
import { suggestMinWidths } from "./suggest-min-width";

describe("suggestMinWidths", () => {
  it("suggests 0 for the only layout", () => {
    expect(suggestMinWidths([{ name: "Only", width: 800 }])).toEqual({ Only: 0 });
  });

  it("suggests 0 for the smallest and the midpoint for the rest, regardless of input order", () => {
    const layouts = [
      { name: "Desktop", width: 1440 },
      { name: "Mobile", width: 375 },
      { name: "Tablet", width: 768 },
    ];

    expect(suggestMinWidths(layouts)).toEqual({
      Mobile: 0,
      Tablet: Math.round((375 + 768) / 2),
      Desktop: Math.round((768 + 1440) / 2),
    });
  });

  it("never caps the largest layout — it only gets a minWidth, nothing above it", () => {
    const suggestions = suggestMinWidths([
      { name: "Mobile", width: 375 },
      { name: "Desktop", width: 1440 },
    ]);

    expect(Object.keys(suggestions)).toEqual(["Mobile", "Desktop"]);
    expect(suggestions.Desktop).toBe(Math.round((375 + 1440) / 2));
  });
});
