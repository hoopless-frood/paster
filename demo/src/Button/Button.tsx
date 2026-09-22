import type { ButtonProps } from "./Button.types";
import styles from "./Button.module.css";

export type { ButtonProps } from "./Button.types";

/** Standardized button appearance — defaults type="button" so it never accidentally submits a form. */
export function Button({ type = "button", className, ...props }: ButtonProps) {
  return <button type={type} className={className ? `${styles.button} ${className}` : styles.button} {...props} />;
}
