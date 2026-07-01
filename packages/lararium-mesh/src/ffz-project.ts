/**
 * ffz-project — the `lar_ffz` rhythmic address as a NESTED-MEMBERSHIP CONTAINMENT PATH.
 *
 * `lar_ffz` names WHERE a drawer's rhythm sits in a rooted membership tree — it is NOT
 * a projection of wall-time and NOT a clock. The FFZ tree is a meet-semilattice: each
 * band is a containment layer (coarse→fine), an address is a node, and the "distance
 * between two drawers' rhythms" is the co-depth of their lowest common ancestor — the
 * length of their longest common prefix (an ULTRAMETRIC, order-free).
 *
 * The five bands (coarse→fine, FFZ_ADDRESS_ORDER):
 *   - Theme   — thread cluster        (ARC-CLOSE trigger + MDL guard BUILT; the
 *               community-detection compute — igraph/leiden — stays deferred)
 *   - Arc     — the session = source_file (the session-island; given FREE)
 *   - Measure — topic-shift           (SERVO-DRIVEN — the Schmitt-trigger quorum gong)
 *   - Beat    — the turn (a grounding act, per-island; null-graceful where no clean
 *               turn label exists at the call site)
 *   - Pulse   — the drawer / inscription atom (the finest cell)
 *
 * Each segment is a MEMBERSHIP LABEL (a cell id), never a modular phase — so there is
 * NO bound, NO modulo, NO cycling here. The prior wall-time anchor ({capturedTime,
 * sessionPosition}) is REJECTED as un-pono (it imputed a global now); this module reads
 * only the containment labels a drawer already holds.
 *
 * RHYTHM-ONLY (the PATH-B cut): `lar_ffz` carries ZERO causality. Co-depth paces the
 * grain (how near two rhythms sit); it never orders history — causal order rides the
 * edge-DAG / itcCompare (itc.ts) / worldlineCompare (worldline-causal.ts), which this
 * module does NOT touch.
 *
 * Address shape — `"<profile>/<Theme>.<Arc>.<Measure>.<Beat>.<Pulse>"`, ordered
 * COARSE→FINE so a coarser read drops trailing bands cleanly (prefix-truncatable; see
 * {@link ffzTruncate}). An absent/fluid cell renders as the sentinel {@link FFZ_ABSENT}
 * (`_` — presence-of-the-band acknowledged, the cell unclaimed); trailing absent cells
 * are omitted entirely. A partial address still addresses.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

/** The coarse→fine band order the `lar_ffz` address serializes in (Theme first). */
export const FFZ_ADDRESS_ORDER = ["Theme", "Arc", "Measure", "Beat", "Pulse"] as const;

/** One of the five membership bands. */
export type FfzBand = (typeof FFZ_ADDRESS_ORDER)[number];

/**
 * The sentinel for a fluid/absent band cell — the band exists in the schema but the
 * cell is unclaimed here (Mu's `_`: presence acknowledged, essence unclaimed). It is
 * POROUS in {@link ffzCoDepth}/{@link ffzLca}: it neither counts as a shared cell nor
 * breaks the alignment, so a coarser shared cell still reads through an unknown band.
 * A real membership label is never expected to equal this single character.
 */
export const FFZ_ABSENT = "_";

/**
 * The membership cells a drawer holds — each an optional containment LABEL (a cell id),
 * never a phase. Absent/null cells render as {@link FFZ_ABSENT}. `profile` selects the
 * tree root (a namespace), default "session".
 */
export interface FfzCells {
  /** Theme (L4) — thread cluster. SET on arc-close re-cluster (the compute is deferred); usually absent. */
  readonly theme?: string | number | null;
  /** Arc (L3) — the session = source_file (the session-island). Given free. */
  readonly arc?: string | number | null;
  /** Measure (L2) — topic-shift. The servo emits this LABEL (the quorum gong); absent where the servo hasn't run. */
  readonly measure?: string | number | null;
  /** Beat (L1) — the turn (per-island; causally inert). Null-graceful. */
  readonly beat?: string | number | null;
  /** Pulse (L0) — the drawer / inscription atom (the finest cell). */
  readonly pulse?: string | number | null;
  /** The tree root selector (a namespace), default "session". */
  readonly profile?: string;
}

/** Map a band name to its cell value in an {@link FfzCells}. */
function cellOf(cells: FfzCells, band: FfzBand): string | number | null | undefined {
  switch (band) {
    case "Theme":   return cells.theme;
    case "Arc":     return cells.arc;
    case "Measure": return cells.measure;
    case "Beat":    return cells.beat;
    case "Pulse":   return cells.pulse;
  }
}

/**
 * Render a cell value as a delimiter-safe membership label, or {@link FFZ_ABSENT} when
 * absent/empty. `.` and `/` (the address delimiters) and whitespace collapse to `-` so
 * a source_file or content-id label can never split a segment or escape the path.
 */
function cellLabel(v: string | number | null | undefined): string {
  if (v == null) return FFZ_ABSENT;
  const s = String(v).trim().replace(/[./\s]+/g, "-");
  return s === "" ? FFZ_ABSENT : s;
}

const profileOf = (cells: FfzCells): string => {
  const p = cells.profile?.trim();
  return p && p.length ? p : "session";
};

