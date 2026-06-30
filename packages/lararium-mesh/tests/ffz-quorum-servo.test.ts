/**
 * ffz-quorum-servo — the THREE-PLANE Measure quorum-servo (content · form · structure
 * drift fused into one Schmitt-trigger gong). Synthetic 3-channel proofs only; the live
 * vector feed rides the deferred orchestrator.
 *
 * Proves: common currency (raw-scale differences do NOT leak — a plane at 1e-3 and one at
 * 1e3 read the same z for the same relative spike); the gong fires on tri-plane coincidence
 * (super-additive); a single-plane drift reads provisional only and NEVER gongs; a conflict
 * (one screams, two silent) flags Signal-Jam and does not fire; whitening DE-DOUBLE-COUNTS
 * (a content+form co-move that is really ONE shift fuses to ~one plane, not two); the
 * confidence ladder (1/2/3 → provisional/firm/gong); the co-firing window admits temporally
 * spread coincidence; and symInvSqrt is a genuine inverse-sqrt.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

import { describe, test, expect } from "vitest";
import {
  quorumServoInit,
  quorumStep,
  symInvSqrt,
  QUORUM_SERVO_DEFAULTS,
  type QuorumServoState,
  type QuorumStep,
} from "../src/index.js";

/** Drive the quorum-servo over a list of per-plane drift vectors. */
function drive(vectors: number[][], config = {}): { state: QuorumServoState; steps: QuorumStep[] } {
  let state = quorumServoInit(vectors[0]?.length ?? 3);
  const steps: QuorumStep[] = [];
  for (const v of vectors) {
    const r = quorumStep(state, v, config);
    state = r.state;
    steps.push(r);
  }
  return { state, steps };
}

/**
 * A low-noise coherent warmup (no plane drifts) — each plane on a DECORRELATED period
 * (plane p flips every 2^p steps), so the running cross-plane correlation stays ≈ I and
 * the channels read as independent. `eps=0` gives a perfectly flat (identical) run.
 */
const calm = (n: number, planes = 3, eps = 0.01): number[][] =>
  Array.from({ length: n }, (_, i) =>
    Array.from({ length: planes }, (_, p) => (((i >> p) & 1) ? 1 : -1) * eps),
  );

describe("symInvSqrt — a genuine symmetric inverse square root", () => {
  test("M^(-1/2) · M^(-1/2) ≈ M^(-1) for a correlated 2×2 (with ridge)", () => {
    const M = [
      [1, 0.6],
      [0.6, 1],
    ];
    const S = symInvSqrt(M, 0); // no ridge — exact
    // S·S should invert M: (S·S)·M ≈ I
    const SS = [
      [S[0][0] * S[0][0] + S[0][1] * S[1][0], S[0][0] * S[0][1] + S[0][1] * S[1][1]],
      [S[1][0] * S[0][0] + S[1][1] * S[1][0], S[1][0] * S[0][1] + S[1][1] * S[1][1]],
    ];
    const prod = [
      [SS[0][0] * M[0][0] + SS[0][1] * M[1][0], SS[0][0] * M[0][1] + SS[0][1] * M[1][1]],
      [SS[1][0] * M[0][0] + SS[1][1] * M[1][0], SS[1][0] * M[0][1] + SS[1][1] * M[1][1]],
    ];
    expect(prod[0][0]).toBeCloseTo(1, 5);
    expect(prod[1][1]).toBeCloseTo(1, 5);
    expect(prod[0][1]).toBeCloseTo(0, 5);
    expect(prod[1][0]).toBeCloseTo(0, 5);
  });

  test("ridge keeps a near-singular (ρ→1) block invertible (no NaN/Inf)", () => {
    const S = symInvSqrt(
      [
        [1, 0.999],
        [0.999, 1],
      ],
      0.05,
    );
    expect(S.flat().every((x) => Number.isFinite(x))).toBe(true);
  });
});

describe("common currency — raw-scale differences do NOT leak", () => {
  test("a tiny-scale plane and a million-fold-larger one read the same z for the same RELATIVE spike", () => {
    // plane1 = 1e6 × plane0 exactly → z is scale-invariant (the EWMA variance is data-driven,
    // so the raw magnitude divides out). plane2 tracks plane0. Identical relative spike → equal z.
    const warm = 10;
    const base: number[][] = Array.from({ length: warm }, (_, i) => {
      const a = i % 2 ? 13 : 10; // a mid-scale plane whose data variance dominates the seed
      return [a, a * 1e6, a]; // plane1 a million times larger, plane2 tracks plane0
    });
    const spike = [40, 40 * 1e6, 40]; // the same relative jump on all three
    const { steps } = drive([...base, spike], { whiten: false }); // isolate the standardization
    const last = steps[steps.length - 1];
    // identical relative spike on hugely different raw scales → the SAME common-currency z.
    const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);
    expect(rel(last.perPlaneZ[0], last.perPlaneZ[1])).toBeLessThan(0.01);
    expect(rel(last.perPlaneZ[0], last.perPlaneZ[2])).toBeLessThan(0.01);
    expect(last.perPlaneZ[0]).toBeGreaterThan(QUORUM_SERVO_DEFAULTS.gate);
  });
});

