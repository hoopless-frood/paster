export const COMPOSITION_SCHEMA_VERSION = 1;

export interface Asset {
  id: string;
  /** Relative, portable path within the export (or ZIP); never a URL or absolute path. */
  path: string;
  width: number;
  height: number;
  alt?: string;
}

export interface Item {
  /** Stable identity linking the same content across layouts. */
  id: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Independent per-layout stacking order (0 = furthest back). */
  zIndex: number;
  assetId?: string;
}

export interface Layout {
  id: string;
  name: string;
  /** Viewport width (CSS px) at which this layout becomes active. Exactly one layout must be 0. */
  minWidth: number;
  /** Design-space width of the layout. */
  width: number;
  /** Design-space height of the layout. */
  height: number;
  /** CSS color (e.g. a hex or rgba() string) from the layout frame's own Figma fill. Independent per layout, like everything else here. Omitted when the source frame has no solid fill. */
  backgroundColor?: string;
  items: Item[];
}

export interface Composition {
  version: typeof COMPOSITION_SCHEMA_VERSION;
  id: string;
  name: string;
  layouts: Layout[];
  assets: Asset[];
}
