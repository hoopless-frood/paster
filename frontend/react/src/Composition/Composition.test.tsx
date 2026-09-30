import { sampleComposition } from "@paster/core";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasterComposition, type ItemContentResolver } from "./Composition";

afterEach(cleanup);

const resolveContent: ItemContentResolver = (item) => (
  <span data-testid={`item-${item.id}`}>{item.id}</span>
);

function itemWrapper(container: HTMLElement, itemId: string): HTMLElement {
  const marker = container.querySelector(`[data-testid="item-${itemId}"]`);
  if (!marker?.parentElement) {
    throw new Error(`item "${itemId}" not rendered`);
  }
  return marker.parentElement;
}

function setWindowInnerWidth(width: number): void {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

describe("PasterComposition", () => {
  it("renders the layout matching an explicit viewportWidth prop, proportionally", () => {
    const { container } = render(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={320} />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.pasterLayout).toBe("mobile");
    expect(root.style.getPropertyValue("--paster-layout-width")).toBe("375");
    expect(root.style.getPropertyValue("--paster-layout-height")).toBe("812");

    // mobile layout: image-a at x20,y40,w335 within a 375-wide layout
    const imageA = itemWrapper(container, "image-a");
    expect(parseFloat(imageA.style.getPropertyValue("--paster-item-left"))).toBeCloseTo((20 / 375) * 100);
    expect(parseFloat(imageA.style.getPropertyValue("--paster-item-width"))).toBeCloseTo((335 / 375) * 100);
  });

  it("applies each layout's own backgroundColor as a CSS custom property", () => {
    const { container, rerender } = render(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={320} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--paster-layout-background")).toBe(
      sampleComposition.layouts[0].backgroundColor,
    );

    rerender(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={1440} />,
    );
    const desktopRoot = container.firstElementChild as HTMLElement;
    expect(desktopRoot.style.getPropertyValue("--paster-layout-background")).toBe(
      sampleComposition.layouts[1].backgroundColor,
    );
  });

  it("falls back to transparent when a layout has no backgroundColor", () => {
    const composition = structuredClone(sampleComposition);
    delete composition.layouts[0].backgroundColor;
    const { container } = render(
      <PasterComposition composition={composition} resolveContent={resolveContent} viewportWidth={320} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--paster-layout-background")).toBe("transparent");
  });

  it("clips by default (Figma's own default), when a layout has no clipsContent at all", () => {
    const composition = structuredClone(sampleComposition);
    delete composition.layouts[0].clipsContent;
    const { container } = render(
      <PasterComposition composition={composition} resolveContent={resolveContent} viewportWidth={320} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--paster-layout-overflow")).toBe("hidden");
  });

  it("stops clipping when a layout's clipsContent is explicitly false", () => {
    const composition = structuredClone(sampleComposition);
    composition.layouts[0].clipsContent = false;
    const { container } = render(
      <PasterComposition composition={composition} resolveContent={resolveContent} viewportWidth={320} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--paster-layout-overflow")).toBe("visible");
  });

  it("switches layout when the viewportWidth prop crosses a breakpoint", () => {
    const { container, rerender } = render(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={320} />,
    );
    expect((container.firstElementChild as HTMLElement).dataset.pasterLayout).toBe("mobile");

    rerender(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={1440} />,
    );
    expect((container.firstElementChild as HTMLElement).dataset.pasterLayout).toBe("desktop");
  });

  it("tracks window.innerWidth reactively when viewportWidth isn't provided", () => {
    setWindowInnerWidth(320);
    const { container } = render(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} />,
    );
    expect((container.firstElementChild as HTMLElement).dataset.pasterLayout).toBe("mobile");

    setWindowInnerWidth(1440);
    expect((container.firstElementChild as HTMLElement).dataset.pasterLayout).toBe("desktop");
  });

  it("changes stacking order independently per layout for the same item id", () => {
    const { container, rerender } = render(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={320} />,
    );
    const zIndexOf = (el: HTMLElement) => Number(el.style.getPropertyValue("--paster-item-z"));

    // mobile: image-b (zIndex 0) sits behind image-a (zIndex 1)
    expect(zIndexOf(itemWrapper(container, "image-a"))).toBeGreaterThan(
      zIndexOf(itemWrapper(container, "image-b")),
    );

    rerender(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={1440} />,
    );
    // desktop: image-a (zIndex 0) sits behind image-b (zIndex 1) — the order flipped
    expect(zIndexOf(itemWrapper(container, "image-a"))).toBeLessThan(
      zIndexOf(itemWrapper(container, "image-b")),
    );
  });

  it("resolves an item's asset from composition.assets via assetId", () => {
    const seen: Array<string | undefined> = [];
    render(
      <PasterComposition
        composition={sampleComposition}
        viewportWidth={320}
        resolveContent={(item, { asset }) => {
          seen.push(asset?.path);
          return item.id;
        }}
      />,
    );

    expect(seen).toContain("images/image-a.png");
    expect(seen).toContain("images/image-b.png");
    expect(seen).toContain("images/image-c.png");
  });

  it("resolves a different asset per layout for the same item id (layout-specific image overrides)", () => {
    const composition = structuredClone(sampleComposition);
    composition.assets.push({
      id: "image-a-desktop-crop",
      path: "images/image-a-desktop.png",
      width: 2000,
      height: 900,
    });
    const desktopImageA = composition.layouts[1].items.find((item) => item.id === "image-a");
    if (!desktopImageA) {
      throw new Error("fixture missing desktop image-a item");
    }
    desktopImageA.assetId = "image-a-desktop-crop";

    const seenByWidth: Record<number, string | undefined> = {};
    let currentWidth = 320;
    const trackingResolver: ItemContentResolver = (item, { asset }) => {
      if (item.id === "image-a") {
        seenByWidth[currentWidth] = asset?.path;
      }
      return null;
    };

    const { rerender } = render(
      <PasterComposition composition={composition} viewportWidth={currentWidth} resolveContent={trackingResolver} />,
    );

    currentWidth = 1440;
    rerender(
      <PasterComposition composition={composition} viewportWidth={currentWidth} resolveContent={trackingResolver} />,
    );

    expect(seenByWidth[320]).toBe("images/image-a.png");
    expect(seenByWidth[1440]).toBe("images/image-a-desktop.png");
  });
});
