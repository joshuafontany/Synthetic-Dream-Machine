/**
 * repave-verdict — whether a finished re-pave may be trusted, read off counts rather than exit codes.
 *
 * ── WHY A GREEN EXIT IS NOT A VERDICT ───────────────────────────────────────────────────────────
 * Every leg of a re-pave can return 0 while the sensorium stays empty: a sweep that discovered no
 * sources exits clean, a bearing pass over zero drawers stamps nothing and reports success, and a
 * projection re-derived from an empty plane is honestly empty. The rite therefore asks for counts
 * against SOURCE counts before any instrument reads the result — because an instrument answering
 * over an unfed plane and one answering over a broken door look identical.
 *
 * ── THE THREE ENDINGS ───────────────────────────────────────────────────────────────────────────
 * LANDED   sources stood and drawers grew — the pass did its work.
 * EMPTY    no sources stood at all. Honest, and not a fault: a fresh machine has nothing to pour.
 * BARREN   sources stood and nothing landed. This is the one that must never read as success.
 *
 * A pass that landed FEWER drawers than it started with is not counted a win either: a re-pave that
 * shrinks the corpus has lost something the sources still hold.
 */
import { describe, it, expect } from "vitest";
import { repaveVerdict } from "../src/commands/harvest.js";

describe("repave-verdict — counts, against the sources they came from", () => {
  it("★ sources stood and nothing landed reads BARREN, never success ★", () => {
    const v = repaveVerdict({ sources: 1030, before: 0, after: 0 });
    expect(v.ok).toBe(false);
    expect(v.state).toBe("barren");
    expect(v.why).toMatch(/1,030/);         // grouped, because a person reads this at a glance
  });

  it("★ sources stood and drawers grew reads LANDED ★", () => {
    const v = repaveVerdict({ sources: 1030, before: 0, after: 40299 });
    expect(v.ok).toBe(true);
    expect(v.state).toBe("landed");
  });

  it("★ no sources at all is honest, not a fault ★", () => {
    // A fresh machine with no AI transcripts has nothing to pour, and must not be told it failed.
    const v = repaveVerdict({ sources: 0, before: 0, after: 0 });
    expect(v.ok).toBe(true);
    expect(v.state).toBe("empty");
  });

  it("★ a re-pave that SHRANK the corpus refuses ★", () => {
    // The sources still hold what the palace no longer does.
    const v = repaveVerdict({ sources: 1030, before: 40299, after: 12000 });
    expect(v.ok).toBe(false);
    expect(v.state).toBe("shrank");
    expect(v.why).toMatch(/40299|40,299/);
  });

  it("an idempotent re-run that landed nothing NEW still stands", () => {
    // Everything was already landed. The count did not move, and that is the verb working.
    const v = repaveVerdict({ sources: 1030, before: 40299, after: 40299 });
    expect(v.ok).toBe(true);
    expect(v.state).toBe("landed");
  });

  it("★ every verdict says enough to act on ★", () => {
    for (const args of [{ sources: 5, before: 0, after: 0 }, { sources: 0, before: 0, after: 0 },
                        { sources: 5, before: 9, after: 1 }, { sources: 5, before: 0, after: 9 }]) {
      expect(repaveVerdict(args).why.length).toBeGreaterThan(20);
    }
  });
});
