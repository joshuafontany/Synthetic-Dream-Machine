/**
 * mesh-coupling-mv — the DEFAULT multivariate mesh coupling (the hoike's locked keel), the
 * continuous-vector twin of mesh-coupling. Each child is a CONTINUOUS signed-innovation VECTOR
 * series; each directed edge is a native Gaussian conditional-TE, conditioned on ALL the other
 * children JOINTLY (the full-N-way conditioning that keeps the read synergy-aware and kills the
 * common-driver phantom for any N, not just three).
 *
 * This is the default path; the discrete-symbol `coupleMeshChildren` stays as the dependency-light
 * hot-path read, and KSG-multivariate (nonlinear escalation) rides the IDTxl sidecar behind a
 * linearity gate — neither is here. The wire carries continuous reals; discretization never touches
 * this path (it would break the Gaussian covariance the same way it breaks kNN geometry).
 *
 * KUE on the record (hoike #aggregate-signal-coupling): total conditional-TE reports that an edge
 * exists, never whether it is synergistic vs redundant — a purely 3-way (XOR) coupling stays
 * invisible to any pairwise-conditioned matrix; separating synergy needs PID, a separate instrument.
 *
 * Platform-blind: composes ./gaussian-cmi + reuses ./mesh-coupling's MeshCoupling shape. NO imports.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/flow
 */

import { gaussianConditionalTE } from "./gaussian-cmi.js";
import { type MeshCoupling } from "./mesh-coupling.js";

/** A child sensorium's CONTINUOUS signed-innovation signal — rows = time, cols = the child's dims. */
export interface ChildSignalMV {
  readonly name: string;
  readonly signal: readonly (readonly number[])[];
}

/**
 * Wire the children by native Gaussian conditional-TE. Each directed edge `te[i][j]` = TE(child_i →
 * child_j) conditioned on EVERY other child jointly (full-N-way). Finite-sample negatives clamp to
 * 0. `mergeThreshold` is the operator's dial (bits); `lag` the history length.
 */
export function coupleMeshChildrenMV(
  children: readonly ChildSignalMV[], mergeThreshold = 0.5, lag = 1,
): MeshCoupling {
  const n = children.length;
  const names = children.map((c) => c.name);
  const te: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  let strongest: { from: string; to: string; coupling: number } | null = null;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const conds = children.filter((_, k) => k !== i && k !== j).map((c) => c.signal);
      const raw = gaussianConditionalTE(children[i]!.signal, children[j]!.signal, conds, lag);
      const val = raw > 0 ? raw : 0;                       // clamp finite-sample noise below zero
      te[i]![j] = val;
      if (!strongest || val > strongest.coupling) strongest = { from: names[i]!, to: names[j]!, coupling: val };
    }
  }

  return {
    children: names,
    te,
    strongestEdge: strongest,
    sovereign: !strongest || strongest.coupling < mergeThreshold,
    phantomGuarded: n >= 3,                                // conditioned on the others ⇒ guarded for N≥3
  };
}
