/**
 * wiki-coherence-projection (node tier) — witness of the PURE organ + the coalesce-gate wiring.
 *
 * Two witnesses, both platform-blind (no DOM, no browser):
 *   1. projectCoherenceIndicator — a radius reading → the correct indicator frame (glue → coherent;
 *      obstruct → an obstruction frame naming the tiddler; vacuous → indeterminate, never a glue).
 *   2. wireCoherenceProjection   — a burst of marks coalesces to ONE re-read (newest-wins), the frame
 *      carries the gate's monotone rev, teardown drops an armed flush.
 *
 * The organ shapes the SAME frame the browser DOM sink renders; the SINK (DOM write) is the only
 * platform shore, witnessed in the browser tier. One hull, differ by grant not hull.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/wiki-coherence-projection
 */

import { describe, expect, test } from "vitest";
import {
  projectCoherenceIndicator,
  wireCoherenceProjection,
} from "../src/wiki-coherence-projection.js";
import type { CoherenceIndicatorFrame } from "../src/wiki-coherence-projection.js";
import { runWikiConsistencyWitness } from "../src/wiki-store-adapter.js";
import type { ConsistencyRadius } from "@lararium/mesh";

/** A hand-built radius reading — the pure organ takes ONLY this shape (no store needed). */
function reading(over: Partial<ConsistencyRadius>): ConsistencyRadius {
  return {
    radius: 0, glues: false, vacuous: false, pairs: [], obstructionLocus: [],
    signalKind: "disagreement-signal", ...over,
  };
}

describe("projectCoherenceIndicator — the PURE radius → frame organ", () => {
  test("a glueing read → a COHERENT frame (radius 0, no obstruction)", () => {
    const f = projectCoherenceIndicator(reading({ radius: 0, glues: true }));
    expect(f.status).toBe("coherent");
    expect(f.radius).toBe(0);
    expect(f.glues).toBe(true);
    expect(f.obstructing).toEqual([]);
  });

  test("an obstructed read → an OBSTRUCTION frame naming the offending tiddler(s)", () => {
    const f = projectCoherenceIndicator(reading({ radius: 1, obstructionLocus: ["ornate-novel"] }));
    expect(f.status).toBe("obstructed");
    expect(f.radius).toBe(1);
    expect(f.glues).toBe(false);
    expect(f.obstructing).toEqual(["ornate-novel"]);
    expect(f.label).toContain("ornate-novel"); // the label names WHERE the planes fracture
  });

  test("a vacuous read → INDETERMINATE, never a false glue (the consistency keystone's caution a)", () => {
    const f = projectCoherenceIndicator(reading({ vacuous: true }));
    expect(f.status).toBe("indeterminate");
    expect(f.glues).toBe(false);
    expect(f.vacuous).toBe(true);
  });

  test("the organ rides the LIVE consistency-keystone witness readings end-to-end (glue ⊥ obstruct)", async () => {
    const { glue, obstruct } = await runWikiConsistencyWitness();
    expect(projectCoherenceIndicator(glue).status).toBe("coherent");
    const of = projectCoherenceIndicator(obstruct);
    expect(of.status).toBe("obstructed");
    expect(of.obstructing).toContain("ornate-novel");
  });
});

/** A manual timer shore: capture the armed callback, fire it on demand (deterministic coalesce). */
function manualProjector(read: () => Promise<ConsistencyRadius>) {
  const frames: Array<CoherenceIndicatorFrame & { rev: number }> = [];
  let pending: (() => void) | null = null;
  let cleared = false;
  const projector = wireCoherenceProjection({
    read,
    emit: (frame, rev) => frames.push({ ...frame, rev }),
    windowMs: 10,
    setTimer: (fn) => { pending = fn; return 1 as unknown as ReturnType<typeof setTimeout>; },
    clearTimer: () => { cleared = true; },
  });
  return { projector, frames, crest: () => pending?.(), wasCleared: () => cleared };
}

/** Let the fire-and-forget read microtask settle so its emit lands. */
const settle = () => new Promise<void>((r) => setTimeout(r, 0));

describe("wireCoherenceProjection — the coalesce-gate wiring (newest-wins)", () => {
  test("a burst of marks coalesces to ONE re-read + emit, rev monotone across waves", async () => {
    let current = reading({ radius: 0, glues: true });
    let reads = 0;
    const { projector, frames, crest } = manualProjector(() => { reads++; return Promise.resolve(current); });

    projector.mark(); projector.mark(); projector.mark(); // a burst within one window
    expect(frames).toEqual([]);                            // armed, not yet read
    crest(); await settle();
    expect(reads).toBe(1);                                 // ONE re-read for the whole burst
    expect(frames.length).toBe(1);
    expect(frames[0]!.rev).toBe(1);
    expect(frames[0]!.status).toBe("coherent");

    current = reading({ radius: 1, obstructionLocus: ["ornate-novel"] }); // the source moved
    projector.mark(); crest(); await settle();             // the next wave reads the NEWEST source
    expect(reads).toBe(2);
    expect(frames.length).toBe(2);
    expect(frames[1]!.rev).toBe(2);                        // monotone
    expect(frames[1]!.status).toBe("obstructed");
    expect(frames[1]!.obstructing).toEqual(["ornate-novel"]);
  });

  test("dispose clears the armed flush — teardown drops the pending frame", async () => {
    const { projector, frames, crest, wasCleared } = manualProjector(() => Promise.resolve(reading({ glues: true })));
    projector.mark();
    projector.dispose();
    expect(wasCleared()).toBe(true);
    crest(); await settle();
    expect(frames).toEqual([]);                            // no frame after dispose
  });
});
