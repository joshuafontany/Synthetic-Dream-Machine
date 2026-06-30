/**
 * capture-annotate-ffz.test.ts — the FFZ rhythm on the capture path, MEMBERSHIP model.
 *
 * Proves the live in-VM annotate (capture-annotate-vm) stamps `lar_ffz` as a NESTED-
 * MEMBERSHIP CONTAINMENT PATH — NOT a wall-time projection (the prior Date.now() anchor
 * is removed). The FREE/factual cells: Arc = source_file (the session-island), Pulse =
 * the turn's CONTENT-ADDRESS (the inscription atom). Beat (the turn) is null-graceful at
 * this site — absent (porous). The fluid bands (Theme/Measure) are deferred to stage two.
 *
 * Two surfaces: the PURE annotate (unit) and the WHOLE capture engine end-to-end. Node-side
 * against the bootstrap grammar (the query-derive-vm test pattern). The annotate takes no
 * clock — there is no time argument any more.
 *
 * Meme: lar:///ha.ka.ba/@lararium/mesh/ffz-clock
 */

import { describe, test, expect } from "vitest";
import {
  ffzMembershipAddress,
  ffzCoDepth,
  fnv1a8,
  makeCaptureEngine,
  type CaptureRecord,
  type CaptureReserve,
} from "@lararium/mesh";
import { captureAnnotate } from "../src/capture-annotate-vm.js";

const TURN = "Lares (Scryer): the map holds <<~ hud Aperture(10) OODA-HA(3) >> <<~ ward ! L-Prime >>";
const SRC = "claude__run-abc.jsonl";

describe("captureAnnotate — lar_ffz stamps the membership path (Arc free + Pulse content-address)", () => {
  test("lar_ffz = Arc (source_file) + Pulse (turn content-address); no fabricated fine bands", () => {
    const patch = captureAnnotate(TURN, SRC);
    const expected = ffzMembershipAddress({ arc: "claude__run-abc", pulse: fnv1a8(TURN), profile: "session" });
    expect(patch["lar_ffz"]).toBe(expected);
    // The five-slot tuple: Theme/Measure/Beat porous ('_'), Arc + Pulse real.
    expect(String(patch["lar_ffz"])).toMatch(/^session\/_\.claude__run-abc\._\._\.[0-9a-f]{8}$/);
    // The rest of the reading patch is unchanged (the harvest still lands).
    expect(patch["lar_surface"]).toBe("claude");
    expect(typeof patch["lar_band"]).toBe("string");
  });

  test("Pulse is deterministic from the turn content; distinct turns get distinct Pulse cells", () => {
    const a = captureAnnotate(TURN, SRC);
    const b = captureAnnotate(TURN + " more", SRC);
    expect(a["lar_ffz"]).toBe(captureAnnotate(TURN, SRC)["lar_ffz"]); // deterministic
    expect(a["lar_ffz"]).not.toBe(b["lar_ffz"]); // distinct content → distinct Pulse
    // Same session (same source_file), different turns ⇒ share Arc, not the finer cell.
    expect(ffzCoDepth(String(a["lar_ffz"]), String(b["lar_ffz"]))).toBe(1);
  });

  test("no source_file ⇒ lar_ffz still stamps (Pulse only, Arc porous)", () => {
    const patch = captureAnnotate(TURN);
    expect(patch["lar_ffz"]).toBe(ffzMembershipAddress({ pulse: fnv1a8(TURN), profile: "session" }));
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
  test("a turn enqueued → flushed → the drawer carries the membership lar_ffz", async () => {
    const filed: CaptureRecord[] = [];
    const engine = makeCaptureEngine({
      reserve: fakeReserve(),
      flush: async (batch) => { filed.push(...batch); return batch.length; },
      annotate: (turnText, sourceFile, branch) => captureAnnotate(turnText, sourceFile, branch),
      gate: { depth: 1, maxWaitMs: 0, maxDepth: 8, maxRetries: 3, backoffBaseMs: 1, backoffMaxMs: 10 },
    });
    await engine.enqueue(TURN, SRC);
    await engine.tick(1); // crest immediately (depth gate = 1)
    engine.dispose();

    expect(filed).toHaveLength(1);
    const ffz = filed[0]!.metadata?.["lar_ffz"];
    expect(ffz).toBe(ffzMembershipAddress({ arc: "claude__run-abc", pulse: fnv1a8(TURN), profile: "session" }));
    expect(String(ffz)).toMatch(/^session\/_\.claude__run-abc\._\._\.[0-9a-f]{8}$/);
  });
});
