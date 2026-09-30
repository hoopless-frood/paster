import { validateComposition, type Composition } from "@paster/core";

/**
 * Composition JSON is always read fully into memory, parsed, and loaded into
 * the editor, so above this it's refused outright rather than risk freezing
 * the tab. Also applies to a ZIP's composition.json (see import-zip.ts).
 */
export const MAX_COMPOSITION_BYTES = 5 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Checks an uploaded .json file's size before it's read: an error message, or null if it's fine. */
export function jsonFileSizeError(file: Pick<File, "name" | "size">): string | null {
  if (file.size <= MAX_COMPOSITION_BYTES) {
    return null;
  }
  return `"${file.name}" is ${formatBytes(file.size)} — larger than the ${formatBytes(MAX_COMPOSITION_BYTES)} limit.`;
}

export type ImportResult =
  | { ok: true; composition: Composition; warnings: string[] }
  | { ok: false; errors: string[] };

/**
 * Two assets sharing one file isn't a schema violation (nothing stops two
 * logical assets from pointing at the same image), but it's easy to do by
 * accident, so it's worth flagging — regardless of whether the composition
 * arrived as hand-edited JSON or was just extracted from a ZIP.
 */
function duplicateAssetPathWarnings(composition: Composition): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const asset of composition.assets) {
    if (seen.has(asset.path)) {
      duplicates.add(asset.path);
    }
    seen.add(asset.path);
  }
  return duplicates.size > 0 ? [`Multiple assets reference the same file: ${[...duplicates].join(", ")}.`] : [];
}

/** Parses and validates composition JSON text. Never throws — every failure path returns errors instead. */
export function importComposition(rawText: string): ImportResult {
  const trimmed = rawText.trim();

  if (trimmed.length === 0) {
    return {
      ok: false,
      errors: ['Paste or upload composition JSON, or load one of the examples.'],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const result = validateComposition(parsed);
  if (!result.valid) {
    return { ok: false, errors: result.errors };
  }

  return {
    ok: true,
    composition: result.composition,
    warnings: [...result.warnings, ...duplicateAssetPathWarnings(result.composition)],
  };
}
