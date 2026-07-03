/**
 * edge-kind — the KUE-5 invariant: an edge's kind reads from its type, never inferred; the "TE→tunnels"
 * corruption (a directed decaying signal into a symmetric static store) is made structurally impossible.
 */
import { describe, expect, test } from "vitest";

import {
  functionalEdge,
  effectiveEdge,
  transitionEdge,
  assertGeometryInput,
  assertTunnelEdge,
  partitionByKind,
  type Edge,
} from "../src/edge-kind.js";

describe("edge-kind (legible-by-type, fail-loud)", () => {
  test("constructors stamp the kind; functional mints both directions (symmetric)", () => {
    const [ab, ba] = functionalEdge("a", "b", 0.5);
    expect(ab.kind).toBe("fn.sym");
    expect(ba.kind).toBe("fn.sym");
    expect([ab.src, ab.dst]).toEqual(["a", "b"]);
    expect([ba.src, ba.dst]).toEqual(["b", "a"]);
    expect(effectiveEdge("a", "b", 0.3).kind).toBe("eff.dir");
    expect(transitionEdge("a", "b", 0.7).kind).toBe("tr.dir");
  });

  test("geometry accepts fn.sym + tr.dir, REFUSES eff.dir (TE never generates geometry)", () => {
    const ok: Edge[] = [...functionalEdge("a", "b", 1), transitionEdge("b", "c", 1)];
    expect(() => assertGeometryInput(ok)).not.toThrow();
    expect(() => assertGeometryInput([effectiveEdge("a", "b", 1)])).toThrow(/geometry refuses 'eff.dir'/);
  });

  test("the tunnel store holds fn.sym only — a TE→tunnels injection raises at the boundary", () => {
    expect(() => assertTunnelEdge(functionalEdge("a", "b", 1)[0])).not.toThrow();
    expect(() => assertTunnelEdge(effectiveEdge("a", "b", 1))).toThrow(/tunnel store holds fn.sym only/);
    expect(() => assertTunnelEdge(transitionEdge("a", "b", 1))).toThrow(/tunnel store holds fn.sym only/);
  });

  test("partitionByKind separates the three stores; no union across kinds", () => {
    const mixed: Edge[] = [
      ...functionalEdge("a", "b", 1),
      effectiveEdge("a", "c", 1),
      transitionEdge("c", "d", 1),
      transitionEdge("d", "e", 1),
    ];
    const p = partitionByKind(mixed);
    expect(p["fn.sym"].length).toBe(2);
    expect(p["eff.dir"].length).toBe(1);
    expect(p["tr.dir"].length).toBe(2);
  });
});
