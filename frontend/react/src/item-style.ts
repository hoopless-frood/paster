import type { Item, Layout } from "@paster/core";

export interface ItemBoxStyle {
  left: string;
  top: string;
  width: string;
  height: string;
  zIndex: number;
}

/** Converts an item's layout-relative geometry into percentages of its layout's design-space size. */
export function computeItemStyle(item: Item, layout: Layout): ItemBoxStyle {
  return {
    left: `${(item.x / layout.width) * 100}%`,
    top: `${(item.y / layout.height) * 100}%`,
    width: `${(item.width / layout.width) * 100}%`,
    height: `${(item.height / layout.height) * 100}%`,
    zIndex: item.zIndex,
  };
}
