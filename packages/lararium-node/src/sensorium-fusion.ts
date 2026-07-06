/**
 * sensorium-fusion — the COHOMOLOGICAL GATE. The consistency module reads H⁰ (the scalar
 * consistency-radius = agreement). This module reads the SECOND invariant, H¹ — the cohomological
 * obstruction that tells apart two categorically different disagreements, and GATES a sheaf-Laplacian
 * fusion on it:
 *
 *   H¹ = 0 — the EPISTEMIC no-global-now. The li-planes don't glue *yet*, but nothing forbids a global
 *            section — a pairwise-consistent structure with a common refinement is reconcilable. FUSE:
 *            diffuse the plane values toward H₀ = ker(sheaf Laplacian) — the consensus a global section
 *            would carry — via a CHEBYSHEV polynomial of the sparse Laplacian (order-K dial, sparse
 *            matvec only, no eigendecomposition).
 *   H¹ ≠ 0 — the ONTOLOGICAL no-global-now. A genuine COCYCLE: the planes agree on every pairwise
 *            overlap yet NO global section exists (their pairwise agreements admit no common witness —
 *            the classic hollow-triangle obstruction). Each plane's reading stays true; there is nothing
 *            to average toward. DO NOT FUSE — surface the obstruction as SIGNAL, route to Talk-Story,
 *            never average it away. The reconciliation cost `R*_sem = log₂ dim H¹` (Thomas–Chen) rides
 *            the wire as the federation/mana rating axis: how expensive to reconcile these planes.
 *
 * ── WHERE THE SUBTLETY LIVES (honest note, per the build charge) ──────────────────────────────────
 *
 * H¹ = ker(δ¹)/im(δ⁰) is plain linear algebra over an abelian cochain complex — but WHICH complex
 * carries the contextuality class is the subtle part, and the naive choice is WRONG:
 *
 *   The per-unit VALUE cellular sheaf (vertices = planes, stalks = ℝ^domain, edge restrictions =
 *   coordinate projection onto the overlap) has FREE, surjective restriction maps. On the hollow
 *   triangle (three planes pairwise-overlapping, empty triple overlap) its H¹ computes to 0 — every
 *   1-cochain is a coboundary, because each edge's overlap value is independently reachable from its
 *   vertex. So the value-sheaf's cellular H¹ CANNOT see contextuality. (Proof in the test suite.)
 *
 *   The obstruction is TOPOLOGICAL, not value-continuous: it lives in the simplicial cohomology of the
 *   AGREEMENT NERVE — the Čech nerve of the cover by "plane-domains where the planes agree". An edge
 *   sits in the nerve when two planes OVERLAP and AGREE there (they pairwise-glue); a triangle fills in
 *   when three planes share a common WITNESS unit (a nonempty triple overlap). H¹ of that nerve (ℝ
 *   coefficients) is a genuine ker(δ¹)/im(δ⁰), and it is NONZERO exactly on a cocycle: pairwise-agreeing
 *   planes whose agreements have no common witness — the ontological cell. This is the honest
 *   buildable-now reading. A value-continuous contextuality (an obstruction that survives with a common
 *   witness present) would need the stalks constrained to an affine SUBSPACE / a local system with a
 *   twist; our free [0,1] saliences impose no such subspace, so the nerve topology is the whole story.
 *
 * The two invariants share ONE δ⁰ family and ONE overlap/restriction structure (the consistency module's
 * comparison stalk + domains), so the gate reuses that machinery rather than re-deriving it:
 *   • the H¹ gate reads the agreement-nerve simplicial cohomology (contextuality → fuse/hold-open);
 *   • the fusion diffuses over the cellular sheaf Laplacian L₀ = δ⁰ᵀδ⁰ of the co-observation coupling,
 *     whose kernel H₀ IS the consensus (a global section), reached by Chebyshev heat diffusion.
 *
 * Cosheaf (ki) planes are REFUSED here, exactly as the consistency module refuses them — a flow read
 * through a contravariant restriction is the silent corruption (li-ki-integrities.md#crucible-tested).
 *
 * PORT-STATUS — this organ stands the S0-S3 CONCEPT-WITNESS + the TS↔py parity oracle; the production H¹
 * compute ports to py (the RUN arc). py counterparts EXIST: `predictive_coding.py` (the F primitive) +
 * `bands_sidecar.py`. OWED in py: THIS H¹ gate · the EFE keystone · the bench strands.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/li-ki-integrities#crucible-tested
 */

