import type { InputHTMLAttributes, ReactNode } from "react";

export interface SliderMark {
  /** Same units as min/max; clamped into range for positioning. */
  value: number;
  label: ReactNode;
  /** Highlights the mark, e.g. the breakpoint currently in effect. */
  active?: boolean;
}

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Clickable marks shown under the track, each exactly where the thumb's center would be at that value. */
  marks?: SliderMark[];
  /** Called with a mark's (clamped) value when it's clicked. */
  onMarkSelect?: (value: number) => void;
  /** Accessible name for the group of marks. */
  marksLabel?: string;
  /** Shown just above the thumb, following it. Visual only: use aria-valuetext for assistive tech. */
  valueLabel?: ReactNode;
};
