/**
 * mine-timeout — the self-tuning subprocess-timeout servo (modeled on the nalu-gate feedback servo,
 * INVERTED: a timeout GROWS under load, SHRINKS as mines speed up). Proves: the EWMA adaptation
 * (slow durations grow the timeout, fast shrink), the FLOOR/CEIL clamp, the minSamples cold-start
 * default; the kill-on-hang (a real never-returning subprocess is KILLED and surfaces as a hang,
 * never blocks forever); and the BUSY-vs-HANG composition (a busy lock WAITS+retries, a hang takes
 * the distinct kill path).
 */

import { execFileSync } from "node:child_process";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  adaptiveTimeoutMs,
  recordMineDuration,
  resetMineTimeouts,
  timeoutState,
  isMineHang,
  MineHangError,
  TIMEOUT_DEFAULT_MS,
  TIMEOUT_FIRST_RUN_MS,
  TIMEOUT_FLOOR_MS,
  TIMEOUT_CEIL_MS,
  TIMEOUT_K,
  TIMEOUT_MIN_SAMPLES,
  timeMine,
} from "../src/mine-timeout.js";
import { mineWithServo } from "../src/mine-retry.js";

beforeEach(() => resetMineTimeouts());
afterEach(() => resetMineTimeouts());

/** An execFileSync/execFileAsync busy rejection (message rides `.stderr`). */
function busyError(): Error & { stderr: string } {
  const e = new Error("Command failed") as Error & { stderr: string };
  e.stderr = "mempalace: LockHeldByOtherProcess (palace is held by PID 4242)";
  return e;
}

/** A synthetic timeout-kill error shaped like Node's actual fields (probed 2026-06-28). */
function hangError(): Error & { code: string; signal: string; status: null } {
  return Object.assign(new Error("spawnSync ETIMEDOUT"), {
    code: "ETIMEDOUT",
    signal: "SIGKILL",
    status: null,
  }) as Error & { code: string; signal: string; status: null };
}

describe("the EWMA servo — adaptiveTimeoutMs / recordMineDuration", () => {
  test("the FIRST run on a key (zero observations) rides the cold-load exemption, not the 30 s default", () => {
    // A cold chroma + embedding-model load legitimately exceeds 30 s — the very first
    // mine must never false-kill on the default.
    expect(adaptiveTimeoutMs("virgin")).toBe(TIMEOUT_FIRST_RUN_MS);
    expect(TIMEOUT_FIRST_RUN_MS).toBeGreaterThan(TIMEOUT_DEFAULT_MS);
    // One completion ends the exemption — the default takes over until minSamples.
    recordMineDuration("virgin", 5_000);
    expect(adaptiveTimeoutMs("virgin")).toBe(TIMEOUT_DEFAULT_MS);
  });

  test("cold start (1 ≤ samples < minSamples) holds the sane default", () => {
    recordMineDuration("k", 5_000);
    recordMineDuration("k", 5_000); // still only 2 samples (< minSamples=3)
    expect(TIMEOUT_MIN_SAMPLES).toBe(3);
    expect(adaptiveTimeoutMs("k")).toBe(TIMEOUT_DEFAULT_MS);
  });

  test("once warmed, timeout = clamp(K · ewma, FLOOR, CEIL)", () => {
    // three equal samples → ewma == 10_000 → K·ewma == 40_000, inside the band.
    for (let i = 0; i < 3; i++) recordMineDuration("k", 10_000);
    expect(timeoutState("k")?.samples).toBe(3);
    expect(timeoutState("k")?.ewmaMs).toBeCloseTo(10_000, 5);
    expect(adaptiveTimeoutMs("k")).toBe(TIMEOUT_K * 10_000);
  });

  test("the timeout GROWS as observed durations rise (headroom under load)", () => {
    for (let i = 0; i < 3; i++) recordMineDuration("slow", 8_000);
    const before = adaptiveTimeoutMs("slow");
    for (let i = 0; i < 8; i++) recordMineDuration("slow", 40_000); // load climbs
    expect(adaptiveTimeoutMs("slow")).toBeGreaterThan(before);
  });

  test("the timeout SHRINKS as observed durations fall (catch a hang sooner)", () => {
    for (let i = 0; i < 3; i++) recordMineDuration("fast", 40_000);
    const before = adaptiveTimeoutMs("fast");
    for (let i = 0; i < 8; i++) recordMineDuration("fast", 5_000); // mines speed up
    expect(adaptiveTimeoutMs("fast")).toBeLessThan(before);
  });

  test("the FLOOR clamps tiny durations — never false-kill a quick-but-occasionally-slow mine", () => {
    for (let i = 0; i < 5; i++) recordMineDuration("tiny", 100); // K·100 = 400ms, below the floor
    expect(adaptiveTimeoutMs("tiny")).toBe(TIMEOUT_FLOOR_MS);
  });

  test("the CEIL clamps huge durations — a hang still dies ≤ CEIL, never 9 h", () => {
    for (let i = 0; i < 5; i++) recordMineDuration("huge", 5_000_000); // K·that ≫ ceil
    expect(adaptiveTimeoutMs("huge")).toBe(TIMEOUT_CEIL_MS);
  });

  test("a bad clock reading never corrupts the servo", () => {
    recordMineDuration("k", Number.NaN);
    recordMineDuration("k", -50);
    expect(timeoutState("k")).toBeUndefined();
  });

  test("timeMine hands the adaptive timeout to the thunk and records only on completion", () => {
    for (let i = 0; i < 3; i++) recordMineDuration("tm", 6_000);
    const expected = adaptiveTimeoutMs("tm");
    let seen = -1;
    const r = timeMine("tm", (t) => {
      seen = t;
      return "ok";
    });
    expect(r).toBe("ok");
    expect(seen).toBe(expected); // the servo's value flowed into the subprocess timeout
    expect(timeoutState("tm")?.samples).toBe(4); // the completion taught the EWMA

    // a throw skips the record — a hang/fault never poisons the EWMA toward the ceiling.
    expect(() => timeMine("tm", () => { throw hangError(); })).toThrow();
    expect(timeoutState("tm")?.samples).toBe(4);
  });
});