/**
 * Build the `lar_ffz` membership address from a drawer's cells — pure, deterministic,
 * STATELESS. Walks FFZ_ADDRESS_ORDER (coarse→fine), renders each present cell as a
 * label and each absent one as {@link FFZ_ABSENT}, then OMITS trailing absent cells.
 * A partial set still addresses (e.g. Arc + Pulse only ⇒ `"session/_.<arc>._._.<pulse>"`;
 * Arc only ⇒ `"session/_.<arc>"`; nothing ⇒ the root `"session/"`).
 *
 * NAME NOTE: not `ffzAddress` — that name is held by the worldline trajectory's
 * clock-level address (worldline-clock.ts), a distinct subsystem. This is the drawer's
 * MEMBERSHIP address (the `lar_ffz` telemetry cell), so it carries the membership name.
 */
export function ffzMembershipAddress(cells: FfzCells): string {
  const segs = FFZ_ADDRESS_ORDER.map((b) => cellLabel(cellOf(cells, b)));
  while (segs.length && segs[segs.length - 1] === FFZ_ABSENT) segs.pop();
  return `${profileOf(cells)}/${segs.join(".")}`;
}

/** True when an address carries at least one real (non-sentinel) membership cell. */
export function ffzHasCell(address: string): boolean {
  const slash = address.indexOf("/");
  const tuple = slash < 0 ? address : address.slice(slash + 1);
  return tuple.split(".").some((s) => s !== "" && s !== FFZ_ABSENT);
}

/** Split an address into its `<profile>` and its coarse→fine segment tuple. */
function parseAddress(address: string): { profile: string; segs: string[] } {
  const slash = address.indexOf("/");
  if (slash < 0) return { profile: "", segs: address ? address.split(".") : [] };
  const profile = address.slice(0, slash);
  const rest = address.slice(slash + 1);
  return { profile, segs: rest ? rest.split(".") : [] };
}

/**
 * Take a coarser rhythmic read by keeping the first `bands` segments (coarse→fine,
 * Theme first) and dropping the trailing finer ones — the prefix-truncation the
 * address shape guarantees. The `<profile>/` prefix is preserved. Clamps to the
 * available band count; `bands <= 0` keeps the profile prefix with no bands.
 */
export function ffzTruncate(address: string, bands: number): string {
  const slash = address.indexOf("/");
  if (slash < 0) {
    // No profile prefix — operate on the bare band tuple.
    return address.split(".").slice(0, Math.max(0, bands)).join(".");
  }
  const prefix = address.slice(0, slash);
  const tuple = address.slice(slash + 1).split(".");
  const kept = tuple.slice(0, Math.max(0, bands));
  return `${prefix}/${kept.join(".")}`;
}

/**
 * The ULTRAMETRIC distance between two rhythms: the CO-DEPTH of their lowest common
 * ancestor = the count of REAL membership cells they share in the leading coarse→fine
 * run. Different `profile` (a different tree) ⇒ 0 (they share only the root). An
 * absent cell ({@link FFZ_ABSENT}) on either side is POROUS — it counts as neither
 * shared nor a divergence, so a coarser shared cell still reads through an unknown
 * band. The run ends at the first band where BOTH carry a real cell and they differ.
 *
 * Two drawers in the same session but different turns share Arc, not Beat (co-depth at
 * the Arc level); two in different sessions share only Theme-or-root (co-depth 0). This
 * is the order-free rhythmic distance — it paces the grain, it never orders history.
 */
export function ffzCoDepth(a: string, b: string): number {
  const A = parseAddress(a);
  const B = parseAddress(b);
  if (A.profile !== B.profile) return 0; // a different tree — share only the root
  let depth = 0;
  const n = Math.max(A.segs.length, B.segs.length);
  for (let i = 0; i < n; i++) {
    const x = A.segs[i] ?? FFZ_ABSENT;
    const y = B.segs[i] ?? FFZ_ABSENT;
    if (x === FFZ_ABSENT || y === FFZ_ABSENT) continue; // a fluid band — porous
    if (x === y) { depth++; continue; }                 // a shared real cell
    break;                                              // first real divergence — LCA found
  }
  return depth;
}

/**
 * The lowest common ancestor address — the deepest membership node both addresses sit
 * under, rendered as a `<profile>/…` prefix (porous absent cells preserved positionally,
 * trailing absents trimmed). Different `profile` ⇒ `""` (no common tree). The count of
 * real shared cells is {@link ffzCoDepth}; this is the node those cells name.
 */
export function ffzLca(a: string, b: string): string {
  const A = parseAddress(a);
  const B = parseAddress(b);
  if (A.profile !== B.profile) return ""; // no common tree
  const out: string[] = [];
  const n = Math.max(A.segs.length, B.segs.length);
  for (let i = 0; i < n; i++) {
    const x = A.segs[i] ?? FFZ_ABSENT;
    const y = B.segs[i] ?? FFZ_ABSENT;
    if (x === FFZ_ABSENT || y === FFZ_ABSENT) { out.push(FFZ_ABSENT); continue; }
    if (x === y) { out.push(x); continue; }
    break;
  }
  while (out.length && out[out.length - 1] === FFZ_ABSENT) out.pop();
  return `${A.profile}/${out.join(".")}`;
}

