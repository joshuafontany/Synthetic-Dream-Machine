/**
 * parseFormVector — the form-store `document` → sparse form-vector reader (open-node-vessel).
 *
 * The bug this guards: the `axis_activation` map is axis-ID-KEYED; each key IS the axis identity, so
 * it MUST determine the sparse index. A positional counter (`entries.map((_, i) => i)`) discarded the
 * key — two turns with different active-axis SETS then got misaligned indices, silently corrupting
 * every cross-turn form comparison. Here we prove the axis KEY survives (same id → same index across
 * turns) and that a canonical `form_vector`, when present, rides through verbatim.
 */
import { describe, it, expect } from "vitest";
import { parseFormVector } from "../src/open-node-vessel.js";

describe("parseFormVector", () => {
  it("derives a STABLE index per axis-id — same key aligns across turns with different active sets", () => {
    // Turn A active on {voice:council, family:hedge}; Turn B active on {phase:orient, voice:council}.
    const a = parseFormVector(JSON.stringify({ axis_activation: { "voice:council": 0.9, "family:hedge": 0.4 } }));
    const b = parseFormVector(JSON.stringify({ axis_activation: { "phase:orient": 0.7, "voice:council": 0.2 } }));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();

    // The shared axis id "voice:council" MUST land on the SAME index in both turns (the property a
    // positional counter violates — there it would be 0 in A and 1 in B).
    const idxA = a!.indices[a!.values.indexOf(0.9)];
    const idxB = b!.indices[b!.values.indexOf(0.2)];
    expect(idxA).toBe(idxB);

    // Distinct axis ids land on distinct indices (no positional collapse).
    expect(new Set(a!.indices).size).toBe(a!.indices.length);
    // Every activation value survives.
    expect([...a!.values].sort()).toEqual([0.4, 0.9]);
  });

  it("is deterministic — repeated parses of the same document agree", () => {
    const doc = JSON.stringify({ axis_activation: { "ward:sword": 0.5, "layer:core": 0.3, "voice:muse": 0.8 } });
    expect(parseFormVector(doc)).toEqual(parseFormVector(doc));
    // indices ascend (sorted pairing), values track their key.
    const v = parseFormVector(doc)!;
    const ascending = [...v.indices].every((n, i) => i === 0 || n >= v.indices[i - 1]!);
    expect(ascending).toBe(true);
  });

  it("prefers the encoder's canonical form_vector verbatim when present", () => {
    const doc = JSON.stringify({
      form_vector: { indices: [3, 7, 11], values: [0.1, 0.2, 0.3] },
      axis_activation: { "voice:council": 0.9 },   // present but IGNORED — form_vector wins
    });
    expect(parseFormVector(doc)).toEqual({ indices: [3, 7, 11], values: [0.1, 0.2, 0.3] });
  });

  it("falls back to axis_activation when form_vector is malformed (length mismatch)", () => {
    const doc = JSON.stringify({
      form_vector: { indices: [3, 7], values: [0.1] },   // malformed → ignored
      axis_activation: { "voice:council": 0.9 },
    });
    const v = parseFormVector(doc)!;
    expect(v.values).toEqual([0.9]);
    expect(v.indices.length).toBe(1);
  });

  it("empty activation → an empty vector; unparseable → null", () => {
    expect(parseFormVector(JSON.stringify({ axis_activation: {} }))).toEqual({ indices: [], values: [] });
    expect(parseFormVector(JSON.stringify({}))).toEqual({ indices: [], values: [] });
    expect(parseFormVector("not json{")).toBeNull();
  });
});
