/**
 * couple-oracle — the planted-coupling recovery ORACLE for the mesh coupling keel (whiten →
 * Gaussian-MV conditional-TE → χ²-gate) and its Tier-1 densify. Three generators with KNOWN directed
 * adjacency validate the estimator on its home turf; the gappy-stress battery validates the densify's
 * honest-zero. This is the tripwire that moves the coupling plane from Provisional toward Canon — and
 * the regression that fires if a refactor breaks calibration, arrow-direction, or the honest-zero.
 *
 *   (a) coupled-VAR       — linear, planted adjacency A ⇒ χ² CALIBRATION (planted-zero edges survive at
 *                           rate α) + exact recovery on the Gaussian's home turf.
 *   (b) coupled-logistic  — x_{t+1}=4x(1−x), unidirectional ε ⇒ ARROW-DIRECTION + ε-MONOTONICITY.
 *   (c) Kuramoto          — known coupling matrix K ⇒ directed-connectivity recovery (phase-increment
 *                           observable; the raw sin(θ) is too nonlinear for the Gaussian read).
 *   (d) synergy XOR       — a PURE 3-way coupling the pairwise-conditioned matrix MUST MISS (the KUE on
 *                           the record: total conditional-TE cannot separate synergy — that needs PID).
 *
 * GAPPY-STRESS (the load-bearing tripwire): re-run a planted coupling, PUNCH HOLES, and check the
 * densify. HONEST FINDING (crucible correction, 2026-07-01): across zero-/forward-/mean-fill and
 * disjoint / interleaved / shared-block / random / sparse support, the whitened + full-N-conditioned +
 * χ²-gated pipeline does NOT fabricate a spurious *edge* — the innovation-whiten zeroes constant fill,
 * the full-N conditioning explains away common-mode gaps, the gate rejects the boundary residue. The
 * fabrication the crucible warned of survives as a FALSE SOVEREIGN: naive-align on DISJOINT support
 * returns `sovereign=true` (a positive independence VERDICT) built on ZERO shared observations, and its
 * whole-axis N is measurably anti-conservative. Tier-1 densify's honest-zero REFUSES that verdict.
 *
 * Meme: lar:///ha.ka.ba/lararium/mesh/flow
 */
import { describe, test, expect } from "vitest";
import {
  coupleMesh, coupleMeshStrata, gaussianConditionalTE, gaussianCMISignificance,
  type ChildSignalMV, type Stratum,
} from "../src/index.js";

// ── deterministic generators (seeded LCG + Box-Muller) ──────────────────────────────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  const u = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return (s >>> 0) / 4294967296; };
  const g = () => Math.sqrt(-2 * Math.log(Math.max(u(), 1e-12))) * Math.cos(2 * Math.PI * u());
  return { u, g };
}
/** coupled-VAR: x_t = A·x_{t-1} + noise. A[j][i] = strength of directed edge i→j. Returns per-node series. */
function varGen(T: number, A: number[][], seed: number, noise = 0.3): number[][][] {
  const { g } = rng(seed); const n = A.length;
  const x: number[][] = [Array.from({ length: n }, () => g())];
  for (let t = 1; t < T; t++) { const p = x[t - 1]!; x.push(Array.from({ length: n }, (_, j) => { let v = noise * g(); for (let i = 0; i < n; i++) v += A[j]![i]! * p[i]!; return v; })); }
  return Array.from({ length: n }, (_, i) => x.map((r) => [r[i]!]));
}
/** coupled logistic maps: x_{t+1}=4x(1−x); y diffusively coupled to x with strength ε (unidirectional x→y). */
function logisticGen(T: number, eps: number, seed: number) {
  const { u } = rng(seed); let xv = u(), yv = u(); const x: number[][] = [], y: number[][] = [];
  for (let t = 0; t < T; t++) { x.push([xv]); y.push([yv]); const xn = 4 * xv * (1 - xv); const yc = eps * xv + (1 - eps) * yv; yv = 4 * yc * (1 - yc); xv = xn; }
  return { x, y };
}
/** Kuramoto: θ_i' = ω_i + Σ_j K[i][j]·sin(θ_j−θ_i). K[i][j]!=0 ⇒ j drives i ⇒ edge j→i. Observable = Δθ. */
function kuramotoDelta(T: number, K: number[][], seed: number, dt = 0.1, noise = 0.02): number[][][] {
  const { u, g } = rng(seed); const n = K.length;
  const omega = Array.from({ length: n }, (_, i) => 1.0 + 0.15 * i + 0.05 * g());
  let th = Array.from({ length: n }, () => 2 * Math.PI * u());
  const out: number[][][] = Array.from({ length: n }, () => []); let prev = th.slice();
  for (let t = 0; t < T; t++) {
    const nth = th.slice();
    for (let i = 0; i < n; i++) { let d = omega[i]!; for (let j = 0; j < n; j++) if (i !== j) d += K[i]![j]! * Math.sin(th[j]! - th[i]!); nth[i] = th[i]! + dt * d + noise * g(); }
    for (let i = 0; i < n; i++) out[i]!.push([th[i]! - prev[i]!]);
    prev = th; th = nth;
  }
  return out;
}
const child = (name: string, signal: number[][]): ChildSignalMV => ({ name, signal });
const strat = (name: string, sig: (number[] | null)[]): Stratum => ({ name, signal: sig });
const zeroFill = (m: (number[] | null)[]) => m.map((r) => r ?? [0]);