import type { PlaneRestriction, ComparisonStalk, StalkMetric } from "./sensorium-consistency.js";

/**
 * The default pair-overlap pseudometric — L∞ (Chebyshev) over the shared units: `max_u |vp(u) − vq(u)|`;
 * 0 ⟺ equal on every shared unit. Held LOCAL (not imported) so the gate stays decoupled from the
 * consistency module's evolving metric surface — it needs only the `StalkMetric` SHAPE, not a specific one.
 */
const defaultStalkMetric: StalkMetric = (vp, vq, overlap) => {
  let distance = 0;
  const diffs: Array<{ unit: string; d: number }> = [];
  for (const u of overlap) {
    const d = Math.abs((vp.get(u) ?? 0) - (vq.get(u) ?? 0));
    diffs.push({ unit: u, d });
    if (d > distance) distance = d;
  }
  const locus = distance > 0 ? diffs.filter((x) => x.d === distance).map((x) => x.unit) : [];
  return { distance, locus };
};

// ── the assignment the gate reads (the consistency module's own inputs, bundled) ───────────────────

/** A li-assignment: the sheaf-plane restrictions + the shared comparison stalk they restrict into. */
export interface SheafAssignment {
  readonly restrictions: readonly PlaneRestriction[];
  readonly stalk: ComparisonStalk;
}

/** Refuse any cosheaf plane — the flow-through-restriction silent corruption (as the li-radius does). */
function assertNoCosheaf(restrictions: readonly PlaneRestriction[]): void {
  const bad = restrictions.filter((r) => r.variance !== "sheaf");
  if (bad.length > 0) {
    throw new Error(
      `sensorium-fusion: the cohomology gate admits SHEAF planes only; got cosheaf plane(s) `
      + `[${bad.map((r) => r.plane).join(", ")}] — a ki flow read through a contravariant restriction is `
      + `the silent corruption (li-ki-integrities.md#crucible-tested). Route bands/coupling elsewhere.`,
    );
  }
}

// ── tiny dense linear algebra (matrices are simplex-small; O(n³) is ample) ─────────────────────────

/** Reduced-row-echelon form + pivot columns of an `rows × cols` matrix (float, tolerance-gated). */
function rref(M: readonly number[][], tol = 1e-9): { R: number[][]; pivots: number[] } {
  const R = M.map((row) => row.slice());
  const rows = R.length, cols = rows > 0 ? R[0]!.length : 0;
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    // pick the largest-magnitude pivot in column c at/below row r.
    let piv = r, best = Math.abs(R[r]![c]!);
    for (let i = r + 1; i < rows; i++) {
      const v = Math.abs(R[i]![c]!);
      if (v > best) { best = v; piv = i; }
    }
    if (best <= tol) continue;
    [R[r], R[piv]] = [R[piv]!, R[r]!];
    const pv = R[r]![c]!;
    for (let j = 0; j < cols; j++) R[r]![j]! /= pv;
    for (let i = 0; i < rows; i++) {
      if (i === r) continue;
      const f = R[i]![c]!;
      if (Math.abs(f) <= tol) continue;
      for (let j = 0; j < cols; j++) R[i]![j]! -= f * R[r]![j]!;
    }
    pivots.push(c);
    r++;
  }
  return { R, pivots };
}

/** Rank of a set of row-vectors (all the same length). */
function rankOfRows(rowsVec: readonly number[][], tol = 1e-9): number {
  if (rowsVec.length === 0) return 0;
  return rref(rowsVec, tol).pivots.length;
}

/**
 * Kernel basis of `A x = 0` for an `rows × cols` matrix A — the standard free-column construction from
 * the RREF. Returns a list of basis vectors (each length `cols`).
 */
