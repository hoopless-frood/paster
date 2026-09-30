import { COMPOSITION_SCHEMA_VERSION, type Composition } from "./types.js";

export type ValidationResult =
  | { valid: true; composition: Composition; warnings: string[] }
  | { valid: false; errors: string[] };

export function validateComposition(input: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return { valid: false, errors: ["composition: must be an object"] };
  }

  if (input.version !== COMPOSITION_SCHEMA_VERSION) {
    errors.push(
      `composition.version: expected ${COMPOSITION_SCHEMA_VERSION}, got ${JSON.stringify(input.version)}`,
    );
  }

  checkNonEmptyString(input.id, "composition.id", errors);
  checkNonEmptyString(input.name, "composition.name", errors);

  const assetIds = checkAssets(input.assets, errors);
  checkLayouts(input.layouts, assetIds, errors, warnings);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, composition: input as unknown as Composition, warnings };
}

function checkAssets(value: unknown, errors: string[]): Set<string> {
  const ids = new Set<string>();

  if (!Array.isArray(value)) {
    errors.push("composition.assets: must be an array");
    return ids;
  }

  value.forEach((asset, index) => {
    const path = `composition.assets[${index}]`;

    if (!isRecord(asset)) {
      errors.push(`${path}: must be an object`);
      return;
    }

    if (checkNonEmptyString(asset.id, `${path}.id`, errors)) {
      const id = asset.id as string;
      if (ids.has(id)) {
        errors.push(`${path}.id: duplicate asset id "${id}"`);
      } else {
        ids.add(id);
      }
    }

    if (typeof asset.path !== "string" || !isSafeRelativeAssetPath(asset.path)) {
      errors.push(
        `${path}.path: must be a safe relative path (no leading slash, no "..", no URL scheme)`,
      );
    }

    checkPositiveFiniteNumber(asset.width, `${path}.width`, errors);
    checkPositiveFiniteNumber(asset.height, `${path}.height`, errors);

    if (asset.alt !== undefined && typeof asset.alt !== "string") {
      errors.push(`${path}.alt: must be a string when present`);
    }
  });

  return ids;
}

function checkLayouts(
  value: unknown,
  assetIds: Set<string>,
  errors: string[],
  warnings: string[],
): void {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push("composition.layouts: must be a non-empty array");
    return;
  }

  const layoutIds = new Set<string>();
  const minWidths = new Set<number>();
  let baseLayoutCount = 0;
  let referenceItemIds: Set<string> | null = null;

  value.forEach((layout, index) => {
    const path = `composition.layouts[${index}]`;

    if (!isRecord(layout)) {
      errors.push(`${path}: must be an object`);
      return;
    }

    if (checkNonEmptyString(layout.id, `${path}.id`, errors)) {
      const id = layout.id as string;
      if (layoutIds.has(id)) {
        errors.push(`${path}.id: duplicate layout id "${id}"`);
      } else {
        layoutIds.add(id);
      }
    }

    checkNonEmptyString(layout.name, `${path}.name`, errors);

    if (checkFiniteNumber(layout.minWidth, `${path}.minWidth`, errors)) {
      const minWidth = layout.minWidth as number;
      if (minWidth < 0) {
        errors.push(`${path}.minWidth: must be >= 0`);
      } else {
        if (minWidth === 0) {
          baseLayoutCount++;
        }
        if (minWidths.has(minWidth)) {
          errors.push(`${path}.minWidth: duplicate breakpoint threshold ${minWidth}`);
        } else {
          minWidths.add(minWidth);
        }
      }
    }

    checkPositiveFiniteNumber(layout.width, `${path}.width`, errors);
    checkPositiveFiniteNumber(layout.height, `${path}.height`, errors);

    if (layout.backgroundColor !== undefined && typeof layout.backgroundColor !== "string") {
      errors.push(`${path}.backgroundColor: must be a string when present`);
    }

    if (layout.clipsContent !== undefined && typeof layout.clipsContent !== "boolean") {
      errors.push(`${path}.clipsContent: must be a boolean when present`);
    }

    const itemIds = checkItems(layout.items, assetIds, path, errors);
    if (itemIds) {
      if (referenceItemIds === null) {
        referenceItemIds = itemIds;
      } else if (!setsEqual(referenceItemIds, itemIds)) {
        warnings.push(
          `${path}.items: item ids differ from another layout's — layouts can have different item counts, but an id shared across layouts is treated as the same item.`,
        );
      }
    }
  });

  if (baseLayoutCount === 0) {
    errors.push("composition.layouts: exactly one layout must have minWidth 0 (a base layout)");
  } else if (baseLayoutCount > 1) {
    errors.push("composition.layouts: only one layout may have minWidth 0");
  }
}