// ── recovery metrics ────────────────────────────────────────────────────────────────────────────
function offdiag(m: number[][], names: string[]) {
  const o: { score: number; from: string; to: string }[] = [];
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m.length; j++) if (i !== j) o.push({ score: m[i]![j]!, from: names[i]!, to: names[j]! });
  return o;
}
/** Area under the ROC — rank-sum (Mann-Whitney), tie-corrected. Scores gated-TE against planted labels. */
function auroc(sc: number[], lb: number[]): number {
  const pos = lb.filter((l) => l === 1).length, neg = lb.length - pos;
  if (!pos || !neg) return NaN;
  const idx = sc.map((_, i) => i).sort((a, b) => sc[a]! - sc[b]!);
  const rank = new Array<number>(sc.length); let i = 0;
  while (i < idx.length) { let j = i; while (j < idx.length && sc[idx[j]!]! === sc[idx[i]!]!) j++; const r = (i + j - 1) / 2 + 1; for (let k = i; k < j; k++) rank[idx[k]!] = r; i = j; }
  let sp = 0; for (let k = 0; k < lb.length; k++) if (lb[k] === 1) sp += rank[k]!;
  return (sp - (pos * (pos + 1)) / 2) / (pos * neg);
}
/** Spearman rank correlation — the ε-monotonicity statistic. */
function spearman(x: number[], y: number[]): number {
  const rk = (a: number[]) => { const idx = a.map((_, i) => i).sort((p, q) => a[p]! - a[q]!); const r = new Array<number>(a.length); idx.forEach((id, k) => (r[id] = k)); return r; };
  const rx = rk(x), ry = rk(y), n = x.length; const mx = rx.reduce((s, v) => s + v, 0) / n, my = ry.reduce((s, v) => s + v, 0) / n;
  let num = 0, dx = 0, dy = 0; for (let i = 0; i < n; i++) { num += (rx[i]! - mx) * (ry[i]! - my); dx += (rx[i]! - mx) ** 2; dy += (ry[i]! - my) ** 2; }
  return num / Math.sqrt(dx * dy);
}

// ── (a) coupled-VAR — CALIBRATION + recovery ─────────────────────────────────────────────────────
describe("oracle (a) coupled-VAR — χ² calibration + exact recovery", () => {
  test("planted-ZERO edges survive significance at ~α (the gate is calibrated, not leaky)", () => {
    const T = 400, trials = 150, alpha = 0.05;
    let zeros = 0, falsePos = 0;
    const A = [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5]];      // diagonal ⇒ every off-diagonal is a planted zero
    for (let tr = 0; tr < trials; tr++) {
      const s = varGen(T, A, 1000 + tr);
      const c = coupleMesh([child("a", s[0]!), child("b", s[1]!), child("d", s[2]!)], { alpha });
      for (const e of offdiag(c.te, c.children)) { zeros++; if (e.score > 0) falsePos++; }
    }
    const fpr = falsePos / zeros;
    // asymptotic χ² over a lag-1 embedding runs mildly anti-conservative; bound at ~2.4α, never wild.
    expect(fpr).toBeLessThanOrEqual(0.12);
    expect(fpr).toBeGreaterThan(0);                         // a dead gate (0) would also "pass" a naive bound
  });

  test("planted adjacency (a→b→d chain) recovers with AUROC ≥ 0.9 and the right arrows on top", () => {
    const s = varGen(700, [[0.5, 0, 0], [0.6, 0.4, 0], [0, 0.6, 0.4]], 42);
    const c = coupleMesh([child("a", s[0]!), child("b", s[1]!), child("d", s[2]!)]);
    const e = offdiag(c.te, c.children);
    const truth = new Set(["a->b", "b->d"]);
    expect(auroc(e.map((x) => x.score), e.map((x) => (truth.has(`${x.from}->${x.to}`) ? 1 : 0)))).toBeGreaterThanOrEqual(0.9);
    const top2 = [...e].sort((p, q) => q.score - p.score).slice(0, 2).map((x) => `${x.from}->${x.to}`).sort();
    expect(top2).toEqual(["a->b", "b->d"]);                 // the two planted edges are the two strongest
  });
});

