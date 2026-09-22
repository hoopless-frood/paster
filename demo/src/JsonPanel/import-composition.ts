import { validateComposition, type Composition } from "@paster/core";

export type ImportResult =
  | { ok: true; composition: Composition; warnings: string[] }
  | { ok: false; errors: string[] };

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

  return { ok: true, composition: result.composition, warnings: result.warnings };
}
