import type { CSSProperties } from "react";
import type { SliderProps } from "./Slider.types";
import styles from "./Slider.module.css";

export type { SliderProps } from "./Slider.types";

// The track's tick marks are painted as layers in the ::-webkit-slider-runnable-track
// background (see Slider.module.css) — a native range input's thumb is a
// pseudo-element of the same input, so that's the only way to render a mark
// that's above the track but below the thumb. Since CSS can't loop over a
// dynamic list, positions are passed as a fixed number of --tick-N custom
// properties; unused slots are pushed off-track.
const MAX_TICKS = 6;

export function Slider({ className, ticks, style, ...props }: SliderProps) {
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);
  const tickVars: Record<string, string> = {};
  for (let index = 0; index < MAX_TICKS; index++) {
    const tick = ticks?.[index];
    tickVars[`--tick-${index}`] =
      tick === undefined || max <= min ? "-100%" : `${((tick - min) / (max - min)) * 100}%`;
  }

  return (
    <input
      type="range"
      className={className ? `${styles.slider} ${className}` : styles.slider}
      style={{ ...tickVars, ...style } as CSSProperties}
      {...props}
    />
  );
}
