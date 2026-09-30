import type { ReactNode } from "react";
import type { ButtonProps } from "../Button/Button.types";

export interface FileUploadButtonProps extends Pick<ButtonProps, "loading" | "loadingLabel"> {
  children: ReactNode;
  accept?: string;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
}