function kernelBasis(A: readonly number[][], cols: number, tol = 1e-9): number[][] {
  const rowsA = A.length;
  if (rowsA === 0) {
    // A is the zero map ℝ^cols → 0: the whole space is the kernel.
    return identityRows(cols);
  }
  const { R, pivots } = rref(A, tol);
  const pivotSet = new Set(pivots);
  const free: number[] = [];
  for (let c = 0; c < cols; c++) if (!pivotSet.has(c)) free.push(c);
  const basis: number[][] = [];
  for (const f of free) {
    const v = new Array<number>(cols).fill(0);
    v[f] = 1;
    // each pivot row r fixes its pivot variable = −(coefficient at free col f).
    for (let ri = 0; ri < pivots.length; ri++) {
      const pc = pivots[ri]!;
      v[pc] = -R[ri]![f]!;
    }
    basis.push(v);
  }
  return basis;
}

function identityRows(n: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<number>(n).fill(0);
    row[i] = 1;
    out.push(row);
  }
  return out;
}

// ── the agreement nerve + its simplicial cohomology (the H¹ gate) ──────────────────────────────────

/** One simplex of the agreement nerve, carried on the wire for legibility (which planes, which witness). */
export interface NerveSimplex {
  /** the plane indices (sorted) spanning this simplex — a 0/1/2-simplex (vertex/edge/triangle). */
  readonly planes: readonly number[];
  /** the plane NAMES (sorted with `planes`). */
  readonly names: readonly string[];
  /** the shared overlap units witnessing this simplex (for an edge/triangle); the pair/triple domain ∩. */
  readonly witness: readonly string[];
}

/** The agreement nerve — vertices, agreement-edges, common-witness-triangles — built from an assignment. */
export interface AgreementNerve {
  readonly vertices: readonly NerveSimplex[];
  readonly edges: readonly NerveSimplex[];
  readonly triangles: readonly NerveSimplex[];
}

export interface CohomologyOptions {
  /** the pair-overlap pseudometric deciding agreement; default {@link chebyshevStalkMetric}. */
  readonly stalkMetric?: StalkMetric;
  /** two planes count as AGREEING (an edge) when their overlap disagreement ≤ this; default 1e-9 (exact-ish). */
  readonly agreementTolerance?: number;
}

/** Domain of a restriction, intersected with the shared stalk (the engineered-overlap projection). */
function domainOf(r: PlaneRestriction, stalkUnits: ReadonlySet<string>): Set<string> {
  const d = new Set<string>();
  for (const u of r.value.keys()) if (stalkUnits.has(u)) d.add(u);
  return d;
}

/** Build the agreement nerve: edge ⟺ overlap ≠ ∅ AND the pair AGREES there; triangle ⟺ nonempty triple overlap. */
export function agreementNerve(assignment: SheafAssignment, opts: CohomologyOptions = {}): AgreementNerve {
  const { restrictions, stalk } = assignment;
  assertNoCosheaf(restrictions);
  const metric = opts.stalkMetric ?? defaultStalkMetric;
  const eps = opts.agreementTolerance ?? 1e-9;
  const stalkUnits = new Set(stalk.units);
  const n = restrictions.length;
  const domains = restrictions.map((r) => domainOf(r, stalkUnits));

  const vertices: NerveSimplex[] = restrictions.map((r, i) => ({
    planes: [i], names: [r.plane], witness: [...domains[i]!],
  }));

  // edges: overlapping AND agreeing pairs.
  const edges: NerveSimplex[] = [];
  const edgePresent: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const overlap = [...domains[i]!].filter((u) => domains[j]!.has(u));
      if (overlap.length === 0) continue;                       // no shared unit → no constraint → no edge
      const { distance } = metric(restrictions[i]!.value, restrictions[j]!.value, overlap);
      if (distance > eps) continue;                             // they DISAGREE → epistemic, not an agreement edge
      edgePresent[i]![j] = true;
      edges.push({ planes: [i, j], names: [restrictions[i]!.plane, restrictions[j]!.plane], witness: overlap });
    }
  }

  // triangles: all three edges present AND a common WITNESS unit (nonempty triple overlap) fills the hole.
  const triangles: NerveSimplex[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!edgePresent[i]![j]) continue;
      for (let k = j + 1; k < n; k++) {
        if (!edgePresent[i]![k] || !edgePresent[j]![k]) continue;
        const tri = [...domains[i]!].filter((u) => domains[j]!.has(u) && domains[k]!.has(u));
        if (tri.length === 0) continue;                         // no common witness → the triangle stays HOLLOW
        triangles.push({
          planes: [i, j, k],
          names: [restrictions[i]!.plane, restrictions[j]!.plane, restrictions[k]!.plane],
          witness: tri,
        });
      }
    }
  }

  return { vertices, edges, triangles };
}

