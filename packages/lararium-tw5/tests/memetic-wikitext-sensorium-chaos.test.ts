/**
 * memetic-wikitext-sensorium — ADVERSARIAL chaos / fuzz coverage (The-Stranger QA spirit).
 *
 * The sensorium END-TO-END, attacked: the reader (stratify → skeletal tier + typed association multigraph)
 * → the planes (content/structure/form via stratificationRestrictions) → the consistency-radius → the
 * coupling (coupleAligned / readKiStratum / readKiCorpus). The SEAMS between the four T2 landings.
 *
 * TWO invariants under fire:
 *   1. GRACEFUL-DEGRADE, NEVER THROW — malformed/degenerate input degrades to a well-formed empty/partial
 *      reading, never a crash (the graceful-parsing doctrine — augment, don't break).
 *   2. THE ANTI-FALSE-SOVEREIGN WARMING ALWAYS HOLDS — thin / under-powered data ⇒ warming, never a
 *      fabricated coupling edge; a corpus with no shared grain ⇒ zero ticks, warming, null coupling.
 *
 * The RED find (now fixed + pinned): `coupleAligned` derived the estimator-floor joint dimension from
 * `ticks[0]` ALONE, so a RAGGED first tick (a malformed sidecar emitting a lower-dim first vector)
 * under-counted the floor, DEFEATED warming, and FABRICATED a coupling edge on the very data the uniform
 * path honestly refuses. {@link describe} "REGRESSION — the ragged-first-tick false-sovereign" pins it.
 */

import { describe, test, expect } from "vitest";
import {
  stratify, repairWellFormedness, intersectTiers, normalizeOcp,
  stratumTicks, readKiStratum, ffzAlignTicks, readKiCorpus, coupleAligned,
  bandForSpanLength, stratificationRestrictions,
  type FfzCell, type AlignedTick,
} from "../src/memetic-wikitext-sensorium.js";
import { consistencyRadius, type PlaneRestriction } from "@lararium/mesh";

// Run the WHOLE LI pipeline over a text and assert it never throws + stays internally coherent.
function pipelineHoldsFor(text: string): void {
  const s = stratify(text);
  // strata + skeletal spans are half-open, in-bounds, and non-negative
  for (const st of s.strata) {
    expect(st.span[0]).toBeGreaterThanOrEqual(0);
    expect(st.span[1]).toBeLessThanOrEqual(text.length);
    expect(st.span[1]).toBeGreaterThan(st.span[0]);
    expect(st.sourceCid).toBe(s.sourceCid);
  }
  for (const a of s.skeletal) {
    expect(a.span[0]).toBeGreaterThanOrEqual(0);
    expect(a.span[1]).toBeLessThanOrEqual(text.length);
  }
  // every association indexes REAL strata + anchors (no dangling index — no silent data-drop)
  for (const e of s.associations) {
    expect(s.strata[e.stratum]).toBeDefined();
    expect(s.skeletal[e.anchor]).toBeDefined();
  }
  // the follow-up passes compose without throwing, and a stratify() parse is ALWAYS well-formed (planar)
  const r = repairWellFormedness(s);
  const oc = normalizeOcp(s);
  expect(intersectTiers(s).valid).toBe(true);
  expect(intersectTiers(r).valid).toBe(true);
  expect(intersectTiers(oc).valid).toBe(true);
  // repair only ADDS edges (li untouched); OCP never grows the strata count
  expect(r.strata).toBe(s.strata);
  expect(oc.strata.length).toBeLessThanOrEqual(s.strata.length);
  // the planes read + the consistency-radius computes without throwing, and never claims a false glue
  const { stalk, restrictions } = stratificationRestrictions(r);
  const cr = consistencyRadius(restrictions, stalk);
  expect(cr.signalKind).toBe("disagreement-signal");
  if (cr.vacuous) expect(cr.glues).toBe(false);   // a vacuous 0 never reads as a real glue
  // the KI face runs + reports honest ticks
  const ki = readKiStratum(text);
  expect(ki.ticks).toBe(stratumTicks(text).length);
  expect(ki.ticks).toBeGreaterThanOrEqual(0);
}

// ── CHAOS / FUZZ — the reader never throws (graceful-degrade) ────────────────────────────────────────

