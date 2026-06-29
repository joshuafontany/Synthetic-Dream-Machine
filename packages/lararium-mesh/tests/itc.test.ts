/**
 * itc — Interval Tree Clocks (Almeida/Baquero/Fonte 2008): fork = spawn · event = inject ·
 * join = handback. The worldline's CONCURRENT-CAPABLE causal carrier (the PATH-B cut: causal
 * rides ITC, the FfzClock stays rhythmic). Concurrency is first-class — siblings with no join
 * between them read "concurrent".
 *
 * Meme: lar:///ha.ka.ba/@lararium/api/agent-worldline#time
 */

import { describe, test, expect } from "vitest";
import {
  itcSeed,
  itcFork,
  itcEvent,
  itcJoin,
  itcLeq,
  itcCompare,
} from "../src/index.js";

describe("itcFork — spawn splits the id, both inherit the shared history", () => {
  test("right after a fork the two stamps are causally EQUAL (shared history)", () => {
    const [a, b] = itcFork(itcSeed());
    expect(itcCompare(a, b)).toBe("equal");
    // the id space is disjoint — they can now diverge independently
    expect(a.id).not.toEqual(b.id);
  });

  test("fork → each events independently → CONCURRENT (the lightcone elsewhere)", () => {
    const [a0, b0] = itcFork(itcSeed());
    const a = itcEvent(a0);
    const b = itcEvent(b0);
    expect(itcCompare(a, b)).toBe("concurrent");
    expect(itcCompare(b, a)).toBe("concurrent");
    expect(itcLeq(a, b)).toBe(false);
    expect(itcLeq(b, a)).toBe(false);
  });
});

describe("itcEvent — inject advances history (FULL ticks, the D-cut)", () => {
  test("an event strictly advances: parent BEFORE its evented self", () => {
    const s = itcSeed();
    const s1 = itcEvent(s);
    expect(itcCompare(s, s1)).toBe("before");
    expect(itcCompare(s1, s)).toBe("after");
    expect(itcLeq(s, s1)).toBe(true);
    expect(itcLeq(s1, s)).toBe(false);
  });

  test("EVERY injection is an event — repeated events keep advancing", () => {
    const s = itcSeed();
    const s1 = itcEvent(s);
    const s2 = itcEvent(s1);
    const s3 = itcEvent(s2);
    expect(itcCompare(s1, s2)).toBe("before");
    expect(itcCompare(s2, s3)).toBe("before");
    expect(itcCompare(s1, s3)).toBe("before");
  });
});

describe("itcJoin — handback merges history (the twin-reunion)", () => {
  test("join is causally AFTER both pre-handback histories", () => {
    const [p0, c0] = itcFork(itcSeed());
    const child = itcEvent(itcEvent(c0)); // the spirit did work
    const parent = itcEvent(p0);          // the parent moved meanwhile (concurrent)
    expect(itcCompare(parent, child)).toBe("concurrent");
    const reunited = itcJoin(parent, child);
    expect(itcCompare(reunited, child)).toBe("after");
    expect(itcCompare(reunited, parent)).toBe("after");
  });

  test("join recovers full ownership when all forks return", () => {
    const [a, b] = itcFork(itcSeed());
    const joined = itcJoin(itcEvent(a), itcEvent(b));
    expect(joined.id).toBe(1); // the whole interval, owned again
  });
});

describe("siblings-concurrent — two children of one spawn, no join between", () => {
  test("three-way fork: each sibling events → all pairwise concurrent", () => {
    const root = itcSeed();
    const [r1, sib1] = itcFork(root);
    const [r2, sib2] = itcFork(r1); // r2 keeps the rest
    const a = itcEvent(sib1);
    const b = itcEvent(sib2);
    const c = itcEvent(r2);
    expect(itcCompare(a, b)).toBe("concurrent");
    expect(itcCompare(a, c)).toBe("concurrent");
    expect(itcCompare(b, c)).toBe("concurrent");
  });
});
