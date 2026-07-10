/**
 * fisher-rao — the FLOW-LENS on the register simplex: the instrument that measures the WALK, not the
 * destination. A conversation stamps a confidence-register distribution per turn (the five bands
 * Provisional · Provisional-Synthesis · Synthesis · Synthesis-Canon · Canon, p ∈ Δ⁴); a conversation
 * therefore traces a TRAJECTORY on the probability simplex, and this organ measures that trajectory
 * with the information geometry the simplex natively carries.
 *
 * THE METRIC: Fisher-Rao on Δ^{n−1}, computed through the sphere embedding `p ↦ √p` (component-wise).
 * Under that map the simplex lands isometrically on the positive orthant of the radius-2 sphere, and
 * the geodesic distance reads in closed form as the Bhattacharyya-angle law
 *
 *     d_FR(p, q) = 2 · arccos( Σᵢ √(pᵢ qᵢ) )   ∈ [0, π]
 *
 * — exactly TWICE the classical step the {@link bhattacharyyaAngle} in bures-metric.ts reports (this
 * organ carries the true Fisher-Rao normalization; the Bures organ carries the angle itself, its
 * quantum cousin — the two agree up to that constant factor, proven in the tests). Geodesics run as
 * great-circle arcs in √-coordinates ({@link fisherRaoGeodesic}).
 *
 * THE WALK MEASURE: {@link trajectoryIncrements} reads the per-step d_FR along a turn sequence;
 * {@link trajectoryLength} sums them (additive by construction — the walk's total arc). The windowed
 * {@link windowedDrift} reads SPEED (arc per tick) and TURNING (1 − chord/path, the folding of the
 * walk back on itself) over a sliding window — the drift-lens primitive. GRAIN-AGNOSTIC by law: the
 * caller supplies the tick sequence (FFZ ticks, turn indices, wall time — whatever clock the caller
 * lives by); this organ NEVER bakes a clock in.
 *
 * THE CLASSICAL-GROUND LAW (mirroring the Bures collapse law): degenerate inputs return their honest
 * degenerate values, never NaN — a point-mass register stands as a valid simplex vertex (d_FR between
 * two distinct vertices = π exactly); a zero-length walk reads length 0 with empty increments; a
 * stationary window reads speed 0 and turning 0 (no motion carries no fold). ε-smoothing exists ONLY
 * as an explicit declared argument ({@link smoothSimplex}) — never applied silently.
 *
 * CONSUMERS-TO-BE (named, not wired — this file stays a pure organ):
 *   · the Antigonish Sprint-3 DEM heightfield / flow-lens — d_FR as the walk metric over the field;
 *   · the drift-lens riding the FFZ stick — {@link windowedDrift} with FFZ ticks supplied from outside;
 *   · register-coherence beside bures-metric.ts — same simplex, classical vs quantum step, factor 2.
 *
 * Platform-blind: pure math, NO imports (the bures-metric / gaussian-cmi keel-style).
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */

/** A register-point on the simplex Δ^{n−1} — a probability vector over the register bands. */
export type SimplexPoint = readonly number[];

/** One sliding-window read of the walk — the drift-lens primitive. */
export interface DriftReading {
  /** index of the FIRST trajectory point the window covers. */
  readonly start: number;
  /** index of the LAST trajectory point the window covers (inclusive). */
  readonly end: number;
  /** total Fisher-Rao arc length walked inside the window. */
  readonly pathLength: number;
  /** the straight geodesic distance between the window's endpoints (the chord). */
  readonly chordLength: number;
  /** arc per tick — pathLength / (tick[end] − tick[start]). 0 on a stationary window. */
  readonly speed: number;
  /** 1 − chord/path ∈ [0, 1] — 0 = the window rode one geodesic, → 1 = the walk folded back. 0 on a stationary window (no motion carries no fold). */
  readonly turning: number;
}

// ── simplex validation + the explicit (never silent) smoothing ──────────────────────────────────────

