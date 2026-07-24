/**
 * parity-manifest — the ONE machine-checked census of the TS↔py numerics pairs (the pono-homes
 * lift's L4 gate). The isomorphic-parallel-sensorium law: every platform-blind mesh NUMERICS organ
 * either carries a cross-language parity witness, or names its debt out loud (the RUN arc owns the
 * owed py twins — RUN-ARC.md; the migration gate stays ONE FIXTURE PER NUMERIC).
 *
 * What this test enforces, mechanically:
 *   1. CENSUS — every mesh src module matching the numerics name-pattern appears in the manifest
 *      exactly once (a new numerics organ FAILS here until it registers its parity stance).
 *   2. WITNESS — every `witnessed` entry names ≥1 fixture that exists on disk and parses.
 *   3. HONESTY — every owed entry names its py twin (or the debt home), so the eyeball-parity
 *      table below reads as the live map, never a wish.
 *
 * The manifest doubles as the human eyeball-parity table — read the entries, know both bodies.
 */

import { describe, test, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "..", "src");
const repoRoot = join(here, "..", "..", "..");
const pyScripts = join(repoRoot, "packages", "lararium-sensorium", "scripts");

/** Where a TS↔py pair stands on the parity ladder. */
type ParityStatus =
  | "witnessed"            // a committed cross-language fixture binds the pair
  | "owed-fixture"         // both sides exist; the fixture bridge remains owed
  | "owed-py-twin"         // the TS organ stands; the py twin remains owed (the RUN arc)
  | "ts-concept-witness";  // TS-only by ruling — frozen as concept-witness/oracle, no py twin planned

interface ParityEntry {
  /** the mesh src module (basename, .ts) this row censuses. */
  readonly ts: string;
  /** the py twin (basename under lararium-sensorium/scripts), or null where none is planned. */
  readonly py: string | null;
  readonly status: ParityStatus;
  /** fixture paths relative to THIS tests dir (witnessed rows) — each must exist + parse. */
  readonly fixtures: readonly string[];
  /** the one-line honesty note — what binds the pair, or where the debt lives. */
  readonly note: string;
}

