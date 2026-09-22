export interface ScannedItem {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface ScannedLayout {
  name: string;
  width: number;
  height: number;
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

type SupportedItemNode = Extract<SceneNode, { type: SupportedItemType }>;
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
 * Reads the current Figma selection and extracts layout/item geometry.
 * Always re-derives from live selection state — callers should call this
 * fresh rather than cache the result, so moving/resizing/reordering layers
 * before export is reflected in the output.
 *
 * Only an invalid/missing selection is a hard failure. Everything else we
 * don't support yet (rotation, Auto Layout, groups, other unsupported node
 * types, duplicate names) is skipped individually and reported as a
 * warning, so one problem layer doesn't block exporting the rest of an
 * otherwise-valid composition.
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
    layouts.push({ name: layoutNode.name, width: layoutNode.width, height: layoutNode.height, items });
  }

  if (layouts.length === 0) {
    return { ok: false, errors: [`"${parent.name}" has no exportable layouts.`, ...warnings] };
  }

  return { ok: true, compositionName: parent.name, layouts, warnings };
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

    if (isRotated(child.rotation)) {
      warnings.push(`Skipped "${layoutNode.name}/${child.name}": rotation isn't supported yet.`);
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
    });
  }

  return items;
}
