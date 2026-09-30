// @vitest-environment node
import { sampleComposition } from "@paster/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasterComposition } from "./Composition";

describe("PasterComposition (SSR, no window global)", () => {
  it("renders every layout and its breakpoint CSS without a window", () => {
    expect(typeof window).toBe("undefined");

    const html = renderToStaticMarkup(
      <PasterComposition composition={sampleComposition} resolveContent={(item) => item.id} />,
    );

    // CSS picks the layout in the browser, so the server needs no width.
    expect(html).toContain('data-paster-layout="mobile"');
    expect(html).toContain('data-paster-layout="desktop"');
    expect(html).toContain("@container (min-width: 1024px)");
  });
});
