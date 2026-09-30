import type { Composition } from "@paster/core";

export interface LayoutPanelProps {
  composition: Composition;
  /** Asset.path -> blob: URL, from an imported ZIP export. Items whose asset isn't in here fall back to a placeholder box. */
  assetUrls: Map<string, string>;
  /** True while a previous page load's ZIP images are being restored. */
  imagesRestoring: boolean;
}
