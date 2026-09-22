import type { ReactNode } from "react";

export interface FileUploadButtonProps {
  children: ReactNode;
  accept?: string;
  disabled?: boolean;
  onFileSelected: (file: File) => void;
}