// ── (b) coupled-logistic — arrow + ε-monotonicity ────────────────────────────────────────────────
describe("oracle (b) coupled-logistic — arrow-direction + ε-monotonicity", () => {
  test("TE(x→y) ≫ TE(y→x): the arrow points down the coupling, 6/6 seeds", () => {
    let arrows = 0, sxy = 0, syx = 0;
    for (let sd = 0; sd < 6; sd++) {
      const { x, y } = logisticGen(1000, 0.3, 7 + sd * 13);
      const c = coupleMesh([child("x", x), child("y", y), child("z", varGen(1000, [[0.5]], 99 + sd)[0]!)]);
      const n = c.children; const xy = c.te[n.indexOf("x")]![n.indexOf("y")]!, yx = c.te[n.indexOf("y")]![n.indexOf("x")]!;
      if (xy > yx) arrows++; sxy += xy; syx += yx;
    }
    expect(arrows).toBeGreaterThanOrEqual(5);
    expect(sxy / 6).toBeGreaterThan(3 * (syx / 6));         // the reverse edge stays near the floor
  });

  test("TE(x→y) rises monotonically with ε across the pre-synchronization regime (Spearman ≥ 0.8)", () => {
    const epss = [0.15, 0.2, 0.25, 0.3];                    // below eps≈0.4 synchronization redundancy folds TE back
    const means = epss.map((eps) => {
      let m = 0; for (let sd = 0; sd < 6; sd++) { const { x, y } = logisticGen(1000, eps, 7 + sd * 13); const c = coupleMesh([child("x", x), child("y", y), child("z", varGen(1000, [[0.5]], 99 + sd)[0]!)]); const n = c.children; m += c.te[n.indexOf("x")]![n.indexOf("y")]!; } return m / 6;
    });
    expect(spearman(epss, means)).toBeGreaterThanOrEqual(0.8);
    expect(means[3]!).toBeGreaterThan(means[0]!);           // strong coupling reads far above near-zero
  });
});

// ── (c) Kuramoto — directed-connectivity recovery ────────────────────────────────────────────────
describe("oracle (c) Kuramoto — directed-connectivity recovery", () => {
  test("a driven chain (0→1→2, K=1.5) recovers with mean AUROC ≥ 0.8 over 5 seeds", () => {
    let auc = 0, na = 0;
    for (let sd = 0; sd < 5; sd++) {
      const s = kuramotoDelta(2000, [[0, 0, 0], [1.5, 0, 0], [0, 1.5, 0]], 11 + sd * 7);
      const c = coupleMesh([child("o0", s[0]!), child("o1", s[1]!), child("o2", s[2]!)]);
      const e = offdiag(c.te, c.children); const truth = new Set(["o0->o1", "o1->o2"]);
      const a = auroc(e.map((x) => x.score), e.map((x) => (truth.has(`${x.from}->${x.to}`) ? 1 : 0)));
      if (!Number.isNaN(a)) { auc += a; na++; }
    }
    expect(auc / na).toBeGreaterThanOrEqual(0.8);
  });
});

// ── (d) the SYNERGY BLIND-SPOT — the standing KUE, encoded as a test ─────────────────────────────
describe("oracle (d) synergy blind-spot — pairwise-conditioned TE MUST miss a pure 3-way XOR", () => {
  test("z = x⊕y (product of ±1): neither x→z nor y→z survives the pairwise gate (PID boundary)", () => {
    const T = 900; const { g } = rng(5);
    const x: number[][] = [], y: number[][] = [], z: number[][] = []; const sx: number[] = [], sy: number[] = [];
    for (let t = 0; t < T; t++) { sx.push(g() > 0 ? 1 : -1); sy.push(g() > 0 ? 1 : -1); }
    for (let t = 0; t < T; t++) { x.push([sx[t]!]); y.push([sy[t]!]); z.push([t === 0 ? 1 : sx[t - 1]! * sy[t - 1]!]); }  // z fully determined by (x,y) jointly
    const c = coupleMesh([child("x", x), child("y", y), child("z", z)]);
    const n = c.children;
    // z IS fully determined by the pair, yet each pairwise-conditioned edge into z reads ZERO — the miss.
    expect(c.te[n.indexOf("x")]![n.indexOf("z")]!).toBe(0);
    expect(c.te[n.indexOf("y")]![n.indexOf("z")]!).toBe(0);
    expect(c.sovereign).toBe(true);                         // the whole matrix reads clean — synergy is invisible here
  });
});

