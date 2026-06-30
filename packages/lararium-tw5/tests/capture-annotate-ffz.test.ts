/**
 * capture-annotate-ffz.test.ts — the FFZ rhythm goes LIVE on the capture path.
 *
 * Proves the live in-VM annotate (capture-annotate-vm) now threads the turn's captured wall-time
 * into buildPatch's CaptureContext, so `lar_ffz` — the FfzClock RHYTHMIC address (a PURE cached
 * projection) — stamps onto a work-memory drawer at BIRTH. Coarse bands (Arc/Theme) stamp from the
 * wall-time; fine bands (Beat/Measure) stay UNSTAMPED (no session-position source yet → the coarse
 * prefix only, never a fabricated phase). Absent a captured time ⇒ no `lar_ffz`, byte-identical.
 *
 * Two surfaces: the PURE annotate (unit) and the WHOLE capture engine end-to-end (integration —
 * a turn enqueued → flushed → the drawer carries lar_ffz). Node-side against the bootstrap grammar
 * (the query-derive-vm test pattern: the startup `$tw` wrapper only supplies Date.now()).
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

import { describe, test, expect } from "vitest";
import {
  ffzProject,
  makeCaptureEngine,
  type CaptureRecord,
  type CaptureReserve,
} from "@lararium/mesh";
import { captureAnnotate } from "../src/capture-annotate-vm.js";

// A fixed wall-time well inside the session epoch — 2026-06-29T00:00:00Z-ish, > 0.
const FIXED_TIME = 1_782_777_600_000;
const TURN = "Lares (Scryer): the map holds <<~ hud Aperture(10) OODA-HA(3) >> <<~ ward ! L-Prime >>";
const SRC = "claude__run-abc.jsonl";

describe("captureAnnotate — lar_ffz coarse bands stamp at capture (wall-time present)", () => {
  test("a captured time stamps lar_ffz = the pure ffzProject coarse prefix (no fabricated fine bands)", () => {
    const patch = captureAnnotate(TURN, SRC, undefined, FIXED_TIME);
    const expected = ffzProject({ capturedTime: FIXED_TIME, profile: "session" });
    expect(expected).not.toBeNull();
    expect(patch["lar_ffz"]).toBe(expected);
    // COARSE prefix only — `<profile>/<Theme>.<Arc>`: exactly two dot-bands, no fine Beat/Measure/Pulse.
    expect(String(patch["lar_ffz"])).toMatch(/^session\/\d+\.\d+$/);
    // The rest of the reading patch is unchanged (the harvest still lands).
    expect(patch["lar_surface"]).toBe("claude");
    expect(typeof patch["lar_band"]).toBe("string");
  });

  test("no captured time ⇒ NO lar_ffz (byte-identical to before the wire)", () => {
    const patch = captureAnnotate(TURN, SRC);
    expect(patch["lar_ffz"]).toBeUndefined();
    // every OTHER reading is identical to the timed call (lar_ffz is purely additive).
    const timed = captureAnnotate(TURN, SRC, undefined, FIXED_TIME);
    const { lar_ffz: _drop, ...timedRest } = timed;
    expect(patch).toEqual(timedRest);
  });
});

/** A minimal in-memory reserve — the WAL twin reduced to a no-op for the integration path. */
function fakeReserve(): CaptureReserve {
  return {
    append: async () => {},
    onOverflow: () => {},
    refill: () => [],
    onDeadLetter: () => {},
    replay: async () => [],
    compact: async () => {},
  };
}

describe("the FFZ rhythm is LIVE end-to-end through the capture engine", () => {
  test("a turn enqueued → flushed → the drawer carries lar_ffz (coarse) when the annotate stamps time", async () => {
    const filed: CaptureRecord[] = [];
    const engine = makeCaptureEngine({
      reserve: fakeReserve(),
      flush: async (batch) => { filed.push(...batch); return batch.length; },
      // The live wrapper supplies Date.now(); here a fixed time keeps the assertion deterministic.
      annotate: (turnText, sourceFile, branch) => captureAnnotate(turnText, sourceFile, branch, FIXED_TIME),
      gate: { depth: 1, maxWaitMs: 0, maxDepth: 8, maxRetries: 3, backoffBaseMs: 1, backoffMaxMs: 10 },
    });
    await engine.enqueue(TURN, SRC);
    await engine.tick(1); // crest immediately (depth gate = 1)
    engine.dispose();

    expect(filed).toHaveLength(1);
    const ffz = filed[0]!.metadata?.["lar_ffz"];
    expect(ffz).toBe(ffzProject({ capturedTime: FIXED_TIME, profile: "session" }));
    expect(String(ffz)).toMatch(/^session\/\d+\.\d+$/);
  });

  test("graceful omit: an annotate with no captured time → the drawer carries no lar_ffz", async () => {
    const filed: CaptureRecord[] = [];
    const engine = makeCaptureEngine({
      reserve: fakeReserve(),
      flush: async (batch) => { filed.push(...batch); return batch.length; },
      annotate: (turnText, sourceFile, branch) => captureAnnotate(turnText, sourceFile, branch),
      gate: { depth: 1, maxWaitMs: 0, maxDepth: 8, maxRetries: 3, backoffBaseMs: 1, backoffMaxMs: 10 },
    });
    await engine.enqueue(TURN, SRC);
    await engine.tick(1);
    engine.dispose();

    expect(filed).toHaveLength(1);
    expect(filed[0]!.metadata?.["lar_ffz"]).toBeUndefined();
  });
});