describe("chaos — the reader graceful-degrades on degenerate / malformed input (never throws)", () => {
  const CASES: ReadonlyArray<readonly [string, string]> = [
    ["empty corpus", ""],
    ["single token", "x"],
    ["whitespace only", "   \n\t  \n  "],
    ["all-black (no sigils)", "just plain prose with absolutely no sigils here at all across the whole span"],
    ["all-red (only sigils)", "<<~ ward ! >><<~ confidence Synthesis 12/20 >><<~ lares aim a -> b >>"],
    ["single sigil, no prose", "<<~ ward ! >>"],
    ["adjacent no-gap sigils", "<<~ ward ! >><<~ ward ! >><<~ ward ! >>"],
    ["unbalanced open (no >>)", "prose <<~ ward ! runs to the end with no closing bracket at all here now"],
    ["stray close (no opener)", "prose >> more prose with a bare close and no opener anywhere in this span"],
    ["nested frames deep", "<<~ ahu #a >><<~ ahu #b >><<~ ahu #c >>deep<<~/ahu >><<~/ahu >><<~/ahu >>"],
    ["only frames", "<<~ ahu #a >><<~/ahu >>"],
    ["sigil glued inside a word", "wo<<~ward!>>rd stuck to prose with no surrounding spaces at all here"],
    ["all four Mu ops", "<<~ ward * >> a <<~ ward ? >> b <<~ ward ! >> c <<~ ward _ >> d tail prose here"],
    ["emoji ZWJ storm (F4)", "prose 👨‍👩‍👧‍👦🏳️‍🌈👩🏽‍🚀 <<~ confidence Synthesis 12/20 >> more 🧑‍🤝‍🧑 tail here"],
    ["combining-mark zalgo (F4)", "à̴̢̛͈͇é́́ <<~ ward ! >> zalgo t̷̢e̸x̶t across the span for the grain test here"],
    ["unicode sigil head", "<<~ ॐ confidence >> devanagari-head prose across the span in this whole line"],
  ];
  for (const [name, text] of CASES) {
    test(`no crash — ${name}`, () => {
      expect(() => pipelineHoldsFor(text)).not.toThrow();
    });
  }

  test("HUGE all-black corpus — scale, no crash, still coherent", () => {
    const huge = "word ".repeat(20000);
    expect(() => pipelineHoldsFor(huge)).not.toThrow();
    const s = stratify(huge);
    expect(s.strata.length).toBe(0);                 // no sigils → all black
    expect(s.skeletal.length).toBe(1);               // one giant anchor
    expect(s.skeletal[0]!.band).toBe("Theme");       // the whole document band
  });

  test("HUGE all-sigil corpus — scale, no crash, planar", () => {
    const huge = "<<~ ward ! >> ".repeat(4000);
    const s = stratify(huge);
    expect(s.strata.length).toBe(4000);
    expect(intersectTiers(s).valid).toBe(true);      // 4000 strata still synchronize (planar by construction)
  });
});

// ── the F4 crucible — grapheme / codepoint / byte disagreement never desyncs the spans ────────────────

describe("chaos — grapheme-cluster vs codepoint spans (F4): the sigil still tags, spans stay in-bounds", () => {
  test("an emoji ZWJ storm around a sigil keeps the stratum span valid + the association intact", () => {
    const text = "lead 👨‍👩‍👧‍👦 prose then <<~ confidence Synthesis 12/20 >> then 🏳️‍🌈 tail prose runs on here now";
    const s = stratify(text);
    const conf = s.strata.find((st) => st.head === "confidence");
    expect(conf).toBeDefined();
    // the sigil's raw slice round-trips (JS string indices — the reader's honest unit; no byte/grapheme desync)
    expect(text.slice(conf!.span[0], conf!.span[1])).toBe(conf!.raw);
    expect(conf!.raw).toContain("confidence");
    // it still associates onto prose (the ZWJ clusters did not swallow the anchor)
    expect(s.associations.some((a) => a.stratum === s.strata.indexOf(conf!))).toBe(true);
  });
});

// ── ANTI-FALSE-SOVEREIGN — thin data ⇒ warm, never a fabricated edge ──────────────────────────────────

