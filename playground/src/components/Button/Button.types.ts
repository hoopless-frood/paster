import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "primary" (default) for the main action in a group; "secondary" for quieter alternatives. */
  variant?: "primary" | "secondary";
}
