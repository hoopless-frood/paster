import { selectLayout } from "@paster/core";
import { PasterComposition } from "@paster/react";
import { useId, useMemo, useState } from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import { ItemOutlines } from "../ItemOutlines/ItemOutlines";
import { Slider } from "../Slider/Slider";
import { createAssetContentResolver } from "./asset-content";
import type { LayoutPanelProps } from "./LayoutPanel.types";
import styles from "./LayoutPanel.module.css";

export type { LayoutPanelProps } from "./LayoutPanel.types";

const MIN_VIEWPORT_WIDTH = 280;
const DESKTOP_VIEWPORT_WIDTH = 1920;

// Every breakpoint must stay reachable, even one set above a typical desktop.
function maxViewportWidthFor(composition: LayoutPanelProps["composition"]): number {
  return Math.max(DESKTOP_VIEWPORT_WIDTH, ...composition.layouts.map((layout) => layout.minWidth));
}

// Read once, as a starting point only: the simulated width is independent of
// the real window, and CSS scales the preview down whenever it doesn't fit.
function initialViewportWidth(): number {
  return Math.min(Math.max(window.innerWidth, MIN_VIEWPORT_WIDTH), DESKTOP_VIEWPORT_WIDTH);
}

export function LayoutPanel({ composition, assetUrls }: LayoutPanelProps) {
  const [viewportWidth, setViewportWidth] = useState(initialViewportWidth);
  const [showOutlines, setShowOutlines] = useState(false);
  const viewportInputId = useId();

  // Independently re-derives the active layout with the same function the
  // renderer uses internally, so this info can never drift from what's shown.
  const activeLayout = selectLayout(composition, viewportWidth);

  const resolveContent = useMemo(() => createAssetContentResolver(assetUrls), [assetUrls]);

  return (
    <section className={styles.panel} aria-label="Layout">
      <Checkbox
        className={styles.checkbox}
        label="Show item outlines and IDs"
        checked={showOutlines}
        onChange={(event) => setShowOutlines(event.target.checked)}
      />

      <div className={styles.widthGroup}>
        <label htmlFor={viewportInputId}>
          <span>Viewport width: {viewportWidth}px</span> <span>({activeLayout.name})</span>
        </label>

        <Slider
          id={viewportInputId}
          min={MIN_VIEWPORT_WIDTH}
          max={maxViewportWidthFor(composition)}
          value={viewportWidth}
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
        {showOutlines && <ItemOutlines composition={composition} viewportWidth={viewportWidth} />}
      </div>
    </section>
  );
}
