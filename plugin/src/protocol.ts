export interface LayoutSummary {
  name: string;
}

export type MainToUiMessage =
  | { type: "scan-result"; ok: true; compositionName: string; layouts: LayoutSummary[] }
  | { type: "scan-result"; ok: false; errors: string[] }
  | { type: "export-result"; ok: true; json: string }
  | { type: "export-result"; ok: false; errors: string[] };

export type UiToMainMessage =
  | { type: "scan" }
  | { type: "export"; minWidths: Record<string, number> };
