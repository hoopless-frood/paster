import type { Composition } from "@paster/core";

export interface ItemOutlinesProps {
  composition: Composition;
  /** Must match the preview's own viewportWidth, so both select the same layout. */
  viewportWidth: number;
}
