import { describe, expect, test } from "vitest";
import {
  clampPonoLevel,
  formatPonoLevel,
  isPonoLevel,
  legacyScalarToPonoLevel,
  parsePonoLevel,
} from "../src/index.js";

describe("Pono Level — SDM+ 0–20 scalar model", () => {
  test("accepts integer levels on the closed 0–20 range", () => {
    expect(parsePonoLevel(0)).toBe(0);
    expect(parsePonoLevel(16)).toBe(16);
    expect(parsePonoLevel("20")).toBe(20);
    expect(isPonoLevel(10)).toBe(true);
  });

  test("rejects legacy 0.00–1.00 scalars unless a migration bridge is explicit", () => {
    expect(parsePonoLevel(0.9)).toBeNull();
    expect(parsePonoLevel("0.85")).toBeNull();
    expect(parsePonoLevel(0.9, { legacy01: true })).toBe(18);
    expect(parsePonoLevel("0.85", { legacy01: true })).toBe(17);
  });

  test("preserves old threshold pressure as levels", () => {
    expect(legacyScalarToPonoLevel(0.9)).toBe(18);
    expect(legacyScalarToPonoLevel(0.85)).toBe(17);
  });

  test("clamps and formats levels", () => {
    expect(clampPonoLevel(21.4)).toBe(20);
    expect(clampPonoLevel(-1)).toBe(0);
    expect(formatPonoLevel(clampPonoLevel(15.6))).toBe("16");
  });
});
