import type { Item, Layout } from "@paster/core";

export interface ItemBoxStyle {
  left: string;
  top: string;
  width: string;
  height: string;
  zIndex: number;
  /** `"none"` when unrotated, so unrotated items (the common case) don't carry a needless `rotate(0deg)`. */
  transform: string;
}

const DEG_TO_RAD = Math.PI / 180;

/**
 * Figma positions a rotated node by where its own *unrotated* top-left
 * corner ends up after Figma rotates the node around its center — x/y is
 * that corner's position, not the corner of whatever box CSS will end up
 * drawing. CSS also rotates a box around its own center (the default
 * transform-origin), but that center is derived straight from left/top —
 * so using item.x/y as CSS's left/top directly only lands in the right
 * place when rotation is 0; anything else rotates around the wrong pivot
 * and the item visibly drifts off its intended position.
 *
 * This recovers the item's true center from x/y/width/height/rotation
 * (using the same rotation matrix as CSS's rotate(), since item.rotation
 * is already in that convention), then re-expresses it as the top-left
 * CSS needs so that its own center-based rotation lands the shape exactly
 * where Figma's did.
 */
function rotationAdjustedTopLeft(item: Item, rotationDeg: number): [x: number, y: number] {
  if (rotationDeg === 0) {
    return [item.x, item.y];
  }
  const theta = rotationDeg * DEG_TO_RAD;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const halfWidth = item.width / 2;
  const halfHeight = item.height / 2;
  return [
    item.x + (cos - 1) * halfWidth - sin * halfHeight,
    item.y + sin * halfWidth + (cos - 1) * halfHeight,
  ];
}

export function computeItemStyle(item: Item, layout: Layout): ItemBoxStyle {
  const rotation = item.rotation ?? 0;
  const [x, y] = rotationAdjustedTopLeft(item, rotation);

  return {
    left: `${(x / layout.width) * 100}%`,
    top: `${(y / layout.height) * 100}%`,
    width: `${(item.width / layout.width) * 100}%`,
    height: `${(item.height / layout.height) * 100}%`,
    zIndex: item.zIndex,
    transform: rotation ? `rotate(${rotation}deg)` : "none",
  };
}
