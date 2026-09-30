import type { Composition } from "@paster/core";

export interface JsonPanelProps {
  sampleComposition: Composition;
  onImport: (composition: Composition) => void;
  /**
   * A ZIP export carries its own image bytes alongside the composition, so
   * it's reported separately from onImport: the asset map replaces whatever
   * a previous ZIP import provided, while plain onImport calls (typing,
   * pasting, a .json upload, the debounced re-validation of this same text
   * a moment later) never touch it, so images loaded from a ZIP survive
   * ordinary edits to the JSON.
   */
  onImportZip: (composition: Composition, assetUrls: Map<string, string>) => void;
  /** Reports whether the current JSON has validation errors, so the tab itself can show it. */
  onErrorsChange: (hasErrors: boolean) => void;
  /** Called once a previous page load's ZIP images have been restored, or have failed to. */
  onRestoreComplete: () => void;
}