// ───────────────────────────────────────────────────────────────────────────
// MEASURE — the one-plane servo (a continuous→discrete Schmitt-trigger gong).
//
// The Measure band is the SINGLE hinge where the FFZ breathes continuously and
// COMMITS on a discrete GONG (the topic-shift wavefront). Between gongs the
// φ-bands free-run. The Measure cell it emits is a segment LABEL ("which-
// segment"), never a count.
//
// COLLAPSE (C-0): the one-plane Measure path is now PLANE-0 of the N-plane
// quorum servo below. {@link measureStep} is a thin back-compat wrapper —
// {@link centroidDriftStep} derives the content drift (`1 − cosine` against the
// running centroid) and {@link quorumStep} at N=1 makes the decision, where
// `effGong = min(quorumGong, 1) = 1` reproduces the single-plane gong byte-for-
// byte. The whole FAST/SLOW/MDL/FLOOR/CEIL/Schmitt decision lives ONCE, in
// {@link schmittGongCore} (shared by both paths).
//
// SIGNAL — the cosine of incoming content against the running centroid of the
// current segment. The vectors are the nomic embeddings the palace already holds
// (read back from chroma; this servo never embeds, it only consumes vectors).
// ───────────────────────────────────────────────────────────────────────────

/**
 * The SHARED servo tunables — the seven keys the one-plane Measure path and the N-plane
 * quorum path overlap on. {@link QUORUM_SERVO_DEFAULTS} spreads this base + adds the
 * quorum-only keys; {@link MEASURE_SERVO_DEFAULTS} aliases it (back-compat).
 */
export interface ServoBaseConfig {
  /** EWMA smoothing for the per-plane baselines AND the cross-plane correlation. */
  readonly ewmaAlpha: number;
  /** MDL: the segment-header cost (bits) a split's fused surprise must clear. */
  readonly mdlBits: number;
  /** FLOOR: no gong before this many members in the current segment. */
  readonly minSegment: number;
  /** CEIL: force a gong once the current segment reaches this many members. */
  readonly maxSegment: number;
  /** SLOW: the BOCPD-style expected segment length (re-anchored EWMA), relaxes the MDL bar with age. */
  readonly hazardLambda: number;
  /** How fast the MDL bar relaxes once a segment ages past λ (per extra member). */
  readonly ageRelax: number;
  /** Re-arm hysteresis: the trigger re-arms once the segment settles to/below this. */
  readonly reArmZ: number;
}

/** The shared base defaults — folded into both the Measure alias and the quorum spread. */
export const SERVO_DEFAULTS: ServoBaseConfig = {
  ewmaAlpha: 0.3,
  mdlBits: 4.0,
  minSegment: 3,
  maxSegment: 48,
  hazardLambda: 12,
  ageRelax: 0.05,
  reArmZ: 0.5,
};

/**
 * Tunables for {@link measureStep} — now the {@link ServoBaseConfig} base. The retired
 * one-plane FAST loop (zThreshold/zFloor) gives way to the quorum `gate` + age-relaxed MDL;
 * the name stays exported for back-compat callers.
 */
export type MeasureServoConfig = ServoBaseConfig;

/** Back-compat alias: the Measure servo's defaults ARE the shared base. */
export const MEASURE_SERVO_DEFAULTS: MeasureServoConfig = SERVO_DEFAULTS;

/**
 * The one-plane Measure servo's running state — now a THIN wrapper (the C-0 collapse): a
 * content centroid tracker beside the underlying {@link QuorumServoState} at N=1 (content =
 * plane-0). Only the quorum state's `segmentOrdinal` surfaces (as the Measure LABEL).
 */
export interface MeasureServoState {
  /** The running centroid of the current segment (the content vector tracker). */
  readonly centroid: readonly number[] | null;
  /** The underlying single-plane quorum-servo state (content = plane-0). */
  readonly qstate: QuorumServoState;
}

/** A fresh servo state — segment 0 opens on the first {@link measureStep} (no gong). */
export function measureServoInit(): MeasureServoState {
  return { centroid: null, qstate: quorumServoInit(1) };
}

const EPS = 1e-9;
/** The seed variance a fresh segment opens with (a fresh segment is maximally self-coherent). */
const VAR_SEED = 0.01;

/** Cosine similarity, zero-graceful (a zero/absent vector reads cohesion 0, not NaN). */
export function ffzCosine(a: readonly number[], b: readonly number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    dot += x * y; na += x * x; nb += y * y;
  }
  if (na < EPS || nb < EPS) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** The result of one {@link centroidDriftStep}: the raw content drift + the folded centroid. */
export interface CentroidDrift {
  /** The raw drift `1 − cosine(vector, centroid)` (monotone; 0 = perfectly coherent). */
  readonly drift: number;
  /** The centroid folded with this member (seeded to the member on a null/opening centroid). */
  readonly centroid: readonly number[];
}

/**
 * The per-plane VECTOR tracker — derive a member's raw drift against the running centroid and
 * fold it in. `drift = 1 − ffzCosine(vector, centroid)` (monotone: more drift = less cohesion);
 * the centroid folds as the running mean `(c·k + v)/(k+1)` over `count` prior members. A null
 * centroid (the segment opening) SEEDS to the member with drift 0. PURE — it feeds the one-plane
 * {@link measureStep} (content as plane-0 of {@link quorumStep}).
 */
export function centroidDriftStep(
  centroid: readonly number[] | null,
  vector: readonly number[],
  count = 0,
): CentroidDrift {
  if (centroid == null || count === 0) return { drift: 0, centroid: [...vector] };
  const drift = 1 - ffzCosine(vector, centroid);
  const folded = centroid.map((c, i) => (c * count + (vector[i] ?? 0)) / (count + 1));
  return { drift, centroid: folded };
}

/** The result of one servo step: the next state, the Measure LABEL, and whether a gong tripped. */
export interface MeasureStep {
  readonly state: MeasureServoState;
  /** The Measure cell label for THIS member (the segment it belongs to). */
  readonly label: string;
  /** True when this member opened a NEW segment via a topic-shift gong (the wavefront). */
  readonly gonged: boolean;
}

