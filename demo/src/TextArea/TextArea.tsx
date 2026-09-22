import type { TextAreaProps } from "./TextArea.types";
import styles from "./TextArea.module.css";

export type { TextAreaProps } from "./TextArea.types";

export function TextArea({ className, ...props }: TextAreaProps) {
  return <textarea className={className ? `${styles.textarea} ${className}` : styles.textarea} {...props} />;
}
