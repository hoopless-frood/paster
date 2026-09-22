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

export function PreviewPanel({ composition }: PreviewPanelProps) {
  // Both default to (and keep tracking) the window's current width, so the
  // preview fills the screen and the slider can't go past it.
  const [maxViewportWidth, setMaxViewportWidth] = useState(currentMaxViewportWidth);
  const [viewportWidth, setViewportWidth] = useState(currentMaxViewportWidth);
  const [showOutlines, setShowOutlines] = useState(false);
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

  const resolveContent: ItemContentResolver = (item) => (
    <div className={showOutlines ? `${styles.itemPlaceholder} ${styles.itemOutline}` : styles.itemPlaceholder}>
      {showOutlines ? `${item.name ?? item.id} (${item.id})` : (item.name ?? item.id)}
    </div>
  );

  return (
    <section className={styles.panel} aria-label="Preview">
      <Checkbox
        className={styles.checkbox}
        label="Show item outlines and IDs"
        checked={showOutlines}
        onChange={(event) => setShowOutlines(event.target.checked)}
      />

      <div className={styles.widthGroup}>
        <label htmlFor={viewportInputId}>
          Preview width: {viewportWidth}px ({activeLayout.name})
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
