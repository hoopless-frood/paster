import type { ButtonProps } from "./Button.types";
import styles from "./Button.module.css";

export type { ButtonProps } from "./Button.types";

/** Standardized button appearance — defaults type="button" so it never accidentally submits a form. */
export function Button({
  type = "button",
  variant = "primary",
  loadingLabel,
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    styles.button,
    variant === "secondary" && styles.secondary,
    loadingLabel !== undefined && styles.stacked,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loadingLabel === undefined ? (
        children
      ) : (
        <>
          <span className={loading ? styles.hiddenLabel : styles.label}>{children}</span>
          <span className={loading ? styles.label : styles.hiddenLabel}>{loadingLabel}</span>
        </>
      )}
    </button>
  );
}
