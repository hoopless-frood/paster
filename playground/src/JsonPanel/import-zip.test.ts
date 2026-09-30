import { sampleComposition } from "@paster/core";
import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { importZip } from "./import-zip";

function toFile(zip: JSZip, name = "export.zip"): Promise<File> {
  return zip.generateAsync({ type: "blob" }).then((blob) => new File([blob], name, { type: "application/zip" }));
}

/** A minimal 1x1 PNG — real image bytes, not just a stand-in string. */
const PNG_BYTES = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  ),
  (char) => char.charCodeAt(0),
);

async function sampleZip(): Promise<JSZip> {
  const zip = new JSZip();
  zip.file("composition.json", JSON.stringify(sampleComposition));
  for (const asset of sampleComposition.assets) {
    zip.file(asset.path, PNG_BYTES);
  }
  return zip;
}

describe("importZip", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts a valid export into a composition and blob URLs for every asset", async () => {
    const file = await toFile(await sampleZip());
    const result = await importZip(file);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.composition.id).toBe(sampleComposition.id);
    expect(result.assetUrls.size).toBe(sampleComposition.assets.length);
    for (const asset of sampleComposition.assets) {
      expect(result.assetUrls.get(asset.path)).toMatch(/^blob:/);
    }
  });

  it("rejects a ZIP with no composition.json", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "not a paster export");
    const result = await importZip(await toFile(zip));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/composition\.json/i);
  });

  it("reports invalid JSON in composition.json", async () => {
    const zip = new JSZip();
    zip.file("composition.json", "{not json");
    const result = await importZip(await toFile(zip));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/valid json/i);
  });

  it("propagates schema validation errors", async () => {
    const zip = new JSZip();
    zip.file("composition.json", JSON.stringify({ ...sampleComposition, version: 999 }));
    const result = await importZip(await toFile(zip));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((error) => error.includes("version"))).toBe(true);
  });

  it("errors when the manifest references an asset the ZIP doesn't contain, and revokes any URLs already created", async () => {
    const zip = new JSZip();
    zip.file("composition.json", JSON.stringify(sampleComposition));
    // Only include the first two of the three referenced assets.
    zip.file(sampleComposition.assets[0].path, PNG_BYTES);
    zip.file(sampleComposition.assets[1].path, PNG_BYTES);

    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const result = await importZip(await toFile(zip));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain(sampleComposition.assets[2].path);
    // The two assets that WERE found had object URLs created before the
    // third one failed — those must be cleaned up, not leaked.
    expect(revokeSpy).toHaveBeenCalledTimes(2);
  });

  it("warns (without failing) when two assets share the same file", async () => {
    const composition = {
      ...sampleComposition,
      assets: sampleComposition.assets.map((asset, index) =>
        index === 1 ? { ...asset, path: sampleComposition.assets[0].path } : asset,
      ),
    };
    const zip = new JSZip();
    zip.file("composition.json", JSON.stringify(composition));
    zip.file(sampleComposition.assets[0].path, PNG_BYTES);
    zip.file(sampleComposition.assets[2].path, PNG_BYTES);

    const result = await importZip(await toFile(zip));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.some((warning) => warning.includes(sampleComposition.assets[0].path))).toBe(true);
  });

  it("rejects an upload larger than the size limit before parsing it", async () => {
    const file = await toFile(await sampleZip());
    Object.defineProperty(file, "size", { value: 100 * 1024 * 1024 });

    const result = await importZip(file);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/larger than/i);
  });

  it("rejects a file that isn't actually a ZIP", async () => {
    const file = new File(["not a zip"], "export.zip", { type: "application/zip" });
    const result = await importZip(file);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toMatch(/couldn't read/i);
  });
});
