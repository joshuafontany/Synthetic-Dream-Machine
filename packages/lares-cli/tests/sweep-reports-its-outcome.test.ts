/**
 * sweep — a daemon refusal must not read as an empty success.
 *
 * ── THE SILENCE THAT LOOKED LIKE A RESULT ───────────────────────────────────────────────────────
 * A verb outcome carries a `status`, and the payload sits under the verb-result key. Reading
 * `.results` directly skips both: a refused invocation has no payload, so the reader falls to `{}`
 * and renders `ok: true` over it. Measured on the bulk backfill — the daemon's adaptive budget cut
 * the pass, and the door printed `{"ok":true,"result":{}}`.
 *
 * The two failures then look identical from outside: a pass that landed nothing because everything
 * was already landed, and a pass that never ran. One is the idempotent no-op this verb is built for;
 * the other is work the operator still owes.
 *
 * So the outcome reader is asserted here rather than the landing — what a sweep DOES is the daemon's
 * to prove, what it SAYS is this door's.
 */
import { describe, it, expect } from "vitest";
import { readVerbOutcome } from "../src/verb-result.js";
import type { SubmitResult } from "../src/verb-result.js";
import { VERB_RESULT_KEY } from "@lararium/mesh";

const done = (output: Record<string, unknown>): SubmitResult =>
  ({ status: "done", results: { [VERB_RESULT_KEY]: { ok: true, output } }, requestId: "r" });

describe("verb outcome — refusals stay refusals", () => {
  it("★ a timed-out verb reads as a REFUSAL, never an empty result ★", () => {
    const r = readVerbOutcome({ status: "error", errorMessage: "verb \"sweep\" timed out after 120000ms (adaptive)", requestId: "r" });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/timed out/);
    expect(r.output).toEqual({});
  });

  it("★ a done verb hands back the payload under the verb-result key ★", () => {
    const r = readVerbOutcome(done({ landed: 2723, skipped: 4, sessions: 1 }));
    expect(r.ok).toBe(true);
    expect(r.output["landed"]).toBe(2723);
  });

  it("★ a DONE verb that landed nothing stays ok — the idempotent no-op is not a fault ★", () => {
    // The distinction the empty render destroyed: nothing to do, versus never ran.
    const r = readVerbOutcome(done({ landed: 0, skipped: 0, sessions: 0 }));
    expect(r.ok).toBe(true);
    expect(r.error).toBe(null);
  });

  it("a done verb with no payload at all still reads ok, with an empty output", () => {
    expect(readVerbOutcome({ status: "done", requestId: "r" })).toEqual({ ok: true, output: {}, error: null });
  });

  it("★ an error with no message still names itself — a refusal never renders blank ★", () => {
    const r = readVerbOutcome({ status: "error", requestId: "r" });
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe("string");
    expect((r.error ?? "").length).toBeGreaterThan(0);
  });
});
