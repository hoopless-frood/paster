import { selectLayout, type Asset, type Composition, type Item, type Layout } from "@paster/core";
import { useMemo, type ReactNode } from "react";
import { PasterItem } from "../Item/Item";
import { useViewportWidth } from "./useViewportWidth";
import styles from "./Composition.module.css";

/**
 * Resolves what an item renders. Paster never invents content or alt text —
 * this is entirely the consumer's decision, given the item, its active
 * layout, and its resolved asset (if `item.assetId` is set and the asset
 * exists in `composition.assets`).
 */
export type ItemContentResolver = (
  item: Item,
  context: { layout: Layout; asset: Asset | undefined; composition: Composition },
) => ReactNode;

export interface PasterCompositionProps {
  composition: Composition;
  resolveContent: ItemContentResolver;
  /**
   * Viewport width (px) to render at. Omit to track the real browser
   * viewport reactively; pass it explicitly for SSR determinism, tests, or
   * a fixed-size embed. See useViewportWidth for the SSR fallback behavior.
   */
  viewportWidth?: number;
  className?: string;
}

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
      style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
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
