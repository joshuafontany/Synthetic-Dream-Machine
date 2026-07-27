/**
 * te-hodge — the coupling plane's OWN co-consistency instrument: a discrete Helmholtz-Hodge decomposition
 * of the directed transfer-entropy flow, read for its CIRCULATION. This re-founds the ki (cosheaf)
 * co-restrictions on the flow BETWEEN streams — retiring the MODWT-MRA wavelet scaffold that answered a
 * change-point question (a regime turnover) with spurious low-frequency power (a bandpass reports where
 * energy at its scale concentrates; a regime turnover is not a period the signal ever held).
 *
 * THE FLOW carries no presupposed name. It arrives as `MeshCoupling.te` — a directed nagare between the
 * children (`te[i][j]` = TE i→j bits), gathered by the coupler, not asserted here. The decomposition hands
 * the flow's parts working handles by what they DO, never by an essence:
 *
 *   • the GRADIENT part — the flow a single node POTENTIAL carries: `grad(i,j) = s(j) − s(i)`. A flow that
 *     reduces to such a potential collapses to one stream's "who-leads-whom" ranking and holds NO fact a
 *     coarsening of one stream could not already reach — the reducible part.
 *   • the ROTATIONAL part — the residual `r = w − grad`, whose CIRCULATION around a cycle admits no
 *     potential. This is the part that stays a relation between two streams: the irreducible coupling the
 *     ki-radius reads.
 *
 * The net flow rides the COMPLETE graph on the children (a χ²-gated edge carries net flow 0, a legitimate
 * "no significant asymmetry" reading — not a missing edge), so the HodgeRank potential closes in one line:
 * `s = div / n` (the graph Laplacian of K_n acts as `n·s` on the mean-zero divergence, and the net flow's
 * divergence is mean-zero by antisymmetry). On K_n there is no harmonic part — the residual is pure curl.
 *
 * WHAT THIS READS, PRECISELY: on the complete graph the circulation is LOCAL curl (`im δ¹`), cohomologically
 * TRIVIAL (`H¹ = ker Δ₁ = 0` — the filled clique complex of K_n is contractible; Jiang–Lim–Yao–Ye 2011,
 * arXiv:0811.1067; Lim, SIAM Review 2020, arXiv:1507.05379). So the read certifies the COUPLING signal — the
 * flow content NO lead-lag potential explains — NOT a topological cocycle. A genuine harmonic `H¹` would need
 * an INCOMPLETE flow graph (some triangles unfilled, `ker Δ₁ ≠ 0`) and a projection onto `ker Δ₁`; that is a
 * separate reading, and it stays a DIFFERENT obstruction from the li∘ki cross-cover square's sheaf `H¹` (a
 * different complex — the cover nerve — with sheaf coefficients). This organ never certifies that square.
 *
 * The circulation around each triangle `(i,j,k)` is `w(i,j) + w(j,k) + w(k,i)` (the gradient telescopes to
 * 0 around any cycle). {@link teFlowHodgeCoRestrictions} carries the two Hodge parts as cosheaf faces over
 * the triangle cofaces — the gradient face reads circulation 0 everywhere (a theorem), the rotational face
 * reads the actual curl — so {@link kiCoConsistency} co-extends (radius 0) exactly when the flow is
 * curl-free (a pure lead-lag potential, no irreducible coupling), and localizes any residual circulation to
 * the offending triangle. Drop-in for the retired MODWT-MRA co-restriction shore, zero call-site change.
 *
 * Whether the convergence this reads estimates one real quantity (inflationary) or grows wherever any
 * instrument imposes structure (deflationary) stays LIVE — this organ files the flow's parts by what they
 * carry and lets the aperture (the triangle cofaces) narrow them; it names no quantity it then hunts for.
 *
 * Meme: lar:///ha.ka.ba/lares/api/pono/sensorium-machina#ki · lar:///ha.ka.ba/lares/api/pono/cohomological-gate
 */

import type { MeshCoupling } from "./mesh-coupling.js";
import type { PlaneCoRestriction, CofaceStalk } from "./sensorium-consistency.js";

/** A directed transfer-entropy matrix + its node names — the shape {@link MeshCoupling} carries, taken thin. */
export interface TEFlow {
  readonly children: readonly string[];
  /** `te[i][j]` = directed TE(child_i → child_j) in bits; the diagonal reads 0. */
  readonly te: readonly (readonly number[])[];
}

