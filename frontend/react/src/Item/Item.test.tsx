import type { Item as ItemData, Layout } from "@paster/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PasterItem } from "./Item";

afterEach(cleanup);

const layout: Layout = { id: "l", name: "L", minWidth: 0, width: 400, height: 800, items: [] };

function makeItem(overrides: Partial<ItemData> = {}): ItemData {
  return { id: "i", x: 100, y: 200, width: 200, height: 400, zIndex: 3, ...overrides };
}

describe("PasterItem", () => {
  it("positions itself as layout-relative percentages", () => {
    const { container } = render(
      <PasterItem
        item={makeItem()}
        context={{ layout, asset: undefined, composition: { version: 1, id: "c", name: "C", layouts: [layout], assets: [] } }}
        resolveContent={() => "content"}
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--paster-item-left")).toBe("25%");
    expect(root.style.getPropertyValue("--paster-item-top")).toBe("25%");
    expect(root.style.getPropertyValue("--paster-item-width")).toBe("50%");
    expect(root.style.getPropertyValue("--paster-item-height")).toBe("50%");
    expect(root.style.getPropertyValue("--paster-item-z")).toBe("3");
  });

  it("renders whatever resolveContent returns, and passes it the item/context", () => {
    const item = makeItem({ id: "hero" });
    const composition = { version: 1 as const, id: "c", name: "C", layouts: [layout], assets: [] };
    const seen: unknown[] = [];

    const { getByText } = render(
      <PasterItem
        item={item}
        context={{ layout, asset: undefined, composition }}
        resolveContent={(receivedItem, context) => {
          seen.push([receivedItem, context]);
          return <span>hello from {receivedItem.id}</span>;
        }}
      />,
    );

    expect(getByText("hello from hero")).toBeTruthy();
    expect(seen).toEqual([[item, { layout, asset: undefined, composition }]]);
  });
});
