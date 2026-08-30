/**
 * verb-budget — how long the daemon waits on a verb, and whose word decides it.
 *
 * ── THE BUDGET THAT NEVER CROSSED ───────────────────────────────────────────────────────────────
 * The servo grows a wait from a verb's learned durations, and the caller's own budget was documented
 * as a floor beneath it — headroom for a caller that knows its pass runs long. The invocation on the
 * wire carried `{verb, args, requestedBy, requestId}` and nothing else, so the floor was the DAEMON's
 * default rather than the caller's ask.
 *
 * Measured: the bulk backfill asked for an hour, the client waited an hour, and the daemon cut the
 * pass at 120 seconds. Neither side was wrong about its own half.
 *
 * ── WHY A CEILING SURVIVES THE FIX ──────────────────────────────────────────────────────────────
 * A budget a caller can raise without limit is a hang a caller can request. The ceiling stays the
 * daemon's, so an honest long pass gets its headroom and a wedged one still dies.
 */
import { describe, it, expect } from "vitest";
import { verbBudgetMs, TIMEOUT_CEIL_MS } from "../src/mine-timeout.js";

describe("verb-budget — the caller's ask reaches the daemon, and the ceiling stays the daemon's", () => {
  it("★ a caller asking for MORE than the servo learned gets what it asked ★", () => {
    expect(verbBudgetMs({ asked: 900_000, adaptive: 120_000, floor: 30_000 })).toBe(900_000);
  });

  it("★ a caller asking for LESS never shortens the servo's own wait ★", () => {
    // The servo exists to give an honest long verb headroom; a caller's small default must not
    // undo that, which is what a plain override would do.
    expect(verbBudgetMs({ asked: 5_000, adaptive: 120_000, floor: 30_000 })).toBe(120_000);
  });

  it("★ no ask outruns the ceiling — an unbounded budget is a requestable hang ★", () => {
    expect(verbBudgetMs({ asked: Number.MAX_SAFE_INTEGER, adaptive: 120_000, floor: 30_000 }))
      .toBe(TIMEOUT_CEIL_MS);
  });

  it("an absent ask falls to the daemon's own floor against the servo", () => {
    expect(verbBudgetMs({ adaptive: 90_000, floor: 30_000 })).toBe(90_000);
    expect(verbBudgetMs({ adaptive: 10_000, floor: 30_000 })).toBe(30_000);
  });

  it("★ a nonsense ask is ignored rather than obeyed ★", () => {
    // The ask arrives over a wire and is not this process's to trust.
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(verbBudgetMs({ asked: bad, adaptive: 120_000, floor: 30_000 })).toBe(120_000);
    }
  });
});
