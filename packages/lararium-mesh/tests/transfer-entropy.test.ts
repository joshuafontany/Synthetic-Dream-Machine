/**
 * transfer-entropy — R, the coupling keel. Directed (asymmetric), interior-conditioned;
 * conditional TE removes the common-driver PHANTOM; effective TE removes the finite-sample bias.
 */
import { describe, test, expect } from "vitest";
import {
  transferEntropy, conditionalTransferEntropy, effectiveTransferEntropy,
} from "../src/index.js";

// deterministic pseudo-random symbol sequences (base-k), reproducible.
function randSeq(n: number, seed: number, k = 2): number[] {
  let s = seed >>> 0; const a: number[] = [];
  // HIGH bits — an LCG's low bit alternates (period 2); scale the full 32-bit word to [0,k).
  for (let i = 0; i < n; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; a.push(Math.floor((s / 4294967296) * k)); }
  return a;
}
const delay1 = (x: number[]): number[] => [0, ...x.slice(0, -1)];   // y[t] = x[t-1] → y[t+1] = x[t]

describe("transfer-entropy — R informs, directed, guarded", () => {
  test("independent series → effective-TE ≈ 0 (the honest zero, bias removed)", () => {
    const x = randSeq(600, 1), y = randSeq(600, 98765);
    expect(Math.abs(effectiveTransferEntropy(x, y))).toBeLessThan(0.05);
  });

  test("a real coupling (y[t+1] = x[t]) → strong directed TE, and ASYMMETRIC", () => {
    const x = randSeq(600, 3);
    const y = delay1(x);                      // y carries x, lag 1
    const forward = transferEntropy(x, y);    // x informs y's future — strong
    const backward = transferEntropy(y, x);   // x is random → y tells nothing about x's future
    expect(forward).toBeGreaterThan(0.5);
    expect(forward).toBeGreaterThan(backward + 0.4);   // directed, not symmetric
  });

  test("CONDITIONAL TE removes the common-driver PHANTOM (pairwise would hallucinate)", () => {
    // Z drives both: X = Z (instant), Y = Z delayed → X[t] = Z[t] = Y[t+1]. Pairwise says X→Y.
    const z = randSeq(600, 7);
    const x = z.slice();
    const y = delay1(z);
    const pairwise = transferEntropy(x, y);                    // phantom: X predicts Y's future
    const conditioned = conditionalTransferEntropy(x, y, z);   // given Z, the phantom vanishes
    expect(pairwise).toBeGreaterThan(0.4);                     // the hallucination is real + large
    expect(conditioned).toBeLessThan(0.1);                     // conditioning on Z removes it
    expect(pairwise - conditioned).toBeGreaterThan(0.3);       // the phantom was the difference
  });

  test("effective-TE subtracts the positive finite-sample bias (raw > effective on independents)", () => {
    const x = randSeq(200, 11), y = randSeq(200, 22);          // short → visible bias
    const raw = transferEntropy(x, y);
    const eff = effectiveTransferEntropy(x, y, { shuffles: 30, seed: 5 });
    expect(raw).toBeGreaterThan(eff);                          // bias subtracted
    expect(Math.abs(eff)).toBeLessThan(raw);                  // effective nearer the true zero
  });

  test("effective-TE is deterministic (seeded) — same inputs, same value", () => {
    const x = randSeq(300, 4), y = delay1(randSeq(300, 4));
    expect(effectiveTransferEntropy(x, y, { seed: 42 })).toBe(effectiveTransferEntropy(x, y, { seed: 42 }));
  });
});
