/**
 * mesh-coupling — WIRES the mesh sensorium's child sensoria (who · authority · flow) together:
 * the "transfer-entropy read on demand" the FLOW coupling-lobe reserves (sensorium.ts — coupling
 * is a BASE cap: dumb child-edges, the TE read elsewhere; THIS is elsewhere). It computes the
 * directed coupling matrix between the children's signals + reads whether they stay SOVEREIGN.
 * R informs (never drives); the partition is watched (never declared).
 *
 * THE PHANTOM GUARD, native to a THREE-child mesh: with exactly who/authority/flow, each ordered
 * pair conditions on the THIRD child — conditional TE that removes the common-driver phantom (if
 * FLOW drives both WHO and AUTHORITY, conditioning on FLOW dissolves the spurious WHO↔AUTHORITY
 * edge). For n≠3 it falls back to effective (pairwise) TE — multivariate-TE for larger meshes is
 * a flagged refinement, not silently pretended.
 *
 * Platform-blind: composes ./transfer-entropy + ./partition-monitor. NO node: imports; the node
 * side reads each child's aggregate signal from its dir and hands it here.
 * Meme: lar:///ha.ka.ba/@lararium/mesh/who (the mesh sensorium tree)
 */

import { effectiveTransferEntropy, conditionalTransferEntropy } from "./transfer-entropy.js";

/** A child sensorium's aggregate coupling-visible signal (discretized integer symbols). */
export interface ChildSignal {
  readonly name: string;
  readonly signal: readonly number[];
}

/** The mesh sensorium's coupling read — the child-to-child flow, and whether the children hold sovereign. */
export interface MeshCoupling {
  readonly children: readonly string[];
  /** Directed coupling: te[i][j] = TE(child_i → child_j) in bits (conditioned on the third when n=3). */
  readonly te: readonly (readonly number[])[];
  /** The strongest single cross-child edge — the MIP-critical dependency (the merge-risk). */
  readonly strongestEdge: { from: string; to: string; coupling: number } | null;
  /** true while the strongest cross-child edge stays below the operator's mergeThreshold. */
  readonly sovereign: boolean;
  /** Whether every pair was conditioned on the others (phantom-guarded) — true only for a 3-child mesh. */
  readonly phantomGuarded: boolean;
}

/**
 * Wire the children — compute the directed coupling matrix and read sovereignty. For exactly
 * three children each pair conditions on the third (phantom-guarded); otherwise effective
 * pairwise TE. `mergeThreshold` is the operator's fairness dial (bits).
 */
export function coupleMeshChildren(children: readonly ChildSignal[], mergeThreshold = 0.5): MeshCoupling {
  const n = children.length;
  const names = children.map((c) => c.name);
  const te: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const phantomGuarded = n === 3;   // each pair has exactly one "other" to condition on
  let strongest: { from: string; to: string; coupling: number } | null = null;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const others = children.filter((_, k) => k !== i && k !== j);
      const val = others.length === 1
        ? conditionalTransferEntropy(children[i]!.signal, children[j]!.signal, others[0]!.signal)
        : effectiveTransferEntropy(children[i]!.signal, children[j]!.signal);
      te[i]![j] = val;
      if (!strongest || val > strongest.coupling) strongest = { from: names[i]!, to: names[j]!, coupling: val };
    }
  }

  return {
    children: names,
    te,
    strongestEdge: strongest,
    sovereign: !strongest || strongest.coupling < mergeThreshold,
    phantomGuarded,
  };
}
