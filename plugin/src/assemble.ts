import {
  COMPOSITION_SCHEMA_VERSION,
  validateComposition,
  type Composition,
  type ValidationResult,
} from "@paster/core";
import type { ScanSuccess } from "./figma-export";

/**
 * Merges a fresh scan with the min-width values collected from the UI,
 * builds a Composition, and validates it against @paster/core. Geometry-only:
 * frames never carry an assetId yet (image export is a later milestone).
 */
export function assembleComposition(
  scan: ScanSuccess,
  minWidths: Record<string, number>,
): ValidationResult {
  const missing = scan.layouts.filter((layout) => !(layout.name in minWidths));
  if (missing.length > 0) {
    return {
      valid: false,
      errors: missing.map((layout) => `No min-width entered for layout "${layout.name}".`),
    };
  }

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
      frames: layout.frames.map((frame) => ({
        id: frame.name,
        name: frame.name,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        zIndex: frame.zIndex,
      })),
    })),
  };

  return validateComposition(composition);
}
