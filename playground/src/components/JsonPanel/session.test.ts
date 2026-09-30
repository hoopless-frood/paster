import { describe, expect, it } from "vitest";
import { parseSavedSession } from "./session";

describe("parseSavedSession", () => {
  it("returns null when nothing was saved", () => {
    expect(parseSavedSession(null)).toBeNull();
  });

  it("round-trips a saved session", () => {
    const saved = { text: '{"version":1}', loadedExample: "collage", zipSource: "collage" };
    expect(parseSavedSession(JSON.stringify(saved))).toEqual(saved);
  });

  it("returns null for corrupt JSON or a missing text field", () => {
    expect(parseSavedSession("{not json")).toBeNull();
    expect(parseSavedSession(JSON.stringify({ loadedExample: "geometry" }))).toBeNull();
    expect(parseSavedSession("42")).toBeNull();
  });

  it("drops unrecognized example and ZIP values rather than trusting them", () => {
    const parsed = parseSavedSession(JSON.stringify({ text: "x", loadedExample: "other", zipSource: 7 }));
    expect(parsed).toEqual({ text: "x", loadedExample: null, zipSource: null });
  });
});
