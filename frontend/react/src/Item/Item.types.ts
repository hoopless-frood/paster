import type { Asset, Composition, Item, Layout } from "@paster/core";
import type { ReactNode } from "react";

/** Resolves what an item renders. Paster never invents content or alt text — that's the consumer's call. */
export type ItemContentResolver = (
  item: Item,
  context: { layout: Layout; asset: Asset | undefined; composition: Composition },
) => ReactNode;

export interface PasterItemProps {
  item: Item;
  context: { layout: Layout; asset: Asset | undefined; composition: Composition };
  resolveContent: ItemContentResolver;
}
