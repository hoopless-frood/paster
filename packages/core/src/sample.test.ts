import { describe, expect, it } from "vitest";
import geometryOnlyExample from "../../../examples/geometry/composition.json" with { type: "json" };
import { sampleComposition } from "./sample.js";

describe("sampleComposition", () => {
  // The examples/ copy is what people download or paste; this keeps it
  // from drifting from the one the code and tests use.
  it("matches examples/geometry/composition.json exactly", () => {
    expect(geometryOnlyExample).toEqual(sampleComposition);
  });
});