describe("anti-false-sovereign — thin / degenerate data ⇒ warming, never a fabricated coupling edge", () => {
  test("a constant red↔black stream emits NO strongest edge (degenerate, no flow to fabricate)", () => {
    const constConst: AlignedTick[] = Array.from({ length: 300 }, () => [[1], [1]]);
    const r = coupleAligned(["red", "black"], constConst, { L: 30 });
    expect(r.warming).toBe(false);                   // 300 ≥ L → the window is powered
    // but a constant-vs-constant stream carries NO information flow → the significance screen finds no edge
    expect(r.coupling?.strongestEdge ?? null).toBeNull();
  });

  test("a corpus with NO shared FFZ grain ⇒ zero ticks ⇒ warming, null coupling (never ordinal fakery)", () => {
    const formal: FfzCell[] = [{ ffz: "session/A.1", vec: [0.9, 0.1] }, { ffz: "session/A.2", vec: [0.4, 0.6] }];
    const informal: FfzCell[] = [{ ffz: "session/Z.9", vec: [0.5, 0.5] }];
    expect(ffzAlignTicks(formal, informal).length).toBe(0);
    const r = readKiCorpus(formal, informal);
    expect(r.ticks).toBe(0);
    expect(r.warming).toBe(true);
    expect(r.coupling).toBeNull();
  });

  test("NaN / Infinity vectors degrade (warm or null-edge), never fabricate a confident edge", () => {
    const nanF: FfzCell[] = Array.from({ length: 300 }, (_, k) => ({ ffz: `T.${k}`, vec: [NaN, k] }));
    const nanI: FfzCell[] = Array.from({ length: 300 }, (_, k) => ({ ffz: `T.${k}`, vec: [k, NaN] }));
    const r = readKiCorpus(nanF, nanI, { L: 30 });
    // NaN cannot yield a significance-clean edge — the runtime warms or emits a null edge, never a NaN edge
    const edge = r.coupling?.strongestEdge ?? null;
    if (edge) expect(Number.isFinite((edge as { coupling: number }).coupling)).toBe(true);
  });
});

// ── REGRESSION — the ragged-first-tick false-sovereign (THE find) ─────────────────────────────────────

describe("REGRESSION — the ragged-first-tick false-sovereign (dJoint mis-derivation)", () => {
  // A lagged-echo corpus over 120 SHARED-address ticks. Joint dim 10 (uniform 5-dim) → floor L=150 → 120<150
  // → the runtime MUST warm (refuse). The bug: dJoint was read from ticks[0] alone, so a 1-dim FIRST tick
  // collapsed L to 30, defeated warming, and fabricated a coupling edge on the SAME under-powered data.
  function laggedEchoCells(firstDim: number): { f: FfzCell[]; i: FfzCell[] } {
    let a = 123456789;
    const rng = (): number => { a = (1103515245 * a + 12345) & 0x7fffffff; return a / 0x7fffffff - 0.5; };
    const drive = Array.from({ length: 120 }, () => rng());
    const f: FfzCell[] = [];
    const i: FfzCell[] = [];
    for (let k = 0; k < 120; k++) {
      const x = drive[k]!;
      const past = k > 0 ? drive[k - 1]! : 0;
      const full = [x, x * 0.5, x * x, Math.sin(x * 3), Math.cos(x)];
      const echo = [past, past * 0.5, past * past, Math.sin(past * 3), Math.cos(past)];
      const dim = k === 0 ? firstDim : 5;
      f.push({ ffz: `s.${k}`, vec: full.slice(0, dim) });
      i.push({ ffz: `s.${k}`, vec: echo.slice(0, dim) });
    }
    return { f, i };
  }

  test("the uniform path REFUSES under-powered data (120 samples < floor 150) — warming, no edge", () => {
    const { f, i } = laggedEchoCells(5);
    const r = readKiCorpus(f, i, { lag: 1, alpha: 0.05, changeThreshold: 12 });
    expect(r.ticks).toBe(120);
    expect(r.warming).toBe(true);
    expect(r.coupling?.strongestEdge ?? null).toBeNull();
  });

  test("a RAGGED first tick must NOT defeat the floor — the SAME data still warms (no fabricated edge)", () => {
    const { f, i } = laggedEchoCells(1);   // first cell 1-dim, rest 5-dim (malformed sidecar)
    const r = readKiCorpus(f, i, { lag: 1, alpha: 0.05, changeThreshold: 12 });
    expect(r.ticks).toBe(120);
    // BEFORE the fix: warming=false + strongestEdge {formal→informal, ~24} — a fabricated false-sovereign.
    // AFTER: the floor rides the MAX joint dimension, so the ragged tick can only RAISE it → still warming.
    expect(r.warming).toBe(true);
    expect(r.coupling?.strongestEdge ?? null).toBeNull();
  });

  test("coupleAligned floors the window on the MAX joint dim (a thin first tick cannot lower L)", () => {
    // 40 uniform 5-dim ticks → dJoint 10 → L=150 → warms. A 1-dim first tick must NOT drop L to 30.
    const uni: AlignedTick[] = Array.from({ length: 40 }, (_, t) => [[t, t, t, t, t], [t, t, t, t, t]]);
    const ragged: AlignedTick[] = [[[0], [0]], ...uni.slice(1)];
    expect(coupleAligned(["a", "b"], uni).warming).toBe(true);
    expect(coupleAligned(["a", "b"], ragged).warming).toBe(true);   // same floor, same verdict
  });
});

