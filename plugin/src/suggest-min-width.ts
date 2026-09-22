export interface WidthLike {
  name: string;
  width: number;
}

/**
 * Suggests a starting minWidth per layout, purely from each layout's own
 * design-space width — a starting point for the UI's (editable) input, not
 * a silent substitute for it. Sorted by width, the smallest layout suggests
 * 0 (the required base layout) and each other layout suggests the midpoint
 * between itself and the next-smaller layout, so each layout's range
 * extends outward toward its neighbors in both directions.
 */
export function suggestMinWidths(layouts: WidthLike[]): Record<string, number> {
  const sorted = [...layouts].sort((a, b) => a.width - b.width);
  const suggestions: Record<string, number> = {};

  sorted.forEach((layout, index) => {
    if (index === 0) {
      suggestions[layout.name] = 0;
      return;
    }

    const previous = sorted[index - 1];
    suggestions[layout.name] = Math.round((previous.width + layout.width) / 2);
  });

  return suggestions;
}
