import {
  COMPOSITION_SCHEMA_VERSION,
  validateComposition,
  type Composition,
  type ValidationResult,
} from "@paster/core";
import {
  exportItemImage,
  formatForNode,
  IMAGE_EXTENSIONS,
  type ScanSuccess,
  type SupportedItemNode,
} from "./figma-export";
import type { ExportedImage } from "./protocol";

/** Above this, a single export risks running too long / too large in the plugin sandbox — fail explicitly rather than let it hang or produce a partial ZIP. */
const MAX_EXPORTABLE_ITEMS = 300;

export type ImageExportOutcome =
  | { ok: true; composition: Composition; images: ExportedImage[] }
  | { ok: false; errors: string[] };

/**
 * Derives each layout's minWidth from frame widths alone: the narrowest
 * layout gets 0 (the required base layout), and each other layout the
 * midpoint between its width and the next-narrower one. There's no plugin
 * setting; it's adjusted later in the JSON or editor if needed.
 */
export function deriveMinWidths(layouts: { name: string; width: number }[]): Record<string, number> {
  const sorted = [...layouts].sort((a, b) => a.width - b.width);
  const minWidths: Record<string, number> = {};
  sorted.forEach((layout, index) => {
    minWidths[layout.name] = index === 0 ? 0 : Math.round((sorted[index - 1].width + layout.width) / 2);
  });
  return minWidths;
}

/**
 * Builds a Composition from a fresh scan and validates it against
 * @paster/core. Geometry-only — no assets/assetIds; call attachImages() on
 * the result for a ZIP export with images.
 */
export function assembleComposition(scan: ScanSuccess): ValidationResult {
  const minWidths = deriveMinWidths(scan.layouts);
  const composition: Composition = {
    version: COMPOSITION_SCHEMA_VERSION,
    id: scan.compositionName,
    name: scan.compositionName,
    assets: [],
    layouts: scan.layouts.map((layout) => ({
      id: layout.name,
      name: layout.name,
      minWidth: minWidths[layout.name],
      width: layout.width,
      height: layout.height,
      backgroundColor: layout.backgroundColor,
      // Defaults (clipped, unrotated) are omitted to keep the JSON minimal.
      clipsContent: layout.clipsContent === true ? undefined : layout.clipsContent,
      items: layout.items.map((item) => ({
        id: item.name,
        name: item.name,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        zIndex: item.zIndex,
        rotation: item.rotation === 0 ? undefined : item.rotation,
      })),
    })),
  };

  return validateComposition(composition);
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "item";
}

/** Deterministic, collision-free per-(layout, item) stem — two items that slugify the same (e.g. "Image A" and "image-a") get -2, -3, ... appended. */
function uniqueStem(layoutName: string, itemName: string, used: Set<string>): string {
  const base = `${slugify(layoutName)}-${slugify(itemName)}`;
  let stem = base;
  let suffix = 2;
  while (used.has(stem)) {
    stem = `${base}-${suffix}`;
    suffix++;
  }
  used.add(stem);
  return stem;
}

/**
 * Renders every item's image and attaches it to the already-validated
 * composition from assembleComposition: one Asset per (layout, item) pair,
 * even when the same item id is visually identical across layouts — this
 * keeps per-layout image overrides simple to reason about, at the cost of
 * some possibly-redundant image bytes in the resulting ZIP.
 *
 * Looks up each item's live Figma node from the original scan by
 * (layout id, item id) — assembleComposition sets those to the scanned
 * layout/item names, so every item it produced has a matching node here.
 */
export async function attachImages(
  composition: Composition,
  scan: ScanSuccess,
): Promise<ImageExportOutcome> {
  const totalItems = composition.layouts.reduce((sum, layout) => sum + layout.items.length, 0);
  if (totalItems > MAX_EXPORTABLE_ITEMS) {
    return {
      ok: false,
      errors: [
        `This composition has ${totalItems} items — more than the ${MAX_EXPORTABLE_ITEMS} a single image export supports. Use Copy JSON instead, or export fewer layouts.`,
      ],
    };
  }

  const nodesByKey = new Map<string, SupportedItemNode>();
  for (const layout of scan.layouts) {
    for (const item of layout.items) {
      if (item.node) {
        nodesByKey.set(`${layout.name}::${item.name}`, item.node);
      }
    }
  }

  const images: ExportedImage[] = [];
  const assets: Composition["assets"] = [];
  const usedStems = new Set<string>();

  const newLayouts: Composition["layouts"] = [];
  for (const layout of composition.layouts) {
    const newItems: Composition["layouts"][number]["items"] = [];

    for (const item of layout.items) {
      const node = nodesByKey.get(`${layout.id}::${item.id}`);
      if (!node) {
        return {
          ok: false,
          errors: [`Couldn't find the live Figma layer for "${layout.id}/${item.id}" to export its image.`],
        };
      }

      const format = formatForNode(node);

      let bytes: Uint8Array;
      try {
        bytes = await exportItemImage(node, format);
      } catch (error) {
        return {
          ok: false,
          errors: [
            `Failed to export the image for "${layout.id}/${item.id}": ${error instanceof Error ? error.message : String(error)}`,
          ],
        };
      }

      const stem = uniqueStem(layout.id, item.id, usedStems);
      const path = `images/${stem}.${IMAGE_EXTENSIONS[format]}`;

      assets.push({ id: stem, path, width: Math.round(node.width), height: Math.round(node.height) });
      images.push({ path, bytes });
      newItems.push({ ...item, assetId: stem });
    }

    newLayouts.push({ ...layout, items: newItems });
  }

  const withImages: Composition = { ...composition, assets, layouts: newLayouts };

  const revalidated = validateComposition(withImages);
  if (!revalidated.valid) {
    return { ok: false, errors: revalidated.errors };
  }

  return { ok: true, composition: withImages, images };
}