/**
 * Advance the one-plane Measure servo by one member vector — PURE. The C-0 collapse: derive the
 * content drift against the running centroid ({@link centroidDriftStep}) and route it as plane-0
 * through {@link quorumStep} at N=1, where `effGong = min(quorumGong, 1) = 1` reproduces the
 * single-plane gong byte-for-byte (the parity guard). A thin back-compat wrapper (external/test
 * callers keep the same shape); the decision math lives once, in the quorum servo + {@link
 * schmittGongCore}. drift = `1 − cosine` is a monotone, variance-preserving transform of the old
 * cohesion signal, so the standardized z (hence every label) is identical on the one-plane path.
 */
export function measureStep(
  state: MeasureServoState,
  vector: readonly number[],
  config: Partial<MeasureServoConfig> = {},
): MeasureStep {
  const openCount = state.qstate.count;
  const { drift, centroid: folded } = centroidDriftStep(state.centroid, vector, openCount);
  const step = quorumStep(state.qstate, [drift], config);
  // On a gong (or the opening) the new segment's centroid SEEDS to this member; else fold.
  const centroid = step.gonged || openCount === 0 ? [...vector] : folded;
  return { state: { centroid, qstate: step.state }, label: step.label, gonged: step.gonged };
}

// ───────────────────────────────────────────────────────────────────────────
// MEASURE (multivariate) — the THREE-PLANE quorum-servo (a Schmitt-trigger gong
// fused over content · form · structure plane-drifts).
//
// The one servo above reads a SINGLE plane (content cohesion). The Measure gong
// the schema actually wants fuses THREE plane-drifts into one wavefront. The
// load-bearing warning: the planes are NOT independent — form co-moves with
// content — so a naive max-OR or additive pool DOUBLE-COUNTS a single shift that
// shows on two planes. The quorum-servo guards against that in four moves:
//
//   1. COMMON CURRENCY — each plane's raw drift (arbitrary scale) is standardized
//      to a unit-free EWMA-z against its OWN running baseline (the FAST loop of the
//      one servo, generalized to N named planes). Raw-scale differences cannot leak:
//      a plane drifting in 0..0.01 and one in 0..1000 read the same z for the same
//      relative spike.
//   2. WHITEN — the standardized z-vector is decorrelated by a running EWMA estimate
//      of its cross-plane correlation (≈ corr matrix, since z is ~unit-variance),
//      via a ZCA (symmetric) inverse-sqrt transform {@link symInvSqrt}. A content+form
//      co-move that is really ONE shift collapses along the high-variance correlated
//      axis, so the joint surprise (Σ wₚ²) counts it ONCE, not twice.
//      SIMPLIFICATION FLAG: a RIDGE term (cfg.ridge, default 0.05) regularizes the
//      correlation matrix before inversion — the lightest honest guard against the
//      near-singular block a perfectly-correlated pair produces. This is the full
//      online-covariance whitening (N is tiny: 3), not the correlation-discount
//      fallback; the only simplification is the fixed ridge (a per-eigenvalue floor
//      could replace it, deferred).
//   3. SPARSIFIED FUSION (threshold-then-sum, Cho-Fryzlewicz; never max-OR) — each
//      plane clears its OWN noise-gate (cfg.gate, on the unit-variance whitened
//      scale) before contributing. Survivors pool MULTIPLICATIVELY as a log-opinion
//      pool / shared-hazard factorized Gaussian likelihood: the fused log-evidence
//      is Σ rₚ·(±wₚ²) — super-additive on agreement (squares add), self-vetoing on
//      conflict (a plane that strongly DENIES a boundary, wₚ < −vetoGate, SUBTRACTS,
//      driving the multiplicative likelihood toward a near-zero factor).
//   4. CONFIDENCE LADDER + CO-FIRING WINDOW — planes that fire within a co-firing
//      window (cfg.coFireWindow steps) are counted: 1 plane = provisional · 2 = firm ·
//      3 coincident = the gong. Reuses the one servo's Schmitt arming + FLOOR/CEIL/MDL.
//   5. CONFLICT GUARD (Signal-Jam) — one plane screaming with the others silent (or a
//      live positive/negative disagreement) flags `conflict` and NEVER fires the gong;
//      per-plane reliabilities precision-weight the pool so a low-SNR plane cannot
//      manufacture confidence on its own.
//
// PURE: like the one servo, every function returns fresh state and mutates nothing.
// This is the FUSION math over GIVEN per-plane drifts — the live 3-plane vector feed
// (content embeddings · form/structure signals) rides the node-side orchestrator
// (mempalace `ffz-orchestrator`), BUILT and tested; it runs live as a @daemon verb
// post-re-harvest (gated on the nuke/re-harvest), no daemon caller wired yet.
// ───────────────────────────────────────────────────────────────────────────

/** Plane index convention for the 3-plane servo (callers may use any N, ordered). */
export const MEASURE_PLANES = ["content", "form", "structure"] as const;

/** An N×N identity matrix (the cold-start correlation: planes assumed independent). */
function identityMatrix(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
}

/** Matrix·vector product (zero-graceful on length mismatch). */
function matVec(M: readonly (readonly number[])[], v: readonly number[]): number[] {
  return M.map((row) => row.reduce((s, x, j) => s + x * (v[j] ?? 0), 0));
}

