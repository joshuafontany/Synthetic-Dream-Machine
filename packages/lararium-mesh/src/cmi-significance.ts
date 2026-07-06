/**
 * cmi-significance — the significance discipline the hoike made mandatory: never read a raw TE as
 * coupling (the finite-sample bias floor is nonzero). For the native Gaussian estimator this is
 * PARAMETRIC and needs NO surrogates — under conditional independence (X ⊥ Y | Z, jointly Gaussian)
 * the likelihood-ratio statistic G² = 2N·Î (nats) is asymptotically χ² with df = d_X·d_Y. So an
 * edge is real only when its χ² tail-probability clears the operator's α.
 *
 * (The IDTxl max/min/omnibus + FDR stack the hoike named layers ON TOP of a per-edge test like this
 * once greedy embedding-selection is added; this file is that per-edge test, the floor beneath them.)
 *
 * Platform-blind: pure numerics (Lanczos ln-gamma + regularized incomplete gamma). NO imports.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/flow
 */

const LN2 = Math.log(2);
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** ln Γ(x) — Lanczos approximation (g=7), reflection for x < 0.5. */
function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  x -= 1;
  let a = LANCZOS[0]!;
  const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LANCZOS[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized lower incomplete gamma P(s,x) — series (x<s+1) or continued fraction (x≥s+1). */
function regularizedGammaP(s: number, x: number): number {
  if (x <= 0 || s <= 0) return 0;
  if (x < s + 1) {
    let ap = s, del = 1 / s, sum = del;
    for (let i = 0; i < 300; i++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-15) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - lnGamma(s));
  }
  // continued fraction for Q(s,x) = 1 − P(s,x)
  const tiny = 1e-300;
  let b = x + 1 - s, c = 1 / tiny, d = 1 / b, h = d;
  for (let i = 1; i < 300; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b; if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c; if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  const q = Math.exp(-x + s * Math.log(x) - lnGamma(s)) * h;
  return 1 - q;
}

/** Upper-tail χ² survival P(χ²_k > x) = 1 − P(k/2, x/2). */
export function chiSquareSurvival(x: number, k: number): number {
  if (x <= 0) return 1;
  if (k <= 0) return 0;
  return 1 - regularizedGammaP(k / 2, x / 2);
}

/**
 * The p-value that a Gaussian conditional-TE / CMI (in BITS) is nonzero — the χ² tail of the
 * likelihood-ratio statistic `2N·Î_nats` at df = dfSource·dfTarget. Small p ⇒ a real edge.
 * `n` is the number of embedded observations; `dfSource`/`dfTarget` the source/target dims.
 */
export function gaussianCMISignificance(cmiBits: number, n: number, dfSource = 1, dfTarget = 1): number {
  if (cmiBits <= 0 || n <= 0) return 1;
  const g2 = 2 * n * cmiBits * LN2;                 // bits → nats → the LR statistic
  return chiSquareSurvival(g2, dfSource * dfTarget);
}

/**
 * The finite-sample-recentred p-value (the Miller-Madow / Bartlett cure). The parametric `2N·Î ~ χ²(df)`
 * holds only asymptotically; at finite N the estimator carries a positive bias `≈ df/2N`, so the raw χ² tail
 * over-rejects (the measured FPR ≈ 1.3–2.4α). Estimate `E[G²]` from the SAME surrogate null the coupling test
 * already draws (its statistic under the true null), then rescale `G² → G²·df/E[G²_surrogate]` before the tail.
 * `surrogateCmiBits` are the null-draw CMI values (bits); with none, this falls back to the raw parametric tail
 * (no free recentring). Near-zero marginal cost — it reuses draws the surrogate keel computes anyway.
 */
export function recentredCMISignificance(
  cmiBits: number, n: number, surrogateCmiBits: readonly number[], dfSource = 1, dfTarget = 1,
): number {
  const df = dfSource * dfTarget;
  if (cmiBits <= 0 || n <= 0) return 1;
  const g2 = 2 * n * cmiBits * LN2;
  if (surrogateCmiBits.length === 0) return chiSquareSurvival(g2, df);
  // mean null statistic; the recentring factor df/E[G²] pulls the biased null back onto the χ²(df) scale.
  const meanNullG2 = surrogateCmiBits.reduce((s, b) => s + 2 * n * Math.max(0, b) * LN2, 0) / surrogateCmiBits.length;
  const factor = meanNullG2 > 0 ? df / meanNullG2 : 1;
  return chiSquareSurvival(g2 * factor, df);
}

/** Is the coupling significant at level `alpha`? A real edge, not the bias floor. `alpha` is REQUIRED of
 *  the decision-site caller (coupleMesh sources it from the ARL₀ dial → REFERENCE_ALPHA); the 0.05 fallback
 *  keeps this floor primitive pure (no policy import) and never fires when the caller passes the dial's α. */
export function significantCMI(cmiBits: number, n: number, dfSource = 1, dfTarget = 1, alpha = 0.05): boolean {
  return gaussianCMISignificance(cmiBits, n, dfSource, dfTarget) < alpha;
}
