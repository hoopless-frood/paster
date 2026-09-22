// @vitest-environment node
import { sampleComposition } from "@paster/core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasterComposition } from "./Composition";

describe("PasterComposition (SSR, no window global)", () => {
  it("renders without crashing and defaults to the base layout", () => {
    expect(typeof window).toBe("undefined");

    const html = renderToStaticMarkup(
      <PasterComposition composition={sampleComposition} resolveContent={(item) => item.id} />,
    );

    expect(html).toContain('data-paster-layout="mobile"');
  });

  it("renders the caller-specified layout when viewportWidth is passed explicitly", () => {
    const html = renderToStaticMarkup(
      <PasterComposition
        composition={sampleComposition}
        resolveContent={(item) => item.id}
        viewportWidth={1440}
      />,
    );

    expect(html).toContain('data-paster-layout="desktop"');
  });
});
