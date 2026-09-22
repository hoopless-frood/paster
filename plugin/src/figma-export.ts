export interface ScannedFrame {
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
  frames: ScannedFrame[];
}

export interface ScanSuccess {
  ok: true;
  compositionName: string;
  layouts: ScannedLayout[];
}

export interface ScanFailure {
  ok: false;
  errors: string[];
}

export type ScanOutcome = ScanSuccess | ScanFailure;

const ROTATION_EPSILON = 0.01;

const SUPPORTED_FRAME_CHILD_TYPES = new Set<SceneNode["type"]>([
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

type SupportedFrameChildNode = Extract<SceneNode, { type: SupportedFrameChildType }>;
type SupportedFrameChildType =
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

function isSupportedFrameChild(node: SceneNode): node is SupportedFrameChildNode {
  return SUPPORTED_FRAME_CHILD_TYPES.has(node.type);
}

function isRotated(rotation: number): boolean {
  return Math.abs(rotation) > ROTATION_EPSILON;
}

/**
 * Reads the current Figma selection and extracts layout/frame geometry.
 * Always re-derives from live selection state — callers should call this
 * fresh rather than cache the result, so moving/resizing/reordering layers
 * before export is reflected in the output.
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

  if (isRotated(parent.rotation)) {
    return {
      ok: false,
      errors: [`"${parent.name}" is rotated — rotate it back to 0° before exporting.`],
    };
  }

  if (parent.layoutMode !== "NONE") {
    return {
      ok: false,
      errors: [`"${parent.name}" uses Auto Layout — Auto Layout isn't supported yet.`],
    };
  }

  const layoutNodes = parent.children.filter(
    (child): child is FrameNode => child.type === "FRAME" && child.visible,
  );

  if (layoutNodes.length === 0) {
    return {
      ok: false,
      errors: [`"${parent.name}" has no visible frame children to use as layouts.`],
    };
  }

  const errors: string[] = [];
  const layouts: ScannedLayout[] = [];
  const layoutNames = new Set<string>();

  for (const layoutNode of layoutNodes) {
    if (layoutNames.has(layoutNode.name)) {
      errors.push(`Duplicate layout name "${layoutNode.name}" — layout names must be unique.`);
      continue;
    }
    layoutNames.add(layoutNode.name);

    if (isRotated(layoutNode.rotation)) {
      errors.push(`Layout "${layoutNode.name}" is rotated — rotation isn't supported yet.`);
      continue;
    }

    if (layoutNode.layoutMode !== "NONE") {
      errors.push(`Layout "${layoutNode.name}" uses Auto Layout — Auto Layout isn't supported yet.`);
      continue;
    }

    const frames = scanLayoutChildren(layoutNode, errors);
    if (frames) {
      layouts.push({
        name: layoutNode.name,
        width: layoutNode.width,
        height: layoutNode.height,
        frames,
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, compositionName: parent.name, layouts };
}

function scanLayoutChildren(layoutNode: FrameNode, errors: string[]): ScannedFrame[] | null {
  const visibleChildren = layoutNode.children.filter((child) => child.visible);
  const frames: ScannedFrame[] = [];
  const frameNames = new Set<string>();
  let hadError = false;

  visibleChildren.forEach((child, index) => {
    if (!isSupportedFrameChild(child)) {
      const hint = child.type === "GROUP" ? " (ungroup or flatten it)" : "";
      errors.push(`"${layoutNode.name}/${child.name}" is a ${child.type.toLowerCase()}, which isn't supported yet${hint}.`);
      hadError = true;
      return;
    }

    if (isRotated(child.rotation)) {
      errors.push(`"${layoutNode.name}/${child.name}" is rotated — rotation isn't supported yet.`);
      hadError = true;
      return;
    }

    if (frameNames.has(child.name)) {
      errors.push(
        `Duplicate layer name "${child.name}" within layout "${layoutNode.name}" — names must be unique within a layout.`,
      );
      hadError = true;
      return;
    }
    frameNames.add(child.name);

    frames.push({
      name: child.name,
      x: child.x,
      y: child.y,
      width: child.width,
      height: child.height,
      zIndex: index,
    });
  });

  if (hadError) {
    return null;
  }

  if (frames.length === 0) {
    errors.push(`Layout "${layoutNode.name}" has no visible, supported child layers.`);
    return null;
  }

  return frames;
}
