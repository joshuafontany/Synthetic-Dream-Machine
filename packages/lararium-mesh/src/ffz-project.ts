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
 *   - Theme   — thread cluster        (FLUID, deferred to stage two)
 *   - Arc     — the session = source_file (the session-island; given FREE)
 *   - Measure — topic-shift           (FLUID, deferred to stage two)
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
 * edge-DAG / ffzCausalCompare (ffz-clock.ts), which this module does NOT touch.
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
  /** Theme (L4) — thread cluster. FLUID (stage two); usually absent. */
  readonly theme?: string | number | null;
  /** Arc (L3) — the session = source_file (the session-island). Given free. */
  readonly arc?: string | number | null;
  /** Measure (L2) — topic-shift. FLUID (stage two); usually absent. */
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
// MEASURE — the one servo (a continuous→discrete Schmitt-trigger gong).
//
// The Measure band is the SINGLE hinge where the FFZ breathes continuously and
// COMMITS on a discrete GONG (the topic-shift wavefront). Between gongs the
// φ-bands free-run; this servo is the only continuous→discrete mechanism in the
// schema. The Measure cell it emits is a segment LABEL ("which-segment"), never
// a count — the running internal `count` is bookkeeping the address never sees.
//
// SIGNAL — the cosine of incoming content against the running centroid of the
// current segment. The vectors are the nomic embeddings the palace already holds
// (read back from chroma; this servo never embeds, it only consumes vectors).
//
// TWO-LOOP (nalu-shaped) THRESHOLD:
//   FAST  — fire when the cohesion-drop is an outlier vs the within-segment
//           cohesion baseline (an EWMA mean + EWMA variance → a z-score).
//   SLOW  — re-anchor the expected segment length (a BOCPD-style hazard λ,
//           EWMA'd per session) so the bar RELAXES as a segment ages past λ.
//   MDL   — a split must pay its segment-header cost (the drop's Gaussian
//           surprise, in bits, must clear `mdlBits`) — stops marginal splits.
//   FLOOR — no gong before `minSegment` members — stops churn.
//   CEIL  — force a gong at `maxSegment` members — stops staleness.
//
// Hysteresis (the Schmitt part): after a gong the trigger DISARMS; it re-arms
// only once the new segment settles (a coherent member, z ≤ reArmZ), so a slow
// monotone drift cannot machine-gun gongs on consecutive steps.
// ───────────────────────────────────────────────────────────────────────────

/** Tunables for {@link measureStep}. All have defaults via {@link MEASURE_SERVO_DEFAULTS}. */
export interface MeasureServoConfig {
  /** FAST: the z-score outlier bar a cohesion-drop must clear to gong. */
  readonly zThreshold: number;
  /** A floor the relaxed bar never sinks below (except the CEIL force). */
  readonly zFloor: number;
  /** EWMA smoothing for the within-segment cohesion baseline (mean + variance). */
  readonly ewmaAlpha: number;
  /** SLOW: the BOCPD-style expected segment length (re-anchored EWMA per session). */
  readonly hazardLambda: number;
  /** How fast the z bar relaxes once a segment ages past λ (per extra member). */
  readonly ageRelax: number;
  /** MDL: the segment-header cost (bits) a split's surprise must clear. */
  readonly mdlBits: number;
  /** FLOOR: no gong before this many members in the current segment. */
  readonly minSegment: number;
  /** CEIL: force a gong once the current segment reaches this many members. */
  readonly maxSegment: number;
  /** Re-arm hysteresis: the trigger re-arms once a member's z drops to/below this. */
  readonly reArmZ: number;
}

export const MEASURE_SERVO_DEFAULTS: MeasureServoConfig = {
  zThreshold: 3.0,
  zFloor: 1.0,
  ewmaAlpha: 0.3,
  hazardLambda: 12,
  ageRelax: 0.05,
  mdlBits: 4.0,
  minSegment: 3,
  maxSegment: 48,
  reArmZ: 0.5,
};

/**
 * The servo's running state — PURE data, carried between {@link measureStep} calls.
 * `count`/`cohMean`/`cohVar`/`lambdaEff`/`armed` are internal bookkeeping; only
 * `segmentOrdinal` surfaces (as the Measure LABEL). Never serialized into an address.
 */
export interface MeasureServoState {
  /** The running centroid of the current segment (mean of its member vectors). */
  readonly centroid: readonly number[] | null;
  /** Members in the current segment so far (internal — NEVER the emitted label). */
  readonly count: number;
  /** EWMA of within-segment cohesion (the baseline the drop reads against). */
  readonly cohMean: number;
  /** EWMA variance of within-segment cohesion. */
  readonly cohVar: number;
  /** The re-anchored expected segment length (BOCPD hazard λ, EWMA'd). */
  readonly lambdaEff: number;
  /** Which segment we are in — the Measure cell LABEL seed (a label, not a count). */
  readonly segmentOrdinal: number;
  /** Schmitt arming: false right after a gong, true once the new segment settles. */
  readonly armed: boolean;
}

