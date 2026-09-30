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

/** The user's raster preference — only meaningful for content that ends up rasterized at all; see formatForNode. */
export type RasterFormat = "PNG" | "JPG";
export type ImageFormat = RasterFormat | "SVG";

export const IMAGE_EXTENSIONS: Record<ImageFormat, string> = {
  PNG: "png",
  JPG: "jpg",
  SVG: "svg",
};

/** Renders a single item node to image bytes in the given format. Runs on the main thread (only nodes have exportAsync); rejects if Figma's own export fails. */
export function exportItemImage(node: SupportedItemNode, format: ImageFormat): Promise<Uint8Array> {
  if (format === "SVG") {
    return node.exportAsync({ format: "SVG" });
  }
  return node.exportAsync({ format, constraint: { type: "SCALE", value: 1 } });
}

/** Node types that are inherently drawn vector shapes — always worth keeping as SVG, since rasterizing them is a pure loss of scalability. */
const VECTOR_ITEM_TYPES = new Set<SupportedItemNode["type"]>([
  "VECTOR",
  "BOOLEAN_OPERATION",
  "STAR",
  "POLYGON",
  "LINE",
]);

/** Node types whose `fills` decide raster vs. vector: an image fill means real photographic content (rasterize); anything else (solid, gradient, none) is still flat vector content. */
type FillCheckableNode = Extract<SupportedItemNode, { fills: unknown }>;

function isFillCheckable(node: SupportedItemNode): node is FillCheckableNode {
  return "fills" in node;
}

/** The topmost (last-painted) visible IMAGE fill, if any — mirrors extractBackgroundColor's bottom-to-top reasoning. */
function topImageFill(fills: Paint[]): ImagePaint | undefined {
  const visibleImageFills = fills.filter(
    (fill): fill is ImagePaint => fill.visible !== false && fill.type === "IMAGE",
  );
  return visibleImageFills[visibleImageFills.length - 1];
}

/**
 * PNG is the only common source format an image fill can carry that
 * supports alpha, so this is what decides whether a fill's transparency
 * (if any) needs to be preserved through export. Checks the actual source
 * bytes' magic number rather than trusting a file extension, since Figma
 * doesn't expose the original filename. Errors (and anything that isn't
 * clearly a non-alpha format) are treated as "may need alpha" — the safe
 * direction, since the failure mode of guessing wrong is only ever a
 * slightly larger PNG, never a silently flattened image.
 */
async function fillMayNeedAlpha(fill: ImagePaint): Promise<boolean> {
  if (!fill.imageHash) {
    return false;
  }
  const image = figma.getImageByHash(fill.imageHash);
  if (!image) {
    return false;
  }
  try {
    const bytes = await image.getBytesAsync();
    const isPng = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    return !isJpeg || isPng;
  } catch {
    return true;
  }
}

/**
 * Picks the export format for a single item automatically, rather than one
 * format for an entire export — a real Figma file routinely mixes vector
 * icons with photographic images in the same layout, so forcing one format
 * on everything either rasterizes vector art needlessly or can't represent
 * a photo as a vector at all.
 *
 * Both SVG and PNG are lossless with alpha support, and nothing here ever
 * asks Figma to flatten a background onto either, so any transparency in
 * a vector shape or a PNG-sourced image fill survives export unchanged.
 * JPG has no alpha channel at all, so it's only ever used where transparency
 * either doesn't apply (text, whose surrounding area needs to *stay*
 * transparent, always uses PNG instead) or the source image is confirmed
 * opaque (a JPEG-sourced fill) — anything else defaults to PNG rather than
 * risk silently flattening a transparent image to JPG.
 */
export async function formatForNode(node: SupportedItemNode, rasterFormat: RasterFormat): Promise<ImageFormat> {
  if (VECTOR_ITEM_TYPES.has(node.type)) {
    return "SVG";
  }
  if (node.type === "TEXT") {
    return "PNG";
  }
  if (!isFillCheckable(node)) {
    return "PNG";
  }

  const fills = node.fills;
  if (fills === figma.mixed || !Array.isArray(fills)) {
    return "PNG";
  }

  const imageFill = topImageFill(fills);
  if (!imageFill) {
    return "SVG";
  }

  return (await fillMayNeedAlpha(imageFill)) ? "PNG" : rasterFormat;
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
  | "BOOLEAN_OPERATION";

function isSupportedItemNode(node: SceneNode): node is SupportedItemNode {
  return SUPPORTED_ITEM_TYPES.has(node.type);
}

function isRotated(rotation: number): boolean {
  return Math.abs(rotation) > ROTATION_EPSILON;
}

/**
 * Figma's `node.rotation` is counterclockwise-positive (the plugin API's own
 * documented convention), while the composition schema (and CSS's
 * `rotate()`, which is what ultimately renders it) is clockwise-positive —
 * the same convention Figma's own UI displays to a designer. Converting
 * once here, at the export boundary, means everything downstream (the
 * schema, the renderer) can treat "rotation" as an ordinary clockwise
 * degrees value without re-deriving this each time.
 *
 * NOTE: this specific sign flip hasn't been confirmed against a real
 * rotated Figma layer in this environment (no way to launch Figma here) —
 * verify a rotated export visually matches its source before relying on it.
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
 * groups, other unsupported node types, duplicate names) is skipped
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
      const hint = child.type === "GROUP" ? " (ungroup or flatten it)" : "";
      warnings.push(
        `Skipped "${layoutNode.name}/${child.name}": a ${child.type.toLowerCase()} isn't supported yet${hint}.`,
      );
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
