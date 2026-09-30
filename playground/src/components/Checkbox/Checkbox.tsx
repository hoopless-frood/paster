import type { CheckboxProps } from "./Checkbox.types";
import styles from "./Checkbox.module.css";

export type { CheckboxProps } from "./Checkbox.types";

export function Checkbox({ label, className, ...props }: CheckboxProps) {
  return (
    <label className={className ? `${styles.label} ${className}` : styles.label}>
      <input type="checkbox" className={styles.checkbox} {...props} />
      {label}
    </label>
  );
}