/** One triangle's circulation — the flow's rotational content around the 3-cycle `(i,j,k)`, i<j<k. */
export interface TriangleCirculation {
  /** the three child indices, ascending. */
  readonly triangle: readonly [number, number, number];
  /** the coface id `t{i}-{j}-{k}` — the stalk cell this triangle contributes. */
  readonly coface: string;
  /** the signed circulation `w(i,j) + w(j,k) + w(k,i)` (bits); |value| is the irreducible-coupling magnitude. */
  readonly circulation: number;
}

/** The Helmholtz-Hodge reading of a TE flow — the reducible potential, the net flow, and its circulation. */
export interface TEHodgeDecomposition {
  readonly children: readonly string[];
  /** the HodgeRank node potential `s[i] = div[i]/n` — the reducible lead-lag ranking (mean-zero). */
  readonly potential: readonly number[];
  /** the net antisymmetric edge flow `w[i][j] = te[i][j] − te[j][i]` (bits). */
  readonly netFlow: readonly (readonly number[])[];
  /** per-triangle circulation — the rotational (irreducible) content the ki-radius reads. */
  readonly circulations: readonly TriangleCirculation[];
  /** the sup circulation magnitude over triangles — 0 ⟺ the flow is a pure gradient (curl-free). */
  readonly maxCirculation: number;
}

/** The coface id a triangle contributes to the stalk — `t{i}-{j}-{k}`, indices ascending. */
function triangleCoface(i: number, j: number, k: number): string {
  return `t${i}-${j}-${k}`;
}

/**
 * Decompose a directed TE flow into its Hodge parts. Reads the net antisymmetric flow, closes the HodgeRank
 * potential `s = div/n` (the reducible lead-lag ranking), and reads the circulation of the residual around
 * every triangle. Diagnostic only — an effective/TE flow never mints geometry; this reads its shape.
 */
export function hodgeDecomposeTEFlow(flow: TEFlow): TEHodgeDecomposition {
  const n = flow.children.length;
  const te = flow.te;

  // the net edge flow on the COMPLETE graph — antisymmetric, so its divergence is mean-zero.
  const netFlow: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const div = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const w = (te[i]?.[j] ?? 0) - (te[j]?.[i] ?? 0);
      netFlow[i]![j] = w;
      div[i]! += w;
    }
  }

  // the HodgeRank potential closes in one line on K_n: L s = div, Σs = 0 ⇒ s = div/n.
  const potential = n > 0 ? div.map((d) => d / n) : [];

  // the circulation around each triangle — the gradient telescopes to 0, so this reads the residual's curl.
  const circulations: TriangleCirculation[] = [];
  let maxCirculation = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const c = netFlow[i]![j]! + netFlow[j]![k]! + netFlow[k]![i]!;
        circulations.push({ triangle: [i, j, k], coface: triangleCoface(i, j, k), circulation: c });
        if (Math.abs(c) > maxCirculation) maxCirculation = Math.abs(c);
      }
    }
  }

  return { children: flow.children, potential, netFlow, circulations, maxCirculation };
}

/** The plane handles the two Hodge parts wear — reducible (gradient) ⊥ irreducible (rotational). */
export const HODGE_GRADIENT_FACE = "gradient";
export const HODGE_ROTATIONAL_FACE = "rotational";

/**
 * Build the ki cosheaf co-restrictions from a TE flow's Hodge decomposition — the drop-in replacement for
 * the retired MODWT-MRA wavelet co-restrictions. The coface stalk is the triangle universe; the two faces carry
 * the flow's Hodge parts by their circulation there:
 *
 *   • `gradient`   — circulation 0 on every triangle (a gradient is curl-free, a theorem).
 *   • `rotational` — the actual per-triangle circulation.
 *
 * {@link kiCoConsistency} over these co-extends (radius 0) exactly when every triangle is curl-free — the
 * flow reduces to a lead-lag potential and carries no irreducible coupling. A residual circulation pushes
 * the rotational face off the gradient's 0 and the radius goes positive, localized to the offending triangle.
 * With fewer than three children there are no triangles: an empty coface stalk, a vacuous read.
 */
