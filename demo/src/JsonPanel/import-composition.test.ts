import { sampleComposition } from "@paster/core";
import { describe, expect, it } from "vitest";
import { importComposition } from "./import-composition";

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
});
