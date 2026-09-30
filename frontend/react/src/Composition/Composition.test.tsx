import { sampleComposition } from "@paster/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasterComposition, type ItemContentResolver } from "./Composition";

afterEach(cleanup);

const resolveContent: ItemContentResolver = (item) => (
  <span data-testid={`item-${item.id}`}>{item.id}</span>
);

function layoutElement(container: HTMLElement, layoutId: string): HTMLElement {
  const layout = container.querySelector<HTMLElement>(`[data-paster-layout="${layoutId}"]`);
  if (!layout) {
    throw new Error(`layout "${layoutId}" not rendered`);
  }
  return layout;
}

function itemWrapper(layout: HTMLElement, itemId: string): HTMLElement {
  const marker = layout.querySelector(`[data-testid="item-${itemId}"]`);
  if (!marker?.parentElement) {
    throw new Error(`item "${itemId}" not rendered`);
  }
  return marker.parentElement;
}

describe("PasterComposition", () => {
  it("renders every layout, each with its own proportional geometry", () => {
    const { container } = render(<PasterComposition composition={sampleComposition} resolveContent={resolveContent} />);

    const mobile = layoutElement(container, "mobile");
    expect(layoutElement(container, "desktop")).toBeTruthy();
    expect(mobile.style.getPropertyValue("--paster-layout-width")).toBe("375");
    expect(mobile.style.getPropertyValue("--paster-layout-height")).toBe("812");

    // mobile layout: image-a at x20,y40,w335 within a 375-wide layout
    const imageA = itemWrapper(mobile, "image-a");
    expect(parseFloat(imageA.style.getPropertyValue("--paster-item-left"))).toBeCloseTo((20 / 375) * 100);
    expect(parseFloat(imageA.style.getPropertyValue("--paster-item-width"))).toBeCloseTo((335 / 375) * 100);
  });

  it("selects the layout with container queries scoped to this instance", () => {
    const { container } = render(<PasterComposition composition={sampleComposition} resolveContent={resolveContent} />);

    const root = container.firstElementChild as HTMLElement;
    const scope = root.dataset.pasterScope;
    const css = root.querySelector("style")?.textContent ?? "";
    expect(scope).toBeTruthy();
    expect(css).toContain(`[data-paster-scope="${scope}"] > [data-paster-layout-index="0"] { display: block; }`);
    expect(css).toContain("@container (min-width: 1024px)");
  });

  it("gives two compositions on one page separate scopes", () => {
    const { container } = render(
      <>
        <PasterComposition composition={sampleComposition} resolveContent={resolveContent} />
        <PasterComposition composition={sampleComposition} resolveContent={resolveContent} />
      </>,
    );

    const scopes = Array.from(container.querySelectorAll<HTMLElement>("[data-paster-scope]")).map(
      (root) => root.dataset.pasterScope,
    );
    expect(scopes).toHaveLength(2);
    expect(scopes[0]).not.toBe(scopes[1]);
  });

  it("applies each layout's own backgroundColor as a CSS custom property", () => {
    const { container } = render(<PasterComposition composition={sampleComposition} resolveContent={resolveContent} />);

    expect(layoutElement(container, "mobile").style.getPropertyValue("--paster-layout-background")).toBe(
      sampleComposition.layouts[0].backgroundColor,
    );
    expect(layoutElement(container, "desktop").style.getPropertyValue("--paster-layout-background")).toBe(
      sampleComposition.layouts[1].backgroundColor,
    );
  });

  it("falls back to transparent when a layout has no backgroundColor", () => {
    const composition = structuredClone(sampleComposition);
    delete composition.layouts[0].backgroundColor;
    const { container } = render(<PasterComposition composition={composition} resolveContent={resolveContent} />);
    expect(layoutElement(container, "mobile").style.getPropertyValue("--paster-layout-background")).toBe(
      "transparent",
    );
  });

  it("clips by default (Figma's own default), when a layout has no clipsContent at all", () => {
    const composition = structuredClone(sampleComposition);
    delete composition.layouts[0].clipsContent;
    const { container } = render(<PasterComposition composition={composition} resolveContent={resolveContent} />);
    expect(layoutElement(container, "mobile").style.getPropertyValue("--paster-layout-overflow")).toBe("hidden");
  });

  it("stops clipping when a layout's clipsContent is explicitly false", () => {
    const composition = structuredClone(sampleComposition);
    composition.layouts[0].clipsContent = false;
    const { container } = render(<PasterComposition composition={composition} resolveContent={resolveContent} />);
    expect(layoutElement(container, "mobile").style.getPropertyValue("--paster-layout-overflow")).toBe("visible");
  });

  it("keeps each layout's stacking order independent for the same item id", () => {
    const { container } = render(<PasterComposition composition={sampleComposition} resolveContent={resolveContent} />);
    const zIndexOf = (el: HTMLElement) => Number(el.style.getPropertyValue("--paster-item-z"));
    const mobile = layoutElement(container, "mobile");
    const desktop = layoutElement(container, "desktop");

    // mobile: image-b (zIndex 0) sits behind image-a (zIndex 1)
    expect(zIndexOf(itemWrapper(mobile, "image-a"))).toBeGreaterThan(zIndexOf(itemWrapper(mobile, "image-b")));
    // desktop: image-a (zIndex 0) sits behind image-b (zIndex 1) — the order flipped
    expect(zIndexOf(itemWrapper(desktop, "image-a"))).toBeLessThan(zIndexOf(itemWrapper(desktop, "image-b")));
  });

  it("resolves an item's asset from composition.assets via assetId", () => {
    const seen: Array<string | undefined> = [];
    render(
      <PasterComposition
        composition={sampleComposition}
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

    const seenByLayout: Record<string, string | undefined> = {};
    render(
      <PasterComposition
        composition={composition}
        resolveContent={(item, { asset, layout }) => {
          if (item.id === "image-a") {
            seenByLayout[layout.id] = asset?.path;
          }
          return null;
        }}
      />,
    );

    expect(seenByLayout.mobile).toBe("images/image-a.png");
    expect(seenByLayout.desktop).toBe("images/image-a-desktop.png");
  });
});
