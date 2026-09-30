import { selectLayout } from "@paster/core";
import { PasterComposition } from "@paster/react";
import { useEffect, useId, useMemo, useState } from "react";
import { Slider } from "../Slider/Slider";
import { createAssetContentResolver } from "./asset-content";
import type { LayoutPanelProps } from "./LayoutPanel.types";
import styles from "./LayoutPanel.module.css";

export type { LayoutPanelProps } from "./LayoutPanel.types";

const MIN_VIEWPORT_WIDTH = 280;

// The slider reaches the widest breakpoint on any screen (past it, the same
// layout only scales), or the full window if that's wider.
function maxViewportWidthFor(composition: LayoutPanelProps["composition"], windowWidth: number): number {
  return Math.max(windowWidth, ...composition.layouts.map((layout) => layout.minWidth));
}

// Read once, as a starting point only: the simulated width is independent of
// the real window afterwards, and CSS scales the preview down if it doesn't fit.
function initialViewportWidth(): number {
  return Math.max(window.innerWidth, MIN_VIEWPORT_WIDTH);
}

export function LayoutPanel({ composition, assetUrls }: LayoutPanelProps) {
  const [viewportWidth, setViewportWidth] = useState(initialViewportWidth);
  // Only raises the slider's range as the window grows; it never moves the slider.
  const [widestWindowWidth, setWidestWindowWidth] = useState(() => window.innerWidth);
  const viewportInputId = useId();

  // Independently re-derives the active layout with the same function the
  // renderer uses internally, so this info can never drift from what's shown.
  const activeLayout = selectLayout(composition, viewportWidth);

  const resolveContent = useMemo(() => createAssetContentResolver(assetUrls), [assetUrls]);

  useEffect(() => {
    const updateWindowWidth = () => setWidestWindowWidth((widest) => Math.max(widest, window.innerWidth));
    window.addEventListener("resize", updateWindowWidth);
    return () => window.removeEventListener("resize", updateWindowWidth);
  }, []);

  return (
    <section className={styles.panel} aria-label="Layout">
      <div className={styles.widthGroup}>
        <label htmlFor={viewportInputId} className="visually-hidden">
          Viewport width
        </label>

        <Slider
          id={viewportInputId}
          min={MIN_VIEWPORT_WIDTH}
          max={maxViewportWidthFor(composition, widestWindowWidth)}
          value={viewportWidth}
          valueLabel={`${viewportWidth}px`}
          aria-valuetext={`${viewportWidth}px, ${activeLayout.name} layout`}
          onChange={(event) => setViewportWidth(Number(event.target.value))}
          marks={composition.layouts.map((layout) => ({
            value: layout.minWidth,
            label: `${layout.name} ${layout.minWidth}px`,
            active: layout.id === activeLayout.id,
          }))}
          marksLabel="Jump to a breakpoint"
          onMarkSelect={setViewportWidth}
        />
      </div>

      <div className={styles.previewWrapper} style={{ width: viewportWidth }}>
        <PasterComposition composition={composition} resolveContent={resolveContent} viewportWidth={viewportWidth} />
      </div>
    </section>
  );
}