export function teFlowHodgeCoRestrictions(flow: TEFlow): {
  stalk: CofaceStalk; coRestrictions: PlaneCoRestriction[];
} {
  const decomp = hodgeDecomposeTEFlow(flow);
  const cofaces = decomp.circulations.map((c) => c.coface);

  const gradientValue = new Map<string, number>();
  const rotationalValue = new Map<string, number>();
  for (const c of decomp.circulations) {
    gradientValue.set(c.coface, 0);           // the gradient part carries no circulation, anywhere
    rotationalValue.set(c.coface, c.circulation);
  }

  const coRestrictions: PlaneCoRestriction[] = [
    { plane: HODGE_GRADIENT_FACE, variance: "cosheaf", value: gradientValue },
    { plane: HODGE_ROTATIONAL_FACE, variance: "cosheaf", value: rotationalValue },
  ];
  return { stalk: { cofaces }, coRestrictions };
}

/* ───────────────────────────────────────────────────────────────────────────────────────────────
 * INCOMPLETE flow graph — the genuine harmonic reading (`ker Δ₁ ≠ 0`)
 *
 * The closed form `s = div/n` above rides the COMPLETE graph K_n, where every triple fills a triangle
 * and the clique complex contracts (`H¹ = 0`). Here the caller hands an EXPLICIT present-edge set: a pair
 * `(i,j)` carries a real edge, and any absent pair reads as GENUINELY missing — a hole the flow may
 * circulate, NOT a χ²-gated "no asymmetry" zero. Absent edges leave triangles unfilled, so `ker Δ₁` can
 * stand nonzero and the residual splits into a curl part (bounded by present triangles) PLUS a harmonic
 * part (a cycle that bounds no filled triangle). The read hands each part a handle by what it DOES:
 *
 *   • the GRADIENT part — the flow a node potential carries, `w(i,j) = s[i] − s[j]`, recovered by solving
 *     the PRESENT-edge graph Laplacian `L0 · s = div` (matrix-free conjugate gradient, s kept mean-zero).
 *   • the CURL part — the residual content the present triangles EXPLAIN, `im(B2ᵀ)`, reached by projecting
 *     the residual onto the triangle up-image (CG on the triangle up-Laplacian `B2·B2ᵀ`).
 *   • the HARMONIC part — the residual NO gradient and NO present-triangle explains: `harmonic = r − curlProj`,
 *     a divergence-free curl-free cycle. Its ENERGY `‖harmonic‖²` reads the irreducible topological content,
 *     and `β₁ = E − N + C − rank(B2)` counts the holes carrying it.
 *
 * HONESTY (the load-bearing distinction): this harmonic `H¹` reads the FLOW GRAPH's first cohomology
 * (`ker Δ₁` of the 1-skeleton-plus-filled-triangles complex on the children). It stays a DIFFERENT
 * obstruction from the li∘ki cross-cover square's SHEAF `H¹` — a different complex (the cover nerve) with
 * sheaf coefficients (Hansen–Ghrist 2019). This organ never certifies that square; it reads only the flow.
 * ─────────────────────────────────────────────────────────────────────────────────────────────── */

/** The Hodge reading of a TE flow over an INCOMPLETE (explicit-edge) graph — gradient ⊥ curl ⊥ harmonic. */
export interface IncompleteTEHodgeDecomposition {
  readonly children: readonly string[];
  /** the canonical present-edge set (each pair `i<j`, deduped) the reading rides. */
  readonly edges: readonly (readonly [number, number])[];
  /** the HodgeRank node potential solving `L0 · s = div` on the present-edge Laplacian (mean-zero). */
  readonly potential: readonly number[];
  /** the net antisymmetric flow on each present edge (oriented `i<j`): `w = te[i][j] − te[j][i]` (bits). */
  readonly netEdgeFlow: readonly number[];
  /** the residual `r = w − grad(s)` on present edges (divergence-free) — the curl-plus-harmonic content. */
  readonly residual: readonly number[];
  /** per-present-TRIANGLE circulation (the curl) — a triangle carries 3 mutually-present edges. */
  readonly circulations: readonly TriangleCirculation[];
  /** the harmonic edge component `r − curlProj` — the residual no present triangle explains (bits). */
  readonly harmonic: readonly number[];
  /** the harmonic energy `‖harmonic‖²` (bits²) — 0 ⟺ every divergence-free cycle bounds a filled triangle. */
  readonly harmonicEnergy: number;
  /** the sup `|circulation|` over present triangles — the local curl magnitude. */
  readonly maxCirculation: number;
  /** the first Betti number `β₁ = E − N + C − rank(B2)` — the count of holes the flow graph carries. */
  readonly betti1: number;
}

