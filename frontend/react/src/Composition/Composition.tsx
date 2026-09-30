import { useId, useMemo, type CSSProperties } from "react";
import { PasterItem } from "../Item/Item";
import { breakpointCss } from "./breakpoint-css";
import type { PasterCompositionProps } from "./Composition.types";
import styles from "./Composition.module.css";

export type { ItemContentResolver } from "../Item/Item";
export type { PasterCompositionProps } from "./Composition.types";

/**
 * Renders every layout; CSS container queries show the one whose minWidth
 * best fits the composition's own width. That works on the server and
 * without JavaScript, and follows the space the composition is given
 * rather than the window's width.
 */
export function PasterComposition({ composition, resolveContent, className }: PasterCompositionProps) {
  const scope = useId();

  const assetsById = useMemo(
    () => new Map(composition.assets.map((asset) => [asset.id, asset] as const)),
    [composition.assets],
  );
  const css = useMemo(() => breakpointCss(scope, composition.layouts), [scope, composition.layouts]);

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root} data-paster-scope={scope}>
      <style>{css}</style>
      {composition.layouts.map((layout, index) => (
        <div
          key={layout.id}
          className={styles.layout}
          data-paster-layout={layout.id}
          data-paster-layout-index={index}
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
      ))}
    </div>
  );
}
