import { validateComposition, type Composition } from "@paster/core";

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
      errors: ['Paste or upload composition JSON, or click "Load sample" to see an example.'],
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
