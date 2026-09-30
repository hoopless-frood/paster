import type { ItemContentResolver } from "@paster/react";
import styles from "./LayoutPanel.module.css";

/**
 * The playground's resolveContent, kept to exactly the markup a production
 * consumer would render: a bare <img> per item, with no wrappers, handlers,
 * or debug styling. Debug tooling belongs in a separate layer, never here —
 * see docs/architecture.md.
 */
export function createAssetContentResolver(assetUrls: Map<string, string>, imagesRestoring: boolean): ItemContentResolver {
  return (item, context) => {
    const imageUrl = context.asset ? assetUrls.get(context.asset.path) : undefined;

    if (!imageUrl && context.asset && imagesRestoring) {
      // Its image is still being restored after a page load; an empty box
      // avoids flashing a labeled placeholder first.
      return null;
    }

    if (!imageUrl) {
      // Playground-only fallback for geometry-only JSON (no matching ZIP).
      return <div className={styles.itemPlaceholder}>{item.name ?? item.id}</div>;
    }

    // An <img> never executes scripts or loads external references from its
    // source, so this is safe for SVG assets too. asset.alt is the only
    // trustworthy alt text; without it, empty (decorative) beats guessing
    // from Figma layer names.
    return <img src={imageUrl} alt={context.asset?.alt ?? ""} className={styles.itemImage} />;
  };
}