/**
 * Normalize an accumulated second-moment matrix to a unit-diagonal CORRELATION matrix
 * (`R_ij = C_ij / √(C_ii·C_jj)`). This strips the absolute scale of the estimate so the
 * whitening that follows performs pure DECORRELATION, never a spurious rescale — robust
 * even when the running z is cold or under-dispersed. Diagonal pinned to 1.
 */
function toCorrelation(C: readonly (readonly number[])[]): number[][] {
  const n = C.length;
  const d = C.map((row, i) => Math.sqrt(Math.max(row[i] ?? 0, EPS)));
  return C.map((row, i) => row.map((v, j) => (i === j ? 1 : v / ((d[i] ?? 1) * (d[j] ?? 1) + EPS))));
}

/**
 * Symmetric eigendecomposition of a (small) symmetric matrix via cyclic Jacobi.
 * Returns eigenvalues and eigenvectors as columns (`vecs[i][k]` = component i of the
 * k-th eigenvector). Exact enough for the tiny (N≤~8) correlation matrices here.
 */
export function jacobiEigen(input: readonly (readonly number[])[]): { values: number[]; vecs: number[][] } {
  const n = input.length;
  const A = input.map((r) => r.slice());
  const V = identityMatrix(n);
  const at = (M: number[][], i: number, j: number): number => M[i]?.[j] ?? 0;
  const set = (M: number[][], i: number, j: number, x: number): void => {
    const row = M[i];
    if (row) row[j] = x;
  };
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += at(A, p, q) ** 2;
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = at(A, p, q);
        if (Math.abs(apq) < 1e-18) continue;
        const theta = (at(A, q, q) - at(A, p, p)) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = at(A, k, p), akq = at(A, k, q);
          set(A, k, p, c * akp - s * akq);
          set(A, k, q, s * akp + c * akq);
        }
        for (let k = 0; k < n; k++) {
          const apk = at(A, p, k), aqk = at(A, q, k);
          set(A, p, k, c * apk - s * aqk);
          set(A, q, k, s * apk + c * aqk);
        }
        for (let k = 0; k < n; k++) {
          const vkp = at(V, k, p), vkq = at(V, k, q);
          set(V, k, p, c * vkp - s * vkq);
          set(V, k, q, s * vkp + c * vkq);
        }
      }
    }
  }
  return { values: A.map((row, i) => row[i] ?? 0), vecs: V };
}

/**
 * The ZCA whitening matrix Σ^(-1/2) of a symmetric PSD matrix (the running correlation
 * estimate). RIDGE-regularized — `(1−ridge)·Σ + ridge·I` before inversion — so a
 * near-singular correlated block (ρ→1) stays invertible; `eigFloor` clamps any residual
 * tiny eigenvalue. Symmetric (Mahalanobis) whitening is chosen over Cholesky so each
 * whitened axis stays maximally aligned with its original plane (per-plane attribution
 * survives for the ladder + conflict guard). Pure. SIMPLIFICATION: fixed ridge (see the
 * section header) — the only honest shortcut in the whitening path.
 */
export function symInvSqrt(matrix: readonly (readonly number[])[], ridge = 0.05, eigFloor = 1e-6): number[][] {
  const n = matrix.length;
  const reg = matrix.map((row, i) => row.map((v, j) => (1 - ridge) * v + (i === j ? ridge : 0)));
  const { values, vecs } = jacobiEigen(reg);
  const inv = values.map((l) => 1 / Math.sqrt(Math.max(l, eigFloor)));
  const out = identityMatrix(n);
  for (let i = 0; i < n; i++) {
    const outRow = out[i];
    if (!outRow) continue;
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += (vecs[i]?.[k] ?? 0) * (inv[k] ?? 0) * (vecs[j]?.[k] ?? 0);
      outRow[j] = s;
    }
  }
  return out;
}

/** The per-plane common-currency baseline (EWMA mean + variance of that plane's drift). */
export interface PlaneZState {
  readonly mean: number;
  readonly var: number;
}

/** Tunables for {@link quorumStep}. All default via {@link QUORUM_SERVO_DEFAULTS}. */
export interface QuorumServoConfig {
  /** EWMA smoothing for the per-plane baselines AND the cross-plane correlation. */
  readonly ewmaAlpha: number;
  /** Per-plane noise-gate on the WHITENED unit-variance scale (a plane "fires" above it). */
  readonly gate: number;
  /** Anti-boundary veto gate: a plane below −vetoGate (unusually coherent) DENIES a boundary. */
  readonly vetoGate: number;
  /** A whitened-z above this counts as a plane "screaming" (for the Signal-Jam conflict guard). */
  readonly screamZ: number;
  /** Co-firing window (steps): planes firing within this many steps count as coincident. */
  readonly coFireWindow: number;
  /** Ladder: this many co-firing planes reads "firm". */
  readonly quorumFirm: number;
  /** Ladder: this many co-firing planes reads "gong" (and may commit a wavefront). */
  readonly quorumGong: number;
  /** MDL: the fused surprise (bits) a gong must clear (the segment-header cost). */
  readonly mdlBits: number;
  /** A floor the age-relaxed MDL bar never sinks below. */
  readonly mdlFloor: number;
  /** FLOOR: no gong before this many members in the current segment. */
  readonly minSegment: number;
  /** CEIL: force a gong once the current segment reaches this many members. */
  readonly maxSegment: number;
  /** BOCPD-style expected segment length (re-anchored EWMA), relaxes the MDL bar with age. */
  readonly hazardLambda: number;
  /** How fast the MDL bar relaxes once a segment ages past λ (per extra member). */
  readonly ageRelax: number;
  /** Re-arm hysteresis: re-arms once every plane's whitened z settles to/below this. */
  readonly reArmZ: number;
  /** Whitening ridge regularization (the FLAGGED simplification; see section header). */
  readonly ridge: number;
  /** Whether to whiten at all (false = naive marginal-z fusion; for contrast/tests). */
  readonly whiten: boolean;
  /** Per-plane reliability / SNR weights (default all 1) — precision-weights the pool. */
  readonly reliabilities?: readonly number[];
}

