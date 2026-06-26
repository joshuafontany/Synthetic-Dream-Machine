/**
 * projection-nalu — the COALESCE-family gate (the DOM projection's gate, extracted). A burst of
 * marks within the window collapses to ONE flush; the newest snapshot wins, intermediates fade;
 * rev is monotone. Deterministic via the injected timer seam. (The accumulate sibling — CaptureNalu
 * — is covered in capture-engine.test.ts.)
 */

import { describe, expect, test } from "vitest";

import { CoalesceGate, KeyedCoalesceGate, CaptureNalu } from "../src/index.js";

type Fire = (() => void) | null;

/** A manual timer seam: capture the armed callback, fire it on demand. */
function manualGate(onFlush: (rev: number) => void) {
  let pending: Fire = null;
  let cleared = false;
  const gate = new CoalesceGate({
    windowMs:   10,
    onFlush,
    setTimer:   (fn) => { pending = fn; return 1 as unknown as ReturnType<typeof setTimeout>; },
    clearTimer: () => { cleared = true; },
  });
  return { gate, crest: () => pending?.(), wasCleared: () => cleared };
}

describe("CoalesceGate", () => {
  test("a burst of marks collapses to ONE flush (newest-wins), rev monotone across waves", () => {
    const flushes: number[] = [];
    const { gate, crest } = manualGate((rev) => flushes.push(rev));

    gate.mark(); gate.mark(); gate.mark();   // a burst within one window
    expect(flushes).toEqual([]);             // armed, not yet fired
    crest();
    expect(flushes).toEqual([1]);            // exactly one flush, rev 1

    gate.mark(); crest();                    // the next wave
    expect(flushes).toEqual([1, 2]);         // rev 2 — monotone
    expect(gate.revision()).toBe(2);
  });

  test("an idle crest (no mark since the last) does not flush", () => {
    const flushes: number[] = [];
    const { gate, crest } = manualGate((rev) => flushes.push(rev));

    gate.mark(); crest();
    expect(flushes).toEqual([1]);
    crest();                                  // window elapses again, but nothing moved
    expect(flushes).toEqual([1]);             // no spurious frame
  });

  test("dispose clears the armed flush — teardown drops the pending frame", () => {
    const flushes: number[] = [];
    const { gate, crest, wasCleared } = manualGate((rev) => flushes.push(rev));

    gate.mark();
    gate.dispose();
    expect(wasCleared()).toBe(true);
    crest();                                  // even if the timer leaked through, dirty was cleared
    expect(flushes).toEqual([]);              // no flush after dispose
  });
});

/** A manual timer registry: setTimer records the callback under a fresh id, clearTimer drops it. */
function manualRegistry() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  return {
    setTimer:   (fn: () => void) => { const id = nextId++; pending.set(id, fn); return id as unknown as ReturnType<typeof setTimeout>; },
    clearTimer: (h: ReturnType<typeof setTimeout>) => { pending.delete(h as unknown as number); },
    fireAll:    () => { [...pending.values()].forEach((fn) => fn()); },
    size:       () => pending.size,
  };
}

describe("KeyedCoalesceGate", () => {
  test("debounces per key — a burst on one key resets to ONE armed flush; keys stay independent", () => {
    const reg = manualRegistry();
    const flushes: string[] = [];
    const gate = new KeyedCoalesceGate<string>({
      debounceMs: 10, onFlush: (k) => flushes.push(k), setTimer: reg.setTimer, clearTimer: reg.clearTimer,
    });

    gate.mark("A"); gate.mark("A"); gate.mark("A");   // burst on A — debounce RESETS, never accumulates
    expect(reg.size()).toBe(1);                        // one live timer for A, not three
    expect(gate.pending()).toBe(1);
    gate.mark("B");                                    // independent key arms its own timer
    expect(gate.pending()).toBe(2);

    reg.fireAll();
    expect(flushes.sort()).toEqual(["A", "B"]);        // exactly one flush per key
    expect(gate.pending()).toBe(0);
  });

  test("dispose clears every armed flush", () => {
    const reg = manualRegistry();
    const flushes: string[] = [];
    const gate = new KeyedCoalesceGate<string>({
      debounceMs: 10, onFlush: (k) => flushes.push(k), setTimer: reg.setTimer, clearTimer: reg.clearTimer,
    });
    gate.mark("A"); gate.mark("B");
    expect(gate.pending()).toBe(2);
    gate.dispose();
    expect(gate.pending()).toBe(0);
  });
});

describe("ProjectionGate family discriminant", () => {
  test("the two coalesce engines tag coalesce; the accumulate engine tags accumulate", () => {
    expect(new CoalesceGate({ windowMs: 10, onFlush: () => {} }).family).toBe("coalesce");
    expect(new KeyedCoalesceGate<string>({ debounceMs: 10, onFlush: () => {} }).family).toBe("coalesce");
    expect(new CaptureNalu({ flush: async () => 0 }).family).toBe("accumulate");
  });
});