describe("the gong — tri-plane coincidence fires (super-additive)", () => {
  test("a calm run then a simultaneous tri-plane spike → exactly one gong, ordinal increments", () => {
    const { steps } = drive([...calm(8), [1, 1, 1]]);
    const gongs = steps.filter((s) => s.gonged).length;
    expect(gongs).toBe(1);
    const last = steps[steps.length - 1];
    expect(last.gonged).toBe(true);
    expect(last.label).toBe("1"); // the new segment ordinal
    expect(last.quorum).toBe(3);
    expect(last.level).toBe("gong");
    expect(last.conflict).toBe(false);
    // every calm member sat in segment "0", none gonged.
    expect(steps.slice(0, 8).every((s) => s.label === "0" && !s.gonged)).toBe(true);
  });

  test("a calm run alone fires NOTHING (the planes free-run, no wavefront)", () => {
    const { steps } = drive(calm(20));
    expect(steps.every((s) => !s.gonged && s.label === "0")).toBe(true);
  });
});

describe("the ladder — 1 = provisional · 2 = firm · 3 = gong", () => {
  test("one plane drifts → provisional only, never a gong", () => {
    const { steps } = drive([...calm(8), [1, 0, 0]]);
    const last = steps[steps.length - 1];
    expect(last.gonged).toBe(false);
    expect(last.level).toBe("provisional");
    expect(last.quorum).toBe(1);
  });

  test("two planes drift → firm, still no gong", () => {
    const { steps } = drive([...calm(8), [1, 1, 0]]);
    const last = steps[steps.length - 1];
    expect(last.gonged).toBe(false);
    expect(last.level).toBe("firm");
    expect(last.quorum).toBe(2);
  });
});

describe("conflict guard (Signal-Jam) — one screams, two silent → no gong", () => {
  test("a lone screaming plane flags conflict and does NOT fire the gong", () => {
    const { steps } = drive([...calm(8), [5, 0, 0]]); // plane0 screams, the rest silent
    const last = steps[steps.length - 1];
    expect(last.conflict).toBe(true);
    expect(last.gonged).toBe(false);
    expect(last.level).toBe("provisional"); // never elevated past one plane
  });

  test("precision-weight: a low-reliability plane's fused evidence is throttled by its weight", () => {
    const seq = [...calm(8), [6, 0, 0]]; // plane0 alone drifts
    const weak = drive(seq, { reliabilities: [0.05, 1, 1] }).steps.at(-1)!;
    const full = drive(seq, { reliabilities: [1, 1, 1] }).steps.at(-1)!;
    // neither fires (quorum 1); but the unreliable plane contributes ~its weight (0.05) of the
    // fused surprise — it cannot manufacture confidence on its own.
    expect(weak.gonged).toBe(false);
    expect(full.gonged).toBe(false);
    expect(weak.fusedBits / full.fusedBits).toBeCloseTo(0.05, 2);
  });
});

describe("whitening — de-double-counts a content+form co-move (ONE shift, not two)", () => {
  /**
   * Warm content (plane0) and form (plane1) as a perfectly-correlated pair (equal drifts),
   * structure (plane2) flat — so the running correlation learns ρ_content,form ≈ 1. Then a
   * co-move spike on content+form (structure still flat). Under whitening the redundant
   * second plane collapses, so the FUSED surprise reads ~one plane; naive (whiten:false)
   * fusion reads ~two.
   */
  function buildCoMove() {
    const warm = 18;
    const base: number[][] = Array.from({ length: warm }, (_, i) => {
      const v = i % 2 ? 1.3 : 1.0; // a mild shared oscillation, below the gate (no fire)
      return [v, v, 0.5]; // content == form (correlated); structure flat
    });
    const spike = [3, 3, 0.5]; // content + form co-move; structure unchanged
    return [...base, spike];
  }

  test("whitened fused surprise ≈ half the naive (the redundant plane is removed)", () => {
    const seq = buildCoMove();
    const whitened = drive(seq, { whiten: true }).steps.at(-1)!;
    const naive = drive(seq, { whiten: false }).steps.at(-1)!;
    // both still fire content+form on the spike (the SHIFT is real on two channels)…
    expect(whitened.quorum).toBe(2);
    expect(naive.quorum).toBe(2);
    // …but the fused multiplicative surprise is de-double-counted: ~one plane vs ~two.
    expect(whitened.fusedBits).toBeLessThan(naive.fusedBits * 0.65);
    expect(naive.fusedBits / whitened.fusedBits).toBeGreaterThan(1.6);
  });

  test("an INDEPENDENT two-plane drift is NOT discounted (whitening only removes redundancy)", () => {
    // content + structure drift together but were never correlated in warmup → no discount.
    const warm = 18;
    const base: number[][] = Array.from({ length: warm }, (_, i) => [
      i % 2 ? 1.3 : 1.0, // content oscillates
      0.5, // form flat
      i % 3 === 0 ? 1.2 : 0.9, // structure oscillates on a different period (decorrelated)
    ]);
    const spike = [3, 0.5, 3]; // content + structure, an independent pair
    const seq = [...base, spike];
    const whitened = drive(seq, { whiten: true }).steps.at(-1)!;
    const naive = drive(seq, { whiten: false }).steps.at(-1)!;
    // an independent pair keeps ~all its joint surprise under whitening (no big discount).
    expect(whitened.fusedBits / naive.fusedBits).toBeGreaterThan(0.8);
  });
});

