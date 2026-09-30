import type { Composition } from "@paster/core";
import { PasterComposition, type ItemContentResolver } from "@paster/react";
import { useMemo } from "react";
import type { ItemOutlinesProps } from "./ItemOutlines.types";
import styles from "./ItemOutlines.module.css";

export type { ItemOutlinesProps } from "./ItemOutlines.types";

// Trims float noise (e.g. 19.999999998) without hiding real sub-pixel values.
function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

// Without this, the overlay would paint the layout background over the preview.
function withoutBackgrounds(composition: Composition): Composition {
  return {
    ...composition,
    layouts: composition.layouts.map((layout) => ({ ...layout, backgroundColor: undefined })),
  };
}

const renderOutline: ItemContentResolver = (item) => (
  <div className={styles.outline}>
    <span className={styles.details}>
      <span>
        {item.name ?? item.id} ({item.id})
      </span>
      {item.assetId && <span className={styles.geometry}>asset:{item.assetId}</span>}
      <span className={styles.geometry}>
        x:{formatNumber(item.x)} y:{formatNumber(item.y)} z:{item.zIndex}
      </span>
      <span className={styles.geometry}>
        w:{formatNumber(item.width)} h:{formatNumber(item.height)}
        {item.rotation ? ` r:${formatNumber(item.rotation)}°` : ""}
      </span>
    </span>
  </div>
);

/**
 * Debug-only overlay of every item's bounds and identity. Renders through
 * a second PasterComposition rather than wrapping the preview's own
 * content, so outlines share the renderer's exact geometry (breakpoints,
 * rotation, stacking) while the preview's DOM stays production-shaped.
 */
export function ItemOutlines({ composition, viewportWidth }: ItemOutlinesProps) {
  const outlineComposition = useMemo(() => withoutBackgrounds(composition), [composition]);

  return (
    <div className={styles.overlay}>
      <PasterComposition composition={outlineComposition} resolveContent={renderOutline} viewportWidth={viewportWidth} />
    </div>
  );
}
