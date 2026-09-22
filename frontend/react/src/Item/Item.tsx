import type { CSSProperties } from "react";
import { computeItemStyle } from "../item-style";
import type { PasterItemProps } from "./Item.types";
import styles from "./Item.module.css";

export type { ItemContentResolver, PasterItemProps } from "./Item.types";

export function PasterItem({ item, context, resolveContent }: PasterItemProps) {
  const itemStyle = computeItemStyle(item, context.layout);

  return (
    <div
      className={styles.item}
      style={
        {
          "--paster-item-left": itemStyle.left,
          "--paster-item-top": itemStyle.top,
          "--paster-item-width": itemStyle.width,
          "--paster-item-height": itemStyle.height,
          "--paster-item-z": itemStyle.zIndex,
        } as CSSProperties
      }
    >
      {resolveContent(item, context)}
    </div>
  );
}
