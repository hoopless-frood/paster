export interface ScannedItem {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  /** Clockwise degrees (already converted from Figma's own counterclockwise-positive convention — see figmaRotationToCss), 0 for unrotated. */
  rotation: number;
  /** The live Figma node this item was scanned from, for image export. Never sent to the UI thread (not cloneable) — internal to the main thread only. Optional so test fixtures can omit it. */
  node?: SupportedItemNode;
}

export interface ScannedLayout {
  name: string;
  width: number;
  height: number;
  /** CSS color from the layout frame's own topmost visible solid fill. Omitted when there's no solid fill (mixed, gradient, image, or none). */
  backgroundColor?: string;
  /** The layout frame's own "Clip content" setting. */
  clipsContent: boolean;
  items: ScannedItem[];
}

export interface ScanSuccess {
  ok: true;
  compositionName: string;
  layouts: ScannedLayout[];
  /** Unsupported/duplicate content that was skipped rather than blocking the export. */
  warnings: string[];
}

export interface ScanFailure {
  ok: false;
  /** Selection problems with no reasonable way to proceed: nothing was exported. */
  errors: string[];
}

export type ScanOutcome = ScanSuccess | ScanFailure;

export type ImageFormat = "PNG" | "SVG";

export const IMAGE_EXTENSIONS: Record<ImageFormat, string> = {
  PNG: "png",
  SVG: "svg",
};

/**
 * Renders a single item to image bytes covering exactly its own unrotated
 * width × height — the box the schema (and so every renderer) places and
 * rotates the image in. Runs on the main thread (only nodes have
 * exportAsync); rejects if Figma's own export fails.
 *
 * exportAsync renders a node as it appears on the canvas, which breaks that
 * contract twice: a rotated node comes out already rotated (inside its
 * larger bounding box), and any part hanging past a clipping layout frame
 * is cropped off. A renderer then rotates the image a second time and
 * stretches whatever survived the crop across the full box. So this exports
 * a temporary copy instead: moved to the page (out of reach of the layout's
 * clipping), unrotated, and exported at its full bounds rather than its
 * visible render bounds.
 *
 * Trade-off: useAbsoluteBounds also crops effects that paint outside the
 * layer's own box (e.g. a drop shadow), since the image must match the box.
 */
export async function exportItemImage(node: SupportedItemNode, format: ImageFormat): Promise<Uint8Array> {
  const copy = node.clone();
  figma.currentPage.appendChild(copy);
  try {
    copy.rotation = 0;
    if (format === "SVG") {
      return await copy.exportAsync({ format: "SVG", useAbsoluteBounds: true });
    }
    return await copy.exportAsync({ format, useAbsoluteBounds: true, constraint: { type: "SCALE", value: 1 } });
  } finally {
    copy.remove();
  }
}

/** Node types that are inherently drawn vector shapes — always worth keeping as SVG, since rasterizing them is a pure loss of scalability. */
const VECTOR_ITEM_TYPES = new Set<SupportedItemNode["type"]>([
  "VECTOR",
  "BOOLEAN_OPERATION",
  "STAR",
  "POLYGON",
  "LINE",
]);

/**
 * Content that only a raster image represents faithfully: a photo fill, or
 * text (which SVG export would turn into heavy vector outlines).
 */
function needsRaster(node: SceneNode): boolean {
  if (node.type === "TEXT") {
    return true;
  }
  if (!("fills" in node)) {
    return false;
  }
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) {
    return true;
  }
  return fills.some((fill) => fill.visible !== false && fill.type === "IMAGE");
}

/**
 * Picks each item's export format individually, since a real Figma file
 * routinely mixes vector icons with photos in the same layout: flat vector
 * content stays a scalable SVG, and anything else rasterizes to PNG. PNG
 * (never JPG) because it's lossless and keeps transparency, and because
 * these images are a starting point that a CMS will re-optimize, not the
 * final delivery format.
 */
export function formatForNode(node: SupportedItemNode): ImageFormat {
  if (VECTOR_ITEM_TYPES.has(node.type)) {
    return "SVG";
  }
  if (needsRaster(node)) {
    return "PNG";
  }
  // A frame, component, instance or group exports as one image of
  // everything inside it, so its contents decide too: a photo inside a
  // plain-colored frame would otherwise end up base64-embedded in an SVG.
  if ("findOne" in node && node.findOne((child) => child.visible && needsRaster(child))) {
    return "PNG";
  }
  return "SVG";
}

const ROTATION_EPSILON = 0.01;

const SUPPORTED_ITEM_TYPES = new Set<SceneNode["type"]>([
  "FRAME",
  "COMPONENT",
  "INSTANCE",
  "RECTANGLE",
  "ELLIPSE",
  "VECTOR",
  "TEXT",
  "LINE",
  "STAR",
  "POLYGON",
  "BOOLEAN_OPERATION",
  // A group is exported as one image of everything in it, like a frame.
  "GROUP",
]);

export type SupportedItemNode = Extract<SceneNode, { type: SupportedItemType }>;
type SupportedItemType =
  | "FRAME"
  | "COMPONENT"
  | "INSTANCE"
  | "RECTANGLE"
  | "ELLIPSE"
  | "VECTOR"
  | "TEXT"
  | "LINE"
  | "STAR"
  | "POLYGON"
  | "BOOLEAN_OPERATION"
  | "GROUP";

function isSupportedItemNode(node: SceneNode): node is SupportedItemNode {
  return SUPPORTED_ITEM_TYPES.has(node.type);
}

function isRotated(rotation: number): boolean {
  return Math.abs(rotation) > ROTATION_EPSILON;
}