const MANIFEST: readonly ParityEntry[] = [
  {
    ts: "spectral-keel.ts", py: "spectral_keel.py", status: "witnessed",
    fixtures: ["fixtures/subspace-angles-parity.json"],
    note: "principalAngles matches scipy.linalg.subspace_angles (py oracle → JSON → TS test; scripts/spectral_parity.py regenerates).",
  },
  {
    ts: "ffz-clock.ts", py: "ffz_clock.py", status: "witnessed",
    fixtures: ["../../lararium-sensorium/scripts/fixtures/clock-recovery-parity.json"],
    note: "the recovered-clock fixture flows TS → py (scripts/clock_recovery_fixture.ts generates; test_ffz_clock.py consumes).",
  },
  {
    ts: "sensorium-pc.ts", py: "predictive_coding.py", status: "owed-fixture",
    fixtures: [],
    note: "both perception-F implementations stand (F = surprise + complexity); the fixture bridge rides the RUN arc's first py projector pass.",
  },
  {
    ts: "sensorium-consistency.ts", py: "sensorium_consistency.py", status: "witnessed",
    fixtures: ["fixtures/sensorium-consistency-parity.json"],
    note: "the H0 li/ki consistency-radius dual; py twin computes, TS re-computes and asserts (sensorium_consistency.py fixture regenerates).",
  },
  {
    ts: "sensorium-contract.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "portable declarations for a nameless #has cap-stack (order evidence + apertures), platform-blind — node derives one from a rooted manifest, browser/TW5 carry one beside in-memory caps. A TS-side contract shape, no numeric py twin planned.",
  },
  {
    ts: "sensorium-fusion.ts", py: "sensorium_fusion.py", status: "witnessed",
    fixtures: ["fixtures/sensorium-fusion-parity.json"],
    note: "the H1 gate over the agreement nerve; py twin computes dimH1/dimH0/R*_sem + the exact H0 consensus, TS asserts (sensorium_fusion.py fixture regenerates; the Chebyshev diffusion dial stays TS-side telemetry around the same P_ker target).",
  },
  {
    ts: "sensorium-efe.ts", py: "sensorium_efe.py", status: "witnessed",
    fixtures: ["fixtures/sensorium-efe-parity.json"],
    note: "the EFE keystone (pragmatic + epistemic + optionLoss, H1-gated); py twin computes every term + the gate fork, TS asserts (sensorium_efe.py fixture regenerates).",
  },
  {
    ts: "arl-dial.ts", py: "nalu_gate.py", status: "owed-fixture",
    fixtures: [],
    note: "ONE scalar ARL0 → α → every threshold on both sides; the dialed-threshold fixture remains owed.",
  },
  {
    ts: "null-harness.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the self-emergent-threshold engine (surrogate the data, read the (1−α) null quantile). spectral_ab.py retired with the boundary-detector ladder; the surrogate-null pattern now lives inlined in py (aliran.py detect_aliran, ffz_continuous_pour.py null_profile block-shuffle) — a dedicated shared twin owed under the machine-code-runs-py ruling (RUN-ARC debt pool).",
  },
  {
    ts: "ffz-project.ts", py: "worldline_ffz.py", status: "owed-fixture",
    fixtures: [],
    note: "FFZ band projection ↔ the per-worldline FFZ; the band-address fixture remains owed.",
  },
  {
    ts: "worldline-clock.ts", py: "worldline_ffz.py", status: "owed-fixture",
    fixtures: [],
    note: "per-worldline clock state ↔ worldline_ffz's recovered beat; rides the same owed fixture as ffz-project.",
  },
  {
    ts: "persistence-keel.ts", py: "persistence_io.py", status: "owed-fixture",
    fixtures: [],
    note: "the standing-axis keel (halfLife regeneration) ↔ persistence_io policy+witness; the decay-curve fixture remains owed.",
  },
  {
    ts: "capture-reading.ts", py: "capture_reading.py", status: "witnessed",
    fixtures: ["../../lararium-sensorium/scripts/fixtures/capture-reading-parity.json"],
    note: "the WHO-plane capture posture (concentration + the 1Hive convex bar, verdict-free); TS generates (scripts/capture_reading_fixture.ts), py matches — Infinity rides as the string \"Infinity\".",
  },
  {
    ts: "synthetic-drift.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the seeded synthetic Claim-B corpus — a future-cut once the real test-beds supersede it (RUN-ARC held); no py twin planned.",
  },
  {
    ts: "spectral-keel-cap.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the ocap tier wiring over spectral-keel (read ⊂ write ⊂ anchor) — composition, not numerics; the numerics parity rides spectral-keel.ts.",
  },
  // ── the coupling family (the streaming/coupling numerics riding the VM fold) ──────────────────
  {
    ts: "windowed-coupling.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the streaming coupling runtime (window policy + regime resets); py twin owed under the machine-code-runs-py ruling (RUN-ARC debt pool, streaming epic).",
  },
  {
    ts: "linearity-gate.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the Tier-0 nonlinearity screen over the Gaussian fit; py twin owed under the machine-code-runs-py ruling (RUN-ARC debt pool).",
  },
  {
    ts: "mesh-coupling.ts", py: "coupling.R", status: "owed-fixture",
    fixtures: [],
    note: "the directed coupling matrix over child sensoria; coupling.R (RTransferEntropy calc_ete pairwise matrix) carries the sidecar twin — the shared fixture remains owed.",
  },
  {
    ts: "mesh-coupling-mv.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the multivariate Gaussian conditional-TE mesh coupling (the hoike's locked keel); py twin owed under the machine-code-runs-py ruling (RUN-ARC debt pool).",
  },
  {
    ts: "mesh-couple.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the coupling CAPSTONE — ONE call composing the locked coupling floors in order (signed-innovation whiten → mesh-coupling-mv couple → cmi-significance gate → the MeshCoupling verdict), consumed by windowed-coupling + the node-side reader. Composition, not numerics (like spectral-keel-cap): each composed floor carries its own parity, and the RUN diffs the coupling RESULT (coupleMesh ↔ coupling.R via the mismatch comparator), so no standalone py twin is planned. (signed-innovation's own parity stance stays surfaced-pending — owed-py-twin vs ts-concept-witness turns on whether coupling.R should prewhiten.)",
  },
  {
    ts: "self-coupling.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the SELF as the coupling READ-OUT (IIT exclusion — the thin surface outside the five senses), pure-arithmetic Bayesian Causal Inference (Körding: pCommonCause posterior + reliability-weighted cross-sense bind) over the coupling substrate. A HULL-NATIVE proprioception cap every running vessel carries locally over its own coupling read (like fisher-rao/bures/subspace); the RUN never recomputes it, so no py twin is owed. Witnessed in self-coupling.test.ts.",
  },
  {
    ts: "te-hodge.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the coupling plane's own co-consistency — the Helmholtz-Hodge decomposition of the TE flow, read for its circulation (the irreducible coupling), plus the incomplete-graph HodgeRank (genuine harmonic H¹ via CG on L₀ + the triangle up-Laplacian). The cohomology rides the TS hull (browser-carried), so no py twin is planned; witnessed in te-hodge.test.ts.",
  },
  {
    ts: "rank-te.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the ordinal/symbolic transfer-entropy escalation (Bandt-Pompe patterns + Staniek-Lehnert symbolic TE) the linearity-gate routes to when the Gaussian read under-reads a nonlinear coupling; sibling of gaussian-cmi/linearity-gate, so a py/R symbolic-TE twin is owed under the machine-code-runs-py ruling (RUN-ARC debt pool).",
  },
  {
    ts: "rank-consensus.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "pure combinatorial rank-aggregation (Borda + Kemeny/Kendall-tau median over the five 0-20 ladders) — a hull-native primitive like numerics.ts; no offline-RUN compute, so no py twin is planned.",
  },
  {
    ts: "transfer-entropy.ts", py: "coupling.R", status: "owed-fixture",
    fixtures: [],
    note: "the discrete conditional-TE keel; coupling.R (RTransferEntropy effective TE + bootstrap null) carries the sidecar twin — the shared fixture remains owed.",
  },
  {
    ts: "change-point.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the mean+variance regime-shift detector; the py side detects via BOCPD (bands_sidecar.py) — a different estimator, so a direct twin stays owed (RUN-ARC debt pool).",
  },
  {
    ts: "gaussian-cmi.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the closed-form Gaussian-CMI/conditional-Granger estimator; py twin owed under the machine-code-runs-py ruling (RUN-ARC debt pool).",
  },
  {
    ts: "cmi-significance.ts", py: null, status: "owed-py-twin",
    fixtures: [],
    note: "the parametric chi-squared significance gate over Gaussian-CMI; py twin owed under the machine-code-runs-py ruling (RUN-ARC debt pool).",
  },
  {
    ts: "fisher-rao.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the register-simplex flow-lens (Fisher-Rao trajectory geometry) — a HULL-NATIVE cap every running vessel (browser/node/tw5) carries locally over its own register trajectory. The browser can't call py, so it lives TS-native by the pono-homes lift; the RUN never recomputes it, so no py twin is owed (the machine-code-runs-py ruling governs the RUN's offline compute, not the per-vessel proprioception caps).",
  },
  {
    ts: "bures-metric.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the Bures/quantum-fidelity register-drift step — a HULL-NATIVE cap every running vessel carries locally over its own register drift. TS-native by the pono-homes lift (the browser can't call py); the RUN never recomputes it, so no py twin is owed.",
  },
  {
    ts: "temporal-rigidity.ts", py: "ffz_clock.py", status: "witnessed",
    fixtures: ["../../lararium-sensorium/scripts/fixtures/clock-recovery-parity.json"],
    note: "ffz_clock.py dominant_period ports temporal-rigidity.dominantPeriod; bound by the clock-recovery fixture (scripts/clock_recovery_fixture.ts imports dominantPeriod; test_ffz_clock.py consumes).",
  },
  {
    ts: "subspace-track.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "the online GROUSE subspace tracker (the spectral keel's WRITE face) — a HULL-NATIVE cap: every running vessel updates its own keel's subspace locally. TS-native by the pono-homes lift; the RUN never recomputes it, so no py twin is owed (the numerics parity for the keel rides spectral-keel.ts, which is witnessed).",
  },
  {
    ts: "clock-recovery.ts", py: "ffz_clock.py", status: "witnessed",
    fixtures: ["../../lararium-sensorium/scripts/fixtures/clock-recovery-parity.json"],
    note: "ffz_clock.py ports src/clock-recovery.ts (recover_clock); bound by the same TS-generated fixture the ffz-clock row names (test_ffz_clock.py consumes).",
  },
  {
    ts: "numerics.ts", py: null, status: "ts-concept-witness",
    fixtures: [],
    note: "shared scalar floor primitives (significance floor + soft-gate) — each py twin inlines its own; no standalone py twin planned.",
  },
];

/** The numerics name-pattern the census sweeps — a new organ matching this MUST register above. */
const NUMERICS_PATTERN =
  /^(sensorium-|spectral-|ffz-|null-harness|arl-dial|synthetic-drift|persistence-keel|worldline-clock|windowed-coupling|linearity-gate|mesh-coupl|self-coupling|te-hodge|transfer-entropy|change-point|gaussian-cmi|cmi-significance|fisher-rao|bures-metric|temporal-rigidity|subspace-track|clock-recovery|capture-reading|numerics|rank-te|rank-consensus)/;

describe("the TS↔py parity manifest (the L4 gate)", () => {
  test("CENSUS — every numerics module in mesh/src registers exactly once", () => {
    const swept = readdirSync(srcDir)
      .filter((f) => f.endsWith(".ts") && NUMERICS_PATTERN.test(f))
      .sort();
    const registered = MANIFEST.map((e) => e.ts).sort();
    // exactly-once: no duplicates in the manifest
    expect(new Set(registered).size).toBe(registered.length);
    // the sweep and the manifest name the same set — a new numerics organ fails here until it registers
    expect(swept).toEqual(registered);
  });

  test("EXISTENCE — every registered ts module and named py twin exists on disk", () => {
    for (const e of MANIFEST) {
      expect(existsSync(join(srcDir, e.ts)), `${e.ts} missing from mesh/src`).toBe(true);
      if (e.py !== null) {
        expect(existsSync(join(pyScripts, e.py)), `${e.py} missing from lararium-sensorium/scripts`).toBe(true);
      }
    }
  });

  test("WITNESS — every witnessed pair names >=1 fixture that exists and parses", () => {
    for (const e of MANIFEST.filter((x) => x.status === "witnessed")) {
      expect(e.fixtures.length, `${e.ts}: witnessed without a fixture`).toBeGreaterThanOrEqual(1);
      for (const f of e.fixtures) {
        const p = join(here, f);
        expect(existsSync(p), `${e.ts}: fixture ${f} missing`).toBe(true);
        expect(() => JSON.parse(readFileSync(p, "utf8")), `${e.ts}: fixture ${f} fails to parse`).not.toThrow();
      }
    }
  });

  test("HONESTY — every owed pair names its debt (a py twin or the RUN-ARC home) in its note", () => {
    for (const e of MANIFEST.filter((x) => x.status === "owed-fixture")) {
      expect(e.py, `${e.ts}: owed-fixture must name its py twin`).not.toBeNull();
    }
    for (const e of MANIFEST.filter((x) => x.status === "owed-py-twin")) {
      expect(e.note.includes("RUN-ARC"), `${e.ts}: owed-py-twin must name the RUN-ARC debt home`).toBe(true);
    }
  });
});
