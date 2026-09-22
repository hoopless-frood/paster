import type { Composition, Layout } from "./types";

/**
 * Mobile-first breakpoint selection: the active layout is the one with the
 * largest `minWidth` that does not exceed `viewportWidth`. Assumes `composition`
 * already satisfies validateComposition's invariants (a unique layout at
 * minWidth 0, unique thresholds).
 */
export function selectLayout(composition: Composition, viewportWidth: number): Layout {
  if (composition.layouts.length === 0) {
    throw new Error("selectLayout: composition has no layouts");
  }

  const sorted = [...composition.layouts].sort((a, b) => a.minWidth - b.minWidth);

  let selected = sorted[0];
  for (const layout of sorted) {
    if (layout.minWidth <= viewportWidth) {
      selected = layout;
    } else {
      break;
    }
  }

  return selected;
}
