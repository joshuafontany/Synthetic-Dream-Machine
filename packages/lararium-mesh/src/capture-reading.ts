/**
 * capture-reading — the clock↔dial shore: compose the capture-CLOCK's maintenance provenance
 * with the conviction-DIAL's 1Hive threshold curve into a legible, VERDICT-FREE capture
 * posture. It surfaces WHERE a realm's power-concentration sits on the convex curve toward
 * the operator's ceiling β — it never RULES a realm captured (no computation settles
 * which fork reads real; the operator reads, the members decide — the-veil-ladder#the-bounds).
 *
 * Platform-blind: composes ./cabal-realm-clock + ./conviction-dial. NO node: imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/cabal-realm
 */

import type { CabalRealmMaintenanceProvenance } from "./cabal-realm-clock.js";
import { captureThreshold } from "./conviction-dial.js";

/** The operator's capture dials — β the named ceiling, the rest the curve's shape. Fairness settings. */
export interface CaptureDials {
  /** The "this-is-capture" ceiling — a share ∈ (0,1). The convex wall blows up as concentration nears it. */
  readonly beta: number;
  readonly rho: number;
  readonly supply: number;
  /** The decay rate (α = alphaFromHalfLife(h)); feeds the curve's `1/(1-α)` factor. */
  readonly alpha: number;
}

/** A verdict-FREE capture posture — numbers for the operator to read, never a "captured" ruling. */
export interface CaptureReading {
  /** r — the leading maintainer's share of total maintenance ∈ [0,1). 1 = one hand holds it all. */
  readonly concentration: number;
  /** β — the operator's named capture ceiling. */
  readonly ceiling: number;
  /** β − r — headroom before the ceiling (≤ 0 means concentration sits at/over β). */
  readonly headroom: number;
  /** The 1Hive convex resistance bar at this concentration (→ Infinity as r nears β). */
  readonly curveBar: number;
  /** r ≥ β — the realm sits AT/over the operator's ceiling. A reading, NOT a verdict of capture. */
  readonly atCeiling: boolean;
}

/**
 * The concentration r — the leading maintainer's share of total maintenance-epochs. All
 * maintenance in one hand → r near 1 (the visible capture shape); broadly co-maintained →
 * r low. An unfed realm reads 0. Complements the clock's spread/leadingCount with the SHARE.
 */
export function concentration(clock: CabalRealmMaintenanceProvenance): number {
  let total = 0, leader = 0;
  for (const m of clock.maintainers) {
    total += m.epoch;
    if (m.epoch > leader) leader = m.epoch;
  }
  return total > 0 ? leader / total : 0;
}

/**
 * Read the capture posture — compose the clock's concentration with the dial's convex curve.
 * VERDICT-FREE: the operator sets β and reads where the realm sits; the reading never rules.
 */
export function captureReading(clock: CabalRealmMaintenanceProvenance, dials: CaptureDials): CaptureReading {
  const r = concentration(clock);
  return {
    concentration: r,
    ceiling: dials.beta,
    headroom: dials.beta - r,
    curveBar: captureThreshold(r, dials.beta, dials.rho, dials.supply, dials.alpha),
    atCeiling: r >= dials.beta,
  };
}
