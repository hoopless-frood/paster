import { sampleComposition } from "@paster/core";
import { describe, expect, it } from "vitest";
import { importComposition, jsonFileSizeError, MAX_COMPOSITION_BYTES } from "./import-composition";

describe("importComposition", () => {
  it("accepts valid composition JSON", () => {
    const result = importComposition(JSON.stringify(sampleComposition));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.composition.id).toBe(sampleComposition.id);
    }
  });

  it("gives a friendly message for empty input, not a parse error", () => {
    const result = importComposition("   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/paste or upload/i);
    }
  });

  it("reports invalid JSON syntax clearly", () => {
    const result = importComposition("{ not valid json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/invalid json/i);
    }
  });

  it("passes through schema validation errors for well-formed but invalid JSON", () => {
    const result = importComposition(JSON.stringify({ version: 2 }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("version"))).toBe(true);
    }
  });

  it("warns (without failing) when two assets share the same file", () => {
    const composition = {
      ...sampleComposition,
      assets: sampleComposition.assets.map((asset, index) =>
        index === 1 ? { ...asset, path: sampleComposition.assets[0].path } : asset,
      ),
    };
    const result = importComposition(JSON.stringify(composition));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.warnings.some((w) => w.includes(sampleComposition.assets[0].path))).toBe(true);
    }
  });
});

describe("jsonFileSizeError", () => {
  it("accepts a file at the limit", () => {
    expect(jsonFileSizeError({ name: "ok.json", size: MAX_COMPOSITION_BYTES })).toBeNull();
  });

  it("rejects a larger file, naming it and both sizes", () => {
    expect(jsonFileSizeError({ name: "huge.json", size: 12 * 1024 * 1024 })).toBe(
      '"huge.json" is 12.0 MB — larger than the 5.0 MB limit.',
    );
  });
});
