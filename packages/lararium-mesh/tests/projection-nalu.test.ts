/**
 * projection-nalu — the COALESCE-family gate (the DOM projection's gate, extracted). A burst of
 * marks within the window collapses to ONE flush; the newest snapshot wins, intermediates fade;
 * rev is monotone. Deterministic via the injected timer seam. (The accumulate sibling — CaptureNalu
 * — is covered in capture-engine.test.ts.)
 */

import { describe, expect, test } from "vitest";

import { CoalesceGate } from "../src/index.js";

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
