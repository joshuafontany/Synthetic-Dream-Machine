/**
 * boundary-residual — project a signal onto the smooth boundary subspace W* and read the RESIDUAL off it.
 * The residual rides the rough (top-λ) complement — the graph-Fourier surprise (Shuman 2013) / the SPE
 * Q-statistic of process monitoring (Jackson-Mudholkar 1979) — the part the boundary cannot explain, the
 * substrate a new sink nucleates from. The residual composes two ways (Fork-B): its MAGNITUDE → agreement
 * → birth; its signed PERSISTENCE → rhythm → standing. Kept apart from directed-boundary (operator
 * construction) — projection needs only a matvec, no eigensolver.
 *
 * Meme: lar:///ha.ka.ba/@lares/api/pono/mesh/flow
 */

type Mat = readonly (readonly number[])[];

/** The trivial (Perron/DC) eigenvector columns to deflate before projecting — `boundary.eigenbasis` sliced
 *  at `boundary.trivialModes`, so x⊥ = x − Σ (vᵢᵀx)vᵢ removes the baseline the split rests on (exact — the
 *  Chung/normalized trivial mode reads Φ^½/D^½1, NOT constant, so mean-centering only approximates it). */
export function columnsOf(matrix: Mat, indices: readonly number[]): number[][] {
  const n = matrix.length;
  return Array.from({ length: n }, (_, r) => indices.map((c) => matrix[r]?.[c] ?? 0));
}

export interface Projection {
  /** W*ᵀx⊥ — the smooth-subspace coordinates (length k). */
  readonly coords: number[];
  /** r = x⊥ − W* coords — the rough complement, per node (length n). */
  readonly residualVec: number[];
  /** ‖r‖² — the scalar SPE / Q-statistic. */
  readonly spe: number;
}

/** Project a signal onto the smooth boundary subspace; the residual rides the rough complement. `deflate`
 *  = the trivial columns removed first (x⊥ = x − Σ(vᵢᵀx)vᵢ). O(n·k). */
export function projectBoundary(signal: readonly number[], Wstar: Mat, deflate: Mat = []): Projection {
  const n = signal.length;
  // Deflate the trivial modes: x⊥ = x − Σ (dᵀx) d.
  const xperp = signal.slice();
  const dCols = deflate.length > 0 ? deflate[0]!.length : 0;
  for (let c = 0; c < dCols; c++) {
    let dot = 0;
    for (let r = 0; r < n; r++) dot += deflate[r]![c]! * signal[r]!;
    for (let r = 0; r < n; r++) xperp[r]! -= dot * deflate[r]![c]!;
  }
  const k = n > 0 && Wstar.length > 0 ? Wstar[0]!.length : 0;
  const coords = new Array<number>(k).fill(0);
  for (let c = 0; c < k; c++) {
    let s = 0;
    for (let r = 0; r < n; r++) s += Wstar[r]![c]! * xperp[r]!;
    coords[c] = s;
  }
  const residualVec = new Array<number>(n).fill(0);
  let spe = 0;
  for (let r = 0; r < n; r++) {
    let recon = 0;
    for (let c = 0; c < k; c++) recon += Wstar[r]![c]! * coords[c]!;
    const res = xperp[r]! - recon;
    residualVec[r] = res;
    spe += res * res;
  }
  return { coords, residualVec, spe };
}

/**
 * Per-node control limit Qα_p — the (1−α) EMPIRICAL quantile of the reference per-node residual-energy
 * r_p² (no distributional assumption; robust). A residual at Qα reads agreement 0.5, above → 1. Per-node
 * (not whole-SPE) so a contribution names WHICH node carries the anomaly — feeding the cross-plane
 * nucleation directly. (A parametric Box g·χ² limit rides as a later refinement; the shuffle-null of Qα
 * shares the deferred γ / rigidity-threshold null-calibration sprint.)
 */
export function controlLimit(refResiduals: Mat, alpha = 0.05, floor = 1e-9): number[] {
  const frames = refResiduals.length;
  const n = frames > 0 ? refResiduals[0]!.length : 0;
  const q = new Array<number>(n).fill(floor);
  for (let p = 0; p < n; p++) {
    const energies = refResiduals.map((row) => (row[p] ?? 0) ** 2).sort((a, b) => a - b);
    if (energies.length === 0) continue;
    const idx = Math.min(energies.length - 1, Math.max(0, Math.ceil((1 - alpha) * energies.length) - 1));
    // Floor at a numerical-noise limit: a residual below `floor` energy reads as machine noise, NOT surprise
    // (else a near-zero in-subspace residual saturates agreement to 0.5 on rounding error and false-births).
    q[p] = Math.max(energies[idx]!, floor);
  }
  return q;
}

export interface ComponentEvent {
  readonly plane: string;
  readonly agreement: number;
  readonly value: number;
}

/**
 * Emit one event PER boundary node from a projection: agreement = SPE_p/(SPE_p+Qα_p) (the soft gate — 0.5
 * at the control limit, →1 above, →0 below; bounded [0,1)), value = signed r_p (the rhythm override). The
 * caller ingests these into a Sink: nucleate births on cross-plane corroboration (a lone-node residual =
 * one plane = zero drive = the pareidolia/purple guard), temporalRigidity stands on residual recurrence.
 */
export function residualComponentEvents(
  proj: Projection,
  nodeNames: readonly string[],
  qAlpha: readonly number[],
): ComponentEvent[] {
  return proj.residualVec.map((r, p) => {
    const spe = r * r;
    const qa = qAlpha[p] ?? 0;
    const agreement = spe + qa > 0 ? spe / (spe + qa) : 0;
    return { plane: nodeNames[p] ?? `node-${p}`, agreement, value: r };
  });
}