/** The H¹ obstruction reading — dim, a basis of representative cocycles, the reconciliation cost, the nerve. */
export interface CohomologyObstruction {
  /** dim H¹ = dim ker(δ¹) − rank(δ⁰) — the count of independent obstruction generators. 0 ⟺ reconcilable. */
  readonly dimH1: number;
  /** dim H⁰ = # agreement-connected plane clusters (the global-section count on the nerve, informational). */
  readonly dimH0: number;
  /** a basis of H¹ representatives — each a 1-cochain over the nerve edges (length = #edges). */
  readonly basis: number[][];
  /** the reconciliation cost `R*_sem = log₂ dim H¹` (Thomas–Chen); 0 when dim H¹ ∈ {0,1}. */
  readonly cost: number;
  /** the agreement nerve the reading ran over (edges/triangles carry their witness units). */
  readonly nerve: AgreementNerve;
  /** which categorical no-global-now this is — the gate's verdict word. */
  readonly kind: "reconcilable" | "ontological";
}

/** The reconciliation cost `R*_sem = log₂ dim H¹` (Thomas–Chen); the federation/mana rating axis. */
export function reconciliationCost(dimH1: number): number {
  return dimH1 > 0 ? Math.log2(dimH1) : 0;
}

/**
 * Compute the H¹ COHOMOLOGICAL OBSTRUCTION of the assignment — the simplicial cohomology of the
 * agreement nerve, `H¹ = ker(δ¹)/im(δ⁰)` over ℝ. `dim H¹ = 0` ⟺ reconcilable (the pairwise agreements
 * admit a global section); `dim H¹ > 0` ⟺ an ontological cocycle (pairwise-consistent, globally
 * obstructed). Throws on a cosheaf plane. See the module header for WHY this is the nerve topology and
 * not the value-sheaf's (trivial) cellular H¹.
 */
