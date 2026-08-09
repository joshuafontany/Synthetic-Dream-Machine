/**
 * partition-monitor — sovereignty is MEASURED, not DECLARED (IIT's Minimum Information
 * Partition, crucible-bound). Sovereign sensoria stay sovereign only while the coupling
 * BETWEEN them stays well below the coupling WITHIN each. This watches that ratio (the Φ-proxy)
 * and fires the merge-ALARM when the cut dissolves — the moment two senses have silently
 * become one whole, regardless of the design's intent.
 *
 * The couplings are effective/conditional Transfer Entropy (./transfer-entropy) — the honest,
 * phantom-free, bias-corrected cross-flow. The mergeThreshold is the operator's fairness dial.
 *
 * Platform-blind: pure arithmetic (rides ./transfer-entropy's output). NO imports.
 * Meme: lar:///ha.ka.ba/lares/api/pono/the-veil-ladder
 */

/** A sovereignty read — the cut still holds, or the senses are merging. */
export interface PartitionReading {
  /** Mean coupling WITHIN sensoria (same-label pairs). */
  readonly within: number;
  /** Mean coupling BETWEEN sensoria (cross-label pairs). */
  readonly between: number;
  /** between / within — climbs toward and past 1 as the senses merge. */
  readonly ratio: number;
  /** ratio < mergeThreshold — the partition still loses little when cut; the cut holds. */
  readonly sovereign: boolean;
}

/**
 * Read sovereignty from within- vs between-sensorium coupling. Sovereign while cutting BETWEEN
 * the senses loses little relative to the cohesion WITHIN: `between/within < mergeThreshold`.
 * Zero within with any between → Infinity (no cohesion, pure cross-flow = merged); zero both → 0.
 */
export function partitionReading(within: number, between: number, mergeThreshold: number): PartitionReading {
  const ratio = within > 0 ? between / within : (between > 0 ? Infinity : 0);
  return { within, between, ratio, sovereign: ratio < mergeThreshold };
}

/**
 * From a DIRECTED coupling matrix (`couplings[i][j]` = TE(stream i → stream j), diagonal
 * ignored) + a partition label per stream: `within` = the MEAN within-sensorium cohesion,
 * `between` = the MAX single cross-sensorium edge. MIP-faithful — the partition's sovereignty
 * is limited by its STRONGEST cross-dependency (the edge cutting it would destroy), NOT the
 * average, so a single fusing stream-pair raises the alarm rather than being washed out.
 */
export function partitionCouplings(
  couplings: readonly (readonly number[])[],
  labels: readonly string[],
): { within: number; between: number } {
  let wSum = 0, wN = 0, betweenMax = 0;
  for (let i = 0; i < couplings.length; i++) {
    for (let j = 0; j < couplings.length; j++) {
      if (i === j) continue;
      const c = couplings[i]?.[j] ?? 0;
      if (labels[i] === labels[j]) { wSum += c; wN += 1; }
      else if (c > betweenMax) betweenMax = c;
    }
  }
  return { within: wN ? wSum / wN : 0, between: betweenMax };
}

/**
 * The sensorium PAIR closest to merging — the label-pair joined by the STRONGEST single
 * cross-edge (the MIP-critical dependency). The actionable alarm: names WHICH two senses are
 * fusing, so the operator can widen the cut or accept the merge. null when < 2 sensoria.
 */
export function closestToMerge(
  couplings: readonly (readonly number[])[],
  labels: readonly string[],
): { a: string; b: string; coupling: number } | null {
  const pairMax = new Map<string, number>();
  for (let i = 0; i < couplings.length; i++) {
    for (let j = 0; j < couplings.length; j++) {
      if (i === j || labels[i] === labels[j]) continue;
      const [a, b] = [labels[i]!, labels[j]!].sort();       // unordered pair key
      const key = `${a}\u0000${b}`;
      pairMax.set(key, Math.max(pairMax.get(key) ?? 0, couplings[i]?.[j] ?? 0));   // strongest single cross-edge
    }
  }
  let best: { a: string; b: string; coupling: number } | null = null;
  for (const [key, mx] of pairMax) {
    if (!best || mx > best.coupling) {
      const [a, b] = key.split("\u0000") as [string, string];
      best = { a, b, coupling: mx };
    }
  }
  return best;
}
