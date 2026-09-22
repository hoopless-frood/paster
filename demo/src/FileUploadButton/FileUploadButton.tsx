import { useRef } from "react";
import { Button } from "../Button/Button";
import type { FileUploadButtonProps } from "./FileUploadButton.types";

export type { FileUploadButtonProps } from "./FileUploadButton.types";

/**
 * A file picker styled as a normal Button. A native file input's "No file
 * chosen" text can't be hidden independently of its button, so this hides
 * the real input and triggers it from a visible Button instead.
 */
export function FileUploadButton({ children, accept, disabled, onFileSelected }: FileUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button onClick={() => inputRef.current?.click()} disabled={disabled}>
        {children}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ""; // allow re-selecting the same file later
          if (file) {
            onFileSelected(file);
          }
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="visually-hidden"
      />
    </>
  );
}
