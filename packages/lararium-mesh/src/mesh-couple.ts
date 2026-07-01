/**
 * mesh-couple — the operational capstone of the locked coupling keel: ONE call from raw child
 * signals to a significance-clean coupling reading. It composes the four floors in order —
 *
 *   whiten (signed-innovation)  →  couple (Gaussian multivariate, full-conditioned)  →
 *   significance-gate (parametric χ²)  →  the MeshCoupling verdict
 *
 * so every surviving edge is a SIGNIFICANT, phantom-guarded, innovation-based directed coupling,
 * and non-significant edges are zeroed (never read as coupling — the hoike's discipline). This is
 * the surface the node-side reader and the sensory-seam call; nothing downstream re-derives it.
 *
 * Platform-blind: composes ./signed-innovation + ./mesh-coupling-mv + ./cmi-significance.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/flow
 */

import { whitenChildren } from "./signed-innovation.js";
import { coupleMeshChildrenMV, type ChildSignalMV } from "./mesh-coupling-mv.js";
import { significantCMI } from "./cmi-significance.js";
import { type MeshCoupling } from "./mesh-coupling.js";

export interface CoupleMeshOptions {
  /** Sovereignty dial — the strongest surviving cross-edge must stay below this (bits). Default 0.5. */
  readonly mergeThreshold?: number;
  /** History length for the conditional-TE embedding. Default 1. */
  readonly lag?: number;
  /** Significance level — edges with χ² p ≥ alpha are zeroed. Default 0.05. */
  readonly alpha?: number;
  /** Whiten to the signed innovation first (the correct prewhitening). Default true. */
  readonly whiten?: boolean;
}

/**
 * Couple the mesh's children end-to-end: whiten → Gaussian multivariate conditional-TE →
 * χ²-significance gate. Returns a MeshCoupling whose `te` carries only SIGNIFICANT edges (the rest
 * zeroed), with the strongest surviving edge and the sovereign verdict recomputed on the clean matrix.
 */
export function coupleMesh(children: readonly ChildSignalMV[], opts: CoupleMeshOptions = {}): MeshCoupling {
  const mergeThreshold = opts.mergeThreshold ?? 0.5;
  const lag = opts.lag ?? 1;
  const alpha = opts.alpha ?? 0.05;
  const whiten = opts.whiten ?? true;

  const prepped = whiten ? whitenChildren(children) : children.map((c) => ({ name: c.name, signal: c.signal }));
  const base = coupleMeshChildrenMV(prepped, mergeThreshold, lag);

  const n = prepped.length;
  const te: number[][] = base.te.map((row) => [...row]);
  let strongest: { from: string; to: string; coupling: number } | null = null;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const T = prepped[j]!.signal.length;
      const N = Math.max(0, T - lag);                              // embedded observation count
      const dfS = prepped[i]!.signal[0]?.length ?? 1;
      const dfT = prepped[j]!.signal[0]?.length ?? 1;
      if (!significantCMI(te[i]![j]!, N, dfS, dfT, alpha)) {
        te[i]![j] = 0;                                             // not a real edge — the bias floor
      }
      if (te[i]![j]! > 0 && (!strongest || te[i]![j]! > strongest.coupling)) {
        strongest = { from: base.children[i]!, to: base.children[j]!, coupling: te[i]![j]! };
      }
    }
  }

  return {
    children: base.children,
    te,
    strongestEdge: strongest,
    sovereign: !strongest || strongest.coupling < mergeThreshold,
    phantomGuarded: base.phantomGuarded,
  };
}
