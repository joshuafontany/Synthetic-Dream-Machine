/**
 * subspace-parity — the TS↔Python corpus cap (null-calibration). Reads a committed fixture (data, as-of the
 * oracle's last sync) that the offline scipy oracle (scripts/spectral_parity.py, behind the causal-island)
 * produced, and asserts the TS `principalAngles` hand-roll matches scipy.linalg.subspace_angles across the
 * cases. No Python runs here — the crossing carries DATA, never a live call (web3-only law). Subspace-distance
 * parity (angles), never a trajectory or an RNG seed. Regenerate the fixture with:
 *   ./.venv/bin/python packages/lararium-mesh/scripts/spectral_parity.py
 */
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { principalAngles } from "../src/subspace-track.js";

interface ParityCase {
  readonly note: string;
  readonly A: number[][];
  readonly B: number[][];
  readonly anglesRad: number[];
}
const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "fixtures", "subspace-angles-parity.json"), "utf8")) as {
  readonly cases: ParityCase[];
};

describe("subspace-parity — TS principalAngles matches the scipy oracle (TS↔Python corpus cap)", () => {
  test(`principal angles agree with scipy.linalg.subspace_angles across ${fixture.cases.length} cases`, () => {
    for (const c of fixture.cases) {
      const ts = principalAngles(c.A, c.B); // ascending radians
      expect(ts.length).toBe(c.anglesRad.length);
      for (let i = 0; i < ts.length; i++) {
        expect(ts[i]).toBeCloseTo(c.anglesRad[i]!, 5); // subspace-distance parity, an independent impl agrees
      }
    }
  });
});
