import type { Composition } from "@paster/core";

export interface JsonPanelProps {
  sampleComposition: Composition;
  onImport: (composition: Composition) => void;
  /** Reports whether the current JSON has validation errors, so the tab itself can show it. */
  onErrorsChange: (hasErrors: boolean) => void;
}
