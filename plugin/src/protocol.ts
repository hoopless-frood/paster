export interface ExportedImage {
  path: string;
  bytes: Uint8Array;
}

export type MainToUiMessage =
  | {
      type: "generate-result";
      ok: true;
      compositionName: string;
      layoutCount: number;
      warnings: string[];
      json: string;
    }
  | { type: "generate-result"; ok: false; errors: string[] }
  | { type: "zip-result"; ok: true; compositionName: string; json: string; images: ExportedImage[] }
  | { type: "zip-result"; ok: false; errors: string[] };

export type UiToMainMessage = { type: "generate" } | { type: "export-zip" };