/** A fresh servo state — segment 0 opens on the first {@link measureStep} (no gong). */
export function measureServoInit(): MeasureServoState {
  return { centroid: null, count: 0, cohMean: 1, cohVar: 0.01, lambdaEff: NaN, segmentOrdinal: 0, armed: true };
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

/** The result of one servo step: the next state, the Measure LABEL, and whether a gong tripped. */
export interface MeasureStep {
  readonly state: MeasureServoState;
  /** The Measure cell label for THIS member (the segment it belongs to). */
  readonly label: string;
  /** True when this member opened a NEW segment via a topic-shift gong (the wavefront). */
  readonly gonged: boolean;
}

/**
 * Advance the one servo by one member vector — PURE (returns fresh state, mutates nothing).
 *
 * The opening member of segment 0 is NOT a gong (no wavefront crossed); thereafter a member
 * either CONTINUES the current segment (the φ-band free-runs, the centroid/baseline update) or
 * TRIPS a gong (the FAST/SLOW/MDL/CEIL decision below), opening a new segment whose ordinal
 * becomes its label. The FLOOR blocks a gong before `minSegment`; the CEIL forces one at
 * `maxSegment` regardless of cohesion (staleness); hysteresis blocks repeat-fires until re-armed.
 */
export function measureStep(
  state: MeasureServoState,
  vector: readonly number[],
  config: Partial<MeasureServoConfig> = {},
): MeasureStep {
  const cfg = { ...MEASURE_SERVO_DEFAULTS, ...config };
  const lambda = Number.isNaN(state.lambdaEff) ? cfg.hazardLambda : state.lambdaEff;

  // The opening of segment 0 — establish the first centroid, no gong.
  if (state.centroid == null || state.count === 0) {
    const next: MeasureServoState = {
      centroid: [...vector], count: 1, cohMean: 1, cohVar: VAR_SEED,
      lambdaEff: lambda, segmentOrdinal: state.segmentOrdinal, armed: true,
    };
    return { state: next, label: String(state.segmentOrdinal), gonged: false };
  }

  // The cohesion of the incoming member against the established segment centroid.
  const coh = ffzCosine(vector, state.centroid);
  const sd = Math.sqrt(state.cohVar + EPS);
  const z = (state.cohMean - coh) / sd;          // positive z = a cohesion DROP
  const surpriseBits = (z * z) / (2 * Math.LN2); // Gaussian surprise of the drop, in bits

  // The relaxed bar: drops as the segment ages past the (re-anchored) expected length λ.
  const effZ = Math.max(cfg.zFloor, cfg.zThreshold - cfg.ageRelax * Math.max(0, state.count - lambda));

  const ceil = state.count >= cfg.maxSegment;    // staleness — force a break
  const floored = state.count < cfg.minSegment;  // churn guard — too soon to break
  const fastFire = state.armed && !floored && z > effZ && surpriseBits > cfg.mdlBits;
  const gong = ceil || fastFire;

  if (gong) {
    // Re-anchor λ (SLOW loop) from the segment we just closed, then open the new one
    // from THIS member; its ordinal is its label. Disarm (Schmitt) until it settles.
    const lambdaEff = (1 - cfg.ewmaAlpha) * lambda + cfg.ewmaAlpha * state.count;
    const ordinal = state.segmentOrdinal + 1;
    const next: MeasureServoState = {
      centroid: [...vector], count: 1, cohMean: 1, cohVar: VAR_SEED,
      lambdaEff, segmentOrdinal: ordinal, armed: false,
    };
    return { state: next, label: String(ordinal), gonged: true };
  }

  // CONTINUE the segment: fold the member into the centroid + update the EWMA baseline.
  const k = state.count;
  const centroid = state.centroid.map((c, i) => (c * k + (vector[i] ?? 0)) / (k + 1));
  const dev = coh - state.cohMean;
  const cohMean = (1 - cfg.ewmaAlpha) * state.cohMean + cfg.ewmaAlpha * coh;
  const cohVar = (1 - cfg.ewmaAlpha) * state.cohVar + cfg.ewmaAlpha * dev * dev;
  const armed = state.armed || z <= cfg.reArmZ; // re-arm once the new segment settles
  const next: MeasureServoState = {
    centroid, count: k + 1, cohMean, cohVar, lambdaEff: lambda,
    segmentOrdinal: state.segmentOrdinal, armed,
  };
  return { state: next, label: String(state.segmentOrdinal), gonged: false };
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
// (content embeddings · form/structure signals) rides the deferred orchestrator.
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
function jacobiEigen(input: readonly (readonly number[])[]): { values: number[]; vecs: number[][] } {
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
  ewmaAlpha: 0.3,
  gate: 2.0,
  vetoGate: 2.0,
  screamZ: 3.0,
  coFireWindow: 3,
  quorumFirm: 2,
  quorumGong: 3,
  mdlBits: 4.0,
  mdlFloor: 1.0,
  minSegment: 3,
  maxSegment: 48,
  hazardLambda: 12,
  ageRelax: 0.05,
  reArmZ: 0.5,
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

/** A fresh quorum-servo over `planeCount` planes (default 3: content·form·structure). */
export function quorumServoInit(planeCount = MEASURE_PLANES.length): QuorumServoState {
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

/**
 * Advance the 3-plane quorum-servo by one per-plane drift vector — PURE. `drifts[p]` is
 * plane p's raw drift signal on its OWN scale (higher = more drift); the servo standardizes,
 * whitens, sparsifies, fuses, and decides. The opening member seeds baselines with no gong.
 */
export function quorumStep(
  state: QuorumServoState,
  drifts: readonly number[],
  config: Partial<QuorumServoConfig> = {},
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
      fusedQuad += r * wp * wp;
      firePos[p] = true;
      if (wp > cfg.screamZ) anyScream = true;
    } else if (wp < -cfg.vetoGate) {
      fusedQuad -= r * wp * wp; // a plane DENYING a boundary self-vetoes the pool
      anyVeto = true;
    }
  }
  const fusedBits = Math.max(0, fusedQuad) / (2 * Math.LN2);

  // 4. CO-FIRING WINDOW + LADDER — count planes firing within the window.
  const win = [...state.window, firePos].slice(-cfg.coFireWindow);
  const inWindow = new Array(n).fill(false) as boolean[];
  for (const flags of win) for (let p = 0; p < n; p++) if (flags[p]) inWindow[p] = true;
  const quorum = inWindow.filter(Boolean).length;
  const level: MeasureLevel =
    quorum >= cfg.quorumGong ? "gong" : quorum >= cfg.quorumFirm ? "firm" : quorum >= 1 ? "provisional" : "none";

  // 5. CONFLICT GUARD (Signal-Jam) — a lone scream, or a live positive/negative disagreement.
  const anyPos = firePos.some(Boolean);
  const conflict = (anyScream && quorum < cfg.quorumFirm) || (anyPos && anyVeto);

  // DECISION — the gong needs full quorum + no veto + paid MDL (or the CEIL forces it).
  const floored = state.count < cfg.minSegment;
  const ceil = state.count >= cfg.maxSegment;
  const effMdl = Math.max(cfg.mdlFloor, cfg.mdlBits - cfg.ageRelax * Math.max(0, state.count - lambda));
  const fastGong = state.armed && !floored && quorum >= cfg.quorumGong && !anyVeto && fusedBits > effMdl;
  const gong = ceil || fastGong;

  // Calibration updates (per-plane baselines + cross-plane correlation), carried either way.
  const planes = state.planes.map((ps, p) => {
    const d = drifts[p] ?? ps.mean;
    const dev = d - ps.mean;
    return {
      mean: (1 - cfg.ewmaAlpha) * ps.mean + cfg.ewmaAlpha * d,
      var: (1 - cfg.ewmaAlpha) * ps.var + cfg.ewmaAlpha * dev * dev,
    };
  });
  const corr = state.corr.map((row, i) =>
    row.map((v, j) => (1 - cfg.ewmaAlpha) * v + cfg.ewmaAlpha * (z[i] ?? 0) * (z[j] ?? 0)),
  );

  if (gong) {
    const lambdaEff = (1 - cfg.ewmaAlpha) * lambda + cfg.ewmaAlpha * state.count;
    const ordinal = state.segmentOrdinal + 1;
    const next: QuorumServoState = {
      planes, corr, window: [], count: 1, segmentOrdinal: ordinal, lambdaEff, armed: false,
    };
    return {
      state: next, label: String(ordinal), gonged: true, level: "gong", conflict: false,
      quorum, fusedBits, perPlaneZ: z, whitenedZ: w,
    };
  }

  const settled = w.every((wi) => Math.abs(wi) <= cfg.reArmZ);
  const armed = state.armed || settled;
  const next: QuorumServoState = {
    planes, corr, window: win, count: state.count + 1,
    segmentOrdinal: state.segmentOrdinal, lambdaEff: lambda, armed,
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
