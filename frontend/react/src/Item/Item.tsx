import type { Asset, Composition, Item, Layout } from "@paster/core";
import { computeItemStyle } from "../item-style";
import type { ItemContentResolver } from "../Composition/Composition";
import styles from "./Item.module.css";

export interface PasterItemProps {
  item: Item;
  context: { layout: Layout; asset: Asset | undefined; composition: Composition };
  resolveContent: ItemContentResolver;
}

/** A single positioned item within a layout — currently an image or SVG, resolved entirely by the caller. */
export function PasterItem({ item, context, resolveContent }: PasterItemProps) {
  const itemStyle = computeItemStyle(item, context.layout);

  return (
    <div
      className={styles.item}
      style={{
        left: itemStyle.left,
        top: itemStyle.top,
        width: itemStyle.width,
        height: itemStyle.height,
        zIndex: itemStyle.zIndex,
      }}
    >
      {resolveContent(item, context)}
    </div>
  );
}
