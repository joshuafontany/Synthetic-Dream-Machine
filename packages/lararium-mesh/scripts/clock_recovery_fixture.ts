/**
 * clock_recovery_fixture — the TS TWIN that generates the clock-recovery parity fixture.
 *
 * The web3-only law keeps the two runtimes apart: this script runs the CANONICAL TS clock-recovery
 * (recoverClock + dominantPeriod, the source of truth) over a deterministic corpus and EMITS a data
 * fixture (as-of-its-last-sync). The py port test (packages/lararium-sensorium/scripts/
 * test_ffz_clock.py) reads that fixture as plain data, runs its own recover_clock, and asserts the
 * two agree — fixtures-as-data across the causal-island, never a live cross-runtime call. The TS
 * generates; the py matches (no dual-live-without-a-fixture).
 *
 * DETERMINISTIC — a seeded mulberry32 PRNG, never a wall clock, so the corpus re-derives byte-stable.
 *
 * Regenerate (from the repo root):
 *   packages/lararium-mesh/node_modules/.bin/tsx packages/lararium-mesh/scripts/clock_recovery_fixture.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { recoverClock } from "../src/clock-recovery.js";
import { dominantPeriod } from "../src/temporal-rigidity.js";

/** A tiny deterministic PRNG (mulberry32) — reproducible synthetic signals, no wall clock. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Case {
  readonly note: string;
  readonly signal: number[];
  readonly dominant: { period: number; lockQuality: number };
  readonly recovery: {
    beat: number;
    lockQuality: number;
    locked: boolean;
    holdover: boolean;
    bands: { name: string; period: number; resolved: boolean }[];
  };
}

function caseFrom(note: string, signal: number[]): Case {
  const dp = dominantPeriod(signal);
  const rc = recoverClock({ signal });
  return {
    note,
    signal,
    dominant: { period: dp.period, lockQuality: dp.lockQuality },
    recovery: {
      beat: rc.beat,
      lockQuality: rc.lockQuality,
      locked: rc.locked,
      holdover: rc.holdover,
      bands: rc.bands.map((b) => ({ name: b.name, period: b.period, resolved: b.resolved })),
    },
  };
}

function buildCases(): Case[] {
  const rng = mulberry32(20260704);
  const cases: Case[] = [];

  // 1. THE STATIC-CORPUS NULL — no temporal transitions, only structural cadence. Must recover NO beat.
  cases.push(caseFrom("static-flat", Array.from({ length: 64 }, () => 1)));
  cases.push(caseFrom("static-ramp", Array.from({ length: 64 }, (_, i) => i))); // monotone: no local max
  // a "structural" repeat that carries NO temporal rhythm signal (constant blocks) still reads via ac —
  // included to pin the port on a structural-cadence input, whatever the TS canon reports.
  cases.push(caseFrom("static-blocks", Array.from({ length: 64 }, (_, i) => (Math.floor(i / 16) % 2))));

  // 2. RHYTHMIC LOCK — clean sinusoids at known periods; must lock strongly + emit nested bands.
  for (const period of [8, 12, 16]) {
    const sig = Array.from({ length: 96 }, (_, i) => Math.sin((2 * Math.PI * i) / period));
    cases.push(caseFrom(`rhythmic-p${period}`, sig));
  }
  // a rhythm riding a little noise (still locks)
  cases.push(
    caseFrom(
      "rhythmic-noisy",
      Array.from({ length: 96 }, (_, i) => Math.sin((2 * Math.PI * i) / 10) + 0.15 * (rng() - 0.5)),
    ),
  );

  // 3. HOLDOVER — weak/absent periodicity: pure noise (below the lock threshold → holdover).
  cases.push(caseFrom("noise-holdover", Array.from({ length: 64 }, () => rng() - 0.5)));
  cases.push(caseFrom("short-holdover", Array.from({ length: 5 }, () => rng()))); // too short to lock

  // 4. RANDOM numeric stress — deterministic mixed signals to exercise the autocorrelation path.
  for (let k = 0; k < 4; k++) {
    const n = 40 + k * 13;
    const p = 6 + k * 2;
    const sig = Array.from({ length: n }, (_, i) => Math.cos((2 * Math.PI * i) / p) + 0.4 * (rng() - 0.5));
    cases.push(caseFrom(`mixed-${k}`, sig));
  }

  return cases;
}

function main(): void {
  const out = {
    oracle: "TS recoverClock + dominantPeriod (clock-recovery.ts / temporal-rigidity.ts)",
    defaults: { nBands: 5, nestRatio: 2, lockThreshold: 0.3 },
    cases: buildCases(),
  };
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "..", "..", "lararium-sensorium", "scripts", "fixtures", "clock-recovery-parity.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out, null, 2));
  // eslint-disable-next-line no-console
  console.log(`wrote ${path} — ${out.cases.length} cases`);
}

main();