/**
 * Figma's `node.rotation` is counterclockwise-positive, and its Rotation
 * field shows the same value (a layer at 151.43° there reads 151.43 here).
 * The composition schema, like CSS's `rotate()` that ultimately renders
 * it, is clockwise-positive, so the exported value is the negation of what
 * a designer sees in Figma. Converting once here, at the export boundary,
 * means everything downstream can treat `rotation` as ordinary clockwise
 * degrees.
 */
export function figmaRotationToCss(rotation: number): number {
  if (Math.abs(rotation) <= ROTATION_EPSILON) {
    return 0;
  }
  return Math.round(-rotation * 100) / 100;
}

/**
 * Reads the current Figma selection and extracts layout/item geometry.
 * Always re-derives from live selection state — callers should call this
 * fresh rather than cache the result, so moving/resizing/reordering layers
 * before export is reflected in the output.
 *
 * Only an invalid/missing selection is a hard failure. Everything else we
 * don't support yet (a rotated *layout* or composition frame, Auto Layout,
 * unsupported node types, duplicate names) is skipped
 * individually and reported as a warning, so one problem layer doesn't
 * block exporting the rest of an otherwise-valid composition. An item's own
 * rotation is fully supported — see figmaRotationToCss.
 */
export function scanSelection(): ScanOutcome {
  const selection = figma.currentPage.selection;

  if (selection.length !== 1) {
    return {
      ok: false,
      errors: ["Select exactly one parent frame (the composition) before scanning."],
    };
  }

  const parent = selection[0];

  if (parent.type !== "FRAME") {
    return {
      ok: false,
      errors: [
        `"${parent.name}" is a ${parent.type.toLowerCase()}, not a frame. Select the parent frame that contains your layouts.`,
      ],
    };
  }

  const warnings: string[] = [];

  if (isRotated(parent.rotation)) {
    warnings.push(
      `"${parent.name}" is rotated — this hasn't been tested; double-check the exported geometry.`,
    );
  }

  if (parent.layoutMode !== "NONE") {
    warnings.push(
      `"${parent.name}" uses Auto Layout — this hasn't been tested; double-check the exported geometry.`,
    );
  }

  const layoutCandidates = parent.children.filter(
    (child): child is FrameNode => child.type === "FRAME" && child.visible,
  );

  const layouts: ScannedLayout[] = [];
  const layoutNames = new Set<string>();

  for (const layoutNode of layoutCandidates) {
    if (layoutNames.has(layoutNode.name)) {
      warnings.push(`Skipped layout "${layoutNode.name}": duplicate layout name.`);
      continue;
    }

    if (isRotated(layoutNode.rotation)) {
      warnings.push(`Skipped layout "${layoutNode.name}": rotation isn't supported yet.`);
      continue;
    }

    if (layoutNode.layoutMode !== "NONE") {
      warnings.push(`Skipped layout "${layoutNode.name}": Auto Layout isn't supported yet.`);
      continue;
    }

    const items = scanLayoutItems(layoutNode, warnings);

    if (items.length === 0) {
      warnings.push(`Skipped layout "${layoutNode.name}": no visible, supported child layers.`);
      continue;
    }

    layoutNames.add(layoutNode.name);
    layouts.push({
      name: layoutNode.name,
      width: layoutNode.width,
      height: layoutNode.height,
      backgroundColor: extractBackgroundColor(layoutNode),
      clipsContent: layoutNode.clipsContent,
      items,
    });
  }

  if (layouts.length === 0) {
    return { ok: false, errors: [`"${parent.name}" has no exportable layouts.`, ...warnings] };
  }

  return { ok: true, compositionName: parent.name, layouts, warnings };
}

/**
 * The layout frame's topmost visible fill, if it's a plain solid color.
 * Figma paints render bottom-to-top, so the last visible entry in `fills`
 * is what's actually shown; a gradient/image on top, or a mixed/empty fill,
 * has no single CSS color to report, so this omits it rather than guess.
 */
function extractBackgroundColor(node: FrameNode): string | undefined {
  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) {
    return undefined;
  }

  const visibleFills = fills.filter((fill) => fill.visible !== false);
  const topFill = visibleFills[visibleFills.length - 1];
  if (!topFill || topFill.type !== "SOLID") {
    return undefined;
  }

  return solidPaintToCss(topFill);
}

function solidPaintToCss(fill: SolidPaint): string {
  const { r, g, b } = fill.color;
  const opacity = fill.opacity ?? 1;
  const toByte = (channel: number) => Math.round(channel * 255);
  const toHex = (channel: number) => toByte(channel).toString(16).padStart(2, "0");

  if (opacity >= 1) {
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  return `rgba(${toByte(r)}, ${toByte(g)}, ${toByte(b)}, ${Number(opacity.toFixed(3))})`;
}

function scanLayoutItems(layoutNode: FrameNode, warnings: string[]): ScannedItem[] {
  const visibleChildren = layoutNode.children.filter((child) => child.visible);
  const items: ScannedItem[] = [];
  const itemNames = new Set<string>();
  let zIndex = 0;

  for (const child of visibleChildren) {
    if (!isSupportedItemNode(child)) {
      warnings.push(`Skipped "${layoutNode.name}/${child.name}": a ${child.type.toLowerCase()} isn't supported yet.`);
      continue;
    }

    if (itemNames.has(child.name)) {
      warnings.push(
        `Skipped "${layoutNode.name}/${child.name}": duplicate layer name within this layout.`,
      );
      continue;
    }
    itemNames.add(child.name);

    // Reassigned contiguously over the *kept* children, so a skip never
    // leaves a gap — zIndex still means "0 = furthest back among what's exported".
    items.push({
      name: child.name,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
      zIndex: zIndex++,
      rotation: figmaRotationToCss(child.rotation),
      node: child,
    });
  }

  return items;
}
