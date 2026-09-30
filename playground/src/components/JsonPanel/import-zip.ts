import JSZip from "jszip";
import type { Composition } from "@paster/core";
import { formatBytes, importComposition, MAX_COMPOSITION_BYTES } from "./import-composition";

/** Above this, refuse the upload outright rather than let the browser tab hang decompressing it. */
const MAX_ZIP_BYTES = 50 * 1024 * 1024;
/** Per referenced asset, after decompression. */
const MAX_ASSET_BYTES = 20 * 1024 * 1024;

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  svg: "image/svg+xml",
};

export type ZipImportResult =
  | { ok: true; composition: Composition; assetUrls: Map<string, string>; warnings: string[] }
  | { ok: false; errors: string[] };

function extensionOf(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot + 1).toLowerCase();
}

/**
 * Parses a Paster export ZIP (composition.json + images/) into a validated
 * Composition plus a map of each Asset.path to a blob: URL for its bytes.
 * Never throws — every failure path returns errors instead.
 *
 * Path-traversal safety comes from validateComposition itself: every
 * Asset.path is already required to be a safe relative path (no leading
 * slash, no "..", no URL scheme) before this function ever looks it up in
 * the archive, and only paths the composition actually references are ever
 * read — an unreferenced entry elsewhere in the ZIP is never extracted.
 * SVG assets are exposed the same way as raster ones (a blob: URL, meant to
 * be used as an <img> src) rather than inserted as inline markup: a browser
 * never executes scripts or fetches external references from an SVG loaded
 * as an image, so no separate sanitization step is needed as long as
 * consumers keep rendering it that way.
 */
export async function importZip(file: File): Promise<ZipImportResult> {
  if (file.size > MAX_ZIP_BYTES) {
    return {
      ok: false,
      errors: [`"${file.name}" is ${formatBytes(file.size)} — larger than the ${formatBytes(MAX_ZIP_BYTES)} limit.`],
    };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch (error) {
    return {
      ok: false,
      errors: [`Couldn't read "${file.name}" as a ZIP: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  const manifestEntry = zip.file("composition.json");
  if (!manifestEntry) {
    return { ok: false, errors: ['This ZIP has no "composition.json" at its root — is this a Paster export?'] };
  }

  let manifestText: string;
  try {
    manifestText = await manifestEntry.async("text");
  } catch (error) {
    return {
      ok: false,
      errors: [`Couldn't read composition.json from the ZIP: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  if (manifestText.length > MAX_COMPOSITION_BYTES) {
    return {
      ok: false,
      errors: [`composition.json is larger than the ${formatBytes(MAX_COMPOSITION_BYTES)} limit.`],
    };
  }

  // Reuses the same JSON-parse/schema-validation/warning logic the plain
  // paste-or-upload path uses, so a composition validates identically
  // whether it arrived via ZIP or hand-edited JSON.
  const result = importComposition(manifestText);
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  const { composition, warnings } = result;
  const assetUrls = new Map<string, string>();
  const errors: string[] = [];

  for (const asset of composition.assets) {
    if (assetUrls.has(asset.path)) {
      continue; // already extracted while resolving an earlier asset sharing this path
    }

    const entry = zip.file(asset.path);
    if (!entry) {
      errors.push(`composition.json references "${asset.path}" (asset "${asset.id}"), but the ZIP has no such file.`);
      continue;
    }

    let bytes: Uint8Array;
    try {
      bytes = await entry.async("uint8array");
    } catch (error) {
      errors.push(`Couldn't read "${asset.path}" from the ZIP: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }

    if (bytes.byteLength > MAX_ASSET_BYTES) {
      errors.push(`"${asset.path}" is ${formatBytes(bytes.byteLength)} — larger than the ${formatBytes(MAX_ASSET_BYTES)} per-asset limit.`);
      continue;
    }

    // Blob only accepts an ArrayBuffer-backed view, not JSZip's wider
    // ArrayBufferLike-typed Uint8Array — copy into a plain one.
    const owned = new Uint8Array(bytes.byteLength);
    owned.set(bytes);

    const contentType = IMAGE_CONTENT_TYPES[extensionOf(asset.path)];
    const blob = contentType ? new Blob([owned], { type: contentType }) : new Blob([owned]);
    assetUrls.set(asset.path, URL.createObjectURL(blob));
  }

  if (errors.length > 0) {
    assetUrls.forEach((url) => URL.revokeObjectURL(url));
    return { ok: false, errors };
  }

  return { ok: true, composition, assetUrls, warnings };
}