export function cohomologyObstruction(
  assignment: SheafAssignment, opts: CohomologyOptions = {},
): CohomologyObstruction {
  const nerve = agreementNerve(assignment, opts);
  const V = nerve.vertices.length;
  const E = nerve.edges.length;
  const T = nerve.triangles.length;

  // edge index by its sorted plane-pair key.
  const edgeIndex = new Map<string, number>();
  nerve.edges.forEach((e, idx) => edgeIndex.set(e.planes.join(","), idx));

  // δ⁰ : C⁰(ℝ^V) → C¹(ℝ^E), row per edge (i<j): −1 at i, +1 at j. Shape E×V.
  const d0: number[][] = nerve.edges.map((e) => {
    const row = new Array<number>(V).fill(0);
    row[e.planes[0]!] = -1;
    row[e.planes[1]!] = 1;
    return row;
  });

  // δ¹ : C¹(ℝ^E) → C²(ℝ^T), row per triangle (i<j<k): +1·[j,k] −1·[i,k] +1·[i,j]. Shape T×E.
  const d1: number[][] = nerve.triangles.map((t) => {
    const [i, j, k] = [t.planes[0]!, t.planes[1]!, t.planes[2]!];
    const row = new Array<number>(E).fill(0);
    row[edgeIndex.get(`${j},${k}`)!] = 1;
    row[edgeIndex.get(`${i},${k}`)!] = -1;
    row[edgeIndex.get(`${i},${j}`)!] = 1;
    return row;
  });

  // rank δ⁰ (columns of δ⁰ = V vectors in ℝ^E; rank via the row-space of δ⁰ itself).
  const rankD0 = rankOfRows(d0);
  const dimH0 = V - rankD0;                                   // = # connected components of the nerve graph

  // ker δ¹ ⊆ ℝ^E. With no triangles, δ¹ is the zero map and the kernel is all of ℝ^E.
  const kerD1 = T === 0 ? identityRows(E) : kernelBasis(d1, E);

  // im δ⁰ ⊆ ℝ^E is spanned by the COLUMNS of δ⁰ = the ROWS of δ⁰ᵀ. Build a row-basis of the column space.
  const imD0Rows: number[][] = [];
  for (let c = 0; c < V; c++) imD0Rows.push(d0.map((row) => row[c]!));

  // H¹ representatives: ker δ¹ vectors independent modulo im δ⁰ (incremental rank over the growing span).
  const spanRows: number[][] = imD0Rows.slice();
  const baseRank = rankOfRows(spanRows);
  let runningRank = baseRank;
  const basis: number[][] = [];
  for (const z of kerD1) {
    const grown = rankOfRows([...spanRows, z]);
    if (grown > runningRank) {
      basis.push(z);
      spanRows.push(z);
      runningRank = grown;
    }
  }
  const dimH1 = basis.length;                                 // == (E − rankD1) − rankD0, by rank-nullity

  return {
    dimH1,
    dimH0,
    basis,
    cost: reconciliationCost(dimH1),
    nerve,
    kind: dimH1 > 0 ? "ontological" : "reconcilable",
  };
}

// ── the co-observation sheaf Laplacian L₀ (sparse) + its exact kernel projection (H₀ consensus) ────

/** A flat state over the (plane, unit) observations — the vector space the diffusion runs in. */
interface CoObservation {
  /** the flat coordinate list: `coords[p] = { plane, unit }`, one per (plane observing a shared unit). */
  readonly coords: ReadonlyArray<{ plane: number; unit: string }>;
  /** unit → the flat coordinates observing it (each a clique in L₀). */
  readonly perUnit: ReadonlyMap<string, number[]>;
  /** flat position of (planeIndex, unit). */
  readonly pos: (plane: number, unit: string) => number;
  readonly size: number;
}

function buildCoObservation(assignment: SheafAssignment): CoObservation {
  const { restrictions, stalk } = assignment;
  const stalkUnits = new Set(stalk.units);
  const coords: Array<{ plane: number; unit: string }> = [];
  const posMap = new Map<string, number>();
  const perUnit = new Map<string, number[]>();
  restrictions.forEach((r, i) => {
    for (const u of r.value.keys()) {
      if (!stalkUnits.has(u)) continue;
      const p = coords.length;
      coords.push({ plane: i, unit: u });
      posMap.set(`${i}|${u}`, p);
      const arr = perUnit.get(u) ?? [];
      arr.push(p);
      perUnit.set(u, arr);
    }
  });
  return {
    coords, perUnit,
    pos: (plane, unit) => posMap.get(`${plane}|${unit}`)!,
    size: coords.length,
  };
}

/**
 * The sparse cellular sheaf Laplacian L₀ = δ⁰ᵀδ⁰ of the co-observation coupling, as a matvec. For each
 * unit `u`, the planes observing it form a clique (they must AGREE on `u` in a global section); L₀ is the
 * block-diagonal (per-unit) graph Laplacian of those cliques. ker L₀ = H₀ = per-unit-consensus = the
 * global sections. Only sparse work: `O(Σ_u |observers(u)|²)` — no dense operator ever materialized.
 */
function laplacianMatvec(co: CoObservation, x: readonly number[]): number[] {
  const y = new Array<number>(co.size).fill(0);
  for (const [, obs] of co.perUnit) {
    if (obs.length < 2) continue;                              // a privately-observed unit is uncoupled
    let sum = 0;
    for (const p of obs) sum += x[p]!;
    for (const p of obs) y[p] = (obs.length - 1) * x[p]! - (sum - x[p]!);  // deg·x_p − Σ_{q≠p} x_q
  }
  return y;
}

