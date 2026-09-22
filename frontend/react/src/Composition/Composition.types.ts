import type { Composition } from "@paster/core";
import type { ItemContentResolver } from "../Item/Item";

export interface PasterCompositionProps {
  composition: Composition;
  resolveContent: ItemContentResolver;
  /** Omit to track window.innerWidth reactively; pass explicitly for SSR determinism, tests, or a fixed embed. */
  viewportWidth?: number;
  className?: string;
}