export const QUORUM_SERVO_DEFAULTS: QuorumServoConfig = {
  // The seven shared keys (ewmaAlpha · mdlBits · minSegment · maxSegment · hazardLambda ·
  // ageRelax · reArmZ) fold in from the one base; the quorum-only keys add below.
  ...SERVO_DEFAULTS,
  gate: 2.0,
  vetoGate: 2.0,
  screamZ: 3.0,
  coFireWindow: 3,
  quorumFirm: 2,
  quorumGong: 3,
  mdlFloor: 1.0,
  ridge: 0.05,
  whiten: true,
};

/** The confidence-ladder reading of a quorum step (the co-firing count, as a LABEL). */
export type MeasureLevel = "none" | "provisional" | "firm" | "gong";

/**
 * The quorum-servo's running state — PURE data carried between {@link quorumStep} calls.
 * `planes`/`corr`/`window`/`count`/`lambdaEff`/`armed` are internal calibration +
 * bookkeeping; only `segmentOrdinal` surfaces (as the Measure LABEL).
 */
export interface QuorumServoState {
  /** Per-plane common-currency baselines (parallel to the drift vector). */
  readonly planes: readonly PlaneZState[];
  /** EWMA estimate of the standardized cross-plane correlation (≈ corr matrix). */
  readonly corr: readonly (readonly number[])[];
  /** The co-firing ring: the last ≤coFireWindow steps' per-plane positive-fire flags. */
  readonly window: readonly (readonly boolean[])[];
  /** Members in the current segment so far (internal — NEVER the emitted label). */
  readonly count: number;
  /** Which segment we are in — the Measure cell LABEL seed (a label, not a count). */
  readonly segmentOrdinal: number;
  /** The re-anchored expected segment length (BOCPD hazard λ, EWMA'd). */
  readonly lambdaEff: number;
  /** Schmitt arming: false right after a gong, true once the new segment settles. */
  readonly armed: boolean;
}

/** A fresh quorum-servo over `planeCount` planes (default 3: content·form·structure; N=1 = the
 *  collapsed one-plane Measure path). */
export function quorumServoInit(planeCount: number = MEASURE_PLANES.length): QuorumServoState {
  return {
    planes: Array.from({ length: planeCount }, () => ({ mean: 0, var: VAR_SEED })),
    corr: identityMatrix(planeCount),
    window: [],
    count: 0,
    segmentOrdinal: 0,
    lambdaEff: NaN,
    armed: true,
  };
}

/** The result of one quorum-servo step. */
export interface QuorumStep {
  readonly state: QuorumServoState;
  /** The Measure cell label for THIS member (the segment it belongs to) — a label, not a count. */
  readonly label: string;
  /** True when this member committed a NEW segment via a tri-plane (or CEIL) gong. */
  readonly gonged: boolean;
  /** The confidence-ladder reading from the co-firing count (none·provisional·firm·gong). */
  readonly level: MeasureLevel;
  /** True in a Signal-Jam: one plane screams with the rest silent, or a live disagreement. */
  readonly conflict: boolean;
  /** How many planes are co-firing within the window (diagnostic; drives the ladder). */
  readonly quorum: number;
  /** The fused multiplicative surprise (bits) — de-double-counted via whitening. */
  readonly fusedBits: number;
  /** Per-plane common-currency z (pre-whiten) — diagnostic. */
  readonly perPlaneZ: readonly number[];
  /** Per-plane whitened (decorrelated) z — diagnostic. */
  readonly whitenedZ: readonly number[];
}

/** The minimal Schmitt-state {@link schmittGongCore} reads (a structural subset of the servo states). */
export interface SchmittGongState {
  /** Members in the current segment so far. */
  readonly count: number;
  /** The re-anchored expected segment length (BOCPD hazard λ, EWMA'd; NaN seeds to hazardLambda). */
  readonly lambdaEff: number;
  /** Schmitt arming: false right after a gong, true once the segment settles. */
  readonly armed: boolean;
  /** Which segment we are in — the LABEL seed. */
  readonly segmentOrdinal: number;
}

/** The verdict of {@link schmittGongCore} — the gong, the next ordinal/λ, and the next arming. */
export interface SchmittGongResult {
  readonly gong: boolean;
  readonly ordinal: number;
  readonly lambdaEff: number;
  readonly armed: boolean;
}

/**
 * The SHARED gong decision — the one continuous→discrete commit BOTH the one-plane Measure path
 * (via {@link measureStep}) and the N-plane {@link quorumStep} ride. Given the fused surprise
 * (bits), whether the FAST trigger `fired`, and whether the segment `settled` (for re-arming),
 * it returns the gong verdict + the next segment ordinal, re-anchored λ, and arming. PURE.
 *
 *   FLOOR — no gong before `minSegment` members (churn guard).
 *   CEIL  — force a gong at `maxSegment` members (staleness).
 *   MDL   — the fused surprise must clear `effMdl = max(mdlFloor, mdlBits − ageRelax·max(0,
 *           count−λ))`; the bar RELAXES as a segment ages past its expected length λ (BOCPD slow).
 *   λ-reanchor — on a gong, EWMA the closed segment's length back into λ.
 *   Schmitt — the `armed` gate blocks fast repeat-fires; re-arms once `settled`.
 */
