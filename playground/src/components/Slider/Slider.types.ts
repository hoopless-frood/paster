import type { InputHTMLAttributes } from "react";

export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Values (same units as min/max) to mark with a tick line on the track. */
  ticks?: number[];
};