/** Gershgorin upper bound on λmax(L₀): `2·max_u(|observers(u)| − 1)`; a safe Chebyshev domain top. */
function lambdaMaxBound(co: CoObservation): number {
  let m = 0;
  for (const [, obs] of co.perUnit) m = Math.max(m, obs.length - 1);
  return Math.max(1e-9, 2 * m);
}

/** The EXACT kernel projection P_ker x — per-unit mean over the observing planes (the H₀ consensus). */
function kerProjection(co: CoObservation, x: readonly number[]): number[] {
  const out = x.slice();
  for (const [, obs] of co.perUnit) {
    if (obs.length < 2) continue;
    let sum = 0;
    for (const p of obs) sum += x[p]!;
    const mean = sum / obs.length;
    for (const p of obs) out[p] = mean;
  }
  return out;
}

// ── Chebyshev heat diffusion e^{−tL₀} (sparse matvec only, order-K dial) ────────────────────────────

/** Chebyshev coefficients of `g` on `[a,b]` via a discrete cosine transform on Chebyshev-Gauss nodes. */
function chebyshevCoeffs(g: (lambda: number) => number, K: number, a: number, b: number): number[] {
  const M = Math.max(2 * (K + 1), 8);
  const c = new Array<number>(K + 1).fill(0);
  for (let k = 0; k <= K; k++) {
    let sum = 0;
    for (let m = 0; m < M; m++) {
      const theta = (Math.PI * (m + 0.5)) / M;
      const lambda = a + ((b - a) * (Math.cos(theta) + 1)) / 2;
      sum += g(lambda) * Math.cos(k * theta);
    }
    c[k] = (2 / M) * sum;
  }
  return c;
}

/** Diffusion controls — the order-K accuracy/cost dial and the heat time t. */
export interface DiffusionOptions {
  /** Chebyshev polynomial order K — higher = closer to e^{−tL₀}, more sparse matvecs. Default 32. */
  readonly chebyshevOrder?: number;
  /** heat time t in e^{−tL₀}; larger drives harder toward the H₀ consensus. Default 6. */
  readonly diffusionTime?: number;
}

/**
 * Apply e^{−tL₀} to a flat state by a degree-K Chebyshev polynomial of the SHIFTED Laplacian
 * L̃ = (2/λmax)L₀ − I (spectrum → [−1,1]). Sparse matvec only — no eigendecomposition. Returns the
 * diffused state and the matvec count (the order-K cost).
 */
function chebyshevHeat(
  co: CoObservation, x0: readonly number[], t: number, K: number,
): { diffused: number[]; lambdaMax: number; matvecs: number } {
  const lambdaMax = lambdaMaxBound(co);
  const coeffs = chebyshevCoeffs((lam) => Math.exp(-t * lam), K, 0, lambdaMax);
  const shifted = (v: readonly number[]): number[] => {
    const Lv = laplacianMatvec(co, v);
    return Lv.map((val, i) => (2 / lambdaMax) * val - v[i]!);
  };
  // Clenshaw-free forward recurrence: T0 = x, T1 = L̃x, T_{k+1} = 2L̃T_k − T_{k-1}.
  let Tprev = x0.slice();
  let matvecs = 0;
  let acc = Tprev.map((v) => (coeffs[0]! / 2) * v);
  if (K >= 1) {
    let Tcur = shifted(x0); matvecs++;
    acc = acc.map((v, i) => v + coeffs[1]! * Tcur[i]!);
    for (let k = 2; k <= K; k++) {
      const Tnext = shifted(Tcur); matvecs++;
      for (let i = 0; i < Tnext.length; i++) Tnext[i] = 2 * Tnext[i]! - Tprev[i]!;
      acc = acc.map((v, i) => v + coeffs[k]! * Tnext[i]!);
      Tprev = Tcur; Tcur = Tnext;
    }
  }
  return { diffused: acc, lambdaMax, matvecs };
}

