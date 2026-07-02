/**
 * capture-drain — the trailing-watermark invariant: the watermark advances ONLY from committed
 * turns (never from stage), a gap blocks it, backlog surfaces a stall honestly, replay-above-
 * watermark + idempotent key = effectively-once. The pure cure for the 7030→219 capture leak.
 */
import { describe, test, expect } from "vitest";
import {
  emptyDrain, stage, commit, watermark, backlog, reclaimable, replaySet, exactlyOnceAudit,
} from "../src/index.js";

const e = (seq: number) => ({ seq, key: `k${seq}` });

describe("capture-drain — the trailing watermark (advance AFTER commit)", () => {
  test("staging NEVER advances the watermark — this is the leak's cure", () => {
    let l = emptyDrain();
    for (let s = 1; s <= 7; s++) l = stage(l, e(s));   // 7 turns staged, none committed
    expect(watermark(l)).toBe(0);                        // NOT 7 — nothing landed, nothing passed
    expect(backlog(l)).toEqual([1, 2, 3, 4, 5, 6, 7]);   // the honest pressure signal
  });

  test("the watermark walks the contiguous committed frontier", () => {
    let l = emptyDrain();
    for (let s = 1; s <= 5; s++) l = stage(l, e(s));
    l = commit(l, 1); l = commit(l, 2); l = commit(l, 3);
    expect(watermark(l)).toBe(3);
    expect(backlog(l)).toEqual([4, 5]);
  });

  test("a GAP blocks the watermark — never leaps an un-landed turn", () => {
    let l = emptyDrain();
    for (let s = 1; s <= 5; s++) l = stage(l, e(s));
    l = commit(l, 1); l = commit(l, 2); /* 3 NOT committed */ l = commit(l, 4); l = commit(l, 5);
    expect(watermark(l)).toBe(2);                        // stuck at 2 — the gap at 3 blocks 4,5
    expect(backlog(l)).toEqual([3]);                     // 3 is the honest pending turn
  });

  test("committing the gap advances the watermark past all now-contiguous", () => {
    let l = emptyDrain();
    for (let s = 1; s <= 5; s++) l = stage(l, e(s));
    [1, 2, 4, 5].forEach((s) => { l = commit(l, s); });
    expect(watermark(l)).toBe(2);
    l = commit(l, 3);                                    // fill the gap
    expect(watermark(l)).toBe(5);                        // now 1..5 contiguous
    expect(backlog(l)).toEqual([]);
  });
});

describe("capture-drain — reclaim couples to landings; replay is idempotent", () => {
  test("reclaimable = keys at/below the watermark only (stalled store stops reclaiming)", () => {
    let l = emptyDrain();
    for (let s = 1; s <= 5; s++) l = stage(l, e(s));
    l = commit(l, 1); l = commit(l, 2);
    expect(reclaimable(l).sort()).toEqual(["k1", "k2"]); // only the landed ones truncate from the WAL
    // the store stalls: 3,4,5 stay staged, watermark holds at 2, WAL keeps them (bounded, visible)
    expect(reclaimable(l)).not.toContain("k3");
  });

  test("replaySet = staged ABOVE the watermark (the crash-recovery re-run)", () => {
    let l = emptyDrain();
    for (let s = 1; s <= 5; s++) l = stage(l, e(s));
    l = commit(l, 1); l = commit(l, 2);
    expect(replaySet(l)).toEqual([e(3), e(4), e(5)]);    // re-run these; content-hash upsert = no-op if already landed
  });
});

describe("capture-drain — idempotency + honesty guards", () => {
  test("stage + commit are idempotent on seq", () => {
    let l = stage(emptyDrain(), e(1));
    l = stage(l, e(1));                                   // no-op
    l = commit(l, 1); l = commit(l, 1);                  // no-op
    expect(watermark(l)).toBe(1);
    expect(l.staged.size).toBe(1);
    expect(l.committed.size).toBe(1);
  });

  test("re-staging a seq with a DIFFERENT key throws (catches mis-keyed replay)", () => {
    const l = stage(emptyDrain(), { seq: 1, key: "kA" });
    expect(() => stage(l, { seq: 1, key: "kB" })).toThrow(/different key/);
  });

  test("committing an un-staged seq throws (the store can't confirm what never arrived)", () => {
    expect(() => commit(emptyDrain(), 1)).toThrow(/un-staged/);
  });

  test("transitions are immutable — the prior ledger never mutates", () => {
    const l0 = stage(emptyDrain(), e(1));
    commit(l0, 1);
    expect(l0.committed.size).toBe(0);                    // l0 unchanged
  });

  test("exactly-once audit: each committed seq carries a distinct key (Landauer — one erasure per land)", () => {
    let l = emptyDrain();
    for (let s = 1; s <= 3; s++) l = commit(stage(l, e(s)), s);
    expect(exactlyOnceAudit(l)).toEqual({ committed: 3, distinctKeys: 3, ok: true, duplicates: [] });
  });

  test("a DUPLICATE land (one content-key committed under two seqs) fails the audit", () => {
    // two seqs sharing a content-key, BOTH committed = one license erased twice = a real duplicate.
    let l = stage(emptyDrain(), { seq: 1, key: "dup" });
    l = stage(l, { seq: 2, key: "dup" });
    l = commit(commit(l, 1), 2);
    const audit = exactlyOnceAudit(l);
    expect(audit.ok).toBe(false);
    expect(audit.committed).toBe(2);
    expect(audit.distinctKeys).toBe(1);
    expect(audit.duplicates).toEqual(["dup"]);
  });
});
