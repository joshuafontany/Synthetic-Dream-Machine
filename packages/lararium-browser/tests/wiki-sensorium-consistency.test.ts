/**
 * wiki-sensorium-consistency (browser tier) — the consistency KEYSTONE witness, browser substrate.
 *
 * Runs the IDENTICAL hull as node/tests/wiki-sensorium-consistency.test.ts — the SAME
 * `runWikiConsistencyWitness()` from `@lararium/tw5`, here inside a real Chromium harness. The
 * assertions match the node tier line-for-line: `vacuous:false` on both fixtures and the radius flips
 * 0 → >0 between glue and obstruct. node ≡ browser on this verdict IS the island-isomorphism proof —
 * one hull, two substrates, differ by grant not hull. No py, no embeddings, no cache, no cap-stack.
 *
 * Meme: lar:///ha.ka.ba/lares/api/lares/wiki-store-adapter
 */

import { describe, test, expect } from "vitest";
import {
  runWikiConsistencyWitness,
  WikiStoreAdapter,
  buildFixtureIsland,
  GLUE_SEEDS,
} from "@lararium/tw5";

describe("wiki-sensorium consistency keystone — browser tier", () => {
  test("the engineered stalk reads NON-VACUOUS (a genuine cross-plane overlap, not a false glue)", async () => {
    const { glue, obstruct } = await runWikiConsistencyWitness();
    expect(glue.vacuous).toBe(false);
    expect(obstruct.vacuous).toBe(false);
  });

  test("the radius FLIPS 0 ↔ >0 between the GLUE and OBSTRUCT corpora", async () => {
    const { glue, obstruct } = await runWikiConsistencyWitness();
    expect(glue.radius).toBe(0);
    expect(glue.glues).toBe(true);
    expect(obstruct.radius).toBeGreaterThan(0);
    expect(obstruct.glues).toBe(false);
  });

  test("the obstruction localizes to the offending tiddler", async () => {
    const { obstruct } = await runWikiConsistencyWitness();
    expect(obstruct.obstructionLocus).toContain("ornate-novel");
  });

  test("entries() folds the island's OWN resolved surface, causal-stamped", async () => {
    const island = await buildFixtureIsland("lar:///ha.ka.ba/bags/@witness-browser", GLUE_SEEDS);
    const snap = await new WikiStoreAdapter(island).snapshot();
    expect(snap.readings.map((r) => r.title).sort()).toEqual(["canon-a", "canon-b", "plain"]);
    for (const r of snap.readings) expect(r.heads).toBeNull();
  });
});