export function schmittGongCore(
  state: SchmittGongState,
  fusedBits: number,
  fired: boolean,
  settled: boolean,
  cfg: Pick<QuorumServoConfig, "minSegment" | "maxSegment" | "mdlBits" | "mdlFloor" | "hazardLambda" | "ageRelax" | "ewmaAlpha">,
): SchmittGongResult {
  const lambda = Number.isNaN(state.lambdaEff) ? cfg.hazardLambda : state.lambdaEff;
  const floored = state.count < cfg.minSegment;
  const ceil = state.count >= cfg.maxSegment;
  const effMdl = Math.max(cfg.mdlFloor, cfg.mdlBits - cfg.ageRelax * Math.max(0, state.count - lambda));
  const fastGong = state.armed && !floored && fired && fusedBits > effMdl;
  const gong = ceil || fastGong;
  if (gong) {
    return {
      gong: true,
      ordinal: state.segmentOrdinal + 1,
      lambdaEff: (1 - cfg.ewmaAlpha) * lambda + cfg.ewmaAlpha * state.count,
      armed: false,
    };
  }
  return { gong: false, ordinal: state.segmentOrdinal, lambdaEff: lambda, armed: state.armed || settled };
}

/**
 * Advance the 3-plane quorum-servo by one per-plane drift vector — PURE. `drifts[p]` is
 * plane p's raw drift signal on its OWN scale (higher = more drift); the servo standardizes,
 * whitens, sparsifies, fuses, and decides. The opening member seeds baselines with no gong.
 *
 * KAPAE DOWN-WEIGHT (strand C): `weight` (default 1) scales THIS member's contribution —
 * a per-step salience, NOT new state. It rides TWO multiply-points: (1) FUSION — the fused
 * surprise scales `weight·r·wₚ²` (and the veto branch subtracts `weight·r·wₚ²`), so a
 * floor-salience member contributes little fused surprise and CANNOT trip a gong on its own
 * (it still crosses the gate, so it joins the co-firing quorum, but the MDL bar reads its
 * shrunken fusedBits); (2) CALIBRATION — `alphaEff = ewmaAlpha·weight` slows the per-plane
 * baselines AND the cross-plane correlation EWMA, so the road-not-taken (a rewound/forked
 * member) bends the running rhythm only faintly. `weight = 1` reproduces the prior output
 * BYTE-FOR-BYTE (the parity guard) — both points collapse to the original math.
 */