function checkItems(
  value: unknown,
  assetIds: Set<string>,
  layoutPath: string,
  errors: string[],
): Set<string> | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${layoutPath}.items: must be a non-empty array`);
    return null;
  }

  const itemIds = new Set<string>();
  const zIndexes = new Set<number>();

  value.forEach((item, index) => {
    const path = `${layoutPath}.items[${index}]`;

    if (!isRecord(item)) {
      errors.push(`${path}: must be an object`);
      return;
    }

    if (checkNonEmptyString(item.id, `${path}.id`, errors)) {
      const id = item.id as string;
      if (itemIds.has(id)) {
        errors.push(`${path}.id: duplicate item id "${id}" within layout`);
      } else {
        itemIds.add(id);
      }
    }

    if (item.name !== undefined && typeof item.name !== "string") {
      errors.push(`${path}.name: must be a string when present`);
    }

    checkFiniteNumber(item.x, `${path}.x`, errors);
    checkFiniteNumber(item.y, `${path}.y`, errors);
    checkPositiveFiniteNumber(item.width, `${path}.width`, errors);
    checkPositiveFiniteNumber(item.height, `${path}.height`, errors);

    if (checkInteger(item.zIndex, `${path}.zIndex`, errors)) {
      const zIndex = item.zIndex as number;
      if (zIndex < 0) {
        errors.push(`${path}.zIndex: must be >= 0`);
      } else if (zIndexes.has(zIndex)) {
        errors.push(`${path}.zIndex: duplicate stacking index ${zIndex} within layout`);
      } else {
        zIndexes.add(zIndex);
      }
    }

    if (item.rotation !== undefined) {
      checkFiniteNumber(item.rotation, `${path}.rotation`, errors);
    }

    if (item.assetId !== undefined) {
      if (typeof item.assetId !== "string") {
        errors.push(`${path}.assetId: must be a string when present`);
      } else if (!assetIds.has(item.assetId)) {
        errors.push(`${path}.assetId: references unknown asset "${item.assetId}"`);
      }
    }
  });

  return itemIds;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkNonEmptyString(value: unknown, path: string, errors: string[]): boolean {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${path}: must be a non-empty string`);
    return false;
  }
  return true;
}

function checkFiniteNumber(value: unknown, path: string, errors: string[]): boolean {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path}: must be a finite number`);
    return false;
  }
  return true;
}

function checkPositiveFiniteNumber(value: unknown, path: string, errors: string[]): boolean {
  if (!checkFiniteNumber(value, path, errors)) {
    return false;
  }
  if ((value as number) <= 0) {
    errors.push(`${path}: must be greater than 0`);
    return false;
  }
  return true;
}

function checkInteger(value: unknown, path: string, errors: string[]): boolean {
  if (!checkFiniteNumber(value, path, errors)) {
    return false;
  }
  if (!Number.isInteger(value)) {
    errors.push(`${path}: must be an integer`);
    return false;
  }
  return true;
}

function isSafeRelativeAssetPath(path: string): boolean {
  if (path.length === 0) {
    return false;
  }
  if (path.startsWith("/") || path.startsWith("\\")) {
    return false;
  }
  if (/^[a-zA-Z]:[\\/]/.test(path)) {
    return false;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(path)) {
    return false;
  }
  const segments = path.split(/[\\/]+/);
  return segments.every((segment) => segment.length > 0 && segment !== "..");
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}
