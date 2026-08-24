/**
 * mine-retry — the shared retry-on-busy helper. A palace-lock BUSY signal WAITS+retries (the two
 * contending writers both complete, none throws); a NON-busy error throws straight through (the
 * caller's own durability owns it). Proves the concurrent-mine graceful path used by the daemon
 * flush (mineWithRetryAsync) and the per-spirit mine (mineWithRetry).
 */

import { describe, expect, test } from "vitest";

import {
  MINE_BUSY_REGEX,
  isMineAlreadyRunning,
  mineWithRetry,
  mineWithRetryAsync,
} from "../src/mine-retry.js";

/** A busy error shaped like execFileSync/execFileAsync's rejection (message on `.stderr`). */
function busyError(): Error & { stderr: string } {
  const e = new Error("Command failed") as Error & { stderr: string };
  e.stderr = "mempalace: LockHeldByOtherProcess (palace is held by PID 4242)";
  return e;
}

describe("isMineAlreadyRunning / MINE_BUSY_REGEX", () => {
  test("matches each busy spelling, rejects a real fault", () => {
    expect(isMineAlreadyRunning("MineAlreadyRunning")).toBe(true);
    expect(isMineAlreadyRunning("lock is held by PID 12")).toBe(true);
    expect(isMineAlreadyRunning("LockHeldByOtherProcess")).toBe(true);
    expect(isMineAlreadyRunning("PermissionError: chroma dir not writable")).toBe(false);
    expect(MINE_BUSY_REGEX.test("MineAlreadyRunning")).toBe(true);
  });
});

describe("mineWithRetryAsync — the daemon flush path", () => {
  test("a busy-then-free runner WAITS and succeeds (never throws on busy)", async () => {
    let calls = 0;
    const out = await mineWithRetryAsync(async () => {
      calls += 1;
      if (calls < 3) throw busyError(); // busy on the first two attempts
      return "Drawers filed: 1";
    });
    expect(out).toBe("Drawers filed: 1");
    expect(calls).toBe(3); // it waited through two busy signals
  });

  test("a NON-busy error throws straight through (no retry — WAL re-queue owns it)", async () => {
    let calls = 0;
    await expect(
      mineWithRetryAsync(async () => {
        calls += 1;
        throw new Error("disk full");
      }),
    ).rejects.toThrow("disk full");
    expect(calls).toBe(1); // not retried
  });

  test("a persistently-busy lock throws after maxAttempts (a wedged lock surfaces)", async () => {
    let calls = 0;
    const caught = await mineWithRetryAsync(() => { calls += 1; throw busyError(); }, 3)
      .then(() => null, (e: Error & { stderr?: string }) => e);
    expect(calls).toBe(3); // it exhausted the retries, then surfaced
    expect(caught?.stderr).toMatch(/LockHeldByOtherProcess/); // the busy fault rides out on .stderr
  });
});

describe("two contending mines through ONE lock (the graceful-concurrency proof)", () => {
  test("the second WAITS for the first; both complete, none throws on busy", async () => {
    let held = false;
    const done: string[] = [];
    const attempts: Record<string, number> = { a: 0, b: 0 };

    const mine = (id: "a" | "b") =>
      mineWithRetryAsync(async () => {
        attempts[id] += 1;
        if (held) throw busyError(); // the lock is taken → BUSY, must wait
        held = true;
        await new Promise((r) => setTimeout(r, 40)); // hold the lock through real work
        held = false;
        done.push(id);
        return `Drawers filed: 1 (${id})`;
      });

    const [ra, rb] = await Promise.all([mine("a"), mine("b")]);
    expect(ra).toContain("Drawers filed");
    expect(rb).toContain("Drawers filed");
    expect(done.sort()).toEqual(["a", "b"]); // both landed
    // One of the two contended and had to retry at least once (the WAIT, not a FAIL).
    expect(attempts.a + attempts.b).toBeGreaterThan(2);
  });
});

describe("mineWithRetry — the per-spirit sync path", () => {
  test("a busy-then-free sync runner WAITS and succeeds", () => {
    let calls = 0;
    const out = mineWithRetry(() => {
      calls += 1;
      if (calls < 2) throw busyError();
      return "Drawers filed: 3";
    });
    expect(out).toBe("Drawers filed: 3");
    expect(calls).toBe(2);
  });

  test("a real error still throws (→ the honest 'mine-failed')", () => {
    expect(() => mineWithRetry(() => { throw new Error("argparse rejected --foo"); })).toThrow(
      "argparse rejected",
    );
  });
});