export function quorumStep(
  state: QuorumServoState,
  drifts: readonly number[],
  config: Partial<QuorumServoConfig> = {},
  weight = 1,
): QuorumStep {
  const cfg = { ...QUORUM_SERVO_DEFAULTS, ...config };
  const n = drifts.length;
  const lambda = Number.isNaN(state.lambdaEff) ? cfg.hazardLambda : state.lambdaEff;
  const zeros = new Array(n).fill(0) as number[];

  // The opening member — seed each plane's baseline from its first drift, no gong.
  if (state.count === 0) {
    const planes = drifts.map((d) => ({ mean: d, var: VAR_SEED }));
    const next: QuorumServoState = {
      planes, corr: identityMatrix(n), window: [new Array(n).fill(false)],
      count: 1, segmentOrdinal: state.segmentOrdinal, lambdaEff: lambda, armed: true,
    };
    return {
      state: next, label: String(state.segmentOrdinal), gonged: false,
      level: "none", conflict: false, quorum: 0, fusedBits: 0, perPlaneZ: zeros, whitenedZ: zeros,
    };
  }

  // 1. COMMON CURRENCY — standardize each plane's drift against its OWN baseline (pre-update).
  const z = drifts.map((d, p) => {
    const ps = state.planes[p] ?? { mean: 0, var: VAR_SEED };
    return (d - ps.mean) / Math.sqrt(ps.var + EPS);
  });

  // 2. WHITEN — decorrelate the z-vector by the running correlation estimate (ZCA).
  //    The accumulated second-moment is first normalized to a unit-diagonal CORRELATION
  //    matrix, so whitening ONLY decorrelates (the per-plane EWMA-z already fixed scale)
  //    and never spuriously rescales when the estimate is cold/under-dispersed.
  const w = cfg.whiten ? matVec(symInvSqrt(toCorrelation(state.corr), cfg.ridge), z) : z.slice();

  // 3. SPARSIFIED FUSION — each plane clears its own gate, survivors pool multiplicatively
  //    (Σ rₚ·(±wₚ²) = log of a factorized Gaussian likelihood; super-additive / self-vetoing).
  const rel = cfg.reliabilities;
  const firePos = new Array(n).fill(false) as boolean[];
  let fusedQuad = 0;
  let anyVeto = false, anyScream = false;
  for (let p = 0; p < n; p++) {
    const r = rel?.[p] ?? 1;
    const wp = w[p] ?? 0;
    if (wp > cfg.gate) {
      fusedQuad += weight * r * wp * wp; // kapae down-weight scales this member's surprise
      firePos[p] = true;
      if (wp > cfg.screamZ) anyScream = true;
    } else if (wp < -cfg.vetoGate) {
      fusedQuad -= weight * r * wp * wp; // a plane DENYING a boundary self-vetoes the pool
      anyVeto = true;
    }
  }
  const fusedBits = Math.max(0, fusedQuad) / (2 * Math.LN2);

  // 4. CO-FIRING WINDOW + LADDER — count planes firing within the window. The ladder CLAMPS
  //    to the plane count (the C-0 load-bearing fix): effGong = min(quorumGong, n), so N=1
  //    gongs on its single plane (reproducing the one servo), N=2 needs both, N=3 unchanged.
  const win = [...state.window, firePos].slice(-cfg.coFireWindow);
  const inWindow = new Array(n).fill(false) as boolean[];
  for (const flags of win) for (let p = 0; p < n; p++) if (flags[p]) inWindow[p] = true;
  const quorum = inWindow.filter(Boolean).length;
  const effGong = Math.min(cfg.quorumGong, n);
  const effFirm = Math.min(cfg.quorumFirm, n);
  const level: MeasureLevel =
    quorum >= effGong ? "gong" : quorum >= effFirm ? "firm" : quorum >= 1 ? "provisional" : "none";

  // 5. CONFLICT GUARD (Signal-Jam) — a lone scream, or a live positive/negative disagreement.
  const anyPos = firePos.some(Boolean);
  const conflict = (anyScream && quorum < effFirm) || (anyPos && anyVeto);

  // DECISION — the FAST fire is full (clamped) quorum + no veto; the SHARED gong core then
  // applies FLOOR / CEIL / age-relaxed MDL / λ-reanchor / Schmitt arm-rearm (the one decision
  // both this and the one-plane measureStep ride).
  const fired = quorum >= effGong && !anyVeto;
  const settled = w.every((wi) => Math.abs(wi) <= cfg.reArmZ);
  const core = schmittGongCore(state, fusedBits, fired, settled, cfg);

  // Calibration updates (per-plane baselines + cross-plane correlation), carried either way.
  // The kapae down-weight slows the EWMA: alphaEff = ewmaAlpha·weight, so a floor-salience
  // member barely reshapes the baseline (the road-not-taken bends the rhythm faintly).
  const alphaEff = cfg.ewmaAlpha * weight;
  const planes = state.planes.map((ps, p) => {
    const d = drifts[p] ?? ps.mean;
    const dev = d - ps.mean;
    return {
      mean: (1 - alphaEff) * ps.mean + alphaEff * d,
      var: (1 - alphaEff) * ps.var + alphaEff * dev * dev,
    };
  });
  const corr = state.corr.map((row, i) =>
    row.map((v, j) => (1 - alphaEff) * v + alphaEff * (z[i] ?? 0) * (z[j] ?? 0)),
  );

  if (core.gong) {
    const next: QuorumServoState = {
      planes, corr, window: [], count: 1, segmentOrdinal: core.ordinal, lambdaEff: core.lambdaEff, armed: false,
    };
    return {
      state: next, label: String(core.ordinal), gonged: true, level: "gong", conflict: false,
      quorum, fusedBits, perPlaneZ: z, whitenedZ: w,
    };
  }

  const next: QuorumServoState = {
    planes, corr, window: win, count: state.count + 1,
    segmentOrdinal: state.segmentOrdinal, lambdaEff: core.lambdaEff, armed: core.armed,
  };
  return { state: next, label: String(state.segmentOrdinal), gonged: false, level, conflict, quorum, fusedBits, perPlaneZ: z, whitenedZ: w };
}

// ───────────────────────────────────────────────────────────────────────────
// THEME — the cluster band, re-derived on ARC-CLOSE (session-rest), MDL-guarded.
//
// SCOPE FLAG: the cluster-COMPUTE (graph community-detection — CPM-Leiden via
// python-igraph, label-propagation delta for the incremental case) is a DEFERRED
// follow-up: python-igraph/leidenalg are NOT installed in the sidecar venv (only
// networkx + numpy), so a fresh cluster sidecar is out of scope for this pass.
// Built here: the ARC-CLOSE trigger predicate + the MDL/modularity ACCEPT guard
// (pure), so the compute drops straight into a standing scaffold when added. The
// Theme cell is a community LABEL local to THIS store — NEVER cross-vessel.
// ───────────────────────────────────────────────────────────────────────────

/**
 * ARC-CLOSE — consolidate-when-input-stops. True once the session has rested
 * (no new member for `restThresholdMs`). The caller owns the clock; this is the
 * pure predicate the Theme re-cluster fires behind (rest, not wall-time rhythm).
 */
export function ffzArcClosed(idleMs: number, restThresholdMs: number): boolean {
  return idleMs >= restThresholdMs && restThresholdMs > 0;
}

/**
 * The MDL/modularity guard: accept a re-cluster ONLY if the modularity GAIN pays
 * its description-length cost. The gain (newModularity − prevModularity) scaled by
 * the evidence (edge/member count, in bits) must clear the segment-header cost
 * `mdlBits`. A gain that does not pay is rejected — the prior clustering stands
 * (no churn, no thrash on noise). Pure; the compute that produces the modularities
 * is the deferred follow-up.
 */
export function ffzAcceptRecluster(args: {
  prevModularity: number;
  newModularity: number;
  evidenceBits: number;
  mdlBits?: number;
}): boolean {
  const mdl = args.mdlBits ?? MEASURE_SERVO_DEFAULTS.mdlBits;
  const gain = args.newModularity - args.prevModularity;
  if (gain <= 0) return false;
  return gain * args.evidenceBits > mdl;
}
