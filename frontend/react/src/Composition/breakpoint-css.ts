import type { Layout } from "@paster/core";

/**
 * The CSS that shows one layout at a time. CSS can't take breakpoints from
 * custom properties (var() isn't allowed in @container conditions), so the
 * data-driven part is generated: the base layout is shown by default, then
 * one @container rule per breakpoint, widest last so the widest match wins.
 * Layouts are addressed by index, never by id, so no id text reaches CSS.
 */
export function breakpointCss(scope: string, layouts: Layout[]): string {
  const layoutSelector = (index: number) => `[data-paster-scope="${scope}"] > [data-paster-layout-index="${index}"]`;
  const anyLayout = `[data-paster-scope="${scope}"] > [data-paster-layout-index]`;

  const byMinWidth = layouts.map((layout, index) => ({ minWidth: layout.minWidth, index })).sort((a, b) => a.minWidth - b.minWidth);

  return byMinWidth
    .map(({ minWidth, index }) =>
      minWidth === 0
        ? `${layoutSelector(index)} { display: block; }`
        : `@container (min-width: ${Number(minWidth)}px) { ${anyLayout} { display: none; } ${layoutSelector(index)} { display: block; } }`,
    )
    .join("\n");
}
