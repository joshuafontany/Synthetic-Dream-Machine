import { describe, expect, test } from "vitest";
import {
  clampPonoLevel,
  formatPonoLevel,
  isPonoLevel,
  parsePonoLevel,
} from "../src/index.js";

describe("Pono Level — SDM+ 0–20 scalar model", () => {
  test("accepts integer levels on the closed 0–20 range", () => {
    expect(parsePonoLevel(0)).toBe(0);
    expect(parsePonoLevel(16)).toBe(16);
    expect(parsePonoLevel("20")).toBe(20);
    expect(isPonoLevel(10)).toBe(true);
  });

  test("rejects 0.00–1.00 scalars — not valid integer levels", () => {
    expect(parsePonoLevel(0.9)).toBeNull();
    expect(parsePonoLevel("0.85")).toBeNull();
  });

  test("clamps and formats levels", () => {
    expect(clampPonoLevel(21.4)).toBe(20);
    expect(clampPonoLevel(-1)).toBe(0);
    expect(formatPonoLevel(clampPonoLevel(15.6))).toBe("16");
  });
});
