/**
 * edge-kind — the link-graph carries ≥3 DISTINCT connectivity kinds that stay legible-by-type. A
 * directed, decaying signal (transfer-entropy) never fuses into a symmetric, static store (tunnels):
 * that fusion loses direction and freezes a signal that should decay — a data-model corruption. The
 * kind reads from the CONSTRUCTOR, never inferred from endpoints or weights; the guards fail loud.
 *
 *   fn.sym  — functional / symmetric: co-occurrence, W_ij == W_ji. The tunnels/hallways. Generates the
 *             content eigenmap geometry.
 *   eff.dir — effective / directed: transfer-entropy, who-leads-whom. DIAGNOSTIC only — never geometry,
 *             never a tunnel.
 *   tr.dir  — transition / directed: succession / lineage. The reconstruction landscape a recall
 *             descends (the canalization basin). Generates the SR geometry.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

export type EdgeKind = "fn.sym" | "eff.dir" | "tr.dir";

export interface Edge {
  readonly kind: EdgeKind;
  readonly src: string;
  readonly dst: string;
  readonly weight: number;
}

/** Functional co-occurrence: mints BOTH directions so the store cannot hold an asymmetric fn.sym. */
export function functionalEdge(a: string, b: string, weight: number): [Edge, Edge] {
  return [
    { kind: "fn.sym", src: a, dst: b, weight },
    { kind: "fn.sym", src: b, dst: a, weight },
  ];
}

/** Effective directed influence (transfer-entropy) — diagnostic; forbidden from geometry + tunnels. */
export function effectiveEdge(src: string, dst: string, weight: number): Edge {
  return { kind: "eff.dir", src, dst, weight };
}

/** Transition / succession — the reconstruction landscape; feeds the SR geometry. */
export function transitionEdge(src: string, dst: string, weight: number): Edge {
  return { kind: "tr.dir", src, dst, weight };
}

const GEOMETRY_KINDS: ReadonlySet<EdgeKind> = new Set<EdgeKind>(["fn.sym", "tr.dir"]);

/**
 * The geometry-input guard: geometry accepts fn.sym (→ content eigenmap) and tr.dir (→ SR landscape)
 * ONLY; it REFUSES eff.dir — an effective/TE edge never generates geometry and never mints a tunnel
 * (the "TE→tunnels" corruption made structurally impossible). Designation carries authority; fail loud.
 */
export function assertGeometryInput(edges: readonly Edge[]): void {
  for (const e of edges) {
    if (!GEOMETRY_KINDS.has(e.kind)) {
      throw new Error(
        `edge-kind: geometry refuses '${e.kind}' (${e.src}->${e.dst}); only fn.sym|tr.dir generate geometry — an effective/TE edge never mints a tunnel or geometry`,
      );
    }
  }
}

/** The tunnel store holds fn.sym only; any directed or non-fn.sym edge is rejected at the boundary. */
export function assertTunnelEdge(e: Edge): void {
  if (e.kind !== "fn.sym") {
    throw new Error(`edge-kind: the tunnel store holds fn.sym only, got '${e.kind}' (${e.src}->${e.dst})`);
  }
}

/** Partition a mixed edge list by kind — separate stores read their own kind, never union across. */
export function partitionByKind(edges: readonly Edge[]): Record<EdgeKind, Edge[]> {
  const out: Record<EdgeKind, Edge[]> = { "fn.sym": [], "eff.dir": [], "tr.dir": [] };
  for (const e of edges) out[e.kind].push(e);
  return out;
}