describe("isMineHang — a timeout-kill, distinct from busy / a real exit", () => {
  test("classifies a kill (ETIMEDOUT / SIGKILL / killed) as a hang", () => {
    expect(isMineHang(hangError())).toBe(true); // sync shape: ETIMEDOUT + SIGKILL
    expect(isMineHang({ killed: true, signal: "SIGKILL" })).toBe(true); // async shape
  });

  test("an EXTERNAL SIGTERM reads as a CLEAN shutdown, never a hang (our kill only speaks SIGKILL)", () => {
    expect(isMineHang({ signal: "SIGTERM" })).toBe(false); // a system/service stop reaping children
    expect(isMineHang({ killed: true, signal: "SIGTERM" })).toBe(false); // even a parent-initiated graceful stop
  });

  test("a BUSY lock and a real non-zero exit are NOT hangs", () => {
    expect(isMineHang(busyError())).toBe(false);
    expect(isMineHang({ status: 3, signal: null })).toBe(false);
    expect(isMineHang(new Error("disk full"))).toBe(false);
  });
});

describe("kill-on-hang (real subprocess) — a never-returning mine dies, never blocks forever", () => {
  test("a wedged subprocess is KILLED at its timeout and surfaces as MineHangError", () => {
    const t0 = Date.now();
    // the thunk ignores the servo's (15 s floor) value and uses a 200 ms timeout so the test is
    // fast; the kill + classification + surfacing path is identical. maxHangRetries:0 → one shot.
    const err = (() => {
      try {
        mineWithServo(
          "real-hang",
          () =>
            execFileSync("node", ["-e", "setInterval(()=>{},1000)"], {
              timeout: 200,
              killSignal: "SIGKILL",
              encoding: "utf8",
            }),
          { maxHangRetries: 0 },
        );
        return null;
      } catch (e) {
        return e;
      }
    })();
    const elapsed = Date.now() - t0;
    expect(err).toBeInstanceOf(MineHangError);
    expect((err as MineHangError).pathKey).toBe("real-hang");
    expect(elapsed).toBeLessThan(5_000); // it died fast — never the 9 h block
  });
});

describe("BUSY-vs-HANG composition through mineWithServo", () => {
  test("a BUSY lock WAITS+retries (the YIN retry path), then succeeds", () => {
    let calls = 0;
    const out = mineWithServo("busy", () => {
      calls += 1;
      if (calls < 3) throw busyError();
      return "Drawers filed: 1";
    });
    expect(out).toBe("Drawers filed: 1");
    expect(calls).toBe(3); // it waited through two busy signals
  });

  test("a HANG takes the DISTINCT kill path — at most one retry, then MineHangError", () => {
    let calls = 0;
    let caught: unknown;
    try {
      mineWithServo("hang", () => {
        calls += 1;
        throw hangError(); // always a hang
      });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MineHangError);
    expect(calls).toBe(2); // 1 attempt + exactly 1 hang retry (NOT the busy maxAttempts=5)
  });

  test("a non-busy, non-hang fault throws straight through (no retry — durability owns it)", () => {
    let calls = 0;
    expect(() =>
      mineWithServo("fault", () => {
        calls += 1;
        throw new Error("argparse rejected --foo");
      }),
    ).toThrow("argparse rejected");
    expect(calls).toBe(1);
  });
});
