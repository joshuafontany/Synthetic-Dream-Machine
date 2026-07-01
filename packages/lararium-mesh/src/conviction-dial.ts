/**
 * conviction-dial — the decay + capture-threshold MATH the tensions-swarm surfaced
 * (conviction voting / 1Hive), for the veil-ladder's rep-decay and the capture-clock's
 * threshold. The dial NUMBERS stay the operator's fairness settings — this file is the
 * MATH, never the setting (half-life h and ceiling β arrive as parameters).
 *
 * Two clocks, rate-matched to what each tracks (swarm finding): rep-FRESHNESS decays FAST
 * (short half-life), earned-STANDING decays SLOW (long half-life). Never one α for both.
 *
 * Platform-blind: pure arithmetic. NO imports.
 * Meme: lar:///ha.ka.ba/@lares/api/pono/the-veil-ladder
 */

/**
 * The decay rate α ∈ (0,1) from a HUMAN-LEGIBLE half-life: how many ticks for a value to
 * fall to half. Set h, DERIVE α — never hand-pick α (the swarm's rule). `α = 0.5^(1/h)`.
 */
export function alphaFromHalfLife(halfLifeTicks: number): number {
  if (!(halfLifeTicks > 0)) throw new RangeError(`alphaFromHalfLife: half-life must be > 0, got ${halfLifeTicks}`);
  return Math.pow(0.5, 1 / halfLifeTicks);
}

/**
 * One conviction/decay step: `y_t = α·y_{t-1} + x_t` — the prior warmth decays by α, this
 * tick's maintenance/rep `applied` adds in. Redirecting maintenance drains the old bucket at
 * the same rate, so a sudden swing costs sustained effort (capture-resistance, natively).
 */
export function decayStep(prev: number, applied: number, alpha: number): number {
  return alpha * prev + applied;
}

/**
 * Steady-state warmth under CONSTANT maintenance `x`: `y∞ = x/(1-α)` — the intrinsic cap
 * (at α=0.9, warmth tops out at 10×x). The cap is the decay curve's own, not a separate clamp.
 */
export function steadyState(applied: number, alpha: number): number {
  if (!(alpha >= 0 && alpha < 1)) throw new RangeError(`steadyState: alpha must be in [0,1), got ${alpha}`);
  return applied / (1 - alpha);
}

/**
 * The 1Hive capture-threshold curve: `threshold = ρ·S / (1-α) / (β − r)²`. `r` = the share of
 * the place's decision-power concentrated in one principal/cabal-cluster; `β` = the operator's
 * named "this-is-capture" ceiling. Cheap while power is dispersed (low r), asymptotically
 * IMPOSSIBLE as one cluster nears β — a principled convex wall. ρ, S, β are the operator's dials.
 * Returns Infinity at/over β (capture is unreachable by the curve — it is a hard ceiling).
 */
export function captureThreshold(r: number, beta: number, rho: number, supply: number, alpha: number): number {
  if (!(alpha >= 0 && alpha < 1)) throw new RangeError(`captureThreshold: alpha must be in [0,1), got ${alpha}`);
  if (r >= beta) return Infinity;
  return (rho * supply) / (1 - alpha) / ((beta - r) ** 2);
}
