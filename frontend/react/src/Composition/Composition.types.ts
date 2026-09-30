import type { Composition } from "@paster/core";
import type { ItemContentResolver } from "../Item/Item";

export interface PasterCompositionProps {
  composition: Composition;
  resolveContent: ItemContentResolver;
  className?: string;
}