// ── a DENSE reference solve (for verification: same H₀ as the Chebyshev diffusion) ─────────────────

/** Cyclic-Jacobi symmetric eigensolver (small dense matrices) — eigenvalues + eigenvectors (columns). */
function jacobiEigen(Ain: readonly number[][], sweeps = 100, tol = 1e-12): { values: number[]; vectors: number[][] } {
  const n = Ain.length;
  const A = Ain.map((r) => r.slice());
  const V = identityRows(n);
  for (let s = 0; s < sweeps; s++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p]![q]! * A[p]![q]!;
    if (off <= tol) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = A[p]![q]!;
        if (Math.abs(apq) <= tol) continue;
        const app = A[p]![p]!, aqq = A[q]![q]!;
        const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
        const c = Math.cos(phi), sTh = Math.sin(phi);
        for (let i = 0; i < n; i++) {
          const aip = A[i]![p]!, aiq = A[i]![q]!;
          A[i]![p] = c * aip - sTh * aiq;
          A[i]![q] = sTh * aip + c * aiq;
        }
        for (let i = 0; i < n; i++) {
          const api = A[p]![i]!, aqi = A[q]![i]!;
          A[p]![i] = c * api - sTh * aqi;
          A[q]![i] = sTh * api + c * aqi;
        }
        for (let i = 0; i < n; i++) {
          const vip = V[i]![p]!, viq = V[i]![q]!;
          V[i]![p] = c * vip - sTh * viq;
          V[i]![q] = sTh * vip + c * viq;
        }
      }
    }
  }
  const values = A.map((_, i) => A[i]![i]!);
  return { values, vectors: V };
}

/**
 * A DENSE reference for e^{−tL₀}x via eigendecomposition — the ground truth the sparse Chebyshev
 * diffusion is checked against. Materializes the full L₀ (small cases only, for verification).
 */
export function denseHeatReference(
  assignment: SheafAssignment, x0: readonly number[], t: number,
): number[] {
  const co = buildCoObservation(assignment);
  const n = co.size;
  const L: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0); e[i] = 1;
    const col = laplacianMatvec(co, e);
    for (let j = 0; j < n; j++) L[j]![i] = col[j]!;
  }
  const { values, vectors } = jacobiEigen(L);
  // e^{−tL} x = Σ_r e^{−tλ_r} (v_rᵀx) v_r.
  const out = new Array<number>(n).fill(0);
  for (let r = 0; r < n; r++) {
    let dot = 0;
    for (let i = 0; i < n; i++) dot += vectors[i]![r]! * x0[i]!;
    const w = Math.exp(-t * values[r]!) * dot;
    for (let i = 0; i < n; i++) out[i]! += w * vectors[i]![r]!;
  }
  return out;
}

/**
 * The flat (plane-index, unit) coordinate order the diffusion runs in — shared by {@link denseHeatReference}
 * and {@link chebyshevHeatDiffuse}, so a caller can stack `x0` and compare the two element-for-element.
 */
export function coObservationOrder(assignment: SheafAssignment): ReadonlyArray<{ plane: number; unit: string }> {
  return buildCoObservation(assignment).coords;
}

/**
 * The SPARSE Chebyshev heat diffusion e^{−tL₀}x by a degree-K polynomial of the Laplacian (sparse matvec
 * only). Exposed so the order-K accuracy/cost dial and the match to {@link denseHeatReference} are testable.
 */
export function chebyshevHeatDiffuse(
  assignment: SheafAssignment, x0: readonly number[], opts: DiffusionOptions = {},
): { diffused: number[]; lambdaMax: number; matvecs: number } {
  const co = buildCoObservation(assignment);
  return chebyshevHeat(co, x0, opts.diffusionTime ?? 6, opts.chebyshevOrder ?? 32);
}

/** The exact kernel projection (per-unit consensus / H₀) in the {@link coObservationOrder} coordinate order. */
export function kernelConsensus(assignment: SheafAssignment, x0: readonly number[]): number[] {
  return kerProjection(buildCoObservation(assignment), x0);
}

