import type { Composition } from "@paster/core";

export interface PreviewPanelProps {
  composition: Composition;
  /** Asset.path -> blob: URL, from an imported ZIP export. Items whose asset isn't in here fall back to a placeholder box. */
  assetUrls: Map<string, string>;
}
