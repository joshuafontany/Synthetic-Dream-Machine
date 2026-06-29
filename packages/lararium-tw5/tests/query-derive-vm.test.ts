/**
 * query-derive-vm.test.ts — the IN-VM recall query-derive (the recall twin of capture-annotate-vm).
 *
 * Proves the Move→Vec functor recall applies is IDENTICAL to capture's: parse the query with the
 * grammar, fold the harvest AND the meme-ast TREE into the move-skeleton (the STRUCTURAL plane
 * present, never the truncated `[]` the old node-side deriver suffered), pin to the live basis.
 *
 * Meme: lar:///ha.ka.ba/@lararium/tw5/modules/query-derive-vm
 */

import { describe, test, expect } from "vitest";
import { harvestTurnGradient } from "@lararium/mesh";
import { emitMoveSkeleton } from "../src/form-layer/index.js";
import { deriveQuerySkeleton } from "../src/query-derive-vm.js";

const MARKERS_QUERY = "what did we decide <<~ hud Aperture(10) OODA-HA(3) >> <<~ ward ! L-Prime >>";

describe("deriveQuerySkeleton — the in-VM recall functor (FULL, one runtime)", () => {
  test("a sigil-bearing query → a derivation carrying BOTH planes (structural plane present)", () => {
    const out = deriveQuerySkeleton(MARKERS_QUERY);
    expect(out).not.toBeNull();
    // (a) the linear plane: axis-bearing move tokens.
    expect(out!.skeleton.stream.some((t) => t.axisId !== null)).toBe(true);
    // (b) the STRUCTURAL plane: the meme-ast tree rides as the placeholdered graph — the fix. The old
    //     node-side deriver folded emitMoveSkeleton(harvest, []) → graph [] (a DIFFERENT, degraded
    //     functor than the corpus). In-VM the tree is present, so recall lands in the corpus's space.
    expect(out!.skeleton.graph.length).toBeGreaterThan(0);
    // (c) the basis stands (the live grammar-cache basis; bootstrap subset in this node-side unit test).
    expect(out!.basis.dimension).toBeGreaterThan(0);
  });

  test("the structural plane is STRICTLY richer than the truncated node-side functor it replaces", () => {
    const out = deriveQuerySkeleton(MARKERS_QUERY);
    // The retired node-side path: emitMoveSkeleton(harvest, []) — graph plane absent.
    const truncated = emitMoveSkeleton(harvestTurnGradient(MARKERS_QUERY), []);
    expect(truncated.graph).toEqual([]);
    expect(out!.skeleton.graph.length).toBeGreaterThan(truncated.graph.length);
  });

  test("a plain keyword query (no markers, no axis-bearing token) → null (→ keyword/content branch)", () => {
    expect(deriveQuerySkeleton("what did we decide about deps")).toBeNull();
  });
});
