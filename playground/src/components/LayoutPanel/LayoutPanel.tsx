import { selectLayout } from "@paster/core";
import { PasterComposition } from "@paster/react";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Slider } from "../Slider/Slider";
import { createAssetContentResolver } from "./asset-content";
import type { LayoutPanelProps } from "./LayoutPanel.types";
import styles from "./LayoutPanel.module.css";

export type { LayoutPanelProps } from "./LayoutPanel.types";

const MIN_PREVIEW_WIDTH = 280;

// The slider reaches the widest breakpoint on any screen (past it, the same
// layout only scales), or the full window if that's wider.
function maxPreviewWidthFor(composition: LayoutPanelProps["composition"], windowWidth: number): number {
  return Math.max(windowWidth, ...composition.layouts.map((layout) => layout.minWidth));
}

// Read once, as a starting point only: the simulated width is independent of
// the real window afterwards, and CSS scales the preview down if it doesn't fit.
function initialPreviewWidth(): number {
  return Math.max(window.innerWidth, MIN_PREVIEW_WIDTH);
}

export function LayoutPanel({ composition, assetUrls, imagesRestoring }: LayoutPanelProps) {
  const [previewWidth, setPreviewWidth] = useState(initialPreviewWidth);
  // Only raises the slider's range as the window grows; it never moves the slider.
  const [widestWindowWidth, setWidestWindowWidth] = useState(() => window.innerWidth);
  const widthInputId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);

  // Independently re-derives the active layout with the same function the
  // renderer uses internally, so this info can never drift from what's shown.
  const activeLayout = selectLayout(composition, previewWidth);

  const resolveContent = useMemo(
    () => createAssetContentResolver(assetUrls, imagesRestoring),
    [assetUrls, imagesRestoring],
  );

  // The preview renders at exactly the slider's width, so the composition's
  // container queries see that width; it's only scaled down visually to fit.
  // CSS can't compute that scale (it needs a length divided by a length), so
  // the available width is measured here, before paint.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const observer = new ResizeObserver(() => setStageWidth(stage.clientWidth));
    observer.observe(stage);
    setStageWidth(stage.clientWidth);
    return () => observer.disconnect();
  }, []);

  const scale = stageWidth > 0 ? Math.min(1, stageWidth / previewWidth) : 1;
  const previewHeight = (previewWidth * activeLayout.height) / activeLayout.width;

  useEffect(() => {
    const updateWindowWidth = () => setWidestWindowWidth((widest) => Math.max(widest, window.innerWidth));
    window.addEventListener("resize", updateWindowWidth);
    return () => window.removeEventListener("resize", updateWindowWidth);
  }, []);

  return (
    <section className={styles.panel} aria-label="Layout">
      <div className={styles.widthGroup}>
        <label htmlFor={widthInputId} className="visually-hidden">
          Preview width
        </label>

        <Slider
          id={widthInputId}
          min={MIN_PREVIEW_WIDTH}
          max={maxPreviewWidthFor(composition, widestWindowWidth)}
          value={previewWidth}
          valueLabel={`${previewWidth}px`}
          aria-valuetext={`${previewWidth}px, ${activeLayout.name} layout`}
          onChange={(event) => setPreviewWidth(Number(event.target.value))}
          marks={composition.layouts.map((layout) => ({
            value: layout.minWidth,
            label: `${layout.name} ${layout.minWidth}px`,
            active: layout.id === activeLayout.id,
          }))}
          marksLabel="Jump to a breakpoint"
          onMarkSelect={setPreviewWidth}
        />
      </div>

      {/* Takes the scaled height, since a transform doesn't shrink the space an element occupies. */}
      <div ref={stageRef} className={styles.stage} style={{ height: previewHeight * scale }}>
        <div className={styles.previewWrapper} style={{ width: previewWidth, transform: `scale(${scale})` }}>
          <PasterComposition composition={composition} resolveContent={resolveContent} />
        </div>
      </div>
    </section>
  );
}
