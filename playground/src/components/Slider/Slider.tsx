import type { CSSProperties } from "react";
import type { SliderProps } from "./Slider.types";
import styles from "./Slider.module.css";

export type { SliderMark, SliderProps } from "./Slider.types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function fractionOf(value: number, min: number, max: number): number {
  return max > min ? (clamp(value, min, max) - min) / (max - min) : 0;
}

export function Slider({ className, marks, onMarkSelect, marksLabel, valueLabel, ...props }: SliderProps) {
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 100);

  return (
    <div className={styles.root}>
      {valueLabel !== undefined && (
        <div className={styles.valueRow} aria-hidden="true">
          <span
            className={styles.value}
            style={{ "--fraction": fractionOf(Number(props.value ?? min), min, max) } as CSSProperties}
          >
            {valueLabel}
          </span>
        </div>
      )}
      <input type="range" className={className ? `${styles.slider} ${className}` : styles.slider} {...props} />
      {marks && marks.length > 0 && (
        <div className={styles.marks} role="group" aria-label={marksLabel}>
          {marks.map((mark, index) => {
            const value = clamp(mark.value, min, max);
            return (
              <button
                key={index}
                type="button"
                className={mark.active ? `${styles.mark} ${styles.activeMark}` : styles.mark}
                style={{ "--fraction": fractionOf(value, min, max) } as CSSProperties}
                onClick={() => onMarkSelect?.(value)}
              >
                {mark.label}
                {mark.active && <span className="visually-hidden"> (active)</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
