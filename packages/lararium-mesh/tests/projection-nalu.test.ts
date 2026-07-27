/**
 * projection-nalu — the COALESCE-family gate (the DOM projection's gate, extracted). A burst of
 * marks within the window collapses to ONE flush; the newest snapshot wins, intermediates fade;
 * rev is monotone. Deterministic via the injected timer shore. (The accumulate sibling — CaptureNalu
 * — is covered in capture-engine.test.ts.)
 */

import { describe, expect, test } from "vitest";

import { CoalesceGate, KeyedCoalesceGate, CaptureNalu } from "../src/index.js";

type Fire = (() => void) | null;

/** A manual timer shore: capture the armed callback, fire it on demand. */
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

describe("KeyedCoalesceGate servo — the reconcile gate self-regulates (GROW under load)", () => {
  function servoHarness() {
    let clock = 0;
    let scheduled: (() => void) | null = null;
    let resolveFlush: (() => void) | null = null;
    const gate = new KeyedCoalesceGate<string>({
      debounceMs: 1000,
      servo: { targetMs: 1000, minMs: 200, maxMs: 8000 },
      now: () => clock,
      setTimer: (fn) => ((scheduled = fn), 1 as unknown as ReturnType<typeof setTimeout>),
      clearTimer: () => (scheduled = null),
      onFlush: () => new Promise<void>((res) => (resolveFlush = res)),
    });
    return {
      gate,
      fireTimer: () => scheduled?.(),
      advance: (ms: number) => (clock += ms),
      completeFlush: () => resolveFlush?.(),
      settle: async () => {
        for (let i = 0; i < 6; i++) await Promise.resolve();
      },
    };
  }

  test("a slow reconcile GROWS the debounce window (EWMA + AIMD)", async () => {
    const h = servoHarness();
    expect(h.gate.windowMs()).toBe(1000);
    h.gate.mark("A");
    h.fireTimer(); // debounce expires → reconcile scheduled
    await h.settle(); // let onFlush start (it runs a microtask after fire) → resolver armed
    h.advance(4000); // the reconcile costs 4 s (4× the set-point)
    h.completeFlush();
    await h.settle();
    // ewma = 0.2·4000 + 0.8·1000 = 1600; error +0.6 > 0.25 → ×1.5 → 1500 (the window breathes wider)
    expect(h.gate.windowMs()).toBe(1500);
  });

  test("self-clock: a mark while the key's reconcile drains rides the next wave (no overlap)", async () => {
    const h = servoHarness();
    h.gate.mark("A");
    h.fireTimer(); // A now in-flight (inflight.add is synchronous in fire())
    h.gate.mark("A"); // arrives mid-flush → coalesced as dirty, NOT a second overlapping reconcile
    expect(h.gate.pending()).toBe(0); // nothing armed while in-flight
    await h.settle(); // let onFlush start → resolver armed
    h.advance(500);
    h.completeFlush();
    await h.settle();
    expect(h.gate.pending()).toBe(1); // re-armed for the change that arrived during the flush
  });
});

// ── The auditTime progress-guarantee — pure debounce STARVES under an unbroken storm; the
//    maxWait cap fires at least every maxWaitMs, so the flush never freezes (livelock cure). ──
function makeReg() {
  let nextId = 1;
  const pending = new Map<number, () => void>();
  return {
    setTimer:   (fn: () => void) => { const id = nextId++; pending.set(id, fn); return id as unknown as ReturnType<typeof setTimeout>; },
    clearTimer: (h: ReturnType<typeof setTimeout>) => { pending.delete(h as unknown as number); },
    fireId:     (id: number) => { const fn = pending.get(id); if (fn) { pending.delete(id); fn(); } },
    ids:        () => [...pending.keys()],
    size:       () => pending.size,
  };
}

describe("KeyedCoalesceGate maxWait — the auditTime progress-guarantee", () => {
  test("a continuous storm fires via the maxWait cap (no starvation)", () => {
    const flushes: string[] = [];
    const reg = makeReg();
    const gate = new KeyedCoalesceGate<string>({
      debounceMs: 10, maxWaitMs: 50,
      onFlush: (k) => flushes.push(k),
      setTimer: reg.setTimer, clearTimer: reg.clearTimer,
    });

    gate.mark("a");                       // arms debounce (id 1) + the non-resetting maxWait (id 2)
    const maxId = reg.ids()[1]!;          // the maxWait cap
    for (let i = 0; i < 20; i++) gate.mark("a");   // the storm: each mark RESETS the debounce…
    expect(flushes).toEqual([]);          // …so pure debounce would never settle (starve)

    reg.fireId(maxId);                    // …but the maxWait cap fires regardless
    expect(flushes).toEqual(["a"]);       // progress guaranteed under unbroken load

    gate.mark("a");                       // a fresh storm re-arms a fresh cap (debounce + maxWait)
    expect(reg.size()).toBe(2);
  });

  test("when it settles quietly, the debounce wins and the cap leaves no double-fire", () => {
    const flushes: string[] = [];
    const reg = makeReg();
    const gate = new KeyedCoalesceGate<string>({
      debounceMs: 10, maxWaitMs: 50,
      onFlush: (k) => flushes.push(k),
      setTimer: reg.setTimer, clearTimer: reg.clearTimer,
    });

    gate.mark("b");
    const debId = reg.ids()[0]!;          // the debounce timer, armed first
    reg.fireId(debId);                    // it settles before the cap
    expect(flushes).toEqual(["b"]);
    expect(reg.size()).toBe(0);           // the cap was cleared with it — no orphan, no double-fire
  });

  test("absent maxWaitMs → pure debounce, unchanged (one timer per key)", () => {
    const reg = makeReg();
    const gate = new KeyedCoalesceGate<string>({
      debounceMs: 10, onFlush: () => {},
      setTimer: reg.setTimer, clearTimer: reg.clearTimer,
    });
    gate.mark("c");
    expect(reg.size()).toBe(1);           // no cap armed when maxWaitMs is absent
  });
});
