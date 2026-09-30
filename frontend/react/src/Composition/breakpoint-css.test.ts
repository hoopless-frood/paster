import type { Layout } from "@paster/core";
import { describe, expect, it } from "vitest";
import { breakpointCss } from "./breakpoint-css";

function layout(id: string, minWidth: number): Layout {
  return { id, name: id, minWidth, width: 100, height: 100, items: [] };
}

describe("breakpointCss", () => {
  it("shows the base layout by default and each wider one from its minWidth", () => {
    const css = breakpointCss("s", [layout("mobile", 0), layout("desktop", 953)]);

    expect(css).toBe(
      [
        '[data-paster-scope="s"] > [data-paster-layout-index="0"] { display: block; }',
        '@container (min-width: 953px) { [data-paster-scope="s"] > [data-paster-layout-index] { display: none; } [data-paster-scope="s"] > [data-paster-layout-index="1"] { display: block; } }',
      ].join("\n"),
    );
  });

  it("orders rules narrowest to widest, whatever the layouts' order, so the widest match wins", () => {
    const css = breakpointCss("s", [layout("desktop", 1280), layout("mobile", 0), layout("tablet", 768)]);

    const tablet = css.indexOf("min-width: 768px");
    const desktop = css.indexOf("min-width: 1280px");
    // The base layout (mobile, at index 1) comes first, outside any query.
    expect(css.split("\n")[0]).toBe('[data-paster-scope="s"] > [data-paster-layout-index="1"] { display: block; }');
    expect(tablet).toBeGreaterThan(0);
    expect(desktop).toBeGreaterThan(tablet);
    // Layouts are addressed by their position in the composition, not by id.
    expect(css).toContain('[data-paster-layout-index="2"] { display: block; } }');
    expect(css).not.toContain("tablet");
  });
});