/**
 * Fail-loud simplex validation: every entry ≥ −tol, entries sum to 1 within 1e-6, length ≥ 1, every
 * entry finite. Throws on any breach — this organ never repairs input silently.
 */
export function assertSimplex(p: SimplexPoint, tol = 1e-9): void {
  if (p.length === 0) throw new Error("assertSimplex: empty vector — no simplex of dimension −1");
  let sum = 0;
  for (const v of p) {
    if (!Number.isFinite(v)) throw new Error(`assertSimplex: non-finite entry ${v} — not on Δ`);
    if (v < -tol) throw new Error(`assertSimplex: negative entry ${v} — not on Δ`);
    sum += v;
  }
  if (Math.abs(sum - 1) > 1e-6) throw new Error(`assertSimplex: entries sum to ${sum}, not 1 — not on the simplex Δ`);
}

/**
 * HONEST ε-smoothing — an EXPLICIT declared act, never a silent repair: pulls a point toward the
 * simplex barycenter by `(pᵢ + ε) / (1 + nε)`, keeping it on Δ exactly. Use it when a downstream read
 * needs strictly-positive support (e.g. before a log-based lens); the caller DECLARES ε, so the
 * smoothing shows in the call site. ε = 0 returns the point unchanged; ε < 0 or a non-simplex input
 * fails loud.
 */
export function smoothSimplex(p: SimplexPoint, epsilon: number): number[] {
  assertSimplex(p);
  if (!Number.isFinite(epsilon) || epsilon < 0) {
    throw new Error(`smoothSimplex: epsilon ${epsilon} — smoothing takes a finite ε ≥ 0, declared by the caller`);
  }
  const n = p.length;
  const z = 1 + n * epsilon;
  return p.map((v) => (Math.max(v, 0) + epsilon) / z);
}

// ── the metric — Fisher-Rao distance through the sphere embedding ───────────────────────────────────

/** The Bhattacharyya coefficient `Σ √(pᵢ qᵢ)` ∈ [0, 1] — the cosine of the half-angle. */
function bcOf(p: SimplexPoint, q: SimplexPoint): number {
  let bc = 0;
  for (let i = 0; i < p.length; i++) bc += Math.sqrt(Math.max(p[i]!, 0) * Math.max(q[i]!, 0));
  return Math.min(1, Math.max(0, bc));
}

/** Fail loud unless p and q ride the SAME simplex (equal length, both valid). */
function assertPair(p: SimplexPoint, q: SimplexPoint): void {
  assertSimplex(p);
  assertSimplex(q);
  if (p.length !== q.length) {
    throw new Error(`fisher-rao: dimension mismatch — ${p.length} vs ${q.length} register bands`);
  }
}

/**
 * The Fisher-Rao geodesic distance `d_FR(p, q) = 2 · arccos Σ √(pᵢ qᵢ)` ∈ [0, π]. Identical points
 * read 0; two DISTINCT point-mass vertices read π exactly (the honest degenerate value — the two
 * corners sit maximally far, never NaN). Equals 2 × the bures-metric classical step.
 */
export function fisherRaoDistance(p: SimplexPoint, q: SimplexPoint): number {
  assertPair(p, q);
  return 2 * Math.acos(bcOf(p, q));
}

/**
 * The Fisher-Rao geodesic `γ(t)` from p (t = 0) to q (t = 1): the great-circle arc in √-coordinates,
 * squared back onto the simplex. Every waypoint lands ON Δ (renormalized against float drift — a
 * guard, not a repair). p = q (or numerically fused) returns p itself — the honest degenerate arc.
 * Fails loud on t outside [0, 1] (extrapolation would exit the positive orthant unannounced).
 */
