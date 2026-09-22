export interface LayoutSummary {
  name: string;
  /** A starting value for the min-width input, computed from frame widths — always user-editable, never silently substituted. */
  suggestedMinWidth: number;
}

/** Self-contained (not imported from figma-export.ts): protocol.ts is shared with the UI thread, which can't import main-thread-only Figma types. */
export type ImageFormat = "PNG" | "JPG" | "SVG";

export interface ExportedImage {
  path: string;
  bytes: Uint8Array;
}

export type MainToUiMessage =
  | { type: "scan-result"; ok: true; compositionName: string; layouts: LayoutSummary[]; warnings: string[] }
  | { type: "scan-result"; ok: false; errors: string[] }
  | { type: "export-result"; ok: true; mode: "json"; json: string; warnings: string[] }
  | {
      type: "export-result";
      ok: true;
      mode: "zip";
      compositionName: string;
      json: string;
      images: ExportedImage[];
      warnings: string[];
    }
  | { type: "export-result"; ok: false; errors: string[] };

export type UiToMainMessage =
  | { type: "scan" }
  | { type: "export"; minWidths: Record<string, number>; mode: "json" }
  | { type: "export"; minWidths: Record<string, number>; mode: "zip"; format: ImageFormat };