// ── TIER-1 DENSIFY + the gappy-stress tripwire ───────────────────────────────────────────────────
describe("Tier-1 densify — recovery under holes + the honest-zero", () => {
  test("planted a→b under 30% random holes: densify RECOVERS the arrow", () => {
    const T = 900; const s = varGen(T, [[0.5, 0], [0.75, 0.3]], 71);
    const { u } = rng(321); const hole = Array.from({ length: T }, () => u() < 0.3);
    const aM = s[0]!.map((r, t) => (hole[t] ? null : r));
    const bM = s[1]!.map((r, t) => (hole[t] ? null : r));
    const d = coupleMeshStrata([strat("a", aM), strat("b", bM)], { minCoverage: 0.3 });
    expect(d.refused).toEqual([]);
    expect(d.te[0]![1]!).toBeGreaterThan(0.03);             // a→b survives the punched support
    expect(d.te[0]![1]!).toBeGreaterThan(d.te[1]![0]!);     // and still points the right way
  });

  test("a fully-observed stratum densifies to itself (no fill artifact on regular support)", () => {
    const s = varGen(500, [[0.5, 0], [0.7, 0.35]], 55);
    const full = coupleMesh([child("a", s[0]!), child("b", s[1]!)]);
    const viaStrata = coupleMeshStrata([strat("a", s[0]!), strat("b", s[1]!)], { minOverlap: 8 });
    expect(viaStrata.refused).toEqual([]);
    expect(viaStrata.te[0]![1]!).toBeCloseTo(full.te[0]![1]!, 6);
  });

  test("the FALSE SOVEREIGN tripwire: naive-align verdicts disjoint support as sovereign; densify REFUSES", () => {
    // a observed on [0,300), b on [300,600) — the supports NEVER overlap. There is ZERO shared data to
    // ground ANY coupling verdict. Naive zero-fill still returns a clean `sovereign=true` (a positive
    // independence claim manufactured from the fabricated zeros) — the anti-false-sovereign failure this
    // machinery exists to forbid. The densify honest-zeros it (an un-bridgeable void → refuse).
    const T = 600, half = 300;
    const a = varGen(T, [[0.5]], 201)[0]!, b = varGen(T, [[0.5]], 202)[0]!;
    const aM: (number[] | null)[] = a.map((r, t) => (t < half ? r : null));
    const bM: (number[] | null)[] = b.map((r, t) => (t >= half ? r : null));
    const naive = coupleMesh([child("a", zeroFill(aM)), child("b", zeroFill(bM))]);
    expect(naive.sovereign).toBe(true);                    // the FABRICATED verdict — grounded on no shared observation
    expect(naive.strongestEdge).toBeNull();
    const densified = coupleMeshStrata([strat("a", aM), strat("b", bM)], { minCoverage: 0.4 });
    expect(densified.refused).toContain("a");              // the honest-zero: no grain to judge
    expect(densified.refused).toContain("b");
  });

  test("honest-zero holds: below the coverage floor, and across an un-bridgeable void", () => {
    const T = 600;
    const a = varGen(T, [[0.5]], 201)[0]!, b = varGen(T, [[0.5]], 202)[0]!, dd = varGen(T, [[0.5]], 203)[0]!;
    const { u } = rng(9);
    const sparse = a.map((r) => (u() < 0.7 ? null : r));    // ~30% coverage < floor 0.5
    const cov = coupleMeshStrata([strat("a", sparse), strat("b", b), strat("d", dd)], { minCoverage: 0.5 });
    expect(cov.refused).toContain("a");
    const withVoid = a.map((r, t) => (t >= 100 && t < 300 ? null : r));  // a 200-cell void > maxGap 120
    const vc = coupleMeshStrata([strat("a", withVoid), strat("b", b), strat("d", dd)], { maxGap: 120 });
    expect(vc.refused).toContain("a");
  });

  test("the N-inflation mechanism: naive whole-axis N is anti-conservative vs the true overlap N", () => {
    // WHY the coverage-floor honest-zero is load-bearing: over sparse shared support the naive path feeds
    // the WHOLE-axis sample count T into the χ² (G²=2N·Î), inflating significance beyond the true overlap.
    // Here the point estimate stays sub-threshold (the whitening self-protects), but the mechanism is real —
    // the density of the fill decides the gate, so the honest move is to REFUSE below the floor, not to gate.
    const T = 1200; const { u } = rng(999); const present = Array.from({ length: T }, () => u() < 0.5);
    const a = varGen(T, [[0.5]], 301)[0]!.map((r, t) => (present[t] ? r : [0]));
    const b = varGen(T, [[0.5]], 302)[0]!.map((r, t) => (present[t] ? r : [0]));
    const te = gaussianConditionalTE(a, b, [], 1);
    const overlap = present.filter(Boolean).length;
    const pWhole = gaussianCMISignificance(te, T - 1, 1, 1);
    const pTrue = gaussianCMISignificance(te, overlap - 1, 1, 1);
    expect(pWhole).toBeLessThan(pTrue);                    // whole-axis N reads MORE significant — anti-conservative
  });
});