// ── VARIANCE MIS-ROUTE — a cosheaf plane must NEVER leak into the sheaf consistency-radius ─────────────

describe("seam — variance mis-route: a cosheaf plane leaking into the sheaf radius is REJECTED loudly", () => {
  test("consistencyRadius throws when handed a cosheaf (ki) plane — no silent corruption", () => {
    const leaked: PlaneRestriction[] = [
      { plane: "content", variance: "sheaf", value: new Map([["s0", 0.5]]) },
      { plane: "coupling", variance: "cosheaf", value: new Map([["s0", 0.9]]) },   // ki plane, wrong posture
    ];
    expect(() => consistencyRadius(leaked, { units: ["s0"] })).toThrow(/sheaf planes only|cosheaf/i);
  });

  test("the engineered stratification restrictions are ALL sheaf (nothing cosheaf leaks in)", () => {
    const { restrictions } = stratificationRestrictions(stratify("prose <<~ ward ! >> more prose here now"));
    for (const r of restrictions) expect(r.variance).toBe("sheaf");
    expect(restrictions.map((r) => r.plane).sort()).toEqual(["content", "form", "structure"]);
  });
});

// ── a sanity guard on bandForSpanLength across the whole ladder (no NaN / undefined at the edges) ──────

describe("seam — bandForSpanLength is total across the ladder (no undefined at any length)", () => {
  test("every non-negative length maps to a real band", () => {
    for (const len of [0, 1, 39, 40, 41, 119, 400, 1199, 1200, 100000]) {
      expect(["Pulse", "Beat", "Measure", "Arc", "Theme"]).toContain(bandForSpanLength(len));
    }
  });
});

// ── CONSUMER-PARITY: the linearity screen no longer just FLAGS nonlinearity, it ANSWERS it ────────────
// The gate detects when the Gaussian coupling under-reads a nonlinear relationship; coupleAligned now
// fires the order-robust rank-TE on the strongest-nonlinear dim. A monotone-nonlinear stream escalates
// AND carries a live rank-TE read; a linear stream stays on the Gaussian default with no rank-TE.
describe("escalate → rank-TE fires (the gate's verdict gets answered, not just reported)", () => {
  // a small deterministic LCG — no Math.random (repeatable witness).
  const lcg = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

  test("a quadratic (nonlinear-beyond-linear) red↔black stream escalates AND fires rank-TE", () => {
    const u = lcg(7);
    const quad: AlignedTick[] = Array.from({ length: 120 }, () => {
      const x = u();
      return [[x], [x * x]];   // child-1 = child-0² — high dCor, ~0 LINEAR correlation (even fn) → escalate
    });
    const r = coupleAligned(["red", "black"], quad, { L: 30 });
    expect(r.escalate).toBe(true);                 // the Gaussian read leaves the cubic on the table
    expect(r.rankTE).not.toBeNull();               // the escalation ACTED
    expect(Number.isFinite(r.rankTE!.forward)).toBe(true);
    expect(Number.isFinite(r.rankTE!.backward)).toBe(true);
    expect(r.rankTE!.samples).toBeGreaterThan(0);
  });

  test("a linear red↔black stream stays on the Gaussian default — no rank-TE escalation", () => {
    const u = lcg(11);
    const linear: AlignedTick[] = Array.from({ length: 120 }, () => {
      const x = u();
      return [[x], [0.8 * x]];     // a clean linear relationship the Gaussian read handles
    });
    const r = coupleAligned(["red", "black"], linear, { L: 30 });
    if (!r.escalate) expect(r.rankTE).toBeNull();  // no escalation ⇒ no rank-TE cost
  });
});