describe("co-firing window — temporally spread coincidence still gongs", () => {
  test("three planes spiking on consecutive steps (within the window) reach the gong", () => {
    const seq = [
      ...calm(8),
      [4, 0, 0], // t   : content
      [0, 4, 0], // t+1 : form
      [0, 0, 4], // t+2 : structure — window now holds all three
    ];
    const { steps } = drive(seq, { whiten: false }); // independent channels, isolate the window
    const last = steps[steps.length - 1];
    expect(last.quorum).toBe(3);
    expect(last.gonged).toBe(true);
  });

  test("spikes spread WIDER than the window never accumulate a quorum (no gong)", () => {
    const gap = new Array(QUORUM_SERVO_DEFAULTS.coFireWindow + 1).fill([0, 0, 0]);
    const seq = [...calm(8), [4, 0, 0], ...gap, [0, 4, 0], ...gap, [0, 0, 4]];
    const { steps } = drive(seq, { whiten: false });
    expect(steps.some((s) => s.gonged)).toBe(false);
    expect(steps.every((s) => s.quorum < 3)).toBe(true);
  });
});

describe("CEIL — a long calm run forces a staleness gong (reused from the one servo)", () => {
  test("a perfectly coherent run breaks at maxSegment", () => {
    const max = QUORUM_SERVO_DEFAULTS.maxSegment;
    const { steps } = drive(calm(max + 2, 3, 0), { maxSegment: max });
    const firstGong = steps.findIndex((s) => s.gonged);
    expect(firstGong).toBe(max); // count hits max on the (max+1)-th (index max) member
  });
});

// ───────────────────────────────────────────────────────────────────────────
// STRAND C — the kapae DOWN-WEIGHT (a per-step salience scaling THIS member's
// Measure contribution). A floor-salience (rewound/road-not-taken) member: (1)
// contributes little fused surprise → cannot trip a gong alone; (2) barely
// reshapes the baseline. weight=1 reproduces the prior output byte-for-byte.
// ───────────────────────────────────────────────────────────────────────────
describe("kapae down-weight — a floor salience can't trip a gong, barely bends the rhythm", () => {
  const FLOOR = 0.05;
  // A MODERATE tri-plane spike — clears the gate (z≈3.2 > gate 2) so the planes co-fire and
  // the full-weight fused surprise (~17.7 bits) clears the MDL bar, but is small enough that
  // the floor-scaled surprise (~0.9 bits) does NOT. A huge spike would gong even at floor.
  const SPIKE = [0.1, 0.1, 0.1];

  /** Warm a 3-plane servo over a calm run, then take ONE weighted spike step. */
  function warmThenSpike(spike: number[], weight: number) {
    let state = quorumServoInit(spike.length);
    for (const v of calm(8, spike.length)) state = quorumStep(state, v, {}).state;
    return { before: state, step: quorumStep(state, spike, {}, weight) };
  }

  test("a tri-plane spike gongs at weight=1 but NOT at floor salience", () => {
    const full = warmThenSpike(SPIKE, 1).step;
    const floor = warmThenSpike(SPIKE, FLOOR).step;
    expect(full.gonged).toBe(true); // the same member, full weight, trips the gong
    expect(floor.gonged).toBe(false); // floor salience: the fused surprise can't clear the MDL bar
    // the gate is still crossed (the planes co-fire) — the down-weight throttles the SURPRISE,
    // not the firing — so the fused bits shrink by ~the weight ratio.
    expect(floor.fusedBits).toBeLessThan(full.fusedBits * 0.1);
  });

  test("a floor-salience member barely reshapes the per-plane baseline", () => {
    const { before, step: full } = warmThenSpike(SPIKE, 1);
    const floor = warmThenSpike(SPIKE, FLOOR).step;
    const base0 = before.planes[0].mean;
    const fullDelta = Math.abs(full.state.planes[0].mean - base0);
    const floorDelta = Math.abs(floor.state.planes[0].mean - base0);
    // alphaEff = ewmaAlpha·weight, so the floor member moves the baseline ~weight× as far.
    expect(floorDelta).toBeCloseTo(fullDelta * FLOOR, 6);
    expect(floorDelta).toBeLessThan(fullDelta * 0.1);
  });

  test("PARITY — weight=1 reproduces the unweighted step byte-for-byte", () => {
    let state = quorumServoInit(3);
    for (const v of calm(8)) state = quorumStep(state, v, {}).state;
    const def = quorumStep(state, [1, 1, 1], {}); // the default (no weight arg)
    const explicit = quorumStep(state, [1, 1, 1], {}, 1); // explicit weight 1
    expect(explicit).toEqual(def); // whole QuorumStep — state, label, gong, fusedBits, …
  });
});
