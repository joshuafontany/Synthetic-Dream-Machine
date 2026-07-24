/**
 * whiten_parity — the TS TWIN that generates the whitening (signed-innovation) parity fixture.
 *
 * The web3-only law keeps the two runtimes apart: this script runs the CANONICAL TS whitening
 * (signedInnovation + whitenChildren, the source of truth) over a deterministic corpus and EMITS a
 * data fixture (as-of-its-last-sync). The py twin's test (packages/lararium-sensorium/scripts/
 * test_predictive_coding_whiten.py) reads that fixture as plain data, runs its own signed_innovation,
 * and asserts the two agree element-for-element — fixtures-as-data across the causal-island, never a
 * live cross-runtime call. The TS generates; the py matches (no dual-live-without-a-fixture).
 *
 * DETERMINISTIC — a seeded mulberry32 PRNG, never a wall clock, so the corpus re-derives byte-stable.
 *
 * Regenerate (from the repo root):
 *   packages/lararium-mesh/node_modules/.bin/tsx packages/lararium-mesh/scripts/whiten_parity.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { signedInnovation, whitenChildren } from "../src/signed-innovation.js";
import { type ChildSignalMV } from "../src/mesh-coupling-mv.js";

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
  readonly alpha: number;
  readonly signal: number[][];
  readonly innovation: number[][];
}

function caseFrom(note: string, signal: number[][], alpha = 0.3): Case {
  return { note, alpha, signal, innovation: signedInnovation(signal, alpha) };
}

function buildCases(): Case[] {
  const rng = mulberry32(20260723);
  const cases: Case[] = [];

  // 1. THE EMPTY + SINGLE-FRAME edges — no history, the innovation opens at 0.
  cases.push(caseFrom("single-frame", [[3.7]]));
  cases.push(caseFrom("two-frame", [[1], [2]]));

  // 2. A RANDOM WALK (strongly autocorrelated) — collapses to its small white increments.
  const rw: number[][] = [[0]];
  for (let t = 1; t < 128; t++) rw.push([rw[t - 1]![0]! + (rng() - 0.5)]);
  cases.push(caseFrom("random-walk-1d", rw));

  // 3. WHITE NOISE — nothing to whiten, ~passes through.
  cases.push(caseFrom("white-noise-1d", Array.from({ length: 96 }, () => [rng() - 0.5])));

  // 4. A CLEAN SINUSOID — a predictable stream leaves a structured residual.
  cases.push(caseFrom("sinusoid-1d", Array.from({ length: 96 }, (_, i) => [Math.sin((2 * Math.PI * i) / 12)])));

  // 5. MULTIVARIATE — per-dimension reduction over a 3-wide signal, shape preserved.
  const mv: number[][] = [];
  for (let t = 0; t < 80; t++) {
    mv.push([Math.sin((2 * Math.PI * t) / 8), t * 0.1, rng() - 0.5]);
  }
  cases.push(caseFrom("multivariate-3d", mv));

  // 6. A NON-DEFAULT alpha — pins the smoothing coefficient carries through both twins.
  cases.push(
    caseFrom(
      "sinusoid-alpha-0.6",
      Array.from({ length: 64 }, (_, i) => [Math.cos((2 * Math.PI * i) / 10)]),
      0.6,
    ),
  );

  return cases;
}

/** The whitenChildren face — the same reduction over named children (name rides, signal whitens). */
function childrenCase(): {
  readonly note: string;
  readonly alpha: number;
  readonly children: { name: string; signal: number[][] }[];
  readonly whitened: { name: string; signal: readonly (readonly number[])[] }[];
} {
  const rng = mulberry32(424242);
  const who = Array.from({ length: 120 }, () => [rng() - 0.5]);
  const authority: number[][] = [[rng() - 0.5]];
  for (let t = 1; t < 120; t++) authority.push([who[t - 1]![0]! + 0.3 * (rng() - 0.5)]);
  const children = [
    { name: "who", signal: who },
    { name: "authority", signal: authority },
  ] as ChildSignalMV[];
  const whitened = whitenChildren(children, 0.3);
  return {
    note: "whitenChildren over two coupled children",
    alpha: 0.3,
    children: children.map((c) => ({ name: c.name, signal: c.signal as number[][] })),
    whitened: whitened.map((c) => ({ name: c.name, signal: c.signal })),
  };
}

function main(): void {
  const out = {
    oracle: "TS signedInnovation + whitenChildren (signed-innovation.ts)",
    defaults: { alpha: 0.3 },
    cases: buildCases(),
    children: childrenCase(),
  };
  const here = dirname(fileURLToPath(import.meta.url));
  const path = join(here, "..", "..", "lararium-sensorium", "scripts", "fixtures", "whiten-parity.json");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out, null, 2));
  // eslint-disable-next-line no-console
  console.log(`wrote ${path} — ${out.cases.length} cases + the children case`);
}

main();
