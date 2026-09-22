import { selectLayout } from "@paster/core";
import { PasterComposition, type ItemContentResolver } from "@paster/react";
import { useEffect, useId, useState } from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import { Slider } from "../Slider/Slider";
import type { PreviewPanelProps } from "./PreviewPanel.types";
import styles from "./PreviewPanel.module.css";

export type { PreviewPanelProps } from "./PreviewPanel.types";

const MIN_VIEWPORT_WIDTH = 280;

function currentMaxViewportWidth() {
  return Math.max(window.innerWidth, MIN_VIEWPORT_WIDTH);
}

function allItemIds(composition: PreviewPanelProps["composition"]): Set<string> {
  return new Set(composition.layouts.flatMap((layout) => layout.items.map((item) => item.id)));
}

// Trims float noise (e.g. 19.999999998) without hiding real sub-pixel values.
function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

export function PreviewPanel({ composition, assetUrls }: PreviewPanelProps) {
  // Both default to (and keep tracking) the window's current width, so the
  // preview fills the screen and the slider can't go past it.
  const [maxViewportWidth, setMaxViewportWidth] = useState(currentMaxViewportWidth);
  const [viewportWidth, setViewportWidth] = useState(currentMaxViewportWidth);
  // Item ids (shared across layouts) currently showing their outline/ID —
  // the checkbox sets/clears all of them at once; clicking an item toggles
  // just that one, on top of whatever the checkbox last set.
  const [outlinedItemIds, setOutlinedItemIds] = useState<Set<string>>(new Set());
  const viewportInputId = useId();

  useEffect(() => {
    function handleResize() {
      const width = currentMaxViewportWidth();
      setMaxViewportWidth(width);
      setViewportWidth(width);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Independently re-derives the active layout with the same function the
  // renderer uses internally, so this info can never drift from what's shown.
  const activeLayout = selectLayout(composition, viewportWidth);

  const resolveContent: ItemContentResolver = (item, context) => {
    const isOutlined = outlinedItemIds.has(item.id);
    const imageUrl = context.asset ? assetUrls.get(context.asset.path) : undefined;

    function toggleOutline() {
      setOutlinedItemIds((current) => {
        const next = new Set(current);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
        return next;
      });
    }

    const details = (
      <span className={styles.itemDetails}>
        <span>
          {item.name ?? item.id} ({item.id})
        </span>
        {item.assetId && <span className={styles.itemGeometry}>asset:{item.assetId}</span>}
        <span className={styles.itemGeometry}>
          x:{formatNumber(item.x)} y:{formatNumber(item.y)} z:{item.zIndex}
        </span>
        <span className={styles.itemGeometry}>
          w:{formatNumber(item.width)} h:{formatNumber(item.height)}
        </span>
      </span>
    );

    if (imageUrl) {
      return (
        <button
          type="button"
          className={isOutlined ? `${styles.itemImageButton} ${styles.itemImageOutline}` : styles.itemImageButton}
          aria-pressed={isOutlined}
          aria-label={`Toggle outline for ${item.name ?? item.id}`}
          onClick={toggleOutline}
        >
          {/* Rendered as an <img>, never inline markup — a browser never
              executes scripts or loads external references from an SVG (or
              any other format) used as an image source, so this is safe
              regardless of asset format. */}
          {/* asset.alt is the only trustworthy source here — it's explicit,
              author-provided text, never auto-derived from Figma metadata.
              Without it, the item/layer name isn't vetted alt text, so this
              falls back to empty (decorative) rather than guessing. */}
          <img src={imageUrl} alt={context.asset?.alt ?? ""} className={styles.itemImage} />
          {isOutlined && <span className={styles.itemImageDetails}>{details}</span>}
        </button>
      );
    }

    return (
      <button
        type="button"
        className={isOutlined ? `${styles.itemPlaceholder} ${styles.itemOutline}` : styles.itemPlaceholder}
        aria-pressed={isOutlined}
        aria-label={`Toggle outline for ${item.name ?? item.id}`}
        onClick={toggleOutline}
      >
        {isOutlined ? details : (item.name ?? item.id)}
      </button>
    );
  };

  return (
    <section className={styles.panel} aria-label="Preview">
      <Checkbox
        className={styles.checkbox}
        label="Show item outlines and IDs"
        checked={outlinedItemIds.size > 0}
        onChange={(event) => setOutlinedItemIds(event.target.checked ? allItemIds(composition) : new Set())}
      />

      <div className={styles.widthGroup}>
        <label htmlFor={viewportInputId}>
          <span>Preview width: {viewportWidth}px</span> <span>({activeLayout.name})</span>
        </label>

        <Slider
          id={viewportInputId}
          min={MIN_VIEWPORT_WIDTH}
          max={maxViewportWidth}
          value={viewportWidth}
          ticks={composition.layouts.map((layout) => layout.minWidth)}
          onChange={(event) => setViewportWidth(Number(event.target.value))}
        />
      </div>

      <div className={styles.previewWrapper} style={{ width: viewportWidth }}>
        <PasterComposition composition={composition} resolveContent={resolveContent} viewportWidth={viewportWidth} />
      </div>
    </section>
  );
}