/** Dot two dense vectors of matching length. */
function dot(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

/**
 * Solve a symmetric-PSD system `A·x = b` matrix-free by conjugate gradient, starting from 0. Handles the
 * singular consistent case (`b ⟂ ker A`): the iterate stays orthogonal to the nullspace, so it converges
 * to the min-norm solution — exactly what a graph/triangle Laplacian with a constant (or cycle) nullspace
 * needs. `apply` carries the operator; the graph runs small, so a generous iteration cap costs nothing.
 */
function conjugateGradient(
  apply: (x: readonly number[]) => number[],
  b: readonly number[],
  tol = 1e-12,
): number[] {
  const dim = b.length;
  const x = new Array<number>(dim).fill(0);
  if (dim === 0) return x;
  const r = b.slice();
  let p = r.slice();
  let rsold = dot(r, r);
  const maxIter = 10 * dim + 64;
  for (let it = 0; it < maxIter && rsold > tol * tol; it++) {
    const ap = apply(p);
    const pap = dot(p, ap);
    if (pap <= tol * tol) break; // p fell into the nullspace, or the system converged
    const alpha = rsold / pap;
    for (let i = 0; i < dim; i++) {
      x[i]! += alpha * p[i]!;
      r[i]! -= alpha * ap[i]!;
    }
    const rsnew = dot(r, r);
    const beta = rsnew / rsold;
    for (let i = 0; i < dim; i++) p[i] = r[i]! + beta * p[i]!;
    rsold = rsnew;
  }
  return x;
}

/** Count matrix rank by tolerant Gaussian elimination (rows over `nCols` columns) — the graphs stay tiny. */
function matrixRank(rows: readonly (readonly number[])[], nCols: number, tol = 1e-9): number {
  const m = rows.map((row) => row.slice());
  const nRows = m.length;
  let rank = 0;
  for (let col = 0; col < nCols && rank < nRows; col++) {
    let pivot = -1;
    let best = tol;
    for (let r = rank; r < nRows; r++) {
      const v = Math.abs(m[r]![col]!);
      if (v > best) { best = v; pivot = r; }
    }
    if (pivot === -1) continue;
    [m[rank], m[pivot]] = [m[pivot]!, m[rank]!];
    const pv = m[rank]![col]!;
    for (let r = 0; r < nRows; r++) {
      if (r === rank) continue;
      const f = m[r]![col]! / pv;
      if (f !== 0) for (let c = col; c < nCols; c++) m[r]![c]! -= f * m[rank]![c]!;
    }
    rank++;
  }
  return rank;
}

/**
 * Decompose a directed TE flow over an INCOMPLETE graph into gradient ⊥ curl ⊥ harmonic. The caller names
 * the present edges explicitly (unordered pairs); absent pairs read as genuinely missing holes, never as
 * gated zeros. Solves the present-edge Laplacian for the potential, reads the residual, projects it onto
 * the present-triangle curl image, and reports the harmonic remainder, its energy, and the Betti-1 count.
 * Diagnostic only — a TE flow never mints geometry; this reads the shape the missing edges leave standing.
 */
export function hodgeDecomposeIncompleteTEFlow(
  flow: TEFlow,
  presentEdges: readonly (readonly [number, number])[],
): IncompleteTEHodgeDecomposition {
  const n = flow.children.length;
  const te = flow.te;

  // canonicalize the present-edge set to ascending `i<j`, deduped; drop self-pairs and out-of-range.
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (const [a, b] of presentEdges) {
    if (a === b || a < 0 || b < 0 || a >= n || b >= n) continue;
    const i = Math.min(a, b);
    const j = Math.max(a, b);
    const key = `${i}-${j}`;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([i, j]);
  }
  const E = edges.length;
  const edgeIndex = new Map<string, number>();
  edges.forEach(([i, j], e) => edgeIndex.set(`${i}-${j}`, e));

  // the net antisymmetric flow on each present edge, oriented `i<j`.
  const netEdgeFlow = edges.map(([i, j]) => (te[i]?.[j] ?? 0) - (te[j]?.[i] ?? 0));

  // the flow oriented a→b on a present edge (sign flips for a>b); 0 when the edge stays absent.
  const orientedFlow = (vec: readonly number[], a: number, b: number): number => {
    if (a < b) { const e = edgeIndex.get(`${a}-${b}`); return e === undefined ? 0 : vec[e]!; }
    const e = edgeIndex.get(`${b}-${a}`); return e === undefined ? 0 : -vec[e]!;
  };

  // the node divergence over PRESENT edges: div[i] = Σ_{j~i} w(i→j).
  const divergence = (vec: readonly number[]): number[] => {
    const d = new Array<number>(n).fill(0);
    edges.forEach(([i, j], e) => { d[i]! += vec[e]!; d[j]! -= vec[e]!; });
    return d;
  };
  const div = divergence(netEdgeFlow);

  // the present-edge graph Laplacian acting on a node potential: (L0 s)[i] = Σ_{j~i}(s[i] − s[j]).
  const applyL0 = (s: readonly number[]): number[] => {
    const out = new Array<number>(n).fill(0);
    for (const [i, j] of edges) {
      const g = s[i]! - s[j]!;
      out[i]! += g;
      out[j]! -= g;
    }
    return out;
  };

  // solve L0 s = div, then re-center mean-zero (a global constant leaves the gradient untouched).
  const potential = conjugateGradient(applyL0, div);
  if (n > 0) {
    const mean = potential.reduce((a, b) => a + b, 0) / n;
    for (let i = 0; i < n; i++) potential[i]! -= mean;
  }

  // the residual r = w − grad(s) on present edges (divergence-free by construction).
  const residual = edges.map(([i, j], e) => netEdgeFlow[e]! - (potential[i]! - potential[j]!));

  // present triangles — a triple whose three edges all carry a real edge; the curl reads their circulation.
  const triangles: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!edgeIndex.has(`${i}-${j}`)) continue;
      for (let k = j + 1; k < n; k++) {
        if (edgeIndex.has(`${j}-${k}`) && edgeIndex.has(`${i}-${k}`)) triangles.push([i, j, k]);
      }
    }
  }

  const circulations: TriangleCirculation[] = [];
  let maxCirculation = 0;
  for (const [i, j, k] of triangles) {
    const c = orientedFlow(netEdgeFlow, i, j) + orientedFlow(netEdgeFlow, j, k) + orientedFlow(netEdgeFlow, k, i);
    circulations.push({ triangle: [i, j, k], coface: triangleCoface(i, j, k), circulation: c });
    if (Math.abs(c) > maxCirculation) maxCirculation = Math.abs(c);
  }

  // curl of an edge vector, per triangle: y(i→j) + y(j→k) + y(k→i).
  const curl = (vec: readonly number[]): number[] =>
    triangles.map(([i, j, k]) => orientedFlow(vec, i, j) + orientedFlow(vec, j, k) + orientedFlow(vec, k, i));

  // curlᵀ (the triangle coboundary): scatter a per-triangle value back onto its three ascending edges.
  const curlT = (tri: readonly number[]): number[] => {
    const g = new Array<number>(E).fill(0);
    triangles.forEach(([i, j, k], t) => {
      const x = tri[t]!;
      g[edgeIndex.get(`${i}-${j}`)!]! += x;
      g[edgeIndex.get(`${j}-${k}`)!]! += x;
      g[edgeIndex.get(`${i}-${k}`)!]! -= x;
    });
    return g;
  };

  // project the residual onto im(curlᵀ): solve the triangle up-Laplacian (curl∘curlᵀ) x = curl(r), then scatter.
  const applyLtri = (x: readonly number[]): number[] => curl(curlT(x));
  const harmonic = residual.slice();
  if (triangles.length > 0) {
    const triSolve = conjugateGradient(applyLtri, curl(residual));
    const curlProj = curlT(triSolve);
    for (let e = 0; e < E; e++) harmonic[e]! -= curlProj[e]!;
  }
  const harmonicEnergy = dot(harmonic, harmonic);

  // β₁ = E − N + C − rank(B2): the cycle-space dimension minus the filled-triangle rank.
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]!]!; x = parent[x]!; } return x; };
  for (const [i, j] of edges) { const ri = find(i); const rj = find(j); if (ri !== rj) parent[ri] = rj; }
  let components = 0;
  for (let i = 0; i < n; i++) if (find(i) === i) components++;
  const b2Rows = triangles.map(([i, j, k]) => {
    const row = new Array<number>(E).fill(0);
    row[edgeIndex.get(`${i}-${j}`)!] = 1;
    row[edgeIndex.get(`${j}-${k}`)!] = 1;
    row[edgeIndex.get(`${i}-${k}`)!] = -1;
    return row;
  });
  const rankB2 = matrixRank(b2Rows, E);
  const betti1 = E - n + components - rankB2;

  return {
    children: flow.children,
    edges,
    potential,
    netEdgeFlow,
    residual,
    circulations,
    harmonic,
    harmonicEnergy,
    maxCirculation,
    betti1,
  };
}
