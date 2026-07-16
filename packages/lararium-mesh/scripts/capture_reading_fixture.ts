/**
 * capture_reading_fixture — the TS TWIN that generates the capture-reading parity fixture.
 *
 * The canonical TS capture-reading (concentration + captureReading over the 1Hive convex
 * curve) runs a deterministic case table and EMITS a data fixture; the py port test
 * (packages/lararium-sensorium/scripts/test_capture_reading.py) reads it as plain data,
 * runs its own reading, and asserts agreement — fixtures-as-data across the causal-island,
 * never a live cross-runtime call. The TS generates; the py matches.
 *
 * The curve blows up to Infinity at r >= beta, and JSON carries no Infinity — the fixture
 * encodes that pole as the string "Infinity", and both consumers decode it the same way.
 *
 * Regenerate (from the repo root):
 *   packages/lararium-mesh/node_modules/.bin/tsx packages/lararium-mesh/scripts/capture_reading_fixture.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { concentration, captureReading, type CaptureDials } from "../src/capture-reading.js";
import type { CabalPlaceMaintenanceProvenance, MaintainerStanding } from "../src/cabal-place-clock.js";

/** A minimal provenance carrying only what the reading consumes — maintainers' epochs. */
function clockOf(epochs: readonly number[]): CabalPlaceMaintenanceProvenance {
  const maintainers = epochs
    .map((epoch, i): MaintainerStanding => ({ keyHash: `k${i}`, epoch } as MaintainerStanding))
    .sort((a, b) => b.epoch - a.epoch);
  const effectiveEpoch = maintainers.length ? maintainers[0].epoch : 0;
  const trailingEpoch = maintainers.length ? maintainers[maintainers.length - 1].epoch : 0;
  return {
    maintainers,
    maintainerCount: maintainers.length,
    effectiveEpoch,
    trailingEpoch,
    spread: effectiveEpoch - trailingEpoch,
    leadingCount: maintainers.filter((m) => m.epoch === effectiveEpoch).length,
  } as CabalPlaceMaintenanceProvenance;
}

const DIALS: CaptureDials = { beta: 0.8, rho: 0.05, supply: 1000, alpha: 0.9 };

const CASES = [
  { note: "unfed place reads 0", epochs: [] as number[] },
  { note: "one hand holds it all — r = 1, at ceiling", epochs: [7] },
  { note: "even split — r = 1/3", epochs: [4, 4, 4] },
  { note: "visible capture shape — one leader", epochs: [12, 2, 1, 1] },
  { note: "broad co-maintenance", epochs: [5, 4, 4, 3, 3, 2] },
  { note: "just under the ceiling", epochs: [79, 21] },
  { note: "exactly at the ceiling — the pole", epochs: [8, 2] },
];

const cases = CASES.map(({ note, epochs }) => {
  const clock = clockOf(epochs);
  const r = concentration(clock);
  const reading = captureReading(clock, DIALS);
  return {
    note,
    epochs,
    dials: DIALS,
    concentration: r,
    reading: {
      concentration: reading.concentration,
      ceiling: reading.ceiling,
      headroom: reading.headroom,
      curve_bar: Number.isFinite(reading.curveBar) ? reading.curveBar : "Infinity",
      at_ceiling: reading.atCeiling,
    },
  };
});

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../lararium-sensorium/scripts/fixtures/capture-reading-parity.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generator: "capture_reading_fixture.ts", cases }, null, 2) + "\n");
console.log(`wrote ${cases.length} cases -> ${out}`);