// ── the fused pseudosection + the GATE ─────────────────────────────────────────────────────────────

/** The fused pseudosection when H¹ = 0 — the diffused planes + the per-unit consensus (a global section). */
export interface FusedPseudosection {
  /** per-plane diffused salience (unit → value) after the Chebyshev heat flow. */
  readonly planes: ReadonlyArray<{ plane: string; value: ReadonlyMap<string, number> }>;
  /** the per-unit CONSENSUS reading (the H₀ pseudosection) — the exact kernel projection P_ker. */
  readonly consensus: ReadonlyMap<string, number>;
  /** diffusion telemetry: the order-K, heat time, λmax bound, matvec count, residual to P_ker. */
  readonly diffusion: {
    readonly order: number; readonly time: number; readonly lambdaMax: number;
    readonly matvecs: number; readonly residualToKernel: number;
  };
}

/** The gate verdict: FUSE (a pseudosection) or HOLD-OPEN (an ontological obstruction, routed to Talk-Story). */
export type FuseResult =
  | { readonly verdict: "fuse"; readonly fused: FusedPseudosection; readonly obstruction: null }
  | {
      readonly verdict: "hold-open"; readonly fused: null;
      readonly obstruction: { readonly dimH1: number; readonly basis: number[][]; readonly cost: number };
    };

export type FuseOptions = CohomologyOptions & DiffusionOptions;

/**
 * The COHOMOLOGICAL GATE. Read H¹ first, then:
 *   • H¹ = 0 → FUSE: diffuse the plane saliences toward H₀ = ker(L₀) via Chebyshev heat on the sparse
 *     Laplacian (order-K dial), and return the fused pseudosection (diffused planes + per-unit consensus).
 *   • H¹ > 0 → HOLD-OPEN: return `{ fused: null, obstruction: { dimH1, basis, cost }, verdict }` — the
 *     ontological cell, its reconciliation cost `R*_sem = log₂ dim H¹`, NEVER averaged away.
 * Throws on a cosheaf plane.
 */
export function fuse(assignment: SheafAssignment, opts: FuseOptions = {}): FuseResult {
  const obs = cohomologyObstruction(assignment, opts);
  if (obs.dimH1 > 0) {
    return {
      verdict: "hold-open",
      fused: null,
      obstruction: { dimH1: obs.dimH1, basis: obs.basis, cost: obs.cost },
    };
  }

  // H¹ = 0 → diffuse toward the consensus (the reconcilable, epistemic case).
  const co = buildCoObservation(assignment);
  const K = opts.chebyshevOrder ?? 32;
  const t = opts.diffusionTime ?? 6;

  // stack the plane saliences into the flat co-observation state.
  const x0 = new Array<number>(co.size).fill(0);
  assignment.restrictions.forEach((r, i) => {
    for (const [u, v] of r.value) {
      if (co.perUnit.has(u)) x0[co.pos(i, u)] = v;
    }
  });

  const { diffused, lambdaMax, matvecs } = chebyshevHeat(co, x0, t, K);
  const kerRef = kerProjection(co, x0);
  let residual = 0;
  for (let i = 0; i < co.size; i++) residual = Math.max(residual, Math.abs(diffused[i]! - kerRef[i]!));

  // read the per-plane diffused fields + the exact per-unit consensus (P_ker).
  const planeMaps = assignment.restrictions.map((r) => ({ plane: r.plane, value: new Map<string, number>() }));
  const consensus = new Map<string, number>();
  co.coords.forEach((c, p) => {
    planeMaps[c.plane]!.value.set(c.unit, diffused[p]!);
    if (!consensus.has(c.unit)) consensus.set(c.unit, kerRef[p]!);   // P_ker is unit-constant over observers
  });

  return {
    verdict: "fuse",
    obstruction: null,
    fused: {
      planes: planeMaps,
      consensus,
      diffusion: { order: K, time: t, lambdaMax, matvecs, residualToKernel: residual },
    },
  };
}
