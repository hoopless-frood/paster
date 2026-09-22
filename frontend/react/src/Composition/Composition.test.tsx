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

    // mobile layout: hero at x0,y0,w375 within a 375-wide layout
    const hero = itemWrapper(container, "hero");
    expect(hero.style.getPropertyValue("--paster-item-left")).toBe("0%");
    expect(hero.style.getPropertyValue("--paster-item-width")).toBe("100%");
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

    expect(zIndexOf(itemWrapper(container, "hero"))).toBeLessThan(
      zIndexOf(itemWrapper(container, "portrait")),
    );

    rerender(
      <PasterComposition composition={sampleComposition} resolveContent={resolveContent} viewportWidth={1440} />,
    );
    expect(zIndexOf(itemWrapper(container, "hero"))).toBeGreaterThan(
      zIndexOf(itemWrapper(container, "portrait")),
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

    expect(seen).toContain("images/hero.png");
    expect(seen).toContain("images/portrait.png");
  });

  it("resolves a different asset per layout for the same item id (layout-specific image overrides)", () => {
    const composition = structuredClone(sampleComposition);
    composition.assets.push({
      id: "hero-image-desktop-crop",
      path: "images/hero-desktop.png",
      width: 2000,
      height: 900,
    });
    const desktopHero = composition.layouts[1].items.find((item) => item.id === "hero");
    if (!desktopHero) {
      throw new Error("fixture missing desktop hero item");
    }
    desktopHero.assetId = "hero-image-desktop-crop";

    const seenByWidth: Record<number, string | undefined> = {};
    let currentWidth = 320;
    const trackingResolver: ItemContentResolver = (item, { asset }) => {
      if (item.id === "hero") {
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

    expect(seenByWidth[320]).toBe("images/hero.png");
    expect(seenByWidth[1440]).toBe("images/hero-desktop.png");
  });
});
