import { selectLayout } from "@paster/core";
import { useMemo, type CSSProperties } from "react";
import { PasterItem } from "../Item/Item";
import { useViewportWidth } from "./useViewportWidth";
import type { PasterCompositionProps } from "./Composition.types";
import styles from "./Composition.module.css";

export type { ItemContentResolver } from "../Item/Item";
export type { PasterCompositionProps } from "./Composition.types";

export function PasterComposition({
  composition,
  resolveContent,
  viewportWidth,
  className,
}: PasterCompositionProps) {
  const resolvedWidth = useViewportWidth(viewportWidth);
  const layout = selectLayout(composition, resolvedWidth);

  const assetsById = useMemo(
    () => new Map(composition.assets.map((asset) => [asset.id, asset] as const)),
    [composition.assets],
  );

  return (
    <div
      className={className ? `${styles.root} ${className}` : styles.root}
      style={
        {
          "--paster-layout-width": layout.width,
          "--paster-layout-height": layout.height,
          "--paster-layout-background": layout.backgroundColor ?? "transparent",
          // Clipped unless the frame's "Clip content" was off (Figma's default
          // is on), so deliberate bleed, or a rotated item's swung-out
          // corners, can show past the edges.
          "--paster-layout-overflow": layout.clipsContent === false ? "visible" : "hidden",
        } as CSSProperties
      }
      data-paster-layout={layout.id}
    >
      {layout.items.map((item) => (
        <PasterItem
          key={item.id}
          item={item}
          context={{ layout, asset: item.assetId ? assetsById.get(item.assetId) : undefined, composition }}
          resolveContent={resolveContent}
        />
      ))}
    </div>
  );
}
