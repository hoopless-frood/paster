export interface LayoutSummary {
  name: string;
  /** A starting value for the min-width input, computed from frame widths — always user-editable, never silently substituted. */
  suggestedMinWidth: number;
}

export type MainToUiMessage =
  | { type: "scan-result"; ok: true; compositionName: string; layouts: LayoutSummary[]; warnings: string[] }
  | { type: "scan-result"; ok: false; errors: string[] }
  | { type: "export-result"; ok: true; json: string; warnings: string[] }
  | { type: "export-result"; ok: false; errors: string[] };

export type UiToMainMessage =
  | { type: "scan" }
  | { type: "export"; minWidths: Record<string, number> };
