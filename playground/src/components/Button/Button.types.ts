import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "primary" (default) for the main action in a group; "secondary" for quieter alternatives. */
  variant?: "primary" | "secondary";
  /** Label shown while `loading`. The button keeps the width of its wider label, so switching doesn't shift the layout. */
  loadingLabel?: ReactNode;
  /** Shows `loadingLabel` and disables the button. */
  loading?: boolean;
}
