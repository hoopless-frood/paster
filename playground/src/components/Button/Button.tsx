import type { ButtonProps } from "./Button.types";
import styles from "./Button.module.css";

export type { ButtonProps } from "./Button.types";

/** Standardized button appearance — defaults type="button" so it never accidentally submits a form. */
export function Button({ type = "button", variant = "primary", className, ...props }: ButtonProps) {
  const classes = [styles.button, variant === "secondary" && styles.secondary, className].filter(Boolean).join(" ");
  return <button type={type} className={classes} {...props} />;
}
