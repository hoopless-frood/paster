import type { Composition, Layout } from "./types.js";

/**
 * Mobile-first breakpoint selection: the active layout is the one with the
 * largest `minWidth` that does not exceed `width`, the composition's own
 * width. Renderers can do the same in CSS (as @paster/react does); this is
 * for code that needs the answer itself. Assumes `composition` already
 * satisfies validateComposition's invariants (a unique layout at minWidth 0,
 * unique thresholds).
 */
export function selectLayout(composition: Composition, width: number): Layout {
  if (composition.layouts.length === 0) {
    throw new Error("selectLayout: composition has no layouts");
  }

  const sorted = [...composition.layouts].sort((a, b) => a.minWidth - b.minWidth);

  let selected = sorted[0];
  for (const layout of sorted) {
    if (layout.minWidth <= width) {
      selected = layout;
    } else {
      break;
    }
  }

  return selected;
}