export function fisherRaoGeodesic(p: SimplexPoint, q: SimplexPoint, t: number): number[] {
  assertPair(p, q);
  if (!Number.isFinite(t) || t < 0 || t > 1) {
    throw new Error(`fisherRaoGeodesic: t = ${t} — the geodesic interpolates on [0, 1] only`);
  }
  const theta = Math.acos(bcOf(p, q)); // the half-angle on the unit sphere.
  const sp = p.map((v) => Math.sqrt(Math.max(v, 0)));
  if (theta < 1e-12) return sp.map((v) => v * v); // fused endpoints — the arc degenerates to the point.
  const sq = q.map((v) => Math.sqrt(Math.max(v, 0)));
  const sinT = Math.sin(theta);
  const a = Math.sin((1 - t) * theta) / sinT;
  const b = Math.sin(t * theta) / sinT;
  const out = sp.map((v, i) => {
    const c = a * v + b * sq[i]!;
    return c * c;
  });
  let z = 0;
  for (const v of out) z += v;
  return out.map((v) => v / z); // float guard; mathematically z = 1 already.
}

// ── the walk measure — trajectory increments, length, and the windowed drift-read ───────────────────

/**
 * Per-step Fisher-Rao increments along a trajectory — `increments[i] = d_FR(points[i], points[i+1])`.
 * A walk of fewer than two points returns [] (the honest zero-length walk, never NaN).
 */
export function trajectoryIncrements(points: readonly SimplexPoint[]): number[] {
  if (points.length < 2) {
    for (const p of points) assertSimplex(p); // a lone point still gets validated.
    return [];
  }
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i++) out.push(fisherRaoDistance(points[i]!, points[i + 1]!));
  return out;
}

/**
 * Total Fisher-Rao arc length of the walk — Σ stepwise d_FR. Additive by construction:
 * length(a→b→c walk) = length(a→b) + length(b→c). Empty / single-point walks read 0.
 */
export function trajectoryLength(points: readonly SimplexPoint[]): number {
  let sum = 0;
  for (const step of trajectoryIncrements(points)) sum += step;
  return sum;
}

/**
 * The windowed drift-read — the drift-lens primitive. Slides a window of `window` consecutive points
 * along the trajectory and reads, per position: pathLength (arc inside the window), chordLength
 * (endpoint geodesic), SPEED (arc per tick), and TURNING (1 − chord/path — how much the walk folds).
 *
 * GRAIN-AGNOSTIC: `ticks` carries the caller's clock — one tick per point, strictly increasing (FFZ
 * ticks ride in here from outside; turn indices work too). Omitted, ticks default to the point
 * indices 0, 1, 2, … — a declared unit grain, not a hidden clock.
 *
 * Honest degenerates: a stationary window reads speed 0 and turning 0; a trajectory shorter than the
 * window returns []. Fails loud on window < 2, a ticks/points length mismatch, or non-increasing
 * ticks (a zero tick-span would fabricate infinite speed).
 */
export function windowedDrift(
  points: readonly SimplexPoint[],
  window: number,
  ticks?: readonly number[],
): DriftReading[] {
  if (!Number.isInteger(window) || window < 2) {
    throw new Error(`windowedDrift: window ${window} — a drift window spans at least 2 points`);
  }
  const t = ticks ?? points.map((_, i) => i);
  if (t.length !== points.length) {
    throw new Error(`windowedDrift: ${t.length} ticks against ${points.length} points — one tick per point`);
  }
  for (let i = 0; i + 1 < t.length; i++) {
    if (!(t[i + 1]! > t[i]!)) {
      throw new Error(`windowedDrift: ticks not strictly increasing at index ${i} (${t[i]} → ${t[i + 1]})`);
    }
  }
  const steps = trajectoryIncrements(points); // validates every point once.
  const readings: DriftReading[] = [];
  for (let start = 0; start + window <= points.length; start++) {
    const end = start + window - 1;
    let path = 0;
    for (let i = start; i < end; i++) path += steps[i]!;
    const chord = fisherRaoDistance(points[start]!, points[end]!);
    const span = t[end]! - t[start]!;
    const speed = path / span; // span > 0 by the strictly-increasing law.
    const turning = path <= 1e-12 ? 0 : Math.min(1, Math.max(0, 1 - chord / path));
    readings.push({ start, end, pathLength: path, chordLength: chord, speed, turning });
  }
  return readings;
}
